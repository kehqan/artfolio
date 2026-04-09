"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────
type Slide = {
  id: string;
  image_url: string;
  phrase: string;        // e.g. "sleep", "travel", "exhibit"
  order: number;
  active: boolean;
};

// ─── Fallback slides (shown while loading / if table is empty) ────
const FALLBACK_SLIDES: Omit<Slide, "id" | "order" | "active">[] = [
  {
    image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1600&q=80",
    phrase: "sleep",
  },
  {
    image_url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80",
    phrase: "travel",
  },
  {
    image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&q=80",
    phrase: "create",
  },
  {
    image_url: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=1600&q=80",
    phrase: "connect",
  },
];

// ─── Component ────────────────────────────────────────────────────
export default function CampaignCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [phraseVisible, setPhraseVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_MS = 5000;

  // Load from Supabase
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

  const displaySlides: (Slide | (typeof FALLBACK_SLIDES)[0])[] =
    slides.length > 0 ? slides : FALLBACK_SLIDES;

  // Auto-advance
  const goTo = useCallback(
    (idx: number) => {
      setPhraseVisible(false);
      setTimeout(() => {
        setActive(idx);
        setPhraseVisible(true);
      }, 300);
    },
    []
  );

  useEffect(() => {
    timerRef.current = setTimeout(
      () => goTo((active + 1) % displaySlides.length),
      AUTO_MS
    );
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, displaySlides.length, goTo]);

  const slide = displaySlides[active];

  return (
    <>
      <style>{`
        .campaign-section {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 600px;
          max-height: 900px;
          overflow: hidden;
          border-bottom: 3px solid #111110;
          background: #0a0a0a;
          cursor: none;
        }
        /* ── Background image stack ── */
        .campaign-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .campaign-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1),
                      transform 6s cubic-bezier(0.16,1,0.3,1);
          transform: scale(1.04);
          opacity: 0;
          will-change: opacity, transform;
        }
        .campaign-bg-img.bg-active {
          opacity: 1;
          transform: scale(1);
        }
        /* ── Dark vignette — heavier on left ── */
        .campaign-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              to right,
              rgba(0,0,0,0.80) 0%,
              rgba(0,0,0,0.45) 45%,
              rgba(0,0,0,0.10) 70%,
              rgba(0,0,0,0.05) 100%
            ),
            linear-gradient(
              to top,
              rgba(0,0,0,0.40) 0%,
              transparent 40%
            );
        }
        /* ── Content ── */
        .campaign-content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 clamp(28px, 7vw, 100px);
          max-width: 860px;
        }
        /* ── Eyebrow ── */
        .campaign-eyebrow {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #FFD400;
          margin-bottom: 28px;
          opacity: 0.85;
        }
        /* ── Main headline ── */
        .campaign-headline {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: clamp(48px, 7.5vw, 110px);
          font-weight: 900;
          letter-spacing: -3px;
          line-height: 0.92;
          color: #fff;
          margin: 0;
          user-select: none;
        }
        /* ── Quote‑mark row ── */
        .campaign-quote-row {
          display: flex;
          align-items: center;
          gap: clamp(12px, 2vw, 28px);
          margin-top: clamp(4px, 1vw, 8px);
        }
        .campaign-quote-mark {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: clamp(60px, 10vw, 130px);
          font-weight: 900;
          line-height: 0.75;
          color: #FFD400;
          flex-shrink: 0;
          display: inline-block;
          user-select: none;
        }
        .campaign-quote-mark.open { transform: translateY(-4px); }
        .campaign-quote-mark.close { transform: translateY(4px); }
        /* ── Animated phrase ── */
        .campaign-phrase-wrap {
          flex: 1;
          overflow: hidden;
        }
        .campaign-phrase {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: clamp(48px, 7.5vw, 110px);
          font-weight: 900;
          letter-spacing: -3px;
          line-height: 0.92;
          color: #fff;
          display: block;
          transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .campaign-phrase.hidden {
          opacity: 0;
          transform: translateY(18px);
        }
        .campaign-phrase.visible {
          opacity: 1;
          transform: translateY(0);
        }
        /* ── Progress bar ── */
        .campaign-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 3;
          display: flex;
          gap: 3px;
          padding: 0 clamp(28px, 7vw, 100px) 32px;
        }
        .campaign-progress-bar {
          flex: 1;
          height: 2px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: height 0.2s;
        }
        .campaign-progress-bar:hover { height: 4px; }
        .campaign-progress-fill {
          position: absolute;
          inset: 0;
          background: #FFD400;
          transform-origin: left;
          transform: scaleX(0);
          border-radius: 2px;
        }
        @keyframes fillBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .campaign-progress-bar.active .campaign-progress-fill {
          animation: fillBar 5s linear forwards;
        }
        .campaign-progress-bar.done .campaign-progress-fill {
          transform: scaleX(1);
        }
        /* ── Custom cursor dot ── */
        .campaign-cursor {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #FFD400;
          border-radius: 50%;
          pointer-events: none;
          z-index: 10;
          transform: translate(-50%, -50%);
          transition: transform 0.1s, width 0.3s, height 0.3s;
          mix-blend-mode: normal;
        }
        /* ── Slide counter ── */
        .campaign-counter {
          position: absolute;
          bottom: 48px;
          right: clamp(28px, 7vw, 100px);
          z-index: 3;
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.12em;
          user-select: none;
        }

        @media (max-width: 700px) {
          .campaign-headline { letter-spacing: -1.5px; }
          .campaign-phrase   { letter-spacing: -1.5px; }
          .campaign-progress { padding-bottom: 20px; }
        }
      `}</style>

      <section className="campaign-section" id="campaign">
        {/* ── Background images ── */}
        <div className="campaign-bg">
          {displaySlides.map((s, i) => (
            <img
              key={i}
              src={"image_url" in s ? s.image_url : ""}
              alt=""
              className={`campaign-bg-img${active === i ? " bg-active" : ""}`}
              onLoad={() => setLoaded(prev => ({ ...prev, [i]: true }))}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>

        {/* ── Overlay ── */}
        <div className="campaign-overlay" />

        {/* ── Text content ── */}
        <div className="campaign-content">
          <p className="campaign-eyebrow">🥭 artomango</p>

          <h2 className="campaign-headline">
            Manage your art
          </h2>

          {/* Second line: while you " phrase " */}
          <div className="campaign-headline" style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 0.28em" }}>
            <span>while you</span>
            <div className="campaign-quote-row">
              <span className="campaign-quote-mark open">&ldquo;</span>
              <div className="campaign-phrase-wrap">
                <span className={`campaign-phrase ${phraseVisible ? "visible" : "hidden"}`}>
                  {slide.phrase}
                </span>
              </div>
              <span className="campaign-quote-mark close">&rdquo;</span>
            </div>
          </div>
        </div>

        {/* ── Counter ── */}
        <div className="campaign-counter">
          {String(active + 1).padStart(2, "0")} / {String(displaySlides.length).padStart(2, "0")}
        </div>

        {/* ── Progress bars ── */}
        <div className="campaign-progress">
          {displaySlides.map((_, i) => (
            <div
              key={i}
              className={`campaign-progress-bar ${i === active ? "active" : i < active ? "done" : ""}`}
              onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); goTo(i); }}
            >
              <div className="campaign-progress-fill" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
