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

    // Verify ownership or admin role
    const { data: artwork } = await supabase
      .from("artworks")
      .select("id, user_id")
      .eq("id", artworkId)
      .single();

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    // Check ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = artwork.user_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only the artwork owner or an admin can add provenance entries" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { event_type, owner_name, is_anonymous, date, location, notes } = body;

    // Validate event_type
    const validTypes = ["created", "sold", "transferred", "exhibited", "restored", "appraised", "donated", "loaned"];
    if (!event_type || !validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from("provenance_entries")
      .insert({
        artwork_id: artworkId,
        event_type,
        owner_name: owner_name || null,
        is_anonymous: is_anonymous || false,
        date: date || null,
        location: location || null,
        notes: notes || null,
        added_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (e) {
    console.error("Provenance API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
