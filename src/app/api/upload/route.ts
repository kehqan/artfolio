import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { path } = await request.json();
    // Uploads must go into the caller's own folder ("<user id>/...").
    if (typeof path !== "string" || !path.startsWith(`${user.id}/`) || path.includes("..")) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from("artwork-images").createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
