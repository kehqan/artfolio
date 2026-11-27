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
  text_content: string;
  text_color: string;
  text_size: number;
  quote_open_x: number;
  quote_open_y: number;
  quote_close_x: number;
  quote_close_y: number;
  quote_color: string;
  quote_size: number;
};

// Fallback slides use our own images: a link to another site would send each
// visitor's IP address there.
const FALLBACK: Omit<Slide, "id" | "order" | "active">[] = [
  {
    image_url: "/demo/vltava-at-dusk.jpg",
    text_x: 5, text_y: 52, text_content: "Art while you", text_color: "#ffffff", text_size: 72,
    quote_open_x: 50, quote_open_y: 22, quote_close_x: 70, quote_close_y: 22,
    quote_color: "#FFD400", quote_size: 120,
  },
  {
    image_url: "/demo/night-market.jpg",
    text_x: 5, text_y: 52, text_content: "Art while you", text_color: "#ffffff", text_size: 72,
    quote_open_x: 46, quote_open_y: 24, quote_close_x: 68, quote_close_y: 24,
    quote_color: "#FFD400", quote_size: 120,
  },
];

// Sizes are saved as pixels on a 1280px-wide stage (see /admin/campaign).
// Turn them into a share of the stage's real width.
const cqw = (px: number) => `${(px / 12.8).toFixed(3)}cqw`;

export default function CampaignCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const display = slides.length > 0 ? slides : FALLBACK;

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => { setActive(idx); setVisible(true); }, 350);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => goTo((active + 1) % display.length), 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, display.length, goTo]);

  const s = display[active];

  return (
    <>
      <style>{`
        /* The stage has the same 16:9 shape as the editor in /admin/campaign, and
           every size is a share of its width. So the words and the quote marks land
           on the same spot of the photo on every screen, exactly as placed there. */
        .camp-section {
          position:relative;width:100%;aspect-ratio:16/9;
          container-type:inline-size;
          overflow:hidden;border-bottom:3px solid #111110;
          background:#0a0a0a;
          font-family:var(--font-darker-grotesque),system-ui,sans-serif;
        }
        .camp-bg {
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:cover;object-position:center;
          transition:opacity .9s cubic-bezier(.16,1,.3,1);opacity:0;
        }
        .camp-bg.on{opacity:1}
        .camp-overlay{
          position:absolute;inset:0;z-index:1;
          background:linear-gradient(to bottom,rgba(0,0,0,.12) 0%,rgba(0,0,0,.05) 50%,rgba(0,0,0,.30) 100%);
        }
        .camp-el{
          position:absolute;z-index:2;user-select:none;
          transition:opacity .3s ease,transform .4s cubic-bezier(.16,1,.3,1);
          white-space:nowrap;font-weight:900;line-height:1;padding:1px 3px;
        }
        .camp-el.off{opacity:0;transform:translateY(10px)}
        .camp-el.on {opacity:1;transform:translateY(0)}
        .camp-progress{
          position:absolute;bottom:0;left:0;right:0;z-index:3;
          display:flex;gap:3px;padding:0 clamp(16px,3.75cqw,48px) clamp(10px,2.2cqw,28px);
        }
        .camp-bar{flex:1;height:2px;background:rgba(255,255,255,.2);border-radius:2px;cursor:pointer;overflow:hidden}
        .camp-fill{height:100%;background:#FFD400;transform:scaleX(0);transform-origin:left;border-radius:2px}
        @keyframes cFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .camp-bar.ba .camp-fill{animation:cFill 6s linear forwards}
        .camp-bar.bd .camp-fill{transform:scaleX(1)}
        .camp-ctr{
          position:absolute;bottom:clamp(18px,3.1cqw,40px);right:clamp(16px,3.75cqw,48px);z-index:3;
          font-size:12px;font-weight:800;color:rgba(255,255,255,.35);
          letter-spacing:.12em;font-family:var(--font-darker-grotesque),system-ui,sans-serif;
        }
      `}</style>

      <section className="camp-section">
        {display.map((sl, i) => (
          <img key={i} src={sl.image_url} alt=""
            className={`camp-bg${active === i ? " on" : ""}`}
            loading={i === 0 ? "eager" : "lazy"} />
        ))}
        <div className="camp-overlay" />

        {/* Main text */}
        <div
          className={`camp-el ${visible ? "on" : "off"}`}
          style={{
            left: `${s.text_x}%`, top: `${s.text_y}%`,
            transform: "translateY(-50%)",
            fontSize: cqw(s.text_size),
            color: s.text_color,
            letterSpacing: cqw(-1.5),
            textShadow: "0 2px 28px rgba(0,0,0,.5)",
          }}
        >
          {s.text_content}
        </div>

        {/* Opening quote */}
        <div
          className={`camp-el ${visible ? "on" : "off"}`}
          style={{
            left: `${s.quote_open_x}%`, top: `${s.quote_open_y}%`,
            fontSize: cqw(s.quote_size), color: s.quote_color,
            lineHeight: 0.75, transitionDelay: ".05s",
            textShadow: "0 2px 16px rgba(0,0,0,.35)",
          }}
        >
          &ldquo;
        </div>

        {/* Closing quote */}
        <div
          className={`camp-el ${visible ? "on" : "off"}`}
          style={{
            left: `${s.quote_close_x}%`, top: `${s.quote_close_y}%`,
            fontSize: cqw(s.quote_size), color: s.quote_color,
            lineHeight: 0.75, transitionDelay: ".1s",
            textShadow: "0 2px 16px rgba(0,0,0,.35)",
          }}
        >
          &rdquo;
        </div>

        <div className="camp-ctr">
          {String(active + 1).padStart(2, "0")} / {String(display.length).padStart(2, "0")}
        </div>

        <div className="camp-progress">
          {display.map((_, i) => (
            <div
              key={i}
              className={`camp-bar${i === active ? " ba" : i < active ? " bd" : ""}`}
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
