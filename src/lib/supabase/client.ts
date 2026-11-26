import { createBrowserClient } from "@supabase/ssr";

type Client = ReturnType<typeof createBrowserClient>;
let client: Client | null = null;

/**
 * One Supabase client for the whole browser tab (connections are reused).
 *
 * `auth.getUser()` asks Supabase's servers who is signed in. The shell, the page
 * and its components each used to ask on every screen, so one page opened with
 * two to four identical round trips. In the browser that answer only decides
 * what to show (the database checks every read and write itself), so calls made
 * within a short window share one request. Signing in or out clears it.
 */
export function createClient(): Client {
  if (client) return client;
  const c = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  // On the server (first render of a client page) each render gets its own.
  if (typeof window === "undefined") return c;
  const getUser = c.auth.getUser.bind(c.auth);
  let pending: ReturnType<typeof getUser> | null = null;
  let at = 0;
  c.auth.getUser = ((jwt?: string) => {
    if (jwt) return getUser(jwt);
    if (pending && Date.now() - at < 30_000) return pending;
    at = Date.now();
    pending = getUser().then(r => {
      if (r.error) pending = null;
      return r;
    });
    return pending;
  }) as typeof c.auth.getUser;
  c.auth.onAuthStateChange(event => {
    if (event !== "INITIAL_SESSION") pending = null;
  });
  client = c;
  return c;
}
