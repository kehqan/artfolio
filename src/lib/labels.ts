// Wall labels: a printed label next to a work, with a QR code that opens
// the piece page /l/<code>. The QR points to /s/<code>, which counts the
// scan and forwards to the page (src/app/s/[code]/route.ts).
//
// Privacy: a scan stores the label, the hour and what happened next. No IP,
// device, cookie or location (database/migrations/20261125_wall_labels.sql).
import type { SupabaseClient } from "@supabase/supabase-js";

export type LabelDesign = "quiet" | "mango" | "ink" | "picture";
export type LabelSize = "card" | "post" | "stand";
export type LabelLanguage = "en" | "cs" | "both";
/** price: show it. ask: "Price on request". off: nothing about selling (loans, shows). */
export type LabelSales = "price" | "ask" | "off";
export type LabelShow = { year?: boolean; medium?: boolean; size?: boolean; note?: boolean; place?: boolean };

export type WallLabel = {
  id: string; code: string; artwork_id: string; created_by: string;
  deal_id: string | null; project_id: string | null;
  place_name: string | null; place_city: string | null; place_profile: string | null;
  starts_on: string | null; ends_on: string | null;
  design: LabelDesign; size: LabelSize; language: LabelLanguage;
  show: LabelShow; note: string | null; sales: LabelSales;
  created_at: string; updated_at: string;
};

/** What a label prints about the work. */
export type LabelWork = {
  id: string; title: string; year?: number | null; medium?: string | null;
  width_cm?: number | null; height_cm?: number | null; depth_cm?: number | null;
  price?: number | null; currency?: string | null; images?: string[] | null; status?: string | null;
  user_id?: string | null;
};

export const DESIGNS: { key: LabelDesign; name: string; line: string }[] = [
  { key: "quiet", name: "Quiet", line: "White and calm. Never fights the work." },
  { key: "mango", name: "Mango", line: "Our yellow. For cafes and busy walls." },
  { key: "ink", name: "Ink", line: "Black. For dark rooms and white walls." },
  { key: "picture", name: "Picture", line: "With a small image, so labels never mix up." },
];

/** Sizes in millimetres. A stand is an A5 sheet folded into a tent; each face is A6 landscape. */
export const SIZES: { key: LabelSize; name: string; dim: string; w: number; h: number; line: string; perSheet: number }[] = [
  { key: "card", name: "Card", dim: "85 × 55 mm", w: 85, h: 55, line: "Business card size. The classic label.", perSheet: 10 },
  { key: "post", name: "Post", dim: "A6 · 105 × 148 mm", w: 105, h: 148, line: "For big works, or room for a note.", perSheet: 4 },
  { key: "stand", name: "Stand", dim: "A5, folds into a tent", w: 148, h: 105, line: "Stands on a table, shelf or bar.", perSheet: 2 },
];
export const sizeOf = (k: LabelSize) => SIZES.find(s => s.key === k) || SIZES[0];

export const SALES: { key: LabelSales; name: string; line: string }[] = [
  { key: "price", name: "Show price", line: "Visitors see the price and can ask to buy." },
  { key: "ask", name: "Ask about it", line: "No price. Visitors can ask about the work." },
  { key: "off", name: "Not for sale here", line: "Nothing about selling, on the label or the page." },
];

export const DEFAULT_SHOW: LabelShow = { year: true, medium: true, size: true, note: false, place: false };

// Words printed on the label, in English, Czech or both.
const WORDS = {
  scan: { en: "Scan to see more", cs: "Naskenujte pro více" },
  ask: { en: "Price on request", cs: "Cena na dotaz" },
};
export function say(key: keyof typeof WORDS, lang: LabelLanguage) {
  const w = WORDS[key];
  return lang === "both" ? `${w.en} · ${w.cs}` : w[lang];
}

export function dims(w: Pick<LabelWork, "width_cm" | "height_cm" | "depth_cm">) {
  const d = [w.width_cm, w.height_cm, w.depth_cm].filter(x => x != null && Number(x) > 0).map(x => Number(x).toLocaleString("en-GB"));
  return d.length ? `${d.join(" × ")} cm` : "";
}

