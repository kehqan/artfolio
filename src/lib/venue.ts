// The venue side: what a café, gallery or other space sees in the app.
//
// A venue's whole job here is "get good art on our walls". Home and Your
// walls both read the same few things, loaded once by loadVenue():
//   - the place itself (profile + the space part of its site settings)
//   - its wall posts ("Art for our walls"), each with how many offers came in
//   - its deals (offers and requests), from lib/deals
//   - what hangs now, what's coming and what has hung (signed deals)
//   - works artists have marked open to a wall, nearest first
// At launch there are few venues and few deals, so everything here has to
// read well when it's empty.
import type { SupabaseClient } from "@supabase/supabase-js";
import { type DealView, isClosed, loadDeals } from "@/lib/deals";
import { type PlaceArtwork, cityOf, isSold, sameCity } from "@/lib/places";
import { type SiteConfig, type WallEntry, siteOf, today } from "@/lib/site";
import { IMAGE_CACHE_SECONDS, imageExt, prepareImage, isPicture } from "@/lib/image";
import { asDate } from "@/lib/dates";

export const VENUE_TYPES = ["Café", "Bar", "Restaurant", "Gallery", "Hotel", "Office", "Shop", "Cultural center", "Studio", "Pop-up space"];

export type VenueProfile = {
  id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null; role?: string | null;
  venue_name?: string | null; venue_type?: string | null; location?: string | null; lat?: number | null; lng?: number | null;
  art_styles_sought?: string[] | null; bio?: string | null;
};

export type WallPost = {
  id: string; title: string; description?: string | null; details?: Record<string, unknown> | null;
  location?: string | null; status?: string | null; created_at: string; cover_image?: string | null;
  offers: number; // live offers and requests tied to this post
};

export type OpenWork = PlaceArtwork & {
  artist?: { id: string; full_name?: string | null; avatar_url?: string | null; location?: string | null; username?: string | null };
  near: boolean;
};

export type VenueData = {
  me: string;
  profile: VenueProfile;
  site: SiteConfig;
  hasSettings: boolean;
  posts: WallPost[];          // every wall post, newest first
  deals: DealView[] | null;   // null when deals aren't set up in the database
  now: WallEntry[];           // on the walls today
  next: WallEntry[];          // signed, starting later
  past: WallEntry[];          // finished
  works: OpenWork[];          // open to a wall, near first
  city: string;
};

/** The name artists know the place by. */
export const placeName = (p?: VenueProfile | null) => (p?.venue_name || p?.full_name || "").trim();

