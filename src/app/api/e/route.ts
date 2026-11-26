// Usage counts from the browser (src/lib/analytics.ts), passed on to PostHog.
// Only the steps we name are accepted, small bodies only, and nothing about
// the request (IP address, cookies, headers) is passed on.
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { analyticsOn, forward } from "@/lib/analytics-server";

const EVENTS = new Set([
  "$pageview", "$identify",
  "signed_up", "work_added", "wall_request_posted", "posted", "offer_sent",
  "agreement_sent", "agreement_signed", "buy_click", "buy_message_sent",
]);

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  if (!analyticsOn()) return noContent();
  const text = await request.text().catch(() => "");
  if (!text || text.length > 4000) return noContent();
  let body: { event?: unknown; distinct_id?: unknown; timestamp?: unknown; properties?: unknown };
  try { body = JSON.parse(text); } catch { return noContent(); }
  const { event, distinct_id, timestamp, properties } = body;
  if (typeof event !== "string" || !EVENTS.has(event)) return noContent();
  if (typeof distinct_id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(distinct_id)) return noContent();
  const props = properties && typeof properties === "object" && !Array.isArray(properties) ? properties as Record<string, unknown> : {};
  waitUntil(forward({
    event, distinct_id,
    timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
    properties: props,
  }));
  return noContent();
}
