"use client";
// The landing page. It shows, step by step, how little an artist has to
// do: add a work, make it your site, offer it to a wall, agree and sell.
// Every number or name on it is real; the small app moments are examples.
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CampaignCarousel from "@/components/CampaignCarousel";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink, cn } from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, formatPrice, publicWrap, textLink } from "@/components/public/PublicChrome";
import { AddWorkMoment, DealMoment, OfferMoment, SiteMoment } from "@/components/landing/Moments";

type Artwork = {
  id: string; title: string; medium?: string | null; price?: number | null; currency?: string | null; images?: string[] | null;
  user_id?: string; artist_name?: string; artist_username?: string | null;
};

const wrap = publicWrap;

const PROMISES = [
  { title: "You choose what's shown", body: "Your works, in the order you pick. Nothing is pushed up or buried." },
  { title: "No algorithm, no AI", body: "No ranking, no feed to keep up with, nothing written or judged by a machine." },
  { title: "Free to start", body: "Make your page and add your work without paying anything." },
];

const STEPS = [
  { n: "1", title: "Add a work", body: "A photo and a title is enough. Size and price can wait until you know them.", Moment: AddWorkMoment },
  { n: "2", title: "Make it your site", body: "Pick a colour, a header and a layout. Every choice is designed to look good, so you can't get it wrong.", Moment: () => <SiteMoment /> },
  { n: "3", title: "Offer it to a wall", body: "See the cafés and venues looking for art right now, and offer a work in one tap.", Moment: OfferMoment },
  { n: "4", title: "Agree and sell", body: "A one-page agreement, signed in the app. When it sells, record it in a few taps and see what you keep.", Moment: DealMoment },
];

const VENUE_POINTS = [
  "Post your wall: size, how long, and whether work can sell.",
  "Artists offer works with photos, sizes and prices attached.",
  "Pick one, sign a one-page agreement, and hang it.",
];

