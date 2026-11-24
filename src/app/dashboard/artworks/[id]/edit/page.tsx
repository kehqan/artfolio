"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ChevronRight, Shield } from "lucide-react";
import { Button, ButtonLink, Eyebrow, Heading, Skeleton } from "@/components/ui";
import {
  ART_TYPES, ArtTypeSwitch, ArtworkFields, Dropzone, FormSection, ImageThumb, MAX_IMAGES, UploadProgress,
  type ArtType,
} from "../../_form/parts";

function genEditionCode(num: string, total: string) {
  return `AM-${String(num).padStart(3,"0")}/${String(total).padStart(3,"0")}`;
}

// ══════════════════════════════════════════════════════════════════
export default function EditArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [artType, setArtType] = useState<ArtType>("physical");

  const [form, setForm] = useState({
    title: "", year: "", medium: "", description: "", notes: "",
    width_cm: "", height_cm: "", depth_cm: "", framed: false,
    file_format: "", resolution: "", digital_file_url: "",
    edition_total: "", edition_number: "", edition_code: "",
    authentication_status: "original",
    price: "", currency: "EUR", status: "concept", sale_method: "",
    venue_location: "", location_name: "",
    materials_cost: "", time_spent: "",
  });

  const [venueCoords,    setVenueCoords]    = useState<{ lat: number; lng: number } | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles,       setNewFiles]       = useState<File[]>([]);
  const [newPreviews,    setNewPreviews]     = useState<string[]>([]);
  const [moodboards,     setMoodboards]     = useState<any[]>([]);
  const [linkedMb,       setLinkedMb]       = useState<string[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [uploadPct,      setUploadPct]      = useState(0);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-generate edition code
  useEffect(() => {
    if (form.edition_number && form.edition_total) {
      setForm(p => ({ ...p, edition_code: genEditionCode(p.edition_number, p.edition_total) }));
    }
  }, [form.edition_number, form.edition_total]);

  // Load artwork + moodboards
  useEffect(() => {
    if (!id) return;
    const sb = createClient();

    sb.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) { setLoading(false); return; }

      setArtType((data.art_type as ArtType) || "physical");
      setForm({
        title:                 data.title                || "",
        year:                  data.year                 ? String(data.year)                 : "",
        medium:                data.medium               || "",
        description:           data.description          || "",
        notes:                 data.notes                || "",
        width_cm:              data.width_cm             ? String(data.width_cm)             : "",
        height_cm:             data.height_cm            ? String(data.height_cm)            : "",
        depth_cm:              data.depth_cm             ? String(data.depth_cm)             : "",
        framed:                data.framed               || false,
        file_format:           data.file_format          || "",
        resolution:            data.resolution           || "",
        digital_file_url:      data.digital_file_url     || "",
        edition_total:         data.edition_total        ? String(data.edition_total)        : "",
        edition_number:        data.edition_number       ? String(data.edition_number)       : "",
        edition_code:          data.edition_code         || "",
        authentication_status: data.authentication_status || "original",
        price:                 data.price                ? String(data.price)                : "",
        currency:              data.currency             || "EUR",
        status:                data.status               || "concept",
        sale_method:           data.sale_method          || "",
        venue_location:        data.venue_location       || "",
        location_name:         data.location_name        || data.venue_location || "",
        materials_cost:        data.materials_cost       ? String(data.materials_cost)       : "",
        time_spent:            data.time_spent           ? String(data.time_spent)           : "",
      });

      if (data.location_lat && data.location_lng) {
        setVenueCoords({ lat: data.location_lat, lng: data.location_lng });
      }
      setExistingImages(Array.isArray(data.images) ? data.images.filter(Boolean) : []);
      if (Array.isArray(data.linked_moodboard_ids)) setLinkedMb(data.linked_moodboard_ids);
      setLoading(false);
    });

    // Load user's moodboards
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: mb } = await sb.from("moodboards").select("id,title,provider,thumbnail_url,og_image,url").eq("user_id", user.id).order("created_at", { ascending: false });
      setMoodboards(mb || []);
    });
  }, [id]);

  // Image helpers
  function addImages(files: FileList | null) {
    if (!files) return;
    const max = 8 - existingImages.length - newFiles.length;
    const list = Array.from(files).slice(0, max);
    setNewFiles(p => [...p, ...list]);
    list.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setNewPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }
  function removeExisting(i: number) { setExistingImages(p => p.filter((_: string, idx: number) => idx !== i)); }
  function removeNew(i: number) { setNewFiles(p => p.filter((_: File, idx: number) => idx !== i)); setNewPreviews(p => p.filter((_: string, idx: number) => idx !== i)); }
  function toggleMb(mbId: string) { setLinkedMb(p => p.includes(mbId) ? p.filter(x => x !== mbId) : [...p, mbId]); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Upload new images using the avatars bucket (same as new page)
    const uploadedUrls: string[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext  = file.name.split(".").pop();
      const path = `artworks/${user.id}/${Date.now()}-${i}.${ext}`;
      const { data } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
      if (data) {
        const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
      setUploadPct(Math.round(((i + 1) / newFiles.length) * 80));
    }

    const numOrNull = (v: string) => v.trim() === "" || isNaN(Number(v)) ? null : Number(v);

    await sb.from("artworks").update({
      art_type:              artType,
      title:                 form.title,
      year:                  numOrNull(form.year),
      medium:                form.medium               || null,
      description:           form.description          || null,
      notes:                 form.notes                || null,
      width_cm:              numOrNull(form.width_cm),
      height_cm:             numOrNull(form.height_cm),
      depth_cm:              numOrNull(form.depth_cm),
      framed:                form.framed,
      file_format:           form.file_format          || null,
      resolution:            form.resolution           || null,
      digital_file_url:      form.digital_file_url     || null,
      edition_total:         numOrNull(form.edition_total),
      edition_number:        numOrNull(form.edition_number),
      edition_code:          form.edition_code         || null,
      authentication_status: form.authentication_status || "original",
      price:                 numOrNull(form.price),
      currency:              form.currency,
      status:                form.status,
      sale_method:           form.sale_method          || null,
      venue_location:        form.venue_location       || form.location_name || null,
      location_name:         form.location_name        || form.venue_location || null,
      location_lat:          venueCoords?.lat          ?? null,
      location_lng:          venueCoords?.lng          ?? null,
      materials_cost:        numOrNull(form.materials_cost),
      time_spent:            numOrNull(form.time_spent),
      linked_moodboard_ids:  linkedMb.length > 0 ? linkedMb : null,
      images:                [...existingImages, ...uploadedUrls],
      updated_at:            new Date().toISOString(),
    }).eq("id", id);

    setUploadPct(100);
    setSaving(false);
    router.push(`/dashboard/artworks/${id}`);
  }

  const atCfg    = ART_TYPES.find(t => t.key === artType) || ART_TYPES[0];
  const isDigital = artType === "digital" || artType === "mixed";
  const isPrint   = artType === "print";
  const totalImgs = existingImages.length + newFiles.length;

  const patch = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));
  const canSave = !saving && !!form.title.trim();
  const saveLabel = saving ? <><Spinner /> {uploadPct > 0 ? `${uploadPct}%` : "Saving…"}</> : "Save changes";

  if (loading) return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={`/dashboard/artworks/${id}`} aria-label="Back to artwork"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Eyebrow>Edit artwork · {atCfg.label}</Eyebrow>
            <Heading level={1} className="break-words">{form.title.trim() || "Untitled"}</Heading>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <ButtonLink href={`/dashboard/artworks/${id}`} variant="ghost" className="flex-1 sm:flex-none">Cancel</ButtonLink>
          <Button type="submit" variant="primary" disabled={!canSave} className="flex-1 sm:flex-none">{saveLabel}</Button>
        </div>
      </div>

      {saving && uploadPct > 0 && <UploadProgress pct={uploadPct} />}

      <div className="flex flex-col gap-2">
        <span className="font-ui text-label font-semibold text-fg">Kind of work</span>
        <ArtTypeSwitch value={artType} onChange={setArtType} />
      </div>

      <ArtworkFields
        artType={artType}
        form={form}
        patch={patch}
        sf={sf}
        venueCoords={venueCoords}
        setVenueCoords={setVenueCoords}
        moodboards={moodboards}
        linkedMb={linkedMb}
        toggleMb={toggleMb}
        editionHint="Change the number or the run to make a new code."
        images={
          <FormSection title="Images" description="The first image is the cover. New ones upload when you save."
            right={<span className="font-ui text-label tabular-nums text-fg-3">{totalImgs}/{MAX_IMAGES}</span>}>
            {totalImgs > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((src, i) => (
                  <ImageThumb key={src} src={src} main={i === 0} onRemove={() => removeExisting(i)} />
                ))}
                {newPreviews.map((src, i) => (
                  <ImageThumb key={`new-${i}`} src={src} main={existingImages.length === 0 && i === 0} pending={!(existingImages.length === 0 && i === 0)} onRemove={() => removeNew(i)} />
                ))}
              </div>
            )}
            {totalImgs < MAX_IMAGES && <Dropzone onFiles={addImages} remaining={MAX_IMAGES - totalImgs} />}
          </FormSection>
        }
        asideExtra={<>
          <Link href={`/dashboard/artworks/${id}/passport`}
            className="group flex items-center gap-3 rounded-card border-hair border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-sunken text-fg-2">
              <Shield size={18} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-ui text-body-sm font-semibold text-fg">Digital passport</span>
              <span className="font-ui text-caption text-fg-3">Authentication, provenance and certificate</span>
            </span>
            <ChevronRight size={17} aria-hidden className="shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Button type="submit" variant="primary" disabled={!canSave} className="w-full lg:hidden">{saveLabel}</Button>
        </>}
      />
    </form>
  );
}

function Spinner() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />;
}
