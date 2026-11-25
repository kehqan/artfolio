"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRightLeft, BadgeDollarSign, Gift, Landmark, PenTool, Printer, Repeat, Scale, ShieldCheck, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Badge, Button, ButtonLink, EmptyState, Eyebrow, Heading, Skeleton } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";
import { Mat } from "@/components/public/PublicChrome";
import { QrCode } from "@/components/labels/QrCode";

type Artist = { id: string; full_name: string; username?: string; location?: string; avatar_url?: string };
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; status: string; images?: string[];
  width_cm?: number; height_cm?: number; depth_cm?: number;
  framed?: boolean; editions?: number;
  certificate_id?: string; authentication_status?: string;
  authenticated_by?: string; authentication_date?: string;
  authentication_notes?: string;
  created_at: string; user_id: string;
  artist?: Artist;
};
type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string; notes?: string;
};
type Exhibition = { id: string; title: string; venue?: string; gallery_name?: string; start_date?: string; end_date?: string };

// Same vocabulary and icons as the dashboard passport
const EVENTS: Record<string, { label: string; icon: LucideIcon }> = {
  created: { label: "Created", icon: PenTool },
  sold: { label: "Sold", icon: BadgeDollarSign },
  transferred: { label: "Transferred", icon: ArrowRightLeft },
  exhibited: { label: "Exhibited", icon: Landmark },
  restored: { label: "Restored", icon: Wrench },
  appraised: { label: "Appraised", icon: Scale },
  donated: { label: "Donated", icon: Gift },
  loaned: { label: "Loaned", icon: Repeat },
};
const AUTH: Record<string, { label: string; tone: BadgeTone }> = {
  original: { label: "Original work", tone: "ok" },
  limited_edition: { label: "Limited edition", tone: "warn" },
  reproduction: { label: "Reproduction", tone: "neutral" },
  pending: { label: "Not yet authenticated", tone: "neutral" },
};

function fmt(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{label}</dt>
      <dd className="font-ui text-body text-fg">{children}</dd>
    </div>
  );
}

