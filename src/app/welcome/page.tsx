"use client";
// First run for a new artist: about two minutes from sign-up to a live
// site with work that cafés and venues can say yes to.
//
//   Hello → 1. Photos of up to three works → 2. Their names → 3. Sizes
//   → 4. Prices → 5. Open to a wall → 6. The look of your site → Done
//
// One question per screen, and every one has an easy way out. Works are
// saved at step 2, and each answer after that is saved as it's given, so
// closing early never loses anything. Sign-up marks a new artist with
// user_metadata.welcome = "pending"; the middleware sends them here from
// /dashboard until this flow marks it "done" (finished, skipped or closed).
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, ImagePlus, X } from "lucide-react";
import { type Milestone, saveJourney } from "@/lib/journey";
import { createClient } from "@/lib/supabase/client";
import { insertOnce, newId } from "@/lib/once";
import { Alert, Button, ButtonLink, Input, Select, cn } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";
import { CURRENCIES } from "@/app/dashboard/artworks/_form/parts";
import { type PlaceArtwork, type WallTerms, missingForWall, wallReady } from "@/lib/places";
import {
  ACCENTS, type AccentKey, type GridKey, type HeaderKey, type PreviewMessage, type SiteConfig, type TypeKey, siteOf,
} from "@/lib/site";
import { IMAGE_CACHE_SECONDS, isPicture, photoProblem, prepareImage, uploadable } from "@/lib/image";
import { track } from "@/lib/analytics";

const MAX_WORKS = 3;

type Step = "hello" | "photos" | "titles" | "sizes" | "prices" | "wall" | "look" | "done";
const ALL_STEPS: Step[] = ["hello", "photos", "titles", "sizes", "prices", "wall", "look", "done"];

/** One work in the flow. `id` is set once it's saved. */
type Draft = {
  key: string; id?: string; preview: string; url: string | null; failed?: boolean;
  /** The id this work will be saved under, picked once so a retry can't save it twice. */
  newId?: string;
  title: string; w: string; h: string; price: string;
  saved?: PlaceArtwork;
};

type LookKey = "studio" | "gallery" | "quiet";
const LOOKS: { key: LookKey; label: string; hint: string; header: HeaderKey; grid: GridKey; type: TypeKey; accent: AccentKey }[] = [
  { key: "studio", label: "Studio", hint: "You beside your name, work in a calm grid", header: "split", grid: "gallery", type: "modern", accent: "mango" },
  { key: "gallery", label: "Gallery", hint: "Your work, large, with your name across it", header: "statement", grid: "salon", type: "classic", accent: "ocean" },
  { key: "quiet", label: "Quiet", hint: "Just your name, then one work at a time", header: "minimal", grid: "single", type: "classic", accent: "clay" },
];

const num = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? null : Number(v));

