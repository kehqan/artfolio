"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Edit2, Copy, Trash2, ChevronLeft, ChevronRight,
  X, ImageIcon, Shield, ExternalLink, Hash, Check, Maximize2, ChevronDown,
  Link2, MapPin,
} from "lucide-react";
import {
  Badge, Button, ButtonLink, Card, EmptyState, Eyebrow, Heading, Modal, Skeleton, Tag, cn,
} from "@/components/ui";
import { STAGES, STAGE_MAP, toStageKey, formatPrice } from "@/lib/artwork-stage";
import { isSold } from "@/lib/places";

const ART_TYPE_LABEL: Record<string, string> = {
  physical: "Physical",
  digital: "Digital",
  print: "Print / edition",
  mixed: "Mixed media",
};

const AUTH_CFG: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  original:        { label: "Original work",   tone: "ok" },
  limited_edition: { label: "Limited edition", tone: "warn" },
  reproduction:    { label: "Reproduction",    tone: "neutral" },
  pending:         { label: "Not yet set",     tone: "neutral" },
};

const SALE_LABELS: Record<string, string> = {
  direct:           "Direct purchase",
  inquiry:          "Inquiry only",
  price_on_request: "Price on request",
  auction:          "Auction",
  not_for_sale:     "Not for sale",
};

// ── Label / value row ──────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b-hair border-line py-2.5 last:border-b-0">
      <dt className="shrink-0 font-ui text-label text-fg-3">{label}</dt>
      <dd className={cn("text-right font-ui text-body-sm font-medium text-fg", mono && "tabular-nums")}>{value}</dd>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────