export async function loadVenue(sb: SupabaseClient, me: string, opts: { works?: number } = {}): Promise<VenueData | null> {
  const [{ data: profile }, { data: ss }, { data: posts }, deals, { data: wall }, { data: works }] = await Promise.all([
    sb.from("profiles").select("id, full_name, username, avatar_url, role, venue_name, venue_type, location, lat, lng, art_styles_sought, bio").eq("id", me).single(),
    sb.from("store_settings").select("site").eq("user_id", me).maybeSingle(),
    sb.from("pool_requests").select("id, title, description, details, location, status, created_at, cover_image")
      .eq("user_id", me).eq("request_type", "walls").order("created_at", { ascending: false }),
    loadDeals(sb, me).catch(() => null),
    sb.rpc("public_wall_history", { p_user: me }),
    sb.from("artworks").select("id, title, images, medium, width_cm, height_cm, depth_cm, price, currency, status, wall_terms, user_id")
      .not("wall_terms", "is", null).neq("user_id", me).order("created_at", { ascending: false }).limit(opts.works ?? 60),
  ]);
  if (!profile) return null;

  // "Vinohrady, Prague" → try each part, so a neighbourhood or the city both match.
  const parts = (profile.location || "").split(",").map((x: string) => x.trim()).filter(Boolean);

  // Offers per wall post: anything still alive that came in through it.
  const live = (deals || []).filter(d => !isClosed(d));
  const offers = new Map<string, number>();
  live.forEach(d => { if (d.pool_request_id) offers.set(d.pool_request_id, (offers.get(d.pool_request_id) || 0) + 1); });

  // Signed shows, split by today.
  const t = today();
  const mine = ((wall as WallEntry[] | null) || []).filter(e => e.side === "venue");
  const now = mine.filter(e => (!e.start_date || e.start_date <= t) && (!e.end_date || e.end_date >= t));
  const next = mine.filter(e => !!e.start_date && e.start_date > t).sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  const past = mine.filter(e => !!e.end_date && e.end_date < t);

  // Works open to a wall, with who made them; near the venue first.
  const list = ((works || []) as PlaceArtwork[]).filter(a => !isSold(a) && a.images?.length);
  const ids = Array.from(new Set(list.map(a => a.user_id).filter(Boolean))) as string[];
  const people = new Map<string, NonNullable<OpenWork["artist"]>>();
  if (ids.length) {
    const { data: ps } = await sb.from("profiles").select("id, full_name, avatar_url, location, username").in("id", ids);
    (ps || []).forEach((p: NonNullable<OpenWork["artist"]>) => people.set(p.id, p));
  }
  const matchOf = (where?: string | null) => parts.find((c: string) => sameCity(where, c)) || "";
  const open: OpenWork[] = list
    .map(a => {
      const artist = people.get(a.user_id || "");
      return { ...a, artist, near: !!matchOf(artist?.location) };
    })
    .sort((a, b) => Number(b.near) - Number(a.near));
  // Name the area the near works share, else the venue's own city part.
  const city = open.map(w => matchOf(w.artist?.location)).find(Boolean) || parts[parts.length - 1] || cityOf(profile.location);

  return {
    me,
    profile: profile as VenueProfile,
    site: siteOf(ss?.site, profile.role),
    hasSettings: !!ss,
    posts: ((posts || []) as Omit<WallPost, "offers">[]).map(p => ({ ...p, offers: offers.get(p.id) || 0 })),
    deals,
    now, next, past,
    works: open,
    city,
  };
}

/** The four things that make a venue ready, in order. */
export type SetupStep = "place" | "photos" | "walls" | "first";
export function setupDone(v: VenueData): Record<SetupStep, boolean> {
  return {
    place: !!(v.profile.venue_type && v.profile.location),
    photos: (v.site.space_images?.length || 0) > 0,
    walls: v.posts.length > 0,
    first: (v.deals?.length || 0) > 0 || v.now.length + v.next.length + v.past.length > 0,
  };
}

export const openPosts = (v: VenueData) => v.posts.filter(p => (p.status || "open") === "open");

/** Save part of the venue's site settings without touching the rest. */
export async function saveSite(sb: SupabaseClient, me: string, site: SiteConfig, hasSettings: boolean) {
  if (hasSettings) return sb.from("store_settings").update({ site, updated_at: new Date().toISOString() }).eq("user_id", me);
  return sb.from("store_settings").insert({ user_id: me, site, is_active: true });
}

/** Upload one image into the person's own folder; returns its public address. */
export async function uploadImage(sb: SupabaseClient, me: string, file: File, name: string): Promise<string | null> {
  if (!isPicture(file)) return null;
  file = await prepareImage(file);
  if (file.size > 10 * 1024 * 1024) return null;
  const ext = imageExt(file);
  const path = `${me}/${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  try {
    const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, contentType: file.type }) });
    const { signedUrl } = await res.json();
    if (!signedUrl) return null;
    const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type, "cache-control": `max-age=${IMAGE_CACHE_SECONDS}` } });
    if (!put.ok) return null;
    return sb.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/** "Until 14 Feb", "From 3 Mar". */
export function shortRange(e: { start_date: string | null; end_date: string | null }): string {
  const f = (d: string) => asDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const t = today();
  if (e.start_date && e.start_date > t) return `From ${f(e.start_date)}`;
  if (e.end_date) return `Until ${f(e.end_date)}`;
  return "Ongoing";
}
