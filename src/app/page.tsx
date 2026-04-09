"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search, MapPin, X, ChevronDown,
  Palette, Building2, Users, Grid3X3,
  Package, TrendingUp, Handshake, Globe, BarChart3, CalendarDays,
  ArrowRight, ImageIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  price?: number; currency?: string; images?: string[];
  venue_location?: string; location?: string;
  artist_name?: string; artist_avatar?: string;
  user_id?: string;
};
type Artist = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; cover_image?: string;
};
type ExploreTab = "artworks" | "artists";

const MEDIUMS = ["All","Oil","Photography","Sculpture","Digital","Printmaking","Mixed media"];

// ── Feature data ──────────────────────────────────────────────────
const FEATURES = [
  {
    id: "studio", emoji: "🎨", label: "Studio", tag: "Art Inventory",
    headline: "Every artwork.\nAlways tracked.",
    sub: "Add a piece once — photo, title, medium, size, price, location, status. Never lose track of where a work is, who's holding it, or what it sold for.",
    color: "#FFD400", textColor: "#111110",
    visual: "inventory",
    pain: "I track my works in a spreadsheet that's always out of date.",
    gain: "One source of truth for your entire inventory, forever.",
  },
  {
    id: "portfolio", emoji: "🌐", label: "Portfolio", tag: "Public Profile",
    headline: "Your gallery,\nlive on the web.",
    sub: "Your works become a public portfolio at artomango.com/you. Clean, fast, shareable — send it to galleries, collectors, or anyone.",
    color: "#111110", textColor: "#FFD400",
    visual: "portfolio",
    pain: "I have no single place to send people to see my work.",
    gain: "A permanent, beautiful online gallery you can share in one link.",
  },
  {
    id: "collabs", emoji: "🤝", label: "Collabs", tag: "Discovery Pool",
    headline: "Post. Match.\nCreate together.",
    sub: "Artists post that they're looking for wall space. Venues post that they need artworks. The Discovery Pool connects both sides.",
    color: "#4ECDC4", textColor: "#111110",
    visual: "collabs",
    pain: "Finding venues to exhibit is all word of mouth and cold emails.",
    gain: "A live pool of artists and venues actively looking for each other.",
  },
  {
    id: "business", emoji: "📊", label: "Business", tag: "Sales & CRM",
    headline: "Know your numbers.\nGrow what matters.",
    sub: "Log every sale, track commissions, manage collector relationships. See who bought what, when, for how much — and who to follow up with next.",
    color: "#FFFBEA", textColor: "#111110",
    visual: "business",
    pain: "I have no idea how much I've made this year or who my best buyers are.",
    gain: "A complete CRM and sales dashboard built for how artists actually sell.",
  },
  {
    id: "scene", emoji: "🗺️", label: "Scene", tag: "Art Scene Map",
    headline: "The art scene,\non one map.",
    sub: "Events, collabs, venues — discover and connect with the local art world. See what's happening near you and who's involved.",
    color: "#8B5CF6", textColor: "#fff",
    visual: "map",
    pain: "I find out about local shows and galleries through Instagram luck.",
    gain: "The whole local scene — artists, venues, events — on one live map.",
  },
  {
    id: "planner", emoji: "📅", label: "Planner", tag: "Exhibitions & Tasks",
    headline: "Plan shows.\nManage everything.",
    sub: "Create exhibitions, assign artworks, track venues and dates. Upcoming shows, past appearances, current displays — all in one timeline.",
    color: "#FF6B6B", textColor: "#fff",
    visual: "planner",
    pain: "Show planning is chaos — tasks in Notes, dates in email, artwork list in WhatsApp.",
    gain: "One place to plan, manage, and execute every exhibition.",
  },
];

