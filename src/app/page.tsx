// The landing page, built on the server and kept on Vercel's CDN for five
// minutes: the newest available works are already in the HTML.
import { publicClient } from "@/lib/supabase/public";
import HomeClient, { type Artwork } from "./HomeClient";
import { MEANWHILE_KEY, readMeanwhile, type MeanwhileContent } from "@/lib/siteContent";
import type { MeanwhilePhoto } from "@/components/landing/Meanwhile";

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

// The "Meanwhile" section: its words and photos, as edited in /admin/home.
// Saving there asks for this page to be rebuilt, so edits show within seconds.
async function meanwhile(): Promise<{ content: MeanwhileContent; photos: MeanwhilePhoto[] }> {
  const sb = publicClient();
  const [c, p] = await Promise.all([
    sb.from("site_content").select("value").eq("key", MEANWHILE_KEY).maybeSingle().then(r => r, () => null),
    sb.from("campaign_slides").select("image_url,caption").eq("active", true).order("order", { ascending: true }).then(r => r, () => null),
  ]);
  let photos = (p?.data || []) as MeanwhilePhoto[];
  if (p?.error) {
    // Before admin/site_content.sql is run there is no caption column yet.
    const { data } = await sb.from("campaign_slides").select("image_url").eq("active", true).order("order", { ascending: true }).then(r => r, () => ({ data: null }));
    photos = (data || []) as MeanwhilePhoto[];
  }
  return { content: readMeanwhile(c?.data?.value), photos };
}

export default async function HomePage() {
  const [works, m] = await Promise.all([newestWorks(), meanwhile()]);
  return <HomeClient works={works} meanwhile={m} />;
}
