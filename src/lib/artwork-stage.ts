import type { BadgeTone } from "@/components/ui";

/** Artwork lifecycle stages, shared by the list, detail and forms. */
export const STAGES: Array<{ key: string; label: string; tone: BadgeTone }> = [
  { key: "concept", label: "Concept", tone: "neutral" },
  { key: "in_progress", label: "In progress", tone: "violet" },
  { key: "complete", label: "Complete", tone: "info" },
  { key: "available", label: "Available", tone: "ok" },
  { key: "reserved", label: "Reserved", tone: "warn" },
  { key: "sold", label: "Sold", tone: "inverse" },
];

export const STAGE_MAP: Record<string, (typeof STAGES)[number]> = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export function toStageKey(status: string | null | undefined) {
  const s = String(status || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[s] ? s : "available";
}

/**
 * Format a price in the artwork's currency. Artworks store an ISO code
 * ("EUR", "CZK", "USD"); EUR is the form's default, so it's ours too.
 */
export function formatPrice(price: number | string | null | undefined, currency?: string | null) {
  if (price == null || price === "") return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  const code = (currency || "EUR").trim();
  if (/^[A-Za-z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase(), maximumFractionDigits: 0 }).format(n);
    } catch {
      /* fall through */
    }
  }
  return `${code}${n.toLocaleString("en-US")}`;
}
