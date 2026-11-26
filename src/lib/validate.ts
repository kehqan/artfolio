/**
 * Checks for what people send to our API routes.
 *
 * We never paste user text into SQL: Supabase sends every value as a
 * parameter, so a name like `'; drop table --` is saved as plain text. What
 * these checks add is shape: ids look like ids, lists come from our own
 * choices, and text has a sensible length. Free text (messages, bios) is kept
 * exactly as typed, never stripped.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Trimmed text no longer than `max`, or null when empty or not text. */
export function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** A value from a fixed list, else the fallback. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

/** A small JSON object (like a chat's "about this work" card), or null. */
export function smallObject(v: unknown, maxBytes = 2000): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  try {
    return JSON.stringify(v).length <= maxBytes ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Text that goes inside a PostgREST `.or()` filter, like a search box.
 * Commas, brackets, quotes and wildcards there would change the filter
 * itself, so they become spaces. Only for filters, never for saved text.
 */
export const forFilter = (v: string) => v.replace(/[,()*%\\"':.]/g, " ").replace(/\s+/g, " ").trim();

/** The friendly answer when the database says someone is going too fast or is blocked. */
export function dbRefusal(error: { message?: string; hint?: string } | null | undefined): { status: number; error: string } | null {
  if (!error) return null;
  if (error.hint === "rate_limited") return { status: 429, error: error.message || "Wait a few minutes and try again." };
  if (error.hint === "blocked") return { status: 403, error: "You can't send messages to this person." };
  return null;
}

/** Longest message we accept. Long enough for any letter, short enough to stop floods. */
export const MESSAGE_MAX = 5000;
