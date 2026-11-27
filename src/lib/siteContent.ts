// Words and pictures on public pages that the admin edits by hand.
// Stored in public.site_content (database/migrations/20261127_site_content.sql),
// one row per section, keyed by name. Until that SQL is run, or if a row is
// missing or malformed, pages use the defaults below, so nothing ever breaks.

export type MeanwhileCard = {
  /** A small square picture on the left of the card… */
  image_url?: string | null;
  /** …or a short number/word in a mango square instead (used when no picture). */
  badge?: string | null;
  /** The sentence. Wrap words in **double stars** to make them bold. */
  text: string;
};

export type MeanwhileContent = {
  headline: string;
  /** Optional line under the headline. Empty = not shown. */
  text: string;
  cards: MeanwhileCard[];
};

export const MEANWHILE_KEY = "home_meanwhile";
export const MEANWHILE_MAX_CARDS = 3;

export const MEANWHILE_DEFAULT: MeanwhileContent = {
  headline: "Meanwhile, your art is out there.",
  text: "",
  cards: [
    { image_url: "/demo/window-seat.jpg", text: "**Window Seat** is on the wall at a café in Žižkov" },
    { badge: "12", text: "people scanned its wall label this week" },
    { image_url: "/demo/tram-22.jpg", text: "Someone tapped **Buy** on **Tram 22**" },
  ],
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Accepts whatever is in the database and returns something safe to show. */
export function readMeanwhile(value: unknown): MeanwhileContent {
  if (!value || typeof value !== "object") return MEANWHILE_DEFAULT;
  const v = value as Record<string, unknown>;
  const cards = Array.isArray(v.cards)
    ? v.cards.slice(0, MEANWHILE_MAX_CARDS).flatMap((c): MeanwhileCard[] => {
        if (!c || typeof c !== "object") return [];
        const o = c as Record<string, unknown>;
        const text = str(o.text, 160).trim();
        if (!text) return [];
        const image_url = str(o.image_url, 600).trim() || null;
        return [{ text, image_url, badge: image_url ? null : str(o.badge, 4).trim() || null }];
      })
    : MEANWHILE_DEFAULT.cards;
  return {
    headline: str(v.headline, 90).trim() || MEANWHILE_DEFAULT.headline,
    text: str(v.text, 280).trim(),
    cards,
  };
}

/** "Someone tapped **Buy**" → ["Someone tapped ", <b>Buy</b>]. Nothing else is parsed. */
export function splitBold(text: string): { bold: boolean; part: string }[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(part =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? { bold: true, part: part.slice(2, -2) }
      : { bold: false, part });
}
