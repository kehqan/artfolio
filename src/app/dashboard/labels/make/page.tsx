"use client";
// Make (or change) wall labels.
//   ?deal=<id>      every work in a deal, place and dates filled in
//   ?project=<id>   every work in a curator's project
//   ?walls=1        every work on a venue's walls now
//   ?work=<id>      one work, anywhere (a studio show, a collector's home)
//   ?ids=a,b        change labels that already exist (the QR codes stay the same)
//
// One set of choices for all the works; each work can have its own note.
// The preview is the real print, in millimetres.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Lock, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, Switch, cn } from "@/components/ui";
import { WallLabelArt } from "@/components/labels/WallLabelArt";
import {
  DEFAULT_SHOW, DESIGNS, SALES, SIZES,
  type LabelDesign, type LabelLanguage, type LabelPlace, type LabelSales, type LabelShow, type LabelSize, type LabelWork, type WallLabel,
  isSold, loadLabels, loadWorks, placeFromDeal, salesFor,
} from "@/lib/labels";

const RANK: Record<LabelSales, number> = { off: 0, ask: 1, price: 2 };

type Item = { work: LabelWork; label?: WallLabel; deal_id: string | null; project_id: string | null; place_profile: string | null; note: string };

export default function MakeLabelsPage() {
  return <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}><Maker /></Suspense>;
}

