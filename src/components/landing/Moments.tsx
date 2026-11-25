"use client";
// Small, honest pieces of the real app for the landing page. Each one
// plays its few steps on a loop so a visitor sees how little there is to
// do. With reduced motion, each shows its finished state and stays still.
import { useEffect, useState } from "react";
import { ArrowRight, Check, ImagePlus, MapPin } from "lucide-react";
import { cn } from "@/components/ui";

function useCycle(steps: number, ms = 1400) {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setStill(true); setI(steps - 1); return; }
    const t = setInterval(() => setI(x => (x + 1) % steps), ms);
    return () => clearInterval(t);
  }, [steps, ms]);
  return { i, still };
}

/** A painted stand-in for a work, used only where no real work is shown. */
export function Painting({ tone = "dusk", className }: { tone?: "dusk" | "sea" | "field" | "clay"; className?: string }) {
  const bg: Record<string, string> = {
    dusk: "linear-gradient(180deg,#2f4b6e 0%,#7a6a8c 48%,#e6a15a 74%,#2b3340 76%,#1d2430 100%)",
    sea: "linear-gradient(180deg,#d9e4e8 0%,#9fbccb 45%,#3f6e8a 46%,#1f425a 100%)",
    field: "linear-gradient(180deg,#f2e3c2 0%,#e8c98a 55%,#6f8a4a 56%,#4e6b3a 100%)",
    clay: "radial-gradient(circle at 35% 40%,#f0c9a8 0 18%,transparent 19%),linear-gradient(135deg,#c2553a,#8a3a2a)",
  };
  return <span aria-hidden className={cn("block", className)} style={{ background: bg[tone] }} />;
}

function Frame({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("relative overflow-hidden rounded-card border-hair border-ink bg-surface shadow-hard-2", className)}>
      {children}
    </div>
  );
}

// ── 1. Add a work ──────────────────────────────────────────────────
export function AddWorkMoment() {
  const { i } = useCycle(4, 1300);
  const title = "Evening, harbour";
  return (
    <Frame label="Adding a work: a photo, a title, and it's ready" className="p-5">
      <div className="mb-4 flex gap-1">{[0, 1, 2].map(k => <span key={k} className={cn("h-1 flex-1 rounded-pill transition-colors duration-500", k < i ? "bg-ink" : k === i ? "bg-mango" : "bg-line")} />)}</div>
      <p className="mb-3 font-display text-h3 leading-tight text-fg">{i === 0 ? "Add a photo" : i === 1 ? "What's it called?" : "Ready to place"}</p>
      <div className="flex gap-4">
        <span className="relative grid aspect-[4/5] w-28 shrink-0 place-items-center overflow-hidden rounded-control border-hair border-dashed border-line-strong bg-sunken">
          <ImagePlus size={22} aria-hidden className="text-fg-3" />
          <Painting tone="dusk" className={cn("absolute inset-2 rounded-[6px] transition-opacity duration-500", i >= 1 ? "opacity-100" : "opacity-0")} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <span className="flex h-10 items-center rounded-control border-hair border-line-strong px-3 font-ui text-body text-fg">
            {i >= 1 ? <span className="truncate">{i === 1 ? title.slice(0, 9) : title}</span> : <span className="text-fg-3">Title</span>}
            {i === 1 && <span aria-hidden className="ml-0.5 h-4 w-px animate-pulse bg-ink" />}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 self-start rounded-pill border-hair px-2.5 py-1 font-ui text-caption font-semibold transition-all duration-500",
            i >= 3 ? "border-ink bg-mango text-on-mango" : "border-line text-fg-3")}>
            <Check size={12} strokeWidth={3} aria-hidden /> {i >= 3 ? "Ready to place" : "Size, price: later is fine"}
          </span>
        </div>
      </div>
    </Frame>
  );
}

