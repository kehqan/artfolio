"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CampaignCarousel from "@/components/CampaignCarousel";
import {
  ArrowRight, BarChart3, CalendarDays, Globe, Handshake, MapPin,
  Package,
} from "lucide-react";
import { Avatar, Badge, ButtonLink, Chip, Eyebrow, Heading, cn } from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, formatPrice, publicWrap, textLink } from "@/components/public/PublicChrome";

// ── Types ──────────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  price?: number; currency?: string; images?: string[];
  venue_location?: string; location?: string;
  artist_name?: string; artist_avatar?: string; artist_username?: string;
  user_id?: string;
};
type Person = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; cover_image?: string;
};
type Event = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; event_type?: string; is_online?: boolean;
  online_url?: string; cover_image?: string; location_name?: string;
};

const MEDIUMS = ["All", "Oil", "Photography", "Sculpture", "Digital", "Printmaking", "Mixed media"];

const EVENT_LABEL: Record<string, string> = {
  exhibition: "Exhibition", workshop: "Workshop", online_workshop: "Online workshop", drink_draw: "Drink and draw",
  artist_talk: "Artist talk", open_studio: "Open studio", gathering: "Gathering", popup: "Pop-up", other: "Event",
};

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function isUpcoming(ev: Event) {
  const ref = ev.end_date || ev.start_date;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0, 0, 0, 0));
}
// ── Copy ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Package, label: "Studio", title: "Every work, always tracked",
    body: "Add a piece once: photos, medium, size, price, where it hangs. Know what you have, who holds it and what it sold for.",
    pain: "“My spreadsheet is always out of date.”" },
  { icon: Globe, label: "Your page", title: "Your gallery, live on the web",
    body: "Your works become a public page at artomango.com/you. Send one link to galleries, curators and collectors.",
    pain: "“I have nowhere to send people to see my work.”" },
  { icon: Handshake, label: "The Pool", title: "Artists and venues, matched",
    body: "Artists post that they want wall space. Venues post that they need work. The Pool puts the two together.",
    pain: "“Finding a place to show is all cold emails.”" },
  { icon: BarChart3, label: "Sales", title: "Know your numbers",
    body: "Log each sale and commission, keep your collectors close, and see who to follow up with next.",
    pain: "“I don’t know what I made this year.”" },
  { icon: MapPin, label: "The Scene", title: "The local scene on one map",
    body: "Shows, open studios, venues and collabs near you, in one place instead of scattered across Instagram.",
    pain: "“I hear about openings after they happen.”" },
  { icon: CalendarDays, label: "Planning", title: "Shows without the chaos",
    body: "Plan exhibitions, pick the works, track venues, dates and tasks on one timeline.",
    pain: "“Dates in email, lists in WhatsApp, tasks in Notes.”" },
];

const STEPS = [
  { n: "1", title: "Add your work", body: "Upload photos with the details that matter: medium, size, price, location." },
  { n: "2", title: "Go public", body: "Your page goes live straight away. Share it, or let galleries and collectors find you." },
  { n: "3", title: "Show and sell", body: "Answer open calls, plan shows, record sales and keep track of every collector." },
];

// ── Pieces ─────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-[640px] flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={2} size="h1">{title}</Heading>
      </div>
      {action}
    </div>
  );
}

const wrap = publicWrap;

