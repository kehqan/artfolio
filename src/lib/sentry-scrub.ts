// Crash reports carry what we need to fix the bug, not who hit it.
// Used by every Sentry.init (browser, server, edge): strips query strings
// (signing links carry tokens), email addresses, cookies and auth headers.
import type { ErrorEvent, EventHint, Breadcrumb } from "@sentry/nextjs";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function cleanUrl(u: string): string {
  const q = u.search(/[?#]/);
  return (q === -1 ? u : u.slice(0, q)).replace(EMAIL, "[email]");
}
const cleanText = (s: string) => s.replace(EMAIL, "[email]").replace(/([?&](?:t|token|code|p_token)=)[^&\s"']+/gi, "$1[x]");

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  if (event.request) {
    if (event.request.url) event.request.url = cleanUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const keep: Record<string, string> = {};
      for (const [k, v] of Object.entries(event.request.headers)) {
        if (/^(user-agent|referer|accept-language|content-type)$/i.test(k)) keep[k] = k.toLowerCase() === "referer" ? cleanUrl(v) : v;
      }
      event.request.headers = keep;
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.message) event.message = cleanText(event.message);
  for (const ex of event.exception?.values || []) if (ex.value) ex.value = cleanText(ex.value);
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(b => scrubBreadcrumb(b)).filter(Boolean) as Breadcrumb[];
  if (event.transaction) event.transaction = cleanUrl(event.transaction);
  return event;
}

export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  if (b.message) b.message = cleanText(b.message);
  if (b.data) {
    for (const k of ["url", "from", "to"]) if (typeof b.data[k] === "string") b.data[k] = cleanUrl(b.data[k] as string);
    // Console breadcrumbs can hold whole objects (form state, rows): keep only the text line.
    if (b.category === "console") delete b.data.arguments;
  }
  return b;
}

// Noise we can't act on: browser extensions, flaky networks, old tabs after a deploy.
export const IGNORE_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  /^Load failed$/,
  /^Failed to fetch$/,
  /^NetworkError when attempting to fetch resource\.?$/,
  /ChunkLoadError/,
  /Loading chunk [\d]+ failed/,
];
export const DENY_URLS = [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//];

// What the SDK may collect on its own: nothing about the person, no bodies,
// no cookies, no query strings, no local variable values.
export const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent", "accept-language", "content-type"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
} satisfies import("@sentry/nextjs").BrowserOptions["dataCollection"];
