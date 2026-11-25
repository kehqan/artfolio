"use client";
// Wall labels: every label you've made (or that hangs on your walls),
// grouped by place, with scans. Print one, or many on one sheet.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Printer, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, ButtonLink, EmptyState, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { type LabelBundle, type StatRow, SALES, loadLabels, loadStats, pageUrl, rangeLine, sizeOf } from "@/lib/labels";

export default function LabelsPage() {
  const router = useRouter();
  const [labels, setLabels] = useState<LabelBundle[] | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [mine, setMine] = useState<{ id: string; title: string }[]>([]);
  const [venue, setVenue] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(new URLSearchParams(window.location.search).has("saved"));
    const sb = createClient();
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const [list, { data: prof }, { data: works }] = await Promise.all([
        loadLabels(sb, { all: true }),
        sb.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        sb.from("artworks").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
      ]);
      if (!list) { setError("Your labels didn't load. Please refresh the page."); setLabels([]); return; }
      setLabels(list);
      setVenue(["venue", "gallery"].includes((prof as { role?: string } | null)?.role || ""));
      setMine((works || []) as { id: string; title: string }[]);
      setStats(await loadStats(sb, list.map(l => l.id)));
    })();
  }, []);

  const scans = useMemo(() => {
    const m: Record<string, { all: number; week: number }> = {};
    const now = Date.now();
    stats.forEach(r => {
      if (r.action !== "scan") return;
      const x = (m[r.label_id] ||= { all: 0, week: 0 });
      x.all += r.n;
      if (now - new Date(r.hour).getTime() < 7 * 864e5) x.week += r.n;
    });
    return m;
  }, [stats]);

  const groups = useMemo(() => {
    const g = new Map<string, LabelBundle[]>();
    (labels || []).forEach(l => {
      const k = l.place_name?.trim() || "No place given";
      g.set(k, [...(g.get(k) || []), l]);
    });
    return Array.from(g.entries());
  }, [labels]);

  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const print = (ids: string[]) => router.push(`/print/labels?ids=${ids.join(",")}&layout=sheet`);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Wall labels"
        description="Labels with a QR code for your works on walls, shelves and in shows. Each scan opens a page for the piece, and you see how often it happens."
        actions={
          <>
            {venue && <ButtonLink href="/dashboard/labels/make?walls=1" variant="secondary"><Printer size={15} aria-hidden /> Labels for all your walls</ButtonLink>}
            {!venue && mine.length > 0 && <NewForWork works={mine} />}
          </>
        }
      />
      {saved && <Alert tone="ok">Saved. Labels already on the wall show the changes straight away.</Alert>}
      {error && <Alert tone="bad">{error}</Alert>}

      {!labels ? <Skeleton className="h-64 w-full rounded-card" /> : !labels.length ? (
        <EmptyState icon={<QrCode size={22} aria-hidden />} title="No labels yet"
          description={venue
            ? "Once a deal is signed, print labels for the works on your walls. Guests scan them to see the story and reach the artist."
            : "When a deal is signed you'll be asked to print labels. You can also make one for any work, for a studio show or a collector's home."}
          action={venue
            ? <ButtonLink href="/dashboard/labels/make?walls=1" variant="primary"><Printer size={15} aria-hidden /> Labels for your walls</ButtonLink>
            : mine[0] ? <ButtonLink href={`/dashboard/labels/make?work=${mine[0].id}`} variant="primary"><Plus size={15} aria-hidden /> Make your first label</ButtonLink> : undefined} />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([place, list]) => (
            <section key={place} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-baseline gap-2 font-display text-h2 leading-tight text-fg">
                  {place}<span className="font-ui text-body font-semibold tabular-nums text-fg-3">{list.length}</span>
                </h2>
                {list.length > 1 && <Button size="sm" variant="ghost" onClick={() => print(list.map(l => l.id))}><Printer size={14} aria-hidden /> Print all {list.length} on one sheet</Button>}
              </div>
              <ul className="flex flex-col divide-y divide-line rounded-card border-hair border-line bg-surface">
                {list.map(l => {
                  const s = scans[l.id] || { all: 0, week: 0 };
                  const on = picked.includes(l.id);
                  return (
                    <li key={l.id} className={cn("flex flex-wrap items-center gap-4 px-4 py-3.5", on && "bg-mango-soft")}>
                      <input type="checkbox" checked={on} onChange={() => toggle(l.id)} aria-label={`Pick ${l.work?.title}`} className="h-4 w-4 accent-[#111110]" />
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-control bg-sunken">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {l.work?.images?.[0] && <img src={l.work.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{l.work?.title || "A work"}</span>
                        <span className="truncate font-ui text-caption text-fg-3">
                          {[l.artistName, sizeOf(l.size).name, rangeLine(l.starts_on, l.ends_on)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Badge tone={l.sales === "off" ? "neutral" : "mango"}>{SALES.find(x => x.key === l.sales)?.name}</Badge>
                      <span className="flex w-24 flex-col text-right">
                        <span className="font-ui text-body-sm font-semibold tabular-nums text-fg">{s.all} {s.all === 1 ? "scan" : "scans"}</span>
                        <span className="font-ui text-caption tabular-nums text-fg-3">{s.week} this week</span>
                      </span>
                      <span className="flex gap-1">
                        <ButtonLink href={pageUrl(l.code)} target="_blank" variant="ghost" size="sm" aria-label="Open the piece page"><ExternalLink size={14} aria-hidden /></ButtonLink>
                        <ButtonLink href={`/dashboard/labels/make?ids=${l.id}`} variant="ghost" size="sm" aria-label="Change this label"><Pencil size={14} aria-hidden /></ButtonLink>
                        <Button variant="secondary" size="sm" onClick={() => print([l.id])}><Printer size={14} aria-hidden /> Print</Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 self-center rounded-card border-hair border-ink bg-surface px-4 py-3 shadow-hard-2">
          <span className="font-ui text-body-sm font-semibold text-fg">{picked.length} picked</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPicked([])}>Clear</Button>
            <ButtonLink href={`/dashboard/labels/make?ids=${picked.join(",")}`} variant="secondary" size="sm"><Pencil size={14} aria-hidden /> Change together</ButtonLink>
            <Button variant="primary" size="sm" onClick={() => print(picked)}><Printer size={14} aria-hidden /> Print on one sheet</Button>
          </div>
        </div>
      )}
      <p className="font-ui text-caption text-fg-3">
        Scans are counted without cookies or personal data. <Link href="/dashboard/messages" className="underline underline-offset-2">People who write</Link> from a label show up in Messages.
      </p>
    </div>
  );
}

function NewForWork({ works }: { works: { id: string; title: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Make a label for</span>
      <Select defaultValue="" onChange={e => e.target.value && router.push(`/dashboard/labels/make?work=${e.target.value}`)} className="w-56">
        <option value="" disabled>Make a label for…</option>
        {works.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
      </Select>
    </label>
  );
}
