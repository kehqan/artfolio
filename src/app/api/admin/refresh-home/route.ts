// After an admin edits the home page in /admin/home, rebuild the cached home
// page now instead of waiting up to five minutes for the CDN copy to expire.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const sb = createClient();
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false }, { status: 403 });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
