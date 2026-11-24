// One feed for the Scene. Three tables hold things happening in the scene:
//   scene_posts   – events, exhibitions, open calls, collabs, commissions
//   exhibitions   – shows and events with a venue and a map position
//   pool_requests – "looking for" posts from artists and venues
// The feed reads all three and turns each row into one FeedItem, so the
// artist sees one stream with one set of filters. The tables stay as they
// are; merging them into one table is a later, separate step.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Source = "scene" | "show" | "pool";
export type Kind = "show" | "opportunity" | "collab";
export type Filter = "all" | Kind | "yours";

export type Poster = { id: string; full_name?: string; username?: string; avatar_url?: string; role?: string };

export type FeedItem = {
  key: string;
  source: Source;
  id: string;
  userId: string;
  kind: Kind;
  typeLabel: string;
  title: string;
  description: string | null;
  images: string[];
  where: string | null;
  online: boolean;
  link: string | null;
  start: string | null;
  end: string | null;
  deadline: string | null;
  price: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  poster: Poster | null;
  raw: any;
};

export const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "show", label: "Shows & events" },
  { key: "opportunity", label: "Opportunities" },
  { key: "collab", label: "Collabs" },
  { key: "yours", label: "Yours" },
];

// ── Labels ──────────────────────────────────────────────────────────
export const SCENE_TYPES: Record<string, { label: string; kind: Kind }> = {
  event: { label: "Event", kind: "show" },
  exhibition: { label: "Exhibition", kind: "show" },
  opencall: { label: "Open call", kind: "opportunity" },
  collab: { label: "Collab", kind: "collab" },
  commission: { label: "Commission", kind: "collab" },
};

export const SHOW_TYPES: { key: string; label: string }[] = [
  { key: "exhibition", label: "Exhibition" },
  { key: "workshop", label: "Workshop" },
  { key: "online_workshop", label: "Online workshop" },
  { key: "artist_talk", label: "Artist talk" },
  { key: "open_studio", label: "Open studio" },
  { key: "gathering", label: "Gathering" },
  { key: "drink_draw", label: "Drink and draw" },
  { key: "popup", label: "Pop-up" },
  { key: "other", label: "Event" },
];

// "Looking for" choices. Artists and venues look for different things.
export const POOL_TYPES = {
  artist: [
    { key: "showcase", label: "A place to show my work" },
    { key: "collab", label: "An artist to collaborate with" },
    { key: "residency", label: "A residency or studio" },
    { key: "commission", label: "Commissions" },
    { key: "lend", label: "Someone to lend my work to" },
  ],
  venue: [
    { key: "walls", label: "Art for our walls" },
    { key: "selection", label: "Artists for a show" },
    { key: "gathering", label: "Artists for an event" },
    { key: "residency", label: "Artists for a residency" },
    { key: "buying", label: "Work to buy" },
    { key: "collab", label: "A venue to partner with" },
  ],
} as const;

const POOL_LABEL: Record<string, string> = {
  walls: "Art for our walls",
  showcase: "Looking for a venue",
  lend: "Lending work",
  collab: "Looking to collaborate",
  residency: "Residency",
  commission: "Open for commissions",
  gathering: "Looking for artists",
  selection: "Selecting artists",
  buying: "Looking to buy",
};

const isVenueRole = (r?: string | null) => r === "venue" || r === "gallery";

function poolKind(r: any): Kind {
  const venue = isVenueRole(r.poster_role || r.poster_type);
  if (venue) return r.request_type === "collab" ? "collab" : "opportunity";
  return "collab";
}

function poolLabel(r: any): string {
  if (r.request_type === "residency") {
    return isVenueRole(r.poster_role || r.poster_type) ? "Residency offered" : "Looking for a residency";
  }
  return POOL_LABEL[r.request_type] || "Looking for";
}

const imgs = (...lists: (string | null | undefined | string[])[]) =>
  Array.from(new Set(lists.flat().filter((s): s is string => !!s)));

// ── Normalisers ─────────────────────────────────────────────────────
function fromScene(r: any): FeedItem {
  const t = SCENE_TYPES[r.post_type] || { label: "Post", kind: "collab" as Kind };
  return {
    key: `scene-${r.id}`, source: "scene", id: r.id, userId: r.user_id,
    kind: t.kind, typeLabel: t.label, title: r.title, description: r.description || null,
    images: imgs(r.cover_image, r.images), where: r.location || null, online: !!r.is_online,
    link: r.submission_link || null, start: r.start_date || null, end: r.end_date || null,
    deadline: r.deadline || null, price: r.price_from || null, lat: null, lng: null,
    createdAt: r.created_at, poster: null, raw: r,
  };
}

function fromShow(r: any): FeedItem {
  const label = SHOW_TYPES.find(s => s.key === r.event_type)?.label || "Exhibition";
  return {
    key: `show-${r.id}`, source: "show", id: r.id, userId: r.user_id,
    kind: "show", typeLabel: label, title: r.title, description: r.description || null,
    images: imgs(r.cover_image), where: r.gallery_name || r.venue || r.location_name || null,
    online: !!r.is_online, link: r.online_url || null, start: r.start_date || null,
    end: r.end_date || null, deadline: null, price: null,
    lat: r.lat ?? null, lng: r.lng ?? null, createdAt: r.created_at, poster: null, raw: r,
  };
}

