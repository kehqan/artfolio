"use client";
// Venue sections of a personal site: how the place sees art, what hangs
// now, every artist who has hung there, the collection, the space and
// open calls for artists.
import Link from "next/link";
import { ArrowRight, Clock, ImageIcon, MapPin } from "lucide-react";
import { cn } from "@/components/ui";
import { type SectionKey, type SiteConfig, type SiteData, type SiteWork, type WallEntry, fmtRange, isCurrent } from "@/lib/site";
import { H, SectionHead, WorkGrid } from "./Site";

const now = (d: SiteData) => d.wall.filter(e => e.side === "venue" && isCurrent(e));
const all = (d: SiteData) => d.wall.filter(e => e.side === "venue");

export function venueHas(k: SectionKey, data: SiteData, site: SiteConfig): boolean {
  switch (k) {
    case "perspective": return !!(site.perspective || data.profile.bio || data.profile.art_styles_sought?.length);
    case "onwalls": return now(data).length > 0;
    case "calls": return data.calls.length > 0;
    case "history": return all(data).length + data.shows.length > 0;
    case "collection": return data.works.length > 0;
    case "space": return !!(site.space_images?.length || site.space_note || site.hours);
    default: return false;
  }
}

function Pic({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  return (
    <span className={cn("block overflow-hidden bg-sunken", className)}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-fg-disabled"><ImageIcon size={22} aria-hidden /></span>}
    </span>
  );
}

function Artist({ e, preview }: { e: WallEntry; preview?: boolean }) {
  const name = e.other_name || "An artist";
  return e.other_username && !preview
    ? <Link href={`/${e.other_username}`} className="underline-offset-4 hover:underline">{name}</Link>
    : <>{name}</>;
}

function Perspective({ data, site }: { data: SiteData; site: SiteConfig }) {
  const tags = data.profile.art_styles_sought || [];
  return (
    <div className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:gap-20">
      <div className="flex flex-col gap-6">
        <span aria-hidden className="h-1 w-10 rounded-pill bg-[var(--site-accent)]" />
        <H site={site} className="text-[32px] leading-[1.15] sm:text-[44px]">{site.perspective || "The art we love to show."}</H>
      </div>
      <div className="flex flex-col gap-6 md:pt-6">
        {data.profile.bio && <p className="whitespace-pre-line font-ui text-[17px] leading-relaxed text-fg-2">{data.profile.bio}</p>}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map(t => <li key={t} className="rounded-pill border-hair border-ink px-3.5 py-1.5 font-ui text-body-sm font-semibold text-fg">{t}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function OnWalls({ entries, site, preview }: { entries: WallEntry[]; site: SiteConfig; preview?: boolean }) {
  return (
    <div className="flex flex-col gap-10">
      {entries.map(e => (
        <article key={e.deal_id} className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className={cn("grid gap-3", e.works.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {e.works.slice(0, 4).map(w => (
              <span key={w.id} className="relative block aspect-square bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.image ? <img src={w.image} alt={w.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-4" /> : null}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <span className="inline-flex items-center gap-2 self-start rounded-pill bg-[var(--site-accent)] px-3 py-1 font-ui text-caption font-semibold text-[var(--site-on)]">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-pill bg-current" /> On our walls now
            </span>
            <H site={site} as="h3" className="text-[36px] leading-tight sm:text-[48px]"><Artist e={e} preview={preview} /></H>
            <span className="font-ui text-body text-fg-2">{e.works.map(w => w.title).join(", ")}</span>
            <span className="font-ui text-body-sm tabular-nums text-fg-3">{fmtRange(e.start_date, e.end_date)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function Calls({ data, site, preview }: { data: SiteData; site: SiteConfig; preview?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {data.calls.map(c => {
        const d = (c.details || {}) as { wall?: string; duration?: string; sells?: boolean; commission?: number };
        const facts = [d.wall, d.duration, d.sells === true ? `Sells work${d.commission != null ? `, ${d.commission}% commission` : ""}` : d.sells === false ? "Display only" : null].filter(Boolean);
        return (
          <article key={c.id} className="flex flex-col gap-4 rounded-[24px] border-hair border-ink bg-surface p-6 sm:p-8">
            <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">Looking for art</span>
            <H site={site} as="h3" className="text-[26px] leading-tight">{c.title}</H>
            {c.description && <p className="line-clamp-3 font-ui text-body text-fg-2">{c.description}</p>}
            {facts.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {facts.map(f => <li key={f as string} className="rounded-pill bg-[var(--site-tint)] px-3 py-1 font-ui text-body-sm text-fg">{f}</li>)}
              </ul>
            )}
            <Link href={preview ? "#" : "/dashboard/looking"} className="mt-auto inline-flex h-11 items-center gap-2 self-start rounded-pill bg-[var(--site-accent)] px-5 font-ui text-label font-semibold text-[var(--site-on)] transition hover:opacity-90">
              Offer a work <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function History({ data, preview }: { data: SiteData; preview?: boolean }) {
  type Row = { key: string; date: string; when: string; who: React.ReactNode; what: string; images: (string | null)[] };
  const rows: Row[] = [
    ...all(data).map(e => ({ key: e.deal_id, date: e.start_date || "", when: fmtRange(e.start_date, e.end_date), who: <Artist e={e} preview={preview} />, what: e.works.map(w => w.title).join(", "), images: e.works.map(w => w.image) })),
    ...data.shows.map(s => ({ key: s.id, date: s.start_date || "", when: fmtRange(s.start_date, s.end_date), who: <>{s.title}</>, what: s.description || "", images: [s.cover_image || null] })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const years = Array.from(new Set(rows.map(r => r.date.slice(0, 4) || "Earlier")));
  return (
    <div className="flex flex-col gap-12">
      {years.map(y => (
        <div key={y} className="grid gap-6 md:grid-cols-[160px_1fr]">
          <span className="font-display text-[40px] font-extrabold leading-none tabular-nums text-fg">{y}</span>
          <ol className="flex flex-col">
            {rows.filter(r => (r.date.slice(0, 4) || "Earlier") === y).map(r => (
              <li key={r.key} className="flex items-center gap-5 border-t-hair border-line py-5">
                <span className="flex shrink-0 -space-x-3">
                  {(r.images.filter(Boolean).length ? r.images.filter(Boolean) : [null]).slice(0, 3).map((src, i) => <Pic key={i} src={src} alt="" className="h-14 w-14 rounded-pill border-2 border-page" />)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-ui text-[17px] font-semibold text-fg">{r.who}</span>
                  {r.what && <span className="truncate font-ui text-body-sm text-fg-3">{r.what}</span>}
                </span>
                <span className="hidden shrink-0 font-ui text-body-sm tabular-nums text-fg-3 sm:block">{r.when}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function Space({ data, site }: { data: SiteData; site: SiteConfig }) {
  const imgs = site.space_images || [];
  return (
    <div className="flex flex-col gap-10">
      {imgs.length > 0 && (
        <div className={cn("grid gap-3 sm:gap-4", imgs.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3")}>
          {imgs.slice(0, 6).map((src, i) => (
            <Pic key={src} src={src} alt="" className={cn("rounded-[18px]", imgs.length === 1 ? "aspect-[2/1]" : i === 0 && imgs.length > 2 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square")} />
          ))}
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        {site.space_note && <p className="whitespace-pre-line font-ui text-[17px] leading-relaxed text-fg-2">{site.space_note}</p>}
        <ul className="flex flex-col gap-3 font-ui text-body text-fg">
          {data.profile.location && data.settings.show_location !== false && <li className="flex gap-3"><MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-fg-3" />{data.profile.location}</li>}
          {site.hours && <li className="flex gap-3"><Clock size={18} aria-hidden className="mt-0.5 shrink-0 text-fg-3" /><span className="whitespace-pre-line">{site.hours}</span></li>}
        </ul>
      </div>
    </div>
  );
}

export function VenueSection({ k, data, site, onOpenWork, preview }: { k: SectionKey; data: SiteData; site: SiteConfig; onOpenWork: (w: SiteWork) => void; preview?: boolean }) {
  switch (k) {
    case "perspective": return <Perspective data={data} site={site} />;
    case "onwalls": return <><SectionHead site={site} title="On our walls now" /><OnWalls entries={now(data)} site={site} preview={preview} /></>;
    case "calls": return <><SectionHead site={site} title="Open calls" kicker="For artists" /><Calls data={data} site={site} preview={preview} /></>;
    case "history": return <><SectionHead site={site} title="Wall history" kicker={`${all(data).length + data.shows.length} shows so far`} /><History data={data} preview={preview} /></>;
    case "collection": return <><SectionHead site={site} title="Collection" /><WorkGrid works={data.works} site={site} onOpen={onOpenWork} /></>;
    case "space": return <><SectionHead site={site} title="The space" /><Space data={data} site={site} /></>;
    default: return null;
  }
}
