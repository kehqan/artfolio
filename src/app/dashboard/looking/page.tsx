"use client";
// "Looking for art": the first page of the Scene for artists. It answers
// one question: which cafés and venues near me want art on their walls
// right now? Venues see the other side: artists looking for a place, and
// works that are open to a wall near them.
//
// At launch there will be few venues, so the empty state is honest and
// gives the artist something useful to do: get their works ready, and
// tell us which café to invite.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Crosshair, ImageOff, MapPin, MessageSquare, Plus, Store } from "lucide-react";
import { Hint } from "@/components/journey/Hint";
import { createClient } from "@/lib/supabase/client";
import MessageModal from "@/components/MessageModal";
import { OfferWorkModal, type OfferTarget } from "@/components/OfferWorkModal";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, Skeleton, Tabs, Textarea, cn,
} from "@/components/ui";
import { type FeedItem, deleteItem, isLive, isPast, loadFeed, wallDetails, wallTermsLine, wantsArt, wantsPlace, whenLine } from "../scene/feed";
import { SceneDetail } from "../scene/SceneDetail";
import { SceneMap } from "../scene/SceneMap";
import { PostFlow } from "../scene/PostFlow";
import { type PlaceArtwork, WALL_LABEL, cityOf, isSold, missingForWall, sameCity, wallReady, workLine } from "@/lib/places";

type View = "list" | "map";
type Scope = "near" | "everywhere" | "here";
type Spot = { lat: number; lng: number };
type Artist = { id: string; full_name?: string; avatar_url?: string; location?: string; username?: string };
type OpenWork = PlaceArtwork & { artist?: Artist };

