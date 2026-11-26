"use client";
// Home: two reasons to come back. "Out in the world" (how often people look
// at your work on walls, and tap Buy) and the next open-call deadlines.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadStats } from "@/lib/labels";
import { loadTaps } from "@/lib/buy";
import { type OpenCall, loadCalls, loadSaved } from "@/lib/open-calls";

export type Reach = {
  labels: number;
  /** Scans in the last 30 days, and the place with the most. */
  scans30: number; top: { place: string; title: string; n: number } | null;
  taps30: number; links: number;
};

export function useReach(me: string | null) {
  const [r, setR] = useState<Reach | null>(null);
  useEffect(() => {
    if (!me) return;
    const sb = createClient();
    (async () => {
      const [{ data: ls }, taps, { count: links }] = await Promise.all([
        sb.from("wall_labels").select("id, place_name, artwork_id"),
        loadTaps(sb),
        sb.from("artwork_buy_links").select("artwork_id", { count: "exact", head: true }).eq("user_id", me),
      ]);
      const labels = (ls || []) as { id: string; place_name: string | null; artwork_id: string }[];
      const rows = await loadStats(sb, labels.map(l => l.id));
      const since = Date.now() - 30 * 864e5;
      const per: Record<string, number> = {};
      let scans30 = 0;
      rows.forEach(x => { if (x.action === "scan" && new Date(x.hour).getTime() > since) { scans30 += x.n; per[x.label_id] = (per[x.label_id] || 0) + x.n; } });
      const best = labels.filter(l => per[l.id] && l.place_name).sort((a, b) => per[b.id] - per[a.id])[0];
      let top: Reach["top"] = null;
      if (best) {
        const { data: w } = await sb.from("artworks").select("title").eq("id", best.artwork_id).maybeSingle();
        top = { place: best.place_name!, title: (w as { title?: string } | null)?.title || "your work", n: per[best.id] };
      }
      setR({ labels: labels.length, scans30, top, taps30: taps.filter(t => new Date(t.hour).getTime() > since).length, links: links || 0 });
    })();
  }, [me]);
  return r;
}

export function useNextCalls(me: string | null) {
  const [calls, setCalls] = useState<OpenCall[] | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!me) return;
    const sb = createClient();
    loadCalls(sb, { limit: 4 }).then(c => setCalls((c || []).filter(x => x.published)));
    loadSaved(sb, me).then(setSaved).catch(() => {});
  }, [me]);
  return { calls, saved };
}
