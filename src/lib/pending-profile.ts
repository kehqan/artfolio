// Sign-up details that wait for the email to be confirmed.
//
// When email confirmation is on, sign-up returns no session, so the
// profile can't be saved yet. The details ride along in the user's
// metadata instead, and are saved the first time they're signed in.
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type PendingProfile = Record<string, unknown>;

/** Save the sign-up details once, then clear them. Returns true if it saved. */
export async function applyPendingProfile(sb: SupabaseClient, user: User): Promise<boolean> {
  const pending = user.user_metadata?.profile as PendingProfile | null | undefined;
  if (!pending || typeof pending !== "object") return false;
  // Never let metadata change who someone is or grant a role.
  const { id: _id, role, ...rest } = pending as PendingProfile & { id?: unknown; role?: unknown };
  const fields: PendingProfile = { ...rest, onboarding_done: true };
  if (role === "artist" || role === "venue" || role === "gallery" || role === "curator") fields.role = role;
  const { error } = await sb.from("profiles").update(fields).eq("id", user.id);
  if (error) return false;
  await sb.auth.updateUser({ data: { profile: null } });
  return true;
}
