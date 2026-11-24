"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink, Eyebrow, Field, Heading, Select } from "@/components/ui";
import {
  ART_TYPES, ArtTypeCards, ArtworkFields, Dropzone, FormSection, ImageThumb, MAX_IMAGES, UploadProgress,
  type ArtType, type Moodboard,
} from "../_form/parts";

// ── Generate edition code ──────────────────────────────────────────
function genEditionCode(editionNum: string, total: string, prefix = "AM") {
  const n = String(editionNum).padStart(3, "0");
  const t = String(total).padStart(3, "0");
  return `${prefix}-${n}/${t}`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NewArtworkPage() {
  const router = useRouter();

  // ── Art type (step 1) ──
  const [artType, setArtType] = useState<ArtType | null>(null);

  // ── Core form ──
  const [form, setForm] = useState({
    title: "", year: "", medium: "", description: "", notes: "",
    // Physical
    width_cm: "", height_cm: "", depth_cm: "", framed: false,
    // Digital
    file_format: "", resolution: "", digital_file_url: "",
    // Print / Edition
    edition_total: "", edition_number: "", edition_code: "",
    // Auth
    authentication_status: "original",
    // Sales
    price: "", currency: "EUR", status: "concept", sale_method: "",
    // Location
    location: "", venue_location: "", location_name: "",
    // Business
    materials_cost: "", time_spent: "",
  });

  const [venueCoords,   setVenueCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [moodboards,    setMoodboards]    = useState<Moodboard[]>([]);
  const [linkedMb,      setLinkedMb]      = useState<string[]>([]);
  const [collections,   setCollections]   = useState<{ id: string; name: string }[]>([]);
  const [collectionId,  setCollectionId]  = useState("");
  const [saving,        setSaving]        = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-generate edition code when numbers change
  useEffect(() => {
    if (form.edition_number && form.edition_total) {
      setForm(p => ({ ...p, edition_code: genEditionCode(p.edition_number, p.edition_total) }));
    }
  }, [form.edition_number, form.edition_total]);

  // Load moodboards + collections
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: mb }, { data: cols }] = await Promise.all([
        sb.from("moodboards").select("id,title,provider,thumbnail_url,og_image,url").eq("user_id", user.id).order("created_at", { ascending: false }),
        sb.from("collections").select("id,name").eq("user_id", user.id),
      ]);
      setMoodboards(mb || []);
      setCollections(cols || []);
    });
  }, []);

  // Image handling
  function handleImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8 - imageFiles.length);
    const newPreviews = arr.map(f => URL.createObjectURL(f));
    setImageFiles(p => [...p, ...arr]);
    setImagePreviews(p => [...p, ...newPreviews]);
  }

  function removeImage(i: number) {
    setImageFiles(p => p.filter((_, idx) => idx !== i));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  }

  function toggleMoodboard(id: string) {
    setLinkedMb(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Upload images
    const uploadedUrls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const ext = file.name.split(".").pop();
      const path = `artworks/${user.id}/${Date.now()}-${i}.${ext}`;
      const { data } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
      if (data) {
        const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
      setUploadPct(Math.round(((i + 1) / imageFiles.length) * 80));
    }

    const numOrNull = (v: string) => v === "" || isNaN(Number(v)) ? null : Number(v);

    const { data, error } = await sb.from("artworks").insert({
      user_id:               user.id,
      art_type:              artType,
      title:                 form.title,
      year:                  numOrNull(form.year),
      medium:                form.medium            || null,
      description:           form.description       || null,
      notes:                 form.notes             || null,
      // Physical
      width_cm:              numOrNull(form.width_cm),
      height_cm:             numOrNull(form.height_cm),
      depth_cm:              numOrNull(form.depth_cm),
      framed:                form.framed,
      // Digital
      file_format:           form.file_format       || null,
      resolution:            form.resolution        || null,
      digital_file_url:      form.digital_file_url  || null,
      // Print
      edition_total:         numOrNull(form.edition_total),
      edition_number:        numOrNull(form.edition_number),
      edition_code:          form.edition_code      || null,
      // Auth
      authentication_status: form.authentication_status || "original",
      // Sales
      price:                 numOrNull(form.price),
      currency:              form.currency,
      status:                form.status,
      sale_method:           form.sale_method        || null,
      // Location
      venue_location:        form.venue_location     || form.location_name || null,
      location_name:         form.location_name      || form.venue_location || null,
      location_lat:          venueCoords?.lat        || null,
      location_lng:          venueCoords?.lng        || null,
      // Business
      materials_cost:        numOrNull(form.materials_cost),
      time_spent:            numOrNull(form.time_spent),
      // Linked moodboards
      linked_moodboard_ids:  linkedMb.length > 0 ? linkedMb : null,
      // Images
      images:                uploadedUrls,
      collection_id:         collectionId || null,
    }).select().single();

    if (!error && data) {
      if (collectionId) {
        try { await sb.from("collection_artworks").insert({ collection_id: collectionId, artwork_id: data.id }); } catch { /* ignore */ }
      }
      setUploadPct(100);
      router.push(`/dashboard/artworks/${data.id}`);
    } else {
      console.error(error);
      setSaving(false);
      setUploadPct(0);
    }
  }

  const atCfg = artType ? ART_TYPES.find(t => t.key === artType) : null;

  const patch = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));
  const canSave = !saving && !!form.title.trim();

  // ── STEP 1: Art type selector ─────────────────────────────────
  if (!artType) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col gap-6">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/artworks" aria-label="Back to artworks"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Eyebrow>New artwork</Eyebrow>
            <Heading level={1}>What kind of work is it?</Heading>
            <p className="font-ui text-body text-fg-2">This decides which details we ask for. You can change it later.</p>
          </div>
        </div>
        <ArtTypeCards onPick={setArtType} />
      </div>
    );
  }

  // ── STEP 2: Full form ─────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" onClick={() => setArtType(null)} aria-label="Choose a different kind of work"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <ArrowLeft size={17} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Eyebrow>New artwork · {atCfg?.label}</Eyebrow>
            <Heading level={1} className="break-words">{form.title.trim() || "Untitled"}</Heading>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <ButtonLink href="/dashboard/artworks" variant="ghost" className="flex-1 sm:flex-none">Cancel</ButtonLink>
          <Button type="submit" variant="primary" disabled={!canSave} className="flex-1 sm:flex-none">
            {saving ? <><Spinner /> Saving…</> : "Save artwork"}
          </Button>
        </div>
      </div>

      {saving && uploadPct > 0 && <UploadProgress pct={uploadPct} />}

      <ArtworkFields
        artType={artType}
        form={form}
        patch={patch}
        sf={sf}
        venueCoords={venueCoords}
        setVenueCoords={setVenueCoords}
        moodboards={moodboards}
        linkedMb={linkedMb}
        toggleMb={toggleMoodboard}
        images={
          <FormSection title="Images" description="The first image is the cover."
            right={<span className="font-ui text-label tabular-nums text-fg-3">{imagePreviews.length}/{MAX_IMAGES}</span>}>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((src, i) => (
                  <ImageThumb key={src} src={src} main={i === 0} onRemove={() => removeImage(i)} />
                ))}
              </div>
            )}
            {imagePreviews.length < MAX_IMAGES && (
              <Dropzone onFiles={handleImages} remaining={MAX_IMAGES - imagePreviews.length} />
            )}
          </FormSection>
        }
        businessExtra={collections.length > 0 && (
          <Field label="Add to collection">
            {p => (
              <Select {...p} value={collectionId} onChange={e => setCollectionId(e.target.value)}>
                <option value="">No collection</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        )}
        asideExtra={
          <Button type="submit" variant="primary" disabled={!canSave} className="w-full lg:hidden">
            {saving ? <><Spinner /> Saving…</> : "Save artwork"}
          </Button>
        }
      />
    </form>
  );
}

function Spinner() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />;
}

