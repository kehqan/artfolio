"use client";
// "Your walls": a venue's Studio. Everything about the walls in one place:
//   On now      – what hangs today (from signed deals)
//   Coming up   – signed, starting later
//   Open calls  – your "Art for our walls" posts, with offers and a close button
//   Wall history – every artist who has shown here
// Artists who land here by mistake get pointed to their works.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ImageIcon, Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton, cn } from "@/components/ui";
import { PostFlow } from "../scene/PostFlow";
import { wallTermsLine, type WallDetails } from "../scene/feed";
import { type WallEntry, fmtRange, isVenueRole } from "@/lib/site";
import { type VenueData, type WallPost, loadVenue, shortRange } from "@/lib/venue";

export default function WallsPage() {
  const [v, setV] = useState<VenueData | null>(null);
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const data = await loadVenue(sb, user.id, { works: 0 });
    setRole(data?.profile.role ?? null);
    if (data) setV(data); else setError("This didn't load. Please refresh the page.");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setPostStatus(p: WallPost, status: "open" | "closed") {
    setBusy(p.id); setError("");
    const { error: err } = await createClient().from("pool_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", p.id);
    setBusy(null);
    if (err) { setError("That didn't change. Please try again."); return; }
    setV(prev => prev && { ...prev, posts: prev.posts.map(x => (x.id === p.id ? { ...x, status } : x)) });
  }

  if (role !== undefined && role !== null && !isVenueRole(role)) {
    return (
      <EmptyState icon={<ImageIcon size={22} aria-hidden />} title="This page is for venues"
        description="Your works and where they can go live in Studio."
        action={<ButtonLink href="/dashboard/artworks" variant="secondary">Go to your works</ButtonLink>} />
    );
  }

  const open = v?.posts.filter(p => (p.status || "open") === "open") || [];
  const closed = v?.posts.filter(p => (p.status || "open") !== "open") || [];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Your walls"
        description="What hangs now, what you're asking for, and every artist who has shown with you."
        actions={<Button variant="primary" onClick={() => setPosting(true)}><Plus size={16} aria-hidden /> Post your walls</Button>}
      />
      {error && <Alert tone="bad">{error}</Alert>}

      {/* ── On now ── */}
      <Section title="On your walls now" count={v?.now.length}>
        {!v ? <Skeleton className="h-56 w-full rounded-card" /> : v.now.length ? (
          <div className="flex flex-col gap-4">{v.now.map(e => <ShowCard key={e.deal_id} e={e} live />)}</div>
        ) : (
          <Card padding="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="font-ui text-body font-semibold text-fg">Your walls are free</h3>
              <p className="max-w-prose font-ui text-body-sm text-fg-2">When you and an artist both sign an agreement, the show appears here and on your public page.</p>
            </div>
            <ButtonLink href="/dashboard/looking" variant="secondary" className="shrink-0">Find artists <ArrowRight size={15} aria-hidden /></ButtonLink>
          </Card>
        )}
      </Section>

      {v && v.next.length > 0 && (
        <Section title="Coming up" count={v.next.length}>
          <div className="flex flex-col gap-4">{v.next.map(e => <ShowCard key={e.deal_id} e={e} />)}</div>
        </Section>
      )}

      {/* ── Open calls ── */}
      <Section title="Open calls" count={v ? open.length : undefined}
        hint="Artists see these in Looking for art and on your page, and can offer work in one tap.">
        {!v ? <Skeleton className="h-28 w-full rounded-card" /> : open.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {open.map(p => <PostCard key={p.id} p={p} busy={busy === p.id} onClose={() => setPostStatus(p, "closed")} />)}
          </ul>
        ) : (
          <EmptyState icon={<Store size={22} aria-hidden />} title="No open call right now"
            description="Say how much wall you have, for how long, and if guests can buy. Artists near you can offer work straight away."
            action={<Button variant="secondary" onClick={() => setPosting(true)}><Plus size={15} aria-hidden /> Post your walls</Button>} />
        )}
        {closed.length > 0 && (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none font-ui text-body-sm font-semibold text-fg-2 hover:text-fg">
              {closed.length} closed {closed.length === 1 ? "call" : "calls"} <span className="group-open:hidden">· show</span>
            </summary>
            <ul className="mt-3 flex flex-col divide-y divide-line rounded-card border-hair border-line bg-surface">
              {closed.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-ui text-body-sm font-semibold text-fg">{p.title}</span>
                    <span className="font-ui text-caption text-fg-3">{p.status === "matched" ? "Filled" : "Closed"} · posted {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </span>
                  <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => setPostStatus(p, "open")}>Open again</Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      {/* ── History ── */}
      <Section title="Wall history" count={v?.past.length}>
        {!v ? <Skeleton className="h-28 w-full rounded-card" /> : v.past.length ? (
          <ol className="flex flex-col divide-y divide-line rounded-card border-hair border-line bg-surface">
            {v.past.map(e => (
              <li key={e.deal_id} className="flex items-center gap-4 px-4 py-3.5">
                <Thumbs e={e} size="h-12 w-12" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Artist e={e} className="font-ui text-body-sm font-semibold text-fg" />
                  <span className="truncate font-ui text-caption text-fg-3">{e.works.map(w => w.title).join(", ")}</span>
                </span>
                <span className="hidden shrink-0 font-ui text-caption tabular-nums text-fg-3 sm:block">{fmtRange(e.start_date, e.end_date)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-ui text-body-sm text-fg-3">Every show you finish through Artomango is kept here, and on your public page as your wall history.</p>
        )}
      </Section>

      <PostFlow open={posting} start="walls" onClose={() => setPosting(false)} onPosted={load} />
    </div>
  );
}

function Section({ title, count, hint, children }: { title: string; count?: number; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-baseline gap-2 font-display text-h2 leading-tight text-fg">
          {title}{!!count && <span className="font-ui text-body font-semibold tabular-nums text-fg-3">{count}</span>}
        </h2>
        {hint && <p className="font-ui text-body-sm text-fg-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Artist({ e, className }: { e: WallEntry; className?: string }) {
  const name = e.other_name || "An artist";
  return e.other_username
    ? <Link href={`/${e.other_username}`} className={cn("truncate hover:underline hover:underline-offset-4", className)}>{name}</Link>
    : <span className={cn("truncate", className)}>{name}</span>;
}

function Thumbs({ e, size }: { e: WallEntry; size: string }) {
  const list = e.works.length ? e.works : [{ id: "x", title: "", image: null }];
  return (
    <span className="flex shrink-0 -space-x-3">
      {list.slice(0, 3).map(w => (
        <span key={w.id} className={cn("block overflow-hidden rounded-control border-2 border-surface bg-sunken", size)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {w.image && <img src={w.image} alt="" className="h-full w-full object-cover" />}
        </span>
      ))}
    </span>
  );
}

function ShowCard({ e, live }: { e: WallEntry; live?: boolean }) {
  return (
    <article className="grid overflow-hidden rounded-card border-hair border-line bg-surface md:grid-cols-[1.3fr_1fr]">
      <div className={cn("grid gap-px bg-line", e.works.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {(e.works.length ? e.works : [{ id: "x", title: "", image: null }]).slice(0, 4).map(w => (
          <Link key={w.id} href={w.id !== "x" ? `/artwork/${w.id}/passport` : "#"} className="relative block aspect-[4/3] bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {w.image && <img src={w.image} alt={w.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-4" />}
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        {live
          ? <Badge tone="mango" className="self-start">On now</Badge>
          : <Badge className="self-start">{shortRange(e)}</Badge>}
        <Artist e={e} className="font-display text-h2 leading-tight text-fg" />
        <p className="font-ui text-body-sm text-fg-2">{e.works.map(w => w.title).join(", ")}</p>
        <p className="font-ui text-body-sm tabular-nums text-fg-3">{fmtRange(e.start_date, e.end_date)}</p>
        <Link href={`/dashboard/messages?tab=deals&deal=${e.deal_id}`} className="mt-auto inline-flex items-center gap-1 font-ui text-label font-semibold text-fg-2 hover:text-fg">
          Deal and agreement <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function PostCard({ p, busy, onClose }: { p: WallPost; busy: boolean; onClose: () => void }) {
  const terms = wallTermsLine((p.details || {}) as WallDetails);
  return (
    <li className="flex flex-col overflow-hidden rounded-card border-hair border-line bg-surface">
      {p.cover_image && (
        <span className="relative block aspect-[2/1] bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.cover_image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </span>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="mango">Art for our walls</Badge>
          <span className="font-ui text-caption text-fg-3">Posted {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        </div>
        <h3 className="font-display text-h3 leading-tight text-fg">{p.title}</h3>
        {terms && <p className="font-ui text-body-sm text-fg-2">{terms}</p>}
        {p.location && <p className="truncate font-ui text-caption text-fg-3">{p.location}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {p.offers
            ? <ButtonLink href="/dashboard/messages?tab=deals" size="sm" variant="primary">See {p.offers} {p.offers === 1 ? "offer" : "offers"}</ButtonLink>
            : <span className="mr-auto font-ui text-body-sm text-fg-3">No offers yet</span>}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>Close it</Button>
        </div>
      </div>
    </li>
  );
}
