import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { path, contentType } = await request.json();
    // Uploads must go into the caller's own folder ("<user id>/..."), with a
    // plain file name and a picture ending. The bucket also checks the file
    // type and size (10 MB) when the upload itself arrives.
    if (typeof path !== "string" || path.length > 300 || !path.startsWith(`${user.id}/`) || path.includes("..")
        || !/^[A-Za-z0-9/_.-]+$/.test(path) || !/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }
    if (contentType !== undefined && !IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Please pick a JPG, PNG, WebP, GIF or AVIF picture." }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from("artwork-images").createSignedUploadUrl(path);
    if (error) { console.error("Upload URL error:", error.message); return NextResponse.json({ error: "Could not start the upload. Please try again." }, { status: 500 }); }
    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