// ══════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Person[]>([]);
  const [venues, setVenues] = useState<Person[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [medium, setMedium] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const sb = createClient();

    // Artworks
    const { data: awData } = await sb.from("artworks")
      .select("id,title,medium,year,price,currency,images,venue_location,location,user_id")
      .in("status", ["available", "Available"]).not("images", "is", null)
      .order("created_at", { ascending: false }).limit(36);
    if (awData?.length) {
      const userIds = Array.from(new Set(awData.map((a: Artwork) => a.user_id).filter(Boolean)));
      const { data: profs } = await sb.from("profiles").select("id,full_name,avatar_url,username").in("id", userIds);
      const pm: Record<string, any> = {};
      profs?.forEach((p: any) => { pm[p.id] = p; });
      setArtworks(awData.map((a: Artwork) => ({
        ...a,
        artist_name: pm[a.user_id!]?.full_name || "Artist",
        artist_avatar: pm[a.user_id!]?.avatar_url || null,
        artist_username: pm[a.user_id!]?.username || null,
      })));
    }

    // Artists (12 is all the row shows)
    const { data: artistData } = await sb.from("profiles")
      .select("id,full_name,username,role,bio,location,avatar_url")
      .eq("role", "artist").not("full_name", "is", null).neq("full_name", "").limit(12);
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

    // Venues: sign-up saves "venue"; older accounts use "gallery"
    const { data: venueData } = await sb.from("profiles")
      .select("id,full_name,username,bio,location,avatar_url")
      .in("role", ["venue", "gallery"]).not("full_name", "is", null).limit(8);
    setVenues(venueData || []);

    // Events (public, upcoming)
    const { data: evData } = await sb.from("exhibitions")
      .select("id,title,venue,start_date,end_date,event_type,is_online,online_url,cover_image,location_name")
      .eq("is_public", true).order("start_date", { ascending: true }).limit(20);
    setEvents((evData || []).filter(isUpcoming));

    setLoading(false);
  }

  const hero = artworks.find(a => Array.isArray(a.images) && a.images[0]);
  const shownArtworks = artworks
    .filter(a => medium === "All" || (a.medium || "").toLowerCase().includes(medium.toLowerCase()))
    .slice(0, 8);
  const people = [...artists, ...venues.map(v => ({ ...v, role: "venue" }))].slice(0, 10);

  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader />

      <main>
        {/* ── HERO ── */}
        <section className={cn(wrap, "grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24")}>
          <div className="flex flex-col gap-6">
            <Eyebrow>For artists and venues</Eyebrow>
            <Heading level={1} size="display" className="max-w-[12ch] sm:text-[72px] sm:leading-[0.95]">
              Your art practice, in one place.
            </Heading>
            <p className="max-w-[46ch] font-ui text-lead text-fg-2">
              Keep track of every work, put it in front of collectors, find places to show and record every sale. Built with artists, for artists.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" variant="primary">Create your free account <ArrowRight size={16} aria-hidden /></ButtonLink>
              <ButtonLink href="/explore" variant="secondary">Explore the scene</ButtonLink>
            </div>
          </div>

          {/* The work leads: a real piece from the platform, credited */}
          <figure className="mx-auto w-full max-w-[460px]">
            <div className="rounded-card border-hair border-line bg-surface p-3">
              {hero ? (
                <Link href={hero.artist_username ? `/${hero.artist_username}` : "/explore"} className="block">
                  <Mat src={hero.images?.[0]} alt={hero.title} className="aspect-[4/5] rounded-control" />
                </Link>
              ) : (
                <div className={cn("aspect-[4/5] rounded-control bg-sunken", loading && "animate-pulse")} />
              )}
            </div>
            {hero && (
              <figcaption className="mt-3 flex items-baseline justify-between gap-3 px-1">
                <span className="min-w-0">
                  <span className="block truncate font-ui text-body font-semibold text-fg">{hero.title}</span>
                  <span className="block truncate font-ui text-caption text-fg-3">
                    {[hero.artist_name, hero.medium, hero.year].filter(Boolean).join(", ")}
                  </span>
                </span>
                <Badge tone="ok" dot>Available</Badge>
              </figcaption>
            )}
          </figure>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="scroll-mt-20 border-y-hair border-line bg-surface py-16 lg:py-24">
          <div className={wrap}>
            <SectionHead eyebrow="What you get" title="Built for how artists actually work" />
            <div className="grid gap-px overflow-hidden rounded-card border-hair border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, label, title, body, pain }) => (
                <article key={title} className="flex flex-col gap-3 bg-surface p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-control bg-sunken text-fg"><Icon size={18} aria-hidden /></span>
                    <Eyebrow>{label}</Eyebrow>
                  </div>
                  <Heading level={3}>{title}</Heading>
                  <p className="font-ui text-body-sm text-fg-2">{body}</p>
                  <p className="mt-auto pt-2 font-ui text-caption italic text-fg-3">{pain}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CAMPAIGN (managed by admin) ── */}
        <CampaignCarousel />

        {/* ── HOW IT WORKS ── */}
        <section id="how" className={cn(wrap, "scroll-mt-20 py-16 lg:py-24")}>
          <SectionHead eyebrow="How it works" title="Three steps to a working studio" />
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map(s => (
              <li key={s.n} className="flex flex-col gap-3 border-t-outline border-ink pt-5">
                <span className="font-display text-display leading-none text-fg">{s.n}</span>
                <Heading level={3}>{s.title}</Heading>
                <p className="font-ui text-body text-fg-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FRESH WORK ── */}
        <section id="explore" className="border-t-hair border-line bg-surface py-16 lg:py-24">
          <div className={wrap}>
            <SectionHead
              eyebrow="Discover"
              title="Fresh from the studios"
              action={<Link href="/explore" className={textLink}>See everything <ArrowRight size={14} aria-hidden /></Link>}
            />
            <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by medium">
              {MEDIUMS.map(m => <Chip key={m} selected={medium === m} onClick={() => setMedium(m)}>{m}</Chip>)}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5" aria-hidden>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-card bg-sunken" />)}
              </div>
            ) : shownArtworks.length === 0 ? (
              <p className="rounded-card border-hair border-line bg-page px-5 py-10 text-center font-ui text-body text-fg-2">
                No works in this medium yet. Try another, or <Link href="/explore" className={textLink}>browse everything</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5">
                {shownArtworks.map(aw => (
                  <Link
                    key={aw.id}
                    href={aw.artist_username ? `/${aw.artist_username}` : "/explore"}
                    className="group flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2"
                  >
                    <Mat src={aw.images?.[0]} alt={aw.title} className="aspect-[4/5] border-b-hair border-line" />
                    <div className="flex flex-col gap-0.5 p-3.5">
                      <span className="truncate font-ui text-body font-semibold text-fg">{aw.title}</span>
                      <span className="truncate font-ui text-caption text-fg-3">{[aw.artist_name, aw.medium].filter(Boolean).join(", ")}</span>
                      {aw.price ? <span className="mt-1.5 font-ui text-label font-semibold tabular-nums text-fg">{formatPrice(aw.price, aw.currency)}</span> : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* People */}
            {people.length > 0 && (
              <div className="mt-14">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <Heading level={3}>Artists and venues</Heading>
                  <Link href="/explore" className={textLink}>Meet everyone</Link>
                </div>
                <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                  {people.map(p => (
                    <Link
                      key={p.id}
                      href={p.username ? `/${p.username}` : "/explore"}
                      className="flex w-[220px] shrink-0 snap-start flex-col gap-3 rounded-card border-hair border-line bg-surface p-4 transition-[border-color,box-shadow] duration-base hover:border-ink hover:shadow-hard-2"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={p.full_name} src={p.avatar_url} />
                        <span className="min-w-0">
                          <span className="block truncate font-ui text-label font-semibold text-fg">{p.full_name}</span>
                          <span className="block truncate font-ui text-caption text-fg-3">
                            {p.role === "venue" ? "Venue" : `${p.artwork_count ?? 0} works`}{p.location ? `, ${p.location}` : ""}
                          </span>
                        </span>
                      </div>
                      {p.bio && <p className="line-clamp-2 font-ui text-caption text-fg-2">{p.bio}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {events.length > 0 && (
              <div className="mt-14">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <Heading level={3}>Coming up</Heading>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-card border-hair border-line bg-surface">
                  {events.slice(0, 5).map(ev => (
                    <li key={ev.id} className="flex items-center gap-4 px-4 py-3.5">
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-control bg-sunken py-1.5">
                        <span className="font-ui text-caption font-semibold uppercase text-fg-3">
                          {ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-GB", { month: "short" }) : "TBA"}
                        </span>
                        <span className="font-display text-h3 leading-none text-fg">
                          {ev.start_date ? new Date(ev.start_date).getDate() : "–"}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-ui text-body font-semibold text-fg">{ev.title}</span>
                        <span className="block truncate font-ui text-caption text-fg-3">
                          {[
                            EVENT_LABEL[ev.event_type || "other"] ?? "Event",
                            ev.is_online ? "Online" : ev.venue || ev.location_name,
                            ev.end_date && ev.end_date !== ev.start_date ? `until ${fmtDate(ev.end_date)}` : "",
                          ].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {ev.is_online && ev.online_url && (
                        <a href={ev.online_url} target="_blank" rel="noopener noreferrer" className={textLink}>Join</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── CLOSING CTA ── */}
        <section className="bg-inverse py-16 lg:py-20">
          <div className={cn(wrap, "flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between")}>
            <h2 className="max-w-[16ch] font-display text-h1 text-on-inverse sm:text-display">
              Your studio deserves better than a spreadsheet.
            </h2>
            <ButtonLink href="/register" variant="primary">Create your free account <ArrowRight size={16} aria-hidden /></ButtonLink>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
