"use client";
// "Scans": what happened at the labels for a work (or a set of labels).
// Totals for anyone who manages the labels; the artist also sees the people
// who chose to follow or write. Scans are counted, people are not tracked.
import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCode as QrIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, ButtonLink, Card, Skeleton, cn } from "@/components/ui";
import { type Summary, type WallLabel, loadStats, summarize } from "@/lib/labels";

type Person = { id: string; name: string; avatar?: string | null; username?: string | null; what: string; when: string };

export function ScanStats({ artworkId, labelIds, showPeople, makeHref, title = "Scans", compact }: {
  artworkId?: string; labelIds?: string[]; showPeople?: boolean; makeHref?: string; title?: string;
  /** For a narrow column: one column, smaller numbers. */
  compact?: boolean;
}) {
  const [labels, setLabels] = useState<Pick<WallLabel, "id" | "code" | "place_name">[] | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);
  const [byLabel, setByLabel] = useState<Record<string, number>>({});
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      let q = sb.from("wall_labels").select("id, code, place_name");
      if (labelIds) q = q.in("id", labelIds.length ? labelIds : ["00000000-0000-0000-0000-000000000000"]);
      else if (artworkId) q = q.eq("artwork_id", artworkId);
      const { data } = await q;
      const ls = (data || []) as Pick<WallLabel, "id" | "code" | "place_name">[];
      setLabels(ls);
      const rows = await loadStats(sb, ls.map(l => l.id));
      setSum(summarize(rows));
      const per: Record<string, number> = {};
      rows.forEach(r => { if (r.action === "scan") per[r.label_id] = (per[r.label_id] || 0) + r.n; });
      setByLabel(per);

      if (!showPeople || !ls.length) return;
      // Signed-in people who followed or wrote from a label.
      const { data: acts } = await sb.from("label_scans").select("person_id, action, hour").in("label_id", ls.map(l => l.id))
        .in("action", ["follow", "ask", "buy"]).not("person_id", "is", null).order("hour", { ascending: false }).limit(20);
      const ids = Array.from(new Set(((acts || []) as { person_id: string }[]).map(a => a.person_id)));
      const { data: ps } = ids.length ? await sb.from("profiles").select("id, full_name, avatar_url, username").in("id", ids) : { data: [] };
      const prof = new Map(((ps || []) as { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[]).map(p => [p.id, p]));
      const list: Person[] = ((acts || []) as { person_id: string; action: string; hour: string }[]).map(a => {
        const p = prof.get(a.person_id);
        return { id: a.person_id + a.hour + a.action, name: p?.full_name || "Someone", avatar: p?.avatar_url, username: p?.username,
          what: a.action === "follow" ? "followed you" : a.action === "buy" ? "would like to buy it" : "asked about it", when: a.hour };
      });
      // Visitors without an account who wrote: their messages carry the label.
      const { data: convos } = await sb.from("conversations").select("id, guest_name, created_at, context_meta")
        .in("context_meta->>label", ls.map(l => l.code)).is("participant_a", null).order("created_at", { ascending: false }).limit(10);
      ((convos || []) as { id: string; guest_name: string | null; created_at: string; context_meta: { buy?: boolean } | null }[]).forEach(c => {
        list.push({ id: c.id, name: c.guest_name || "A visitor", what: c.context_meta?.buy ? "would like to buy it" : "asked about it", when: c.created_at });
      });
      list.sort((a, b) => (a.when < b.when ? 1 : -1));
      setPeople(list.slice(0, 8));
    })();
  }, [artworkId, labelIds, showPeople]);

  if (!labels || !sum) return <Skeleton className="h-40 w-full rounded-card" />;

  if (!labels.length) {
    return (
      <Card padding="lg" className={cn("flex flex-col gap-3", !compact && "sm:flex-row sm:items-center sm:justify-between")}>
        <div className="flex flex-col gap-1">
          <h3 className="font-ui text-body font-semibold text-fg">No wall label yet</h3>
          <p className="max-w-prose font-ui text-body-sm text-fg-2">Print a label with a QR code for wherever this work hangs. You'll see here how often people scan it.</p>
        </div>
        {makeHref && <ButtonLink href={makeHref} variant="secondary" className="shrink-0"><QrIcon size={15} aria-hidden /> Make a label</ButtonLink>}
      </Card>
    );
  }

  const maxH = Math.max(1, ...sum.byHour);
  const funnel = [
    { name: "Scanned", n: sum.scans },
    { name: "Opened the passport", n: sum.passport },
    { name: "Followed", n: sum.follow },
    { name: "Asked or offered", n: sum.ask + sum.buy },
  ];

  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h3 className="font-display text-h3 leading-tight text-fg">{title}</h3>
        {makeHref && <ButtonLink href={makeHref} variant="ghost" size="sm"><QrIcon size={14} aria-hidden /> Labels</ButtonLink>}
      </div>
      <div className={cn("flex flex-wrap", compact ? "gap-6" : "gap-8")}>
        <Big n={sum.scans} label="scans so far" small={compact} />
        <Big n={sum.week} label="in the last 7 days" small={compact} />
        <Big n={sum.follow} label="new followers" small={compact} />
      </div>

      {sum.scans > 0 ? (
        <div className={cn("grid gap-6", !compact && "md:grid-cols-2")}>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-label font-semibold text-fg">When people scan</span>
            <div className="flex h-20 items-end gap-[3px]" role="img" aria-label="Scans by hour of the day">
              {sum.byHour.map((n, h) => (
                <span key={h} title={`${h}:00 · ${n}`} className={n === maxH ? "bg-mango" : "bg-line-strong"} style={{ flex: 1, height: `${Math.max(3, (n / maxH) * 100)}%`, borderRadius: "2px 2px 0 0", outline: n === maxH ? "1px solid var(--color-ink)" : undefined }} />
              ))}
            </div>
            <div className="flex justify-between font-ui text-caption tabular-nums text-fg-3"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-label font-semibold text-fg">What they did next</span>
            <ul className="flex flex-col gap-2">
              {funnel.map(f => (
                <li key={f.name} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 font-ui text-body-sm text-fg-2">
                  <span className="truncate">{f.name}</span>
                  <span className="h-2 rounded-pill bg-sunken"><span className="block h-2 rounded-pill bg-ink" style={{ width: `${sum.scans ? Math.min(100, (f.n / sum.scans) * 100) : 0}%` }} /></span>
                  <span className="text-right tabular-nums text-fg">{f.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="font-ui text-body-sm text-fg-3">No scans yet. Once the label is on the wall, every scan shows up here within a minute.</p>
      )}

      {labels.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="font-ui text-label font-semibold text-fg">By label</span>
          <ul className="flex flex-col divide-y divide-line rounded-control border-hair border-line">
            {labels.map(l => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 font-ui text-body-sm">
                <span className="truncate text-fg">{l.place_name || "No place given"}</span>
                <span className="tabular-nums text-fg-2">{byLabel[l.id] || 0} scans</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPeople && people.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-ui text-label font-semibold text-fg">People who reached out</span>
          <ul className="flex flex-col gap-2">
            {people.map(p => (
              <li key={p.id} className="flex items-center gap-3 font-ui text-body-sm">
                <Avatar name={p.name} src={p.avatar || undefined} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {p.username ? <Link href={`/${p.username}`} className="font-semibold text-fg hover:underline">{p.name}</Link> : <span className="font-semibold text-fg">{p.name}</span>}
                  <span className="text-fg-2"> {p.what}</span>
                </span>
                <span className="shrink-0 font-ui text-caption text-fg-3">{new Date(p.when).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/messages" className="self-start font-ui text-caption font-semibold text-fg-2 underline underline-offset-2 hover:text-fg">Answer them in Messages</Link>
        </div>
      )}

      <p className="font-ui text-caption text-fg-3">We count scans, not people: no cookies, addresses or devices are kept. A name shows only when someone chooses to follow you or write.</p>
    </Card>
  );
}

function Big({ n, label, small }: { n: number; label: string; small?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={cn("font-display leading-none tabular-nums text-fg", small ? "text-h1" : "text-display")}>{n}</span>
      <span className="font-ui text-caption text-fg-3">{label}</span>
    </div>
  );
}