/** Prices on paper: "18 000 Kč", "€1,200". */
export function printedPrice(price?: number | null, currency?: string | null) {
  if (price == null) return null;
  const code = (currency || "EUR").toUpperCase();
  if (code === "CZK") return `${Math.round(price).toLocaleString("cs-CZ").replace(/ /g, " ")} Kč`;
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(price); }
  catch { return `${price} ${code}`; }
}

export const isSold = (w?: { status?: string | null } | null) => (w?.status || "").toLowerCase() === "sold";

/** The sales a label can have for this work. */
export function salesFor(sales: LabelSales, w: LabelWork): LabelSales {
  if (isSold(w)) return "off";
  if (sales === "price" && w.price == null) return "ask";
  return sales;
}

/**
 * The address inside the QR. Upper case on purpose: QR codes store
 * A-Z, 0-9 and a few symbols more compactly, so the code has fewer, bigger
 * squares and scans better when printed small. Web addresses ignore case,
 * and the site sends /S/... to /s/... (src/middleware.ts).
 */
export function qrUrl(code: string, origin?: string) {
  const o = origin || (typeof window !== "undefined" ? window.location.origin : "https://artomango.com");
  return `${o}/s/${code}`.toUpperCase();
}
export const pageUrl = (code: string) => `/l/${code}`;

// ── Places ──────────────────────────────────────────────────────────
/** Format "12 Jan" / "12 Jan – 3 Mar 2027". */
export function rangeLine(from?: string | null, to?: string | null) {
  const f = (d: string, year: boolean) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
  if (from && to) return `${f(from, false)} – ${f(to, true)}`;
  if (to) return `until ${f(to, true)}`;
  if (from) return `from ${f(from, true)}`;
  return "";
}

/** What a new label starts with, from a deal or a project. */
export type LabelPlace = {
  place_name: string; place_city: string; place_profile: string | null;
  starts_on: string | null; ends_on: string | null; deal_id: string | null; project_id: string | null;
  /** Deal says the venue doesn't sell: start with selling off. */
  displayOnly?: boolean;
};

