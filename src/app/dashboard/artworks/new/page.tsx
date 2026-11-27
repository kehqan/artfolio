"use client";
// Add a work, one question at a time.
//
//   1. Photos (the first is the cover)
//   2. Title, or one tap for "Untitled". The work is saved here, so
//      everything after this is optional and nothing is ever lost.
//   3. Finished, or still working on it
//   4. Medium · 5. Size · 6. Year · 7. Price · 8. Open to a wall
//
// Every question after the title has an easy way out ("I don't know
// yet"), and each answer is saved as soon as it's given. What's skipped
// shows up later as a gentle nudge (Home, the work's page).
//
// /dashboard/artworks/new?finish=<id> asks only what a saved work is
// still missing to be ready to place: photo, size, price.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Chip, Input, Select, cn } from "@/components/ui";
import { CURRENCIES, Dropzone, ImageThumb, MAX_IMAGES, WALL_TERMS, type ArtType } from "../_form/parts";
import { type PlaceArtwork, missingForWall, wallReady } from "@/lib/places";
import { useJourney } from "@/components/journey/JourneyProvider";
import { Burst } from "@/components/journey/Burst";
import { IMAGE_CACHE_SECONDS, isPicture, photoProblem, prepareImage, uploadable } from "@/lib/image";
import { track } from "@/lib/analytics";
import { insertOnce, newId } from "@/lib/once";

type Step = "photos" | "title" | "finished" | "medium" | "size" | "year" | "price" | "wall" | "done";

const MEDIUMS: { label: string; type: ArtType }[] = [
  { label: "Oil", type: "physical" }, { label: "Acrylic", type: "physical" }, { label: "Watercolour", type: "physical" },
  { label: "Ink", type: "physical" }, { label: "Drawing", type: "physical" }, { label: "Mixed media", type: "mixed" },
  { label: "Photography", type: "digital" }, { label: "Digital", type: "digital" }, { label: "Print", type: "print" },
  { label: "Sculpture", type: "physical" }, { label: "Textile", type: "physical" }, { label: "Ceramics", type: "physical" },
];

type Photo = { key: string; preview: string; url: string | null; failed?: boolean };

type Work = PlaceArtwork & { art_type?: ArtType | null; year?: number | null; images: string[] };

