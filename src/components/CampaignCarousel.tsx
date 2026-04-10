"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Slide = {
  id: string;
  image_url: string;
  order: number;
  active: boolean;
  text_x: number;
  text_y: number;
  quote_open_x: number;
  quote_open_y: number;
  quote_close_x: number;
  quote_close_y: number;
};

const FALLBACK_SLIDES: Omit<Slide, "id" | "order" | "active">[] = [
  {
    image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1600&q=80",
    text_x: 5, text_y: 52,
    quote_open_x: 50, quote_open_y: 26,
    quote_close_x: 70, quote_close_y: 26,
  },
  {
    image_url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80",
    text_x: 5, text_y: 52,
    quote_open_x: 46, quote_open_y: 28,
    quote_close_x: 68, quote_close_y: 28,
  },
];

export default function CampaignCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_MS = 6000;

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb
        .from("campaign_slides")
        .select("*")
        .eq("active", true)
        .order("order", { ascending: true });
      if (data && data.length > 0) setSlides(data);
    })();
  }, []);

  const display = slides.length > 0 ? slides : FALLBACK_SLIDES;

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => { setActive(idx); setVisible(true); }, 350);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => goTo((active + 1) % display.length), AUTO_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, display.length, goTo]);

  const slide = display[active];

  return (
    <>
      <style>{`
        .camp-section {
          position: relative; width: 100%; height: 100vh;
          min-height: 560px; max-height: 920px;
          overflow: hidden; border-bottom: 3px solid #111110;
          background: #0a0a0a;
          font-family: 'Darker Grotesque', system-ui, sans-serif;
        }
        .camp-bg-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1); opacity: 0;
        }
        .camp-bg-img.camp-active { opacity: 1; }
        .camp-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(to bottom,rgba(0,0,0,0.12) 0%,rgba(0,0,0,0.06) 50%,rgba(0,0,0,0.32) 100%);
        }
        .camp-el {
          position: absolute; z-index: 2; user-select: none;
          transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .camp-el.hidden { opacity: 0; transform: translateY(10px); }
        .camp-el.shown  { opacity: 1; transform: translateY(0); }
        .camp-headline {
          font-size: clamp(40px, 6vw, 92px); font-weight: 900;
          letter-spacing: -2.5px; line-height: 1; color: #fff;
          white-space: nowrap; text-shadow: 0 2px 28px rgba(0,0,0,0.45);
        }
        .camp-qmark {
          font-size: clamp(72px, 11vw, 152px); font-weight: 900;
          line-height: 0.75; color: #FFD400;
          text-shadow: 0 2px 20px rgba(0,0,0,0.3);
        }
        .camp-progress {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 3;
          display: flex; gap: 3px; padding: 0 48px 28px;
        }
        .camp-bar {
          flex: 1; height: 2px; background: rgba(255,255,255,0.2);
          border-radius: 2px; cursor: pointer; overflow: hidden;
        }
        .camp-fill { height:100%; background:#FFD400; transform:scaleX(0); transform-origin:left; border-radius:2px; }
        @keyframes campFill { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .camp-bar.bar-active .camp-fill { animation: campFill 6s linear forwards; }
        .camp-bar.bar-done   .camp-fill { transform: scaleX(1); }
        .camp-counter {
          position: absolute; bottom: 40px; right: 48px; z-index: 3;
          font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.35);
          letter-spacing: 0.12em; font-family: 'Darker Grotesque', system-ui, sans-serif;
        }
      `}</style>

      <section className="camp-section">
        {display.map((s, i) => (
          <img key={i} src={s.image_url} alt=""
            className={`camp-bg-img${active === i ? " camp-active" : ""}`}
            loading={i === 0 ? "eager" : "lazy"} />
        ))}
        <div className="camp-overlay" />

        {/* "Art while you" text */}
        <div
          className={`camp-el camp-headline ${visible ? "shown" : "hidden"}`}
          style={{ left: `${slide.text_x}%`, top: `${slide.text_y}%`, transform: `translateY(-50%)` }}
        >
          Art while you
        </div>

        {/* Opening " */}
        <div
          className={`camp-el camp-qmark ${visible ? "shown" : "hidden"}`}
          style={{ left: `${slide.quote_open_x}%`, top: `${slide.quote_open_y}%`, transitionDelay: "0.05s" }}
        >
          &ldquo;
        </div>

        {/* Closing " */}
        <div
          className={`camp-el camp-qmark ${visible ? "shown" : "hidden"}`}
          style={{ left: `${slide.quote_close_x}%`, top: `${slide.quote_close_y}%`, transitionDelay: "0.1s" }}
        >
          &rdquo;
        </div>

        <div className="camp-counter">
          {String(active + 1).padStart(2, "0")} / {String(display.length).padStart(2, "0")}
        </div>

        <div className="camp-progress">
          {display.map((_, i) => (
            <div
              key={i}
              className={`camp-bar${i === active ? " bar-active" : i < active ? " bar-done" : ""}`}
              onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); goTo(i); }}
            >
              <div className="camp-fill" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
