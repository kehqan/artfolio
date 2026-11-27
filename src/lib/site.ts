// Personal sites: the look an owner picks for their public page, and the
// data the page shows. Every choice is a preset, so any mix stays polished.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBuyHosts } from "./buy";
import { asDate, localDay } from "@/lib/dates";

// ── Presets ─────────────────────────────────────────────────────────
export type AccentKey = "mango" | "ink" | "clay" | "moss" | "ocean" | "plum" | "rose" | "sand";
export const ACCENTS: { key: AccentKey; label: string; color: string; on: string }[] = [
  { key: "mango", label: "Mango", color: "#FFD400", on: "#141414" },
  { key: "ink",   label: "Ink",   color: "#141414", on: "#FBF8F0" },
  { key: "clay",  label: "Clay",  color: "#C2553A", on: "#FFFFFF" },
  { key: "moss",  label: "Moss",  color: "#4E6B3A", on: "#FFFFFF" },
  { key: "ocean", label: "Ocean", color: "#1F5C88", on: "#FFFFFF" },
  { key: "plum",  label: "Plum",  color: "#6A3A6D", on: "#FFFFFF" },
  { key: "rose",  label: "Rose",  color: "#EBA3AC", on: "#141414" },
  { key: "sand",  label: "Sand",  color: "#D8C29E", on: "#141414" },
];

export type HeaderKey = "statement" | "split" | "minimal";
export const HEADERS: { key: HeaderKey; label: string; hint: string }[] = [
  { key: "statement", label: "Statement", hint: "A big image with your name on it" },
  { key: "split", label: "Split", hint: "Your photo beside your name and intro" },
  { key: "minimal", label: "Minimal", hint: "Just your name and one line" },
];

export type GridKey = "gallery" | "salon" | "single";
export const GRIDS: { key: GridKey; label: string; hint: string }[] = [
  { key: "gallery", label: "Gallery", hint: "Even squares, calm and tidy" },
  { key: "salon", label: "Salon", hint: "A full wall, every work at its own shape" },
  { key: "single", label: "One by one", hint: "Large, one under another" },
];

export type TypeKey = "classic" | "modern";
export const TYPES: { key: TypeKey; label: string; hint: string }[] = [
  { key: "classic", label: "Classic", hint: "Serif headlines, like a gallery catalogue" },
  { key: "modern", label: "Modern", hint: "Bold sans headlines" },
];

// ── Sections ────────────────────────────────────────────────────────
export type SectionKey =
  | "featured" | "work" | "about" | "onshow" | "shows" | "contact"           // artist
  | "perspective" | "onwalls" | "history" | "collection" | "space" | "calls"; // venue

export const SECTION_LABEL: Record<SectionKey, string> = {
  featured: "Featured", work: "Work", about: "About", onshow: "On show now", shows: "Exhibitions", contact: "Contact",
  perspective: "Our perspective", onwalls: "On our walls now", history: "Wall history", collection: "Collection",
  space: "The space", calls: "Open calls",
};

export const SECTION_HINT: Record<SectionKey, string> = {
  featured: "1 to 3 hero works, from the stars in Your works",
  work: "Everything, with filters for available and sold",
  about: "Your statement, bio and CV",
  onshow: "Filled in from your signed deals",
  shows: "Your public shows and events",
  contact: "Your links and a message button",
  perspective: "What art you love, and why",
  onwalls: "The current show, from signed deals",
  history: "Every artist who has hung here",
  collection: "Works you own",
  space: "Photos, walls and opening hours",
  calls: "Your open wall posts, with Offer a work",
};

export const ARTIST_SECTIONS: SectionKey[] = ["featured", "work", "onshow", "about", "shows", "contact"];
export const VENUE_SECTIONS: SectionKey[] = ["perspective", "onwalls", "calls", "history", "collection", "space", "contact"];

export type CvItem = { year: string; text: string };

export type SiteConfig = {
  accent: AccentKey; header: HeaderKey; grid: GridKey; type: TypeKey;
  sections: { key: SectionKey; on: boolean }[];
  statement?: string;
  cv?: CvItem[];
  perspective?: string;
  hours?: string;
  space_note?: string;
  space_images?: string[];
};

export const isVenueRole = (r?: string | null) => r === "venue" || r === "gallery";

export function defaultSite(role?: string | null): SiteConfig {
  const keys = isVenueRole(role) ? VENUE_SECTIONS : ARTIST_SECTIONS;
  return { accent: "mango", header: isVenueRole(role) ? "statement" : "split", grid: "gallery", type: "modern", sections: keys.map(key => ({ key, on: true })) };
}

/** Stored settings → a complete config, with any new sections added at the end. */
export function siteOf(raw: unknown, role?: string | null): SiteConfig {
  const base = defaultSite(role);
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteConfig>;
  const allowed = new Set(base.sections.map(s => s.key));
  const pick = <T extends string>(v: unknown, opts: { key: T }[], d: T): T => (opts.some(o => o.key === v) ? (v as T) : d);
  const saved = (Array.isArray(r.sections) ? r.sections : []).filter(s => s && allowed.has(s.key));
  const seen = new Set(saved.map(s => s.key));
  return {
    ...r,
    accent: pick(r.accent, ACCENTS, base.accent),
    header: pick(r.header, HEADERS, base.header),
    grid: pick(r.grid, GRIDS, base.grid),
    type: pick(r.type, TYPES, base.type),
    sections: [...saved.map(s => ({ key: s.key, on: s.on !== false })), ...base.sections.filter(s => !seen.has(s.key))],
    cv: Array.isArray(r.cv) ? r.cv.filter(c => c && (c.year || c.text)) : [],
    space_images: Array.isArray(r.space_images) ? r.space_images.filter(Boolean) : [],
  };
}

