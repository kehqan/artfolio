// "Where can my work go?" helpers, shared by Home, the Looking for art page,
// the offer sheet and the public "Art available near you" page.
import { formatPrice } from "@/lib/artwork-stage";

export type WallTerms = "sale" | "loan" | "either";

export const WALL_LABEL: Record<WallTerms, string> = {
  either: "For sale or on loan",
  sale: "For sale",
  loan: "On loan only",
};

export type PlaceArtwork = {
  id: string; title: string; images?: string[] | null; medium?: string | null;
  width_cm?: number | null; height_cm?: number | null; depth_cm?: number | null;
  price?: number | null; currency?: string | null; status?: string | null;
  wall_terms?: WallTerms | null; user_id?: string;
};

/** "Prague, Czech Republic" → "Prague". Profiles keep a free-text location. */
export function cityOf(location?: string | null): string {
  return (location || "").split(",")[0].trim();
}

/** Loose match so "Praha", "Prague 7" and "Prague, CZ" all count as Prague. */
export function sameCity(where?: string | null, city?: string | null): boolean {
  const c = norm(city);
  if (!c) return false;
  const w = norm(where);
  return !!w && (w.includes(c) || (ALIASES[c] || []).some(a => w.includes(a)));
}
const norm = (s?: string | null) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const ALIASES: Record<string, string[]> = {
  prague: ["praha"], praha: ["prague"], vienna: ["wien"], wien: ["vienna"],
  munich: ["munchen"], munchen: ["munich"], brno: [], cologne: ["koln"], koln: ["cologne"],
};

export const isSold = (a: PlaceArtwork) => (a.status || "").toLowerCase() === "sold";

/** A work a venue could say yes to: a photo, a size, and a price or lending. */
export function wallReady(a: PlaceArtwork): boolean {
  if (isSold(a)) return false;
  const photo = !!a.images?.length;
  const size = !!(a.width_cm && a.height_cm);
  const terms = a.wall_terms === "loan" || a.price != null;
  return photo && size && terms;
}

/** What's still missing before a work is ready, in plain words. */
export function missingForWall(a: PlaceArtwork): string[] {
  const out: string[] = [];
  if (!a.images?.length) out.push("a photo");
  if (!(a.width_cm && a.height_cm)) out.push("its size");
  if (a.wall_terms !== "loan" && a.price == null) out.push("a price");
  return out;
}

export function sizeLine(a: PlaceArtwork): string | null {
  if (!a.width_cm || !a.height_cm) return null;
  return `${Number(a.width_cm)} × ${Number(a.height_cm)} cm`;
}

/** "80 × 60 cm · Oil · €1,800" or "… · Available to lend". */
export function workLine(a: PlaceArtwork): string {
  const price = a.wall_terms === "loan" ? "Available to lend" : formatPrice(a.price, a.currency);
  return [sizeLine(a), a.medium, price].filter(Boolean).join(" · ");
}

/** URL slug for a city: "České Budějovice" → "ceske-budejovice". */
export function citySlug(city: string): string {
  return norm(city).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
