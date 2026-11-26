// The landing page, built on the server and kept on Vercel's CDN for five
// minutes: the newest available works are already in the HTML.
import { publicClient } from "@/lib/supabase/public";
import HomeClient, { type Artwork } from "./HomeClient";

export const revalidate = 300;

async function newestWorks(): Promise<Artwork[]> {
  try {
    const sb = publicClient();
    const { data } = await sb.from("artworks")
      .select("id,title,medium,price,currency,images,user_id")
      .in("status", ["available", "Available"]).not("images", "is", null)
      .order("created_at", { ascending: false }).limit(24);
    const rows = ((data || []) as Artwork[]).filter(a => a.images?.[0]);
    if (!rows.length) return [];
    const ids = Array.from(new Set(rows.map(a => a.user_id).filter(Boolean))) as string[];
    const { data: ps } = await sb.from("profiles").select("id,full_name,username").in("id", ids);
    const pm = new Map((ps || []).map(p => [p.id as string, p as { full_name: string | null; username: string | null }]));
    return rows.map(a => ({ ...a, artist_name: pm.get(a.user_id!)?.full_name || "", artist_username: pm.get(a.user_id!)?.username || null }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  return <HomeClient works={await newestWorks()} />;
}
