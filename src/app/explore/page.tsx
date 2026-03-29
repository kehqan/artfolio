"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight,
  MapPin, Calendar, Users, LayoutDashboard,
  LogOut, User, Zap, Star, Palette, Building2, MessageSquare
} from "lucide-react";

type Artwork     = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string };
type Artist      = { id: string; name: string; username?: string; city?: string; avatar_url?: string; medium?: string };
type Venue       = { id: string; name: string; type: string; city?: string; logo_url?: string; cover_image_url?: string };
type Post        = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string; created_at?: string };
type Exhibition  = { id: string; title: string; venue?: string; start_date?: string; cover_image?: string; status: string };
type Collab      = { id: string; title: string; type?: string; partner_name?: string; status: string };
type Profile     = { full_name: string; avatar_url?: string } | null;

const TABS = [
  { id: "all",            label: "ALL"         },
  { id: "artworks",       label: "ARTWORKS"    },
  { id: "artists",        label: "ARTISTS"     },
  { id: "venues",         label: "VENUES"      },
  { id: "exhibitions",    label: "EXHIBITIONS" },
  { id: "collaborations", label: "COLLABS"     },
];

// ── Horizontal scrolling row ──────────────────────────────────────
function Row({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d, behavior: "smooth" });
  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-0 border-t-4 border-b-4 border-black">
        <div className={`${accent} border-r-4 border-black px-4 py-2`}>
          <span className="text-[11px] font-black tracking-[0.2em] text-black">{label}</span>
        </div>
        <div className="flex">
          <button onClick={() => scroll(-340)} className="w-10 h-10 border-l-4 border-black bg-white flex items-center justify-center hover:bg-[#FFD400] transition-colors">
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <button onClick={() => scroll(340)} className="w-10 h-10 border-l-4 border-black bg-white flex items-center justify-center hover:bg-[#FFD400] transition-colors">
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-0 overflow-x-auto border-b-4 border-black" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

