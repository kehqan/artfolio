"use client";
// First run for a venue: get the place ready for artists, one question
// per screen. Every screen can be skipped, and each answer is saved as
// soon as you continue, so closing halfway loses nothing.
//
//   1. What's the place called, and what kind of place is it?
//   2. Where is it?
//   3. Photos of the space (what artists most want to see)
//   4. When are you open?
//   5. Done: post your walls, or look at works first
//
// The answers go where the rest of the app already reads them: the
// profile (venue name, type, location) and the "The space" part of the
// venue's site settings (photos, hours).
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { Alert, Button, Chip, Input, Modal, Textarea, cn } from "@/components/ui";
import { type VenueData, VENUE_TYPES, saveSite, uploadImage } from "@/lib/venue";

type Step = "name" | "where" | "photos" | "hours" | "done";
const STEPS: Step[] = ["name", "where", "photos", "hours", "done"];
const MAX_PHOTOS = 6;

export function VenueSetup({ open, data, start = "name", onClose, onSaved, onPostWalls, onBrowse }: {
  open: boolean;
  data: VenueData;
  start?: Step;
  onClose: () => void;
  /** Called after each save, so Home can show the new state behind the sheet. */
  onSaved: () => void;
  onPostWalls: () => void;
  onBrowse: () => void;
}) {
  const [at, setAt] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [where, setWhere] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Start from what we already know (sign-up filled some of it in).
  useEffect(() => {
    if (!open) return;
    const p = data.profile;
    setName(p.venue_name || p.full_name || "");
    setType(p.venue_type || "");
    setWhere(p.location || "");
    setCoords(p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null);
    setPhotos(data.site.space_images || []);
    setHours(data.site.hours || "");
    setError("");
    setAt(Math.max(0, STEPS.indexOf(start)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = STEPS[at];
  const sb = createClient();

  async function save(s: Step): Promise<boolean> {
    let res: { error: unknown } | null = null;
    if (s === "name") {
      const patch: Record<string, unknown> = {};
      if (name.trim()) patch.venue_name = name.trim();
      if (type) patch.venue_type = type;
      if (Object.keys(patch).length) res = await sb.from("profiles").update(patch).eq("id", data.me);
    } else if (s === "where" && where.trim()) {
      res = await sb.from("profiles").update({ location: where.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null }).eq("id", data.me);
    } else if (s === "photos" || s === "hours") {
      const site = { ...data.site, space_images: photos, hours: hours.trim() || undefined };
      const changed = JSON.stringify(site.space_images) !== JSON.stringify(data.site.space_images || []) || (site.hours || "") !== (data.site.hours || "");
      if (changed) res = await saveSite(sb, data.me, site, data.hasSettings);
    }
    if (res?.error) { setError("That didn't save. Please try again."); return false; }
    if (res) onSaved();
    return true;
  }

  async function next() {
    setError(""); setSaving(true);
    const ok = await save(step);
    setSaving(false);
    if (ok) setAt(i => Math.min(STEPS.length - 1, i + 1));
  }
  const skip = () => { setError(""); setAt(i => Math.min(STEPS.length - 1, i + 1)); };
  const back = () => { setError(""); setAt(i => Math.max(0, i - 1)); };

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError("");
    const room = MAX_PHOTOS - photos.length;
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const u = await uploadImage(sb, data.me, f, "space");
      if (u) urls.push(u);
    }
    if (urls.length < Math.min(files.length, room)) setError("Some photos didn't upload. Use JPG, PNG or WebP under 10 MB.");
    setPhotos(p => [...p, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  let q = ""; let hint = ""; let body: React.ReactNode = null;
  switch (step) {
    case "name":
      q = "What kind of place is it?"; hint = "Artists pick where to offer their work by the feel of a place.";
      body = (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-label font-semibold text-fg">Name of the place</span>
            <Input autoFocus value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="Mango Corner Café" className="h-12 text-body" />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of place">
            {VENUE_TYPES.map(t => <Chip key={t} selected={type === t} onClick={() => setType(type === t ? "" : t)}>{t}</Chip>)}
          </div>
        </>
      );
      break;
    case "where":
      q = "Where is it?"; hint = "Artists nearby see your place first.";
      body = (
        <PlacesAutocomplete value={where} placeholder="Search the address"
          onChange={(r, raw) => { setWhere(r?.name || raw); setCoords(r ? { lat: r.lat, lng: r.lng } : null); }} />
      );
      break;
    case "photos":
      q = "Show artists your walls"; hint = "A phone photo is perfect. It's the first thing artists ask for.";
      body = (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(src => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-control border-hair border-line bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setPhotos(p => p.filter(x => x !== src))}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
                <X size={13} aria-hidden />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className={cn("flex aspect-square flex-col items-center justify-center gap-1.5 rounded-control border-hair border-dashed border-line-strong font-ui text-body-sm font-semibold text-fg-3 transition-colors hover:border-ink hover:text-fg", uploading && "opacity-60")}>
              <ImagePlus size={22} aria-hidden /> {uploading ? "Uploading…" : photos.length ? "Add more" : "Add photos"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => addPhotos(e.target.files)} />
        </div>
      );
      break;
    case "hours":
      q = "When are you open?"; hint = "So artists know when they can come and look, and when to hang.";
      body = <Textarea autoFocus rows={3} maxLength={200} value={hours} onChange={e => setHours(e.target.value)} placeholder={"Mon–Fri 8:00–20:00\nSat–Sun 10:00–18:00"} aria-label="Opening hours" />;
      break;
    case "done":
      q = "Your place is ready"; hint = "One last thing: tell artists what you're looking for. It takes about a minute.";
      body = (
        <ul className="flex flex-col gap-2">
          {[
            [!!(name.trim() && type), name.trim() ? `${name.trim()}${type ? `, ${type.toLowerCase()}` : ""}` : "Name and kind of place"],
            [!!where.trim(), where.trim() || "Where it is"],
            [photos.length > 0, photos.length ? `${photos.length} ${photos.length === 1 ? "photo" : "photos"} of the space` : "Photos of the space"],
            [!!hours.trim(), "Opening hours"],
          ].map(([ok, label], i) => (
            <li key={i} className="flex items-center gap-3 font-ui text-body-sm">
              <span aria-hidden className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-pill border-outline", ok ? "border-ink bg-mango text-on-mango" : "border-line-strong text-transparent")}>
                <Check size={13} strokeWidth={3} />
              </span>
              <span className={cn("truncate", ok ? "text-fg" : "text-fg-3")}>{label as string}{!ok && <span className="text-fg-3"> · add it any time</span>}</span>
            </li>
          ))}
        </ul>
      );
      break;
  }

  const last = step === "done";
  const footer = last ? (
    <>
      <Button variant="ghost" className="mr-auto" onClick={onBrowse}>See works first</Button>
      <Button variant="primary" onClick={onPostWalls}>Post your walls <ArrowRight size={15} aria-hidden /></Button>
    </>
  ) : (
    <>
      <Button variant="ghost" className="mr-auto" onClick={back} disabled={at === 0}><ArrowLeft size={15} aria-hidden /> Back</Button>
      <Button variant="ghost" onClick={skip}>{step === "photos" ? "I'll add them later" : "Skip"}</Button>
      <Button variant="primary" onClick={next} disabled={saving || uploading}>{saving ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} size="md" title="Tell local artists about your walls" footer={footer}>
      <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); if (!last) next(); }}>
        <div className="flex flex-col gap-2">
          <span className="font-ui text-caption font-semibold text-fg-3">{last ? "All done" : `Step ${at + 1} of ${STEPS.length - 1}`}</span>
          <div className="flex gap-1" aria-hidden>
            {STEPS.slice(0, -1).map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-pill", i < at ? "bg-ink" : i === at ? "bg-mango" : "bg-line")} />)}
          </div>
        </div>
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-h2 leading-tight text-fg">{q}</h2>
          {hint && <p className="font-ui text-body-sm text-fg-2">{hint}</p>}
        </div>
        <div key={step} className="flex flex-col gap-3">{body}</div>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