// ── Scroll reveal hook ────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated counter ──────────────────────────────────────────────
function AnimCounter({ target, prefix = "", suffix = "", duration = 1800 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ── Visual mockups per feature ────────────────────────────────────
function FeatureVisual({ id, active }: { id: string; active: boolean }) {
  const s: React.CSSProperties = { fontFamily: "'Darker Grotesque', system-ui, sans-serif" };
  const wrapStyle: React.CSSProperties = {
    ...s,
    opacity: active ? 1 : 0,
    transform: active ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)",
    transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
    position: active ? "relative" : "absolute",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const content = (() => {
    if (id === "inventory") return (
      <div style={{ background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:340, width:"100%" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EBE3", background:"#FAF7F3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Inventory · 47 works</span>
          <span style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>$83,200 value</span>
        </div>
        {[
          { title:"Dissolving Tehran", medium:"Oil on Canvas", price:"$4,800", status:"Available", statusColor:"#16A34A", statusBg:"#DCFCE7", img:"https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=80&q=60" },
          { title:"Blue Migration", medium:"Oil on Linen", price:"$9,500", status:"Reserved", statusColor:"#D97706", statusBg:"#FEF9C3", img:"https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=80&q=60" },
          { title:"Platform 7, 04:22", medium:"Archival Print", price:"$1,200", status:"Available", statusColor:"#16A34A", statusBg:"#DCFCE7", img:"https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=80&q=60" },
          { title:"Root Form I", medium:"Cast Bronze", price:"$6,200", status:"Sold", statusColor:"#111110", statusBg:"#E5E5E5", img:"https://images.unsplash.com/photo-1558865869-c93f6f8482af?w=80&q=60" },
        ].map((aw,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:"1px solid #F5F0E8", opacity: active ? 1 : 0, transform: active ? "translateX(0)" : "translateX(20px)", transition: `opacity 0.4s ${0.15+i*0.08}s, transform 0.4s ${0.15+i*0.08}s cubic-bezier(0.16,1,0.3,1)` }}>
            <div style={{ width:40, height:32, borderRadius:8, overflow:"hidden", flexShrink:0, background:"#F5F0E8" }}>
              <img src={aw.img} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw.title}</div>
              <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600 }}>{aw.medium}</div>
            </div>
            <div style={{ fontSize:12, fontWeight:900, color:"#111110", fontFamily:"monospace", flexShrink:0 }}>{aw.price}</div>
            <div style={{ padding:"2px 8px", borderRadius:9999, background:aw.statusBg, color:aw.statusColor, fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.06em", flexShrink:0 }}>{aw.status}</div>
          </div>
        ))}
      </div>
    );

    if (id === "portfolio") return (
      <div style={{ background:"#111110", borderRadius:16, border:"2px solid #111110", boxShadow:"4px 5px 0 #000", overflow:"hidden", maxWidth:300, width:"100%" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #222", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#FFD400", border:"2px solid #333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#111110" }}>N</div>
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:"#fff" }}>Neda Rahimi</div>
            <div style={{ fontSize:9, color:"#555", fontWeight:600 }}>artomango.com/nedarahimi</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, padding:2 }}>
          {["photo-1541961017774-22349e4a1262","photo-1549490349-8643362247b5","photo-1578301978693-85fa9c0320b9","photo-1558865869-c93f6f8482af"].map((slug,i) => (
            <div key={i} style={{ aspectRatio:"1", overflow:"hidden", borderRadius:4, opacity: active ? 1 : 0, transform: active ? "scale(1)" : "scale(0.8)", transition: `opacity 0.4s ${0.1+i*0.1}s, transform 0.4s ${0.1+i*0.1}s cubic-bezier(0.34,1.56,0.64,1)` }}>
              <img src={`https://images.unsplash.com/${slug}?w=120&q=60`} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>
            </div>
          ))}
        </div>
        <div style={{ padding:"10px 14px", borderTop:"1px solid #222", display:"flex", justifyContent:"space-between" }}>
          {[{n:"23",l:"Works"},{n:"284",l:"Followers"},{n:"$18k",l:"Revenue"}].map(s=>(
            <div key={s.l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:900, color:"#FFD400" }}>{s.n}</div>
              <div style={{ fontSize:9, color:"#555", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    );

    if (id === "collabs") return (
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:320, width:"100%" }}>
        {[
          { type: "artist", label: "Artist seeking venue", title: "Oil painter looking for gallery space", tags: ["Oil","Realism","Large format"], budget: "$500–$2k", bg: "#fff", border: "#E8E0D0", shadow: "3px 4px 0 #D4C9A8", tagBg: "#DCFCE7", tagColor: "#16A34A", btnBg: "#FFD400" },
          { type: "venue", label: "Venue seeking art", title: "Café wall — abstract prints welcome", tags: ["Abstract","Digital","Any medium"], budget: "up to $800", bg: "#111110", border: "#111110", shadow: "3px 4px 0 #000", tagBg: "#222", tagColor: "#4ECDC4", btnBg: "#4ECDC4" },
        ].map((card, ci) => (
          <div key={ci} style={{ background: card.bg, borderRadius:14, border:`2px solid ${card.border}`, padding:"14px 16px", boxShadow: card.shadow, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.4s ${ci*0.15}s, transform 0.5s ${ci*0.15}s cubic-bezier(0.16,1,0.3,1)` }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", borderRadius:9999, background: card.tagBg, color: card.tagColor, fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.1em", marginBottom:8 }}>{card.label}</div>
            <div style={{ fontSize:13, fontWeight:800, color: card.bg === "#111110" ? "#fff" : "#111110", marginBottom:6 }}>{card.title}</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, marginBottom:10 }}>
              {card.tags.map(t=><span key={t} style={{ padding:"3px 9px", borderRadius:9999, background: card.bg === "#111110" ? "#222" : "#F5F0E8", color: card.bg === "#111110" ? "#888" : "#9B8F7A", fontSize:10, fontWeight:700 }}>{t}</span>)}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, color: card.bg === "#111110" ? "#555" : "#9B8F7A", fontWeight:600, fontFamily:"monospace" }}>Budget: {card.budget}</span>
              <div style={{ padding:"5px 12px", borderRadius:9999, background: card.btnBg, border:"1.5px solid #111110", fontSize:11, fontWeight:800, color:"#111110", cursor:"pointer" }}>Respond →</div>
            </div>
          </div>
        ))}
      </div>
    );

    if (id === "business") return (
      <div style={{ background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EBE3", background:"#FAF7F3" }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Sales · 2026</div>
        </div>
        <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, borderBottom:"1px solid #F0EBE3" }}>
          {[{n:"$18k",l:"Revenue"},{n:"$15k",l:"Net"},{n:"12",l:"Sales"}].map((s,i)=>(
            <div key={s.l} style={{ textAlign:"center", padding:"8px 4px", background:"#FAF7F3", borderRadius:10, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(10px)", transition: `opacity 0.3s ${0.1+i*0.1}s, transform 0.3s ${0.1+i*0.1}s` }}>
              <div style={{ fontSize:18, fontWeight:900, color:"#111110", letterSpacing:"-0.5px" }}>{s.n}</div>
              <div style={{ fontSize:9, color:"#9B8F7A", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"8px 0" }}>
          {[
            { name:"Dariush M.", amount:"$3,200", status:"Paid", color:"#16A34A", bg:"#DCFCE7" },
            { name:"Azadeh Gallery", amount:"$5,800", status:"Pending", color:"#D97706", bg:"#FEF9C3" },
            { name:"Leila Shirazi", amount:"$1,400", status:"Paid", color:"#16A34A", bg:"#DCFCE7" },
          ].map((row,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", borderBottom:"1px solid #F5F0E8", opacity: active ? 1 : 0, transform: active ? "translateX(0)" : "translateX(16px)", transition: `opacity 0.35s ${0.2+i*0.08}s, transform 0.35s ${0.2+i*0.08}s` }}>
              <div style={{ flex:1, fontSize:12, fontWeight:700, color:"#111110" }}>{row.name}</div>
              <div style={{ fontSize:12, fontWeight:800, color:"#111110", fontFamily:"monospace" }}>{row.amount}</div>
              <div style={{ padding:"2px 8px", borderRadius:9999, background:row.bg, color:row.color, fontSize:9, fontWeight:800, textTransform:"uppercase" as const }}>{row.status}</div>
            </div>
          ))}
        </div>
      </div>
    );

    if (id === "map") return (
      <div style={{ background:"#F5F0E8", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%", height:240, position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#E8E0CC,#D4C9A8)", opacity:0.6 }}/>
        {[{t:40,l:80,label:"Gallery A",delay:0.1},{t:100,l:160,label:"Studio Nord",delay:0.2},{t:60,l:220,label:"Café Wien",delay:0.3},{t:140,l:60,label:"Pop-up",delay:0.35}].map((p,i)=>(
          <div key={i} style={{ position:"absolute", top:p.t, left:p.l, zIndex:2, opacity: active ? 1 : 0, transform: active ? "translateY(0) scale(1)" : "translateY(-10px) scale(0)", transition: `opacity 0.3s ${p.delay}s, transform 0.4s ${p.delay}s cubic-bezier(0.34,1.56,0.64,1)` }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:i===0?"#FFD400":"#8B5CF6", border:"2px solid #111110", boxShadow:"1px 2px 0 #111110" }}/>
            <div style={{ position:"absolute", top:-18, left:12, background:"#fff", border:"1.5px solid #111110", borderRadius:6, padding:"2px 7px", fontSize:9, fontWeight:800, color:"#111110", whiteSpace:"nowrap" as const, boxShadow:"1px 2px 0 #111110" }}>{p.label}</div>
          </div>
        ))}
        <div style={{ position:"absolute", bottom:12, left:12, right:12, background:"rgba(255,255,255,0.95)", borderRadius:10, padding:"8px 12px", backdropFilter:"blur(4px)", border:"1.5px solid #E8E0D0", opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.4s 0.35s, transform 0.4s 0.35s" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#111110", marginBottom:2 }}>4 venues near you</div>
          <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600 }}>2 open for collab · 1 upcoming show</div>
        </div>
      </div>
    );

    // planner
    return (
      <div style={{ background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EBE3", background:"#FAF7F3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Exhibitions</span>
          <div style={{ padding:"3px 10px", borderRadius:9999, background:"#FFD400", border:"1.5px solid #111110", fontSize:10, fontWeight:800 }}>+ New show</div>
        </div>
        {[
          { title:"Forms & Shadows", venue:"Azad Gallery · Tehran", status:"Current", statusColor:"#FF6B6B", dates:"1 Jun – 30 Jun 2026", works:8 },
          { title:"Winter Group Show", venue:"Studio Norte · Barcelona", status:"Planning", statusColor:"#8B5CF6", dates:"Dec 2026", works:4 },
        ].map((ex,i)=>(
          <div key={i} style={{ padding:"12px 16px", borderBottom:"1px solid #F5F0E8", opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.4s ${0.1+i*0.12}s, transform 0.4s ${0.1+i*0.12}s` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#111110" }}>{ex.title}</div>
              <div style={{ padding:"2px 8px", borderRadius:9999, background:ex.statusColor+"22", color:ex.statusColor, fontSize:9, fontWeight:800, textTransform:"uppercase" as const, flexShrink:0, marginLeft:8 }}>{ex.status}</div>
            </div>
            <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600, marginBottom:6 }}>{ex.venue}</div>
            <div style={{ display:"flex", gap:12 }}>
              <span style={{ fontSize:10, color:"#9B8F7A", fontWeight:700 }}>📅 {ex.dates}</span>
              <span style={{ fontSize:10, color:"#9B8F7A", fontWeight:700 }}>🖼 {ex.works} artworks</span>
            </div>
          </div>
        ))}
      </div>
    );
  })();

  return <div style={wrapStyle}>{content}</div>;
}

export default function HomePage() {
  const [scrolled,       setScrolled]       = useState(false);
  const [activeFeature,  setActiveFeature]  = useState(0);
  const [prevFeature,    setPrevFeature]    = useState(0);
  const [exploreTab,     setExploreTab]     = useState<ExploreTab>("artworks");
  const [artworks,       setArtworks]       = useState<Artwork[]>([]);
  const [artists,        setArtists]        = useState<Artist[]>([]);
  const [search,         setSearch]         = useState("");
  const [medium,         setMedium]         = useState("All");
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [heroLoaded,     setHeroLoaded]     = useState(false);
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 });
  const exploreRef = useRef<HTMLDivElement>(null);

  // Scroll-triggered section reveals
  const whyReveal     = useReveal(0.1);
  const howReveal     = useReveal(0.15);
  const ctaReveal     = useReveal(0.2);
  const proofReveal   = useReveal(0.1);
  const exploreReveal = useReveal(0.08);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Trigger hero entrance
    requestAnimationFrame(() => setTimeout(() => setHeroLoaded(true), 100));
    loadExplore();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Parallax mouse on hero
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  function switchFeature(i: number) {
    if (i === activeFeature) return;
    setPrevFeature(activeFeature);
    setActiveFeature(i);
  }

  async function loadExplore() {
    const sb = createClient();
    const { data: awData } = await sb.from("artworks")
      .select("id, title, medium, year, price, currency, images, venue_location, location, user_id")
      .in("status", ["available","Available"]).not("images","is",null)
      .order("created_at", { ascending:false }).limit(36);
    if (awData?.length) {
      const userIds = Array.from(new Set(awData.map(a => a.user_id).filter(Boolean)));
      const { data: profs } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const pm: Record<string,any> = {};
      profs?.forEach(p => { pm[p.id] = p; });
      setArtworks(awData.map(a => ({ ...a, artist_name: pm[a.user_id!]?.full_name || "Artist", artist_avatar: pm[a.user_id!]?.avatar_url || null })));
    }
    const { data: artistData } = await sb.from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url")
      .not("full_name","is",null).neq("full_name","").limit(30);
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
    setLoadingExplore(false);
  }

  const filteredArtworks = artworks.filter(a => {
    const q = search.toLowerCase();
    return (!search || a.title.toLowerCase().includes(q) || (a.medium||"").toLowerCase().includes(q) || (a.artist_name||"").toLowerCase().includes(q))
      && (medium === "All" || (a.medium||"").toLowerCase().includes(medium.toLowerCase()));
  });
  const filteredArtists = artists.filter(a =>
    !search || (a.full_name||"").toLowerCase().includes(search.toLowerCase())
  );
  const initials = (n: string) => (n||"A").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const feat = FEATURES[activeFeature];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Darker Grotesque',system-ui,sans-serif;background:#FFFBEA;color:#111110;overflow-x:hidden}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:12px 20px;transition:padding 0.3s cubic-bezier(0.16,1,0.3,1)}
        .nav.scrolled{padding:8px 20px}
        .nav-pill{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:2.5px solid #111110;border-radius:9999px;padding:5px 6px 5px 10px;box-shadow:4px 4px 0 #111110;transition:box-shadow 0.3s,background 0.3s}
        .nav.scrolled .nav-pill{box-shadow:2px 2px 0 #111110;background:rgba(255,255,255,0.97)}
        .nav-pill:hover{box-shadow:6px 6px 0 #111110}
        .nav-logo{font-size:22px;line-height:1;text-decoration:none;flex-shrink:0;display:flex;align-items:center;gap:6px}
        .nav-logo-text{font-size:16px;font-weight:900;color:#111110;letter-spacing:-0.3px}
        .nav-links{display:flex;align-items:center;flex:1;justify-content:center}
        .nav-link{padding:7px 14px;font-size:14px;font-weight:700;color:#111110;text-decoration:none;border-radius:9999px;transition:background 0.15s,transform 0.15s;white-space:nowrap;position:relative}
        .nav-link:hover{background:#F5F0E8;transform:translateY(-1px)}
        .nav-link::after{content:'';position:absolute;bottom:4px;left:50%;width:0;height:2px;background:#FFD400;transition:width 0.2s,left 0.2s;border-radius:1px}
        .nav-link:hover::after{width:60%;left:20%}
        .nav-div{width:1px;height:22px;background:#E0D8CA;margin:0 4px;flex-shrink:0}
        .btn-ghost{padding:7px 14px;font-size:13px;font-weight:700;color:#111110;text-decoration:none;border-radius:9999px;border:2px solid transparent;transition:all 0.2s;font-family:inherit;background:none;cursor:pointer;white-space:nowrap}
        .btn-ghost:hover{background:#F5F0E8;transform:translateY(-1px)}
        .btn-pill{padding:7px 18px;font-size:13px;font-weight:800;color:#111110;background:#FFD400;border-radius:9999px;border:2px solid #111110;text-decoration:none;white-space:nowrap;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);cursor:pointer;font-family:inherit}
        .btn-pill:hover{box-shadow:2px 2px 0 #111110;transform:translateY(-2px)}

        /* HERO */
        .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;border-bottom:3px solid #111110}
        .hero-left{padding:80px 60px 80px 40px;border-right:3px solid #111110;display:flex;flex-direction:column;justify-content:center;position:relative;background:#FFD400;overflow:hidden}
        .hero-left::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 80%,rgba(255,255,255,0.3) 0%,transparent 60%);pointer-events:none}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:#111110;color:#FFD400;padding:4px 14px;border-radius:9999px;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:28px;width:fit-content;opacity:0;transform:translateY(20px);transition:opacity 0.6s 0.2s,transform 0.6s 0.2s cubic-bezier(0.16,1,0.3,1)}
        .hero-loaded .hero-eyebrow{opacity:1;transform:translateY(0)}
        .hero-title{font-size:clamp(52px,7vw,88px);font-weight:900;letter-spacing:-3px;line-height:0.92;color:#111110;margin-bottom:28px;opacity:0;transform:translateY(30px);transition:opacity 0.7s 0.35s,transform 0.7s 0.35s cubic-bezier(0.16,1,0.3,1)}
        .hero-loaded .hero-title{opacity:1;transform:translateY(0)}
        .hero-title .inv{display:inline-block;background:#111110;color:#FFD400;padding:2px 14px 6px;border-radius:12px;transition:transform 0.3s cubic-bezier(0.16,1,0.3,1)}
        .hero-title .inv:hover{transform:scale(1.03) rotate(-1deg)}
        .hero-sub{font-size:18px;font-weight:600;color:#111110;line-height:1.5;max-width:380px;margin-bottom:40px;opacity:0.7;opacity:0;transform:translateY(20px);transition:opacity 0.6s 0.5s,transform 0.6s 0.5s cubic-bezier(0.16,1,0.3,1)}
        .hero-loaded .hero-sub{opacity:0.7;transform:translateY(0)}
        .hero-ctas{display:flex;gap:12px;flex-wrap:wrap;opacity:0;transform:translateY(20px);transition:opacity 0.6s 0.65s,transform 0.6s 0.65s cubic-bezier(0.16,1,0.3,1)}
        .hero-loaded .hero-ctas{opacity:1;transform:translateY(0)}
        .btn-hero-dark-rnd{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#111110;color:#FFD400;font-family:inherit;font-size:15px;font-weight:800;border:2.5px solid #111110;border-radius:14px;text-decoration:none;cursor:pointer;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);box-shadow:4px 4px 0 rgba(0,0,0,0.2)}
        .btn-hero-dark-rnd:hover{box-shadow:6px 6px 0 rgba(0,0,0,0.25);transform:translate(-2px,-2px)}
        .btn-hero-dark-rnd:active{box-shadow:1px 1px 0 rgba(0,0,0,0.2);transform:translate(1px,1px)}
        .btn-hero-ghost-rnd{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:rgba(255,255,255,0.7);color:#111110;font-family:inherit;font-size:15px;font-weight:800;border:2.5px solid #111110;border-radius:14px;text-decoration:none;cursor:pointer;transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}
        .btn-hero-ghost-rnd:hover{background:#fff;transform:translateY(-2px);box-shadow:3px 3px 0 rgba(0,0,0,0.1)}
        .hero-right{background:#111110;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;position:relative;overflow:hidden}
        .hero-right::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,212,0,0.08) 0%,transparent 50%);pointer-events:none}
        .hero-mango{font-size:140px;line-height:1;display:block;animation:floatMango 3s ease-in-out infinite;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.5));margin-bottom:32px;opacity:0;transition:opacity 0.8s 0.4s}
        .hero-loaded .hero-mango{opacity:1}
        @keyframes floatMango{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-16px) rotate(3deg)}}
        .hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:2px solid #333;width:100%;max-width:340px;opacity:0;transform:translateY(20px);transition:opacity 0.6s 0.6s,transform 0.6s 0.6s cubic-bezier(0.16,1,0.3,1)}
        .hero-loaded .hero-stats{opacity:1;transform:translateY(0)}
        .hero-stat{padding:16px 12px;text-align:center;border-right:1px solid #333}
        .hero-stat:last-child{border-right:none}
        .hero-stat-num{font-size:28px;font-weight:900;color:#FFD400;letter-spacing:-1px;display:block}
        .hero-stat-label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.12em}
        .hero-float-card{position:absolute;border-radius:12px;transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);opacity:0;animation:heroCardIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards}
        @keyframes heroCardIn{from{opacity:0;transform:translateY(20px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}

        /* TICKER */
        .ticker-wrap{background:#FFD400;border-top:3px solid #111110;border-bottom:3px solid #111110;padding:14px 0;overflow:hidden;white-space:nowrap}
        .ticker-track{display:inline-flex;gap:48px;animation:ticker 20s linear infinite}
        .ticker-wrap:hover .ticker-track{animation-play-state:paused}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .ticker-item{font-size:15px;font-weight:800;color:#111110;letter-spacing:0.05em;text-transform:uppercase;display:inline-flex;align-items:center;gap:12px;flex-shrink:0;transition:opacity 0.2s}
        .ticker-dot{width:6px;height:6px;background:#111110;border-radius:50%;flex-shrink:0}

        /* ── WHY ARTOMANGO — interactive features ── */
        .why{background:#FFFBEA;padding:80px 0;border-bottom:3px solid #111110}
        .why-inner{max-width:1100px;margin:0 auto;padding:0 24px}
        .why-header{margin-bottom:56px}
        .section-eyebrow{display:inline-block;background:#111110;color:#FFD400;padding:3px 14px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px}
        .why-title{font-size:clamp(36px,5vw,60px);font-weight:900;color:#111110;letter-spacing:-2px;line-height:1}
        .why-sub{font-size:17px;font-weight:600;color:#9B8F7A;margin-top:12px;max-width:560px}

        /* Feature tabs */
        .feat-nav{display:flex;gap:0;flex-wrap:wrap;border-bottom:2px solid #E8E0D0;margin-bottom:0}
        .feat-tab{display:flex;align-items:center;gap:8px;padding:12px 20px;background:none;border:none;border-bottom:3px solid transparent;margin-bottom:-2px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;color:#9B8F7A;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);white-space:nowrap;position:relative}
        .feat-tab:hover{color:#111110;border-bottom-color:#E8E0D0}
        .feat-tab.active{color:#111110;border-bottom-color:#FFD400;background:none}
        .feat-tab-emoji{font-size:18px;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .feat-tab:hover .feat-tab-emoji{transform:scale(1.2) rotate(-5deg)}
        .feat-tab.active .feat-tab-emoji{transform:scale(1.15)}

        /* Feature panel */
        .feat-panel{display:grid;grid-template-columns:1fr 1fr;gap:0;border:2px solid #111110;border-top:none;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:4px 6px 0 #D4C9A8;transition:box-shadow 0.3s}
        .feat-left{padding:52px 56px;display:flex;flex-direction:column;justify-content:center;transition:background 0.5s cubic-bezier(0.16,1,0.3,1)}
        .feat-pain{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.06);border-radius:10px;margin-bottom:24px;font-size:13px;font-weight:600;color:inherit;opacity:0.65;font-style:italic;line-height:1.5}
        .feat-pain::before{content:"✗";font-style:normal;font-weight:900;font-size:14px;flex-shrink:0;margin-top:1px}
        .feat-headline{font-size:clamp(32px,4vw,48px);font-weight:900;letter-spacing:-1.5px;line-height:0.95;white-space:pre-line;margin-bottom:18px}
        .feat-desc{font-size:16px;font-weight:500;line-height:1.7;max-width:400px;margin-bottom:24px;opacity:0.75}
        .feat-gain{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.06);border-radius:10px;font-size:13px;font-weight:700;line-height:1.5}
        .feat-gain::before{content:"✓";font-weight:900;font-size:14px;flex-shrink:0;margin-top:1px}
        .feat-tag{display:inline-block;padding:5px 14px;border-radius:9999px;border:2px solid currentColor;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-top:20px;opacity:0.8}
        .feat-right{display:flex;align-items:center;justify-content:center;padding:48px 40px;border-left:2px solid rgba(0,0,0,0.08);position:relative;overflow:hidden;min-height:440px}

        /* Text transition in feat-left */
        .feat-text-enter{animation:featTextIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
        @keyframes featTextIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* HOW IT WORKS */
        .how{background:#111110;padding:80px 40px;border-bottom:3px solid #111110}
        .how-inner{max-width:1100px;margin:0 auto}
        .how-eyebrow{display:inline-block;background:#1a1a1a;color:#FFD400;border:1px solid #333;padding:3px 14px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px}
        .how-title{font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-1.5px;line-height:1.05;color:#fff;margin-bottom:48px}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2px solid #333;border-radius:16px;overflow:hidden}
        .step{padding:40px 32px;border-right:1px solid #333;transition:background 0.3s}
        .step:last-child{border-right:none}
        .step:hover{background:rgba(255,212,0,0.04)}
        .step-num{font-size:11px;font-weight:800;color:#FFD400;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .step-num::after{content:'';flex:1;height:1px;background:#333}
        .step-emoji{font-size:36px;line-height:1;margin-bottom:16px;display:block;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .step:hover .step-emoji{transform:scale(1.15) rotate(-5deg)}
        .step-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-bottom:12px}
        .step-desc{font-size:14px;font-weight:500;color:#666;line-height:1.7}

        /* CTA BAND */
        .cta-band{background:#FFD400;border-bottom:3px solid #111110;padding:80px 40px;overflow:hidden;position:relative}
        .cta-band::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.2);pointer-events:none}
        .cta-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr auto;align-items:center;gap:40px}
        .cta-title{font-size:clamp(36px,5vw,64px);font-weight:900;color:#111110;letter-spacing:-2px;line-height:1}
        .strikethrough{position:relative;display:inline-block}
        .strikethrough::after{content:'';position:absolute;left:0;right:0;top:50%;height:4px;background:#111110;transform:rotate(-2deg);transition:width 0.6s cubic-bezier(0.16,1,0.3,1);width:0}
        .cta-visible .strikethrough::after{width:100%}
        .btn-cta-dark{display:inline-flex;align-items:center;gap:10px;padding:18px 36px;background:#111110;color:#FFD400;font-family:inherit;font-size:16px;font-weight:800;border:none;border-radius:14px;text-decoration:none;cursor:pointer;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);box-shadow:6px 6px 0 rgba(0,0,0,0.3);white-space:nowrap;flex-shrink:0}
        .btn-cta-dark:hover{box-shadow:8px 8px 0 rgba(0,0,0,0.3);transform:translate(-2px,-2px)}
        .btn-cta-dark:active{box-shadow:2px 2px 0 rgba(0,0,0,0.3);transform:translate(1px,1px)}

        /* SOCIAL PROOF */
        .proof{background:#FFFBEA;padding:80px 40px;border-bottom:3px solid #111110}
        .proof-inner{max-width:1100px;margin:0 auto}
        .proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2.5px solid #111110;border-radius:20px;box-shadow:6px 6px 0 #111110;margin-top:48px;overflow:hidden}
        .proof-card{padding:36px 32px;border-right:2px solid #111110;position:relative;background:#fff;transition:background 0.3s}
        .proof-card:last-child{border-right:none}
        .proof-card:hover{background:#FFFBEA}
        .proof-card::before{content:'"';position:absolute;top:16px;left:24px;font-size:72px;font-weight:900;color:#FFD400;line-height:1;opacity:0.5;transition:transform 0.3s}
        .proof-card:hover::before{transform:scale(1.1) rotate(-5deg)}
        .proof-quote{font-size:16px;font-weight:600;color:#111110;line-height:1.6;margin-top:40px;margin-bottom:24px}
        .proof-avatar{width:36px;height:36px;border-radius:50%;background:#FFD400;border:2px solid #111110;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#111110;flex-shrink:0;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .proof-card:hover .proof-avatar{transform:scale(1.1)}

        /* EXPLORE */
        .explore-section{background:#F5F0E8;border-top:3px solid #E8E0D0;padding:80px 0}
        .explore-inner{max-width:1100px;margin:0 auto;padding:0 24px}
        .tabs{display:flex;background:#fff;border:2px solid #111110;border-radius:12px;overflow:hidden;width:fit-content;margin-bottom:24px}
        .tab-btn{display:flex;align-items:center;gap:6px;padding:9px 20px;border:none;border-right:1px solid #E8E0D0;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1)}
        .tab-btn:last-child{border-right:none}
        .tab-btn.active{background:#111110;color:#FFD400}
        .tab-btn:not(.active){background:#fff;color:#9B8F7A}
        .tab-btn:not(.active):hover{background:#FAF7F3;color:#111110}
        .search-wrap{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:10px;padding:0 12px;height:40px;flex:1;min-width:200px;max-width:340px;transition:border-color 0.2s,box-shadow 0.2s}
        .search-wrap:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,0.15)}
        .search-inp{flex:1;border:none;outline:none;font-size:13px;font-family:inherit;font-weight:500;color:#111110;background:transparent}
        .medium-pill{padding:6px 14px;border-radius:9999px;border:2px solid #E8E0D0;background:#fff;font-family:inherit;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);white-space:nowrap}
        .medium-pill.active{background:#111110;border-color:#111110;color:#FFD400;transform:scale(1.05)}
        .medium-pill:not(.active):hover{border-color:#111110;color:#111110;transform:translateY(-1px)}
        .art-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
        .art-card{background:#fff;border-radius:18px;border:2px solid #E8E0D0;box-shadow:3px 4px 0 #D4C9A8;overflow:hidden;cursor:pointer;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);text-decoration:none;display:block}
        .art-card:hover{box-shadow:6px 8px 0 #111110;transform:translate(-2px,-3px);border-color:#111110}
        .art-thumb{position:relative;aspect-ratio:4/3;overflow:hidden;background:#FAF7F3}
        .art-thumb img{width:100%;height:100%;object-fit:cover;transition:transform 0.5s cubic-bezier(0.16,1,0.3,1)}
        .art-card:hover .art-thumb img{transform:scale(1.06)}
        .art-body{padding:12px 14px 10px}
        .artist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
        .artist-card{background:#fff;border-radius:18px;border:2px solid #E8E0D0;overflow:hidden;box-shadow:3px 4px 0 #D4C9A8;cursor:pointer;transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
        .artist-card:hover{box-shadow:6px 8px 0 #111110;transform:translate(-2px,-3px);border-color:#111110}
        .skeleton{background:#E8E0D0;border-radius:18px;animation:shimmer 1.5s infinite}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.6}}

        /* FOOTER */
        .footer{background:#111110;padding:48px 40px 28px}
        .footer-inner{max-width:1100px;margin:0 auto}
        .footer-top{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:40px;padding-bottom:40px;border-bottom:1px solid #222;margin-bottom:28px}
        .footer-logo{font-size:32px;display:block;margin-bottom:8px}
        .footer-brand-name{font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.3px;display:block;margin-bottom:8px}
        .footer-tagline{font-size:12px;font-weight:600;color:#555;line-height:1.5}
        .footer-col-title{font-size:10px;font-weight:800;color:#FFD400;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:16px}
        .footer-link{display:block;font-size:13px;font-weight:600;color:#555;text-decoration:none;margin-bottom:10px;transition:color 0.15s,transform 0.15s}
        .footer-link:hover{color:#fff;transform:translateX(3px)}
        .footer-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .footer-copy{font-size:11px;font-weight:600;color:#333}

        /* Reveal animations */
        .reveal-up{opacity:0;transform:translateY(40px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)}
        .reveal-up.visible{opacity:1;transform:translateY(0)}
        .reveal-scale{opacity:0;transform:scale(0.95);transition:opacity 0.6s,transform 0.6s cubic-bezier(0.16,1,0.3,1)}
        .reveal-scale.visible{opacity:1;transform:scale(1)}
        .stagger-1{transition-delay:0.05s!important}
        .stagger-2{transition-delay:0.1s!important}
        .stagger-3{transition-delay:0.15s!important}
        .stagger-4{transition-delay:0.2s!important}
        .stagger-5{transition-delay:0.25s!important}

        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .fade-up{animation:fadeUp 0.35s ease forwards}

        @media(max-width:900px){
          .hero{grid-template-columns:1fr}
          .hero-right{min-height:280px;padding:40px 24px}
          .hero-mango{font-size:80px}
          .hero-left{padding:60px 24px;border-right:none;border-bottom:3px solid #111110}
          .feat-panel{grid-template-columns:1fr}
          .feat-right{display:none}
          .feat-left{padding:36px 28px}
          .feat-nav{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .steps{grid-template-columns:1fr}
          .step{border-right:none;border-bottom:1px solid #333}
          .step:last-child{border-bottom:none}
          .proof-grid{grid-template-columns:1fr}
          .proof-card{border-right:none;border-bottom:2px solid #111110}
          .proof-card:last-child{border-bottom:none}
          .cta-inner{grid-template-columns:1fr;gap:24px}
          .footer-top{grid-template-columns:1fr 1fr;gap:28px}
          .nav-links{display:none}
        }
        @media(max-width:600px){
          .footer-top{grid-template-columns:1fr}
          .art-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav${scrolled?" scrolled":""}`}>
        <div className="nav-pill">
          <a href="/" className="nav-logo">🥭<span className="nav-logo-text">artomango</span></a>
          <div className="nav-div"/>
          <div className="nav-links">
            <a href="#why"     className="nav-link">Features</a>
            <a href="#how"     className="nav-link">How it works</a>
            <a href="#explore" className="nav-link">Explore</a>
            <a href="/directory/artists" className="nav-link">Artists</a>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
            <a href="/login"    className="btn-ghost">Sign in</a>
            <a href="/register" className="btn-pill">Get started →</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={`hero${heroLoaded?" hero-loaded":""}`} style={{paddingTop:80}}>
        <div className="hero-left">
          <div className="hero-eyebrow">🥭 artomango · art platform</div>
          <h1 className="hero-title">
            Your art.<br/>
            <span className="inv">Managed.</span><br/>
            Exhibited.
          </h1>
          <p className="hero-sub">The platform for artists and venues to manage work, discover collaborations, and grow in the art scene.</p>
          <div className="hero-ctas">
            <a href="/register" className="btn-hero-dark-rnd">Start for free →</a>
            <button className="btn-hero-ghost-rnd" onClick={() => document.getElementById("why")?.scrollIntoView({behavior:"smooth"})}>
              See features <ChevronDown size={16}/>
            </button>
          </div>
        </div>
        <div className="hero-right">
          <span className="hero-mango" style={{ transform: `translate(${mousePos.x*8}px, ${mousePos.y*6}px)` }}>🥭</span>
          <div className="hero-stats">
            <div className="hero-stat"><span className="hero-stat-num"><AnimCounter target={47}/></span><span className="hero-stat-label">Works</span></div>
            <div className="hero-stat"><span className="hero-stat-num"><AnimCounter target={12}/></span><span className="hero-stat-label">Shows</span></div>
            <div className="hero-stat"><span className="hero-stat-num"><AnimCounter target={18} prefix="$" suffix="k"/></span><span className="hero-stat-label">Revenue</span></div>
          </div>
          {/* Floating notification cards */}
          <div className="hero-float-card" style={{top:100,left:24,background:"#FFD400",border:"2px solid #111110",padding:"8px 14px",boxShadow:"3px 3px 0 #111110",animationDelay:"0.8s", transform: `translate(${mousePos.x*-12}px, ${mousePos.y*-8}px)` }}>
            <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#111110"}}>New collab request</div>
            <div style={{fontSize:12,fontWeight:700,color:"#111110",marginTop:2}}>Galerie Nord · Prague</div>
          </div>
          <div className="hero-float-card" style={{bottom:120,right:24,background:"#fff",border:"2px solid #333",padding:"8px 14px",boxShadow:"3px 3px 0 #333",animationDelay:"1.2s", transform: `translate(${mousePos.x*10}px, ${mousePos.y*10}px)` }}>
            <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9B8F7A"}}>Artwork sold</div>
            <div style={{fontSize:13,fontWeight:900,color:"#111110",marginTop:2}}>$2,400 ✓</div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...Array(2)].map((_,i) =>
            ["Manage your artworks","Exhibit anywhere","Collab with venues","Track every sale","Map the art scene","Build your portfolio","Grow your practice"].map((w,j) => (
              <span key={`${i}-${j}`} className="ticker-item">{w} <span className="ticker-dot"/></span>
            ))
          )}
        </div>
      </div>

      {/* ── WHY ARTOMANGO — interactive features ── */}
      <section id="why" className="why">
        <div className="why-inner" ref={whyReveal.ref}>
          <div className={`why-header reveal-up${whyReveal.visible?" visible":""}`}>
            <div className="section-eyebrow">Why Artomango</div>
            <h2 className="why-title">Built for every player<br/>in the art scene.</h2>
            <p className="why-sub">Everything you need to run your art practice like a professional — without the spreadsheets, the paper trails, or the missed connections.</p>
          </div>

          {/* Feature tab nav */}
          <div className={`feat-nav reveal-up stagger-2${whyReveal.visible?" visible":""}`}>
            {FEATURES.map((f,i) => (
              <button key={f.id} className={`feat-tab${activeFeature===i?" active":""}`} onClick={() => switchFeature(i)}>
                <span className="feat-tab-emoji">{f.emoji}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Feature panel */}
          <div className={`feat-panel reveal-scale stagger-3${whyReveal.visible?" visible":""}`} style={{background:feat.color}}>
            <div className="feat-left" key={feat.id} style={{background:feat.color,color:feat.textColor}}>
              <div className="feat-pain feat-text-enter" key={`pain-${feat.id}`}>{feat.pain}</div>
              <h3 className="feat-headline feat-text-enter" key={`hl-${feat.id}`} style={{animationDelay:"0.05s"}}>{feat.headline}</h3>
              <p className="feat-desc feat-text-enter" key={`desc-${feat.id}`} style={{animationDelay:"0.1s"}}>{feat.sub}</p>
              <div className="feat-gain feat-text-enter" key={`gain-${feat.id}`} style={{animationDelay:"0.15s"}}>{feat.gain}</div>
              <span className="feat-tag feat-text-enter" key={`tag-${feat.id}`} style={{animationDelay:"0.2s"}}>{feat.tag}</span>
            </div>
            <div className="feat-right" style={{background:feat.textColor==="#111110"?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.06)"}}>
              {FEATURES.map((f,i) => (
                <FeatureVisual key={f.id} id={f.visual} active={activeFeature === i} />
              ))}
            </div>
          </div>
        </div>
      </section>
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
      {/* ── HOW IT WORKS ── */}
      <section id="how" className="how" ref={howReveal.ref}>
        <div className="how-inner">
          <div className={`reveal-up${howReveal.visible?" visible":""}`}>
            <div className="how-eyebrow">How it works</div>
            <h2 className="how-title">Three steps to<br/>your art business.</h2>
          </div>
          <div className={`steps reveal-scale stagger-2${howReveal.visible?" visible":""}`}>
            {[
              {n:"01",emoji:"🎨",title:"Add your work",desc:"Upload artworks with photos, details, prices, and location. Build your complete inventory in minutes."},
              {n:"02",emoji:"🌐",title:"Go public",desc:"Your portfolio page goes live instantly. Share it with galleries, collectors, and curators — or let them find you."},
              {n:"03",emoji:"🤝",title:"Grow & collaborate",desc:"Find exhibitions, connect with venues, track sales, and manage every collaboration from first contact to final show."},
            ].map(step => (
              <div key={step.n} className="step">
                <div className="step-num">{step.n}</div>
                <span className="step-emoji">{step.emoji}</span>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <div className={`cta-band${ctaReveal.visible?" cta-visible":""}`} ref={ctaReveal.ref}>
        <div className="cta-inner">
          <div>
            <h2 className="cta-title">Stop managing art<br/>in <span className="strikethrough">spreadsheets.</span></h2>
            <p style={{fontSize:16,fontWeight:600,color:"#5C5346",marginTop:16}}>Join artists and venues already using Artomango.</p>
          </div>
          <a href="/register" className="btn-cta-dark">🥭 Get started free →</a>
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <section className="proof" ref={proofReveal.ref}>
        <div className="proof-inner">
          <div className={`reveal-up${proofReveal.visible?" visible":""}`}>
            <div className="section-eyebrow" style={{background:"#FFFBEA",color:"#111110",border:"2px solid #111110"}}>What they say</div>
            <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",marginBottom:0}}>Artists love it.</h2>
          </div>
          <div className={`proof-grid reveal-scale stagger-3${proofReveal.visible?" visible":""}`}>
            {[
              {quote:"Finally — a platform that gets how artists actually work. Not just a portfolio, a full business tool.",name:"Neda R.",role:"Oil painter · Prague",avatar:"N"},
              {quote:"The collab pool alone was worth it. I found three venue partners in my first month on Artomango.",name:"Arman K.",role:"Photographer · Brno",avatar:"A"},
              {quote:"I used to track everything in a notes app. Now I actually know where every piece is and what it's worth.",name:"Leila S.",role:"Mixed media artist · Berlin",avatar:"L"},
            ].map((t,i) => (
              <div key={i} className="proof-card">
                <div className="proof-quote">{t.quote}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="proof-avatar">{t.avatar}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:"#111110"}}>{t.name}</div>
                    <div style={{fontSize:11,fontWeight:600,color:"#9B8F7A"}}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPLORE SECTION ── */}
      <section id="explore" className="explore-section" ref={exploreReveal.ref}>
        <div className="explore-inner">
          <div className={`reveal-up${exploreReveal.visible?" visible":""}`} style={{marginBottom:32}}>
            <div className="section-eyebrow" style={{background:"#111110",color:"#FFD400"}}>Browse the platform</div>
            <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",marginBottom:6}}>Explore the scene</h2>
            <p style={{fontSize:15,fontWeight:600,color:"#9B8F7A"}}>Discover artworks and connect with artists and venues</p>
          </div>

          <div className={`reveal-up stagger-2${exploreReveal.visible?" visible":""}`}>
            {/* Tabs */}
            <div className="tabs">
              <button className={`tab-btn${exploreTab==="artworks"?" active":""}`} onClick={() => setExploreTab("artworks")}>
                <Grid3X3 size={14}/> Artworks
              </button>
              <button className={`tab-btn${exploreTab==="artists"?" active":""}`} onClick={() => setExploreTab("artists")}>
                <Users size={14}/> Artists & Venues
              </button>
            </div>

            {/* Controls */}
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:28}}>
              <div className="search-wrap">
                <Search size={14} color="#9B8F7A"/>
                <input className="search-inp" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={exploreTab==="artworks"?"Search artworks…":"Search artists or venues…"}/>
                {search && <button onClick={() => setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#C0B8A8",padding:0,display:"flex"}}><X size={12}/></button>}
              </div>
              {exploreTab === "artworks" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {MEDIUMS.map(m => <button key={m} className={`medium-pill${medium===m?" active":""}`} onClick={() => setMedium(m)}>{m}</button>)}
                </div>
              )}
            </div>
          </div>

          {/* Artworks grid */}
          {exploreTab === "artworks" && (
            loadingExplore ? (
              <div className="art-grid">
                {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{aspectRatio:"3/4",animationDelay:`${i*0.06}s`}}/>)}
              </div>
            ) : (
              <div className="art-grid">
                {filteredArtworks.map((aw,i) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  return (
                    <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="art-card fade-up" style={{animationDelay:`${Math.min(i,12)*0.04}s`}}>
                      <div className="art-thumb">
                        {img
                          ? <img src={img} alt={aw.title} loading="lazy"/>
                          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><ImageIcon size={28} color="#D4C9A8"/></div>
                        }
                        {(aw.venue_location||aw.location) && (
                          <div style={{position:"absolute",bottom:8,left:8,background:"rgba(255,255,255,0.92)",borderRadius:9999,padding:"3px 9px",display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#111110",backdropFilter:"blur(4px)"}}>
                            <MapPin size={9} color="#FF6B6B"/>{(aw.venue_location||aw.location||"").split(",")[0]}
                          </div>
                        )}
                      </div>
                      <div className="art-body">
                        <div style={{fontSize:14,fontWeight:800,color:"#111110",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.2px",marginBottom:2}}>{aw.title}</div>
                        <div style={{fontSize:12,color:"#9B8F7A",fontWeight:600,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{[aw.medium,aw.year].filter(Boolean).join(" · ")||"—"}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{fontSize:16,fontWeight:900,color:aw.price?"#111110":"#D4C9A8",fontFamily:"monospace",letterSpacing:"-0.5px"}}>
                            {aw.price?`$${Number(aw.price).toLocaleString()}`:"Inquiry"}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:20,height:20,borderRadius:"50%",background:"#FFD400",border:"1.5px solid #E8E0D0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#111110",overflow:"hidden",flexShrink:0}}>
                              {aw.artist_avatar?<img src={aw.artist_avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:initials(aw.artist_name||"A")}
                            </div>
                            <span style={{fontSize:11,fontWeight:600,color:"#9B8F7A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:80}}>{aw.artist_name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {/* Artists grid */}
          {exploreTab === "artists" && (
            loadingExplore ? (
              <div className="artist-grid">
                {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{height:220,animationDelay:`${i*0.06}s`}}/>)}
              </div>
            ) : (
              <div className="artist-grid">
                {filteredArtists.map((artist,i) => (
                  <div key={artist.id} className="artist-card fade-up" style={{animationDelay:`${Math.min(i,12)*0.04}s`}}>
                    <div style={{height:80,overflow:"hidden",background:"#FAF7F3",position:"relative"}}>
                      {artist.cover_image
                        ? <img src={artist.cover_image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s cubic-bezier(0.16,1,0.3,1)"}} loading="lazy"/>
                        : <div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#FFD40033,#F5F0E8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {artist.role==="artist"?<Palette size={24} color="#C0B8A8"/>:<Building2 size={24} color="#C0B8A8"/>}
                          </div>
                      }
                    </div>
                    <div style={{padding:"12px 16px 16px"}}>
                      <div style={{marginTop:-20,marginBottom:10}}>
                        <div style={{width:44,height:44,borderRadius:"50%",border:"3px solid #fff",background:"#FFD400",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#111110",overflow:"hidden",boxShadow:"2px 2px 0 #E8E0D0",transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
                          {artist.avatar_url?<img src={artist.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:initials(artist.full_name||"A")}
                        </div>
                      </div>
                      <div style={{fontSize:15,fontWeight:800,color:"#111110",letterSpacing:"-0.2px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{artist.full_name||"Artist"}</div>
                      <div style={{display:"inline-block",fontSize:10,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:"0.12em",padding:"2px 8px",borderRadius:9999,background:"#FAF7F3",color:"#9B8F7A",marginBottom:6}}>{artist.role||"artist"}</div>
                      <div style={{fontSize:12,color:"#9B8F7A",fontWeight:500,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as any,marginBottom:10,minHeight:36}}>{artist.bio||"No bio yet."}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #F5F0E8"}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"#9B8F7A"}}>{artist.artwork_count} work{artist.artwork_count!==1?"s":""}</div>
                          {artist.location && <div style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:"#9B8F7A",fontWeight:600}}><MapPin size={10} color="#FF6B6B"/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{artist.location}</span></div>}
                        </div>
                        <Link href={`/portfolio/${artist.username||artist.id}`} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"1.5px solid #E8E0D0",background:"#FAF7F3",fontSize:12,fontWeight:700,color:"#111110",textDecoration:"none",transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)"}}
                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#FFD400";(e.currentTarget as HTMLElement).style.borderColor="#111110";(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#FAF7F3";(e.currentTarget as HTMLElement).style.borderColor="#E8E0D0";(e.currentTarget as HTMLElement).style.transform="";}}>
                          View <ArrowRight size={12}/>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <span className="footer-logo">🥭</span>
              <span className="footer-brand-name">artomango</span>
              <span className="footer-tagline">Manage, Exhibit, Collab.<br/>The platform for artists and venues.</span>
            </div>
            <div>
              <div className="footer-col-title">Platform</div>
              {[["Dashboard","/dashboard"],["Artworks","/dashboard/artworks"],["Events","/dashboard/exhibitions"],["Map","/dashboard/map"],["Collabs","/dashboard/pool"]].map(([l,h])=>(
                <a key={l} href={h} className="footer-link">{l}</a>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Explore</div>
              {[["Artists","/directory/artists"],["Venues","/directory/venues"],["Analytics","/dashboard/analytics"],["Sales","/dashboard/sales"]].map(([l,h])=>(
                <a key={l} href={h} className="footer-link">{l}</a>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Account</div>
              {[["Sign in","/login"],["Get started","/register"],["Profile","/dashboard/profile"],["Admin","/admin"]].map(([l,h])=>(
                <a key={l} href={h} className="footer-link">{l}</a>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">🥭 artomango · © 2026 · Manage, Exhibit, Collab</span>
            <div style={{display:"flex",gap:20}}>
              <a href="#" className="footer-link" style={{marginBottom:0,fontSize:11}}>Privacy</a>
              <a href="#" className="footer-link" style={{marginBottom:0,fontSize:11}}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
