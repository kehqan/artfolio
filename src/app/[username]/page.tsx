"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, FileText,
  Globe, Instagram, MapPin, MessageSquare, Star, Users,
} from "lucide-react";
import MessageModal from "@/components/MessageModal";
import {
  Badge, Button, ButtonLink, EmptyState, Eyebrow, Heading, Modal, Skeleton, Tabs, cn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, formatPrice, publicWrap, textLink } from "@/components/public/PublicChrome";

// ── Types ──────────────────────────────────────────────────────────
type Profile = {
  id: string; full_name: string; username: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  website?: string; email?: string; instagram?: string;
};
type StoreSettings = {
  store_name?: string; tagline?: string; accent_color?: string;
  banner_url?: string; show_bio?: boolean; show_collabs?: boolean;
  show_events?: boolean; layout?: string; is_active?: boolean;
};
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; price?: number; currency?: string;
  status: string; images?: string[]; sale_method?: string;
  width_cm?: number; height_cm?: number; depth_cm?: number; framed?: boolean;
  featured?: boolean;
};
type Collab = {
  id: string; title: string; type?: string; status: string;
  partner_name?: string; description?: string; deadline?: string;
};
type Exhibition = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string; cover_image?: string; description?: string;
};
type Moodboard = {
  id: string; provider: string; url: string; title: string;
  description?: string; thumbnail_url?: string; og_image?: string; tags: string[];
};
type Tab = "store" | "artworks" | "events" | "collabs" | "moodboards";
type MessageContext = { kind: "direct" } | { kind: "artwork"; aw: Artwork };

const SALE_LABEL: Record<string, string> = {
  direct: "Buy now",
  inquiry: "Inquire",
  price_on_request: "Price on request",
  auction: "Auction",
  not_for_sale: "Not for sale",
};
const PROVIDER_LABEL: Record<string, string> = {
  milanote: "Milanote", pinterest: "Pinterest", figma: "Figma", miro: "Miro", notion: "Notion",
};
const ARTWORK_FIELDS = "id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed";

function statusBadge(status?: string): { tone: BadgeTone; label: string } | null {
  const s = (status || "").toLowerCase();
  if (s === "sold") return { tone: "inverse", label: "Sold" };
  if (s === "reserved") return { tone: "warn", label: "Reserved" };
  return null;
}
function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function dims(aw: Artwork) {
  const d = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean);
  return d.length ? `${d.join(" × ")} cm` : "";
}
function webHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

// ── Artwork card ───────────────────────────────────────────────────
function ArtworkCard({ aw, onOpen }: { aw: Artwork; onOpen: () => void }) {
  const badge = statusBadge(aw.status);
  const price = aw.sale_method === "price_on_request" ? "Price on request" : formatPrice(aw.price, aw.currency);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface text-left transition-colors duration-fast hover:border-ink focus-visible:border-ink"
    >
      <Mat src={aw.images?.[0]} alt={aw.title} className="aspect-[4/5] w-full" />
      <div className="flex flex-1 flex-col gap-1 border-t-hair border-line px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-ui text-body font-semibold text-fg">{aw.title}</span>
          {aw.featured && <Star size={14} className="mt-1 shrink-0 fill-ink text-fg" aria-label="Featured" />}
        </div>
        <span className="font-ui text-body-sm text-fg-3">{[aw.year, aw.medium].filter(Boolean).join(" · ")}</span>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : <span />}
          {price && !badge && <span className="font-ui text-body-sm font-semibold tabular-nums text-fg">{price}</span>}
        </div>
      </div>
    </button>
  );
}

