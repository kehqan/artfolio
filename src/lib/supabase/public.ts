import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

/**
 * A server-side Supabase client with no sign-in, for public pages.
 *
 * It reads only what any visitor may see, and reads no cookies, so a page
 * that uses it can be built once and kept on Vercel's CDN (see each page's
 * `revalidate`). That cache plays the part Redis would on other stacks:
 * the most-read pages (artist sites, wall-label pages, Explore) are served
 * from the edge and the database is asked at most once a minute per page.
 *
 * One client per server request (React `cache`), so connections are reused.
 */
export const publicClient = cache(() =>
  createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
);
