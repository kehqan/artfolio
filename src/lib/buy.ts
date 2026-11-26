// Buy links: an artist can put any shop link behind a work's Buy button
// (their own shop, Etsy, Artsy, a payment link). Artomango takes no
// commission on these. A tap goes through /b/<work>, which counts it (the
// work, where the tap came from and the hour; nothing about the person) and
// forwards to the shop (database/migrations/20261126_artist_value.sql).
//
// Later, when Artomango has its own checkout, works on a venue's wall will
// sell through it so the venue's share is paid. That switch lives in the
// database (buy_links_for / buy_go), so every Buy button follows it at once.
import type { SupabaseClient } from "@supabase/supabase-js";

export type BuySource = "site" | "label" | "passport";

/** Clean up what an artist pasted: add https://, refuse anything that isn't a web address. */
export function normalizeBuyUrl(raw: string): { url: string | null; error?: string } {
  let v = raw.trim();
  if (!v) return { url: null };
  if (/^http:\/\//i.test(v)) v = "https://" + v.slice(7);
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || !u.hostname.includes(".") || /\s/.test(v)) throw new Error();
    if (v.length > 600) return { url: null, error: "That link is too long. Try a shorter one." };
    return { url: u.toString() };
  } catch {
    return { url: null, error: "That doesn't look like a web address. Paste the link to the work in your shop." };
  }
}

/** "etsy.com" from "https://www.etsy.com/listing/…" */
export function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/** The address a Buy button opens. */
export function buyHref(workId: string, from: BuySource, code?: string) {
  const q = new URLSearchParams({ from });
  if (code) q.set("l", code);
  return `/b/${workId}?${q.toString()}`;
}

/** Which works have a Buy link (and the shop's address), for visitors. Never throws. */
export async function loadBuyHosts(sb: SupabaseClient, workIds: string[]): Promise<Record<string, string>> {
  if (!workIds.length) return {};
  try {
    const { data, error } = await sb.rpc("buy_links_for", { p_artwork_ids: workIds.slice(0, 200) });
    if (error) return {};
    const out: Record<string, string> = {};
    ((data || []) as { artwork_id: string; host: string | null }[]).forEach(r => { out[r.artwork_id] = r.host || "the artist's shop"; });
    return out;
  } catch { return {}; }
}

/** The artist's own link for a work (only the artist can read it). */
export async function loadBuyLink(sb: SupabaseClient, workId: string): Promise<{ url: string | null; ready: boolean }> {
  const { data, error } = await sb.from("artwork_buy_links").select("url").eq("artwork_id", workId).maybeSingle();
  if (error) return { url: null, ready: false };
  return { url: (data as { url: string } | null)?.url || null, ready: true };
}

export async function saveBuyLink(sb: SupabaseClient, workId: string, userId: string, url: string | null): Promise<string | null> {
  const res = url
    ? await sb.from("artwork_buy_links").upsert({ artwork_id: workId, user_id: userId, url, updated_at: new Date().toISOString() }, { onConflict: "artwork_id" })
    : await sb.from("artwork_buy_links").delete().eq("artwork_id", workId);
  if (!res.error) return null;
  if (res.error.code === "42P01" || /does not exist|schema cache/i.test(res.error.message)) return "Buy links aren't switched on yet. Run the artist_value SQL in Supabase first.";
  return "The link didn't save. Please try again.";
}

export type TapRow = { artwork_id: string; label_id: string | null; source: string; hour: string };

/** Buy taps on the artist's works, last 120 days. Empty when the feature isn't set up. */
export async function loadTaps(sb: SupabaseClient, workIds?: string[]): Promise<TapRow[]> {
  try {
    let q = sb.from("buy_clicks").select("artwork_id, label_id, source, hour")
      .gte("hour", new Date(Date.now() - 120 * 864e5).toISOString()).order("hour", { ascending: false }).limit(5000);
    if (workIds) q = q.in("artwork_id", workIds.length ? workIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data, error } = await q;
    return error ? [] : ((data || []) as TapRow[]);
  } catch { return []; }
}

export const SOURCE_NAME: Record<string, string> = { site: "your site", label: "wall labels", passport: "the passport", other: "elsewhere" };
