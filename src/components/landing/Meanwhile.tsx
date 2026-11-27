"use client";
// "Meanwhile, your art is out there." A moment from an artist's life on the
// left (the photos from Admin → Home page), and on the right what Artomango
// did for their art at the same time. Every card is something the app really
// does: works on walls, scans of the QR wall label, the artist's own Buy link.
//
// The words, the three cards and the photos are edited by hand in
// /admin/home, which renders this same <MeanwhileView> as its live preview.
import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { publicWrap } from "@/components/public/PublicChrome";
import { MEANWHILE_DEFAULT, splitBold, type MeanwhileCard, type MeanwhileContent } from "@/lib/siteContent";

export type MeanwhilePhoto = { image_url: string; caption?: string | null };

// Used if there are no photos. Our own file: a link to another site would
// send each visitor's IP address there.
export const MEANWHILE_FALLBACK_PHOTOS: MeanwhilePhoto[] = [
  { image_url: "/demo/vltava-at-dusk.jpg", caption: "You, Saturday 9 pm" },
];

export default function Meanwhile({ content = MEANWHILE_DEFAULT, photos }: {
  content?: MeanwhileContent;
  photos: MeanwhilePhoto[];
}) {
  const list = photos.length ? photos : MEANWHILE_FALLBACK_PHOTOS;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive(i => (i + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length]);

  return (
    <section className="border-t-hair border-line bg-page py-16 lg:py-20">
      <div className={publicWrap}>
        <MeanwhileView content={content} photos={list} active={active} />
      </div>
    </section>
  );
}

/**
 * The card itself. `phone` forces the one-column phone layout regardless of
 * screen width, so the admin can preview it inside a narrow frame.
 */
export function MeanwhileView({ content, photos, active, phone = false }: {
  content: MeanwhileContent;
  photos: MeanwhilePhoto[];
  active: number;
  phone?: boolean;
}) {
  const list = photos.length ? photos : MEANWHILE_FALLBACK_PHOTOS;
  const caption = list[active % list.length]?.caption?.trim();
  return (
    <div className={cn("grid overflow-hidden rounded-card border-hair border-ink bg-surface shadow-hard-2",
      !phone && "md:grid-cols-[1.25fr_1fr]")}>
      {/* The moment */}
      <div className={cn("relative aspect-[4/3] bg-ink", !phone && "md:aspect-auto md:min-h-[440px]")}>
        {list.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.image_url + i} src={p.image_url} alt=""
            loading={i === 0 ? "eager" : "lazy"}
            className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              i === active % list.length ? "opacity-100" : "opacity-0")} />
        ))}
        {caption && (
          <span className="absolute left-4 top-4 rounded-pill border-hair border-ink bg-surface px-3 py-1 font-ui text-caption font-semibold text-fg">
            {caption}
          </span>
        )}
      </div>

      {/* Meanwhile */}
      <div className={cn("flex flex-col gap-5 p-6", !phone && "sm:p-8 lg:p-10")}>
        <div className="flex flex-col gap-3">
          <h2 className={cn("font-display text-[36px] font-extrabold leading-[1] text-fg", !phone && "sm:text-[44px]")}>
            {content.headline}
          </h2>
          {content.text && <p className="max-w-[44ch] font-ui text-body text-fg-2">{content.text}</p>}
        </div>
        {content.cards.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="What your art did meanwhile, for example">
            {content.cards.map((c, i) => <Row key={i} card={c} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ card }: { card: MeanwhileCard }) {
  return (
    <li className="flex items-center gap-3 rounded-control border-hair border-ink bg-surface px-3 py-2.5 shadow-hard-1">
      {card.image_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={card.image_url} alt="" className="h-10 w-10 shrink-0 rounded-[6px] object-cover" />
        : <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[6px] border-hair border-ink bg-mango font-display font-extrabold leading-none text-on-mango",
            (card.badge?.length || 0) > 2 ? "text-[15px]" : "text-[20px]")}>{card.badge || "•"}</span>}
      <span className="min-w-0 font-ui text-body-sm text-fg">
        {splitBold(card.text).map((s, i) => s.bold ? <b key={i} className="font-semibold">{s.part}</b> : <span key={i}>{s.part}</span>)}
      </span>
    </li>
  );
}
