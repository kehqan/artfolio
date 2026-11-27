"use client";
// "You live. Your art keeps working." A moment from an artist's life on the
// left (the photos from /admin/campaign), and on the right what Artomango did
// for their art at the same time. Every card is something the app really does:
// works on walls, scans of the QR wall label, and the artist's own Buy link.
import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { publicWrap } from "@/components/public/PublicChrome";

type Photo = { image_url: string };

// Used until the campaign photos load, or if there are none. Our own file:
// a link to another site would send each visitor's IP address there.
const FALLBACK: Photo[] = [{ image_url: "/demo/vltava-at-dusk.jpg" }];

export default function Meanwhile() {
  const [photos, setPhotos] = useState<Photo[]>(FALLBACK);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient()
        .from("campaign_slides")
        .select("image_url")
        .eq("active", true)
        .order("order", { ascending: true });
      if (alive && data && data.length > 0) setPhotos(data);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive(i => (i + 1) % photos.length), 6000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <section className="border-t-hair border-line bg-page py-16 lg:py-20">
      <div className={publicWrap}>
        <div className="grid overflow-hidden rounded-card border-hair border-ink bg-surface shadow-hard-2 md:grid-cols-[1.25fr_1fr]">
          {/* The moment */}
          <div className="relative aspect-[4/3] bg-ink md:aspect-auto md:min-h-[440px]">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.image_url} src={p.image_url} alt=""
                loading={i === 0 ? "eager" : "lazy"}
                className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                  i === active ? "opacity-100" : "opacity-0")} />
            ))}
            <span className="absolute left-4 top-4 rounded-pill border-hair border-ink bg-surface px-3 py-1 font-ui text-caption font-semibold text-fg">
              You, Saturday 9 pm
            </span>
          </div>

          {/* Meanwhile */}
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:p-10">
            <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">Meanwhile, your art</span>
            <h2 className="font-display text-[36px] font-extrabold leading-[1] text-fg sm:text-[44px]">
              You live. Your art keeps working.
            </h2>
            <ul className="flex flex-col gap-3" aria-label="What your art did meanwhile, for example">
              <Row thumb="/demo/window-seat.jpg"><b className="font-semibold">Window Seat</b> is on the wall at a café in Žižkov</Row>
              <Row badge="12">people scanned its wall label this week</Row>
              <Row thumb="/demo/tram-22.jpg">Someone tapped <b className="font-semibold">Buy</b> on <b className="font-semibold">Tram 22</b></Row>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ thumb, badge, children }: { thumb?: string; badge?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-control border-hair border-ink bg-surface px-3 py-2.5 shadow-hard-1">
      {thumb
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={thumb} alt="" className="h-10 w-10 shrink-0 rounded-[6px] object-cover" />
        : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] border-hair border-ink bg-mango font-display text-[20px] font-extrabold leading-none text-on-mango">{badge}</span>}
      <span className="min-w-0 font-ui text-body-sm text-fg">{children}</span>
    </li>
  );
}
