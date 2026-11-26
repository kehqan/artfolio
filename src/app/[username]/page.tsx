// The public page of an artist or a venue (their personal site).
// Built on the server from public data and kept on Vercel's CDN for a minute,
// so it opens with its content instead of a skeleton, fast even on a slow phone.
import type { Metadata } from "next";
import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { loadSiteData } from "@/lib/site";
import ProfileClient from "./ProfileClient";

export const revalidate = 60;
// No pages are built ahead; each is built on its first visit, then cached.
export async function generateStaticParams() { return []; }

const decode = (u: string) => { try { return decodeURIComponent(u); } catch { return u; } };
const load = cache((username: string) => loadSiteData(publicClient(), { username }));

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const d = await load(decode(params.username));
  if (!d) return { title: "Not found" };
  const p = d.profile;
  const name = p.full_name || p.username || "Artomango";
  const cover = d.works.find(w => w.images?.[0])?.images?.[0] || p.avatar_url || undefined;
  return {
    title: name,
    description: (p.bio || "").slice(0, 160) || `${name} on Artomango.`,
    openGraph: { title: name, images: cover ? [cover] : undefined },
  };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = decode(params.username);
  const data = await load(username);
  return <ProfileClient username={username} initial={data} />;
}
