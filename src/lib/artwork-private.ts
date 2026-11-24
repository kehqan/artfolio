// The parts of a work only its artist should see: private notes, what the
// materials cost, hours spent, and the link to a digital original. They live
// in their own table (artwork_private) that only the owner can read, so the
// public artworks table never carries them.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ArtworkPrivate = {
  notes: string | null;
  materials_cost: number | null;
  time_spent: number | null;
  digital_file_url: string | null;
};

export const EMPTY_PRIVATE: ArtworkPrivate = { notes: null, materials_cost: null, time_spent: null, digital_file_url: null };

const pick = (row: Partial<ArtworkPrivate> | null | undefined): ArtworkPrivate => ({
  notes: row?.notes ?? null,
  materials_cost: row?.materials_cost ?? null,
  time_spent: row?.time_spent ?? null,
  digital_file_url: row?.digital_file_url ?? null,
});

/** The owner's private details for a work. `legacy` is the artworks row, used until the move to artwork_private is run. */
export async function loadPrivate(sb: SupabaseClient, artworkId: string, legacy?: Partial<ArtworkPrivate> | null): Promise<ArtworkPrivate> {
  const { data, error } = await sb.from("artwork_private").select("notes, materials_cost, time_spent, digital_file_url").eq("artwork_id", artworkId).maybeSingle();
  if (error) return pick(legacy);
  return data ? pick(data) : pick(legacy);
}

/** Save the owner's private details. Falls back to the old columns if the new table isn't there yet. */
export async function savePrivate(sb: SupabaseClient, artworkId: string, userId: string, fields: ArtworkPrivate): Promise<boolean> {
  const { error } = await sb.from("artwork_private").upsert({ artwork_id: artworkId, user_id: userId, ...fields, updated_at: new Date().toISOString() }, { onConflict: "artwork_id" });
  if (!error) return true;
  const { error: e2 } = await sb.from("artworks").update(fields).eq("id", artworkId);
  return !e2;
}