export const accentOf = (k: AccentKey) => ACCENTS.find(a => a.key === k) || ACCENTS[0];

// ── Data ────────────────────────────────────────────────────────────
export type SiteProfile = {
  id: string; full_name: string; username: string; role?: string | null;
  bio?: string | null; location?: string | null; avatar_url?: string | null;
  website?: string | null; instagram?: string | null; behance?: string | null; linkedin?: string | null;
  venue_name?: string | null; venue_type?: string | null; art_styles_sought?: string[] | null;
};
export type SiteWork = {
  id: string; title: string; medium?: string | null; year?: number | null; description?: string | null;
  price?: number | null; currency?: string | null; status: string; images?: string[] | null; sale_method?: string | null;
  width_cm?: number | null; height_cm?: number | null; depth_cm?: number | null; framed?: boolean | null;
  featured?: boolean; forSale?: boolean;
};
export type SiteShow = { id: string; title: string; venue?: string | null; start_date?: string | null; end_date?: string | null; cover_image?: string | null; description?: string | null };
export type WallEntry = {
  deal_id: string; side: "venue" | "artist"; other_name: string | null; other_username: string | null; other_avatar: string | null;
  venue_name: string | null; start_date: string | null; end_date: string | null; works: { id: string; title: string; image: string | null }[];
};
export type OpenCall = { id: string; title: string; description?: string | null; details?: Record<string, unknown> | null; cover_image?: string | null; location?: string | null };

export type SiteSettings = { store_name?: string | null; tagline?: string | null; banner_url?: string | null; show_location?: boolean | null; is_active?: boolean | null; site?: unknown };

export type SiteData = {
  profile: SiteProfile;
  settings: SiteSettings;
  works: SiteWork[];
  shows: SiteShow[];
  wall: WallEntry[];
  calls: OpenCall[];
  followers: number;
  /** Works with the artist's own Buy link: work id → the shop's address (lib/buy). */
  buy?: Record<string, string>;
};

const WORK_FIELDS = "id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed";
const PROFILE_FIELDS = "id, full_name, username, role, bio, location, avatar_url, website, instagram, behance, linkedin, venue_name, venue_type, art_styles_sought";

export async function loadSiteData(sb: SupabaseClient, by: { username?: string; id?: string }): Promise<SiteData | null> {
  const q = sb.from("profiles").select(PROFILE_FIELDS);
  const { data: profile } = await (by.id ? q.eq("id", by.id) : q.eq("username", by.username || "")).single();
  if (!profile) return null;
  const uid = profile.id as string;
  const venue = isVenueRole(profile.role);
  const [{ data: ss }, { data: store }, { data: works }, { data: shows }, { data: wall }, calls, { count }] = await Promise.all([
    sb.from("store_settings").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("store_artworks").select("artwork_id, sort_order, featured").eq("user_id", uid).order("sort_order"),
    sb.from("artworks").select(WORK_FIELDS).eq("user_id", uid).order("created_at", { ascending: false }),
    sb.from("exhibitions").select("id, title, venue, start_date, end_date, cover_image, description").eq("user_id", uid).eq("is_public", true).order("start_date", { ascending: false }).limit(30),
    sb.rpc("public_wall_history", { p_user: uid }),
    venue
      ? sb.from("pool_requests").select("id, title, description, details, cover_image, location").eq("user_id", uid).eq("request_type", "walls").eq("status", "open").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as OpenCall[] }),
    sb.from("followers").select("*", { count: "exact", head: true }).eq("following_id", uid),
  ]);

  // Works in the store keep its order and stars; the rest follow, newest first.
  const entries = (store || []) as { artwork_id: string; sort_order: number; featured: boolean }[];
  const order = new Map(entries.map((e, i) => [e.artwork_id, i]));
  const star = new Map(entries.map(e => [e.artwork_id, !!e.featured]));
  const list = ((works || []) as SiteWork[])
    .filter(w => (w.status || "").toLowerCase() !== "concept")
    .map(w => ({ ...w, featured: star.get(w.id) || false, forSale: order.has(w.id) }))
    .sort((a, b) => (order.has(a.id) ? order.get(a.id)! : 1e6) - (order.has(b.id) ? order.get(b.id)! : 1e6));

  // The artist's own Buy links. Missing (feature not set up yet) means none.
  const buy = venue ? {} : await loadBuyHosts(sb, list.filter(w => !isSoldWork(w)).map(w => w.id));

  return {
    profile: profile as SiteProfile,
    settings: (ss || {}) as SiteSettings,
    works: list,
    shows: (shows || []) as SiteShow[],
    wall: ((wall as WallEntry[] | null) || []),
    calls: ((calls as { data: OpenCall[] | null }).data || []),
    followers: count || 0,
    buy,
  };
}

/** What the editor sends to the preview frame. */
export type PreviewMessage = { type: "site-preview"; site: SiteConfig; settings: Partial<SiteSettings> };

// ── Small helpers ───────────────────────────────────────────────────
export const isSoldWork = (w: SiteWork) => (w.status || "").toLowerCase() === "sold";
export const dimsOf = (w: SiteWork) => {
  const d = [w.width_cm, w.height_cm, w.depth_cm].filter(Boolean);
  return d.length ? `${d.join(" × ")} cm` : "";
};
export const webHref = (url: string) => (url.startsWith("http") ? url : `https://${url}`);
export const today = () => localDay();
export const isCurrent = (e: { start_date: string | null; end_date: string | null }) =>
  (!e.end_date || e.end_date >= today()) && (!e.start_date || e.start_date <= today());
export const fmtRange = (a?: string | null, b?: string | null) => {
  const f = (d: string) => asDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (!a) return b ? `Until ${f(b)}` : "";
  return b && b !== a ? `${f(a)} – ${f(b)}` : f(a);
};
