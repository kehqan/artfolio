// The address inside a wall label's QR code: count the scan, then open the
// piece page. Only the label and the hour are stored; nothing about the
// person scanning (database/migrations/20261125_wall_labels.sql).
// Reloading or sharing the piece page (/l/<code>) doesn't count again.
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const code = (params.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (code) {
    // Count the scan in the background: the visitor is sent on right away
    // instead of waiting for the database (Vercel keeps the work running).
    try {
      waitUntil(Promise.resolve(createClient().rpc("record_label_event", { p_code: code, p_action: "scan" })).catch(() => {}));
    } catch { /* still open the page */ }
  }
  return NextResponse.redirect(new URL(`/l/${code}`, request.url), 302);
}
