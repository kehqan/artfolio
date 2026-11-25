// The journey: small things Artomango remembers so it can guide each person
// without asking twice.
//   hints: one-time page hints they've already closed ("Got it").
//   won:   milestones they've reached (first work, first offer, first sale…),
//          so each celebration shows once.
// Kept on the account itself (auth user_metadata.journey), so it follows
// them across devices and needs no table. A local copy makes it instant.
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Milestone =
  | "first_work"     // a work is in the studio
  | "open_to_wall"   // first work open to a wall
  | "site_live"      // saved their site for the first time
  | "first_offer"    // artist offered a work to a place
  | "first_request"  // venue asked an artist for works
  | "first_signed"   // an agreement signed by both
  | "first_sale"     // recorded a paid sale
  | "first_post";    // posted walls or a call

export type Journey = { hints: string[]; won: string[] };

const EMPTY: Journey = { hints: [], won: [] };
const key = (uid: string) => `artomango.journey.${uid}`;

function clean(raw: unknown): Journey {
  const j = (raw || {}) as Partial<Journey>;
  return {
    hints: Array.isArray(j.hints) ? j.hints.filter(x => typeof x === "string") : [],
    won: Array.isArray(j.won) ? j.won.filter(x => typeof x === "string") : [],
  };
}

function merge(a: Journey, b: Journey): Journey {
  return {
    hints: Array.from(new Set([...a.hints, ...b.hints])),
    won: Array.from(new Set([...a.won, ...b.won])),
  };
}

export function readLocal(uid: string): Journey {
  try { return clean(JSON.parse(localStorage.getItem(key(uid)) || "null")); } catch { return EMPTY; }
}
function writeLocal(uid: string, j: Journey) {
  try { localStorage.setItem(key(uid), JSON.stringify(j)); } catch {}
}

/** What we know so far: the account's copy plus anything saved locally. */
export function journeyOf(user: User): Journey {
  return merge(clean(user.user_metadata?.journey), readLocal(user.id));
}

/** Add to the journey and save it on the account. Returns the new journey. */
export async function saveJourney(sb: SupabaseClient, uid: string, add: Partial<Journey>): Promise<Journey> {
  const local = merge(readLocal(uid), { hints: add.hints || [], won: add.won || [] });
  writeLocal(uid, local);
  // Read the latest account copy first, so two tabs never undo each other.
  const { data: { user } } = await sb.auth.getUser();
  const next = merge(user ? clean(user.user_metadata?.journey) : EMPTY, local);
  await sb.auth.updateUser({ data: { journey: next } }).catch(() => null);
  return next;
}
