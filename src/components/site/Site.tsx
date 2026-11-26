"use client";
// A personal site: the public page of an artist or a venue, in the look
// they picked (accent, header, grid, type) and with the sections they
// turned on, in their order. Used by the public page and by the live
// preview in the editor, so what owners see is exactly what visitors get.
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Behance, Globe, ImageIcon, Instagram, Linkedin, MapPin, MessageSquare } from "./icons";
import { cn } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";
import {
  type SectionKey, type SiteConfig, type SiteData, type SiteWork, type WallEntry,
  SECTION_LABEL, accentOf, fmtRange, isCurrent, isSoldWork, isVenueRole, webHref,
} from "@/lib/site";
import { VenueSection, venueHas } from "./VenueSections";

type Props = {
  data: SiteData;
  site: SiteConfig;
  onOpenWork: (w: SiteWork) => void;
  onMessage: () => void;
  /** In the editor preview: no sticky bar, links stay on the page. */
  preview?: boolean;
  /** For a signed-in visitor: block or unblock this person (footer link). */
  onBlock?: () => void;
  blocked?: boolean;
};

// ── Look ────────────────────────────────────────────────────────────
export function siteStyle(site: SiteConfig): CSSProperties {
  const a = accentOf(site.accent);
  return {
    ["--site-accent" as string]: a.color,
    ["--site-on" as string]: a.on,
    ["--site-tint" as string]: `color-mix(in srgb, ${a.color} 12%, #FBF8F0)`,
  };
}

/** Headline in the site's type mood. */
export function H({ site, as: Tag = "h2", className, children }: { site: SiteConfig; as?: "h1" | "h2" | "h3"; className?: string; children: ReactNode }) {
  const classic = site.type === "classic";
  return (
    <Tag className={cn(classic ? "site-serif font-normal tracking-[-0.01em]" : "font-display font-extrabold tracking-[-0.02em]", "text-fg", className)}>
      {children}
    </Tag>
  );
}

export const wrap = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";
const accentBtn = "inline-flex h-11 items-center gap-2 rounded-pill bg-[var(--site-accent)] px-5 font-ui text-label font-semibold text-[var(--site-on)] transition hover:opacity-90";
const ghostBtn = "inline-flex h-11 items-center gap-2 rounded-pill border-hair border-ink px-5 font-ui text-label font-semibold text-fg transition hover:bg-[var(--site-tint)]";

