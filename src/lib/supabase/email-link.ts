// Sign someone in from a link in an auth email (confirm email, reset password).
//
// Two kinds of link reach us:
//  - ?token_hash=…&type=…  works on any device. This is what the email
//    templates should send (see database/migrations/20261127_edge_cases.sql,
//    "Email templates"), because people often ask for a reset on a laptop and
//    open the email on their phone.
//  - ?code=…  only works in the same browser that asked for it. The Supabase
//    client may already have used the code by the time the page runs, so a
//    failed exchange isn't the end: we check whether they're signed in anyway.
import type { SupabaseClient, EmailOtpType } from "@supabase/supabase-js";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function signInFromEmailLink(sb: SupabaseClient, fallbackType: EmailOtpType): Promise<boolean> {
  const q = new URLSearchParams(window.location.search);
  const tokenHash = q.get("token_hash");
  const code = q.get("code");
  if (tokenHash) {
    const t = q.get("type") as EmailOtpType | null;
    const type = t && TYPES.includes(t) ? t : fallbackType;
    await sb.auth.verifyOtp({ token_hash: tokenHash, type }).catch(() => null);
  } else if (code) {
    await sb.auth.exchangeCodeForSession(code).catch(() => null);
  }
  // Take the one-time code out of the address bar, so a reload or a shared
  // screenshot doesn't carry it.
  if (tokenHash || code) window.history.replaceState(null, "", window.location.pathname);
  const { data: { session } } = await sb.auth.getSession();
  return !!session;
}