export default function WelcomePage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [savedSite, setSavedSite] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState<Step>("hello");
  const [works, setWorks] = useState<Draft[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [look, setLook] = useState<LookKey>("studio");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const uploads = useRef<Record<string, Promise<string | null>>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  // Who they are, and anything they already added (if they come back).
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUid(user.id);
      const [{ data: prof }, { data: ss }, { data: aw }] = await Promise.all([
        sb.from("profiles").select("full_name, username, avatar_url, role").eq("id", user.id).single(),
        sb.from("store_settings").select("site").eq("user_id", user.id).maybeSingle(),
        sb.from("artworks").select("id, title, images, width_cm, height_cm, price, currency, status, wall_terms")
          .eq("user_id", user.id).order("created_at", { ascending: true }).limit(MAX_WORKS),
      ]);
      setName(prof?.full_name || user.user_metadata?.full_name || "");
      setUsername(prof?.username || null);
      setAvatar(prof?.avatar_url || null);
      setSavedSite(ss?.site ?? null);
      const list = (aw || []) as PlaceArtwork[];
      setWorks(list.map(a => ({
        key: a.id, id: a.id, preview: a.images?.[0] || "", url: a.images?.[0] || null,
        title: a.title === "Untitled" ? "" : a.title,
        w: a.width_cm ? String(a.width_cm) : "", h: a.height_cm ? String(a.height_cm) : "",
        price: a.price != null ? String(a.price) : "", saved: a,
      })));
      const c = list.find(a => a.currency)?.currency;
      if (c) setCurrency(String(c).toUpperCase());
      setLoaded(true);
    });
  }, [router]);

  // Without works there's nothing to name, measure, price or hang.
  const flow = useMemo<Step[]>(
    () => ALL_STEPS.filter(s => works.length > 0 || !["titles", "sizes", "prices", "wall"].includes(s)),
    [works.length],
  );
  const questions = flow.filter(s => s !== "hello" && s !== "done");
  const qIdx = (questions as Step[]).indexOf(step);

  function go(s: Step) { setError(""); setStep(s); window.scrollTo({ top: 0 }); }
  function next() { const i = flow.indexOf(step); go(flow[Math.min(i + 1, flow.length - 1)]); }
  function back() { const i = flow.indexOf(step); if (i > 0) go(flow[i - 1]); }

  /** The flow is over for good: finished, skipped or closed. */
  async function markDone(siteSaved = false) {
    const sb = createClient();
    await sb.auth.updateUser({ data: { welcome: "done" } }).catch(() => null);
    // What they celebrated here shouldn't be celebrated again in the app.
    const won: Milestone[] = [];
    const saved = works.map(x => x.saved).filter((a): a is PlaceArtwork => !!a);
    if (saved.length) won.push("first_work");
    if (saved.some(a => a.wall_terms)) won.push("open_to_wall");
    if (siteSaved) won.push("site_live");
    if (uid && won.length) await saveJourney(sb, uid, { won });
  }
  async function leave(href: string) { setBusy(true); await markDone(); router.replace(href); }

  // ── Photos: upload as soon as they're picked ──
  function addPhotos(files: FileList | null) {
    if (!files || !uid) return;
    const sb = createClient();
    const picked = Array.from(files).filter(isPicture).slice(0, MAX_WORKS - works.length);
    if (!picked.length && files.length) { setError("Pick a photo: JPG, PNG, WebP or an iPhone photo."); return; }
    const added: Draft[] = picked.map((f, i) => {
      const key = `${Date.now()}-${i}-${f.name}`;
      // Shrunk and turned into WebP first (lib/image), then uploaded.
      uploads.current[key] = prepareImage(f).then(img => {
        if (!uploadable(img)) { setError(photoProblem(f)); return null; }
        const ext = img.name.split(".").pop() || "jpg";
        const path = `artworks/${uid}/${key.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "")}.${ext}`;
        return sb.storage.from("avatars").upload(path, img, { upsert: true, contentType: img.type, cacheControl: IMAGE_CACHE_SECONDS })
          .then(({ error: e }) => (e ? null : sb.storage.from("avatars").getPublicUrl(path).data.publicUrl));
      })
        .catch(() => null)
        .then(url => { setWorks(ws => ws.map(x => (x.key === key ? { ...x, url, failed: !url } : x))); return url; });
      return { key, preview: URL.createObjectURL(f), url: null, title: "", w: "", h: "", price: "" };
    });
    setWorks(ws => [...ws, ...added]);
  }
  const removeWork = (key: string) => { delete uploads.current[key]; setWorks(ws => ws.filter(x => x.key !== key)); };
  const uploading = works.some(x => !x.url && !x.failed);
  const patchDraft = (key: string, p: Partial<Draft>) => setWorks(ws => ws.map(x => (x.key === key ? { ...x, ...p } : x)));

  // ── Saving ──
  async function saveTitles() {
    if (!uid) return;
    setBusy(true); setError("");
    await Promise.all(Object.values(uploads.current));
    const sb = createClient();
    // Photos that didn't upload are dropped rather than saved without an image.
    const keep = works.filter(x => x.id || x.url);
    const out: Draft[] = [];
    for (const x of keep) {
      const title = x.title.trim() || "Untitled";
      if (x.id) {
        if (title !== x.saved?.title) {
          const { error: e } = await sb.from("artworks").update({ title }).eq("id", x.id);
          if (e) { setBusy(false); setError("That didn't save. Please try again."); return; }
        }
        out.push({ ...x, saved: { ...x.saved!, title } });
      } else {
        x.newId ||= newId();
        const { data, error: e } = await insertOnce<PlaceArtwork>(sb, "artworks", {
          id: x.newId, user_id: uid, title, images: [x.url], art_type: "physical", status: "complete", currency,
          authentication_status: "original",
        }, "id, title, images, width_cm, height_cm, price, currency, status, wall_terms");
        // Keep the ones that did save, so trying again only saves the rest.
        if (e || !data) { setWorks([...out, ...keep.slice(out.length)]); setBusy(false); setError("That didn't save. Check your connection and try again."); return; }
        out.push({ ...x, id: data.id, saved: data as PlaceArtwork });
        track("work_added", { from: "welcome" });
      }
    }
    setWorks(out);
    setBusy(false);
    if (!out.length) { go("look"); return; }
    next();
  }

  /** Update each saved work with its own fields; returns false on failure. */
  async function updateEach(fields: (x: Draft) => Record<string, unknown> | null) {
    setBusy(true); setError("");
    const sb = createClient();
    // All works are saved at the same time, not one after another.
    const plan = works.map(x => ({ x, f: x.id ? fields(x) : null }));
    const results = await Promise.all(plan.map(({ x, f }) => (f ? sb.from("artworks").update(f).eq("id", x.id!) : null)));
    if (results.some(r => r?.error)) { setBusy(false); setError("That didn't save. Please try again."); return false; }
    const out: Draft[] = plan.map(({ x, f }) => (f ? { ...x, saved: { ...x.saved!, ...f } as PlaceArtwork } : x));
    setWorks(out);
    setBusy(false);
    return true;
  }

  async function saveSizes() {
    const ok = await updateEach(x => (num(x.w) && num(x.h) ? { width_cm: num(x.w), height_cm: num(x.h) } : null));
    if (ok) next();
  }
  async function savePrices() {
    const ok = await updateEach(x => (num(x.price) != null
      ? { price: num(x.price), currency, status: "available", sale_method: "direct" }
      : null));
    if (ok) next();
  }
  async function saveWall(terms: WallTerms | null) {
    const ok = await updateEach(() => ({ wall_terms: terms }));
    if (ok) next();
  }

  const lookDef = LOOKS.find(l => l.key === look)!;
  const site: SiteConfig = useMemo(() => {
    const base = siteOf(savedSite, "artist");
    return { ...base, header: lookDef.header, grid: lookDef.grid, type: lookDef.type, accent: lookDef.accent };
  }, [savedSite, lookDef]);

  async function saveLook() {
    if (!uid) return;
    setBusy(true); setError("");
    const { error: e } = await createClient().from("store_settings").upsert(
      { user_id: uid, site, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (e) { setError("That didn't save. Please try again."); return; }
    await markDone(true);
    next();
  }

  // Live preview of their real site in the look step.
  useEffect(() => {
    if (step !== "look") return;
    const send = () => {
      const msg: PreviewMessage = { type: "site-preview", site, settings: {} };
      frame.current?.contentWindow?.postMessage(msg, window.location.origin);
    };
    send();
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "site-preview-ready") send(); };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [step, site]);

  const firstName = name.trim().split(" ")[0];
  const cover = works.find(x => x.preview)?.preview || null;
  const siteUrl = username ? `${typeof window !== "undefined" ? window.location.host : "artomango.com"}/${username}` : "";

  // ── Screens ──
  let body: React.ReactNode = null;

  if (step === "hello") {
    body = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-display leading-none text-fg">
            {firstName ? <>Welcome, {firstName}.</> : <>Welcome.</>}
          </h1>
          <p className="font-ui text-lead text-fg-2">Let&rsquo;s get your work onto a wall. It takes about two minutes.</p>
        </div>
        <ol className="flex flex-col divide-y divide-line rounded-card border-hair border-line bg-surface">
          {[
            ["Add up to three works", "Start with pieces you'd like to see hanging somewhere."],
            ["Say if they can hang in a café", "Places looking for art will see them."],
            ["Pick the look of your site", "It goes live at your own address."],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-4 px-5 py-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill border-outline border-ink bg-mango font-ui text-label font-bold text-on-mango">{i + 1}</span>
              <span className="flex flex-col">
                <span className="font-ui text-body font-semibold text-fg">{t}</span>
                <span className="font-ui text-body-sm text-fg-3">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" className="sm:mr-auto" disabled={busy} onClick={() => leave("/dashboard")}>Skip, take me to my studio</Button>
          <Button variant="primary" size="md" disabled={!loaded} onClick={next}>Let&rsquo;s start <ArrowRight size={16} aria-hidden /></Button>
        </div>
      </div>
    );
  }

  if (step === "photos") {
    const room = MAX_WORKS - works.length;
    body = (
      <Screen title="Show us three works" hint="One photo for each. Pick them all at once, or one by one. You can add more works anytime."
        primary={<Button variant="primary" size="md" disabled={!works.length || uploading || busy} onClick={next}>
          {uploading ? "Uploading…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}
        secondary={!works.length ? <Button variant="ghost" onClick={() => go("look")}>I&rsquo;ll add works later</Button> : null}>
        <div className="grid grid-cols-3 gap-3">
          {works.map(x => (
            <div key={x.key} className="relative aspect-square overflow-hidden rounded-card border-hair border-line bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.preview && <img src={x.preview} alt="" className={cn("h-full w-full object-cover transition-opacity", !x.url && !x.failed && "opacity-60")} />}
              {!x.id && (
                <button type="button" onClick={() => removeWork(x.key)} aria-label="Remove this photo"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-chip border-hair border-line bg-surface text-fg-2 shadow-hard-1 hover:border-ink hover:text-fg">
                  <X size={14} aria-hidden />
                </button>
              )}
              {!x.url && !x.failed && <span className="absolute bottom-1.5 left-1.5 rounded-chip bg-surface px-1.5 py-0.5 font-ui text-caption font-semibold text-fg-2">Uploading</span>}
              {x.id && <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-chip bg-inverse px-1.5 py-0.5 font-ui text-caption font-semibold text-on-inverse"><Check size={11} aria-hidden /> Saved</span>}
              {x.failed && <span className="absolute inset-x-1.5 bottom-1.5 rounded-chip bg-surface px-1.5 py-0.5 font-ui text-caption text-bad">Didn&rsquo;t upload</span>}
            </div>
          ))}
          {Array.from({ length: room }).map((_, i) => (
            <button key={i} type="button" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card border-outline border-dashed bg-page px-2 text-center transition-colors duration-fast",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                i === 0 ? "border-ink text-fg hover:bg-sunken" : "border-line-strong text-fg-3 hover:border-ink hover:text-fg",
              )}>
              <ImagePlus size={22} strokeWidth={1.75} aria-hidden />
              <span className="font-ui text-label font-semibold">{i === 0 ? (works.length ? "Add another" : "Add photos") : "Work " + (works.length + i + 1)}</span>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = ""; }} />
      </Screen>
    );
  }

  if (step === "titles") {
    body = (
      <Screen title="What are they called?" hint="Leave one empty and it's Untitled. That's a fine title too."
        onSubmit={saveTitles}
        primary={<Button type="submit" variant="primary" size="md" disabled={busy || uploading}>{busy ? "Saving…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}>
        {works.map((x, i) => (
          <WorkRow key={x.key} src={x.preview}>
            <Input autoFocus={i === 0} value={x.title} maxLength={200} placeholder="Untitled" aria-label={`Title of work ${i + 1}`}
              onChange={e => patchDraft(x.key, { title: e.target.value })} className="h-12 text-body" />
          </WorkRow>
        ))}
      </Screen>
    );
  }

  if (step === "sizes") {
    const any = works.some(x => num(x.w) && num(x.h));
    body = (
      <Screen title="How big are they?" hint="Width × height in centimetres. Venues need this to find a wall."
        onSubmit={() => (any ? saveSizes() : next())}
        primary={<Button type="submit" variant="primary" size="md" disabled={busy || !any}>{busy ? "Saving…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" onClick={next}>I&rsquo;ll measure later</Button>}>
        {works.map((x, i) => (
          <WorkRow key={x.key} src={x.preview} title={x.title || "Untitled"}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Cm autoFocus={i === 0} label={`Width of ${x.title || "work " + (i + 1)}`} placeholder="Width" value={x.w} onChange={v => patchDraft(x.key, { w: v })} />
              <span aria-hidden className="font-ui text-body text-fg-3">×</span>
              <Cm label={`Height of ${x.title || "work " + (i + 1)}`} placeholder="Height" value={x.h} onChange={v => patchDraft(x.key, { h: v })} />
            </div>
          </WorkRow>
        ))}
      </Screen>
    );
  }

  if (step === "prices") {
    const any = works.some(x => num(x.price) != null);
    body = (
      <Screen title="What would you sell them for?" hint="Add a price so people can buy it off the wall. Leave one empty if it isn't for sale, or you don't know yet."
        onSubmit={() => (any ? savePrices() : next())}
        primary={<Button type="submit" variant="primary" size="md" disabled={busy || !any}>{busy ? "Saving…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" onClick={next}>I don&rsquo;t know yet</Button>}>
        <div className="flex items-center justify-end gap-2">
          <span className="font-ui text-label font-semibold text-fg-2">Currency</span>
          <span className="w-28">
            <Select value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Currency">
              {Array.from(new Set([currency, ...CURRENCIES])).map(c => <option key={c}>{c}</option>)}
            </Select>
          </span>
        </div>
        {works.map((x, i) => (
          <WorkRow key={x.key} src={x.preview} title={x.title || "Untitled"}>
            <span className="relative block">
              <Input autoFocus={i === 0} inputMode="decimal" value={x.price} placeholder="Price" aria-label={`Price of ${x.title || "work " + (i + 1)}`}
                onChange={e => patchDraft(x.key, { price: e.target.value.replace(/[^\d.]/g, "") })} className="h-12 pr-14 text-body" />
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-ui text-body-sm text-fg-3">{currency}</span>
            </span>
          </WorkRow>
        ))}
      </Screen>
    );
  }

  if (step === "wall") {
    const opts: { terms: WallTerms; label: string; line: string }[] = [
      { terms: "either", label: "Yes, to sell or to lend", line: "The most places can say yes" },
      { terms: "sale", label: "Yes, if they can sell them", line: "The venue sells, you agree the cut" },
      { terms: "loan", label: "Yes, on loan only", line: "They hang it, you keep it" },
    ];
    body = (
      <Screen title={works.length > 1 ? "Would you show them in a café or venue?" : "Would you show it in a café or venue?"}
        hint="Turns on Open to a wall. Places looking for art will see your work, and you decide on every offer."
        secondary={<Button variant="ghost" disabled={busy} onClick={() => saveWall(null)}>Not now</Button>}>
        <div className="flex -space-x-3 pb-1">
          {works.map(x => (
            <span key={x.key} className="h-14 w-14 overflow-hidden rounded-control border-outline border-ink bg-sunken shadow-hard-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.preview && <img src={x.preview} alt="" className="h-full w-full object-cover" />}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {opts.map(o => (
            <button key={o.terms} type="button" disabled={busy} onClick={() => saveWall(o.terms)}
              className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border-hair border-line bg-surface px-4 py-3 text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none disabled:opacity-60">
              <span className="flex flex-col">
                <span className="font-ui text-body font-semibold text-fg">{o.label}</span>
                <span className="font-ui text-body-sm text-fg-3">{o.line}</span>
              </span>
              <ArrowRight size={16} aria-hidden className="shrink-0 text-fg-3" />
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  if (step === "look") {
    body = (
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Screen title="Pick the look of your site" hint="You can change colours, sections and more in Your site, anytime."
          onSubmit={saveLook}
          primary={<Button type="submit" variant="primary" size="md" disabled={busy}>{busy ? "Publishing…" : "Publish my site"} <ArrowRight size={16} aria-hidden /></Button>}>
          <div role="radiogroup" aria-label="Look" className="grid gap-3 sm:grid-cols-3">
            {LOOKS.map(l => (
              <button key={l.key} type="button" role="radio" aria-checked={look === l.key} onClick={() => setLook(l.key)}
                className={cn("grid grid-cols-[128px_minmax(0,1fr)] items-center gap-3 rounded-card border-hair bg-surface p-2.5 text-left transition sm:flex sm:flex-col sm:items-stretch sm:gap-2.5",
                  look === l.key ? "border-ink shadow-hard-2" : "border-line hover:border-ink")}>
                <LookSketch look={l} name={name || "Your name"} cover={cover} avatar={avatar} on={look === l.key} />
                <span className="flex flex-col px-1 pb-1">
                  <span className="font-ui text-body-sm font-semibold text-fg">{l.label}</span>
                  <span className="font-ui text-caption leading-snug text-fg-3">{l.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Screen>
        {username && (
          <div className="hidden flex-col gap-2 lg:flex">
            <span className="font-ui text-label font-semibold text-fg-2">Your site, on a phone</span>
            <div className="overflow-hidden rounded-[28px] border-outline border-ink bg-surface shadow-hard-2">
              <div style={{ width: 360, height: 640 }}>
                <iframe ref={frame} title="Preview of your site" src={`/${username}?preview=1`}
                  style={{ width: 390, height: 693, transform: `scale(${360 / 390})`, transformOrigin: "0 0" }}
                  className="block border-0 bg-page" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === "done") {
    const saved = works.map(x => x.saved).filter((a): a is PlaceArtwork => !!a);
    const ready = saved.filter(wallReady);
    const open = saved.filter(a => a.wall_terms).length;
    const need = Array.from(new Set(saved.filter(a => !wallReady(a)).flatMap(a => missingForWall(a)).map(m => (m === "its size" ? "a size" : m))));
    body = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango shadow-hard-1"><Check size={22} strokeWidth={3} aria-hidden /></span>
          <h1 className="font-display text-display leading-none text-fg">{ready.length && open ? <>You&rsquo;re ready for a wall.</> : <>You&rsquo;re live.</>}</h1>
          <p className="font-ui text-lead text-fg-2">
            {saved.length === 0
              ? "Your site is up. Add a work and it shows there right away."
              : ready.length && open
                ? `${ready.length === saved.length ? (saved.length === 1 ? "Your work is" : `All ${saved.length} works are`) : `${ready.length} of ${saved.length} works are`} ready for cafés and venues to say yes to.${need.length ? ` Add ${need.join(" and ")} to the rest whenever you like.` : ""}`
                : need.length
                  ? `Your works are on your site. When you add ${need.join(" and ")}, venues can say yes to them.`
                  : "Your works are on your site. Turn on Open to a wall on any of them when you're ready."}
          </p>
        </div>

        {username && (
          <div className="flex items-center gap-3 rounded-card border-hair border-line bg-surface p-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-ui text-caption font-semibold text-fg-3">Your site</span>
              <span className="truncate font-ui text-body font-semibold text-fg">{siteUrl}</span>
            </span>
            <Button variant="ghost" size="sm" aria-label="Copy the link" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/${username}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => null); }}>
              {copied ? <><Check size={14} aria-hidden /> <span className="hidden sm:inline">Copied</span></> : <><Copy size={14} aria-hidden /> <span className="hidden sm:inline">Copy</span></>}
            </Button>
            <ButtonLink variant="secondary" size="sm" href={`/${username}`} target="_blank"><ExternalLink size={14} aria-hidden /> Open</ButtonLink>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {ready.length > 0 && open > 0
            ? <ButtonLink variant="primary" size="md" href="/dashboard/looking">See places looking for art <ArrowRight size={16} aria-hidden /></ButtonLink>
            : <ButtonLink variant="primary" size="md" href={saved.length ? "/dashboard/artworks" : "/dashboard/artworks/new"}>{saved.length ? "Go to your works" : "Add a work"} <ArrowRight size={16} aria-hidden /></ButtonLink>}
          <ButtonLink variant="ghost" size="md" href="/dashboard">Go to Home</ButtonLink>
        </div>
      </div>
    );
  }

  const wide = step === "look";
  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <header className="flex items-center gap-4 px-4 py-4 sm:px-8">
        <Wordmark href="/dashboard" className="shrink-0 [&>span]:hidden sm:[&>span]:inline" />
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-3">
          {qIdx >= 0 && (
            <>
              <button type="button" onClick={back} aria-label="Back"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
                <ArrowLeft size={17} aria-hidden />
              </button>
              <div className="flex flex-1 gap-1" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={qIdx}>
                {questions.map((s, i) => (
                  <span key={s} className={cn("h-1.5 flex-1 rounded-pill transition-colors duration-base", i < qIdx ? "bg-ink" : i === qIdx ? "bg-mango" : "bg-line")} />
                ))}
              </div>
            </>
          )}
        </div>
        {step !== "done" && (
          <button type="button" onClick={() => leave("/dashboard")} disabled={busy}
            aria-label={works.some(x => x.id) ? "Close, your works are saved" : "Close"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <X size={17} aria-hidden />
          </button>
        )}
      </header>

      <main className={cn("mx-auto flex w-full flex-1 flex-col gap-6 px-4 pb-12 pt-6 sm:pt-10", wide ? "max-w-[960px]" : "max-w-[560px]")}>
        {error && <Alert tone="bad">{error}</Alert>}
        <div key={step} className="flex flex-col animate-drop-in">{body}</div>
        {works.some(x => x.id) && ["sizes", "prices", "wall"].includes(step) && (
          <p className="text-center font-ui text-caption text-fg-3">Saved as you go. Close anytime.</p>
        )}
      </main>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────
function Screen({ title, hint, children, primary, secondary, onSubmit }: {
  title: string; hint?: string; children?: React.ReactNode; primary?: React.ReactNode; secondary?: React.ReactNode; onSubmit?: () => void;
}) {
  return (
    <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); onSubmit?.(); }}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 leading-tight text-fg">{title}</h1>
        {hint && <p className="font-ui text-body text-fg-2">{hint}</p>}
      </div>
      {children && <div className="flex flex-col gap-3">{children}</div>}
      {(primary || secondary) && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1 sm:mr-auto">{secondary}</div>
          {primary && <div className="flex flex-col sm:block [&>button]:w-full sm:[&>button]:w-auto">{primary}</div>}
        </div>
      )}
    </form>
  );
}

/** A work's thumbnail beside the one thing being asked about it. */
function WorkRow({ src, title, children }: { src: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-control border-hair border-line bg-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <span className="truncate font-ui text-label font-semibold text-fg-2">{title}</span>}
        {children}
      </div>
    </div>
  );
}

function Cm({ label, placeholder, value, onChange, autoFocus }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <span className="relative block">
      <Input autoFocus={autoFocus} inputMode="decimal" aria-label={label} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ""))} className="h-12 pr-10 text-body" />
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-ui text-body-sm text-fg-3">cm</span>
    </span>
  );
}

/** A small picture of the site in this look, with their own name and work. */
function LookSketch({ look, name, cover, avatar, on }: {
  look: (typeof LOOKS)[number]; name: string; cover: string | null; avatar: string | null; on: boolean;
}) {
  const a = ACCENTS.find(x => x.key === look.accent)!;
  const serif = look.type === "classic";
  const nameCls = cn("block truncate leading-[0.95]", serif ? "site-serif text-[17px]" : "font-display text-[19px] font-extrabold");
  // eslint-disable-next-line @next/next/no-img-element
  const img = (cls: string) => (cover ? <img src={cover} alt="" className={cn("object-cover", cls)} /> : <span className={cn("block bg-[rgba(20,20,20,0.12)]", cls)} />);
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-control border-hair border-line bg-page">
      {look.header === "statement" && (
        <span className="absolute inset-0 flex flex-col">
          <span className="relative block h-[62%]">
            {img("absolute inset-0 h-full w-full")}
            <span className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.55)] to-transparent" />
            <span className={cn(nameCls, "absolute bottom-2 left-2.5 right-2.5 text-white")}>{name}</span>
          </span>
          <span className="grid flex-1 grid-cols-3 gap-1 p-1.5">
            {[0, 1, 2].map(i => <span key={i} className={cn("block rounded-sm bg-[rgba(20,20,20,0.12)]", i === 1 && "row-span-1 mt-1")} />)}
          </span>
        </span>
      )}
      {look.header === "split" && (
        <span className="absolute inset-0 flex flex-col gap-1.5 p-2.5">
          <span className="grid flex-1 grid-cols-[1fr_44%] items-center gap-2">
            <span className="flex min-w-0 flex-col gap-1.5">
              {avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                : <span className="block h-5 w-5 rounded-full" style={{ background: a.color }} />}
              <span className={cn(nameCls, "whitespace-normal text-fg [overflow-wrap:anywhere]")}>{name}</span>
              <span className="block h-1 w-2/3 rounded-pill bg-[rgba(20,20,20,0.25)]" />
            </span>
            {img("h-full w-full rounded-sm")}
          </span>
          <span className="grid h-[28%] grid-cols-4 gap-1">{[0, 1, 2, 3].map(i => <span key={i} className="block rounded-sm bg-[rgba(20,20,20,0.12)]" />)}</span>
        </span>
      )}
      {look.header === "minimal" && (
        <span className="absolute inset-0 flex flex-col items-center gap-1.5 px-3 pt-3">
          <span className={cn(nameCls, "max-w-full text-fg")}>{name}</span>
          <span className="block h-1 w-5 rounded-pill" style={{ background: a.color }} />
          {img("mt-1 h-full w-[62%] rounded-sm")}
        </span>
      )}
      <span className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-pill border-hair border-[rgba(20,20,20,0.3)]" style={{ background: a.color }} aria-hidden />
      {on && (
        <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango">
          <Check size={11} strokeWidth={3} aria-hidden />
        </span>
      )}
    </span>
  );
}
