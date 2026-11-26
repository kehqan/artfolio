// A Buy button: count the tap, then open the artist's own shop link.
// Stored: the work, where the tap came from and the hour. Nothing about the
// person (database/migrations/20261126_artist_value.sql, lib/buy.ts).
// No link, or the work is sold: open the piece on Artomango instead.
import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id || "";
  const from = request.nextUrl.searchParams.get("from") || "other";
  const code = (request.nextUrl.searchParams.get("l") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const back = code ? `/l/${code}` : UUID.test(id) ? `/artwork/${id}/passport` : "/explore";
  if (!UUID.test(id)) return NextResponse.redirect(new URL(back, request.url), 302);

  let link: string | null = null;
  try {
    const { data } = await publicClient().rpc("buy_go", { p_artwork: id, p_source: from, p_code: code || null });
    link = typeof data === "string" ? data : null;
  } catch { /* fall back to the piece */ }

  if (!link || !/^https:\/\//i.test(link)) return NextResponse.redirect(new URL(back, request.url), 302);
  const res = NextResponse.redirect(link, 302);
  // Shops see that the visitor came from Artomango, not which page.
  res.headers.set("Referrer-Policy", "origin");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