export default function AddWorkPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [finishId, setFinishId] = useState<string | null>(null);
  const [work, setWork] = useState<Work | null>(null);     // set once saved
  const [steps, setSteps] = useState<Step[]>(["photos", "title", "finished", "medium", "size", "year", "price", "wall", "done"]);
  const [at, setAt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Answers
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [finished, setFinished] = useState<boolean | null>(null);
  const [medium, setMedium] = useState("");
  const [artType, setArtType] = useState<ArtType>("physical");
  const [w, setW] = useState(""); const [h, setH] = useState(""); const [d, setD] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState(""); const [currency, setCurrency] = useState("EUR");

  const uploads = useRef<Record<string, Promise<string | null>>>({});
  // Picked once: a second tap or a retry on a bad connection can't save the work twice.
  const workId = useRef(newId());

  // Who, which currency they use, and whether we're finishing a saved work.
  useEffect(() => {
    const finish = new URLSearchParams(window.location.search).get("finish");
    setFinishId(finish);
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: last } = await sb.from("artworks").select("currency").eq("user_id", user.id)
        .not("currency", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (last?.currency) setCurrency(String(last.currency).toUpperCase());
      if (!finish) return;
      const { data: a } = await sb.from("artworks").select("*").eq("id", finish).eq("user_id", user.id).maybeSingle();
      if (!a) { setFinishId(null); return; }
      const wk = { ...a, images: a.images || [] } as Work;
      setWork(wk); setTitle(wk.title || ""); setArtType((wk.art_type as ArtType) || "physical");
      if (wk.currency) setCurrency(String(wk.currency).toUpperCase());
      setPhotos(wk.images.map(u => ({ key: u, preview: u, url: u })));
      const need = missingForWall(wk);
      const s: Step[] = [];
      if (need.includes("a photo")) s.push("photos");
      if (need.includes("its size")) s.push("size");
      if (need.includes("a price")) s.push("price");
      setSteps([...s, "done"]);
      setAt(0);
    });
  }, []);

  const step = steps[at];
  const { win } = useJourney();
  const [first, setFirst] = useState(false);

  // The very first work in the studio gets a small moment.
  useEffect(() => {
    if (step !== "done" || finishId || !userId) return;
    createClient().from("artworks").select("id", { count: "exact", head: true }).eq("user_id", userId).then(async ({ count }) => {
      const fresh = await win("first_work");
      setFirst(fresh && count === 1);
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  // Size only makes sense for things you can hang.
  const flow = useMemo(() => steps.filter(s => !(s === "size" && artType === "digital")
    && !((s === "price" || s === "wall") && finished === false)), [steps, artType, finished]);
  const idx = flow.indexOf(step);
  const questions = flow.filter(s => s !== "done").length;

  function next() {
    setError("");
    const i = flow.indexOf(step);
    const n = flow[i + 1];
    setAt(steps.indexOf(n ?? "done"));
  }
  function back() {
    setError("");
    const i = flow.indexOf(step);
    if (i <= 0) return;
    setAt(steps.indexOf(flow[i - 1]));
  }

  // ── Photos: upload as soon as they're picked ──
  function addPhotos(files: FileList | null) {
    if (!files || !userId) return;
    const sb = createClient();
    const picked = Array.from(files).filter(isPicture).slice(0, MAX_IMAGES - photos.length);
    if (!picked.length && files.length) { setError("Pick a photo: JPG, PNG, WebP or an iPhone photo."); return; }
    const added = picked.map((f, i) => {
      const key = `${Date.now()}-${i}-${f.name}`;
      // Shrunk and turned into WebP first (lib/image), then uploaded.
      uploads.current[key] = prepareImage(f).then(img => {
        if (!uploadable(img)) { setError(photoProblem(f)); return null; }
        const ext = img.name.split(".").pop() || "jpg";
        const path = `artworks/${userId}/${key.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "")}.${ext}`;
        return sb.storage.from("avatars").upload(path, img, { upsert: true, contentType: img.type, cacheControl: IMAGE_CACHE_SECONDS })
          .then(({ error: e }) => (e ? null : sb.storage.from("avatars").getPublicUrl(path).data.publicUrl));
      })
        .catch(() => null)
        .then(url => {
          setPhotos(p => p.map(x => (x.key === key ? { ...x, url, failed: !url } : x)));
          return url;
        });
      return { key, preview: URL.createObjectURL(f), url: null };
    });
    setPhotos(p => [...p, ...added]);
  }
  const removePhoto = (key: string) => { delete uploads.current[key]; setPhotos(p => p.filter(x => x.key !== key)); };
  const makeCover = (key: string) => setPhotos(p => [...p.filter(x => x.key === key), ...p.filter(x => x.key !== key)]);
  const uploading = photos.some(p => !p.url && !p.failed);

  async function photoUrls() {
    await Promise.all(Object.values(uploads.current));
    return photos.map(p => p.url).filter((u): u is string => !!u);
  }

  // ── Save ──
  async function update(fields: Record<string, unknown>) {
    if (!work) return true;
    setBusy(true);
    const { error: e } = await createClient().from("artworks").update(fields).eq("id", work.id);
    setBusy(false);
    if (e) { setError("That didn't save. Please try again."); return false; }
    setWork(wk => (wk ? { ...wk, ...fields } as Work : wk));
    return true;
  }

  async function saveTitle(t: string) {
    if (!userId) return;
    if (busy) return;
    if (work) { if (await update({ title: t })) next(); return; }
    setBusy(true); setError("");
    const images = await photoUrls();
    const { data, error: e } = await insertOnce(createClient(), "artworks", {
      id: workId.current, user_id: userId, title: t, images, art_type: "physical", status: "complete", currency,
      authentication_status: "original",
    });
    setBusy(false);
    if (e || !data) { setError(e?.hint === "rate_limited" ? e.message : "That didn't save. Check your connection and try again."); return; }
    track("work_added", { from: "add" });
    setWork({ ...data, images: data.images || [] } as Work);
    next();
  }

  async function savePhotosOnly() {
    const images = await photoUrls();
    if (await update({ images })) next();
  }

  const answer = (fields: Record<string, unknown>) => async () => { if (await update(fields)) next(); };
  const skip = () => next();

  const num = (v: string) => (v.trim() === "" || isNaN(Number(v)) ? null : Number(v));
  const thisYear = new Date().getFullYear();

  // ── Screens ──
  let body: React.ReactNode = null;

  if (step === "photos") {
    body = (
      <Screen title={finishId ? "Add a photo" : "Start with a photo"} hint="The first one is the cover. You can add up to 8."
        primary={<Button variant="primary" size="md" disabled={!photos.length || uploading || busy}
          onClick={() => (work ? savePhotosOnly() : next())}>{uploading ? "Uploading…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}
        secondary={!photos.length ? <Button variant="ghost" onClick={skip}>No photo yet</Button> : null}>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.key} className="relative">
                <ImageThumb src={p.preview} main={i === 0} pending={!p.url && !p.failed} onRemove={() => removePhoto(p.key)} />
                {i > 0 && p.url && (
                  <button type="button" onClick={() => makeCover(p.key)}
                    className="absolute bottom-1.5 left-1.5 rounded-chip bg-surface px-1.5 py-0.5 font-ui text-caption font-semibold text-fg-2 hover:text-fg">
                    Make cover
                  </button>
                )}
                {p.failed && <span className="absolute inset-x-1.5 top-1.5 rounded-chip bg-surface px-1.5 font-ui text-caption text-bad">Didn&rsquo;t upload</span>}
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_IMAGES && <Dropzone onFiles={addPhotos} remaining={MAX_IMAGES - photos.length} />}
      </Screen>
    );
  }

  if (step === "title") {
    body = (
      <Screen title="What's it called?" hint="Untitled is a fine title too."
        onSubmit={() => title.trim() && saveTitle(title.trim())}
        primary={<Button type="submit" variant="primary" disabled={!title.trim() || busy}>{busy ? "Saving…" : "Continue"} <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" disabled={busy} onClick={() => saveTitle("Untitled")}>It&rsquo;s untitled</Button>}>
        <Input autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Harbour at dusk" aria-label="Title" className="h-12 text-body" />
      </Screen>
    );
  }

  if (step === "finished") {
    body = (
      <Screen title="Is it finished?" hint="Works in progress stay in your studio until you say they're done.">
        <Options options={[
          { label: "Yes, it's finished", onPick: () => { setFinished(true); answer({ status: "complete" })(); } },
          { label: "Still working on it", onPick: () => { setFinished(false); answer({ status: "in_progress" })(); } },
        ]} />
      </Screen>
    );
  }

  if (step === "medium") {
    body = (
      <Screen title="What's it made with?" hint="Pick one or write your own."
        onSubmit={() => medium.trim() && answer({ medium: medium.trim(), art_type: artType })()}
        primary={<Button type="submit" variant="primary" disabled={!medium.trim() || busy}>Continue <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" onClick={skip}>I don&rsquo;t know yet</Button>}>
        <div className="flex flex-wrap gap-2">
          {MEDIUMS.map(m => (
            <Chip key={m.label} selected={medium === m.label} onClick={() => { setMedium(m.label); setArtType(m.type); }}>{m.label}</Chip>
          ))}
        </div>
        <Input value={MEDIUMS.some(m => m.label === medium) ? "" : medium} onChange={e => { setMedium(e.target.value); setArtType("physical"); }}
          placeholder="Or write it, e.g. Oil on linen" aria-label="Medium" />
      </Screen>
    );
  }

  if (step === "size") {
    body = (
      <Screen title="How big is it?" hint="Width × height in centimetres. Venues need this to find a wall for it."
        onSubmit={() => num(w) && num(h) && answer({ width_cm: num(w), height_cm: num(h), depth_cm: num(d) })()}
        primary={<Button type="submit" variant="primary" disabled={!num(w) || !num(h) || busy}>Continue <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" onClick={skip}>I&rsquo;ll measure it later</Button>}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Measure label="Width" value={w} onChange={setW} autoFocus />
          <span aria-hidden className="pb-3 font-ui text-body text-fg-3">×</span>
          <Measure label="Height" value={h} onChange={setH} />
        </div>
        <div className="max-w-[calc(50%-1rem)]"><Measure label="Depth, if it has one" value={d} onChange={setD} /></div>
      </Screen>
    );
  }

  if (step === "year") {
    body = (
      <Screen title="When did you make it?"
        onSubmit={() => num(year) && answer({ year: num(year) })()}
        primary={<Button type="submit" variant="primary" disabled={!num(year) || busy}>Continue <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<Button variant="ghost" onClick={skip}>Not sure</Button>}>
        <div className="flex flex-wrap gap-2">
          {[thisYear, thisYear - 1, thisYear - 2].map(y => (
            <Chip key={y} selected={year === String(y)} onClick={() => setYear(String(y))}>{y}</Chip>
          ))}
        </div>
        <Input inputMode="numeric" value={year} maxLength={4} onChange={e => setYear(e.target.value.replace(/\D/g, ""))} placeholder="Another year" aria-label="Year" className="max-w-[180px]" />
      </Screen>
    );
  }

  if (step === "price") {
    body = (
      <Screen title="Is it for sale?" hint="Add a price and venues and collectors can say yes faster. You can change it anytime."
        onSubmit={() => num(price) != null && answer({ price: num(price), currency, status: "available", sale_method: "direct" })()}
        primary={<Button type="submit" variant="primary" disabled={num(price) == null || busy}>Continue <ArrowRight size={16} aria-hidden /></Button>}
        secondary={<>
          <Button variant="ghost" onClick={answer({ sale_method: "not_for_sale", price: null })}>Not for sale</Button>
          <Button variant="ghost" onClick={skip}>I don&rsquo;t know yet</Button>
        </>}>
        <div className="flex gap-2">
          <Input autoFocus inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Price" aria-label="Price" className="h-12 flex-1 text-body" />
          <Select value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Currency" className="h-12 w-28">
            {Array.from(new Set([currency, ...CURRENCIES])).map(c => <option key={c}>{c}</option>)}
          </Select>
        </div>
      </Screen>
    );
  }

  if (step === "wall") {
    body = (
      <Screen title="Would you show it in a café or venue?" hint="Places looking for art will see it. You decide on every offer."
        secondary={<Button variant="ghost" onClick={answer({ wall_terms: null })}>Not now</Button>}>
        <Options options={WALL_TERMS.map(t => ({
          label: t.key === "either" ? "Yes, to sell or to lend" : t.key === "sale" ? "Yes, if they can sell it" : "Yes, on loan only",
          onPick: answer({ wall_terms: t.key }),
        }))} />
      </Screen>
    );
  }

  if (step === "done" && work) {
    const need = missingForWall(work);
    const ready = wallReady(work);
    body = (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          {first && <Burst spread={2.1} />}
          <div className="relative grid h-56 w-56 place-items-center overflow-hidden rounded-card border-outline border-ink bg-sunken shadow-hard-2 animate-pop">
            {work.images[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img loading="lazy" decoding="async" src={work.images[0]} alt="" className="h-full w-full object-contain p-3" />
              : <span className="font-display text-h2 text-fg-3">{work.title.slice(0, 1)}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 leading-tight text-fg">{finishId ? "All set" : first ? "Your first work is in" : `${work.title} is in your studio`}</h1>
          <p className="mx-auto max-w-sm font-ui text-body text-fg-2">
            {ready
              ? "It's ready to place. Cafés and venues looking for art can say yes to it."
              : need.length
                ? `When you have ${need.join(" and ")}, it's ready to offer to cafés and venues. No rush.`
                : "You can add more details anytime."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {ready && <ButtonLink variant="primary" href={`/dashboard/looking?work=${work.id}`}>Find a place for it <ArrowRight size={16} aria-hidden /></ButtonLink>}
          <ButtonLink variant={ready ? "secondary" : "primary"} href={`/dashboard/artworks/${work.id}`}>See the work</ButtonLink>
          {!finishId && (
            <Button variant="ghost" onClick={() => window.location.assign("/dashboard/artworks/new")}>Add another</Button>
          )}
        </div>
      </div>
    );
  }

  const closeHref = work ? `/dashboard/artworks/${work.id}` : "/dashboard/artworks";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--shell-header)-4rem)] w-full max-w-[560px] flex-col gap-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} disabled={idx <= 0 || step === "done"}
          aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg disabled:invisible">
          <ArrowLeft size={17} aria-hidden />
        </button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={questions} aria-valuenow={Math.min(idx, questions)}>
          {Array.from({ length: questions }).map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-pill transition-colors duration-base", i < idx || step === "done" ? "bg-ink" : i === idx ? "bg-mango" : "bg-line")} />
          ))}
        </div>
        <Link href={closeHref} aria-label={work ? "Close, your work is saved" : "Close"} title={work ? "Your work is saved" : undefined}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
          {step === "done" ? <Check size={17} aria-hidden /> : <X size={17} aria-hidden />}
        </Link>
      </div>

      {error && <Alert tone="bad">{error}</Alert>}

      <div key={step} className="flex flex-1 flex-col animate-drop-in">{body}</div>

      {work && step !== "done" && step !== "title" && (
        <p className="text-center font-ui text-caption text-fg-3">Saved as you go. Close anytime and pick up later.</p>
      )}
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

function Options({ options }: { options: { label: string; onPick: () => void }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(o => (
        <button key={o.label} type="button" onClick={o.onPick}
          className="flex h-14 items-center justify-between rounded-card border-hair border-line bg-surface px-4 text-left font-ui text-body font-semibold text-fg transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none">
          {o.label} <ArrowRight size={16} aria-hidden className="text-fg-3" />
        </button>
      ))}
    </div>
  );
}

function Measure({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-ui text-label font-semibold text-fg">{label}</span>
      <span className="relative">
        <Input autoFocus={autoFocus} inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ""))} className="h-12 pr-10 text-body" />
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-ui text-body-sm text-fg-3">cm</span>
      </span>
    </label>
  );
}