// ── 2. Your site ───────────────────────────────────────────────────
const SWATCHES = ["#FFD400", "#1F5C88", "#C2553A", "#4E6B3A"];
export function SiteMoment({ image, name = "Your name", className }: { image?: string | null; name?: string; className?: string }) {
  const { i } = useCycle(SWATCHES.length, 1800);
  const accent = SWATCHES[i];
  const dark = i !== 0;
  return (
    <Frame label="Your own site: pick a colour and a layout" className={className}>
      <div className="flex items-center gap-1.5 border-b-hair border-line bg-sunken px-3 py-2">
        {[0, 1, 2].map(k => <span key={k} className="h-2 w-2 rounded-pill bg-line-strong" />)}
        <span className="ml-2 truncate rounded-pill bg-surface px-2.5 py-0.5 font-ui text-[11px] text-fg-3">artomango.com/you</span>
      </div>
      <div className="grid grid-cols-[1.1fr_1fr] gap-4 p-5">
        <div className="flex flex-col justify-center gap-2">
          <span className="h-1 w-8 rounded-pill transition-colors duration-500" style={{ background: accent }} />
          <span className="font-display text-[26px] font-extrabold leading-none text-fg">{name}</span>
          <span className="font-ui text-caption text-fg-3">Paintings of water and evening light</span>
          <span className="mt-2 inline-flex self-start rounded-pill px-3 py-1 font-ui text-caption font-semibold transition-colors duration-500"
            style={{ background: accent, color: dark ? "#fff" : "#141414" }}>See the work</span>
        </div>
        <span className="block aspect-[4/5] overflow-hidden rounded-control bg-sunken p-2">
          {image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={image} alt="" className="h-full w-full object-contain" />
            : <Painting tone="dusk" className="h-full w-full rounded-[6px]" />}
        </span>
      </div>
      <div className="flex items-center gap-2 border-t-hair border-line px-5 py-3">
        {SWATCHES.map((c, k) => (
          <span key={c} className={cn("h-5 w-5 rounded-pill border-hair transition-transform duration-base", k === i ? "scale-110 border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line")} style={{ background: c }} />
        ))}
        <span className="ml-auto font-ui text-caption text-fg-3">Gallery · Salon · One by one</span>
      </div>
    </Frame>
  );
}

// ── 3. Offer it to a wall ──────────────────────────────────────────
export function OfferMoment() {
  const { i } = useCycle(3, 1600);
  return (
    <Frame label="A café looking for art, and offering a work in one tap" className="p-5">
      <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">Looking for art</span>
      <p className="mt-1.5 font-display text-h3 leading-tight text-fg">Art for our café walls this spring</p>
      <p className="mt-1 flex items-center gap-1.5 font-ui text-caption text-fg-3"><MapPin size={12} aria-hidden /> A café near you</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {["Two walls, 4 × 2 m", "3 months", "Sells work, 15%"].map(t => <li key={t} className="rounded-pill bg-sunken px-2.5 py-1 font-ui text-caption text-fg">{t}</li>)}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <span className={cn("inline-flex h-10 items-center gap-2 rounded-pill border-hair border-ink px-4 font-ui text-label font-semibold transition-all duration-500",
          i === 2 ? "bg-surface text-fg" : "bg-mango text-on-mango shadow-hard-1", i === 1 && "translate-x-px translate-y-px shadow-none")}>
          {i === 2 ? <><Check size={15} strokeWidth={3} aria-hidden /> Offer sent</> : <>Offer a work <ArrowRight size={15} aria-hidden /></>}
        </span>
        <span className={cn("flex items-center gap-1.5 transition-opacity duration-500", i >= 1 ? "opacity-100" : "opacity-0")}>
          <Painting tone="sea" className="h-9 w-9 rounded-[6px] border-hair border-line" />
          <Painting tone="field" className="h-9 w-9 rounded-[6px] border-hair border-line" />
        </span>
      </div>
    </Frame>
  );
}