export async function placeFromDeal(sb: SupabaseClient, dealId: string): Promise<{ place: LabelPlace; artworkIds: string[]; artistId: string } | null> {
  const { data: d } = await sb.from("deals").select("id, artist_id, venue_id, artwork_ids, contract_id, project_id, terms").eq("id", dealId).maybeSingle();
  if (!d) return null;
  const [{ data: venue }, { data: contract }, { data: project }] = await Promise.all([
    sb.from("profiles").select("id, full_name, venue_name, location").eq("id", d.venue_id).maybeSingle(),
    d.contract_id ? sb.from("contracts").select("venue_name, start_date, end_date").eq("id", d.contract_id).maybeSingle() : Promise.resolve({ data: null }),
    d.project_id ? sb.from("projects").select("id, title, place, starts_on, ends_on").eq("id", d.project_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const c = contract as { venue_name?: string | null; start_date?: string | null; end_date?: string | null } | null;
  const p = project as { id: string; title: string; place?: string | null; starts_on?: string | null; ends_on?: string | null } | null;
  const v = venue as { id: string; full_name?: string | null; venue_name?: string | null; location?: string | null } | null;
  return {
    artworkIds: (d.artwork_ids as string[]) || [],
    artistId: d.artist_id as string,
    place: {
      place_name: (p?.title || c?.venue_name || v?.venue_name || v?.full_name || "").trim(),
      place_city: (p?.place || v?.location || "").split(",").slice(-1)[0]?.trim() || "",
      place_profile: p ? null : v?.id || null,
      starts_on: c?.start_date || p?.starts_on || null,
      ends_on: c?.end_date || p?.ends_on || null,
      deal_id: d.id as string,
      project_id: (d.project_id as string | null) || null,
      displayOnly: (d.terms as { sells?: boolean | null } | null)?.sells === false,
    },
  };
}

// ── Scans ───────────────────────────────────────────────────────────
export type ScanAction = "scan" | "passport" | "follow" | "ask" | "buy";
export type StatRow = { label_id: string; action: ScanAction; hour: string; n: number };

/** Totals for labels (artist, venue and curator alike; no people). */
export async function loadStats(sb: SupabaseClient, labelIds: string[]): Promise<StatRow[]> {
  if (!labelIds.length) return [];
  const { data } = await sb.rpc("label_stats", { p_label_ids: labelIds });
  return ((data || []) as StatRow[]).map(r => ({ ...r, n: Number(r.n) }));
}

export type Summary = {
  scans: number; week: number; passport: number; follow: number; ask: number; buy: number;
  /** Scans by local hour of day, 0–23. */
  byHour: number[];
  /** Scans per day for the last 28 days, oldest first. */
  byDay: number[];
};

export function summarize(rows: StatRow[], labelId?: string): Summary {
  const s: Summary = { scans: 0, week: 0, passport: 0, follow: 0, ask: 0, buy: 0, byHour: Array(24).fill(0), byDay: Array(28).fill(0) };
  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const r of rows) {
    if (labelId && r.label_id !== labelId) continue;
    if (r.action !== "scan") { s[r.action] += r.n; continue; }
    s.scans += r.n;
    const t = new Date(r.hour);
    if (now - t.getTime() < 7 * 864e5) s.week += r.n;
    s.byHour[t.getHours()] += r.n;
    const day = Math.floor((today.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5);
    if (day >= 0 && day < 28) s.byDay[27 - day] += r.n;
  }
  return s;
}

/** Record something that happened on a piece page. Never throws. */
export async function recordEvent(sb: SupabaseClient, code: string, action: ScanAction) {
  try { await sb.rpc("record_label_event", { p_code: code, p_action: action }); } catch { /* counting is best-effort */ }
}

// ── Loading labels with their works ─────────────────────────────────
export type LabelBundle = WallLabel & { work: LabelWork | null; artistName: string };

const WORK_FIELDS = "id, title, year, medium, width_cm, height_cm, depth_cm, price, currency, images, status, user_id";

export async function loadLabels(sb: SupabaseClient, filter: { ids?: string[]; artwork?: string; deal?: string; project?: string; all?: boolean }): Promise<LabelBundle[] | null> {
  let q = sb.from("wall_labels").select("*").order("created_at", { ascending: false });
  if (filter.ids) q = q.in("id", filter.ids.length ? filter.ids : ["00000000-0000-0000-0000-000000000000"]);
  if (filter.artwork) q = q.eq("artwork_id", filter.artwork);
  if (filter.deal) q = q.eq("deal_id", filter.deal);
  if (filter.project) q = q.eq("project_id", filter.project);
  const { data, error } = await q;
  if (error) return null;
  const labels = (data || []) as WallLabel[];
  const workIds = Array.from(new Set(labels.map(l => l.artwork_id)));
  const { data: ws } = workIds.length ? await sb.from("artworks").select(WORK_FIELDS).in("id", workIds) : { data: [] };
  const works = new Map(((ws || []) as LabelWork[]).map(w => [w.id, w]));
  const artistIds = Array.from(new Set(((ws || []) as LabelWork[]).map(w => w.user_id).filter(Boolean))) as string[];
  const { data: ps } = artistIds.length ? await sb.from("profiles").select("id, full_name").in("id", artistIds) : { data: [] };
  const names = new Map(((ps || []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name || ""]));
  return labels.map(l => {
    const work = works.get(l.artwork_id) || null;
    return { ...l, show: { ...DEFAULT_SHOW, ...(l.show || {}) }, work, artistName: (work?.user_id && names.get(work.user_id)) || "" };
  });
}

export async function loadWorks(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return [] as LabelWork[];
  const { data } = await sb.from("artworks").select(WORK_FIELDS).in("id", ids);
  return (data || []) as LabelWork[];
}
export const LABEL_WORK_FIELDS = WORK_FIELDS;