export default function ArtworkPassportPage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!artworkId) return;
    setQrUrl(window.location.origin + window.location.pathname);
    fetch(`/api/artworks/${artworkId}/passport`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        const { artist: ar, ...aw } = data.artwork;
        setArtwork(aw);
        setArtist(ar ?? null);
        setProvenance(data.provenance || []);
        setExhibitions(data.exhibitions || []);
        setLoading(false);
      })
      .catch(() => { setError("We couldn't load this passport. Check your connection and try again."); setLoading(false); });
  }, [artworkId]);

  const header = (
    <header className="border-b-hair border-line bg-surface print:hidden">
      <div className="mx-auto flex h-header max-w-[920px] items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        {artwork && (
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} aria-hidden /> Print
          </Button>
        )}
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        {header}
        <div className="mx-auto flex max-w-[920px] flex-col gap-6 px-4 py-10 sm:px-6" aria-busy>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="aspect-[4/3] w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-page">
        {header}
        <div className="mx-auto max-w-[920px] px-4 py-20 sm:px-6">
          <EmptyState
            title="Passport not found"
            description="This link doesn't match an artwork on Artomango. If you scanned a label, ask the artist or gallery for a fresh link."
            action={<ButtonLink href="/explore" variant="secondary">Explore Artomango</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  const auth = AUTH[artwork.authentication_status || "pending"] || AUTH.pending;
  const isAuthenticated = !!artwork.authentication_status && artwork.authentication_status !== "pending";
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);
  const ownerEntry = [...provenance].reverse().find(p => p.owner_name && !p.is_anonymous);
  const lastOwnerChange = [...provenance].reverse().find(p => ["sold", "transferred", "donated"].includes(p.event_type));
  const owner = lastOwnerChange?.is_anonymous ? "Private collection" : ownerEntry?.owner_name || artist?.full_name || "";
  const images = (artwork.images || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-page text-fg print:bg-surface">
      {header}

      <main className="mx-auto max-w-[920px] px-4 py-8 sm:px-6 lg:py-12 print:p-0">
        <article className="overflow-hidden rounded-card border-hair border-line bg-surface print:rounded-none">
          {/* ── Title block ── */}
          <div className="flex flex-col gap-5 border-b-hair border-line p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div className="flex min-w-0 flex-col gap-3">
              <Eyebrow>Artwork passport · Certificate of authenticity</Eyebrow>
              <Heading level={1} size="h1">{artwork.title}</Heading>
              {artist && (
                <Link href={artist.username ? `/${artist.username}` : "/explore"} className="inline-flex items-center gap-2.5 self-start rounded-pill pr-2 hover:bg-sunken">
                  <Avatar name={artist.full_name || "Artist"} src={artist.avatar_url} size="sm" />
                  <span className="font-ui text-body font-semibold text-fg">{artist.full_name}</span>
                  {artist.location && <span className="font-ui text-body-sm text-fg-3">{artist.location}</span>}
                </Link>
              )}
            </div>
            <Badge tone={auth.tone} className="self-start">
              {isAuthenticated && <ShieldCheck size={13} aria-hidden />} {auth.label}
            </Badge>
          </div>

          {/* ── Image ── */}
          {images.length > 0 && (
            <div className="border-b-hair border-line">
              <Mat src={images[0]} alt={artwork.title} className="aspect-[4/3] w-full sm:aspect-[16/10]" pad="p-6" />
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t-hair border-line p-3 print:hidden">
                  {images.slice(1).map((src, i) => (
                    <Mat key={src + i} src={src} alt={`${artwork.title}, view ${i + 2}`} className="h-20 w-20 shrink-0 rounded-control" pad="p-1" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Facts ── */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b-hair border-line p-6 sm:grid-cols-4 sm:p-8">
            <Fact label="Year">{artwork.year || "Not given"}</Fact>
            <Fact label="Medium">{artwork.medium || "Not given"}</Fact>
            <Fact label="Size">{dims.length ? `${dims.join(" × ")} cm` : "Not given"}</Fact>
            {artwork.editions ? <Fact label="Edition">{artwork.editions}</Fact> : <Fact label="Framed">{artwork.framed ? "Yes" : "No"}</Fact>}
            {owner && <Fact label="Current owner">{owner}</Fact>}
            <Fact label="Records">{provenance.length} {provenance.length === 1 ? "entry" : "entries"}</Fact>
          </dl>

          {artwork.description && (
            <div className="border-b-hair border-line p-6 sm:p-8">
              <p className="max-w-[65ch] whitespace-pre-line font-ui text-body text-fg-2">{artwork.description}</p>
            </div>
          )}

          {/* ── Provenance ── */}
          <section className="border-b-hair border-line p-6 sm:p-8" aria-labelledby="prov-h">
            <Heading level={2} size="h3" id="prov-h" className="mb-5">Provenance</Heading>
            {provenance.length === 0 ? (
              <p className="font-ui text-body-sm text-fg-3">No history recorded yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
                {provenance.map(p => {
                  const ev = EVENTS[p.event_type] || { label: p.event_type, icon: PenTool };
                  const Icon = ev.icon;
                  const who = p.is_anonymous ? "Private collection" : p.owner_name;
                  return (
                    <li key={p.id} className="relative flex gap-4">
                      <span className="z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-pill border-hair border-line bg-surface text-fg-2">
                        <Icon size={15} aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                        <span className="font-ui text-body font-semibold text-fg">
                          {ev.label}{who ? <span className="font-normal text-fg-2"> · {who}</span> : null}
                        </span>
                        <span className="font-ui text-body-sm text-fg-3">{[fmt(p.date), p.location].filter(Boolean).join(" · ") || "Date not recorded"}</span>
                        {p.notes && <p className="font-ui text-body-sm text-fg-2">{p.notes}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ── Exhibitions ── */}
          {exhibitions.length > 0 && (
            <section className="border-b-hair border-line p-6 sm:p-8" aria-labelledby="ex-h">
              <Heading level={2} size="h3" id="ex-h" className="mb-4">Exhibited</Heading>
              <ul className="flex flex-col gap-3">
                {exhibitions.map(ex => (
                  <li key={ex.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <span className="font-ui text-body font-semibold text-fg">
                      {ex.title}{(ex.gallery_name || ex.venue) && <span className="font-normal text-fg-2"> · {ex.gallery_name || ex.venue}</span>}
                    </span>
                    <span className="font-ui text-body-sm tabular-nums text-fg-3">{[fmt(ex.start_date), fmt(ex.end_date)].filter(Boolean).join(" – ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Certificate ── */}
          <div className="grid gap-6 bg-page p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8 print:bg-surface">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">Certificate ID</span>
                <code className="self-start rounded-control bg-sunken px-3 py-1.5 font-code text-body-sm text-fg">{artwork.certificate_id || "Not issued yet"}</code>
              </div>
              {artwork.authenticated_by ? (
                <p className="font-ui text-body-sm text-fg-2">
                  Authenticated by <span className="font-semibold text-fg">{artwork.authenticated_by}</span>
                  {artwork.authentication_date && <> on {fmt(artwork.authentication_date)}</>}.
                </p>
              ) : (
                <p className="font-ui text-body-sm text-fg-3">No one has authenticated this work yet.</p>
              )}
              {artwork.authentication_notes && <p className="max-w-[60ch] font-ui text-body-sm text-fg-2">{artwork.authentication_notes}</p>}
            </div>
            {qrUrl && (
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <div className="h-24 w-24 overflow-hidden rounded-control border-hair border-line bg-surface">
                  <QrCode value={qrUrl} title="QR code linking to this passport" margin={2} className="block h-full w-full" />
                </div>
                <span className="font-ui text-caption text-fg-3">Scan to check this passport</span>
              </div>
            )}
          </div>
        </article>

        <p className="mt-6 text-center font-ui text-caption text-fg-3 print:hidden">
          Issued on Artomango. The record is kept by the artist.
        </p>
      </main>
    </div>
  );
}
