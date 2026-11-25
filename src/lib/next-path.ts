// Where to go after signing in or up: ?next=/some/page, only ever a path on
// this site (never another site), so a link can't send people elsewhere.
const KEY = "artomango.next";
const safe = (n: string) => n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\");

export function nextPath(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const n = new URLSearchParams(window.location.search).get("next") || "";
  if (safe(n)) return n;
  return fallback;
}

/** Keep ?next across the confirm-your-email round trip (the email link can't carry it). */
export function rememberNext() {
  const n = nextPath("");
  try { if (n) localStorage.setItem(KEY, n); else localStorage.removeItem(KEY); } catch {}
}
export function takeRememberedNext(fallback = "/dashboard"): string {
  try {
    const n = localStorage.getItem(KEY) || "";
    localStorage.removeItem(KEY);
    if (safe(n)) return n;
  } catch {}
  return fallback;
}