// ── Artwork card ──────────────────────────────────────────────────
function ArtCard({ a, idx }: { a: Artwork; idx: number }) {
  const bg = idx % 4 === 0 ? "bg-white" : idx % 4 === 1 ? "bg-[#FFF3C4]" : idx % 4 === 2 ? "bg-white" : "bg-black";
  const tx = idx % 4 === 3 ? "text-white" : "text-black";
  return (
    <div className={`shrink-0 w-52 border-r-4 border-black ${bg} group cursor-pointer`}
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
      <div className="w-full h-52 overflow-hidden border-b-4 border-black relative bg-stone-100">
        {a.images?.[0]
          ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Star className="w-12 h-12 text-stone-300" /></div>}
        <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-black border-b-2 border-l-2 border-black ${a.status?.toLowerCase() === "available" ? "bg-[#FFD400] text-black" : "bg-black text-[#FFD400]"}`}>
          {a.status?.toUpperCase()}
        </div>
      </div>
      <div className="p-4">
        <p className={`font-black text-base leading-tight truncate ${tx}`}>{a.title}</p>
        {a.artist_name && <p className={`text-xs font-bold mt-1 truncate opacity-60 ${tx}`}>{a.artist_name}</p>}
        {a.price && <p className={`text-sm font-black mt-3 font-mono ${tx}`}>${a.price.toLocaleString()}</p>}
      </div>
    </div>
  );
}

// ── Artist/portfolio card ─────────────────────────────────────────
function ArtistCard({ a, idx }: { a: Artist; idx: number }) {
  const accents = ["bg-[#FF6B6B]","bg-[#4ECDC4]","bg-[#FFD400]","bg-[#95E1D3]"];
  const ac = accents[idx % accents.length];
  return (
    <Link href={a.username ? `/artist/${a.username}` : "#"}
      className="shrink-0 w-52 border-r-4 border-black bg-white group block"
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
      {/* Avatar area */}
      <div className={`w-full h-40 ${ac} border-b-4 border-black flex items-center justify-center relative overflow-hidden`}>
        {a.avatar_url
          ? <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-20 h-20 border-4 border-black bg-white flex items-center justify-center">
              <span className="text-3xl font-black text-black">{a.name?.[0]}</span>
            </div>}
      </div>
      <div className="p-4">
        <p className="font-black text-sm text-black truncate leading-tight">{a.name}</p>
        {a.medium && <p className="text-[10px] font-bold text-black/50 mt-1 truncate uppercase tracking-wider">{a.medium}</p>}
        {a.city && <p className="text-[10px] font-bold text-black/40 mt-1 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{a.city}</p>}
        <div className={`mt-3 inline-block ${ac} border-2 border-black px-2 py-0.5`}>
          <span className="text-[9px] font-black uppercase text-black tracking-wider">View Portfolio</span>
        </div>
      </div>
    </Link>
  );
}

// ── Venue card ────────────────────────────────────────────────────
function VenueCard({ v, idx }: { v: Venue; idx: number }) {
  const accents = ["bg-[#FF6B6B]","bg-[#4ECDC4]","bg-[#95E1D3]","bg-[#FFD400]"];
  const ac = accents[idx % accents.length];
  return (
    <Link href={`/venue/${v.id}`}
      className="shrink-0 w-72 border-r-4 border-black bg-white group block"
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
      <div className="w-full h-40 overflow-hidden border-b-4 border-black relative bg-stone-100">
        {v.cover_image_url
          ? <img src={v.cover_image_url} alt={v.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className={`w-full h-full ${ac} flex items-center justify-center`}><MapPin className="w-12 h-12 text-black opacity-30" /></div>}
        {v.logo_url && <div className="absolute bottom-0 left-0 w-12 h-12 border-r-2 border-t-2 border-black bg-white overflow-hidden"><img src={v.logo_url} alt="" className="w-full h-full object-cover" /></div>}
        <div className={`absolute top-0 left-0 ${ac} border-b-2 border-r-2 border-black px-3 py-1`}>
          <span className="text-[10px] font-black uppercase text-black">{v.type}</span>
        </div>
      </div>
      <div className="p-4 flex items-end justify-between">
        <div className="min-w-0">
          <p className="font-black text-sm text-black truncate">{v.name}</p>
          {v.city && <p className="text-xs font-bold text-black/50 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</p>}
        </div>
        <ArrowUpRight className="w-5 h-5 text-black shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
      </div>
    </Link>
  );
}

// ── Exhibition card ───────────────────────────────────────────────
function ExhibCard({ e }: { e: Exhibition }) {
  const isCurrent = e.status?.toLowerCase() === "current";
  return (
    <div className="shrink-0 w-64 border-r-4 border-black bg-white group"
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={el => (el.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={el => (el.currentTarget.style.transform = "translateY(0)")}>
      <div className="w-full h-44 overflow-hidden border-b-4 border-black relative bg-stone-100">
        {e.cover_image
          ? <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center bg-stone-100"><Calendar className="w-12 h-12 text-stone-300" /></div>}
        <div className={`absolute top-0 left-0 border-b-4 border-r-4 border-black px-3 py-1.5 ${isCurrent ? "bg-[#FFD400]" : "bg-[#4ECDC4]"}`}>
          <span className="text-[10px] font-black uppercase text-black tracking-widest">{e.status}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="font-black text-sm text-black leading-tight line-clamp-2">{e.title}</p>
        {e.venue && <p className="text-xs font-bold text-black/50 mt-1.5">{e.venue}</p>}
        {e.start_date && <p className="text-[10px] font-black text-black/40 mt-2 uppercase tracking-wider">{new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
      </div>
    </div>
  );
}

// ── Collab card ───────────────────────────────────────────────────
function CollabCard({ c, idx }: { c: Collab; idx: number }) {
  const bgs = ["bg-black","bg-[#FF6B6B]","bg-black","bg-[#4ECDC4]"];
  const txs = ["text-[#FFD400]","text-black","text-[#FFD400]","text-black"];
  const bg = bgs[idx % bgs.length];
  const tx = txs[idx % txs.length];
  return (
    <div className={`shrink-0 w-56 border-r-4 border-black ${bg} p-5 flex flex-col justify-between min-h-[160px] group`}
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
      <div>
        {c.type && <div className="inline-block bg-[#FFD400] border-2 border-black px-2 py-0.5 mb-3"><span className="text-[10px] font-black uppercase text-black">{c.type}</span></div>}
        <p className={`font-black text-sm leading-snug ${tx}`}>{c.title}</p>
      </div>
      <div className="mt-4 flex items-end justify-between">
        {c.partner_name && <p className={`text-[10px] font-bold uppercase opacity-60 ${tx} truncate`}>{c.partner_name}</p>}
        <div className="bg-[#FFD400] border-2 border-black px-2 py-0.5 shrink-0 ml-2"><span className="text-[10px] font-black text-black uppercase">{c.status}</span></div>
      </div>
    </div>
  );
}

// ── Community post — LIST item (not carousel card) ────────────────
function PostListItem({ p }: { p: Post }) {
  function timeAgo(d?: string) {
    if (!d) return "";
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }
  return (
    <div className="border-b-4 border-black flex gap-0 bg-white hover:bg-[#FFF3C4] transition-colors group">
      {/* Avatar column */}
      <div className="shrink-0 w-14 border-r-4 border-black flex flex-col items-center pt-4">
        {p.profile_avatar
          ? <img src={p.profile_avatar} alt="" className="w-9 h-9 border-2 border-black object-cover" />
          : <div className="w-9 h-9 border-2 border-black bg-[#FFD400] flex items-center justify-center text-sm font-black text-black">{p.profile_name?.[0] || "?"}</div>}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-black text-black">{p.profile_name || "Anonymous"}</span>
          {p.created_at && <span className="text-[10px] font-bold text-black/40">{timeAgo(p.created_at)}</span>}
        </div>
        {p.content && <p className="text-sm text-black/80 leading-relaxed font-medium line-clamp-3">{p.content}</p>}
        {p.images && p.images.length > 0 && (
          <div className="flex gap-2 mt-3">
            {p.images.slice(0,3).map((img, i) => (
              <div key={i} className="w-16 h-16 border-2 border-black overflow-hidden shrink-0">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {p.images.length > 3 && (
              <div className="w-16 h-16 border-2 border-black bg-black flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-[#FFD400]">+{p.images.length - 3}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [profile, setProfile] = useState<Profile>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
        setProfile(p);
      }
      setUserLoaded(true);

      // All public — no auth required
      const [
        { data: rawAw }, { data: rawAr }, { data: rawVe },
        { data: rawPo }, { data: rawPr },
        { data: rawEx }, { data: rawCo }
      ] = await Promise.all([
        supabase.from("artworks").select("id,title,images,price,status,artist_id").eq("status","Available").limit(20),
        supabase.from("artists").select("id,name,username,city,avatar_url,medium").limit(16),
        supabase.from("venues").select("id,name,type,city,logo_url,cover_image_url").limit(12),
        supabase.from("posts").select("id,content,images,user_id,created_at").order("created_at",{ascending:false}).limit(10),
        supabase.from("profiles").select("id,full_name,avatar_url").limit(300),
        supabase.from("exhibitions").select("id,title,venue,start_date,cover_image,status").in("status",["Current","Upcoming","current","upcoming"]).limit(12),
        supabase.from("collaborations").select("id,title,type,partner_name,status").eq("status","Open").limit(12),
      ]);

      const am: Record<string,string> = {};
      for (const a of rawAr||[]) am[a.id]=a.name;
      const pm: Record<string,{name:string;avatar?:string}> = {};
      for (const p of rawPr||[]) pm[p.id]={name:p.full_name,avatar:p.avatar_url};

      setArtworks((rawAw||[]).map(a=>({id:a.id,title:a.title,images:a.images,price:a.price,status:a.status,artist_name:a.artist_id?am[a.artist_id]:undefined})));
      setArtists((rawAr||[]).map(a=>({id:a.id,name:a.name,username:a.username,city:a.city,avatar_url:a.avatar_url,medium:a.medium})));
      setVenues((rawVe||[]).map(v=>({id:v.id,name:v.name,type:v.type,city:v.city,logo_url:v.logo_url,cover_image_url:v.cover_image_url})));
      setPosts((rawPo||[]).map(p=>({id:p.id,content:p.content,images:p.images,profile_name:pm[p.user_id]?.name,profile_avatar:pm[p.user_id]?.avatar,created_at:p.created_at})));
      setExhibitions((rawEx||[]).map(e=>({id:e.id,title:e.title,venue:e.venue,start_date:e.start_date,cover_image:e.cover_image,status:e.status})));
      setCollabs((rawCo||[]).map(c=>({id:c.id,title:c.title,type:c.type,partner_name:c.partner_name,status:c.status})));
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null); setMenuOpen(false);
  }

  const showArtworks    = activeTab === "all" || activeTab === "artworks";
  const showArtists     = activeTab === "all" || activeTab === "artists";
  const showVenues      = activeTab === "all" || activeTab === "venues";
  const showPosts       = activeTab === "all";
  const showExhibitions = activeTab === "all" || activeTab === "exhibitions";
  const showCollabs     = activeTab === "all" || activeTab === "collaborations";

  return (
    <div className="min-h-screen bg-[#FFFBEA]">

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FFD400] border-b-4 border-black">
        <div className="flex items-stretch justify-between h-14">
          <Link href="/" className="flex items-center px-6 border-r-4 border-black font-black text-xl text-black tracking-tight hover:bg-black hover:text-[#FFD400] transition-colors">
            Artfolio
          </Link>
          <nav className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`h-full px-5 text-[11px] font-black tracking-[0.15em] border-r-4 border-black whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-black text-[#FFD400]" : "text-black hover:bg-black/10"}`}>
                {tab.label}
              </button>
            ))}
          </nav>
          {userLoaded && (
            profile ? (
              <div className="flex items-stretch relative">
                <Link href="/dashboard" className="flex items-center gap-2 px-5 border-l-4 border-black text-sm font-black text-black hover:bg-black hover:text-[#FFD400] transition-colors">
                  <LayoutDashboard className="w-4 h-4" /><span className="hidden sm:block">DASHBOARD</span>
                </Link>
                <button onClick={() => setMenuOpen(p=>!p)} className="flex items-center px-4 border-l-4 border-black hover:bg-black/10 transition-colors">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-8 h-8 border-2 border-black object-cover" />
                    : <div className="w-8 h-8 border-2 border-black bg-black flex items-center justify-center text-[#FFD400] text-xs font-black">{profile.full_name?.[0]}</div>}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full bg-white border-4 border-black z-50 w-44" style={{ boxShadow: "4px 4px 0 #000" }}>
                    <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-[#FFD400] border-b-2 border-black"><User className="w-4 h-4" />Profile</Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-[#FF6B6B] w-full"><LogOut className="w-4 h-4" />Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-stretch">
                <Link href="/login" className="flex items-center px-5 border-l-4 border-black text-sm font-black hover:bg-black/10 transition-colors">SIGN IN</Link>
                <Link href="/register" className="flex items-center px-5 border-l-4 border-black bg-black text-[#FFD400] text-sm font-black hover:bg-stone-900 transition-colors">JOIN FREE</Link>
              </div>
            )
          )}
        </div>
      </header>

      {/* ── TICKER ────────────────────────────────────────── */}
      <div className="border-b-4 border-black overflow-hidden bg-black">
        <div className="flex items-center py-2 whitespace-nowrap" style={{ animation: "marquee 22s linear infinite" }}>
          {["DISCOVER ART","CONNECT SPACES","FIND YOUR VENUE","MEET ARTISTS","EXPLORE NOW","ARTFOLIO"].concat(["DISCOVER ART","CONNECT SPACES","FIND YOUR VENUE","MEET ARTISTS","EXPLORE NOW","ARTFOLIO"]).map((t,i) => (
            <span key={i} className="text-[#FFD400] text-xs font-black tracking-[0.3em] uppercase px-8 border-r border-[#FFD400]/30">{t}</span>
          ))}
        </div>
      </div>

      {/* ── HERO ──────────────────────────────────────────── */}
      <div className="border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 border-r-0 lg:border-r-4 border-black p-10 lg:p-16">
            <div className="bg-white border-4 border-black inline-block px-8 py-6 mb-8 relative" style={{ boxShadow: "6px 6px 0 #000" }}>
              <h1 className="text-5xl lg:text-6xl font-black text-black leading-[0.95] tracking-tight">
                Discover art.<br />Connect spaces.
              </h1>
              <div className="absolute -bottom-5 left-10 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[20px] border-t-white" />
              <div className="absolute -bottom-[30px] left-[38px] w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-black" />
            </div>
            <p className="text-black/70 text-lg font-semibold max-w-lg leading-relaxed mt-10">
              Browse emerging artists, find local exhibitions, and connect with venues shaping the Iranian art scene.
            </p>
            {!profile && (
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-black text-[#FFD400] border-4 border-black font-black text-base hover:bg-stone-900 transition-colors group" style={{ boxShadow: "4px 4px 0 #000" }}>
                  Join as Artist or Venue<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white border-4 border-black font-black text-base text-black hover:bg-[#FFD400] transition-colors">Sign in</Link>
              </div>
            )}
            {profile && (
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-black text-[#FFD400] border-4 border-black font-black text-base mt-8 hover:bg-stone-900 transition-colors" style={{ boxShadow: "4px 4px 0 #000" }}>
                <LayoutDashboard className="w-5 h-5" /> Your Dashboard →
              </Link>
            )}
          </div>
          {/* Stat blocks */}
          <div className="grid grid-cols-2 border-t-4 lg:border-t-0 lg:border-l-4 border-black">
            {[
              { n: artworks.length,    l: "ARTWORKS",    bg: "bg-white"     },
              { n: artists.length,     l: "ARTISTS",     bg: "bg-[#FF6B6B]" },
              { n: exhibitions.length, l: "EXHIBITIONS", bg: "bg-[#4ECDC4]" },
              { n: collabs.length,     l: "COLLABS OPEN",bg: "bg-black"     },
            ].map((s,i) => (
              <div key={i} className={`${s.bg} border-r-4 border-b-4 border-black p-6 flex flex-col justify-between`}>
                <span className={`text-4xl font-black ${s.bg==="bg-black"?"text-[#FFD400]":"text-black"}`}>{loading?"—":s.n||"0"}</span>
                <span className={`text-[10px] font-black tracking-[0.2em] uppercase mt-2 ${s.bg==="bg-black"?"text-[#FFD400]/60":"text-black/50"}`}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="bg-white border-4 border-black px-10 py-5" style={{ boxShadow: "4px 4px 0 #000" }}>
              <div className="flex items-center gap-3"><Zap className="w-5 h-5 animate-pulse" /><span className="font-black tracking-widest uppercase text-sm">Loading...</span></div>
            </div>
          </div>
        ) : (
          <div className="pt-12 pb-0">

            {/* Artworks carousel */}
            {showArtworks && artworks.length > 0 && (
              <Row label="TOP PICKS" accent="bg-[#FF6B6B]">
                {artworks.map((a,i) => <ArtCard key={a.id} a={a} idx={i} />)}
              </Row>
            )}

            {/* Top Portfolios carousel + directory buttons */}
            {showArtists && artists.length > 0 && (
              <div className="mb-14">
                <Row label="TOP PORTFOLIOS" accent="bg-[#FFD400] border-2 border-black">
                  {artists.map((a,i) => <ArtistCard key={a.id} a={a} idx={i} />)}
                </Row>
                {/* Directory CTA buttons */}
                <div className="border-b-4 border-black flex">
                  <Link href="/directory/artists"
                    className="flex-1 flex items-center justify-between px-8 py-5 bg-black text-[#FFD400] border-r-4 border-black font-black text-base hover:bg-stone-900 transition-colors group">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em] uppercase text-[#FFD400]/50 mb-1">Browse all</p>
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5" />
                        <span>Artists Directory</span>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/directory/venues"
                    className="flex-1 flex items-center justify-between px-8 py-5 bg-[#FFD400] border-black font-black text-base text-black hover:bg-yellow-300 transition-colors group">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em] uppercase text-black/40 mb-1">Browse all</p>
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5" />
                        <span>Venues Directory</span>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            )}

            {/* Venues carousel */}
            {showVenues && venues.length > 0 && (
              <Row label="POPULAR VENUES" accent="bg-[#4ECDC4]">
                {venues.map((v,i) => <VenueCard key={v.id} v={v} idx={i} />)}
              </Row>
            )}

            {/* Exhibitions carousel — public for everyone */}
            {showExhibitions && exhibitions.length > 0 && (
              <Row label="EXHIBITIONS" accent="bg-[#95E1D3]">
                {exhibitions.map(e => <ExhibCard key={e.id} e={e} />)}
              </Row>
            )}

            {/* Collabs carousel — public for everyone */}
            {showCollabs && collabs.length > 0 && (
              <Row label="OPEN COLLABORATIONS" accent="bg-black">
                {collabs.map((c,i) => <CollabCard key={c.id} c={c} idx={i} />)}
              </Row>
            )}

            {/* Community feed — LIST layout, not carousel */}
            {showPosts && posts.length > 0 && (
              <div className="mb-14">
                <div className="flex items-center justify-between border-t-4 border-b-4 border-black">
                  <div className="bg-[#95E1D3] border-r-4 border-black px-4 py-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-black" strokeWidth={2.5} />
                    <span className="text-[11px] font-black tracking-[0.2em] text-black">FROM THE COMMUNITY</span>
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase text-black/40 px-4">Latest posts</span>
                </div>
                <div className="border-b-4 border-black">
                  {posts.map(p => <PostListItem key={p.id} p={p} />)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── BOTTOM CTA ────────────────────────────────────── */}
      <div className="border-t-4 border-black bg-black">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-stretch">
          <div className="flex-1 p-12 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-[#FFD400]/20">
            <h2 className="text-4xl lg:text-5xl font-black text-[#FFD400] leading-tight mb-4">Ready to<br />showcase<br />your work?</h2>
            <p className="text-white/60 font-semibold mb-8 max-w-sm">Join artists and venues building the Iranian art community on Artfolio.</p>
            <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-[#FFD400] text-black border-4 border-[#FFD400] font-black text-lg hover:bg-white transition-colors group" style={{ boxShadow: "4px 4px 0 rgba(255,212,0,0.4)" }}>
              Get started free<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-3 w-full lg:w-64 shrink-0">
            {["bg-[#FF6B6B]","bg-[#FFD400]","bg-black","bg-[#4ECDC4]","bg-black","bg-[#FFD400]","bg-black","bg-[#FF6B6B]","bg-[#4ECDC4]"].map((b,i) => (
              <div key={i} className={`${b} border border-[#FFD400]/20 aspect-square`} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </div>
  );
}