export default function HomePage() {
  const [works, setWorks] = useState<Artwork[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from("artworks")
        .select("id,title,medium,price,currency,images,user_id")
        .in("status", ["available", "Available"]).not("images", "is", null)
        .order("created_at", { ascending: false }).limit(24);
      const rows = ((data || []) as Artwork[]).filter(a => a.images?.[0]);
      if (rows.length) {
        const ids = Array.from(new Set(rows.map(a => a.user_id).filter(Boolean))) as string[];
        const { data: ps } = await sb.from("profiles").select("id,full_name,username").in("id", ids);
        const pm = new Map((ps || []).map(p => [p.id as string, p as { full_name: string | null; username: string | null }]));
        setWorks(rows.map(a => ({ ...a, artist_name: pm.get(a.user_id!)?.full_name || "", artist_username: pm.get(a.user_id!)?.username || null })));
      }
      setLoaded(true);
    })();
  }, []);

  const hero = works[0];
  const grid = works.slice(0, works.length >= 8 ? 8 : 4);

  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader />

      <main>
        {/* ── Top ── */}
        <section className={cn(wrap, "grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-24")}>
          <div className="flex flex-col gap-7">
            <span className="inline-flex items-center gap-2 self-start rounded-pill border-hair border-ink bg-surface px-3 py-1 font-ui text-caption font-semibold text-fg">
              <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-mango ring-1 ring-ink" /> Made with artists
            </span>
            <h1 className="max-w-[12ch] font-display text-[52px] font-extrabold leading-[0.95] tracking-[-0.01em] text-fg sm:text-[76px]">
              Made for artists, not&nbsp;algorithms.
            </h1>
            <p className="max-w-[44ch] font-ui text-lead text-fg-2">
              Show your work, find it a wall and sell it, in a few simple steps. No algorithm deciding who sees you, no AI, nothing to keep up with.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" variant="primary">Create your free page <ArrowRight size={16} aria-hidden /></ButtonLink>
              <ButtonLink href="/register?role=venue" variant="secondary">I run a venue</ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]">
            <span aria-hidden className="absolute -right-3 -top-3 hidden h-24 w-24 rounded-pill bg-mango sm:block" />
            <SiteMoment image={hero?.images?.[0]} name={hero?.artist_name || "Your name"} className="relative" />
            {hero && (
              <p className="mt-3 px-1 font-ui text-caption text-fg-3">
                On the page: <Link href={hero.artist_username ? `/${hero.artist_username}` : "/explore"} className="font-semibold text-fg-2 underline-offset-4 hover:underline">{hero.title}</Link>
                {hero.artist_name ? `, by ${hero.artist_name}` : ""}, from Artomango.
              </p>
            )}
          </div>
        </section>

        {/* ── Promises ── */}
        <section aria-label="Our promises" className="border-y-hair border-line bg-surface">
          <ul className={cn(wrap, "grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0")}>
            {PROMISES.map(p => (
              <li key={p.title} className="flex gap-4 py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill border-hair border-ink bg-mango text-on-mango"><Check size={14} strokeWidth={3} aria-hidden /></span>
                <span className="flex flex-col gap-1">
                  <span className="font-ui text-body font-semibold text-fg">{p.title}</span>
                  <span className="font-ui text-body-sm text-fg-2">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── How easy it is ── */}
        <section id="how" className={cn(wrap, "scroll-mt-20 py-20 lg:py-28")}>
          <div className="mb-14 flex max-w-[640px] flex-col gap-3">
            <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">How it works</span>
            <h2 className="font-display text-[40px] font-extrabold leading-[1.02] text-fg sm:text-[56px]">This is how easy it is.</h2>
            <p className="font-ui text-lead text-fg-2">Four steps, one question at a time. Skip anything you don&rsquo;t know yet.</p>
          </div>
          <ol className="flex flex-col gap-16 lg:gap-24">
            {STEPS.map(({ n, title, body, Moment }, k) => (
              <li key={n} className="grid items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20">
                <div className={cn("flex flex-col gap-4", k % 2 === 1 && "md:order-2")}>
                  <span className="grid h-12 w-12 place-items-center rounded-pill border-outline border-ink bg-surface font-display text-h3 text-fg">{n}</span>
                  <h3 className="font-display text-[32px] font-extrabold leading-tight text-fg sm:text-[40px]">{title}</h3>
                  <p className="max-w-[40ch] font-ui text-lead text-fg-2">{body}</p>
                </div>
                <div className={cn("mx-auto w-full max-w-[460px]", k % 2 === 1 && "md:order-1")}><Moment /></div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── For venues ── */}
        <section id="venues" className="scroll-mt-20 bg-inverse py-20 lg:py-24">
          <div className={cn(wrap, "grid gap-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-16")}>
            <div className="flex flex-col gap-4">
              <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-on-inverse opacity-70">For cafés, bars, shops and galleries</span>
              <h2 className="font-display text-[40px] font-extrabold leading-[1.02] text-on-inverse sm:text-[56px]">Have walls? Show local artists.</h2>
              <p className="max-w-[42ch] font-ui text-lead text-on-inverse opacity-80">Fresh art on your walls, changed when you like, at no cost to you.</p>
              <div className="pt-2"><ButtonLink href="/register?role=venue" variant="primary">Post your wall <ArrowRight size={16} aria-hidden /></ButtonLink></div>
            </div>
            <ol className="flex flex-col gap-3">
              {VENUE_POINTS.map((t, k) => (
                <li key={t} className="flex items-start gap-4 rounded-card border-hair border-[rgba(255,255,255,0.18)] p-5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-mango font-display text-body font-extrabold text-on-mango">{k + 1}</span>
                  <span className="pt-1 font-ui text-body text-on-inverse">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Real work ── */}
        {loaded && grid.length >= 4 && (
          <section id="explore" className={cn(wrap, "py-20 lg:py-24")}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-[36px] font-extrabold leading-tight text-fg sm:text-[44px]">Fresh from the studios</h2>
              <Link href="/explore" className={textLink}>See everything <ArrowRight size={14} aria-hidden /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {grid.map(aw => (
                <Link key={aw.id} href={aw.artist_username ? `/${aw.artist_username}` : "/explore"}
                  className="group flex flex-col gap-2.5">
                  <Mat src={aw.images?.[0]} alt={aw.title} className="aspect-[4/5] rounded-card border-hair border-line transition-[border-color,box-shadow] duration-base group-hover:border-ink group-hover:shadow-hard-2" />
                  <span className="flex flex-col gap-0.5 px-0.5">
                    <span className="truncate font-ui text-body-sm font-semibold text-fg">{aw.title}</span>
                    <span className="truncate font-ui text-caption text-fg-3">{[aw.artist_name, aw.price ? formatPrice(aw.price, aw.currency) : null].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <CampaignCarousel />

        {/* ── Close ── */}
        <section className="border-t-hair border-line bg-mango py-20 lg:py-24">
          <div className={cn(wrap, "flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between")}>
            <h2 className="max-w-[18ch] font-display text-[40px] font-extrabold leading-[1.02] text-on-mango sm:text-[56px]">
              Your art deserves a better home than a spreadsheet and a feed.
            </h2>
            <ButtonLink href="/register" variant="secondary" className="shrink-0">Create your free page <ArrowRight size={16} aria-hidden /></ButtonLink>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