// ── 4. Agree and sell ──────────────────────────────────────────────
const DEAL = ["Sent", "Interested", "Signed", "Done"];
export function DealMoment() {
  const { i } = useCycle(DEAL.length + 1, 1300);
  const at = Math.min(i, DEAL.length - 1);
  return (
    <Frame label="A deal moving from Sent to Interested, Signed and Done, then the sale recorded" className="p-5">
      <div className="flex items-center gap-3">
        <Painting tone="sea" className="h-12 w-12 shrink-0 rounded-control border-hair border-line" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-body font-semibold text-fg">Your work, at a café near you</p>
          <p className="font-ui text-caption text-fg-3">One-page agreement, signed in the app</p>
        </div>
      </div>
      <ol className="mt-5 grid grid-cols-4 gap-1.5">
        {DEAL.map((s, k) => (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={cn("h-1.5 rounded-pill transition-colors duration-500", k < at ? "bg-ink" : k === at ? "bg-mango" : "bg-line")} />
            <span className={cn("font-ui text-caption transition-colors duration-500", k <= at ? "font-semibold text-fg" : "text-fg-3")}>{s}</span>
          </li>
        ))}
      </ol>
      <div className={cn("mt-4 flex items-center justify-between rounded-control border-hair px-3 py-2.5 transition-all duration-500",
        i >= DEAL.length ? "border-ink bg-mango-soft opacity-100" : "border-line opacity-40")}>
        <span className="font-ui text-body-sm font-semibold text-fg">Record the sale</span>
        <span className="inline-flex items-center gap-1 font-ui text-caption font-semibold text-fg">{i >= DEAL.length ? <><Check size={13} strokeWidth={3} aria-hidden /> Sold</> : "One tap"}</span>
      </div>
    </Frame>
  );
}

// ── 4. Sell it off the wall ────────────────────────────────────────
// A wall label with its QR code, scanned on a phone, then the sale.
const QR = [
  "1111111001011", "1000001011001", "1011101000101", "1011101110001", "1011101010111", "1000001001001",
  "1111111010101", "0000000111000", "1101011001101", "0110100110011", "1011011100101", "0100110011010", "1110101101011",
];
export function LabelMoment() {
  const { i } = useCycle(3, 1600);
  return (
    <Frame label="A wall label with a QR code, scanned on a phone, then the work sold" className="p-5">
      <div className="flex items-stretch gap-4">
        <Painting tone="clay" className="w-24 shrink-0 rounded-control border-hair border-line sm:w-28" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-control border-hair border-line bg-page p-3">
          <div className="min-w-0">
            <p className="truncate font-ui text-body-sm font-semibold text-fg">Red room, 2026</p>
            <p className="font-ui text-caption text-fg-3">Oil on canvas · 60 × 80 cm</p>
            <p className="font-ui text-caption font-semibold text-fg">€640</p>
          </div>
          <div className="flex items-end gap-2">
            <span aria-hidden className={cn("grid shrink-0 grid-cols-[repeat(13,1fr)] gap-0 rounded-[3px] bg-surface p-1 transition-shadow duration-500", i >= 1 && "ring-2 ring-mango")} style={{ width: 52, height: 52 }}>
              {QR.join("").split("").map((c, k) => <span key={k} className={c === "1" ? "bg-ink" : ""} />)}
            </span>
            <span className="font-ui text-caption text-fg-3">Scan to see it, and buy it</span>
          </div>
        </div>
      </div>
      <div className={cn("mt-4 flex items-center justify-between rounded-control border-hair px-3 py-2.5 transition-all duration-500",
        i === 2 ? "border-ink bg-mango-soft" : "border-line")}>
        <span className="font-ui text-body-sm font-semibold text-fg">{i === 0 ? "On the wall at a café" : i === 1 ? "Someone scanned it" : "Sold off the wall"}</span>
        <span className="inline-flex items-center gap-1 font-ui text-caption font-semibold text-fg">{i === 2 ? <><Check size={13} strokeWidth={3} aria-hidden /> €640</> : i === 1 ? "Just now" : "Label on"}</span>
      </div>
    </Frame>
  );
}