function Maker() {
  const q = useSearchParams();
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The choices, shared by every label in the set.
  const [design, setDesign] = useState<LabelDesign>("quiet");
  const [size, setSize] = useState<LabelSize>("card");
  const [language, setLanguage] = useState<LabelLanguage>("en");
  const [sales, setSales] = useState<LabelSales>("price");
  const [ceiling, setCeiling] = useState<LabelSales>("price"); // the most a non-artist may choose
  const [show, setShow] = useState<LabelShow>(DEFAULT_SHOW);
  const [place, setPlace] = useState({ name: "", city: "", from: "", to: "" });
  const [layout, setLayout] = useState<"sheet" | "exact">("sheet");
  const back = q.get("back") || "/dashboard/labels";

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    setMe(user.id);
    let list: Item[] = [];
    let base: LabelPlace | null = null;
    const ids = (q.get("ids") || "").split(",").filter(Boolean);
    const deal = q.get("deal");
    const project = q.get("project");
    const work = q.get("work");

    if (ids.length || deal) {
      // A deal that already has labels opens them, so codes on the wall keep working.
      const existing = await loadLabels(sb, ids.length ? { ids } : { deal: deal! });
      if (existing === null) { setError("Your labels didn't load. Please refresh the page."); return; }
      if (existing.length) {
        list = existing.filter(l => l.work).map(l => ({ work: l.work!, label: l, deal_id: l.deal_id, project_id: l.project_id, place_profile: l.place_profile, note: l.note || "" }));
        const f = existing[0];
        setDesign(f.design); setSize(f.size); setLanguage(f.language); setShow({ ...DEFAULT_SHOW, ...f.show });
        setPlace({ name: f.place_name || "", city: f.place_city || "", from: f.starts_on || "", to: f.ends_on || "" });
        const top = existing.reduce<LabelSales>((m, l) => (RANK[l.sales] > RANK[m] ? l.sales : m), "off");
        setSales(top);
        const artistOfAll = existing.every(l => l.work?.user_id === user.id);
        setCeiling(artistOfAll ? "price" : top);
      }
    }
    if (!list.length && deal) {
      const d = await placeFromDeal(sb, deal);
      if (!d) { setError("We couldn't find that deal."); return; }
      base = d.place;
      list = (await loadWorks(sb, d.artworkIds)).map(w => ({ work: w, deal_id: d.place.deal_id, project_id: d.place.project_id, place_profile: d.place.place_profile, note: "" }));
    }
    if (!list.length && project) {
      const { data: ds } = await sb.from("deals").select("id").eq("project_id", project).eq("status", "signed");
      for (const row of (ds || []) as { id: string }[]) {
        const d = await placeFromDeal(sb, row.id);
        if (!d) continue;
        base = base || d.place;
        const ws = await loadWorks(sb, d.artworkIds);
        list.push(...ws.map(w => ({ work: w, deal_id: row.id, project_id: project, place_profile: null, note: "" })));
      }
      if (!list.length) { setItems([]); return; }
    }
    if (!list.length && q.get("walls")) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: ds } = await sb.from("deals").select("id, contract_id").eq("venue_id", user.id).eq("status", "signed");
      for (const row of (ds || []) as { id: string }[]) {
        const d = await placeFromDeal(sb, row.id);
        if (!d || (d.place.ends_on && d.place.ends_on < today)) continue;
        base = base || d.place;
        const ws = await loadWorks(sb, d.artworkIds);
        list.push(...ws.map(w => ({ work: w, deal_id: row.id, project_id: null, place_profile: d.place.place_profile, note: "" })));
      }
      if (!list.length) { setItems([]); return; }
    }
    if (!list.length && work) {
      list = (await loadWorks(sb, [work])).map(w => ({ work: w, deal_id: null, project_id: null, place_profile: null, note: "" }));
    }
    if (!list.length) { setItems([]); return; }

    if (base) {
      setPlace({ name: base.place_name, city: base.place_city, from: base.starts_on || "", to: base.ends_on || "" });
      if (base.displayOnly) setSales("off");
      setShow(s => ({ ...s, place: !!base!.place_name && !!base!.project_id }));
      const allMine = list.every(i => i.work.user_id === user.id);
      setCeiling(allMine ? "price" : base.displayOnly ? "off" : "price");
    }
    setItems(list);
    const artists = Array.from(new Set(list.map(i => i.work.user_id).filter(Boolean))) as string[];
    const { data: ps } = await sb.from("profiles").select("id, full_name").in("id", artists);
    setNames(Object.fromEntries(((ps || []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name || ""])));
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const isArtist = !!items?.length && items.every(i => i.work.user_id === me);
  const current = items?.[Math.min(active, (items?.length || 1) - 1)];
  const artistName = current?.work.user_id ? names[current.work.user_id] || "" : "";
  const editing = !!items?.some(i => i.label);

  async function save(print: boolean) {
    if (!items?.length || !me) return;
    setSaving(true); setError("");
    const sb = createClient();
    const ids: string[] = [];
    for (const it of items) {
      const row = {
        design, size, language, show,
        sales: salesFor(isArtist ? sales : (RANK[sales] <= RANK[ceiling] ? sales : ceiling), it.work),
        note: it.note.trim().slice(0, 140) || null,
        place_name: place.name.trim() || null, place_city: place.city.trim() || null,
        starts_on: place.from || null, ends_on: place.to || null,
      };
      const res = it.label
        ? await sb.from("wall_labels").update(row).eq("id", it.label.id).select("id").single()
        : await sb.from("wall_labels").insert({ ...row, artwork_id: it.work.id, created_by: me, deal_id: it.deal_id, project_id: it.project_id, place_profile: it.place_profile }).select("id").single();
      if (res.error || !res.data) {
        setSaving(false);
        setError(res.error?.message?.includes("Only the artist")
          ? "Only the artist can turn selling back on. Choose “Not for sale here” or ask them."
          : "The labels didn't save. Please try again.");
        return;
      }
      ids.push((res.data as { id: string }).id);
    }
    setSaving(false);
    if (print) router.push(`/print/labels?ids=${ids.join(",")}&layout=${layout}&back=${encodeURIComponent(`/dashboard/labels/make?ids=${ids.join(",")}`)}`);
    else router.push("/dashboard/labels?saved=1");
  }

  if (items && !items.length) {
    return (
      <EmptyState title="No works to label yet"
        description="Labels are made for works in a signed deal, a project, or any of your own works."
        action={<ButtonLink href="/dashboard/labels" variant="secondary">Back to labels</ButtonLink>} />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ButtonLink href={back.startsWith("/") ? back : "/dashboard/labels"} variant="ghost" size="sm" className="self-start"><ArrowLeft size={15} aria-hidden /> Back</ButtonLink>
        <PageHeader
          title={editing ? "Change wall labels" : "Make wall labels"}
          description={editing
            ? "Changes show on the piece page straight away. The QR codes stay the same, so labels already on the wall keep working."
            : "Pick a look and what it says. The QR code opens a page for the piece, with its story, its passport and a way to reach you."}
        />
      </div>
      {error && <Alert tone="bad">{error}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Preview ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]">
          <Wall>
            {current ? (
              <WallLabelArt work={current.work} artistName={artistName} design={design} size={size} language={language}
                sales={isArtist ? sales : (RANK[sales] <= RANK[ceiling] ? sales : ceiling)} show={show} note={current.note} placeName={place.name}
                code={current.label?.code || "PREVIEW"} style={{ boxShadow: "0 1px 0 rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.12)" }} />
            ) : <Skeleton className="h-[55mm] w-[85mm]" />}
          </Wall>
          <p className="font-ui text-caption text-fg-3">
            {current?.label ? "This is the real QR code for this label." : "The real QR code appears once you save."} Shown larger here; it prints at {SIZES.find(s => s.key === size)?.dim}.
          </p>

          {items && items.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="font-ui text-label font-semibold text-fg">{items.length} works in this set</span>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {items.map((it, i) => (
                  <li key={it.work.id}>
                    <button type="button" onClick={() => setActive(i)} aria-pressed={i === active}
                      className={cn("flex w-24 flex-col gap-1 rounded-control border-hair p-1.5 text-left transition", i === active ? "border-ink bg-surface shadow-hard-1" : "border-line hover:border-ink")}>
                      <span className="relative block aspect-square overflow-hidden rounded-[4px] bg-sunken">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {it.work.images?.[0] && <img src={it.work.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      </span>
                      <span className="truncate font-ui text-caption font-semibold text-fg">{it.work.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Choices ── */}
        <div className="flex flex-col gap-6">
          <Choice title="Design">
            <div className="grid grid-cols-2 gap-2">
              {DESIGNS.map(d => (
                <Tile key={d.key} on={design === d.key} onClick={() => setDesign(d.key)} title={d.name} line={d.line}
                  swatch={<span className={cn("block h-5 w-8 rounded-[3px] border-hair", d.key === "mango" ? "border-ink bg-mango" : d.key === "ink" ? "border-ink bg-ink" : "border-line-strong bg-surface")} />} />
              ))}
            </div>
          </Choice>

          <Choice title="Size">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SIZES.map(s => <Tile key={s.key} on={size === s.key} onClick={() => setSize(s.key)} title={s.name} line={s.dim} />)}
            </div>
            <p className="font-ui text-caption text-fg-3">{SIZES.find(s => s.key === size)?.line}</p>
          </Choice>

          <Choice title="Selling on this label" hint={isArtist ? "For a loan or an exhibition, turn selling off here. The work stays for sale everywhere else." : undefined}>
            <div className="flex flex-col gap-2">
              {SALES.map(s => {
                const locked = !isArtist && RANK[s.key] > RANK[ceiling];
                const noPrice = s.key === "price" && current && current.work.price == null;
                const sold = current && isSold(current.work);
                return (
                  <button key={s.key} type="button" disabled={locked || !!sold} onClick={() => setSales(s.key)} aria-pressed={sales === s.key}
                    className={cn("flex items-start gap-3 rounded-control border-hair p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                      sales === s.key ? "border-ink bg-surface shadow-hard-1" : "border-line bg-surface hover:border-ink")}>
                    <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-pill border-outline border-ink", sales === s.key && "bg-ink")}>
                      {sales === s.key && <span className="h-1.5 w-1.5 rounded-pill bg-mango" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 font-ui text-body-sm font-semibold text-fg">{s.name}{locked && <Lock size={12} aria-hidden />}</span>
                      <span className="font-ui text-caption text-fg-3">
                        {locked ? "Only the artist can turn this on." : noPrice ? "This work has no price yet, so the label says “Price on request”." : s.line}
                      </span>
                    </span>
                  </button>
                );
              })}
              {current && isSold(current.work) && <p className="font-ui text-caption text-fg-3">This work is sold, so nothing about selling shows.</p>}
            </div>
          </Choice>

          <Choice title="What the label shows" hint="The title and the artist's name are always on it.">
            <div className="flex flex-col divide-y divide-line rounded-control border-hair border-line bg-surface">
              {([["year", "Year"], ["medium", "Medium"], ["size", "Size"], ["place", "Name of the place"], ["note", "A one-line note"]] as const).map(([k, name]) => (
                <label key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 font-ui text-body-sm text-fg">
                  {name}
                  <Switch checked={!!show[k]} onChange={v => setShow(s => ({ ...s, [k]: v }))} label={name} />
                </label>
              ))}
            </div>
            {show.note && current && (
              <Field label={items && items.length > 1 ? `Note for “${current.work.title}”` : "Note"} hint={`${current.note.length}/140 · A line from the artist, a story, a dedication.`}>
                {p => <Input {...p} maxLength={140} value={current.note} placeholder="Painted from memory the morning after."
                  onChange={e => setItems(list => list && list.map((it, i) => (i === active ? { ...it, note: e.target.value } : it)))} />}
              </Field>
            )}
          </Choice>

          <Choice title="Where it hangs" hint="Shown on the piece page, so visitors know they're in the right place. You can leave it empty.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Place">{p => <Input {...p} value={place.name} maxLength={120} placeholder="Café Lounge" onChange={e => setPlace(s => ({ ...s, name: e.target.value }))} />}</Field>
              <Field label="City">{p => <Input {...p} value={place.city} maxLength={120} placeholder="Prague" onChange={e => setPlace(s => ({ ...s, city: e.target.value }))} />}</Field>
              <Field label="From">{p => <Input {...p} type="date" value={place.from} onChange={e => setPlace(s => ({ ...s, from: e.target.value }))} />}</Field>
              <Field label="Until">{p => <Input {...p} type="date" value={place.to} min={place.from || undefined} onChange={e => setPlace(s => ({ ...s, to: e.target.value }))} />}</Field>
            </div>
          </Choice>

          <Choice title="Language">
            <div className="grid grid-cols-3 gap-2">
              {([["en", "English"], ["cs", "Czech"], ["both", "Both"]] as const).map(([k, name]) => (
                <Tile key={k} on={language === k} onClick={() => setLanguage(k)} title={name} />
              ))}
            </div>
          </Choice>

          <Card padding="lg" className="flex flex-col gap-4">
            <Field label="Print on" hint={layout === "sheet" ? "A4 paper for any home or office printer. Cut along the light lines." : "One label per page at its real size. Best for a print shop."}>
              {p => (
                <Select {...p} value={layout} onChange={e => setLayout(e.target.value as "sheet" | "exact")}>
                  <option value="sheet">A4 sheet (home printer)</option>
                  <option value="exact">Exact size (print shop)</option>
                </Select>
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={!items || saving} onClick={() => save(true)}>
                <Printer size={15} aria-hidden /> {saving ? "Saving…" : items && items.length > 1 ? `Save and print ${items.length} labels` : "Save and print"}
              </Button>
              <Button variant="secondary" disabled={!items || saving} onClick={() => save(false)}><Check size={15} aria-hidden /> Save</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The preview sits on a bit of wall, enlarged to fill it (up to 1.6×) or shrunk on narrow screens. */
function Wall({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState<number | undefined>();
  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const avail = outer.current.clientWidth - 48;
      const w = inner.current.scrollWidth;
      const s = Math.min(1.6, avail / Math.max(1, w), 480 / Math.max(1, inner.current.scrollHeight));
      setScale(s); setH(inner.current.scrollHeight * s + 64);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative flex items-center justify-center overflow-hidden rounded-card bg-[#EDE6D8] px-6 py-8" style={{ minHeight: h }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>{children}</div>
    </div>
  );
}

function Choice({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-ui text-body font-semibold text-fg">{title}</h2>
        {hint && <p className="font-ui text-caption text-fg-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ on, onClick, title, line, swatch }: { on: boolean; onClick: () => void; title: string; line?: string; swatch?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn("flex min-w-0 flex-col items-start gap-1 rounded-control border-hair bg-surface p-3 text-left transition", on ? "border-ink shadow-hard-1" : "border-line hover:border-ink")}>
      <span className="flex items-center gap-2 font-ui text-body-sm font-semibold text-fg">{swatch}{title}</span>
      {line && <span className="font-ui text-caption text-fg-3">{line}</span>}
    </button>
  );
}
