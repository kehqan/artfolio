"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search, X, MapPin, ArrowRight, ChevronLeft, ChevronRight,
  ImageIcon, Calendar, Users, Palette, Building2,
  Globe, Instagram, BookOpen, GlassWater, Mic,
  Home, ShoppingBag, Sparkles, Laptop, Clock,
  LogOut, LayoutDashboard, Menu,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; images?: string[];
  price?: number; status: string; medium?: string; year?: number;
  artist_name?: string; artist_username?: string; artist_avatar?: string;
  venue_location?: string;
};
type Artist = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; cover_image?: string;
};
type Venue = {
  id: string; full_name: string; username?: string;
  bio?: string; location?: string; avatar_url?: string;
  cover_image?: string;
};
type Event = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string; event_type?: string;
  is_online?: boolean; online_url?: string; cover_image?: string;
  user_id?: string; location_name?: string;
};
type Resource = {
  id: string; type: string; title: string; url?: string; description?: string;
};
type Profile = { id: string; full_name: string; avatar_url?: string; username?: string } | null;

// ── Event type config ──────────────────────────────────────────────
const ET: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  exhibition:      { label: "Exhibition",      icon: <Palette size={12}/>,     color: "#8B5CF6", bg: "#EDE9FE" },
  workshop:        { label: "Workshop",        icon: <BookOpen size={12}/>,    color: "#16A34A", bg: "#DCFCE7" },
  online_workshop: { label: "Online Workshop", icon: <Laptop size={12}/>,      color: "#0EA5E9", bg: "#E0F2FE" },
  drink_draw:      { label: "Drink & Draw",    icon: <GlassWater size={12}/>,  color: "#FF6B6B", bg: "#FFE4E6" },
  artist_talk:     { label: "Artist Talk",     icon: <Mic size={12}/>,         color: "#CA8A04", bg: "#FEF9C3" },
  open_studio:     { label: "Open Studio",     icon: <Home size={12}/>,        color: "#D97706", bg: "#FEF3C7" },
  gathering:       { label: "Gathering",       icon: <Users size={12}/>,       color: "#4ECDC4", bg: "#F0FDF4" },
  popup:           { label: "Pop-up",          icon: <ShoppingBag size={12}/>, color: "#EC4899", bg: "#FCE7F3" },
  other:           { label: "Other",           icon: <Sparkles size={12}/>,    color: "#9B8F7A", bg: "#F5F0E8" },
};
function getET(type?: string) { return ET[type || "other"] || ET["other"]; }

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isUpcoming(ev: Event) {
  const ref = ev.end_date || ev.start_date;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0,0,0,0));
}