export function SectionHead({ site, title, kicker, action }: { site: SiteConfig; title: string; kicker?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div className="flex flex-col gap-3">
        <span aria-hidden className="h-1 w-10 rounded-pill bg-[var(--site-accent)]" />
        {kicker && <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">{kicker}</span>}
        <H site={site} className="text-[34px] leading-[1.05] sm:text-[44px]">{title}</H>
      </div>
      {action}
    </div>
  );
}

function Img({ src, alt, className, fit = "contain" }: { src?: string | null; alt: string; className?: string; fit?: "contain" | "cover" }) {
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={alt} loading="lazy" className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain", className)} />
    : <span className="grid h-full w-full place-items-center text-fg-disabled"><ImageIcon size={28} aria-hidden /></span>;
}

function priceLine(w: SiteWork) {
  if (isSoldWork(w)) return "Sold";
  if ((w.status || "").toLowerCase() === "reserved") return "Reserved";
  if (w.sale_method === "not_for_sale") return "";
  if (w.sale_method === "price_on_request") return "Price on request";
  return formatPrice(w.price, w.currency);
}

function Caption({ w, center }: { w: SiteWork; center?: boolean }) {
  const p = priceLine(w);
  return (
    <span className={cn("flex flex-col gap-0.5 pt-3", center && "items-center text-center")}>
      <span className="font-ui text-body font-semibold text-fg">{w.title}</span>
      <span className="flex flex-wrap items-center gap-x-2 font-ui text-body-sm text-fg-3">
        {[w.year, w.medium].filter(Boolean).join(", ")}
        {p && (
          <span className={cn("inline-flex items-center gap-1.5 tabular-nums", p === "Sold" ? "text-fg-3" : "font-semibold text-fg")}>
            {p === "Sold" && <span aria-hidden className="h-2 w-2 rounded-pill bg-[var(--site-accent)]" />}{p}
          </span>
        )}
      </span>
    </span>
  );
}

// ── Grids ───────────────────────────────────────────────────────────
export function WorkGrid({ works, site, onOpen }: { works: SiteWork[]; site: SiteConfig; onOpen: (w: SiteWork) => void }) {
  if (site.grid === "salon") {
    return (
      <ul className="columns-2 gap-4 sm:gap-6 md:columns-3">
        {works.map(w => (
          <li key={w.id} className="mb-6 break-inside-avoid sm:mb-8">
            <button type="button" onClick={() => onOpen(w)} className="group block w-full text-left">
              <span className="block overflow-hidden bg-sunken">
                {w.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={w.images[0]} alt={w.title} loading="lazy" className="block h-auto w-full transition duration-500 group-hover:scale-[1.02]" />
                  : <span className="grid aspect-[4/5] place-items-center text-fg-disabled"><ImageIcon size={28} aria-hidden /></span>}
              </span>
              <Caption w={w} />
            </button>
          </li>
        ))}
      </ul>
    );
  }
  if (site.grid === "single") {
    return (
      <ul className="mx-auto flex max-w-[880px] flex-col gap-16 sm:gap-24">
        {works.map(w => (
          <li key={w.id}>
            <button type="button" onClick={() => onOpen(w)} className="group block w-full">
              <span className="block bg-sunken p-6 sm:p-12">
                {w.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={w.images[0]} alt={w.title} loading="lazy" className="mx-auto block max-h-[78vh] w-auto max-w-full" />
                  : <span className="grid aspect-[4/3] place-items-center text-fg-disabled"><ImageIcon size={32} aria-hidden /></span>}
              </span>
              <Caption w={w} center />
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {works.map(w => (
        <li key={w.id}>
          <button type="button" onClick={() => onOpen(w)} className="group block w-full text-left">
            <span className="relative block aspect-square overflow-hidden bg-sunken">
              <span className="absolute inset-0 p-4 transition duration-500 group-hover:p-3 sm:p-6 sm:group-hover:p-5"><Img src={w.images?.[0]} alt={w.title} /></span>
            </span>
            <Caption w={w} />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Headers ─────────────────────────────────────────────────────────
function Header({ data, site, heroImage, onWork, onMessage }: { data: SiteData; site: SiteConfig; heroImage: string | null; onWork: string; onMessage: () => void }) {
  const p = data.profile;
  const name = data.settings.store_name || (isVenueRole(p.role) ? p.venue_name : null) || p.full_name;
  const tagline = data.settings.tagline;
  const where = data.settings.show_location !== false ? p.location : null;
  const kicker = [isVenueRole(p.role) ? (p.venue_type || "Art venue") : "Artist", where].filter(Boolean).join(" · ");
  const buttons = (
    <div className="flex flex-wrap gap-3">
      <a href={onWork} className={accentBtn}>{isVenueRole(p.role) ? "See what's on" : "See the work"} <ArrowRight size={16} aria-hidden /></a>
      <button type="button" onClick={onMessage} className={ghostBtn}><MessageSquare size={15} aria-hidden /> Get in touch</button>
    </div>
  );

  if (site.header === "statement") {
    return (
      <header className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-[var(--site-accent)] sm:min-h-[640px]">
        {heroImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          </>
        )}
        <div className={cn(wrap, "flex flex-col gap-5 pb-12 pt-32 sm:pb-16", heroImage ? "text-white" : "text-[var(--site-on)]")}>
          <span className="font-ui text-caption font-semibold uppercase tracking-[0.14em] opacity-80">{kicker}</span>
          <H site={site} as="h1" className="max-w-[16ch] text-[52px] leading-[0.95] !text-current sm:text-[88px]">{name}</H>
          {tagline && <p className="max-w-[52ch] font-ui text-[18px] leading-relaxed opacity-90">{tagline}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <a href={onWork} className={cn("inline-flex h-11 items-center gap-2 rounded-pill px-5 font-ui text-label font-semibold transition hover:opacity-90", heroImage ? "bg-white text-fg" : "bg-[var(--site-on)] text-[var(--site-accent)]")}>
              {isVenueRole(p.role) ? "See what's on" : "See the work"} <ArrowRight size={16} aria-hidden />
            </a>
            <button type="button" onClick={onMessage} className="inline-flex h-11 items-center gap-2 rounded-pill border-hair border-current px-5 font-ui text-label font-semibold transition hover:bg-white/10">
              <MessageSquare size={15} aria-hidden /> Get in touch
            </button>
          </div>
        </div>
      </header>
    );
  }

  if (site.header === "split") {
    const pic = p.avatar_url || heroImage;
    return (
      <header className="border-b-hair border-line">
        <div className={cn(wrap, "grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-24")}>
          <div className="flex flex-col gap-6">
            <span className="font-ui text-caption font-semibold uppercase tracking-[0.14em] text-fg-3">{kicker}</span>
            <H site={site} as="h1" className="text-[48px] leading-[0.98] sm:text-[72px]">{name}</H>
            {tagline && <p className="max-w-[46ch] font-ui text-[18px] leading-relaxed text-fg-2">{tagline}</p>}
            {buttons}
          </div>
          <div className="relative">
            <span aria-hidden className="absolute -bottom-4 -right-4 h-full w-full rounded-[28px] bg-[var(--site-accent)]" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-sunken">
              {pic ? <Img src={pic} alt={name || ""} fit="cover" /> : (
                <span className="grid h-full place-items-center bg-[var(--site-tint)]">
                  <H site={site} as="h3" className="text-[120px] leading-none">{(name || "?")[0]}</H>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn(wrap, "flex flex-col items-center gap-5 py-20 text-center sm:py-28")}>
      <span className="font-ui text-caption font-semibold uppercase tracking-[0.14em] text-fg-3">{kicker}</span>
      <H site={site} as="h1" className="max-w-[18ch] text-[52px] leading-[0.98] sm:text-[84px]">{name}</H>
      <span aria-hidden className="h-1 w-16 rounded-pill bg-[var(--site-accent)]" />
      {tagline && <p className="max-w-[52ch] font-ui text-[18px] leading-relaxed text-fg-2">{tagline}</p>}
    </header>
  );
}

// ── Sections ────────────────────────────────────────────────────────
function Featured({ works, site, onOpen }: { works: SiteWork[]; site: SiteConfig; onOpen: (w: SiteWork) => void }) {
  const [main, ...rest] = works;
  return (
    <div className={cn("grid gap-6 sm:gap-8", rest.length > 0 && "md:grid-cols-[1.6fr_1fr]")}>
      <button type="button" onClick={() => onOpen(main)} className="group block text-left">
        <span className={cn("relative block bg-sunken", rest.length ? "aspect-[4/3]" : "aspect-[4/3] md:aspect-[2/1]")}><span className="absolute inset-0 p-6 sm:p-10"><Img src={main.images?.[0]} alt={main.title} /></span></span>
        <Caption w={main} />
      </button>
      {rest.length > 0 && (
        <div className="grid gap-6 sm:gap-8">
          {rest.map(w => (
            <button key={w.id} type="button" onClick={() => onOpen(w)} className="group block text-left">
              <span className="relative block aspect-[4/3] bg-sunken md:aspect-[5/3]"><span className="absolute inset-0 p-5"><Img src={w.images?.[0]} alt={w.title} /></span></span>
              <Caption w={w} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Filter = "all" | "available" | "sold";
function WorkSection({ works, site, onOpen }: { works: SiteWork[]; site: SiteConfig; onOpen: (w: SiteWork) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const sold = works.filter(isSoldWork);
  const available = works.filter(w => !isSoldWork(w) && w.sale_method !== "not_for_sale");
  const shown = filter === "sold" ? sold : filter === "available" ? available : works;
  const chips: [Filter, string, number][] = [["all", "All", works.length], ["available", "Available", available.length], ["sold", "Sold", sold.length]];
  return (
    <>
      <SectionHead site={site} title="Work" action={sold.length > 0 && available.length > 0 ? (
        <div role="group" aria-label="Show" className="flex gap-1 rounded-pill border-hair border-line p-1">
          {chips.map(([k, l, n]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={cn("h-9 rounded-pill px-4 font-ui text-label font-semibold transition", filter === k ? "bg-[var(--site-accent)] text-[var(--site-on)]" : "text-fg-2 hover:text-fg")}>
              {l} <span className="tabular-nums opacity-60">{n}</span>
            </button>
          ))}
        </div>
      ) : undefined} />
      <WorkGrid works={shown} site={site} onOpen={onOpen} />
    </>
  );
}

function ShowRow({ title, sub, when, image, href }: { title: string; sub?: string | null; when: string; image?: string | null; href?: string }) {
  const inner = (
    <>
      <span className="font-ui text-body-sm tabular-nums text-fg-3 sm:w-56 sm:shrink-0">{when}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-ui text-[17px] font-semibold text-fg">{title}</span>
        {sub && <span className="font-ui text-body-sm text-fg-3">{sub}</span>}
      </span>
      {image && <span className="hidden h-14 w-14 shrink-0 overflow-hidden bg-sunken sm:block"><Img src={image} alt="" fit="cover" /></span>}
    </>
  );
  const cls = "flex flex-col gap-1 border-t-hair border-line py-5 sm:flex-row sm:items-center sm:gap-6";
  return <li>{href ? <Link href={href} className={cn(cls, "hover:bg-[var(--site-tint)]")}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
}

function OnShow({ entries, site }: { entries: WallEntry[]; site: SiteConfig }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {entries.map(e => (
        <article key={e.deal_id} className="flex flex-col gap-5 rounded-[24px] bg-[var(--site-tint)] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 self-start rounded-pill bg-[var(--site-accent)] px-3 py-1 font-ui text-caption font-semibold text-[var(--site-on)]">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-pill bg-current" /> On show now
          </span>
          <H site={site} as="h3" className="text-[28px] leading-tight">{e.venue_name || "A venue"}</H>
          <span className="font-ui text-body-sm text-fg-2">{fmtRange(e.start_date, e.end_date)}</span>
          <div className="flex gap-3">
            {e.works.slice(0, 4).map(w => (
              <span key={w.id} className="h-20 w-20 overflow-hidden bg-surface p-1.5" title={w.title}><Img src={w.image} alt={w.title} /></span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function About({ data, site }: { data: SiteData; site: SiteConfig }) {
  const cv = site.cv || [];
  return (
    <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:gap-20">
      <div className="flex flex-col gap-6">
        {site.statement && <H site={site} as="h3" className="text-[26px] leading-snug sm:text-[32px]">&ldquo;{site.statement}&rdquo;</H>}
        {data.profile.bio && <p className="max-w-[62ch] whitespace-pre-line font-ui text-[17px] leading-relaxed text-fg-2">{data.profile.bio}</p>}
      </div>
      {cv.length > 0 && (
        <div className="flex flex-col gap-4">
          <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">CV</span>
          <ul className="flex flex-col">
            {cv.map((c, i) => (
              <li key={i} className="flex gap-6 border-t-hair border-line py-3 font-ui text-body">
                <span className="w-14 shrink-0 tabular-nums text-fg-3">{c.year}</span>
                <span className="text-fg">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Contact({ data, site, onMessage }: { data: SiteData; site: SiteConfig; onMessage: () => void }) {
  const p = data.profile;
  const links: [ReactNode, string, string][] = [];
  if (p.website) links.push([<Globe key="w" size={16} aria-hidden />, p.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), webHref(p.website)]);
  if (p.instagram) links.push([<Instagram key="i" size={16} aria-hidden />, `@${p.instagram.replace("@", "")}`, `https://instagram.com/${p.instagram.replace("@", "")}`]);
  if (p.behance) links.push([<Behance key="b" size={16} aria-hidden />, "Behance", p.behance.startsWith("http") ? p.behance : `https://behance.net/${p.behance}`]);
  if (p.linkedin) links.push([<Linkedin key="l" size={16} aria-hidden />, "LinkedIn", p.linkedin.startsWith("http") ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`]);
  const first = (p.full_name || "").split(" ")[0];
  return (
    <div className="grid gap-10 rounded-[28px] bg-[var(--site-accent)] p-8 text-[var(--site-on)] sm:p-14 md:grid-cols-[1.4fr_1fr] md:items-end">
      <div className="flex flex-col gap-5">
        <H site={site} className="text-[40px] leading-[1.02] !text-current sm:text-[56px]">
          {isVenueRole(p.role) ? "Want to show here?" : `Let's talk${first ? `, I'm ${first}` : ""}.`}
        </H>
        <p className="max-w-[44ch] font-ui text-[17px] leading-relaxed opacity-85">
          {isVenueRole(p.role) ? "Artists, curators and neighbours: send us a message." : "About a work, a commission or a show. I read every message."}
        </p>
        <button type="button" onClick={onMessage} className="inline-flex h-12 items-center gap-2 self-start rounded-pill bg-[var(--site-on)] px-6 font-ui text-label font-semibold text-[var(--site-accent)] transition hover:opacity-90">
          <MessageSquare size={16} aria-hidden /> Send a message
        </button>
      </div>
      {(links.length > 0 || p.location) && (
        <ul className="flex flex-col gap-3 font-ui text-body">
          {p.location && data.settings.show_location !== false && <li className="inline-flex items-center gap-2.5 opacity-90"><MapPin size={16} aria-hidden />{p.location}</li>}
          {links.map(([icon, label, href]) => (
            <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 underline-offset-4 hover:underline">{icon}{label}</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── The site ────────────────────────────────────────────────────────
export function Site({ data, site, onOpenWork, onMessage, preview, onBlock, blocked }: Props) {
  const p = data.profile;
  const venue = isVenueRole(p.role);
  const featured = useMemo(() => data.works.filter(w => w.featured).slice(0, 3), [data.works]);
  const nowOn = data.wall.filter(e => e.side === "artist" && isCurrent(e));
  const pastWall = data.wall.filter(e => e.side === "artist" && !isCurrent(e));
  const heroImage = data.settings.banner_url || featured[0]?.images?.[0] || data.works[0]?.images?.[0] || null;
  const name = data.settings.store_name || (venue ? p.venue_name : null) || p.full_name;

  const has = (k: SectionKey): boolean => {
    switch (k) {
      case "featured": return featured.length > 0;
      case "work": return data.works.length > 0;
      case "onshow": return nowOn.length > 0;
      case "about": return !!(p.bio || site.statement || site.cv?.length);
      case "shows": return data.shows.length + pastWall.length > 0;
      case "contact": return true;
      default: return venue && venueHas(k, data, site);
    }
  };
  const sections = site.sections.filter(s => s.on && has(s.key)).map(s => s.key);
  const navKeys = sections.filter(k => k !== "featured" && k !== "contact").slice(0, 4);
  const firstWork = sections.find(k => k === "work" || k === "featured" || k === "onwalls" || k === "collection") || sections[0];

  function render(k: SectionKey): ReactNode {
    switch (k) {
      case "featured": return <><SectionHead site={site} title="Featured" /><Featured works={featured} site={site} onOpen={onOpenWork} /></>;
      case "work": return <WorkSection works={data.works} site={site} onOpen={onOpenWork} />;
      case "onshow": return <><SectionHead site={site} title="On show now" /><OnShow entries={nowOn} site={site} /></>;
      case "about": return <><SectionHead site={site} title="About" /><About data={data} site={site} /></>;
      case "shows": return (
        <>
          <SectionHead site={site} title="Exhibitions" />
          <ul className="border-b-hair border-line">
            {[
              ...data.shows.map(s => ({ key: s.id, title: s.title, sub: s.venue, when: fmtRange(s.start_date, s.end_date), image: s.cover_image, date: s.start_date || "" })),
              ...pastWall.map(e => ({ key: e.deal_id, title: e.venue_name || "Show", sub: e.works.map(w => w.title).join(", "), when: fmtRange(e.start_date, e.end_date), image: e.works[0]?.image, date: e.start_date || "" })),
            ].sort((a, b) => b.date.localeCompare(a.date)).map(r => <ShowRow key={r.key} title={r.title} sub={r.sub} when={r.when} image={r.image} />)}
          </ul>
        </>
      );
      case "contact": return <Contact data={data} site={site} onMessage={onMessage} />;
      default: return <VenueSection k={k} data={data} site={site} onOpenWork={onOpenWork} preview={preview} />;
    }
  }

  return (
    <div style={siteStyle(site)} className="min-h-screen bg-page text-fg">
      <nav className={cn("z-nav border-b-hair border-line bg-page/90 backdrop-blur", !preview && "sticky top-0")}>
        <div className={cn(wrap, "flex h-16 items-center gap-6")}>
          <a href="#top" className="min-w-0 truncate"><H site={site} as="h3" className="text-[22px] leading-none">{name}</H></a>
          <ul className="ml-auto hidden items-center gap-1 md:flex">
            {navKeys.map(k => (
              <li key={k}><a href={`#${k}`} className="rounded-pill px-3 py-2 font-ui text-label font-semibold text-fg-2 hover:text-fg">{SECTION_LABEL[k]}</a></li>
            ))}
          </ul>
          <button type="button" onClick={onMessage} className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-pill bg-[var(--site-accent)] px-4 font-ui text-label font-semibold text-[var(--site-on)] md:ml-2">
            Contact
          </button>
        </div>
      </nav>

      <main id="top">
        <Header data={data} site={site} heroImage={heroImage} onWork={`#${firstWork || "contact"}`} onMessage={onMessage} />
        {sections.map((k, i) => (
          <section key={k} id={k} className={cn("scroll-mt-20 py-16 sm:py-24", i > 0 && k !== "contact" && "border-t-hair border-line")}>
            <div className={wrap}>{render(k)}</div>
          </section>
        ))}
      </main>

      <footer className="border-t-hair border-line">
        <div className={cn(wrap, "flex flex-col gap-3 py-8 font-ui text-body-sm text-fg-3 sm:flex-row sm:items-center sm:justify-between")}>
          <span suppressHydrationWarning>© {new Date().getFullYear()} {name}</span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="/register" className="inline-flex items-center gap-1.5 hover:text-fg">Made with <span className="font-semibold text-fg">Artomango</span></a>
            <a href="/report" onClick={e => { e.currentTarget.href = `/report?url=${encodeURIComponent(window.location.href)}`; }} className="hover:text-fg">Report</a>
            {onBlock && <button type="button" onClick={onBlock} className="hover:text-fg">{blocked ? "Unblock" : "Block"}</button>}
          </span>
        </div>
      </footer>
    </div>
  );
}
