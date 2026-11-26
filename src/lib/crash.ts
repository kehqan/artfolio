// Crash reports in the browser, loaded after the page so they cost nothing
// up front. Errors that happen before Sentry has loaded are kept and sent
// once it has. Off until NEXT_PUBLIC_SENTRY_DSN is set. Settings and what is
// stripped out: src/lib/sentry-scrub.ts.
import { DATA_COLLECTION, DENY_URLS, IGNORE_ERRORS, scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
type Sdk = typeof import("@sentry/nextjs");

let sdk: Promise<Sdk | null> | null = null;
let early: unknown[] = [];
let userId: string | null = null;
let ready = false;
let stopListening = () => {};

export const crashReportsOn = () => !!DSN && process.env.NODE_ENV === "production" && typeof window !== "undefined";

function load(): Promise<Sdk | null> {
  if (!crashReportsOn()) return Promise.resolve(null);
  if (!sdk) {
    sdk = import("@sentry/nextjs").then(S => {
      S.init({
        dsn: DSN,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "production",
        dataCollection: DATA_COLLECTION,
        tracesSampleRate: 0,
        ignoreErrors: IGNORE_ERRORS,
        denyUrls: DENY_URLS,
        beforeSend: scrubEvent,
        beforeBreadcrumb: scrubBreadcrumb,
      });
      if (userId) S.setUser({ id: userId });
      // From here Sentry catches errors itself.
      ready = true;
      stopListening();
      for (const e of early) S.captureException(e);
      early = [];
      return S;
    }).catch(() => null);
  }
  return sdk;
}

function keepEarly(e: unknown) { if (!ready && early.length < 20) early.push(e); }

/** Start listening for errors now, and load Sentry once the page is idle. */
export function startCrashReports() {
  if (!crashReportsOn()) return;
  const onError = (ev: ErrorEvent) => keepEarly(ev.error || ev.message);
  const onRejection = (ev: PromiseRejectionEvent) => keepEarly(ev.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  stopListening = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
  const go = () => { void load(); };
  const idle = () => ("requestIdleCallback" in window ? window.requestIdleCallback(go, { timeout: 5000 }) : setTimeout(go, 2000));
  if (document.readyState === "complete") idle(); else window.addEventListener("load", idle, { once: true });
}

/** Send an error caught by an error page. */
export function reportError(e: unknown) {
  if (!crashReportsOn()) return;
  if (ready) { void sdk?.then(S => S?.captureException(e)); return; }
  keepEarly(e);
  void load();
}

/** The signed-in account id (never name or email), or null. */
export function setCrashUser(id: string | null) {
  userId = id;
  if (sdk) void sdk.then(S => S?.setUser(id ? { id } : null));
}
