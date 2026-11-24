"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarDays, Globe, MapPin, PlayCircle } from "lucide-react";
import {
  Avatar, Badge, ButtonLink, Chip, EmptyState, Eyebrow, Heading, SearchField, Skeleton, cn,
} from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, formatPrice, publicWrap, textLink } from "@/components/public/PublicChrome";

// ── Types ──────────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; images?: string[];
  price?: number; currency?: string; status: string; medium?: string; year?: number;
  user_id?: string; venue_location?: string;
  artist_name?: string; artist_username?: string; artist_avatar?: string;
};
type Person = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; cover_image?: string | null;
};
type Event = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string; event_type?: string;
  is_online?: boolean; online_url?: string; cover_image?: string;
  user_id?: string; location_name?: string;
};
type Resource = { id: string; type: string; title: string; url?: string; description?: string };
type Section = "all" | "works" | "artists" | "venues" | "events" | "learn";

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition", workshop: "Workshop", online_workshop: "Online workshop",
  drink_draw: "Drink and draw", artist_talk: "Artist talk", open_studio: "Open studio",
  gathering: "Gathering", popup: "Pop-up", other: "Event",
};
const SECTIONS: { value: Section; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "works", label: "Works" },
  { value: "artists", label: "Artists" },
  { value: "venues", label: "Venues" },
  { value: "events", label: "Events" },
  { value: "learn", label: "Learn" },
];

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function isUpcoming(ev: Event) {
  const ref = ev.end_date || ev.start_date;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0, 0, 0, 0));
}
function youtubeId(url?: string) {
  return url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1] ?? null;
}
function has(text: string | undefined, q: string) {
  return (text || "").toLowerCase().includes(q);
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={2} size="h2">{title}</Heading>
      </div>
      {action}
    </div>
  );
}

