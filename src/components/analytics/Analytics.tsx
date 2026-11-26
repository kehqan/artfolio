"use client";

// Page views and who is signed in, for cookieless analytics (src/lib/analytics.ts)
// and for crash reports (Sentry gets the account id only, never name or email).
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setCrashUser } from "@/lib/crash";
import { setAnalyticsUser, track } from "@/lib/analytics";

type Session = { user: { id: string; user_metadata?: { role?: string } } } | null;

function apply(s: Session) {
  const id = s?.user?.id || null;
  setAnalyticsUser(id, s?.user?.user_metadata?.role || null);
  setCrashUser(id);
}

function hasSignInCookie() {
  return document.cookie.split(";").some(c => { const n = c.trim().split("=")[0]; return n.startsWith("sb-") && n.includes("-auth-token"); });
}

let hooked: Promise<void> | null = null;

/** Start following sign-in once there is a sign-in cookie. Visitors without
 * one (most public traffic) never load the Supabase client for this. */
function follow(): Promise<void> {
  if (hooked) return hooked;
  if (!hasSignInCookie()) return Promise.resolve();
  hooked = import("@/lib/supabase/client").then(async ({ createClient }) => {
    const sb = createClient();
    const { data } = await sb.auth.getSession();
    apply(data.session as Session);
    sb.auth.onAuthStateChange((_e, s) => apply(s as Session));
  }).catch(() => {});
  return hooked;
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    let live = true;
    // Checked on every page, so signing in on /login is picked up on the next page.
    follow().then(() => { if (live) track("$pageview"); });
    return () => { live = false; };
  }, [pathname]);

  return null;
}
