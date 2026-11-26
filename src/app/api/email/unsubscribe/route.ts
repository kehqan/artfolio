// One-click unsubscribe from the mail app's own button (RFC 8058).
// Mail apps POST here with no page in between, so this turns every email
// off. Opening the link in a browser (GET) shows the page with choices.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function POST(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  if (!t) return new NextResponse("Missing token", { status: 400 });
  const { data, error } = await anon().rpc("email_turn_off", { p_token: t });
  if (error || !data) return new NextResponse("That link didn't work", { status: 400 });
  return new NextResponse("Unsubscribed", { status: 200 });
}

export function GET(req: NextRequest) {
  const url = new URL("/email/off", req.nextUrl.origin);
  const t = req.nextUrl.searchParams.get("t");
  if (t) url.searchParams.set("t", t);
  return NextResponse.redirect(url, 303);
}