function fromPool(r: any): FeedItem {
  return {
    key: `pool-${r.id}`, source: "pool", id: r.id, userId: r.user_id,
    kind: poolKind(r), typeLabel: poolLabel(r), title: r.title, description: r.description || null,
    images: imgs(r.cover_image, r.images, r.artwork_images),
    where: r.location || r.location_name || r.venue_city || null, online: false, link: null,
    start: null, end: null, deadline: r.deadline || null, price: null,
    lat: r.lat ?? null, lng: r.lng ?? null, createdAt: r.created_at, poster: null, raw: r,
  };
}

/** Visible to everyone: public, still open, not withdrawn. */
export function isLive(i: FeedItem): boolean {
  if (i.source === "scene") return i.raw.is_public !== false && (i.raw.status || "active") === "active";
  if (i.source === "show") return i.raw.is_public !== false;
  return (i.raw.status || "open") === "open";
}

// ── Time ────────────────────────────────────────────────────────────
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Over and done: a show that has ended, or a call whose deadline passed. */
export function isPast(i: FeedItem, today = todayIso()): boolean {
  if (i.kind === "show") {
    const last = i.end || i.start;
    return !!last && last < today;
  }
  return !!i.deadline && i.deadline < today;
}

const fmt = (d: string, withYear = false) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
  });

/** One short line about when: "12 – 30 Mar", "From 4 Dec", "Apply by 9 Jan". */
export function whenLine(i: FeedItem): string | null {
  if (i.kind === "show" && i.start) {
    if (i.end && i.end !== i.start) return `${fmt(i.start)} – ${fmt(i.end)}`;
    return fmt(i.start);
  }
  if (i.deadline) return `Apply by ${fmt(i.deadline)}`;
  if (i.start) return fmt(i.start);
  return null;
}

export function fullDate(d: string | null): string | null {
  return d ? fmt(d, true) : null;
}

// ── Loading ─────────────────────────────────────────────────────────
export async function loadFeed(sb: SupabaseClient, me: string): Promise<FeedItem[]> {
  const [scene, shows, pool] = await Promise.all([
    sb.from("scene_posts").select("*").or(`and(is_public.eq.true,status.eq.active),user_id.eq.${me}`)
      .order("created_at", { ascending: false }).limit(120),
    sb.from("exhibitions").select("*").or(`is_public.eq.true,user_id.eq.${me}`)
      .order("created_at", { ascending: false }).limit(120),
    sb.from("pool_requests").select("*").or(`status.eq.open,user_id.eq.${me}`)
      .order("created_at", { ascending: false }).limit(120),
  ]);

  const items = [
    ...(scene.data || []).map(fromScene),
    ...(shows.data || []).map(fromShow),
    ...(pool.data || []).map(fromPool),
  ];

  const ids = Array.from(new Set(items.map(i => i.userId)));
  if (ids.length) {
    const { data: people } = await sb.from("profiles")
      .select("id, full_name, username, avatar_url, role").in("id", ids);
    const byId = new Map((people || []).map((p: Poster) => [p.id, p]));
    items.forEach(i => { i.poster = byId.get(i.userId) || null; });
  }

  return items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteItem(sb: SupabaseClient, i: FeedItem) {
  const table = i.source === "scene" ? "scene_posts" : i.source === "show" ? "exhibitions" : "pool_requests";
  return sb.from(table).delete().eq("id", i.id).eq("user_id", i.userId);
}

export { isVenueRole };

// ── "Where can my work go?" ─────────────────────────────────────────
/** Details a venue gives with an "Art for our walls" post (pool_requests.details). */
export type WallDetails = { wall?: string; duration?: string; sells?: boolean; commission?: number | null };

export const wallDetails = (i: FeedItem): WallDetails => (i.raw?.details || {}) as WallDetails;

/** Venues asking for art: wall posts, show selections, work to buy, open calls. */
export function wantsArt(i: FeedItem): boolean {
  if (i.source === "pool") {
    return isVenueRole(i.raw.poster_role || i.raw.poster_type) && ["walls", "selection", "gathering", "buying"].includes(i.raw.request_type);
  }
  return i.source === "scene" && i.raw.post_type === "opencall";
}

/** Artists asking for a place: "a place to show my work" or "someone to lend my work to". */
export function wantsPlace(i: FeedItem): boolean {
  return i.source === "pool" && !isVenueRole(i.raw.poster_role || i.raw.poster_type) && ["showcase", "lend"].includes(i.raw.request_type);
}

/** "Wall 3 × 2 m · 2 months · Sells work · 20% commission" */
export function wallTermsLine(d: WallDetails): string {
  return [
    d.wall, d.duration,
    d.sells === true ? "Sells work" : d.sells === false ? "Not selling" : null,
    d.sells && d.commission != null ? `${d.commission}% commission` : null,
  ].filter(Boolean).join(" · ");
}
