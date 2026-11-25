"use client";
// Home for a venue (a café, bar, gallery, hotel…). One job: get good art on
// the walls. So Home answers, in this order:
//   1. Is the place ready for artists? (only until it is)
//   2. What needs me? Offers to answer, agreements to send or sign.
//   3. What's on my walls, and what am I asking for?
//   4. Which works could hang here?
// At launch there are many artists and few deals, so every part reads well
// empty and points to the one next thing to do.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, ImageOff, MapPin, Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, ButtonLink, Card, Eyebrow, Heading, Skeleton, cn } from "@/components/ui";
import { OfferWorkModal, type OfferTarget } from "@/components/OfferWorkModal";
import { PostFlow } from "../scene/PostFlow";
import { wallTermsLine, type WallDetails } from "../scene/feed";
import { type DealView, dealLink, headline, isClosed, needsMe } from "@/lib/deals";
import { workLine } from "@/lib/places";
import { type OpenWork, type SetupStep, type VenueData, loadVenue, openPosts, placeName, setupDone, shortRange } from "@/lib/venue";
import { VenueSetup } from "./VenueSetup";

const SEEN_KEY = "artomango.venue-setup-seen";

export function VenueHome() {
  const [v, setV] = useState<VenueData | null>(null);
  const [failed, setFailed] = useState(false);
  const [setup, setSetup] = useState<null | "name" | "photos">(null);
  const [posting, setPosting] = useState(false);
  const [offer, setOffer] = useState<OfferTarget | null>(null);
  const [pick, setPick] = useState<string[]>([]);

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const data = await loadVenue(sb, user.id, { works: 40 });
    if (!data) { setFailed(true); return null; }
    setV(data);
    return data;
  }, []);

  useEffect(() => {
    load().then(data => {
      if (!data) return;
      // First visit with nothing set up: open the setup steps once.
      const d = setupDone(data);
      let seen = false;
      try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch {}
      if (!seen && !d.photos && !d.walls && !d.first) {
        try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
        setSetup("name");
      }
    });
  }, [load]);

  if (failed) return <p className="font-ui text-body text-fg-2">This didn&rsquo;t load. Please refresh the page.</p>;

  const name = v ? placeName(v.profile) || "there" : "";
  const hour = new Date().getHours();
  const timeWord = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const todayFmt = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const deals = v?.deals || [];
  const toDo = v ? deals.filter(d => !isClosed(d) && needsMe(d, v.me)) : [];
  const open = v ? openPosts(v) : [];
  const done = v ? setupDone(v) : null;
  const ready = done ? Object.values(done).every(Boolean) : true;

  const sub = !v ? " " : [
    toDo.length ? `${toDo.length} ${toDo.length === 1 ? "thing needs" : "things need"} you` : null,
    v.now.length ? `${v.now.length === 1 ? "1 artist" : `${v.now.length} artists`} on your walls` : null,
    open.length ? `${open.length} open ${open.length === 1 ? "call" : "calls"}` : null,
  ].filter(Boolean).join(" · ") || (ready ? "A quiet day. Have a look at what artists are offering." : "Let's get your walls ready for artists.");

  function request(w: OpenWork) {
    if (!w.artist) return;
    setPick([w.id]);
    setOffer({ mode: "request", recipientId: w.artist.id, name: w.artist.full_name || "this artist", avatar: w.artist.avatar_url });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Greeting ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow suppressHydrationWarning>{todayFmt}</Eyebrow>
          {v ? <Heading level={1} size="h1" suppressHydrationWarning>{timeWord}, {name}.</Heading> : <Skeleton className="h-10 w-72" />}
          <p className="font-ui text-body text-fg-2">{sub}</p>
        </div>
        <Button variant="primary" onClick={() => setPosting(true)}><Plus size={16} aria-hidden /> Post your walls</Button>
      </header>

      {/* ── 1. Ready for artists? ── */}
      {v && done && !ready && <SetupCard done={done} onStep={s => {
        if (s === "place") setSetup("name");
        else if (s === "photos") setSetup("photos");
        else if (s === "walls") setPosting(true);
      }} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── 2. Needs you ── */}
        <Panel title={toDo.length ? `${toDo.length} ${toDo.length === 1 ? "thing needs" : "things need"} you` : "Needs you"} eyebrow="Offers and deals"
          action={<PanelLink href="/dashboard/messages?tab=deals">All deals</PanelLink>} className="lg:col-span-2">
          {!v ? <Rows /> : toDo.length ? (
            <ul className="divide-y divide-line">
              {toDo.slice(0, 4).map(d => <DealRow key={d.id} d={d} me={v.me} />)}
            </ul>
          ) : (
            <Quiet>
              {deals.length
                ? "Nothing is waiting on you. We'll tell you the moment an artist answers."
                : "When an artist offers you work, or answers your request, it lands here."}
            </Quiet>
          )}
        </Panel>

        {/* ── 3. Your walls ── */}
        <Panel title="Your walls" eyebrow="Studio" action={<PanelLink href="/dashboard/walls">Open</PanelLink>}>
          {!v ? <Rows /> : <WallsSummary v={v} onPost={() => setPosting(true)} />}
        </Panel>
      </div>

      {/* ── 4. Works you could hang ── */}
      <section aria-labelledby="works-head" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Eyebrow>Open to a wall</Eyebrow>
            <h2 id="works-head" className="font-display text-h2 leading-tight text-fg">
              {v && v.city && v.works.some(w => w.near) ? `Works you could hang, from ${v.city}` : "Works you could hang"}
            </h2>
          </div>
          <PanelLink href="/dashboard/looking">See all</PanelLink>
        </div>
        {!v ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="aspect-[3/4] w-full rounded-card" />)}</div>
        ) : v.works.length === 0 ? (
          <Card padding="lg" className="flex flex-col gap-2">
            <h3 className="font-ui text-body font-semibold text-fg">Artists are adding their works now</h3>
            <p className="max-w-prose font-ui text-body-sm text-fg-2">
              When an artist marks a work open to a wall, it shows up here. Post your walls and artists near you can offer theirs to you directly.
            </p>
          </Card>
        ) : (
          <>
            {v.city && !v.works.some(w => w.near) && (
              <p className="font-ui text-body-sm text-fg-3">No works from {v.city} yet, so here are works from everywhere. Artists happily travel for a good wall.</p>
            )}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {v.works.slice(0, 6).map(w => <WorkTile key={w.id} w={w} onRequest={() => request(w)} />)}
            </ul>
          </>
        )}
      </section>

      {v && (
        <VenueSetup open={!!setup} data={v} start={setup || "name"} onClose={() => setSetup(null)} onSaved={load}
          onPostWalls={() => { setSetup(null); setPosting(true); }}
          onBrowse={() => { setSetup(null); document.getElementById("works-head")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      )}
      <PostFlow open={posting} start="walls" onClose={() => setPosting(false)} onPosted={load} />
      <OfferWorkModal open={!!offer} target={offer} onClose={() => { setOffer(null); load(); }} preselect={pick} />
    </div>
  );
}

