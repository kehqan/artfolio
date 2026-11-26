// Sending usage counts to PostHog (EU cloud) from our server. Browsers post to
// /api/e (src/app/api/e/route.ts), which forwards here, so PostHog only ever
// sees our server's address, never a visitor's IP. Same rules as
// src/lib/analytics.ts: no cookie, no personal data.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const HOST = (process.env.POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");

export const analyticsOn = () => !!KEY;

export type CapturedEvent = { event: string; distinct_id: string; timestamp?: string; properties?: Record<string, unknown> };

export async function forward(e: CapturedEvent) {
  if (!KEY) return;
  try {
    await fetch(`${HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // $ip null: PostHog stores no address (and the request comes from our server anyway).
      body: JSON.stringify({ api_key: KEY, ...e, properties: { ...e.properties, $ip: null } }),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* counting is best-effort */ }
}

/** Count a step that happens on the server (e.g. a wall label scan): a random id, no person. */
export function trackServer(event: string, properties: Record<string, string | number | boolean | null> = {}) {
  if (process.env.VERCEL_ENV !== "production") return Promise.resolve();
  return forward({
    event, distinct_id: crypto.randomUUID(), timestamp: new Date().toISOString(),
    properties: { ...properties, $lib: "artomango-server", $process_person_profile: false },
  });
}
