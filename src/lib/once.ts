// Saving something exactly once, even on a bad connection.
//
// On a phone, a save can reach the database while the answer never makes it
// back (signal drops in a lift, the café wifi hiccups). The person taps again
// and, without this, gets two works, two offers or two agreements.
//
// So a form picks the new row's id itself, once, when it opens. Every retry
// sends the same id. The first save wins; a repeat hits "that id already
// exists" and we simply read the row that is already there.
import type { SupabaseClient } from "@supabase/supabase-js";

/** A fresh id. crypto.randomUUID is missing on iPhones older than iOS 15.4. */
export function newId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** True when the database said "this row is already there". */
export function isDuplicate(err: { code?: string } | null | undefined): boolean {
  return err?.code === "23505";
}

/**
 * Insert a row that carries its own id. If an earlier try already saved it,
 * return that row instead of an error.
 */
export async function insertOnce<T = any>(
  sb: SupabaseClient, table: string, row: Record<string, unknown> & { id: string }, columns = "*",
): Promise<{ data: T | null; error: { message: string; code?: string; hint?: string } | null }> {
  const first = await sb.from(table).insert(row).select(columns).single();
  if (!first.error) return { data: first.data as T, error: null };
  if (isDuplicate(first.error)) {
    const again = await sb.from(table).select(columns).eq("id", row.id).maybeSingle();
    if (again.data) return { data: again.data as T, error: null };
  }
  return { data: null, error: first.error };
}
