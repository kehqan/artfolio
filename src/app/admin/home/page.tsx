"use client";
// Admin → Home page. Edit the "Meanwhile, your art is out there." section by
// hand: its photos (with the small label on each), the headline, an optional
// line under it, and the three example cards. Everything is a draft until
// Publish; the preview on the right is the real section, so what you see is
// what visitors get.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Monitor, Plus, Smartphone, Trash2, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input, Textarea, cn } from "@/components/ui";
import { MeanwhileView } from "@/components/landing/Meanwhile";
import { IMAGE_CACHE_SECONDS, imageExt, isPicture, photoProblem, prepareImage, uploadable } from "@/lib/image";
import {
  MEANWHILE_DEFAULT, MEANWHILE_KEY, MEANWHILE_MAX_CARDS, readMeanwhile,
  type MeanwhileCard, type MeanwhileContent,
} from "@/lib/siteContent";
import AdminFrame from "../AdminFrame";

type Photo = { id?: string; image_url: string; caption: string; active: boolean };
type Draft = { content: MeanwhileContent; photos: Photo[] };

const BUCKET = "campaign";

async function upload(file: File): Promise<string> {
  if (!isPicture(file)) throw new Error("That file isn't a photo.");
  const ready = await prepareImage(file).catch(() => { throw new Error(photoProblem(file)); });
  if (!uploadable(ready)) throw new Error(photoProblem(file));
  const sb = createClient();
  const path = `home-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imageExt(ready)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, ready, { cacheControl: IMAGE_CACHE_SECONDS, contentType: ready.type });
  if (error) throw new Error("Upload failed: " + error.message);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function move<T>(list: T[], i: number, by: number): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function AdminHomePage() {
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [view, setView] = useState<"desktop" | "phone">("desktop");
  const [shown, setShown] = useState(0);
  const uploaded = useRef<string[]>([]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const [c, p] = await Promise.all([
        sb.from("site_content").select("value").eq("key", MEANWHILE_KEY).maybeSingle(),
        sb.from("campaign_slides").select("id,image_url,caption,active,order").order("order", { ascending: true }),
      ]);
      let rows = p.data as (Photo & { caption: string | null })[] | null;
      if (c.error || p.error) {
        setMissing(true);
        const old = await sb.from("campaign_slides").select("id,image_url,active,order").order("order", { ascending: true });
        rows = (old.data || []).map(r => ({ ...r, caption: null })) as typeof rows;
      }
      const d: Draft = {
        content: c.data ? readMeanwhile(c.data.value) : MEANWHILE_DEFAULT,
        photos: (rows || []).map(r => ({ id: r.id, image_url: r.image_url, caption: r.caption || "", active: r.active })),
      };
      setSaved(d);
      setDraft(structuredClone(d));
    })();
  }, []);

  const dirty = useMemo(() => !!saved && !!draft && JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!draft) {
    return <AdminFrame><div className="mx-auto max-w-[1320px] px-4 py-10 text-body text-fg-3 sm:px-6">Loading…</div></AdminFrame>;
  }

  const { content, photos } = draft;
  const visible = photos.filter(p => p.active);
  const previewIndex = Math.max(0, visible.indexOf(photos[shown]));
  const setContent = (patch: Partial<MeanwhileContent>) => setDraft(d => d && { ...d, content: { ...d.content, ...patch } });
  const setCard = (i: number, patch: Partial<MeanwhileCard>) =>
    setContent({ cards: content.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setPhotos = (fn: (p: Photo[]) => Photo[]) => setDraft(d => d && { ...d, photos: fn(d.photos) });

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setNote(null);
    setBusy("photos");
    for (const f of Array.from(files)) {
      try {
        const url = await upload(f);
        uploaded.current.push(url);
        setPhotos(p => [...p, { image_url: url, caption: "", active: true }]);
        setShown(photos.length);
      } catch (e) {
        setNote({ tone: "bad", text: (e as Error).message });
      }
    }
    setBusy(null);
  }

  async function cardPicture(i: number, file: File | undefined) {
    if (!file) return;
    setBusy(`card${i}`);
    try {
      const url = await upload(file);
      uploaded.current.push(url);
      setCard(i, { image_url: url, badge: null });
    } catch (e) {
      setNote({ tone: "bad", text: (e as Error).message });
    }
    setBusy(null);
  }

  function storagePath(url: string) {
    const at = url.indexOf(`/${BUCKET}/`);
    return at >= 0 && url.startsWith("http") ? decodeURIComponent(url.slice(at + BUCKET.length + 2)) : null;
  }

  async function publish() {
    if (!draft || !saved) return;
    setBusy("publish");
    setNote(null);
    const sb = createClient();
    try {
      const clean = readMeanwhile(draft.content);
      const c = await sb.from("site_content").upsert({ key: MEANWHILE_KEY, value: clean });
      if (c.error) throw new Error(c.error.message);

      const keep = new Set(draft.photos.map(p => p.id).filter(Boolean));
      const gone = saved.photos.filter(p => p.id && !keep.has(p.id));
      for (const p of gone) {
        const del = await sb.from("campaign_slides").delete().eq("id", p.id!);
        if (del.error) throw new Error(del.error.message);
      }
      const ids: (string | undefined)[] = [];
      for (let order = 0; order < draft.photos.length; order++) {
        const p = draft.photos[order];
        const row = { image_url: p.image_url, caption: p.caption.trim() || null, active: p.active, order };
        if (p.id) {
          const u = await sb.from("campaign_slides").update(row).eq("id", p.id);
          if (u.error) throw new Error(u.error.message);
          ids.push(p.id);
        } else {
          const ins = await sb.from("campaign_slides").insert(row).select("id").single();
          if (ins.error) throw new Error(ins.error.message);
          ids.push(ins.data.id);
        }
      }
      // Files of removed photos and cards: delete them from storage too.
      const used = new Set([...draft.photos.map(p => p.image_url), ...clean.cards.map(c => c.image_url)]);
      const unused = [...gone.map(p => p.image_url), ...saved.content.cards.map(c => c.image_url || ""), ...uploaded.current]
        .filter(u => u && !used.has(u)).map(storagePath).filter((x): x is string => !!x);
      if (unused.length) await sb.storage.from(BUCKET).remove(Array.from(new Set(unused)));
      uploaded.current = [];

      const next: Draft = { content: clean, photos: draft.photos.map((p, i) => ({ ...p, id: ids[i] })) };
      setSaved(next);
      setDraft(structuredClone(next));
      await fetch("/api/admin/refresh-home", { method: "POST" }).catch(() => null);
      setNote({ tone: "ok", text: "Published. It's live on the home page now." });
    } catch (e) {
      setNote({ tone: "bad", text: "Couldn't publish: " + (e as Error).message });
    }
    setBusy(null);
  }

  function discard() {
    if (!saved) return;
    setDraft(structuredClone(saved));
    setNote(null);
  }

  return (
    <AdminFrame>
      <main className="mx-auto max-w-[1320px] px-4 pb-32 pt-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">Home page</p>
            <h1 className="font-display text-[40px] font-extrabold leading-[1]">Meanwhile section</h1>
            <p className="max-w-[60ch] text-body text-fg-2">The photo and the three cards under the newest works. Change anything, check the preview, then publish.</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="text-label font-semibold text-fg-2 underline underline-offset-4 hover:text-fg">Open the home page</a>
        </header>

        {missing && (
          <Alert tone="warn" className="mb-6">
            One step first: run <b>admin/site_content.sql</b> in the Supabase SQL editor, then refresh this page. Until then you can look, but not publish.
          </Alert>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* ── Editor ── */}
          <div className="flex flex-col gap-6">
            <Panel title="Photos" hint="They change every 6 seconds. Landscape photos of an artist's everyday moment work best.">
              <ul className="flex flex-col gap-2">
                {photos.map((p, i) => (
                  <li key={p.image_url + i}
                    className={cn("flex flex-wrap items-center gap-3 rounded-control border-hair bg-surface p-2 transition-colors sm:flex-nowrap",
                      i === shown ? "border-ink" : "border-line")}>
                    <button type="button" onClick={() => setShown(i)} aria-label={`Show photo ${i + 1} in the preview`}
                      className="relative h-14 w-20 shrink-0 overflow-hidden rounded-[6px] bg-sunken">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url} alt="" className={cn("h-full w-full object-cover", !p.active && "opacity-40")} />
                    </button>
                    <Input aria-label={`Label on photo ${i + 1}`} value={p.caption} maxLength={40}
                      className="order-last basis-full sm:order-none sm:basis-auto"
                      placeholder="Label, e.g. You, Saturday 9 pm"
                      onFocus={() => setShown(i)}
                      onChange={e => setPhotos(ps => ps.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                    <div className="ml-auto flex shrink-0 items-center">
                      <IconBtn label={p.active ? "Hide this photo" : "Show this photo"}
                        onClick={() => setPhotos(ps => ps.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}>
                        {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </IconBtn>
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => { setPhotos(ps => move(ps, i, -1)); setShown(i - 1); }}><ArrowUp size={16} /></IconBtn>
                      <IconBtn label="Move down" disabled={i === photos.length - 1} onClick={() => { setPhotos(ps => move(ps, i, 1)); setShown(i + 1); }}><ArrowDown size={16} /></IconBtn>
                      <IconBtn label="Remove this photo" onClick={() => { setPhotos(ps => ps.filter((_, j) => j !== i)); setShown(0); }}><Trash2 size={16} /></IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
              {photos.length > 0 && visible.length === 0 && (
                <p className="text-caption text-fg-3">All photos are hidden, so visitors see the default river photo.</p>
              )}
              <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-control border-hair border-dashed border-line-strong bg-surface px-4 py-5 text-label font-semibold text-fg-2 transition-colors hover:border-ink hover:text-fg",
                busy === "photos" && "pointer-events-none opacity-60")}>
                <ImagePlus size={18} aria-hidden />
                {busy === "photos" ? "Uploading…" : photos.length ? "Add photos" : "Add the first photo"}
                <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={e => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
            </Panel>

            <Panel title="Words">
              <Field label="Headline" hint={`${content.headline.length}/90`}>
                {f => <Input {...f} value={content.headline} maxLength={90} onChange={e => setContent({ headline: e.target.value })} />}
              </Field>
              <Field label="Line under it" hint="Optional. Leave empty to show only the headline.">
                {f => <Textarea {...f} rows={2} value={content.text} maxLength={280} placeholder="Say what Artomango did while they lived their life."
                  onChange={e => setContent({ text: e.target.value })} />}
              </Field>
            </Panel>

            <Panel title="Cards" hint="Up to three. Put **stars** around words to make them bold.">
              <ol className="flex flex-col gap-3">
                {content.cards.map((c, i) => (
                  <li key={i} className="flex flex-col gap-3 rounded-control border-hair border-line bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-ui text-caption font-semibold text-fg-3">Card {i + 1}</span>
                      <div role="radiogroup" aria-label={`Card ${i + 1} shows`} className="inline-flex rounded-pill border-hair border-line p-0.5">
                        {(["picture", "number"] as const).map(kind => {
                          const on = kind === "picture" ? !!c.image_url : !c.image_url;
                          return (
                            <button key={kind} type="button" role="radio" aria-checked={on}
                              onClick={() => setCard(i, kind === "number" ? { image_url: null, badge: c.badge || "12" } : { image_url: c.image_url || "/demo/window-seat.jpg", badge: null })}
                              className={cn("rounded-pill px-3 py-1 text-caption font-semibold capitalize transition-colors", on ? "bg-ink text-surface" : "text-fg-2 hover:text-fg")}>
                              {kind}
                            </button>
                          );
                        })}
                      </div>
                      <div className="ml-auto flex items-center">
                        <IconBtn label="Move up" disabled={i === 0} onClick={() => setContent({ cards: move(content.cards, i, -1) })}><ArrowUp size={16} /></IconBtn>
                        <IconBtn label="Move down" disabled={i === content.cards.length - 1} onClick={() => setContent({ cards: move(content.cards, i, 1) })}><ArrowDown size={16} /></IconBtn>
                        <IconBtn label="Remove this card" onClick={() => setContent({ cards: content.cards.filter((_, j) => j !== i) })}><Trash2 size={16} /></IconBtn>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.image_url ? (
                        <label className={cn("relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-[6px] border-hair border-ink", busy === `card${i}` && "opacity-50")}
                          title="Change the picture">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                          <span className="sr-only">Change the picture for card {i + 1}</span>
                          <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={e => { cardPicture(i, e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                      ) : (
                        <div className="w-16 shrink-0">
                          <Input aria-label={`Number on card ${i + 1}`} value={c.badge || ""} maxLength={4}
                            className="text-center font-display text-[20px] font-extrabold"
                            onChange={e => setCard(i, { badge: e.target.value })} />
                        </div>
                      )}
                      <Input aria-label={`Card ${i + 1} sentence`} value={c.text} maxLength={160}
                        onChange={e => setCard(i, { text: e.target.value })} />
                    </div>
                    {c.image_url && <p className="text-caption text-fg-3">Tap the picture to change it.</p>}
                  </li>
                ))}
              </ol>
              {content.cards.length < MEANWHILE_MAX_CARDS && (
                <Button variant="secondary" size="sm" className="self-start"
                  onClick={() => setContent({ cards: [...content.cards, { badge: "3", text: "new places are looking for art near you" }] })}>
                  <Plus size={14} aria-hidden /> Add a card
                </Button>
              )}
            </Panel>
          </div>

          {/* ── Live preview ── */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <p className="text-label font-semibold text-fg-2">Preview</p>
              <div role="radiogroup" aria-label="Preview size" className="inline-flex rounded-pill border-hair border-line bg-surface p-0.5">
                {([["desktop", Monitor, "Computer"], ["phone", Smartphone, "Phone"]] as const).map(([v, Icon, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                    className={cn("flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-semibold transition-colors",
                      view === v ? "bg-ink text-surface" : "text-fg-2 hover:text-fg")}>
                    <Icon size={13} aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-card border-hair border-line bg-page p-4 sm:p-6">
              <div className={cn("mx-auto transition-[max-width] duration-base", view === "phone" ? "max-w-[360px]" : "max-w-none")}>
                <MeanwhileView content={readMeanwhile(content)} phone={view === "phone"}
                  photos={visible.map(p => ({ image_url: p.image_url, caption: p.caption }))} active={previewIndex} />
              </div>
            </div>
            {visible.length > 1 && (
              <p className="text-caption text-fg-3">Showing photo {previewIndex + 1} of {visible.length}. Click a photo on the left to see it here.</p>
            )}
          </div>
        </div>
      </main>

      {/* ── Publish bar ── */}
      <div className={cn("fixed inset-x-0 bottom-0 z-30 border-t-hair border-line bg-surface transition-transform duration-base",
        dirty || note ? "translate-y-0" : "translate-y-full")}>
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <p className={cn("min-w-0 flex-1 text-body-sm", note?.tone === "bad" ? "font-medium text-bad" : note?.tone === "ok" && !dirty ? "font-medium text-ok" : "text-fg-2")}>
            {note && (note.tone === "bad" || !dirty) ? note.text : "You have changes that aren't live yet."}
          </p>
          {dirty && (
            <>
              <Button variant="ghost" onClick={discard} disabled={!!busy}><Undo2 size={15} aria-hidden /> Discard</Button>
              <Button variant="primary" onClick={publish} disabled={!!busy || missing}>
                {busy === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>
    </AdminFrame>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border-hair border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] font-extrabold leading-[1.05]">{title}</h2>
        {hint && <p className="text-body-sm text-fg-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-chip text-fg-2 transition-colors hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-30">
      {children}
    </button>
  );
}
