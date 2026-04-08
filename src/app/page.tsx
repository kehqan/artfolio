"use client";
import { useState, useEffect, useRef } from "react";
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

// ── Visual mockups per feature ────────────────────────────────────
function FeatureVisual({ id }: { id: string }) {
  const s: React.CSSProperties = { fontFamily: "'Darker Grotesque', system-ui, sans-serif" };
  if (id === "inventory") return (
    <div style={{ ...s, background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:340, width:"100%" }}>
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
        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:"1px solid #F5F0E8" }}>
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
    <div style={{ ...s, background:"#111110", borderRadius:16, border:"2px solid #111110", boxShadow:"4px 5px 0 #000", overflow:"hidden", maxWidth:300, width:"100%" }}>
      <div style={{ padding:"10px 14px", borderBottom:"1px solid #222", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:"#FFD400", border:"2px solid #333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#111110" }}>N</div>
        <div>
          <div style={{ fontSize:12, fontWeight:800, color:"#fff" }}>Neda Rahimi</div>
          <div style={{ fontSize:9, color:"#555", fontWeight:600 }}>artomango.com/nedarahimi</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, padding:2 }}>
        {["photo-1541961017774-22349e4a1262","photo-1549490349-8643362247b5","photo-1578301978693-85fa9c0320b9","photo-1558865869-c93f6f8482af"].map((slug,i) => (
          <div key={i} style={{ aspectRatio:"1", overflow:"hidden", borderRadius:4 }}>
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
    <div style={{ ...s, display:"flex", flexDirection:"column", gap:10, maxWidth:320, width:"100%" }}>
      <div style={{ background:"#fff", borderRadius:14, border:"2px solid #E8E0D0", padding:"14px 16px", boxShadow:"3px 4px 0 #D4C9A8" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", borderRadius:9999, background:"#DCFCE7", color:"#16A34A", fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.1em", marginBottom:8 }}>Artist seeking venue</div>
        <div style={{ fontSize:13, fontWeight:800, color:"#111110", marginBottom:6 }}>Oil painter looking for gallery space</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, marginBottom:10 }}>
          {["Oil","Realism","Large format"].map(t=><span key={t} style={{ padding:"3px 9px", borderRadius:9999, background:"#F5F0E8", color:"#9B8F7A", fontSize:10, fontWeight:700 }}>{t}</span>)}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#9B8F7A", fontWeight:600, fontFamily:"monospace" }}>Budget: $500–$2k</span>
          <div style={{ padding:"5px 12px", borderRadius:9999, background:"#FFD400", border:"1.5px solid #111110", fontSize:11, fontWeight:800, color:"#111110", cursor:"pointer" }}>Respond →</div>
        </div>
      </div>
      <div style={{ background:"#111110", borderRadius:14, border:"2px solid #111110", padding:"14px 16px", boxShadow:"3px 4px 0 #000" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", borderRadius:9999, background:"#4ECDC4", color:"#111110", fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.1em", marginBottom:8 }}>Venue seeking art</div>
        <div style={{ fontSize:13, fontWeight:800, color:"#fff", marginBottom:6 }}>Café wall — abstract prints welcome</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, marginBottom:10 }}>
          {["Abstract","Digital","Any medium"].map(t=><span key={t} style={{ padding:"3px 9px", borderRadius:9999, background:"#222", color:"#888", fontSize:10, fontWeight:700 }}>{t}</span>)}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#555", fontWeight:600, fontFamily:"monospace" }}>Budget: up to $800</span>
          <div style={{ padding:"5px 12px", borderRadius:9999, background:"#4ECDC4", border:"1.5px solid #111110", fontSize:11, fontWeight:800, color:"#111110", cursor:"pointer" }}>Respond →</div>
        </div>
      </div>
    </div>
  );

  if (id === "business") return (
    <div style={{ ...s, background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%" }}>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EBE3", background:"#FAF7F3" }}>
        <div style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Sales · 2026</div>
      </div>
      <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, borderBottom:"1px solid #F0EBE3" }}>
        {[{n:"$18k",l:"Revenue"},{n:"$15k",l:"Net"},{n:"12",l:"Sales"}].map(s=>(
          <div key={s.l} style={{ textAlign:"center", padding:"8px 4px", background:"#FAF7F3", borderRadius:10 }}>
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
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", borderBottom:"1px solid #F5F0E8" }}>
            <div style={{ flex:1, fontSize:12, fontWeight:700, color:"#111110" }}>{row.name}</div>
            <div style={{ fontSize:12, fontWeight:800, color:"#111110", fontFamily:"monospace" }}>{row.amount}</div>
            <div style={{ padding:"2px 8px", borderRadius:9999, background:row.bg, color:row.color, fontSize:9, fontWeight:800, textTransform:"uppercase" as const }}>{row.status}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (id === "map") return (
    <div style={{ ...s, background:"#F5F0E8", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%", height:240, position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#E8E0CC,#D4C9A8)", opacity:0.6 }}/>
      {/* Fake map pins */}
      {[{t:40,l:80,label:"Gallery A"},{t:100,l:160,label:"Studio Nord"},{t:60,l:220,label:"Café Wien"},{t:140,l:60,label:"Pop-up"}].map((p,i)=>(
        <div key={i} style={{ position:"absolute", top:p.t, left:p.l, zIndex:2 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:i===0?"#FFD400":"#8B5CF6", border:"2px solid #111110", boxShadow:"1px 2px 0 #111110" }}/>
          <div style={{ position:"absolute", top:-18, left:12, background:"#fff", border:"1.5px solid #111110", borderRadius:6, padding:"2px 7px", fontSize:9, fontWeight:800, color:"#111110", whiteSpace:"nowrap" as const, boxShadow:"1px 2px 0 #111110" }}>{p.label}</div>
        </div>
      ))}
      <div style={{ position:"absolute", bottom:12, left:12, right:12, background:"rgba(255,255,255,0.95)", borderRadius:10, padding:"8px 12px", backdropFilter:"blur(4px)", border:"1.5px solid #E8E0D0" }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#111110", marginBottom:2 }}>4 venues near you</div>
        <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600 }}>2 open for collab · 1 upcoming show</div>
      </div>
    </div>
  );

  // planner
  return (
    <div style={{ ...s, background:"#fff", borderRadius:16, border:"2px solid #E8E0D0", boxShadow:"4px 5px 0 #D4C9A8", overflow:"hidden", maxWidth:320, width:"100%" }}>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #F0EBE3", background:"#FAF7F3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Exhibitions</span>
        <div style={{ padding:"3px 10px", borderRadius:9999, background:"#FFD400", border:"1.5px solid #111110", fontSize:10, fontWeight:800 }}>+ New show</div>
      </div>
      {[
        { title:"Forms & Shadows", venue:"Azad Gallery · Tehran", status:"Current", statusColor:"#FF6B6B", dates:"1 Jun – 30 Jun 2026", works:8 },
        { title:"Winter Group Show", venue:"Studio Norte · Barcelona", status:"Planning", statusColor:"#8B5CF6", dates:"Dec 2026", works:4 },
      ].map((ex,i)=>(
        <div key={i} style={{ padding:"12px 16px", borderBottom:"1px solid #F5F0E8" }}>
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
}

export default function HomePage() {
  const [scrolled,       setScrolled]       = useState(false);
  const [activeFeature,  setActiveFeature]  = useState(0);
  const [exploreTab,     setExploreTab]     = useState<ExploreTab>("artworks");
  const [artworks,       setArtworks]       = useState<Artwork[]>([]);
  const [artists,        setArtists]        = useState<Artist[]>([]);
  const [search,         setSearch]         = useState("");
  const [medium,         setMedium]         = useState("All");
  const [loadingExplore, setLoadingExplore] = useState(true);
  const exploreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    loadExplore();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:12px 20px;transition:padding 0.2s}
        .nav.scrolled{padding:8px 20px}
        .nav-pill{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:4px;background:#fff;border:2.5px solid #111110;border-radius:9999px;padding:5px 6px 5px 10px;box-shadow:4px 4px 0 #111110;transition:box-shadow 0.15s}
        .nav-pill:hover{box-shadow:6px 6px 0 #111110}
        .nav-logo{font-size:22px;line-height:1;text-decoration:none;flex-shrink:0;display:flex;align-items:center;gap:6px}
        .nav-logo-text{font-size:16px;font-weight:900;color:#111110;letter-spacing:-0.3px}
        .nav-links{display:flex;align-items:center;flex:1;justify-content:center}
        .nav-link{padding:7px 14px;font-size:14px;font-weight:700;color:#111110;text-decoration:none;border-radius:9999px;transition:background 0.1s;white-space:nowrap}
        .nav-link:hover{background:#F5F0E8}
        .nav-div{width:1px;height:22px;background:#E0D8CA;margin:0 4px;flex-shrink:0}
        .btn-ghost{padding:7px 14px;font-size:13px;font-weight:700;color:#111110;text-decoration:none;border-radius:9999px;border:2px solid transparent;transition:background 0.1s;font-family:inherit;background:none;cursor:pointer;white-space:nowrap}
        .btn-ghost:hover{background:#F5F0E8}
        .btn-pill{padding:7px 18px;font-size:13px;font-weight:800;color:#111110;background:#FFD400;border-radius:9999px;border:2px solid #111110;text-decoration:none;white-space:nowrap;transition:box-shadow 0.1s;cursor:pointer;font-family:inherit}
        .btn-pill:hover{box-shadow:2px 2px 0 #111110}

        /* HERO */
        .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;border-bottom:3px solid #111110}
        .hero-left{padding:80px 60px 80px 40px;border-right:3px solid #111110;display:flex;flex-direction:column;justify-content:center;position:relative;background:#FFD400}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:#111110;color:#FFD400;padding:4px 14px;border-radius:9999px;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:28px;width:fit-content}
        .hero-title{font-size:clamp(52px,7vw,88px);font-weight:900;letter-spacing:-3px;line-height:0.92;color:#111110;margin-bottom:28px}
        .hero-title .inv{display:inline-block;background:#111110;color:#FFD400;padding:2px 14px 6px;border-radius:12px}
        .hero-sub{font-size:18px;font-weight:600;color:#111110;line-height:1.5;max-width:380px;margin-bottom:40px;opacity:0.7}
        .hero-ctas{display:flex;gap:12px;flex-wrap:wrap}
        .btn-hero-dark-rnd{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#111110;color:#FFD400;font-family:inherit;font-size:15px;font-weight:800;border:2.5px solid #111110;border-radius:14px;text-decoration:none;cursor:pointer;transition:box-shadow 0.12s,transform 0.12s;box-shadow:4px 4px 0 rgba(0,0,0,0.2)}
        .btn-hero-dark-rnd:hover{box-shadow:6px 6px 0 rgba(0,0,0,0.25);transform:translate(-1px,-1px)}
        .btn-hero-ghost-rnd{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:rgba(255,255,255,0.7);color:#111110;font-family:inherit;font-size:15px;font-weight:800;border:2.5px solid #111110;border-radius:14px;text-decoration:none;cursor:pointer;transition:background 0.12s}
        .btn-hero-ghost-rnd:hover{background:#fff}
        .hero-right{background:#111110;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;position:relative;overflow:hidden}
        .hero-mango{font-size:140px;line-height:1;display:block;animation:floatMango 3s ease-in-out infinite;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.5));margin-bottom:32px}
        @keyframes floatMango{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-16px) rotate(3deg)}}
        .hero-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:2px solid #333;width:100%;max-width:340px}
        .hero-stat{padding:16px 12px;text-align:center;border-right:1px solid #333}
        .hero-stat:last-child{border-right:none}
        .hero-stat-num{font-size:28px;font-weight:900;color:#FFD400;letter-spacing:-1px;display:block}
        .hero-stat-label{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.12em}

        /* TICKER */
        .ticker-wrap{background:#FFD400;border-top:3px solid #111110;border-bottom:3px solid #111110;padding:14px 0;overflow:hidden;white-space:nowrap}
        .ticker-track{display:inline-flex;gap:48px;animation:ticker 20s linear infinite}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .ticker-item{font-size:15px;font-weight:800;color:#111110;letter-spacing:0.05em;text-transform:uppercase;display:inline-flex;align-items:center;gap:12px;flex-shrink:0}
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
        .feat-tab{display:flex;align-items:center;gap:8px;padding:12px 20px;background:none;border:none;border-bottom:3px solid transparent;margin-bottom:-2px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;color:#9B8F7A;transition:all 0.15s;white-space:nowrap}
        .feat-tab:hover{color:#111110;border-bottom-color:#E8E0D0}
        .feat-tab.active{color:#111110;border-bottom-color:#FFD400;background:none}
        .feat-tab-emoji{font-size:18px}

        /* Feature panel */
        .feat-panel{display:grid;grid-template-columns:1fr 1fr;gap:0;border:2px solid #111110;border-top:none;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:4px 6px 0 #D4C9A8;transition:all 0.2s}
        .feat-left{padding:52px 56px;display:flex;flex-direction:column;justify-content:center;transition:background 0.3s}
        .feat-pain{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.06);border-radius:10px;margin-bottom:24px;font-size:13px;font-weight:600;color:inherit;opacity:0.65;font-style:italic;line-height:1.5}
        .feat-pain::before{content:"✗";font-style:normal;font-weight:900;font-size:14px;flex-shrink:0;margin-top:1px}
        .feat-headline{font-size:clamp(32px,4vw,48px);font-weight:900;letter-spacing:-1.5px;line-height:0.95;white-space:pre-line;margin-bottom:18px}
        .feat-desc{font-size:16px;font-weight:500;line-height:1.7;max-width:400px;margin-bottom:24px;opacity:0.75}
        .feat-gain{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.06);border-radius:10px;font-size:13px;font-weight:700;line-height:1.5}
        .feat-gain::before{content:"✓";font-weight:900;font-size:14px;flex-shrink:0;margin-top:1px}
        .feat-tag{display:inline-block;padding:5px 14px;border-radius:9999px;border:2px solid currentColor;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-top:20px;opacity:0.8}
        .feat-right{display:flex;align-items:center;justify-content:center;padding:48px 40px;background:rgba(0,0,0,0.04);border-left:2px solid rgba(0,0,0,0.08)}

        /* HOW IT WORKS */
        .how{background:#111110;padding:80px 40px;border-bottom:3px solid #111110}
        .how-inner{max-width:1100px;margin:0 auto}
        .how-eyebrow{display:inline-block;background:#1a1a1a;color:#FFD400;border:1px solid #333;padding:3px 14px;border-radius:9999px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px}
        .how-title{font-size:clamp(32px,4vw,52px);font-weight:900;letter-spacing:-1.5px;line-height:1.05;color:#fff;margin-bottom:48px}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2px solid #333;border-radius:16px;overflow:hidden}
        .step{padding:40px 32px;border-right:1px solid #333}
        .step:last-child{border-right:none}
        .step-num{font-size:11px;font-weight:800;color:#FFD400;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .step-num::after{content:'';flex:1;height:1px;background:#333}
        .step-emoji{font-size:36px;line-height:1;margin-bottom:16px;display:block}
        .step-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-bottom:12px}
        .step-desc{font-size:14px;font-weight:500;color:#666;line-height:1.7}

        /* CTA BAND */
        .cta-band{background:#FFD400;border-bottom:3px solid #111110;padding:80px 40px}
        .cta-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr auto;align-items:center;gap:40px}
        .cta-title{font-size:clamp(36px,5vw,64px);font-weight:900;color:#111110;letter-spacing:-2px;line-height:1}
        .strikethrough{position:relative;display:inline-block}
        .strikethrough::after{content:'';position:absolute;left:0;right:0;top:50%;height:4px;background:#111110;transform:rotate(-2deg)}
        .btn-cta-dark{display:inline-flex;align-items:center;gap:10px;padding:18px 36px;background:#111110;color:#FFD400;font-family:inherit;font-size:16px;font-weight:800;border:none;border-radius:14px;text-decoration:none;cursor:pointer;transition:box-shadow 0.1s,transform 0.1s;box-shadow:6px 6px 0 rgba(0,0,0,0.3);white-space:nowrap;flex-shrink:0}
        .btn-cta-dark:hover{box-shadow:8px 8px 0 rgba(0,0,0,0.3);transform:translate(-1px,-1px)}

        /* SOCIAL PROOF */
        .proof{background:#FFFBEA;padding:80px 40px;border-bottom:3px solid #111110}
        .proof-inner{max-width:1100px;margin:0 auto}
        .proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2.5px solid #111110;border-radius:20px;box-shadow:6px 6px 0 #111110;margin-top:48px;overflow:hidden}
        .proof-card{padding:36px 32px;border-right:2px solid #111110;position:relative;background:#fff}
        .proof-card:last-child{border-right:none}
        .proof-card::before{content:'"';position:absolute;top:16px;left:24px;font-size:72px;font-weight:900;color:#FFD400;line-height:1;opacity:0.5}
        .proof-quote{font-size:16px;font-weight:600;color:#111110;line-height:1.6;margin-top:40px;margin-bottom:24px}
        .proof-avatar{width:36px;height:36px;border-radius:50%;background:#FFD400;border:2px solid #111110;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#111110;flex-shrink:0}

        /* EXPLORE */
        .explore-section{background:#F5F0E8;border-top:3px solid #E8E0D0;padding:80px 0}
        .explore-inner{max-width:1100px;margin:0 auto;padding:0 24px}
        .tabs{display:flex;background:#fff;border:2px solid #111110;border-radius:12px;overflow:hidden;width:fit-content;margin-bottom:24px}
        .tab-btn{display:flex;align-items:center;gap:6px;padding:9px 20px;border:none;border-right:1px solid #E8E0D0;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.12s}
        .tab-btn:last-child{border-right:none}
        .tab-btn.active{background:#111110;color:#FFD400}
        .tab-btn:not(.active){background:#fff;color:#9B8F7A}
        .tab-btn:not(.active):hover{background:#FAF7F3;color:#111110}
        .search-wrap{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:10px;padding:0 12px;height:40px;flex:1;min-width:200px;max-width:340px;transition:border-color 0.15s}
        .search-wrap:focus-within{border-color:#FFD400}
        .search-inp{flex:1;border:none;outline:none;font-size:13px;font-family:inherit;font-weight:500;color:#111110;background:transparent}
        .medium-pill{padding:6px 14px;border-radius:9999px;border:2px solid #E8E0D0;background:#fff;font-family:inherit;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all 0.1s;white-space:nowrap}
        .medium-pill.active{background:#111110;border-color:#111110;color:#FFD400}
        .medium-pill:not(.active):hover{border-color:#111110;color:#111110}
        .art-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
        .art-card{background:#fff;border-radius:18px;border:2px solid #E8E0D0;box-shadow:3px 4px 0 #D4C9A8;overflow:hidden;cursor:pointer;transition:box-shadow 0.15s,transform 0.15s,border-color 0.15s;text-decoration:none;display:block}
        .art-card:hover{box-shadow:6px 8px 0 #111110;transform:translate(-2px,-3px);border-color:#111110}
        .art-thumb{position:relative;aspect-ratio:4/3;overflow:hidden;background:#FAF7F3}
        .art-thumb img{width:100%;height:100%;object-fit:cover;transition:transform 0.3s}
        .art-card:hover .art-thumb img{transform:scale(1.05)}
        .art-body{padding:12px 14px 10px}
        .artist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
        .artist-card{background:#fff;border-radius:18px;border:2px solid #E8E0D0;overflow:hidden;box-shadow:3px 4px 0 #D4C9A8;cursor:pointer;transition:box-shadow 0.15s,transform 0.15s,border-color 0.15s}
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
        .footer-link{display:block;font-size:13px;font-weight:600;color:#555;text-decoration:none;margin-bottom:10px;transition:color 0.1s}
        .footer-link:hover{color:#fff}
        .footer-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .footer-copy{font-size:11px;font-weight:600;color:#333}

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
      <section className="hero" style={{paddingTop:80}}>
        <div className="hero-left">
          <div className="hero-eyebrow animate-in">🥭 artomango · art platform</div>
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
          <span className="hero-mango">🥭</span>
          <div className="hero-stats">
            <div className="hero-stat"><span className="hero-stat-num">47</span><span className="hero-stat-label">Works</span></div>
            <div className="hero-stat"><span className="hero-stat-num">12</span><span className="hero-stat-label">Shows</span></div>
            <div className="hero-stat"><span className="hero-stat-num">$18k</span><span className="hero-stat-label">Revenue</span></div>
          </div>
          {/* Floating notification cards */}
          <div style={{position:"absolute",top:100,left:24,background:"#FFD400",border:"2px solid #111110",padding:"8px 14px",borderRadius:12,boxShadow:"3px 3px 0 #111110",animation:"floatMango 4s ease-in-out infinite",animationDelay:"0.5s"}}>
            <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#111110"}}>New collab request</div>
            <div style={{fontSize:12,fontWeight:700,color:"#111110",marginTop:2}}>Galerie Nord · Prague</div>
          </div>
          <div style={{position:"absolute",bottom:120,right:24,background:"#fff",border:"2px solid #333",padding:"8px 14px",borderRadius:12,boxShadow:"3px 3px 0 #333",animation:"floatMango 3.5s ease-in-out infinite",animationDelay:"1s"}}>
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
        <div className="why-inner">
          <div className="why-header">
            <div className="section-eyebrow">Why Artomango</div>
            <h2 className="why-title">Built for every player<br/>in the art scene.</h2>
            <p className="why-sub">Everything you need to run your art practice like a professional — without the spreadsheets, the paper trails, or the missed connections.</p>
          </div>

          {/* Feature tab nav */}
          <div className="feat-nav">
            {FEATURES.map((f,i) => (
              <button key={f.id} className={`feat-tab${activeFeature===i?" active":""}`} onClick={() => setActiveFeature(i)}>
                <span className="feat-tab-emoji">{f.emoji}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Feature panel */}
          <div className="feat-panel" style={{background:feat.color}}>
            <div className="feat-left" style={{background:feat.color,color:feat.textColor}}>
              {/* Pain point */}
              <div className="feat-pain">{feat.pain}</div>
              {/* Headline */}
              <h3 className="feat-headline">{feat.headline}</h3>
              {/* Description */}
              <p className="feat-desc">{feat.sub}</p>
              {/* Gain */}
              <div className="feat-gain">{feat.gain}</div>
              {/* Tag */}
              <span className="feat-tag">{feat.tag}</span>
            </div>
            <div className="feat-right" style={{background:feat.textColor==="#111110"?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.06)"}}>
              <FeatureVisual id={feat.id}/>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="how">
        <div className="how-inner">
          <div className="how-eyebrow">How it works</div>
          <h2 className="how-title">Three steps to<br/>your art business.</h2>
          <div className="steps">
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
      <div className="cta-band">
        <div className="cta-inner">
          <div>
            <h2 className="cta-title">Stop managing art<br/>in <span className="strikethrough">spreadsheets.</span></h2>
            <p style={{fontSize:16,fontWeight:600,color:"#5C5346",marginTop:16}}>Join artists and venues already using Artomango.</p>
          </div>
          <a href="/register" className="btn-cta-dark">🥭 Get started free →</a>
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <section className="proof">
        <div className="proof-inner">
          <div className="section-eyebrow" style={{background:"#FFFBEA",color:"#111110",border:"2px solid #111110"}}>What they say</div>
          <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",marginBottom:0}}>Artists love it.</h2>
          <div className="proof-grid">
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
      <section id="explore" className="explore-section" ref={exploreRef}>
        <div className="explore-inner">
          <div style={{marginBottom:32}}>
            <div className="section-eyebrow" style={{background:"#111110",color:"#FFD400"}}>Browse the platform</div>
            <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",marginBottom:6}}>Explore the scene</h2>
            <p style={{fontSize:15,fontWeight:600,color:"#9B8F7A"}}>Discover artworks and connect with artists and venues</p>
          </div>

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
                          <div style={{position:"absolute",bottom:8,left:8,background:"rgba(255,255,255,0.92)",borderRadius:9999,padding:"3px 9px",display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#111110"}}>
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
                        ? <img src={artist.cover_image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
                        : <div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#FFD40033,#F5F0E8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {artist.role==="artist"?<Palette size={24} color="#C0B8A8"/>:<Building2 size={24} color="#C0B8A8"/>}
                          </div>
                      }
                    </div>
                    <div style={{padding:"12px 16px 16px"}}>
                      <div style={{marginTop:-20,marginBottom:10}}>
                        <div style={{width:44,height:44,borderRadius:"50%",border:"3px solid #fff",background:"#FFD400",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#111110",overflow:"hidden",boxShadow:"2px 2px 0 #E8E0D0"}}>
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
                        <Link href={`/portfolio/${artist.username||artist.id}`} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"1.5px solid #E8E0D0",background:"#FAF7F3",fontSize:12,fontWeight:700,color:"#111110",textDecoration:"none",transition:"all 0.12s"}}
                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#FFD400";(e.currentTarget as HTMLElement).style.borderColor="#111110";}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#FAF7F3";(e.currentTarget as HTMLElement).style.borderColor="#E8E0D0";}}>
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