function EventRow({ ev }: { ev: Event }) {
  const place = ev.is_online ? "Online" : ev.location_name || ev.venue;
  return (
    <li className="flex gap-4 px-5 py-4">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-control border-hair border-line bg-page py-2">
        <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">
          {ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-GB", { month: "short" }) : "TBA"}
        </span>
        <span className="font-display text-h3 font-bold tabular-nums leading-none text-fg">{ev.start_date ? new Date(ev.start_date).getDate() : "–"}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-ui text-body font-semibold text-fg">{ev.title}</span>
          <Badge>{EVENT_LABEL[ev.event_type || "other"] || "Event"}</Badge>
        </div>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-body-sm text-fg-3">
          {place && <span className="inline-flex items-center gap-1.5">{ev.is_online ? <Globe size={13} aria-hidden /> : <MapPin size={13} aria-hidden />}{place}</span>}
          {ev.end_date && ev.end_date !== ev.start_date && <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden />Until {fmtDate(ev.end_date)}</span>}
        </span>
      </div>
      {ev.is_online && ev.online_url && (
        <a href={ev.online_url} target="_blank" rel="noopener noreferrer" className={cn(textLink, "self-center")}>Join</a>
      )}
    </li>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ExplorePage() {
  const [signedIn, setSignedIn] = useState(false);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<Section>("all");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Person[]>([]);
  const [venues, setVenues] = useState<Person[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const sb = createClient();

    const [{ data: auth }, { data: awData }, { data: artistData }, { data: venueData }, { data: evData }, { data: resData }] = await Promise.all([
      sb.auth.getUser(),
      sb.from("artworks")
        .select("id,title,images,price,currency,status,medium,year,user_id,venue_location")
        .in("status", ["available", "Available"]).not("images", "is", null)
        .order("created_at", { ascending: false }).limit(24),
      sb.from("profiles").select("id,full_name,username,role,bio,location,avatar_url")
        .eq("role", "artist").not("full_name", "is", null).neq("full_name", "").limit(20),
      // Sign-up saves "venue"; older accounts use "gallery"
      sb.from("profiles").select("id,full_name,username,bio,location,avatar_url")
        .in("role", ["venue", "gallery"]).not("full_name", "is", null).limit(16),
      sb.from("exhibitions")
        .select("id,title,venue,start_date,end_date,status,event_type,is_online,online_url,cover_image,user_id,location_name")
        .eq("is_public", true).order("start_date", { ascending: true }).limit(30),
      sb.from("education_resources").select("id,type,title,url,description").order("created_at", { ascending: false }).limit(12),
    ]);
    setSignedIn(!!auth?.user);

    if (awData?.length) {
      const uids = Array.from(new Set(awData.map((a: Artwork) => a.user_id).filter(Boolean)));
      const { data: profs } = await sb.from("profiles").select("id,full_name,username,avatar_url").in("id", uids);
      const pm: Record<string, any> = {};
      profs?.forEach((p: any) => { pm[p.id] = p; });
      setArtworks(awData.map((a: Artwork) => ({
        ...a,
        artist_name: pm[a.user_id!]?.full_name,
        artist_username: pm[a.user_id!]?.username,
        artist_avatar: pm[a.user_id!]?.avatar_url,
      })));
    }

    if (artistData?.length) {
      const enriched = await Promise.all(artistData.map(async (p: Person) => {
        const [{ count }, { data: cover }] = await Promise.all([
          sb.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", p.id),
          sb.from("artworks").select("images").eq("user_id", p.id).not("images", "is", null).limit(1).maybeSingle(),
        ]);
        return { ...p, artwork_count: count || 0, cover_image: cover?.images?.[0] || null };
      }));
      setArtists(enriched);
    }

    setVenues(venueData || []);
    setEvents((evData || []).filter(isUpcoming));
    setResources(resData || []);
    setLoading(false);
  }

  // ── Search ──
  const q = search.toLowerCase().trim();
  const fWorks = q ? artworks.filter(a => has(a.title, q) || has(a.medium, q) || has(a.artist_name, q)) : artworks;
  const fArtists = q ? artists.filter(a => has(a.full_name, q) || has(a.location, q) || has(a.bio, q)) : artists;
  const fVenues = q ? venues.filter(v => has(v.full_name, q) || has(v.location, q) || has(v.bio, q)) : venues;
  const fEvents = q ? events.filter(e => has(e.title, q) || has(e.venue, q) || has(e.location_name, q)) : events;
  const fResources = q ? resources.filter(r => has(r.title, q) || has(r.description, q)) : resources;
  // In "Everything", workshops already appear under Events
  const workshops = section === "learn" ? fEvents.filter(e => e.event_type === "workshop" || e.event_type === "online_workshop") : [];

  const show = (s: Section) => section === "all" || section === s;
  const limit = (n: number) => (section === "all" ? n : undefined);
  const nothing = !loading && !fWorks.length && !fArtists.length && !fVenues.length && !fEvents.length && !fResources.length;

  const seeAll = (s: Section, label: string) =>
    section === "all" ? (
      <button type="button" onClick={() => { setSection(s); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={textLink}>
        {label} <ArrowRight size={14} aria-hidden />
      </button>
    ) : undefined;

  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader signedIn={signedIn} />

      {/* ── Page head ── */}
      <section className="border-b-hair border-line bg-surface">
        <div className={cn(publicWrap, "flex flex-col gap-6 py-10 lg:py-14")}>
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow>Explore</Eyebrow>
            <Heading level={1} size="display">Art from independent studios</Heading>
            <p className="font-ui text-lead text-fg-2">Works available now, the artists who made them, the spaces that show them and what&rsquo;s on next.</p>
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search works, artists, venues, events"
            className="h-12 max-w-[560px]"
          />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Show">
            {SECTIONS.map(s => <Chip key={s.value} selected={section === s.value} onClick={() => setSection(s.value)}>{s.label}</Chip>)}
          </div>
        </div>
      </section>

      <main className={cn(publicWrap, "flex flex-col gap-14 py-10 lg:gap-16 lg:py-14")}>
        {nothing && (
          <EmptyState
            title={q ? `Nothing matches “${search.trim()}”` : "Nothing here yet"}
            description={q ? "Try a shorter word, an artist's name or a city." : "As artists add works and events, they show up here."}
          />
        )}

        {/* ── Works ── */}
        {show("works") && (loading || fWorks.length > 0) && (
          <section aria-labelledby="works-h">
            <SectionHead eyebrow="Available now" title="Works" action={seeAll("works", "See all works")} />
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-card" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {fWorks.slice(0, limit(8)).map(aw => (
                  <Link
                    key={aw.id}
                    href={aw.artist_username ? `/${aw.artist_username}` : `/artwork/${aw.id}/passport`}
                    className="group flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface transition-colors duration-fast hover:border-ink"
                  >
                    <Mat src={aw.images?.[0]} alt={aw.title} className="aspect-[4/5] w-full" />
                    <div className="flex flex-1 flex-col gap-1 border-t-hair border-line px-4 py-3">
                      <span className="font-ui text-body font-semibold text-fg">{aw.title}</span>
                      <span className="font-ui text-body-sm text-fg-3">{[aw.artist_name, aw.medium].filter(Boolean).join(" · ")}</span>
                      {aw.price ? <span className="mt-auto pt-1 font-ui text-body-sm font-semibold tabular-nums text-fg">{formatPrice(aw.price, aw.currency)}</span> : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Artists ── */}
        {show("artists") && !loading && fArtists.length > 0 && (
          <section aria-labelledby="artists-h">
            <SectionHead eyebrow="Studios" title="Artists" action={seeAll("artists", "See all artists")} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fArtists.slice(0, limit(8)).map(a => (
                <Link key={a.id} href={a.username ? `/${a.username}` : "/explore"}
                  className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface transition-colors duration-fast hover:border-ink">
                  <Mat src={a.cover_image} alt={`Work by ${a.full_name}`} className="aspect-[4/3] w-full" />
                  <div className="flex items-center gap-3 border-t-hair border-line px-4 py-3">
                    <Avatar name={a.full_name || "Artist"} src={a.avatar_url} size="sm" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-ui text-body font-semibold text-fg">{a.full_name}</span>
                      <span className="truncate font-ui text-body-sm text-fg-3">
                        {[a.location, a.artwork_count ? `${a.artwork_count} ${a.artwork_count === 1 ? "work" : "works"}` : null].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Venues ── */}
        {show("venues") && !loading && fVenues.length > 0 && (
          <section aria-labelledby="venues-h">
            <SectionHead eyebrow="Spaces" title="Venues" action={seeAll("venues", "See all venues")} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fVenues.slice(0, limit(6)).map(v => (
                <li key={v.id}>
                  <Link href={v.username ? `/${v.username}` : "/explore"}
                    className="flex h-full gap-4 rounded-card border-hair border-line bg-surface p-4 transition-colors duration-fast hover:border-ink">
                    <Avatar name={v.full_name || "Venue"} src={v.avatar_url} size="md" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-ui text-body font-semibold text-fg">{v.full_name}</span>
                      {v.location && <span className="inline-flex items-center gap-1.5 font-ui text-body-sm text-fg-3"><MapPin size={13} aria-hidden />{v.location}</span>}
                      {v.bio && <p className="line-clamp-2 font-ui text-body-sm text-fg-2">{v.bio}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Events ── */}
        {show("events") && !loading && fEvents.length > 0 && (
          <section aria-labelledby="events-h">
            <SectionHead eyebrow="Coming up" title="Events" action={seeAll("events", "See all events")} />
            <ul className="divide-y divide-line overflow-hidden rounded-card border-hair border-line bg-surface">
              {fEvents.slice(0, limit(5)).map(ev => <EventRow key={ev.id} ev={ev} />)}
            </ul>
          </section>
        )}

        {/* ── Learn ── */}
        {show("learn") && !loading && (workshops.length > 0 || fResources.length > 0) && (
          <section aria-labelledby="learn-h" className="flex flex-col gap-8">
            <SectionHead eyebrow="Education" title="Learn" action={seeAll("learn", "See all")} />
            {workshops.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="font-ui text-label font-semibold text-fg">Workshops</span>
                <ul className="divide-y divide-line overflow-hidden rounded-card border-hair border-line bg-surface">
                  {workshops.slice(0, limit(3)).map(ev => <EventRow key={ev.id} ev={ev} />)}
                </ul>
              </div>
            )}
            {fResources.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="font-ui text-label font-semibold text-fg">Videos and reading</span>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {fResources.slice(0, limit(4)).map(r => {
                    const yt = r.type === "video" ? youtubeId(r.url) : null;
                    return (
                      <a key={r.id} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface transition-colors duration-fast hover:border-ink">
                        {yt && (
                          <div className="relative aspect-video bg-sunken">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                            <PlayCircle size={36} aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-on-inverse drop-shadow" />
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5 p-4">
                          <Eyebrow>{r.type}</Eyebrow>
                          <span className="line-clamp-2 font-ui text-body font-semibold text-fg">{r.title}</span>
                          {r.description && <p className="line-clamp-2 font-ui text-body-sm text-fg-2">{r.description}</p>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Join band ── */}
      {!signedIn && !loading && (
        <section className="bg-inverse text-on-inverse">
          <div className={cn(publicWrap, "flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center")}>
            <div className="flex max-w-[560px] flex-col gap-2">
              <Heading level={2} size="h1" className="text-on-inverse">Make work? Run a space?</Heading>
              <p className="font-ui text-body text-n-300">Put your works, shows and open calls here, next to everyone else in the scene.</p>
            </div>
            <ButtonLink href="/register" variant="primary">Create your free account <ArrowRight size={16} aria-hidden /></ButtonLink>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