function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-3 border-b-hair border-line px-5 py-3">
        <Heading level={2} size="h3">{title}</Heading>
        {right}
      </div>
      <div className="px-5 py-2">{children}</div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [artwork,    setArtwork]    = useState<any>(null);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lightbox,   setLightbox]   = useState<number | null>(null);
  const [activeImg,  setActiveImg]  = useState(0);
  const [stageOpen,  setStageOpen]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from("artworks").select("*").eq("id", id).single();
    setArtwork(data);

    // Load linked moodboards if any
    if (data?.linked_moodboard_ids?.length) {
      const { data: mb } = await sb
        .from("moodboards")
        .select("id,provider,url,title,description,thumbnail_url,og_image,tags")
        .in("id", data.linked_moodboard_ids);
      setMoodboards(mb || []);
    }
    setLoading(false);
  }

  async function moveToStage(status: string) {
    const sb = createClient();
    await sb.from("artworks").update({ status }).eq("id", id);
    setArtwork((p: any) => ({ ...p, status }));
    setStageOpen(false);
  }

  async function handleDelete() {
    const sb = createClient();
    await sb.from("artworks").delete().eq("id", id);
    router.push("/dashboard/artworks");
  }

  async function handleDuplicate() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !artwork) return;
    const { id: _id, created_at, updated_at, ...rest } = artwork;
    const { data } = await sb.from("artworks").insert({ ...rest, user_id: user.id, title: `${artwork.title} (copy)`, status: "concept" }).select().single();
    if (data) router.push(`/dashboard/artworks/${data.id}`);
  }

  const images: string[] = Array.isArray(artwork?.images) ? artwork.images.filter(Boolean) : [];

  // Lightbox keyboard controls
  const onKey = useCallback((e: KeyboardEvent) => {
    if (lightbox === null) return;
    if (e.key === "Escape") setLightbox(null);
    if (e.key === "ArrowLeft") setLightbox(l => Math.max(0, (l ?? 0) - 1));
    if (e.key === "ArrowRight") setLightbox(l => Math.min(images.length - 1, (l ?? 0) + 1));
  }, [lightbox, images.length]);
  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading artwork">
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    </div>
  );

  if (!artwork) return (
    <EmptyState
      icon={<ImageIcon size={22} aria-hidden />}
      title="Artwork not found"
      description="It may have been deleted, or the link is wrong."
      action={<ButtonLink href="/dashboard/artworks" size="sm"><ArrowLeft size={15} aria-hidden /> Back to artworks</ButtonLink>}
    />
  );

  const sk        = toStageKey(artwork.status);
  const stage     = STAGE_MAP[sk];
  const typeLabel = ART_TYPE_LABEL[artwork.art_type] || ART_TYPE_LABEL.physical;
  const authCfg   = AUTH_CFG[artwork.authentication_status || "pending"] || AUTH_CFG.pending;
  const saleLabel = artwork.sale_method ? SALE_LABELS[artwork.sale_method] : null;
  const dims      = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean).join(" × ");
  const hasDims   = !!dims;
  const isDigital = artwork.art_type === "digital" || artwork.art_type === "mixed";
  const price     = formatPrice(artwork.price, artwork.currency);
  const meta      = [artwork.medium, hasDims ? `${dims} cm` : null, artwork.year].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6 font-ui">

      {/* ── Lightbox ── */}
      {lightbox !== null && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${artwork.title}, image ${lightbox + 1} of ${images.length}`}
          className="fixed inset-0 z-modal grid place-items-center bg-inverse"
          onClick={() => setLightbox(null)}
        >
          <button type="button" aria-label="Close" onClick={e => { e.stopPropagation(); setLightbox(null); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-control text-on-inverse hover:bg-n-700">
            <X size={20} aria-hidden />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={e => { e.stopPropagation(); setLightbox(l => Math.max(0, (l ?? 0) - 1)); }}
                className="absolute left-4 grid h-10 w-10 place-items-center rounded-control text-on-inverse hover:bg-n-700">
                <ChevronLeft size={22} aria-hidden />
              </button>
              <button type="button" aria-label="Next image" onClick={e => { e.stopPropagation(); setLightbox(l => Math.min(images.length - 1, (l ?? 0) + 1)); }}
                className="absolute right-4 grid h-10 w-10 place-items-center rounded-control text-on-inverse hover:bg-n-700">
                <ChevronRight size={22} aria-hidden />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[lightbox]} alt={artwork.title} className="max-h-[88vh] max-w-[90vw] object-contain" onClick={e => e.stopPropagation()} />
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 font-ui text-label tabular-nums text-n-400">
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/dashboard/artworks" aria-label="Back to artworks"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={stage.tone} dot>{stage.label}</Badge>
              <Tag>{typeLabel}</Tag>
            </div>
            <Heading level={1} className="break-words">{artwork.title}</Heading>
            {meta && <p className="font-ui text-body text-fg-2">{meta}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage changer */}
          <div className="relative">
            <Button aria-haspopup="menu" aria-expanded={stageOpen} onClick={() => setStageOpen(p => !p)}>
              Stage: {stage.label} <ChevronDown size={15} aria-hidden className={cn("transition-transform duration-fast", stageOpen && "rotate-180")} />
            </Button>
            {stageOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-dropdown min-w-[180px] overflow-hidden rounded-control border-outline border-ink bg-surface p-1 shadow-hard-3 animate-drop-in">
                {STAGES.map(s => (
                  <button key={s.key} type="button" role="menuitemradio" aria-checked={sk === s.key} onClick={() => moveToStage(s.key)}
                    className={cn("flex w-full items-center gap-2.5 rounded-chip px-3 py-2 text-left font-ui text-body-sm text-fg hover:bg-sunken", sk === s.key && "font-semibold")}>
                    <Badge tone={s.tone} dot className="pointer-events-none">{s.label}</Badge>
                    {sk === s.key && <Check size={15} aria-hidden className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isSold(artwork) && (
            <ButtonLink href={`/dashboard/looking?work=${id}`} variant="primary">
              <MapPin size={15} aria-hidden /> Find a place for it
            </ButtonLink>
          )}
          <ButtonLink href={`/dashboard/artworks/${id}/edit`} variant={isSold(artwork) ? "primary" : "secondary"}>
            <Edit2 size={15} aria-hidden /> Edit
          </ButtonLink>
          <Button variant="secondary" aria-label="Duplicate" title="Duplicate" onClick={handleDuplicate} size="icon">
            <Copy size={16} aria-hidden />
          </Button>
          <Button variant="danger" aria-label="Delete" title="Delete" onClick={() => setConfirmDel(true)} size="icon">
            <Trash2 size={16} aria-hidden />
          </Button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

        {/* ════ LEFT: the work ════ */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-card border-hair border-line bg-surface">
            {images[activeImg] ? (
              <button type="button" onClick={() => setLightbox(activeImg)} aria-label="View full size"
                className="group relative block w-full cursor-zoom-in bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[activeImg]} alt={artwork.title} className="mx-auto max-h-[72vh] w-full object-contain" />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 font-ui text-caption font-semibold text-fg opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 size={13} aria-hidden /> View full size
                </span>
              </button>
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center bg-sunken text-n-400">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon size={40} aria-hidden />
                  <Link href={`/dashboard/artworks/${id}/edit`} className="font-ui text-label font-semibold text-fg-2 underline-offset-2 hover:text-fg hover:underline">
                    Add photos
                  </Link>
                </div>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Images">
              {images.map((img, i) => (
                <button key={i} type="button" role="listitem" onClick={() => setActiveImg(i)} aria-label={`Show image ${i + 1}`} aria-current={i === activeImg}
                  className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-chip border-outline transition-colors",
                    i === activeImg ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {artwork.description && (
            <div className="flex flex-col gap-2 pt-2">
              <Eyebrow>About this work</Eyebrow>
              <p className="max-w-[68ch] whitespace-pre-line font-ui text-body text-fg-2">{artwork.description}</p>
            </div>
          )}

          {/* ── Moodboards: the story behind the work ── */}
          {moodboards.length > 0 && (
            <Section
              title="Story behind this work"
              right={<Link href={`/dashboard/artworks/${id}/edit`} className="font-ui text-label font-semibold text-fg-3 hover:text-fg">Manage</Link>}
            >
              <div className="flex flex-col gap-2 py-2">
                {moodboards.map(mb => {
                  const thumb = mb.thumbnail_url || mb.og_image;
                  return (
                    <a key={mb.id} href={mb.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-control border-hair border-line p-2.5 transition-colors hover:border-ink">
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-chip bg-sunken text-fg-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Link2 size={18} aria-hidden />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{mb.title}</span>
                        {mb.description && <span className="truncate font-ui text-caption text-fg-3">{mb.description}</span>}
                        <span className="font-ui text-caption capitalize text-fg-3">{mb.provider}</span>
                      </span>
                      <ExternalLink size={14} aria-hidden className="shrink-0 text-fg-3" />
                    </a>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* ════ RIGHT: details ════ */}
        <div className="flex flex-col gap-4">

          {/* Price */}
          <Card padding="lg" className="flex flex-col gap-1">
            <Eyebrow>Price</Eyebrow>
            {price
              ? <span className="font-display text-h1 tabular-nums leading-none text-fg">{price}</span>
              : <span className="font-ui text-body text-fg-3">No price yet</span>}
            {saleLabel && <span className="pt-1 font-ui text-label text-fg-2">{saleLabel}</span>}
          </Card>

          {/* Passport */}
          <Link href={`/dashboard/artworks/${id}/passport`}
            className="group flex items-center gap-3.5 rounded-card border-hair border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-control", artwork.certificate_id ? "bg-ok-well text-ok" : "bg-mango-soft text-fg")}>
              <Shield size={19} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-ui text-body-sm font-semibold text-fg">
                {artwork.certificate_id ? "Digital passport" : "Create a digital passport"}
              </span>
              <span className="truncate font-ui text-caption text-fg-3">
                {artwork.certificate_id ? `Certificate ${artwork.certificate_id}` : "Authentication, provenance and certificate"}
              </span>
            </span>
            <ChevronRight size={17} aria-hidden className="shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Details */}
          <Section title="Details">
            <dl>
              {artwork.year && <InfoRow label="Year" value={artwork.year} mono />}
              {artwork.medium && <InfoRow label="Medium" value={artwork.medium} />}
              {hasDims && <InfoRow label="Dimensions" value={`${dims} cm`} mono />}
              {artwork.framed !== null && artwork.framed !== undefined && (
                <InfoRow label="Framed" value={artwork.framed ? "Yes" : "No"} />
              )}
              <InfoRow label="Authenticity" value={<Badge tone={authCfg.tone}>{authCfg.label}</Badge>} />
              {artwork.edition_code && (
                <InfoRow label="Edition" value={
                  <span className="inline-flex items-center gap-1 rounded-chip bg-sunken px-2 py-0.5 font-code text-caption text-fg">
                    <Hash size={12} aria-hidden /> {artwork.edition_code}
                  </span>
                } />
              )}
              {artwork.edition_total && !artwork.edition_code && (
                <InfoRow label="Edition" value={`${artwork.edition_number ? `${artwork.edition_number} of ` : ""}${artwork.edition_total}`} mono />
              )}
              {artwork.venue_location && <InfoRow label="Location" value={artwork.venue_location} />}
            </dl>
          </Section>

          {/* Digital file */}
          {isDigital && (artwork.file_format || artwork.resolution || artwork.digital_file_url) && (
            <Section title="Digital file">
              <dl>
                {artwork.file_format && <InfoRow label="Format" value={artwork.file_format} />}
                {artwork.resolution && <InfoRow label="Resolution" value={artwork.resolution} mono />}
                {artwork.digital_file_url && (
                  <InfoRow label="File" value={
                    <a href={artwork.digital_file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-info underline-offset-2 hover:underline">
                      Open file <ExternalLink size={13} aria-hidden />
                    </a>
                  } />
                )}
              </dl>
            </Section>
          )}

          {/* Internal (only the artist sees this) */}
          {(artwork.materials_cost || artwork.time_spent || artwork.notes) && (
            <Section title="Private notes" right={<span className="font-ui text-caption text-fg-3">Only you see this</span>}>
              <dl>
                {artwork.materials_cost && <InfoRow label="Materials cost" value={formatPrice(artwork.materials_cost, artwork.currency)} mono />}
                {artwork.time_spent && <InfoRow label="Time spent" value={`${artwork.time_spent} h`} mono />}
                {artwork.price && artwork.materials_cost && (
                  <InfoRow label="Est. profit" value={
                    <span className="font-semibold text-ok">{formatPrice(Number(artwork.price) - Number(artwork.materials_cost), artwork.currency)}</span>
                  } mono />
                )}
              </dl>
              {artwork.notes && (
                <p className="whitespace-pre-line border-t-hair border-line py-3 font-ui text-body-sm text-fg-2">{artwork.notes}</p>
              )}
            </Section>
          )}
        </div>
      </div>

      <Modal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Delete this artwork?"
        description={`"${artwork.title}" and its details will be removed for good. This can't be undone.`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete artwork</Button>
          </>
        }
      />
    </div>
  );
}
