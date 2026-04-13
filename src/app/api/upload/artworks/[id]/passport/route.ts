import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const artworkId = params.id;

    // Fetch artwork with artist profile
    const { data: artwork, error: awErr } = await supabase
      .from("artworks")
      .select(`
        id, title, medium, year, description, price, currency, status,
        images, width_cm, height_cm, depth_cm, framed, editions,
        certificate_id, authentication_status, authenticated_by,
        authentication_date, authentication_notes,
        venue_location, location_name, location,
        created_at, updated_at, user_id
      `)
      .eq("id", artworkId)
      .single();

    if (awErr || !artwork) {
      return NextResponse.json(
        { error: "Artwork not found" },
        { status: 404 }
      );
    }

    // Fetch artist profile
    const { data: artist } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url, website, instagram")
      .eq("id", artwork.user_id)
      .single();

    // Fetch provenance history
    const { data: provenance } = await supabase
      .from("provenance_entries")
      .select("id, event_type, owner_name, is_anonymous, date, location, notes, created_at")
      .eq("artwork_id", artworkId)
      .order("date", { ascending: true });

    // Fetch exhibitions linked to this artwork
    const { data: exhibitionLinks } = await supabase
      .from("exhibition_artworks")
      .select("exhibition_id")
      .eq("artwork_id", artworkId);

    let exhibitions: any[] = [];
    if (exhibitionLinks?.length) {
      const exIds = exhibitionLinks.map((l) => l.exhibition_id);
      const { data: exData } = await supabase
        .from("exhibitions")
        .select("id, title, venue, gallery_name, start_date, end_date, status, description, cover_image")
        .in("id", exIds)
        .order("start_date", { ascending: false });
      exhibitions = exData || [];
    }

    // Fetch authentication audit log
    const { data: authLog } = await supabase
      .from("authentication_log")
      .select("id, action, old_status, new_status, performer_name, notes, created_at")
      .eq("artwork_id", artworkId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch view count
    const { count: viewCount } = await supabase
      .from("passport_views")
      .select("*", { count: "exact", head: true })
      .eq("artwork_id", artworkId);

    // Record this view (non-blocking)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    supabase
      .from("passport_views")
      .insert({ artwork_id: artworkId, viewer_ip: ip })
      .then(() => {}); // fire and forget

    return NextResponse.json({
      artwork: {
        ...artwork,
        artist,
      },
      provenance: provenance || [],
      exhibitions,
      authLog: authLog || [],
      viewCount: viewCount || 0,
    });
  } catch (e) {
    console.error("Passport API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