const NEAR_KM = 30;
function km(a: Spot, b: Spot) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export default function LookingPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [myWorks, setMyWorks] = useState<PlaceArtwork[]>([]);
  const [openWorks, setOpenWorks] = useState<OpenWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<View>("list");
  const [scope, setScope] = useState<Scope>("near");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [locating, setLocating] = useState(false);

  const [open, setOpen] = useState<FeedItem | null>(null);
  const [offer, setOffer] = useState<OfferTarget | null>(null);
  const [messaging, setMessaging] = useState<{ id: string; name: string; avatar?: string; role?: string; title: string; contextId?: string; label: string; image?: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [workId, setWorkId] = useState<string | null>(null);
  const [requestWork, setRequestWork] = useState<string[]>([]);

  const venue = role === "venue" || role === "gallery";

  useEffect(() => {
    setWorkId(new URLSearchParams(window.location.search).get("work"));
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [{ data: prof }, feed, { data: mine }] = await Promise.all([
        sb.from("profiles").select("role, location").eq("id", user.id).single(),
        loadFeed(sb, user.id).catch(() => null),
        sb.from("artworks").select("*").eq("user_id", user.id),
      ]);
      setRole(prof?.role || null);
      const c = cityOf(prof?.location);
      setCity(c);
      if (!c) setScope("everywhere");
      if (feed) setItems(feed); else setError("This didn't load. Please refresh the page.");
      setMyWorks(((mine || []) as PlaceArtwork[]).filter(a => !isSold(a)));

      if (prof?.role === "venue" || prof?.role === "gallery") {
        // Works artists have marked open to a wall, with who made them.
        const { data: works } = await sb.from("artworks").select("*").not("wall_terms", "is", null).neq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(120);
        const list = ((works || []) as PlaceArtwork[]).filter(a => !isSold(a) && a.images?.length);
        const ids = Array.from(new Set(list.map(a => a.user_id).filter(Boolean))) as string[];
        const people = new Map<string, Artist>();
        if (ids.length) {
          const { data: ps } = await sb.from("profiles").select("id, full_name, avatar_url, location, username").in("id", ids);
          (ps || []).forEach((p: Artist) => people.set(p.id, p));
        }
        setOpenWorks(list.map(a => ({ ...a, artist: people.get(a.user_id || "") })));
      }
      setLoading(false);
    });
  }, []);

  function locateMe() {
    if (!navigator.geolocation) { setError("Your browser can't share your location."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => { setSpot({ lat: p.coords.latitude, lng: p.coords.longitude }); setScope("here"); setLocating(false); },
      () => { setLocating(false); setError("We couldn't get your location. You can still browse by city."); },
      { timeout: 8000 },
    );
  }

  const inScope = (where: string | null | undefined, lat?: number | null, lng?: number | null) => {
    if (scope === "everywhere") return true;
    if (scope === "here" && spot) {
      if (lat != null && lng != null) return km(spot, { lat, lng }) <= NEAR_KM;
      return !!city && sameCity(where, city);
    }
    return sameCity(where, city);
  };

  const posts = useMemo(() => items
    .filter(i => i.userId !== userId && isLive(i) && !isPast(i))
    .filter(i => (venue ? wantsPlace(i) : wantsArt(i)))
    .filter(i => inScope(i.where, i.lat, i.lng))
    // Wall posts first, then the newest.
    .sort((a, b) => Number(b.raw.request_type === "walls") - Number(a.raw.request_type === "walls")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [items, userId, venue, scope, spot, city]);

  const everywhereCount = useMemo(() => items.filter(i => i.userId !== userId && isLive(i) && !isPast(i) && (venue ? wantsPlace(i) : wantsArt(i))).length, [items, userId, venue]);
  const nearWorks = useMemo(() => openWorks.filter(a => inScope(a.artist?.location)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [openWorks, scope, spot, city]);

  const ready = myWorks.filter(wallReady);
  const open_ = myWorks.filter(a => a.wall_terms);
  const work = workId ? myWorks.find(a => a.id === workId) : null;

  function offerTo(i: FeedItem) {
    if (!i.poster) return;
    setOffer({
      recipientId: i.userId, name: i.poster.full_name || "this venue", avatar: i.poster.avatar_url,
      contextId: i.id, contextTitle: i.title, contextLabel: i.typeLabel,
      poolRequestId: i.source === "pool" ? i.id : null, terms: i.source === "pool" ? i.raw?.details || null : null,
    });
  }
  // A venue answers an artist's "looking for a place" post by requesting the works in it.
  function requestFrom(i: FeedItem) {
    if (!i.poster) return;
    setRequestWork(i.raw?.details?.works || []);
    setOffer({ mode: "request", recipientId: i.userId, name: i.poster.full_name || "this artist", avatar: i.poster.avatar_url, contextTitle: i.title });
  }
  function messageAbout(i: FeedItem) {
    if (!i.poster) return;
    setMessaging({ id: i.userId, name: i.poster.full_name || "Artist", avatar: i.poster.avatar_url, role: i.poster.role, title: i.title, contextId: i.id, label: i.typeLabel, image: i.images[0] });
  }

  async function remove(i: FeedItem) {
    const { error: err } = await deleteItem(createClient(), i);
    if (err) { setError("That didn't delete. Please try again."); return; }
    setItems(prev => prev.filter(x => x.key !== i.key));
  }

  const placeName = scope === "here" ? "near you" : scope === "near" && city ? `in ${city}` : "anywhere";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={venue ? "Find artists" : "Looking for art"}
        description={venue
          ? "Artists looking for a place to show, and works that are ready for your walls."
          : "Cafés, galleries and venues that want art on their walls right now."}
        actions={venue
          ? <Button variant="primary" onClick={() => setPosting(true)}><Plus size={16} aria-hidden /> Post your walls</Button>
          : undefined}
      />

      {!venue && <Hint id="looking" title="Places that want art right now.">Tap Offer a work on any of them: pick up to three works, and they get your offer by email. You'll see every step in Deals.</Hint>}

      {work && !venue && (
        <Alert tone="info">
          Finding a place for <strong>{work.title}</strong>. Pick a venue below and it&rsquo;s already ticked when you offer.
        </Alert>
      )}
      {error && <Alert tone="bad">{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Where">
          {city && <Chip selected={scope === "near"} onClick={() => setScope("near")} className="shrink-0"><MapPin size={14} aria-hidden /> {city}</Chip>}
          <Chip selected={scope === "here"} onClick={() => (spot ? setScope("here") : locateMe())} className="shrink-0" disabled={locating}>
            <Crosshair size={14} aria-hidden /> {locating ? "Finding you…" : "Near me"}
          </Chip>
          <Chip selected={scope === "everywhere"} onClick={() => setScope("everywhere")} className="shrink-0">Everywhere</Chip>
        </div>
        <Tabs<View> label="View" value={view} onChange={setView} items={[{ value: "list", label: "List" }, { value: "map", label: "Map" }]} className="self-start sm:self-auto" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex flex-col gap-4">
          {loading ? (
            [0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-card" />)
          ) : view === "map" ? (
            <SceneMap items={posts} venues={[]} onOpen={setOpen} />
          ) : posts.length === 0 ? (
            venue ? (
              <EmptyState
                icon={<Store size={22} aria-hidden />}
                title={`No artists are asking ${placeName} yet`}
                description="Post your walls and artists near you can offer their work straight away."
                action={<Button variant="secondary" onClick={() => setPosting(true)}><Plus size={15} aria-hidden /> Post your walls</Button>}
              />
            ) : (
              <QuietHere city={scope === "near" ? city : ""} placeName={placeName} elsewhere={scope !== "everywhere" ? everywhereCount : 0}
                onEverywhere={() => setScope("everywhere")} onSuggest={() => setSuggesting(true)} ready={ready.length} total={myWorks.length} />
            )
          ) : (
            <>
              <p className="font-ui text-body-sm text-fg-3">
                <span className="font-semibold tabular-nums text-fg">{posts.length}</span> {venue ? (posts.length === 1 ? "artist" : "artists") : (posts.length === 1 ? "place" : "places")} {placeName}
              </p>
              <ul className="flex flex-col gap-4">
                {posts.map(i => (
                  <WantCard key={i.key} item={i} venueView={venue} onOpen={() => setOpen(i)}
                    onAct={() => (venue ? requestFrom(i) : offerTo(i))} />
                ))}
              </ul>
            </>
          )}

          {venue && !loading && (
            <section aria-labelledby="open-works" className="mt-4 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="open-works" className="font-display text-h2 text-fg">Works open to a wall</h2>
                <span className="font-ui text-body-sm tabular-nums text-fg-3">{nearWorks.length} {placeName}</span>
              </div>
              {nearWorks.length === 0 ? (
                <p className="font-ui text-body-sm text-fg-3">No works {placeName} yet. Try Everywhere.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {nearWorks.slice(0, 24).map(a => (
                    <li key={a.id} className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface">
                      <Link href={`/artwork/${a.id}/passport`} className="relative block aspect-square bg-sunken">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.images![0]} alt={a.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2" />
                      </Link>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{a.title}</span>
                        <span className="truncate font-ui text-caption text-fg-3">{workLine(a)}</span>
                        <span className="truncate font-ui text-caption text-fg-3">{a.artist?.full_name || "Artist"}{a.artist?.location ? ` · ${cityOf(a.artist.location)}` : ""}</span>
                        {a.artist && (
                          <Button size="sm" variant="secondary" className="mt-2"
                            onClick={() => { setRequestWork([a.id]); setOffer({ mode: "request", recipientId: a.artist!.id, name: a.artist!.full_name || "this artist", avatar: a.artist!.avatar_url }); }}>
                            Request this work
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {!venue && (
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--shell-header)+24px)]">
            <ReadyCard works={myWorks} ready={ready.length} open={open_.length} loading={loading} />
            <Card padding="md" className="flex flex-col gap-2">
              <h2 className="font-ui text-body font-semibold text-fg">Know a café that should have art?</h2>
              <p className="font-ui text-body-sm text-fg-2">Tell us and we&rsquo;ll invite them. When they join, you&rsquo;ll see them here.</p>
              <Button variant="secondary" size="sm" className="self-start" onClick={() => setSuggesting(true)}>Suggest a place</Button>
            </Card>
          </aside>
        )}
      </div>

      <SceneDetail
        item={open}
        mine={!!open && open.userId === userId}
        onClose={() => setOpen(null)}
        onMessage={i => (venue ? requestFrom(i) : offerTo(i))}
        actionLabel={venue ? "Request works" : "Offer a work"}
        onEdit={() => {}}
        onDelete={remove}
      />

      <OfferWorkModal open={!!offer} target={offer} onClose={() => setOffer(null)} preselect={offer?.mode === "request" ? requestWork : workId ? [workId] : []} />

      {messaging && (
        <MessageModal
          isOpen
          onClose={() => setMessaging(null)}
          recipientId={messaging.id}
          recipientName={messaging.name}
          recipientAvatar={messaging.avatar}
          recipientRole={messaging.role}
          contextType="collab"
          contextTitle={messaging.title}
          contextId={messaging.contextId}
          contextMeta={{ label: messaging.label, image: messaging.image }}
        />
      )}

      <SuggestModal open={suggesting} onClose={() => setSuggesting(false)} city={city} />

      <PostFlow open={posting} start="walls" onClose={() => setPosting(false)}
        onPosted={() => userId && loadFeed(createClient(), userId).then(setItems).catch(() => {})} />
    </div>
  );
}

// ── One venue (or artist) asking ────────────────────────────────────
function WantCard({ item, venueView, onOpen, onAct }: { item: FeedItem; venueView: boolean; onOpen: () => void; onAct: () => void }) {
  const name = item.poster?.full_name || (venueView ? "An artist" : "A venue");
  const terms = wallTermsLine(wallDetails(item));
  const when = whenLine(item);
  const cover = item.images[0];
  return (
    <li className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface sm:flex-row">
      <button type="button" onClick={onOpen} aria-label={`Open ${item.title}`}
        className="grid shrink-0 place-items-center border-b-hair border-line bg-sunken sm:w-44 sm:border-b-0 sm:border-r-hair">
        {cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={cover} alt="" loading="lazy" className="max-h-44 w-full object-cover sm:h-full" />
          : <span className="flex h-28 items-center sm:h-full"><Avatar name={name} src={item.poster?.avatar_url} size="lg" /></span>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={item.raw?.request_type === "walls" ? "mango" : "neutral"}>{item.typeLabel}</Badge>
          {when && <span className="font-ui text-caption text-fg-3">{when}</span>}
        </div>
        <button type="button" onClick={onOpen} className="text-left focus-visible:outline-none">
          <h3 className="font-display text-h3 leading-tight text-fg hover:underline">{item.title}</h3>
        </button>
        <p className="flex min-w-0 items-center gap-1.5 font-ui text-body-sm text-fg-2">
          <span className="truncate font-semibold">{name}</span>
          {item.where && <><span aria-hidden className="text-fg-3">·</span><MapPin size={13} aria-hidden className="shrink-0 text-fg-3" /><span className="truncate">{item.where}</span></>}
        </p>
        {terms && <p className="font-ui text-body-sm text-fg-3">{terms}</p>}
        {!terms && item.description && <p className="line-clamp-2 font-ui text-body-sm text-fg-3">{item.description}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={onAct}>
            {venueView ? "Request works" : "Offer a work"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpen}>Details</Button>
        </div>
      </div>
    </li>
  );
}

// ── Honest empty state for artists ──────────────────────────────────
function QuietHere({ city, placeName, elsewhere, onEverywhere, onSuggest, ready, total }: {
  city: string; placeName: string; elsewhere: number; onEverywhere: () => void; onSuggest: () => void; ready: number; total: number;
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <span className="font-ui text-caption font-semibold uppercase tracking-wide text-fg-3">Early days</span>
      <h2 className="font-display text-h2 leading-tight text-fg">
        No venues are posting {city ? `in ${city}` : placeName} yet
      </h2>
      <p className="max-w-prose font-ui text-body text-fg-2">
        Artomango is new, and we&rsquo;re inviting cafés, bars and galleries now. Venues join for the art, so every ready work
        you add helps us bring them in. Get yours ready and you&rsquo;ll be first in line when they post.
      </p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink variant="primary" href={total === 0 ? "/dashboard/artworks/new" : "/dashboard/artworks"}>
          {total === 0 ? "Add your first work" : ready < total ? "Get more works ready" : "See your works"} <ArrowRight size={15} aria-hidden />
        </ButtonLink>
        <Button variant="secondary" onClick={onSuggest}><Store size={15} aria-hidden /> Suggest a café we should invite</Button>
      </div>
      {elsewhere > 0 && (
        <button type="button" onClick={onEverywhere} className="self-start font-ui text-body-sm font-semibold text-fg underline underline-offset-4">
          See {elsewhere} {elsewhere === 1 ? "place" : "places"} in other cities
        </button>
      )}
    </Card>
  );
}

// ── Your works, ready to place ──────────────────────────────────────
function ReadyCard({ works, ready, open, loading }: { works: PlaceArtwork[]; ready: number; open: number; loading: boolean }) {
  const todo = works.filter(a => !wallReady(a)).slice(0, 3);
  const pct = works.length ? Math.round((ready / works.length) * 100) : 0;
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-ui text-body font-semibold text-fg">Your works</h2>
        <Link href="/dashboard/artworks" className="font-ui text-caption font-semibold text-fg-2 hover:text-fg">All works</Link>
      </div>
      {loading ? <Skeleton className="h-16 w-full rounded-control" /> : works.length === 0 ? (
        <p className="font-ui text-body-sm text-fg-2">Add a work with a photo, its size and a price. That&rsquo;s all a venue needs to say yes.</p>
      ) : (
        <>
          <p className="font-ui text-body-sm text-fg-2">
            <span className="font-display text-h2 tabular-nums text-fg">{ready}</span> of {works.length} ready to place
            {open > 0 && <span className="text-fg-3"> · {open} open to a wall</span>}
          </p>
          <div className="h-2 overflow-hidden rounded-pill border-hair border-line bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Works ready to place">
            <div className="h-full bg-mango" style={{ width: `${pct}%` }} />
          </div>
          {todo.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line">
              {todo.map(a => (
                <li key={a.id}>
                  <Link href={`/dashboard/artworks/new?finish=${a.id}`} className="flex items-center gap-3 py-2.5 hover:bg-sunken">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-control border-hair border-line bg-sunken">
                      {a.images?.[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={a.images[0]} alt="" className="h-full w-full object-cover" />
                        : <ImageOff size={14} aria-hidden className="text-fg-3" />}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-ui text-body-sm font-semibold text-fg">{a.title}</span>
                      <span className="truncate font-ui text-caption text-fg-3">Add {missingForWall(a).join(", ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-1.5 font-ui text-body-sm text-ok"><Check size={15} aria-hidden /> Every work is ready.</p>
          )}
        </>
      )}
    </Card>
  );
}

// ── Suggest a café we should invite ─────────────────────────────────
function SuggestModal({ open, onClose, city }: { open: boolean; onClose: () => void; city: string }) {
  const [f, setF] = useState({ name: "", city: "", contact: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setF({ name: "", city, contact: "", note: "" }); setErr(""); setDone(false); } }, [open, city]);

  async function send() {
    if (!f.name.trim()) { setErr("Add the place's name."); return; }
    setBusy(true); setErr("");
    const { error } = await createClient().from("venue_suggestions").insert({
      name: f.name.trim().slice(0, 200), city: f.city.trim() || null, contact: f.contact.trim() || null, note: f.note.trim() || null,
    });
    setBusy(false);
    if (error) { setErr("That didn't send. Please try again."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <Modal open={open} onClose={onClose} size="sm" title="Thank you" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
        <p className="font-ui text-body text-fg-2">We&rsquo;ll reach out to {f.name.trim()}. If they join, they&rsquo;ll show up in Looking for art.</p>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title="Suggest a place we should invite"
      description="A café, bar, shop or gallery that would look good with art on its walls."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {err && <Alert tone="bad">{err}</Alert>}
        <Field label="Name">{p => <Input {...p} value={f.name} maxLength={200} placeholder="Café Lounge" onChange={e => setF(v => ({ ...v, name: e.target.value }))} />}</Field>
        <Field label="City">{p => <Input {...p} value={f.city} maxLength={120} onChange={e => setF(v => ({ ...v, city: e.target.value }))} />}</Field>
        <Field label="Website, Instagram or who to ask" hint="Optional">
          {p => <Input {...p} value={f.contact} maxLength={300} placeholder="@cafelounge or the owner's name" onChange={e => setF(v => ({ ...v, contact: e.target.value }))} />}
        </Field>
        <Field label="Anything we should know" hint="Optional">
          {p => <Textarea {...p} rows={3} maxLength={1000} value={f.note} onChange={e => setF(v => ({ ...v, note: e.target.value }))} />}
        </Field>
      </div>
    </Modal>
  );
}
