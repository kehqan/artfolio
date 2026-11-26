// What Explore shows, read on the server (page.tsx) and cached on the CDN.
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────
export type Artwork = {
  id: string; title: string; images?: string[];
  price?: number; currency?: string; status: string; medium?: string; year?: number;
  user_id?: string; venue_location?: string;
  artist_name?: string; artist_username?: string; artist_avatar?: string;
};
export type Person = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; cover_image?: string | null;
};
export type Event = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string; event_type?: string;
  is_online?: boolean; online_url?: string; cover_image?: string;
  user_id?: string; location_name?: string;
};
export type Resource = { id: string; type: string; title: string; url?: string; description?: string };

export type ExploreData = { artworks: Artwork[]; artists: Person[]; venues: Person[]; events: Event[]; resources: Resource[] };

/** Everything Explore shows. Runs on the server (page.tsx); the result is cached on the CDN. */
export async function loadExplore(sb: SupabaseClient): Promise<ExploreData> {
  const [{ data: awData }, { data: artistData }, { data: venueData }, { data: evData }, { data: resData }] = await Promise.all([
    sb.from("artworks")
      .select("id,title,images,price,currency,status,medium,year,user_id,venue_location")
      .in("status", ["available", "Available"]).not("images", "is", null)
      .order("created_at", { ascending: false }).limit(24),
    sb.from("profiles").select("id,full_name,username,role,bio,location,avatar_url")
      .eq("role", "artist").not("full_name", "is", null).neq("full_name", "").limit(20),
    // Sign-up saves "venue"; older accounts use "gallery"
    sb.from("profiles").select("id,full_name,username,bio,location,avatar_url")
      .in("role", ["venue", "gallery"]).not("full_name", "is", null).limit(16),
    sb.from("exhibitions")
      .select("id,title,venue,start_date,end_date,status,event_type,is_online,online_url,cover_image,user_id,location_name")
      .eq("is_public", true).order("start_date", { ascending: true }).limit(30),
    sb.from("education_resources").select("id,type,title,url,description").order("created_at", { ascending: false }).limit(12),
  ]);

  // Artist names for the works, and each artist's count and cover: two queries
  // for the whole page, side by side (it used to be two per artist).
  const workUids = Array.from(new Set((awData || []).map((a: Artwork) => a.user_id).filter(Boolean))) as string[];
  const artistIds = (artistData || []).map((p: Person) => p.id);
  const [{ data: profs }, { data: artistWorks }] = await Promise.all([
    workUids.length ? sb.from("profiles").select("id,full_name,username,avatar_url").in("id", workUids) : Promise.resolve({ data: [] as any[] }),
    artistIds.length ? sb.from("artworks").select("user_id,images").in("user_id", artistIds).limit(5000) : Promise.resolve({ data: [] as any[] }),
  ]);
  const pm: Record<string, any> = {};
  profs?.forEach((p: any) => { pm[p.id] = p; });
  const counts: Record<string, number> = {};
  const covers: Record<string, string> = {};
  for (const w of (artistWorks || []) as { user_id: string; images: string[] | null }[]) {
    counts[w.user_id] = (counts[w.user_id] || 0) + 1;
    if (!covers[w.user_id] && w.images?.[0]) covers[w.user_id] = w.images[0];
  }

  return {
    artworks: (awData || []).map((a: Artwork) => ({
      ...a,
      artist_name: pm[a.user_id!]?.full_name,
      artist_username: pm[a.user_id!]?.username,
      artist_avatar: pm[a.user_id!]?.avatar_url,
    })),
    artists: (artistData || []).map((p: Person) => ({ ...p, artwork_count: counts[p.id] || 0, cover_image: covers[p.id] || null })),
    venues: venueData || [],
    events: evData || [],
    resources: resData || [],
  };
}