// ── Horizontal scroll section ──────────────────────────────────────
function HScroll({ children, gap = 14 }: { children: React.ReactNode; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d, behavior: "smooth" });
  return (
    <div style={{ position: "relative" }}>
      <div ref={ref} style={{ display: "flex", gap, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────
function SectionHead({ emoji, title, sub, cta, ctaHref }: {
  emoji: string; title: string; sub?: string; cta?: string; ctaHref?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>
          {emoji} {sub || ""}
        </div>
        <h2 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: "#111110", letterSpacing: "-0.6px", margin: 0 }}>{title}</h2>
      </div>
      {cta && ctaHref && (
        <Link href={ctaHref} style={{ textDecoration: "none", flexShrink: 0 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "2px solid #111110", borderRadius: 9999, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#FFD400"; el.style.boxShadow = "2px 2px 0 #111110"; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#fff"; el.style.boxShadow = "none"; }}>
            {cta} <ArrowRight size={12} />
          </button>
        </Link>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
export default function ExplorePage() {
  const router = useRouter();
  const [profile, setProfile]   = useState<Profile>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [search, setSearch]     = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [mobileMenu, setMobileMenu]   = useState(false);
  const [artworks, setArtworks]   = useState<Artwork[]>([]);
  const [artists, setArtists]     = useState<Artist[]>([]);
  const [venues, setVenues]       = useState<Venue[]>([]);
  const [events, setEvents]       = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const sb = createClient();

    // Auth
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: p } = await sb.from("profiles").select("id,full_name,avatar_url,username").eq("id", user.id).single();
      setProfile(p);
    }
    setUserLoaded(true);

    // Artworks
    const { data: awData } = await sb.from("artworks")
      .select("id,title,images,price,status,medium,year,user_id,venue_location")
      .in("status", ["available","Available"]).not("images","is",null)
      .order("created_at", { ascending: false }).limit(24);

    if (awData?.length) {
      const uids = Array.from(new Set(awData.map(a => a.user_id).filter(Boolean)));
      const { data: profs } = await sb.from("profiles").select("id,full_name,username,avatar_url").in("id", uids);
      const pm: Record<string, any> = {};
      profs?.forEach(p => { pm[p.id] = p; });
      setArtworks(awData.map(a => ({
        ...a,
        artist_name: pm[a.user_id]?.full_name,
        artist_username: pm[a.user_id]?.username,
        artist_avatar: pm[a.user_id]?.avatar_url,
      })));
    }

    // Artists (role = artist)
    const { data: artistData } = await sb.from("profiles")
      .select("id,full_name,username,role,bio,location,avatar_url")
      .eq("role","artist").not("full_name","is",null).limit(20);

    if (artistData?.length) {
      const enriched = await Promise.all(artistData.map(async p => {
        const [{ count }, { data: cover }] = await Promise.all([
          sb.from("artworks").select("*",{count:"exact",head:true}).eq("user_id",p.id),
          sb.from("artworks").select("images").eq("user_id",p.id).not("images","is",null).limit(1).maybeSingle(),
        ]);
        return { ...p, artwork_count: count||0, cover_image: cover?.images?.[0]||null };
      }));
      setArtists(enriched);
    }

    // Venues (role = gallery)
    const { data: venueData } = await sb.from("profiles")
      .select("id,full_name,username,bio,location,avatar_url")
      .eq("role","gallery").not("full_name","is",null).limit(16);
    setVenues(venueData || []);

    // Events (public, upcoming first)
    const { data: evData } = await sb.from("exhibitions")
      .select("id,title,venue,start_date,end_date,status,event_type,is_online,online_url,cover_image,user_id,location_name")
      .eq("is_public", true).order("start_date", { ascending: true }).limit(20);
    setEvents((evData || []).filter(isUpcoming).concat((evData || []).filter(e => !isUpcoming(e))));

    // Education resources (public)
    const { data: resData } = await sb.from("education_resources")
      .select("id,type,title,url,description").order("created_at", { ascending: false }).limit(12);
    setResources(resData || []);

    setLoading(false);
  }

  async function handleSignOut() {
    const sb = createClient();
    await sb.auth.signOut();
    setProfile(null);
    setMobileMenu(false);
  }

  // ── Search filter ──────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filteredArtworks = q ? artworks.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.medium||"").toLowerCase().includes(q) ||
    (a.artist_name||"").toLowerCase().includes(q)
  ) : artworks;
  const filteredArtists = q ? artists.filter(a =>
    a.full_name.toLowerCase().includes(q) ||
    (a.location||"").toLowerCase().includes(q)
  ) : artists;
  const filteredVenues = q ? venues.filter(v =>
    v.full_name.toLowerCase().includes(q) ||
    (v.location||"").toLowerCase().includes(q)
  ) : venues;
  const filteredEvents = q ? events.filter(e =>
    e.title.toLowerCase().includes(q) ||
    (e.venue||"").toLowerCase().includes(q)
  ) : events;

  const initials = profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "A";
  const upcomingEvents = filteredEvents.filter(isUpcoming);
  const workshops = filteredEvents.filter(e => e.event_type === "workshop" || e.event_type === "online_workshop");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-family: 'Darker Grotesque', system-ui, sans-serif; scroll-behavior: smooth; }
        body { background: #FFFBEA; color: #111110; font-family: 'Darker Grotesque', system-ui, sans-serif; }

        /* ── NAV ── */
        .ex-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,251,234,0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 2.5px solid #111110;
        }
        .ex-nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; gap: 12;
          padding: 0 20px; height: 56px;
        }

        /* ── SEARCH ── */
        .ex-search-wrap {
          display: flex; align-items: center; gap: 8px;
          flex: 1; max-width: 440px;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 9999px;
          padding: 0 16px; height: 40px;
          transition: border-color .15s, box-shadow .15s;
        }
        .ex-search-wrap.focused {
          border-color: #FFD400;
          box-shadow: 0 0 0 3px rgba(255,212,0,.2);
        }
        .ex-search-inp {
          flex: 1; border: none; outline: none;
          font-size: 14px; font-family: inherit; font-weight: 600;
          color: #111110; background: transparent;
        }
        .ex-search-inp::placeholder { color: #C0B8A8; font-weight: 500; }

        /* ── HERO ── */
        .ex-hero {
          background: #111110;
          border-bottom: 3px solid #111110;
          padding: 52px 20px 48px;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .ex-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 60%, rgba(255,212,0,.06) 0%, transparent 60%),
                      radial-gradient(circle at 75% 30%, rgba(78,205,196,.05) 0%, transparent 50%);
          pointer-events: none;
        }
        .ex-hero-mango {
          font-size: 56px; line-height: 1;
          display: block; margin-bottom: 20px;
          animation: heroFloat 4s ease-in-out infinite;
        }
        @keyframes heroFloat {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-10px) rotate(3deg); }
        }
        .ex-hero-title {
          font-size: clamp(36px,7vw,64px);
          font-weight: 900; color: #fff;
          letter-spacing: -2.5px; line-height: 0.9;
          margin-bottom: 14px;
        }
        .ex-hero-title .yt { color: #FFD400; }
        .ex-hero-sub {
          font-size: clamp(14px,2vw,17px);
          font-weight: 600; color: rgba(255,255,255,.4);
          max-width: 420px; margin: 0 auto 28px;
          line-height: 1.5;
        }
        .ex-hero-ctas { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: #FFD400; color: #111110;
          border: 2.5px solid #FFD400; border-radius: 14px;
          font-family: inherit; font-size: 15px; font-weight: 800;
          cursor: pointer; text-decoration: none;
          box-shadow: 4px 4px 0 rgba(255,212,0,.3);
          transition: all .2s cubic-bezier(.16,1,.3,1);
        }
        .btn-hero-primary:hover { box-shadow:6px 6px 0 rgba(255,212,0,.4); transform:translate(-1px,-1px); }
        .btn-hero-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: transparent; color: rgba(255,255,255,.7);
          border: 2px solid rgba(255,255,255,.2); border-radius: 14px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          transition: all .15s;
        }
        .btn-hero-ghost:hover { border-color: rgba(255,255,255,.5); color:#fff; }

        /* ── MAIN CONTENT ── */
        .ex-main { max-width: 1200px; margin: 0 auto; padding: 40px 20px 80px; }

        /* ── STATS TICKER ── */
        .ex-stats {
          display: grid; grid-template-columns: repeat(4,1fr);
          border: 2.5px solid #111110; border-radius: 18px;
          overflow: hidden; margin-bottom: 44px;
          box-shadow: 4px 4px 0 #D4C9A8; background: #fff;
        }
        .ex-stat {
          padding: 16px; text-align: center;
          border-right: 1px solid #E8E0D0;
        }
        .ex-stat:last-child { border-right: none; }
        .ex-stat-n { font-size: 26px; font-weight: 900; color: #111110; letter-spacing:-1px; }
        .ex-stat-l { font-size: 9px; font-weight: 800; color: #9B8F7A; text-transform:uppercase; letter-spacing:.14em; margin-top:3px; }

        /* ── ARTWORK GRID ── */
        .aw-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .aw-card {
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: all .3s cubic-bezier(.16,1,.3,1);
          text-decoration: none;
          display: block;
        }
        .aw-card:hover {
          border-color: #111110;
          box-shadow: 5px 6px 0 #111110;
          transform: translate(-2px,-2px);
        }
        .aw-card:hover .aw-img { transform: scale(1.06); }
        .aw-img { transition: transform .5s cubic-bezier(.16,1,.3,1); }

        /* ── ARTIST CARD (horizontal scroll) ── */
        .artist-card {
          width: 200px; flex-shrink: 0;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: all .25s cubic-bezier(.16,1,.3,1);
          text-decoration: none;
          display: block;
        }
        .artist-card:hover {
          border-color: #111110;
          box-shadow: 4px 5px 0 #111110;
          transform: translate(-1px,-2px);
        }

        /* ── VENUE CARD ── */
        .venue-card {
          width: 240px; flex-shrink: 0;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          transition: all .25s cubic-bezier(.16,1,.3,1);
          text-decoration: none;
          display: block;
        }
        .venue-card:hover {
          border-color: #111110;
          box-shadow: 4px 5px 0 #111110;
          transform: translate(-1px,-2px);
        }

        /* ── EVENT CARD ── */
        .ev-card {
          width: 260px; flex-shrink: 0;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 18px;
          overflow: hidden;
          transition: all .25s cubic-bezier(.16,1,.3,1);
          cursor: default;
        }
        .ev-card:hover {
          border-color: #111110;
          box-shadow: 4px 5px 0 #111110;
          transform: translate(-1px,-2px);
        }

        /* ── RESOURCE CARD ── */
        .res-card {
          width: 220px; flex-shrink: 0;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 16px;
          overflow: hidden;
          transition: all .2s;
          text-decoration: none;
          display: block;
        }
        .res-card:hover {
          border-color: #111110;
          box-shadow: 3px 4px 0 #111110;
          transform: translate(-1px,-1px);
        }

        /* ── MOBILE MENU ── */
        .mobile-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
        }
        .mobile-panel {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(300px, 85vw);
          background: #FFFBEA;
          border-left: 2.5px solid #111110;
          z-index: 201;
          display: flex; flex-direction: column;
          overflow-y: auto;
        }

        /* ── EDUCATION BAND ── */
        .edu-band {
          background: #111110;
          border-radius: 22px;
          border: 2.5px solid #111110;
          padding: 32px 28px;
          margin-bottom: 40px;
          box-shadow: 6px 6px 0 #FFD400;
        }

        /* ── SCROLLBAR HIDE ── */
        *::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }

        /* ── SECTION SEPARATOR ── */
        .ex-sep { height: 1.5px; background: #E8E0D0; margin: 44px 0; border-radius: 1px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 600px) {
          .ex-stats { grid-template-columns: repeat(2,1fr); }
          .ex-stat:nth-child(2) { border-right: none; }
          .ex-stat:nth-child(3) { border-right: 1px solid #E8E0D0; }
          .aw-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .ex-hero { padding: 40px 16px 36px; }
          .ex-nav-inner { gap: 8px; padding: 0 14px; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        .fade-up { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .d1 { animation-delay: .05s; }
        .d2 { animation-delay: .1s; }
        .d3 { animation-delay: .15s; }
      `}</style>

      {/* ════════════════════════════
          STICKY NAV
      ════════════════════════════ */}
      <header className="ex-nav">
        <div className="ex-nav-inner" style={{ display:"flex", alignItems:"center", gap:12, padding:"0 20px", height:56, maxWidth:1200, margin:"0 auto" }}>
          {/* Logo */}
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:6, textDecoration:"none", flexShrink:0 }}>
            <span style={{ fontSize:22, lineHeight:1 }}>🥭</span>
            <span style={{ fontSize:15, fontWeight:900, color:"#111110", letterSpacing:"-0.3px" }}>artomango</span>
          </Link>

          {/* Search */}
          <div className={`ex-search-wrap${searchFocus?" focused":""}`} style={{ flex:1, maxWidth:440, margin:"0 auto" }}>
            <Search size={15} color={searchFocus?"#FFD400":"#C0B8A8"} style={{ flexShrink:0 }} />
            <input
              ref={searchRef}
              className="ex-search-inp"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search artists, artworks, events…"
            />
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#C0B8A8", padding:0, display:"flex" }}><X size={14}/></button>}
          </div>

          {/* Right nav */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {userLoaded && (
              profile ? (
                <>
                  <Link href="/dashboard" style={{ textDecoration:"none" }}>
                    <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", border:"2px solid #E8E0D0", borderRadius:9999, background:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      <LayoutDashboard size={13} />
                      <span style={{ display:"none" }} className="desk-only">Dashboard</span>
                    </button>
                  </Link>
                  <div style={{ width:34, height:34, borderRadius:"50%", border:"2.5px solid #111110", background:"#FFD400", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, cursor:"pointer" }}
                    onClick={() => setMobileMenu(true)}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : initials}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ textDecoration:"none" }}>
                    <button style={{ padding:"7px 14px", border:"2px solid #E8E0D0", borderRadius:9999, background:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#111110" }}>
                      Sign in
                    </button>
                  </Link>
                  <Link href="/register" style={{ textDecoration:"none" }}>
                    <button style={{ padding:"7px 16px", border:"2.5px solid #111110", borderRadius:9999, background:"#FFD400", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110" }}>
                      Join free
                    </button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* ════════════════════════════
          HERO (non-logged only)
      ════════════════════════════ */}
      {!profile && userLoaded && (
        <div className="ex-hero">
          <span className="ex-hero-mango">🥭</span>
          <h1 className="ex-hero-title">
            Where art<br/>
            <span className="yt">finds its place.</span>
          </h1>
          <p className="ex-hero-sub">
            Discover artworks from independent artists, find workshops, and connect with the local art scene.
          </p>
          <div className="ex-hero-ctas">
            <Link href="/register" className="btn-hero-primary">
              Join as artist <ArrowRight size={16}/>
            </Link>
            <Link href="/register?type=venue" className="btn-hero-ghost">
              I run a venue
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          MAIN CONTENT
      ════════════════════════════ */}
      <main className="ex-main">

        {/* Stats */}
        {!loading && (
          <div className="ex-stats fade-up">
            {[
              { n: artworks.length,  l: "Artworks",  accent: "#FFD400" },
              { n: artists.length,   l: "Artists",   accent: "#FF6B6B" },
              { n: venues.length,    l: "Venues",    accent: "#4ECDC4" },
              { n: upcomingEvents.length, l: "Events", accent: "#8B5CF6" },
            ].map(s => (
              <div key={s.l} className="ex-stat">
                <div className="ex-stat-n" style={{ color: s.accent }}>{s.n}</div>
                <div className="ex-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── ARTWORKS ── */}
        <section className="fade-up d1" style={{ marginBottom:44 }}>
          <SectionHead emoji="🎨" sub="Available now" title="Artworks" cta="See all" ctaHref="/register" />

          {loading ? (
            <div className="aw-grid">
              {[...Array(8)].map((_,i) => (
                <div key={i} style={{ background:"#E8E0D0", borderRadius:18, aspectRatio:"3/4", animation:`pulse 1.5s ${i*0.1}s ease-in-out infinite` }}/>
              ))}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
            </div>
          ) : filteredArtworks.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#9B8F7A", border:"2px dashed #E0D8CA", borderRadius:18 }}>No artworks found</div>
          ) : (
            <div className="aw-grid">
              {filteredArtworks.slice(0,12).map((aw, i) => {
                const img = Array.isArray(aw.images) ? aw.images[0] : null;
                return (
                  <Link key={aw.id} href={aw.artist_username ? `/${aw.artist_username}` : "/explore"} className="aw-card">
                    <div style={{ aspectRatio:"4/3", overflow:"hidden", background:"#FAF7F3", position:"relative" }}>
                      {img
                        ? <img src={img} alt={aw.title} className="aw-img" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy"/>
                        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={24} color="#D4C9A8"/></div>
                      }
                      {/* Status dot */}
                      <div style={{ position:"absolute", bottom:8, left:8, padding:"3px 8px", borderRadius:9999, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(6px)", fontSize:9, fontWeight:800, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        Available
                      </div>
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{aw.title}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          {aw.artist_avatar
                            ? <img src={aw.artist_avatar} alt="" style={{ width:16, height:16, borderRadius:"50%", objectFit:"cover", border:"1.5px solid #E8E0D0" }}/>
                            : <div style={{ width:16, height:16, borderRadius:"50%", background:"#FFD400", border:"1.5px solid #E8E0D0", fontSize:7, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>{(aw.artist_name||"A")[0]}</div>
                          }
                          <span style={{ fontSize:11, color:"#9B8F7A", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:90 }}>{aw.artist_name||"Artist"}</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:900, color:aw.price?"#111110":"#D4C9A8", fontFamily:"monospace" }}>
                          {aw.price ? `$${Number(aw.price).toLocaleString()}` : "Inquiry"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="ex-sep"/>

        {/* ── ARTISTS ── */}
        <section className="fade-up d2" style={{ marginBottom:44 }}>
          <SectionHead emoji="👤" sub="Discover creators" title="Artists" cta="All artists" ctaHref="/register" />
          <HScroll>
            {filteredArtists.map((artist, i) => (
              <Link key={artist.id} href={artist.username ? `/${artist.username}` : "/explore"} className="artist-card">
                {/* Cover */}
                <div style={{ height:80, background:artist.cover_image?"#FAF7F3":"linear-gradient(135deg,#FFD40033,#F5F0E8)", overflow:"hidden", position:"relative" }}>
                  {artist.cover_image
                    ? <img src={artist.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy"/>
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><Palette size={24} color="#C0B8A8"/></div>
                  }
                </div>
                {/* Avatar overlapping */}
                <div style={{ padding:"0 14px 14px" }}>
                  <div style={{ marginTop:-20, marginBottom:8 }}>
                    <div style={{ width:40, height:40, borderRadius:12, border:"3px solid #fff", background:"#FFD400", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"#111110", overflow:"hidden", boxShadow:"2px 2px 0 #E8E0D0" }}>
                      {artist.avatar_url
                        ? <img src={artist.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy"/>
                        : (artist.full_name[0]||"A")}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{artist.full_name}</div>
                  {artist.location && (
                    <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:"#9B8F7A", fontWeight:600, marginBottom:4 }}>
                      <MapPin size={9} color="#FF6B6B"/>{artist.location}
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A" }}>{artist.artwork_count} works</span>
                    <ArrowRight size={12} color="#C0B8A8"/>
                  </div>
                </div>
              </Link>
            ))}
            {filteredArtists.length === 0 && !loading && (
              <div style={{ padding:"32px 24px", color:"#9B8F7A", fontSize:13, fontWeight:600 }}>No artists found</div>
            )}
          </HScroll>
        </section>

        <div className="ex-sep"/>

        {/* ── VENUES ── */}
        <section className="fade-up d3" style={{ marginBottom:44 }}>
          <SectionHead emoji="🏛️" sub="Galleries & spaces" title="Venues" cta="All venues" ctaHref="/register" />
          <HScroll>
            {filteredVenues.map(venue => (
              <Link key={venue.id} href={venue.username ? `/${venue.username}` : "/explore"} className="venue-card">
                {/* Cover */}
                <div style={{ height:110, background:"#FAF7F3", overflow:"hidden", position:"relative" }}>
                  {venue.cover_image
                    ? <img src={venue.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy"/>
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#4ECDC433,#F5F0E8)" }}>
                        <Building2 size={32} color="#C0B8A8"/>
                      </div>
                  }
                  <div style={{ position:"absolute", top:8, left:8, padding:"2px 8px", borderRadius:9999, background:"rgba(255,255,255,0.9)", fontSize:9, fontWeight:800, color:"#0C4A6E", backdropFilter:"blur(4px)" }}>
                    Venue
                  </div>
                </div>
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:"#111110", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{venue.full_name}</div>
                  {venue.location && (
                    <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, color:"#9B8F7A", fontWeight:600, marginBottom:6 }}>
                      <MapPin size={10} color="#FF6B6B"/>{venue.location}
                    </div>
                  )}
                  {venue.bio && (
                    <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:500, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
                      {venue.bio}
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {filteredVenues.length === 0 && !loading && (
              <div style={{ padding:"32px 24px", color:"#9B8F7A", fontSize:13, fontWeight:600 }}>No venues found</div>
            )}
          </HScroll>
        </section>

        <div className="ex-sep"/>

        {/* ── EVENTS ── */}
        <section style={{ marginBottom:44 }}>
          <SectionHead emoji="📅" sub="What's happening" title="Events" cta="All events" ctaHref="/dashboard/exhibitions" />
          <HScroll>
            {upcomingEvents.slice(0,10).map(ev => {
              const etc = getET(ev.event_type);
              return (
                <div key={ev.id} className="ev-card">
                  {/* Type bar */}
                  <div style={{ padding:"8px 12px", background:etc.bg, borderBottom:`1px solid ${etc.color}22`, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:etc.color }}>{etc.icon}</span>
                    <span style={{ fontSize:9, fontWeight:900, color:etc.color, textTransform:"uppercase", letterSpacing:"0.12em" }}>{etc.label}</span>
                    {ev.is_online && <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:"#0EA5E9", background:"#E0F2FE", padding:"1px 6px", borderRadius:4 }}>Online</span>}
                  </div>
                  {/* Cover */}
                  <div style={{ height:120, background:"#FAF7F3", overflow:"hidden" }}>
                    {ev.cover_image
                      ? <img src={ev.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy"/>
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🗓️</div>
                    }
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#111110", marginBottom:6, lineHeight:1.25 }}>{ev.title}</div>
                    {ev.start_date && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#9B8F7A", fontWeight:600, marginBottom:4 }}>
                        <Clock size={11} color="#9B8F7A"/>
                        {fmtDate(ev.start_date)}{ev.end_date && ev.end_date!==ev.start_date?` — ${fmtDate(ev.end_date)}`:""}
                      </div>
                    )}
                    {(ev.venue||ev.location_name) && !ev.is_online && (
                      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#9B8F7A", fontWeight:600 }}>
                        <MapPin size={10} color="#FF6B6B"/>{ev.venue||ev.location_name}
                      </div>
                    )}
                    {ev.is_online && ev.online_url && (
                      <a href={ev.online_url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#0EA5E9", textDecoration:"none", marginTop:2 }}>
                        <Globe size={10}/> Join online →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && !loading && (
              <div style={{ padding:"32px 24px", color:"#9B8F7A", fontSize:13, fontWeight:600 }}>No upcoming events right now</div>
            )}
          </HScroll>
        </section>

        {/* ── EDUCATION BAND ── */}
        {(workshops.length > 0 || resources.length > 0) && (
          <div className="edu-band" style={{ marginBottom:44 }}>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,212,0,.6)", textTransform:"uppercase", letterSpacing:"0.18em", marginBottom:6 }}>📚 Education Hub</div>
              <h2 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, color:"#FFD400", letterSpacing:"-0.8px", margin:0 }}>Learn & grow</h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.35)", fontWeight:600, marginTop:6, maxWidth:420 }}>
                Workshops, tutorials, and community resources from the Artomango community.
              </p>
            </div>

            {/* Workshops */}
            {workshops.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>🎓 Workshops</div>
                <HScroll gap={10}>
                  {workshops.slice(0,6).map(ev => {
                    const etc = getET(ev.event_type);
                    return (
                      <div key={ev.id} style={{ width:230, flexShrink:0, background:"rgba(255,255,255,.07)", border:"1.5px solid rgba(255,255,255,.1)", borderRadius:16, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                          <div style={{ color:etc.color }}>{etc.icon}</div>
                          <span style={{ fontSize:9, fontWeight:800, color:etc.color, textTransform:"uppercase" }}>{etc.label}</span>
                          {ev.is_online && <span style={{ fontSize:9, fontWeight:700, color:"#0EA5E9", background:"rgba(14,165,233,.15)", padding:"1px 5px", borderRadius:4, marginLeft:"auto" }}>Online</span>}
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:6, lineHeight:1.2 }}>{ev.title}</div>
                        {ev.start_date && <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600 }}>{fmtDate(ev.start_date)}</div>}
                        {ev.is_online && ev.online_url && (
                          <a href={ev.online_url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:10, fontSize:11, fontWeight:700, color:"#FFD400", textDecoration:"none" }}>
                            Join <ArrowRight size={10}/>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </HScroll>
              </div>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>📖 Resources</div>
                <HScroll gap={10}>
                  {resources.map(res => {
                    const ytId = res.type==="video" && res.url
                      ? res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]
                      : null;
                    const resColors = { video:"#FF0000", article:"#0EA5E9", post:"#8B5CF6" };
                    const resColor = resColors[res.type as keyof typeof resColors] || "#9B8F7A";
                    return (
                      <a key={res.id} href={res.url||"#"} target="_blank" rel="noopener noreferrer" className="res-card"
                        style={{ background:"rgba(255,255,255,.06)", border:"1.5px solid rgba(255,255,255,.1)", borderRadius:16, width:210, flexShrink:0, display:"block", textDecoration:"none", overflow:"hidden", transition:"all .15s" }}>
                        {ytId && (
                          <div style={{ position:"relative" }}>
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} loading="lazy"/>
                            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,0,0,.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <span style={{ color:"#fff", fontSize:12, marginLeft:2 }}>▶</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{ padding:"10px 12px" }}>
                          <div style={{ fontSize:9, fontWeight:800, color:resColor, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5 }}>
                            {res.type}
                          </div>
                          <div style={{ fontSize:12, fontWeight:800, color:"#fff", lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any, overflow:"hidden" }}>
                            {res.title}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </HScroll>
              </div>
            )}
          </div>
        )}

        {/* ── JOIN CTA (non-logged) ── */}
        {!profile && userLoaded && (
          <div style={{ background:"#111110", border:"2.5px solid #111110", borderRadius:22, padding:"40px 32px", textAlign:"center", boxShadow:"6px 6px 0 #FFD400" }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🥭</div>
            <h2 style={{ fontSize:"clamp(26px,5vw,40px)", fontWeight:900, color:"#FFD400", letterSpacing:"-1px", marginBottom:10, lineHeight:1 }}>
              Ready to join<br/>the scene?
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.35)", fontWeight:600, marginBottom:28, maxWidth:360, margin:"0 auto 28px" }}>
              Artists manage their work. Venues discover talent. Everyone grows together.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/register" className="btn-hero-primary">Create free account</Link>
              <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"13px 24px", border:"2px solid rgba(255,255,255,.2)", borderRadius:14, fontSize:15, fontWeight:700, color:"rgba(255,255,255,.6)", textDecoration:"none" }}>
                Sign in
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════
          MOBILE SIDE MENU
      ════════════════════════════ */}
      {mobileMenu && (
        <>
          <div className="mobile-overlay" onClick={() => setMobileMenu(false)}/>
          <div className="mobile-panel">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:"2px solid #111110" }}/>
                  : <div style={{ width:36, height:36, borderRadius:"50%", background:"#FFD400", border:"2px solid #111110", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900 }}>{initials}</div>}
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#111110" }}>{profile?.full_name}</div>
                  {profile?.username && <div style={{ fontSize:11, color:"#9B8F7A" }}>@{profile.username}</div>}
                </div>
              </div>
              <button onClick={() => setMobileMenu(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
            </div>
            <div style={{ padding:"12px 16px", flex:1 }}>
              {[
                { href:"/dashboard", label:"Dashboard", icon:<LayoutDashboard size={16}/> },
                { href:profile?.username?`/${profile.username}`:"/explore", label:"My Profile", icon:<Users size={16}/> },
                { href:"/dashboard/artworks", label:"My Artworks", icon:<ImageIcon size={16}/> },
                { href:"/dashboard/exhibitions", label:"Events", icon:<Calendar size={16}/> },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration:"none" }} onClick={() => setMobileMenu(false)}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 8px", borderBottom:"1px solid #F5F0E8", fontSize:14, fontWeight:700, color:"#111110" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                    onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                    {item.icon}{item.label}
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ padding:"12px 16px 24px", borderTop:"2px solid #111110" }}>
              <button onClick={handleSignOut} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 8px", border:"none", background:"none", cursor:"pointer", fontSize:14, fontWeight:700, color:"#EF4444", fontFamily:"inherit" }}>
                <LogOut size={16}/> Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer style={{ background:"#111110", padding:"28px 20px", textAlign:"center", borderTop:"3px solid #111110" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700, color:"#555" }}>
            <span>🥭</span>
            <a href="/" style={{ color:"#FFD400", textDecoration:"none", fontWeight:900 }}>artomango</a>
            <span>· Art · Community · Discovery</span>
          </div>
          <div style={{ display:"flex", gap:16 }}>
            <Link href="/login" style={{ fontSize:12, fontWeight:700, color:"#555", textDecoration:"none" }}>Sign in</Link>
            <Link href="/register" style={{ fontSize:12, fontWeight:800, color:"#FFD400", textDecoration:"none" }}>Join free →</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

import React from "react";
