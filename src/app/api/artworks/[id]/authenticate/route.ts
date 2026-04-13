import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const artworkId = params.id;

    // Fetch artwork
    const { data: artwork } = await supabase
      .from("artworks")
      .select("id, user_id, authentication_status, title")
      .eq("id", artworkId)
      .single();

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    // Check permissions: owner, admin, or gallery role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isOwner = artwork.user_id === user.id;
    const isAdmin = profile?.role === "admin";
    const isGallery = profile?.role === "gallery";

    if (!isOwner && !isAdmin && !isGallery) {
      return NextResponse.json(
        { error: "Only the artwork owner, gallery, or admin can authenticate" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { authentication_status, authenticated_by, notes } = body;

    // Validate status
    const validStatuses = ["original", "limited_edition", "reproduction"];
    if (!authentication_status || !validStatuses.includes(authentication_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const oldStatus = artwork.authentication_status;
    const authenticator = authenticated_by || profile?.full_name || "Unknown";

    // Update artwork
    const { error: updateErr } = await supabase
      .from("artworks")
      .update({
        authentication_status,
        authenticated_by: authenticator,
        authentication_date: new Date().toISOString().split("T")[0],
        authentication_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artworkId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from("authentication_log").insert({
      artwork_id: artworkId,
      action: "authenticate",
      old_status: oldStatus,
      new_status: authentication_status,
      performed_by: user.id,
      performer_name: authenticator,
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      authentication_status,
      authenticated_by: authenticator,
      authentication_date: new Date().toISOString().split("T")[0],
    });
  } catch (e) {
    console.error("Authenticate API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