// ── Setup ───────────────────────────────────────────────────────────
const SETUP: { key: SetupStep; title: string; line: string; cta?: string }[] = [
  { key: "place", title: "Tell artists about your place", line: "Its name, what kind of place it is, and where.", cta: "Start" },
  { key: "photos", title: "Add photos of your walls", line: "What artists most want to see.", cta: "Add photos" },
  { key: "walls", title: "Post your walls", line: "How much space, for how long, and if guests can buy.", cta: "Post" },
  { key: "first", title: "Get your first offer", line: "Request a work below, or wait for artists to offer." },
];

function SetupCard({ done, onStep }: { done: Record<SetupStep, boolean>; onStep: (s: SetupStep) => void }) {
  const count = SETUP.filter(s => done[s.key]).length;
  const nextKey = SETUP.find(s => !done[s.key])?.key;
  return (
    <section aria-labelledby="setup-head" className="flex flex-col gap-5 rounded-card border-outline border-ink bg-surface p-5 shadow-hard-1 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-ui text-caption font-semibold text-fg-3">{count} of {SETUP.length} done</span>
          <h2 id="setup-head" className="font-display text-h2 leading-tight text-fg">Get your walls ready for artists</h2>
        </div>
        <div className="flex w-full max-w-[220px] gap-1" aria-hidden>
          {SETUP.map(s => <span key={s.key} className={cn("h-1.5 flex-1 rounded-pill", done[s.key] ? "bg-ink" : s.key === nextKey ? "bg-mango" : "bg-line")} />)}
        </div>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SETUP.map((s, i) => {
          const ok = done[s.key];
          const isNext = s.key === nextKey;
          const clickable = !ok && !!s.cta;
          const inner = (
            <>
              <span aria-hidden className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-pill border-outline font-ui text-caption font-bold",
                ok ? "border-ink bg-ink text-on-inverse" : isNext ? "border-ink bg-mango text-on-mango" : "border-line-strong text-fg-3")}>
                {ok ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("font-ui text-body-sm font-semibold", ok ? "text-fg-3 line-through decoration-1" : "text-fg")}>{s.title}</span>
                <span className="font-ui text-caption text-fg-3">{s.line}</span>
                {clickable && isNext && <span className="mt-1 inline-flex items-center gap-1 font-ui text-label font-semibold text-fg">{s.cta} <ArrowRight size={13} aria-hidden /></span>}
              </span>
            </>
          );
          const cls = cn("flex h-full items-start gap-3 rounded-control border-hair p-3.5 text-left",
            isNext ? "border-ink bg-mango-soft" : "border-line bg-surface", clickable && "transition-colors hover:border-ink");
          return (
            <li key={s.key}>
              {clickable ? <button type="button" onClick={() => onStep(s.key)} className={cn(cls, "w-full")}>{inner}</button> : <div className={cls}>{inner}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────
function Panel({ title, eyebrow, action, children, className }: {
  title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card padding="none" className={cn("flex flex-col", className)}>
      <div className="flex items-end justify-between gap-3 border-b-hair border-line px-5 py-4">
        <div className="flex flex-col gap-1">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Heading level={2} size="h3">{title}</Heading>
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  );
}
function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 font-ui text-label font-semibold text-fg-2 hover:text-fg">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 font-ui text-body-sm text-fg-3">{children}</p>;
}
function Rows() {
  return <div className="flex flex-col gap-3 p-5">{[0, 1].map(i => <Skeleton key={i} className="h-14 w-full rounded-control" />)}</div>;
}

function DealRow({ d, me }: { d: DealView; me: string }) {
  const cover = d.works[0]?.images?.[0];
  const what = d.status === "sent" ? "Answer" : d.status === "interested" ? "Send agreement" : "Sign";
  return (
    <li>
      <Link href={dealLink(d.id)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-sunken">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-control border-hair border-line bg-sunken">
          {cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cover} alt="" className="h-full w-full object-contain p-1" />
            : <ImageOff size={16} aria-hidden className="text-fg-3" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-ui text-body-sm font-semibold text-fg">{headline(d, me)}</span>
          <span className="truncate font-ui text-caption text-fg-3">
            {d.works.map(w => w.title).join(", ")}{d.post ? ` · for “${d.post.title}”` : ""}
          </span>
        </span>
        <Badge tone="mango" className="shrink-0">{what}</Badge>
      </Link>
    </li>
  );
}

function WallsSummary({ v, onPost }: { v: VenueData; onPost: () => void }) {
  const open = openPosts(v);
  const show = v.now[0] || v.next[0];
  return (
    <div className="flex flex-1 flex-col">
      {show ? (
        <Link href="/dashboard/walls" className="flex items-center gap-3 border-b-hair border-line px-5 py-4 hover:bg-sunken">
          <span className="flex shrink-0 -space-x-3">
            {(show.works.length ? show.works : [{ id: "x", title: "", image: null }]).slice(0, 2).map(w => (
              <span key={w.id} className="block h-12 w-12 overflow-hidden rounded-control border-2 border-surface bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.image && <img src={w.image} alt="" className="h-full w-full object-cover" />}
              </span>
            ))}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-ui text-caption font-semibold text-fg-3">{v.now[0] ? "On your walls now" : "Coming up"}</span>
            <span className="truncate font-ui text-body-sm font-semibold text-fg">{show.other_name || "An artist"}</span>
            <span className="font-ui text-caption tabular-nums text-fg-3">{shortRange(show)}</span>
          </span>
        </Link>
      ) : (
        <p className="border-b-hair border-line px-5 py-4 font-ui text-body-sm text-fg-3">Nothing on your walls through Artomango yet.</p>
      )}
      {open.length ? (
        <ul className="divide-y divide-line">
          {open.slice(0, 2).map(p => {
            const terms = wallTermsLine((p.details || {}) as WallDetails);
            return (
              <li key={p.id} className="flex flex-col gap-0.5 px-5 py-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-ui text-body-sm font-semibold text-fg">{p.title}</span>
                  <span className="shrink-0 font-ui text-caption font-semibold tabular-nums text-fg-2">{p.offers} {p.offers === 1 ? "offer" : "offers"}</span>
                </span>
                {terms && <span className="truncate font-ui text-caption text-fg-3">{terms}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="font-ui text-body-sm text-fg-2">No open call right now. Post your walls and artists can offer work straight away.</p>
          <Button variant="secondary" size="sm" className="self-start" onClick={onPost}><Store size={14} aria-hidden /> Post your walls</Button>
        </div>
      )}
      {v.past.length > 0 && (
        <p className="mt-auto flex items-center gap-1.5 border-t-hair border-line px-5 py-3 font-ui text-caption text-fg-3">
          <Clock size={12} aria-hidden /> {v.past.length} {v.past.length === 1 ? "show" : "shows"} in your wall history
        </p>
      )}
    </div>
  );
}

function WorkTile({ w, onRequest }: { w: OpenWork; onRequest: () => void }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface">
      <Link href={`/artwork/${w.id}/passport`} className="relative block aspect-square bg-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.images![0]} alt={w.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
        <span className="truncate font-ui text-caption font-semibold text-fg-2">{w.artist?.full_name || "Artist"}</span>
        <span className="truncate font-ui text-caption text-fg-3">{workLine(w)}</span>
        {w.near && <span className="flex items-center gap-1 font-ui text-caption text-fg-3"><MapPin size={11} aria-hidden /> Near you</span>}
        {w.artist && <Button size="sm" variant="secondary" className="mt-auto" onClick={onRequest}>Request</Button>}
      </div>
    </li>
  );
}
