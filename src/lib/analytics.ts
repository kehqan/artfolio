// Product analytics without cookies (PostHog, EU cloud in Frankfurt).
//
// What it does, and what it doesn't:
// - Sends page views and a few named steps (AnalyticsEvent) to our own
//   /api/e, which passes them on to PostHog (src/app/api/e/route.ts), so
//   PostHog never sees the visitor's IP address.
// - Stores nothing in the browser: no cookie, no localStorage. A visitor who
//   isn't signed in gets a random id that lives only in memory, so a reload
//   is a new visitor. A signed-in person is counted by their account id (a
//   random UUID, never their name or email), so the steps of one artist line
//   up into a funnel.
// - Never sends query strings (signing links carry tokens), form contents,
//   names or emails. Properties are only the small facts passed to track().
// - Sends nothing when the key isn't set, on localhost, to automated
//   browsers, or when the browser asks not to be tracked (GPC / Do Not Track).
//
// No SDK: one small fetch per event keeps the pages as fast as they are.

/** The steps we count. Keep names stable: they are the funnel in PostHog. */
export type AnalyticsEvent =
  | "signed_up"            // { role }
  | "work_added"           // { from: "add" | "welcome" }
  | "wall_request_posted"  // a venue posted walls looking for art
  | "posted"               // { kind } any Scene post
  | "offer_sent"           // { kind: "offer" | "request" | "project", works }
  | "agreement_sent"
  | "agreement_signed"     // { via: "account" | "link", done }
  | "label_scanned"        // a wall label QR code (sent from the server)
  | "buy_click"            // { where: "label" | "site", method? }
  | "buy_message_sent";    // { where: "label" }

type Props = Record<string, string | number | boolean | null | undefined>;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const PATH = "/api/e";

let anonId: string | null = null;
let userId: string | null = null;
let role: string | null = null;

function randomId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

function allowed(): boolean {
  if (!KEY || typeof window === "undefined") return false;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (n.webdriver) return false;
  if (n.globalPrivacyControl === true || n.doNotTrack === "1") return false;
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".local")) return false;
  return true;
}

function send(event: string, distinctId: string, properties: Record<string, unknown>) {
  try {
    void fetch(PATH, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, distinct_id: distinctId, timestamp: new Date().toISOString(), properties }),
    }).catch(() => {});
  } catch { /* counting must never break the page */ }
}

function base(): Record<string, unknown> {
  let referringDomain: string | undefined;
  try { referringDomain = document.referrer ? new URL(document.referrer).hostname : undefined; } catch { /* ignore */ }
  return {
    $lib: "artomango-web",
    $current_url: location.origin + location.pathname,
    $host: location.host,
    $pathname: location.pathname,
    $referring_domain: referringDomain && referringDomain !== location.hostname ? referringDomain : "$direct",
    $screen_width: window.screen?.width,
    $viewport_width: window.innerWidth,
    // Only signed-in people get a person profile in PostHog; visitors stay anonymous rows.
    $process_person_profile: !!userId,
    ...(role ? { role } : {}),
  };
}

/** Count a named step. Safe to call anywhere; does nothing when analytics is off. */
export function track(event: AnalyticsEvent | "$pageview", props: Props = {}) {
  if (!allowed()) return;
  if (!anonId) anonId = randomId();
  send(event, userId || anonId, { ...base(), ...props });
}

/**
 * Tell analytics who is signed in (account id and role only), or null when
 * signed out. Called by <Analytics /> in the root layout.
 */
export function setAnalyticsUser(id: string | null, r?: string | null) {
  if (id === userId) { role = r ?? role; return; }
  const before = anonId;
  userId = id;
  role = id ? r ?? null : null;
  // Join this tab's earlier anonymous views (e.g. the sign-up page) to the account.
  if (id && before && allowed()) send("$identify", id, { ...base(), $anon_distinct_id: before });
  if (!id) anonId = randomId();
}
