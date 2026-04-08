"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search, MapPin, ArrowRight, X, ChevronDown,
  Palette, Building2, Users, Grid3X3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  price?: number; currency?: string; images?: string[];
  venue_location?: string; location?: string; user_id?: string;
  artist_name?: string; artist_avatar?: string;
};

type Artist = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  mediums?: string[]; style_tags?: string[]; artwork_count?: number;
  cover_image?: string;
};

type Tab = "artworks" | "artists";

const MEDIUMS = ["All","Oil","Photography","Sculpture","Digital","Printmaking","Mixed media","Ceramics"];

// ── Ripe style tokens ─────────────────────────────────────────────
const R = {
  yellow:  "#FFD400",
  black:   "#111110",
  paper:   "#FFFBEA",
  cream:   "#F5F0E8",
  linen:   "#FAF7F3",
  warm:    "#9B8F7A",
  border:  "#E8E0D0",
  shadow:  "#D4C9A8",
};

// ── Hero ticker words ─────────────────────────────────────────────
const TICKER = ["Manage.", "Exhibit.", "Collab.", "Discover.", "Collect.", "Connect.", "Create.", "Manage.", "Exhibit.", "Collab."];

export default function HomePage() {
  const [tab,        setTab]        = useState<Tab>("artworks");
  const [artworks,   setArtworks]   = useState<Artwork[]>([]);
  const [artists,    setArtists]    = useState<Artist[]>([]);
  const [search,     setSearch]     = useState("");
  const [medium,     setMedium]     = useState("All");
  const [loading,    setLoading]    = useState(true);
  const [scrolled,   setScrolled]   = useState(false);
  const [hoverCard,  setHoverCard]  = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const exploreRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function loadData() {
    setLoading(true);
    const sb = createClient();

    // Load artworks with artist info
    const { data: awData } = await sb
      .from("artworks")
      .select("id, title, medium, year, price, currency, images, venue_location, location, user_id")
      .in("status", ["available", "Available"])
      .not("images", "is", null)
      .order("created_at", { ascending: false })
      .limit(48);

    if (awData?.length) {
      // Enrich with artist name/avatar
      const userIds = Array.from(new Set(awData.map(a => a.user_id).filter(Boolean)));
      const { data: profiles } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const profMap: Record<string, any> = {};
      profiles?.forEach(p => { profMap[p.id] = p; });
      setArtworks(awData.map(a => ({
        ...a,
        artist_name:   profMap[a.user_id!]?.full_name || "Artist",
        artist_avatar: profMap[a.user_id!]?.avatar_url || null,
      })));
    }

    // Load artists/venues
    const { data: artistData } = await sb
      .from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url, mediums, style_tags")
      .not("full_name", "is", null)
      .neq("full_name", "")
      .limit(40);

    if (artistData?.length) {
      const enriched = await Promise.all(artistData.map(async p => {
        const [{ count }, { data: cover }] = await Promise.all([
          sb.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", p.id),
          sb.from("artworks").select("images").eq("user_id", p.id).not("images", "is", null).limit(1).maybeSingle(),
        ]);
        return { ...p, artwork_count: count || 0, cover_image: cover?.images?.[0] || null };
      }));
      setArtists(enriched);
    }

    setLoading(false);
  }

  function scrollToExplore() {
    exploreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Filter
  const filteredArtworks = artworks.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !search || a.title.toLowerCase().includes(q) || (a.medium||"").toLowerCase().includes(q) || (a.artist_name||"").toLowerCase().includes(q);
    const matchM = medium === "All" || (a.medium||"").toLowerCase().includes(medium.toLowerCase());
    return matchQ && matchM;
  });

  const filteredArtists = artists.filter(a => {
    const q = search.toLowerCase();
    return !search || (a.full_name||"").toLowerCase().includes(q) || (a.location||"").toLowerCase().includes(q);
  });

  const initials = (name: string) => name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "A";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          background: ${R.paper};
          color: ${R.black};
          overflow-x: hidden;
        }

        /* ── Sticky nav ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 10px 20px;
          transition: padding 0.2s;
        }
        .nav.scrolled { padding: 7px 20px; }
        .nav-pill {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; gap: 4px;
          background: #fff; border: 2.5px solid ${R.black};
          border-radius: 9999px; padding: 5px 6px 5px 10px;
          box-shadow: 4px 4px 0 ${R.black};
          transition: box-shadow 0.15s;
        }
        .nav-pill:hover { box-shadow: 5px 5px 0 ${R.black}; }
        .nav-logo { display: flex; align-items: center; gap: 6px; text-decoration: none; flex-shrink: 0; }
        .nav-logo-text { font-size: 16px; font-weight: 900; color: ${R.black}; letter-spacing: -0.3px; }
        .nav-links { display: flex; flex: 1; justify-content: center; gap: 2px; }
        .nav-link {
          padding: 7px 13px; font-size: 14px; font-weight: 700; color: ${R.black};
          text-decoration: none; border-radius: 9999px; transition: background 0.1s;
          white-space: nowrap;
        }
        .nav-link:hover { background: ${R.cream}; }
        .nav-divider { width: 1px; height: 22px; background: ${R.border}; margin: 0 4px; flex-shrink: 0; }
        .btn-ghost { padding: 7px 14px; font-size: 13px; font-weight: 700; color: ${R.black}; text-decoration: none; border-radius: 9999px; border: 2px solid transparent; transition: background 0.1s; font-family: inherit; background: none; cursor: pointer; white-space: nowrap; }
        .btn-ghost:hover { background: ${R.cream}; }
        .btn-pill-cta { padding: 7px 18px; font-size: 13px; font-weight: 800; color: ${R.black}; background: ${R.yellow}; border-radius: 9999px; border: 2px solid ${R.black}; text-decoration: none; white-space: nowrap; transition: box-shadow 0.1s; }
        .btn-pill-cta:hover { box-shadow: 2px 2px 0 ${R.black}; }

        /* ── Hero ── */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background: ${R.yellow};
          z-index: 0;
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(${R.black}22 1px, transparent 1px),
            linear-gradient(90deg, ${R.black}22 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 1;
        }
        .hero-inner {
          position: relative; z-index: 2;
          flex: 1; display: flex; flex-direction: column;
          justify-content: center;
          max-width: 1100px; margin: 0 auto; width: 100%;
          padding: 120px 24px 80px;
          gap: 0;
        }

        /* Hero type */
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${R.black}; color: ${R.yellow};
          padding: 4px 14px; border-radius: 9999px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.18em;
          text-transform: uppercase; margin-bottom: 24px; width: fit-content;
        }
        .hero-title {
          font-size: clamp(52px, 8vw, 100px);
          font-weight: 900; letter-spacing: -4px; line-height: 0.9;
          color: ${R.black}; margin-bottom: 24px;
        }
        .hero-title .block-white {
          display: inline-block; background: #fff;
          color: ${R.black}; padding: 4px 16px 8px;
          border-radius: 16px; border: 2.5px solid ${R.black};
        }
        .hero-sub {
          font-size: 18px; font-weight: 600; color: rgba(17,17,16,0.65);
          line-height: 1.5; max-width: 480px; margin-bottom: 36px;
        }
        .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; background: ${R.black}; color: ${R.yellow};
          font-family: inherit; font-size: 15px; font-weight: 800;
          border: 2.5px solid ${R.black}; border-radius: 14px;
          text-decoration: none; cursor: pointer;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
          transition: box-shadow 0.12s, transform 0.12s;
        }
        .btn-hero-primary:hover { box-shadow: 6px 6px 0 rgba(0,0,0,0.25); transform: translate(-1px,-1px); }
        .btn-hero-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; background: rgba(255,255,255,0.7);
          color: ${R.black}; font-family: inherit; font-size: 15px; font-weight: 800;
          border: 2.5px solid ${R.black}; border-radius: 14px;
          text-decoration: none; cursor: pointer;
          transition: background 0.12s;
        }
        .btn-hero-secondary:hover { background: #fff; }

        /* Floating artwork preview cards */
        .hero-right {
          position: absolute; right: 0; top: 0; bottom: 0; width: 45%;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 2;
          overflow: hidden;
        }
        .preview-stack { position: relative; width: 320px; height: 420px; }
        .preview-card {
          position: absolute; border-radius: 20px; overflow: hidden;
          border: 2.5px solid ${R.black};
          box-shadow: 5px 6px 0 ${R.black};
        }

        /* ── Ticker ── */
        .ticker-wrap {
          background: ${R.black}; border-top: 3px solid ${R.black};
          border-bottom: 3px solid ${R.black};
          padding: 14px 0; overflow: hidden; white-space: nowrap;
          position: relative; z-index: 2;
        }
        .ticker-track { display: inline-flex; gap: 48px; animation: tick 22s linear infinite; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-item {
          font-size: 14px; font-weight: 800; color: ${R.yellow};
          letter-spacing: 0.08em; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 14px; flex-shrink: 0;
        }
        .ticker-dot { width: 5px; height: 5px; border-radius: 50%; background: ${R.yellow}; flex-shrink: 0; }

        /* ── Stats bar ── */
        .stats-bar {
          background: #fff; border-bottom: 2px solid ${R.border};
          padding: 0; position: relative; z-index: 2;
        }
        .stats-inner {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr);
        }
        .stat-item {
          padding: 20px 24px; border-right: 1px solid ${R.border};
          display: flex; flex-direction: column; gap: 4px;
        }
        .stat-item:last-child { border-right: none; }
        .stat-num { font-size: 28px; font-weight: 900; color: ${R.black}; letter-spacing: -1px; line-height: 1; }
        .stat-label { font-size: 11px; font-weight: 700; color: ${R.warm}; text-transform: uppercase; letter-spacing: 0.12em; }

        /* ── Explore section ── */
        .explore {
          max-width: 1100px; margin: 0 auto;
          padding: 64px 24px 80px;
        }
        .explore-header { margin-bottom: 32px; }
        .explore-title {
          font-size: 40px; font-weight: 900; color: ${R.black};
          letter-spacing: -1.5px; margin-bottom: 6px;
        }
        .explore-sub { font-size: 15px; font-weight: 600; color: ${R.warm}; }

        /* Tabs */
        .tabs {
          display: flex; gap: 0;
          background: #fff; border: 2px solid ${R.black}; border-radius: 12px;
          overflow: hidden; width: fit-content; margin-bottom: 24px;
        }
        .tab-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 20px; border: none; border-right: 1px solid ${R.border};
          font-family: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.12s;
        }
        .tab-btn:last-child { border-right: none; }
        .tab-btn.active { background: ${R.black}; color: ${R.yellow}; }
        .tab-btn:not(.active) { background: #fff; color: ${R.warm}; }
        .tab-btn:not(.active):hover { background: ${R.linen}; color: ${R.black}; }

        /* Controls */
        .controls {
          display: flex; gap: 10px; align-items: center;
          flex-wrap: wrap; margin-bottom: 28px;
        }
        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 2px solid ${R.border}; border-radius: 10px;
          padding: 0 12px; height: 40px; flex: 1; min-width: 200px; max-width: 340px;
          transition: border-color 0.15s;
        }
        .search-wrap:focus-within { border-color: ${R.yellow}; }
        .search-inp {
          flex: 1; border: none; outline: none; font-size: 13px;
          font-family: inherit; font-weight: 500; color: ${R.black}; background: transparent;
        }
        .medium-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .medium-pill {
          padding: 6px 14px; border-radius: 9999px; border: 2px solid ${R.border};
          background: #fff; font-family: inherit; font-size: 12px; font-weight: 700;
          color: ${R.warm}; cursor: pointer; transition: all 0.1s;
          white-space: nowrap;
        }
        .medium-pill.active { background: ${R.black}; border-color: ${R.black}; color: ${R.yellow}; }
        .medium-pill:not(.active):hover { border-color: ${R.black}; color: ${R.black}; }

        /* Artwork grid */
        .art-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 18px;
        }
        .art-card {
          background: #fff; border-radius: 18px;
          border: 2px solid ${R.border};
          box-shadow: 3px 4px 0 ${R.shadow};
          overflow: hidden; cursor: pointer;
          transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
        }
        .art-card:hover {
          box-shadow: 6px 8px 0 ${R.black};
          transform: translate(-2px, -3px);
          border-color: ${R.black};
        }
        .art-thumb { position: relative; aspect-ratio: 4/3; overflow: hidden; background: ${R.linen}; }
        .art-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .art-card:hover .art-thumb img { transform: scale(1.05); }
        .art-thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px; }
        .art-body { padding: 14px 16px 12px; }
        .art-title { font-size: 15px; font-weight: 800; color: ${R.black}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.2px; margin-bottom: 2px; }
        .art-medium { font-size: 12px; color: ${R.warm}; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 10px; }
        .art-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .art-price { font-size: 16px; font-weight: 900; color: ${R.black}; font-family: monospace; letter-spacing: -0.5px; }
        .art-price.empty { color: #D4C9A8; }
        .art-artist { display: flex; align-items: center; gap: 6px; }
        .art-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${R.border}; background: ${R.yellow}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: ${R.black}; flex-shrink: 0; overflow: hidden; }
        .art-avatar-name { font-size: 11px; font-weight: 600; color: ${R.warm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px; }

        /* Location badge */
        .loc-badge { display: flex; align-items: center; gap: 3px; font-size: 10px; color: ${R.warm}; font-weight: 600; overflow: hidden; max-width: 110px; }
        .loc-badge span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Artist grid */
        .artist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 18px;
        }
        .artist-card {
          background: #fff; border-radius: 18px;
          border: 2px solid ${R.border}; overflow: hidden;
          box-shadow: 3px 4px 0 ${R.shadow};
          cursor: pointer;
          transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
        }
        .artist-card:hover { box-shadow: 6px 8px 0 ${R.black}; transform: translate(-2px,-3px); border-color: ${R.black}; }
        .artist-cover { height: 100px; background: ${R.linen}; overflow: hidden; position: relative; }
        .artist-cover img { width: 100%; height: 100%; object-fit: cover; }
        .artist-body { padding: 14px 16px 16px; }
        .artist-avatar-wrap { margin-top: -28px; margin-bottom: 10px; }
        .artist-avatar-lg {
          width: 52px; height: 52px; border-radius: 50%; border: 3px solid #fff;
          background: ${R.yellow}; display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: ${R.black}; overflow: hidden;
          box-shadow: 2px 2px 0 ${R.border};
        }
        .artist-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
        .artist-name { font-size: 16px; font-weight: 800; color: ${R.black}; letter-spacing: -0.2px; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .artist-role { display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 2px 8px; border-radius: 9999px; background: ${R.linen}; color: ${R.warm}; margin-bottom: 6px; }
        .artist-bio { font-size: 12px; color: ${R.warm}; font-weight: 500; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 10px; min-height: 36px; }
        .artist-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid ${R.linen}; }
        .artist-count { font-size: 12px; font-weight: 700; color: ${R.warm}; }
        .artist-loc { display: flex; align-items: center; gap: 3px; font-size: 11px; color: ${R.warm}; font-weight: 600; overflow: hidden; max-width: 110px; }
        .artist-loc span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* View profile btn */
        .view-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 8px; border: 1.5px solid ${R.border};
          background: ${R.linen}; font-size: 12px; font-weight: 700; color: ${R.black};
          text-decoration: none; transition: all 0.12s;
        }
        .view-btn:hover { background: ${R.yellow}; border-color: ${R.black}; }

        /* CTA section */
        .cta-section {
          background: ${R.black}; padding: 80px 24px;
          border-top: 3px solid ${R.black};
        }
        .cta-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 40px; }
        .cta-title { font-size: clamp(32px, 4vw, 52px); font-weight: 900; color: #fff; letter-spacing: -1.5px; line-height: 1; }
        .cta-title em { color: ${R.yellow}; font-style: normal; }
        .cta-sub { font-size: 15px; color: #555; font-weight: 600; margin-top: 12px; }

        /* Footer */
        .footer { background: #0a0a09; padding: 40px 24px 24px; }
        .footer-inner { max-width: 1100px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 32px; padding-bottom: 32px; border-bottom: 1px solid #1a1a1a; margin-bottom: 20px; }
        .footer-brand-name { font-size: 18px; font-weight: 900; color: #fff; display: block; margin-bottom: 6px; }
        .footer-tagline { font-size: 12px; color: #444; font-weight: 600; line-height: 1.5; }
        .footer-col-title { font-size: 10px; font-weight: 800; color: ${R.yellow}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 14px; display: block; }
        .footer-link { display: block; font-size: 13px; color: #444; text-decoration: none; font-weight: 600; margin-bottom: 8px; transition: color 0.1s; }
        .footer-link:hover { color: #fff; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; }
        .footer-copy { font-size: 11px; color: #333; font-weight: 600; }

        /* Skeleton */
        .skeleton { background: ${R.linen}; border-radius: 18px; border: 2px solid ${R.border}; overflow: hidden; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.6} }

        /* Animations */
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }

        /* Mobile */
        @media (max-width: 900px) {
          .hero-right { display: none; }
          .hero-inner { padding: 100px 20px 60px; }
          .stats-inner { grid-template-columns: 1fr 1fr; }
          .stat-item:nth-child(2) { border-right: none; }
          .nav-links { display: none; }
          .footer-top { grid-template-columns: 1fr 1fr; }
          .cta-inner { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stats-inner { grid-template-columns: 1fr 1fr; }
          .footer-top { grid-template-columns: 1fr; }
          .art-grid, .artist-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-pill">
          <a href="/" className="nav-logo">
            <span style={{ fontSize:22, lineHeight:1 }}>🥭</span>
            <span className="nav-logo-text">artomango</span>
          </a>
          <div className="nav-divider" />
          <div className="nav-links">
            <a href="#explore" className="nav-link">Explore</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="/directory/artists" className="nav-link">Artists</a>
            <a href="/directory/venues" className="nav-link">Venues</a>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:4 }}>
            <a href="/login"    className="btn-ghost">Sign in</a>
            <a href="/register" className="btn-pill-cta">Get started →</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />

        {/* Floating artwork previews */}
        <div className="hero-right">
          <div className="preview-stack">
            {/* Card 1 — back */}
            <div className="preview-card" style={{ width:200, height:250, top:20, right:40, transform:"rotate(6deg)", zIndex:1, background:"#fff" }}>
              <img src="https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80" alt="" style={{ width:"100%", height:"75%", objectFit:"cover" }}/>
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:R.black }}>Untitled (Blue Migration)</div>
                <div style={{ fontSize:10, color:R.warm, fontWeight:600 }}>Oil on Linen · $9,500</div>
              </div>
            </div>
            {/* Card 2 — middle */}
            <div className="preview-card" style={{ width:230, height:280, top:60, left:20, transform:"rotate(-4deg)", zIndex:2, background:"#fff" }}>
              <img src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80" alt="" style={{ width:"100%", height:"75%", objectFit:"cover" }}/>
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:R.black }}>Dissolving Tehran</div>
                <div style={{ fontSize:10, color:R.warm, fontWeight:600 }}>Oil on Canvas · $4,800</div>
              </div>
            </div>
            {/* Card 3 — front */}
            <div className="preview-card" style={{ width:210, height:260, bottom:20, right:20, transform:"rotate(2deg)", zIndex:3, background:"#fff" }}>
              <img src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&q=80" alt="" style={{ width:"100%", height:"75%", objectFit:"cover" }}/>
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:R.black }}>Golden Hour</div>
                <div style={{ fontSize:10, color:R.warm, fontWeight:600 }}>Oil on Canvas · $3,600</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-inner">
          <div className="hero-eyebrow">🥭 artomango — art platform</div>
          <h1 className="hero-title">
            Your art,<br />
            <span className="block-white">managed.</span><br />
            Exhibited.
          </h1>
          <p className="hero-sub">
            The platform for artists and venues to manage work, discover collaborations, and grow in the art scene.
          </p>
          <div className="hero-ctas">
            <a href="/register" className="btn-hero-primary">Start for free →</a>
            <button className="btn-hero-secondary" onClick={scrollToExplore}>
              Explore artworks <ChevronDown size={16}/>
            </button>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...Array(2)].map((_, i) =>
            TICKER.map((w, j) => (
              <span key={`${i}-${j}`} className="ticker-item">
                {w} <span className="ticker-dot"/>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[
            { num: artworks.length || "48+", label: "Artworks" },
            { num: artists.filter(a=>a.role==="artist").length || "24+", label: "Artists" },
            { num: artists.filter(a=>a.role!=="artist").length || "12+", label: "Venues" },
            { num: "Prague", label: "Based in" },
          ].map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPLORE SECTION ── */}
      <div ref={exploreRef} id="explore" style={{ background: R.paper, borderTop:`3px solid ${R.border}` }}>
        <div className="explore">
          <div className="explore-header">
            <h2 className="explore-title">Explore the scene</h2>
            <p className="explore-sub">Discover artworks and connect with artists and venues</p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab-btn${tab==="artworks"?" active":""}`} onClick={() => setTab("artworks")}>
              <Grid3X3 size={14}/> Artworks
            </button>
            <button className={`tab-btn${tab==="artists"?" active":""}`} onClick={() => setTab("artists")}>
              <Users size={14}/> Artists & Venues
            </button>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="search-wrap">
              <Search size={14} color={R.warm}/>
              <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab==="artworks" ? "Search artworks, mediums, artists…" : "Search artists or venues…"}/>
              {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#C0B8A8", padding:0, display:"flex" }}><X size={12}/></button>}
            </div>

            {tab === "artworks" && (
              <div className="medium-pills">
                {MEDIUMS.map(m => (
                  <button key={m} className={`medium-pill${medium===m?" active":""}`} onClick={() => setMedium(m)}>{m}</button>
                ))}
              </div>
            )}

            {tab === "artists" && (
              <div style={{ display:"flex", gap:6 }}>
                {["All","Artists","Venues"].map(r => {
                  const key = r==="All"?"all":r==="Artists"?"artist":"gallery";
                  const isActive = (medium===r || (r==="All"&&medium==="All"));
                  return <button key={r} className={`medium-pill${isActive?" active":""}`} onClick={()=>setMedium(r)}>{r}</button>;
                })}
              </div>
            )}
          </div>

          {/* ── ARTWORKS GRID ── */}
          {tab === "artworks" && (
            loading ? (
              <div className="art-grid">
                {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ aspectRatio:"3/4", animationDelay:`${i*0.06}s` }}/>)}
              </div>
            ) : filteredArtworks.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:R.warm, fontSize:15, fontWeight:600 }}>
                No artworks match your filters — try removing some.
              </div>
            ) : (
              <div className="art-grid">
                {filteredArtworks.map((aw, i) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  return (
                    <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} style={{ textDecoration:"none" }}>
                      <div className="art-card fade-up" style={{ animationDelay:`${Math.min(i,12)*0.04}s` }}>
                        <div className="art-thumb">
                          {img
                            ? <img src={img} alt={aw.title} loading="lazy"/>
                            : <div className="art-thumb-empty"><Palette size={28} color="#D4C9A8"/></div>
                          }
                          {(aw.venue_location||aw.location) && (
                            <div style={{ position:"absolute", bottom:8, left:8, background:"rgba(255,255,255,0.92)", borderRadius:9999, padding:"3px 9px", display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:R.black, backdropFilter:"blur(4px)" }}>
                              <MapPin size={9} color="#FF6B6B"/>{(aw.venue_location||aw.location||"").split(",")[0]}
                            </div>
                          )}
                        </div>
                        <div className="art-body">
                          <div className="art-title">{aw.title}</div>
                          <div className="art-medium">{[aw.medium, aw.year].filter(Boolean).join(" · ") || "—"}</div>
                          <div className="art-footer">
                            <div className={`art-price${aw.price?"":" empty"}`}>
                              {aw.price ? `$${Number(aw.price).toLocaleString()}` : "Inquiry"}
                            </div>
                            <div className="art-artist">
                              <div className="art-avatar">
                                {aw.artist_avatar
                                  ? <img src={aw.artist_avatar} alt=""/>
                                  : initials(aw.artist_name||"A")
                                }
                              </div>
                              <span className="art-avatar-name">{aw.artist_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {/* ── ARTISTS GRID ── */}
          {tab === "artists" && (
            loading ? (
              <div className="artist-grid">
                {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:240, animationDelay:`${i*0.06}s` }}/>)}
              </div>
            ) : filteredArtists.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:R.warm, fontSize:15, fontWeight:600 }}>
                No profiles found.
              </div>
            ) : (
              <div className="artist-grid">
                {filteredArtists
                  .filter(a => medium==="All" || (medium==="Artists"?a.role==="artist":a.role!=="artist"))
                  .map((artist, i) => (
                    <div key={artist.id} className="artist-card fade-up" style={{ animationDelay:`${Math.min(i,12)*0.04}s` }}>
                      {/* Cover */}
                      <div className="artist-cover">
                        {artist.cover_image
                          ? <img src={artist.cover_image} alt="" loading="lazy"/>
                          : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, ${R.yellow}33, ${R.cream})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {artist.role==="artist"? <Palette size={28} color={R.warm}/> : <Building2 size={28} color={R.warm}/>}
                            </div>
                        }
                      </div>
                      {/* Body */}
                      <div className="artist-body">
                        <div className="artist-avatar-wrap">
                          <div className="artist-avatar-lg">
                            {artist.avatar_url
                              ? <img src={artist.avatar_url} alt=""/>
                              : initials(artist.full_name||"A")
                            }
                          </div>
                        </div>
                        <div className="artist-name">{artist.full_name || "Artist"}</div>
                        <div className="artist-role">{artist.role || "artist"}</div>
                        <div className="artist-bio">{artist.bio || "No bio yet."}</div>
                        <div className="artist-footer">
                          <div>
                            <div className="artist-count">{artist.artwork_count} work{artist.artwork_count!==1?"s":""}</div>
                            {artist.location && (
                              <div className="artist-loc">
                                <MapPin size={10} color="#FF6B6B"/>
                                <span>{artist.location}</span>
                              </div>
                            )}
                          </div>
                          <Link href={`/portfolio/${artist.username||artist.id}`} className="view-btn">
                            View profile <ArrowRight size={12}/>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── CTA SECTION ── */}
      <div className="cta-section">
        <div className="cta-inner">
          <div>
            <h2 className="cta-title">
              Stop managing art<br />
              in <em>spreadsheets.</em>
            </h2>
            <p className="cta-sub">Join artists and venues already on Artomango.</p>
          </div>
          <a href="/register" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"16px 32px", background:R.yellow, color:R.black, fontFamily:"inherit", fontSize:16, fontWeight:900, borderRadius:14, border:"none", textDecoration:"none", boxShadow:`5px 5px 0 rgba(255,212,0,0.3)`, transition:"all 0.12s", whiteSpace:"nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="7px 7px 0 rgba(255,212,0,0.4)"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow=`5px 5px 0 rgba(255,212,0,0.3)`; (e.currentTarget as HTMLElement).style.transform=""; }}>
            🥭 Get started free →
          </a>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <span style={{ fontSize:28 }}>🥭</span>
              <span className="footer-brand-name">artomango</span>
              <span className="footer-tagline">Manage, Exhibit, Collab.<br/>The platform for artists and venues.</span>
            </div>
            <div>
              <span className="footer-col-title">Platform</span>
              <a href="/dashboard" className="footer-link">Dashboard</a>
              <a href="/dashboard/artworks" className="footer-link">Artworks</a>
              <a href="/dashboard/exhibitions" className="footer-link">Events</a>
              <a href="/dashboard/map" className="footer-link">Map</a>
            </div>
            <div>
              <span className="footer-col-title">Explore</span>
              <a href="/directory/artists" className="footer-link">Artists</a>
              <a href="/directory/venues" className="footer-link">Venues</a>
              <a href="#explore" className="footer-link">Artworks</a>
            </div>
            <div>
              <span className="footer-col-title">Account</span>
              <a href="/login" className="footer-link">Sign in</a>
              <a href="/register" className="footer-link">Get started</a>
              <a href="/admin" className="footer-link">Admin</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">🥭 artomango · © 2026 · Manage, Exhibit, Collab</span>
            <div style={{ display:"flex", gap:16 }}>
              <a href="#" className="footer-link" style={{ marginBottom:0, fontSize:11 }}>Privacy</a>
              <a href="#" className="footer-link" style={{ marginBottom:0, fontSize:11 }}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
