"use client";
// "Buy button" on a work's page in Studio: where Buy goes (any shop link,
// no commission) and how many people tapped it, from where.
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Eyebrow, Input, cn } from "@/components/ui";
import { type TapRow, SOURCE_NAME, hostOf, loadBuyLink, loadTaps, normalizeBuyUrl, saveBuyLink } from "@/lib/buy";
import { useJourney } from "@/components/journey/JourneyProvider";

export function BuyLinkCard({ workId, userId, sellable }: { workId: string; userId: string; sellable: boolean }) {
  const { toast } = useJourney();
  const [ready, setReady] = useState<boolean | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [taps, setTaps] = useState<TapRow[]>([]);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      // Only the work's artist sets where Buy goes.
      const { data } = await sb.auth.getSession();
      if (data.session?.user.id !== userId) { setReady(false); return; }
      const r = await loadBuyLink(sb, workId);
      setReady(r.ready); setUrl(r.url); setDraft(r.url || "");
      if (r.ready) setTaps(await loadTaps(sb, [workId]));
    })();
  }, [workId, userId]);

  const sum = useMemo(() => {
    const week = Date.now() - 7 * 864e5;
    const by: Record<string, number> = {};
    let w = 0;
    taps.forEach(t => { by[t.source] = (by[t.source] || 0) + 1; if (new Date(t.hour).getTime() > week) w++; });
    return { all: taps.length, week: w, by: Object.entries(by).sort((a, b) => b[1] - a[1]) };
  }, [taps]);

  // Not set up in the database yet: say nothing rather than show a broken box.
  if (!ready) return null;

  async function save(next: string | null) {
    setError("");
    const n = next == null ? { url: null } : normalizeBuyUrl(next);
    if (n.error) { setError(n.error); return; }
    setBusy(true);
    const err = await saveBuyLink(createClient(), workId, userId, n.url);
    setBusy(false);
    if (err) { setError(err); return; }
    setUrl(n.url); setDraft(n.url || ""); setEditing(false);
    toast(n.url
      ? { title: "Buy now opens your shop", body: "On your site and on wall labels with a price. No commission from Artomango." }
      : { title: "Buy link removed", body: "People can still ask to buy it in a message." });
  }

  const showForm = editing || !url;

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Buy button</Eyebrow>
        {url && !editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Change</Button>}
      </div>

      {url && !editing ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-2 font-ui text-body font-semibold text-fg hover:underline">
          <ShoppingBag size={16} aria-hidden className="shrink-0" /> <span className="truncate">Opens {hostOf(url)}</span> <ExternalLink size={13} aria-hidden className="shrink-0 text-fg-3" />
        </a>
      ) : (
        <p className="font-ui text-body-sm text-fg-2">
          Sell it your way. Paste the link to this work in your shop (Etsy, Artsy, your own site or a payment link) and Buy opens it. No commission from Artomango.
        </p>
      )}

      {showForm && (
        <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); save(draft); }}>
          <label className="sr-only" htmlFor={`buy-${workId}`}>Link to your shop</label>
          <Input id={`buy-${workId}`} type="url" inputMode="url" autoComplete="url" placeholder="etsy.com/listing/…" value={draft}
            onChange={e => setDraft(e.target.value)} aria-invalid={!!error} />
          {error && <Alert tone="bad">{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant={draft.trim() ? "primary" : "secondary"} disabled={busy || !draft.trim()}>{busy ? "Saving…" : "Save link"}</Button>
            {editing && <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(url || ""); setError(""); }}>Cancel</Button>}
            {editing && url && <Button size="sm" variant="ghost" className="ml-auto text-bad" disabled={busy} onClick={() => save(null)}>Remove</Button>}
          </div>
        </form>
      )}

      {url && !sellable && (
        <p className="font-ui text-caption text-warn">The Buy button is hidden while this work is sold, reserved, not for sale or still in the studio.</p>
      )}

      {url && (
        <div className={cn("flex flex-col gap-1 border-t-hair border-line pt-3")}>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-h1 leading-none tabular-nums text-fg">{sum.all}</span>
            <span className="font-ui text-body-sm text-fg-2">{sum.all === 1 ? "tap on Buy" : "taps on Buy"}{sum.week > 0 ? ` · ${sum.week} this week` : ""}</span>
          </span>
          <span className="font-ui text-caption text-fg-3">
            {sum.all ? `From ${sum.by.map(([s, n]) => `${SOURCE_NAME[s] || s} (${n})`).join(", ")}.` : "Each tap shows up here. We count taps, not people."}
          </span>
        </div>
      )}
    </Card>
  );
}