// ── Artwork detail ─────────────────────────────────────────────────
function ArtworkDetail({ aw, firstName, onClose, onMessage }: {
  aw: Artwork; firstName: string; onClose: () => void; onMessage: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const imgs = (aw.images || []).filter(Boolean);
  const badge = statusBadge(aw.status);
  const canBuy = !!aw.sale_method && aw.sale_method !== "not_for_sale" && !badge;
  const price = aw.sale_method === "price_on_request" ? "" : formatPrice(aw.price, aw.currency);
  const facts: [string, string][] = [
    ["Year", aw.year ? String(aw.year) : ""],
    ["Medium", aw.medium || ""],
    ["Size", dims(aw)],
    ["Framed", aw.framed ? "Yes" : ""],
    ["Sale", aw.sale_method ? SALE_LABEL[aw.sale_method] || "" : ""],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={aw.title}
      footer={
        <>
          <ButtonLink href={`/artwork/${aw.id}/passport`} variant="ghost">
            <FileText size={15} aria-hidden /> Passport
          </ButtonLink>
          <Button variant={canBuy ? "primary" : "secondary"} onClick={onMessage}>
            <MessageSquare size={15} aria-hidden />
            {canBuy ? (aw.sale_method === "direct" ? "Ask to buy" : "Ask about this work") : `Message ${firstName}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="relative">
          <Mat src={imgs[idx]} alt={aw.title} className="aspect-[4/3] w-full rounded-control" pad="p-4" />
          {imgs.length > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface shadow-hard-1">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button type="button" aria-label="Next image" onClick={() => setIdx(i => (i + 1) % imgs.length)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface shadow-hard-1">
                <ChevronRight size={16} aria-hidden />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-surface px-2.5 py-1 font-ui text-caption tabular-nums text-fg-2">
                {idx + 1} / {imgs.length}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {price && !badge ? (
            <span className="font-display text-h2 font-bold tabular-nums text-fg">{price}</span>
          ) : badge ? (
            <Badge tone={badge.tone}>{badge.label}</Badge>
          ) : <span />}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{k}</dt>
              <dd className="font-ui text-body-sm text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        {aw.description && <p className="whitespace-pre-line font-ui text-body text-fg-2">{aw.description}</p>}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [storeArtworks, setStoreArtworks] = useState<Artwork[]>([]);
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [events, setEvents] = useState<Exhibition[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("store");
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [message, setMessage] = useState<MessageContext | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (username) load(); }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const sb = createClient();
    const { data: prof } = await sb.from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url, website, email, instagram")
      .eq("username", username).single();
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setProfile(prof);

    const [{ data: ss }, { data: storeEntries }, { data: allA }, { data: co }, { data: ex }, { data: mb }, { count }] = await Promise.all([
      sb.from("store_settings").select("*").eq("user_id", prof.id).single(),
      sb.from("store_artworks").select("artwork_id, sort_order, featured").eq("user_id", prof.id).order("sort_order"),
      sb.from("artworks").select(ARTWORK_FIELDS).eq("user_id", prof.id).order("created_at", { ascending: false }),
      sb.from("collaborations").select("id, title, type, status, partner_name, description, deadline").eq("user_id", prof.id).limit(20),
      sb.from("exhibitions").select("id, title, venue, start_date, end_date, status, cover_image, description").eq("user_id", prof.id).eq("is_public", true).order("start_date", { ascending: false }).limit(20),
      sb.from("moodboards").select("id,provider,url,title,description,thumbnail_url,og_image,tags").eq("user_id", prof.id).eq("is_public", true).order("created_at", { ascending: false }),
      sb.from("followers").select("*", { count: "exact", head: true }).eq("following_id", prof.id),
    ]);

    setSettings(ss || {});
    const all: Artwork[] = allA || [];
    setAllArtworks(all);

    let store: Artwork[] = [];
    if (storeEntries?.length) {
      const featured: Record<string, boolean> = {};
      const order: Record<string, number> = {};
      storeEntries.forEach((e: any) => { featured[e.artwork_id] = !!e.featured; order[e.artwork_id] = e.sort_order ?? 0; });
      const byId = new Map(all.map(a => [a.id, a]));
      let rows = storeEntries.map((e: any) => byId.get(e.artwork_id)).filter(Boolean) as Artwork[];
      // Store works missing from the first query (shouldn't happen, but keep them)
      const missing = storeEntries.map((e: any) => e.artwork_id).filter((id: string) => !byId.has(id));
      if (missing.length) {
        const { data: extra } = await sb.from("artworks").select(ARTWORK_FIELDS).in("id", missing);
        rows = rows.concat(extra || []);
      }
      store = rows
        .map(a => ({ ...a, featured: featured[a.id] }))
        .sort((a, b) => (a.featured === b.featured ? (order[a.id] ?? 0) - (order[b.id] ?? 0) : a.featured ? -1 : 1));
    }
    setStoreArtworks(store);
    setTab(store.length ? "store" : "artworks");

    setCollabs(co || []);
    setEvents(ex || []);
    setMoodboards((mb || []).map((b: any) => ({ ...b, tags: b.tags || [] })));
    setFollowerCount(count || 0);
    setLoading(false);
  }

  function copyUrl() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className={cn(publicWrap, "flex flex-col gap-6 py-10")} aria-busy>
          <div className="flex items-center gap-5">
            <Skeleton className="h-24 w-24 rounded-card" />
            <div className="flex flex-1 flex-col gap-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-card" />)}
          </div>
        </div>
      </div>
    );
  }
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className={cn(publicWrap, "py-20")}>
          <EmptyState
            title="No one here by that name"
            description={`We couldn't find a profile at /${username}. The link may be old, or the name may have changed.`}
            action={<ButtonLink href="/explore" variant="secondary">Explore artists</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  const name = settings?.store_name || profile.full_name;
  const firstName = (profile.full_name || "them").split(" ")[0];
  const isVenue = profile.role === "gallery" || profile.role === "venue";
  const roleLabel = isVenue ? "Venue" : profile.role === "artist" ? "Artist" : profile.role ? profile.role[0].toUpperCase() + profile.role.slice(1) : "";
  const showBio = profile.bio && settings?.show_bio !== false;
  const showEvents = settings?.show_events !== false;
  const showCollabs = settings?.show_collabs !== false;

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "store" as Tab, label: "For sale", count: storeArtworks.length },
    { value: "artworks" as Tab, label: "All works", count: allArtworks.length },
    ...(showEvents ? [{ value: "events" as Tab, label: "Shows and events", count: events.length }] : []),
    ...(showCollabs && collabs.length ? [{ value: "collabs" as Tab, label: "Collabs", count: collabs.length }] : []),
    ...(moodboards.length ? [{ value: "moodboards" as Tab, label: "Moodboards", count: moodboards.length }] : []),
  ];
  const works = tab === "store" ? storeArtworks : allArtworks;

  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader action={<ButtonLink href="/register" variant="secondary">Join Artomango</ButtonLink>} />

      <main>
        {/* ── Banner ── */}
        {settings?.banner_url && (
          <div className="h-40 w-full overflow-hidden border-b-hair border-line bg-sunken sm:h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.banner_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* ── Profile head ── */}
        <section className="border-b-hair border-line bg-surface">
          <div className={cn(publicWrap, "flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between lg:py-10")}>
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-card border-hair border-line bg-mango-soft">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center font-display text-h1 font-bold text-fg">{(profile.full_name || "?")[0]}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  {roleLabel && <Eyebrow>{roleLabel}</Eyebrow>}
                  <Heading level={1} size="h1">{name}</Heading>
                  {settings?.tagline && <p className="font-ui text-body text-fg-2">{settings.tagline}</p>}
                </div>
                {showBio && <p className="max-w-[60ch] whitespace-pre-line font-ui text-body text-fg-2">{profile.bio}</p>}
                <ul className="flex flex-wrap gap-x-5 gap-y-2 font-ui text-body-sm text-fg-3">
                  {profile.location && <li className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden />{profile.location}</li>}
                  {profile.website && (
                    <li>
                      <a href={webHref(profile.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
                        <Globe size={14} aria-hidden />{profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </li>
                  )}
                  {profile.instagram && (
                    <li>
                      <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
                        <Instagram size={14} aria-hidden />@{profile.instagram.replace("@", "")}
                      </a>
                    </li>
                  )}
                  <li className="inline-flex items-center gap-1.5 tabular-nums"><Users size={14} aria-hidden />{followerCount} {followerCount === 1 ? "follower" : "followers"}</li>
                </ul>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="primary" onClick={() => setMessage({ kind: "direct" })}>
                <MessageSquare size={15} aria-hidden /> Message {firstName}
              </Button>
              <Button variant="secondary" onClick={copyUrl} aria-live="polite">
                {copied ? <><Check size={15} aria-hidden /> Link copied</> : <><Copy size={15} aria-hidden /> Share</>}
              </Button>
            </div>
          </div>
          <div className={cn(publicWrap, "overflow-x-auto pb-4")}>
            <Tabs items={tabs} value={tab} onChange={setTab} label="Profile sections" />
          </div>
        </section>

        {/* ── Content ── */}
        <section className={cn(publicWrap, "py-8 lg:py-10")}>
          {(tab === "store" || tab === "artworks") && (
            works.length === 0 ? (
              <EmptyState
                title={tab === "store" ? "Nothing for sale right now" : "No works yet"}
                description={tab === "store"
                  ? (allArtworks.length ? `${firstName} hasn't put works up for sale yet. See everything they've made under All works.` : `${firstName} hasn't added works yet.`)
                  : `${firstName} hasn't added works yet.`}
                action={tab === "store" && allArtworks.length ? <Button variant="secondary" onClick={() => setTab("artworks")}>See all works</Button> : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {works.map(aw => <ArtworkCard key={aw.id} aw={aw} onOpen={() => setSelected(aw)} />)}
              </div>
            )
          )}

          {tab === "events" && (
            events.length === 0 ? (
              <EmptyState title="No shows listed" description={`When ${firstName} adds a public show or event, it appears here.`} />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-card border-hair border-line bg-surface">
                {events.map(ev => (
                  <li key={ev.id} className="flex gap-4 px-5 py-4">
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-control border-hair border-line bg-page py-2">
                      <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">
                        {ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-GB", { month: "short" }) : "TBA"}
                      </span>
                      <span className="font-display text-h3 font-bold tabular-nums leading-none text-fg">{ev.start_date ? new Date(ev.start_date).getDate() : "–"}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-ui text-body font-semibold text-fg">{ev.title}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-body-sm text-fg-3">
                        {ev.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden />{ev.venue}</span>}
                        {ev.start_date && (
                          <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden />
                            {fmtDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` – ${fmtDate(ev.end_date)}` : ""}
                          </span>
                        )}
                      </span>
                      {ev.description && <p className="line-clamp-2 font-ui text-body-sm text-fg-2">{ev.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "collabs" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collabs.map(c => (
                <article key={c.id} className="flex flex-col gap-2 rounded-card border-hair border-line bg-surface p-5">
                  <div className="flex items-center justify-between gap-2">
                    {c.type && <Eyebrow>{c.type}</Eyebrow>}
                    <Badge tone={c.status?.toLowerCase() === "open" ? "ok" : "neutral"}>{c.status}</Badge>
                  </div>
                  <span className="font-ui text-body font-semibold text-fg">{c.title}</span>
                  {c.description && <p className="line-clamp-3 font-ui text-body-sm text-fg-2">{c.description}</p>}
                  {c.partner_name && <span className="font-ui text-body-sm text-fg-3">With {c.partner_name}</span>}
                </article>
              ))}
            </div>
          )}

          {tab === "moodboards" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {moodboards.map(b => {
                const thumb = b.thumbnail_url || b.og_image;
                return (
                  <article key={b.id} className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface">
                    <div className="aspect-[16/10] bg-sunken">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 border-t-hair border-line p-4">
                      <Eyebrow>{PROVIDER_LABEL[b.provider] || "Board"}</Eyebrow>
                      <span className="font-ui text-body font-semibold text-fg">{b.title}</span>
                      {b.description && <p className="line-clamp-2 font-ui text-body-sm text-fg-2">{b.description}</p>}
                      {b.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {b.tags.map(t => <Badge key={t}>{t}</Badge>)}
                        </div>
                      )}
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-auto pt-2")}>
                        Open board <ExternalLink size={13} aria-hidden />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Join band ── */}
        <section className="border-t-hair border-line bg-surface">
          <div className={cn(publicWrap, "flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center")}>
            <p className="font-ui text-body text-fg-2">
              {isVenue ? "Run a space or make work yourself?" : "Are you an artist too?"} Put your work online like {firstName} did.
            </p>
            <Link href="/register" className={textLink}>Create your page</Link>
          </div>
        </section>
      </main>

      <PublicFooter />

      {selected && (
        <ArtworkDetail
          aw={selected}
          firstName={firstName}
          onClose={() => setSelected(null)}
          onMessage={() => { setMessage({ kind: "artwork", aw: selected }); setSelected(null); }}
        />
      )}

      <MessageModal
        isOpen={!!message}
        onClose={() => setMessage(null)}
        recipientId={profile.id}
        recipientName={profile.full_name}
        recipientAvatar={profile.avatar_url}
        recipientRole={profile.role}
        {...(message?.kind === "artwork"
          ? {
              contextType: "artwork_inquiry" as const,
              contextTitle: message.aw.title,
              contextId: message.aw.id,
              contextMeta: {
                label: "Artwork inquiry",
                image: message.aw.images?.[0],
                subtitle: [message.aw.year, message.aw.medium, formatPrice(message.aw.price, message.aw.currency)].filter(Boolean).join(" · "),
              },
            }
          : {
              contextType: "direct" as const,
              contextTitle: `Message to ${profile.full_name}`,
              contextMeta: { label: isVenue ? "Venue" : "Artist", subtitle: profile.location || "" },
            })}
      />
    </div>
  );
}
