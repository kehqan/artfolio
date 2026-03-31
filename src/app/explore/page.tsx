"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight,
  MapPin, Calendar, Users, LayoutDashboard,
  LogOut, User, ImageIcon, Star, Building2, Palette,
  MessageSquare, Handshake, Search, Bell, Menu, X,
} from "lucide-react";

type Artwork    = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string; medium?: string };
type Artist     = { id: string; name: string; username?: string; city?: string; avatar_url?: string; medium?: string };
type Venue      = { id: string; name: string; type: string; city?: string; logo_url?: string; cover_image_url?: string };
type Post       = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string; created_at?: string };
type Exhibition = { id: string; title: string; venue?: string; start_date?: string; cover_image?: string; status: string };
type Collab     = { id: string; title: string; type?: string; partner_name?: string; status: string };
type Profile    = { full_name: string; avatar_url?: string } | null;

const TABS = [
  { id: "all",            label: "All"           },
  { id: "artworks",       label: "Artworks"      },
  { id: "artists",        label: "Artists"       },
  { id: "venues",         label: "Venues"        },
  { id: "exhibitions",    label: "Exhibitions"   },
  { id: "collaborations", label: "Collabs"       },
];

// ── Horizontal scroll row ─────────────────────────────────────────
function ScrollRow({ title, accent, viewAllHref, children }: {
  title: string; accent: string; viewAllHref?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d, behavior: "smooth" });
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-6 ${accent}`} />
          <h2 className="font-black text-sm uppercase tracking-[0.15em] text-black">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll(-300)}
            className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-[#FFD400] transition-colors">
            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
          </button>
          <button onClick={() => scroll(300)}
            className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-[#FFD400] transition-colors">
            <ChevronRight className="w-4 h-4" strokeWidth={3} />
          </button>
          {viewAllHref && (
            <Link href={viewAllHref} className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors px-2">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────
function ArtworkCard({ a, idx }: { a: Artwork; idx: number }) {
  const bgs = ["bg-white", "bg-[#FFF3C4]", "bg-white", "bg-black"];
  const txs = ["text-black", "text-black", "text-black", "text-white"];
  const bg = bgs[idx % 4]; const tx = txs[idx % 4];
  return (
    <div className={`shrink-0 w-44 border-2 border-black ${bg} group hover:-translate-y-1 transition-transform duration-150`}>
      <div className="w-full h-44 bg-stone-100 overflow-hidden border-b-2 border-black relative">
        {a.images?.[0]
          ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
        <div className={`absolute top-0 left-0 px-2 py-0.5 text-[9px] font-black uppercase border-b-2 border-r-2 border-black ${a.status?.toLowerCase() === "available" ? "bg-[#FFD400] text-black" : "bg-black text-[#FFD400]"}`}>
          {a.status}
        </div>
      </div>
      <div className="p-3">
        <p className={`font-black text-xs leading-tight truncate ${tx}`}>{a.title}</p>
        {a.artist_name && <p className={`text-[10px] font-bold mt-0.5 truncate opacity-50 ${tx}`}>{a.artist_name}</p>}
        {a.price && <p className={`text-xs font-black mt-2 font-mono ${tx}`}>${a.price.toLocaleString()}</p>}
      </div>
    </div>
  );
}

function ArtistCard({ a, idx }: { a: Artist; idx: number }) {
  const acs = ["bg-[#FF6B6B]", "bg-[#4ECDC4]", "bg-[#FFD400]", "bg-[#95E1D3]"];
  const ac = acs[idx % 4];
  return (
    <Link href={a.username ? `/artist/${a.username}` : "#"}
      className="shrink-0 w-40 border-2 border-black bg-white group hover:-translate-y-1 transition-transform duration-150 block">
      <div className={`w-full h-36 ${ac} border-b-2 border-black overflow-hidden flex items-center justify-center`}>
        {a.avatar_url
          ? <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-14 h-14 border-4 border-black bg-white flex items-center justify-center">
              <span className="text-2xl font-black text-black">{a.name?.[0]}</span>
            </div>}
      </div>
      <div className="p-3">
        <p className="font-black text-xs text-black truncate">{a.name}</p>
        {a.medium && <p className="text-[9px] font-bold text-black/40 uppercase tracking-wider truncate mt-0.5">{a.medium}</p>}
        {a.city && <p className="text-[9px] font-bold text-black/40 mt-1 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{a.city}</p>}
      </div>
    </Link>
  );
}

function VenueCard({ v, idx }: { v: Venue; idx: number }) {
  const acs = ["bg-[#FF6B6B]", "bg-[#4ECDC4]", "bg-[#95E1D3]", "bg-[#FFD400]"];
  const ac = acs[idx % 4];
  return (
    <Link href={`/venue/${v.id}`}
      className="shrink-0 w-56 border-2 border-black bg-white group hover:-translate-y-1 transition-transform duration-150 block">
      <div className="w-full h-32 bg-stone-100 overflow-hidden border-b-2 border-black relative">
        {v.cover_image_url
          ? <img src={v.cover_image_url} alt={v.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className={`w-full h-full ${ac} flex items-center justify-center`}><Building2 className="w-10 h-10 text-black/30" /></div>}
        {v.logo_url && <div className="absolute bottom-0 left-0 w-10 h-10 border-t-2 border-r-2 border-black bg-white overflow-hidden"><img src={v.logo_url} alt="" className="w-full h-full object-cover" /></div>}
        <div className={`absolute top-0 right-0 ${ac} border-b-2 border-l-2 border-black px-2 py-0.5`}>
          <span className="text-[9px] font-black uppercase text-black">{v.type}</span>
        </div>
      </div>
      <div className="p-3 flex items-end justify-between">
        <div className="min-w-0">
          <p className="font-black text-xs text-black truncate">{v.name}</p>
          {v.city && <p className="text-[9px] font-bold text-black/40 mt-0.5 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{v.city}</p>}
        </div>
        <ArrowUpRight className="w-4 h-4 text-black/20 group-hover:text-black transition-colors shrink-0" strokeWidth={2.5} />
      </div>
    </Link>
  );
}

function ExhibitionCard({ e }: { e: Exhibition }) {
  const isCurrent = e.status?.toLowerCase() === "current";
  return (
    <div className="shrink-0 w-52 border-2 border-black bg-white group hover:-translate-y-1 transition-transform duration-150">
      <div className="w-full h-32 bg-stone-100 overflow-hidden border-b-2 border-black relative">
        {e.cover_image
          ? <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Calendar className="w-10 h-10 text-stone-300" /></div>}
        <div className={`absolute top-0 left-0 border-b-2 border-r-2 border-black px-2 py-0.5 ${isCurrent ? "bg-[#FFD400]" : "bg-[#4ECDC4]"}`}>
          <span className="text-[9px] font-black uppercase text-black">{e.status}</span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-black text-xs text-black line-clamp-2 leading-tight">{e.title}</p>
        {e.venue && <p className="text-[9px] font-bold text-black/40 mt-1">{e.venue}</p>}
        {e.start_date && <p className="text-[9px] font-black text-black/30 mt-1 uppercase tracking-wider">{new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
      </div>
    </div>
  );
}

function CollabCard({ c, idx }: { c: Collab; idx: number }) {
  const bgs = ["bg-black", "bg-[#FF6B6B]", "bg-black", "bg-[#4ECDC4]"];
  const txs = ["text-[#FFD400]", "text-black", "text-[#FFD400]", "text-black"];
  return (
    <div className={`shrink-0 w-48 border-2 border-black ${bgs[idx%4]} p-4 flex flex-col justify-between min-h-[140px] group hover:-translate-y-1 transition-transform duration-150`}>
      <div>
        {c.type && <div className="inline-block bg-[#FFD400] border border-black px-2 py-0.5 mb-2"><span className="text-[9px] font-black uppercase text-black">{c.type}</span></div>}
        <p className={`font-black text-xs leading-snug ${txs[idx%4]}`}>{c.title}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {c.partner_name && <p className={`text-[9px] font-bold truncate opacity-50 ${txs[idx%4]}`}>{c.partner_name}</p>}
        <span className="px-1.5 py-0.5 bg-[#FFD400] border border-black text-[9px] font-black text-black uppercase ml-auto">{c.status}</span>
      </div>
    </div>
  );
}

// ── Community post list item ───────────────────────────────────────
function PostRow({ p }: { p: Post }) {
  function timeAgo(d?: string) {
    if (!d) return "";
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-black/10 hover:bg-[#FFFBEA] transition-colors group">
      {p.profile_avatar
        ? <img src={p.profile_avatar} alt="" className="w-8 h-8 border-2 border-black object-cover shrink-0 mt-0.5" />
        : <div className="w-8 h-8 border-2 border-black bg-[#FFD400] flex items-center justify-center text-xs font-black text-black shrink-0 mt-0.5">{p.profile_name?.[0] || "?"}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-black">{p.profile_name || "Anonymous"}</span>
          {p.created_at && <span className="text-[10px] font-bold text-black/30">{timeAgo(p.created_at)}</span>}
        </div>
        {p.content && <p className="text-xs text-black/70 leading-relaxed font-medium line-clamp-2">{p.content}</p>}
        {p.images && p.images.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {p.images.slice(0, 3).map((img, i) => (
              <div key={i} className="w-12 h-12 border-2 border-black overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {p.images.length > 3 && <div className="w-12 h-12 border-2 border-black bg-black flex items-center justify-center"><span className="text-[10px] font-black text-[#FFD400]">+{p.images.length - 3}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [activeTab, setActiveTab]   = useState("all");
  const [search, setSearch]         = useState("");
  const [profile, setProfile]       = useState<Profile>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [mobileNav, setMobileNav]   = useState(false);

  const [artworks,    setArtworks]    = useState<Artwork[]>([]);
  const [artists,     setArtists]     = useState<Artist[]>([]);
  const [venues,      setVenues]      = useState<Venue[]>([]);
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [collabs,     setCollabs]     = useState<Collab[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
        setProfile(p);
      }
      setUserLoaded(true);

      const [
        { data: rawAw }, { data: rawAr }, { data: rawVe },
        { data: rawPo }, { data: rawPr },
        { data: rawEx }, { data: rawCo }
      ] = await Promise.all([
        supabase.from("artworks").select("id,title,images,price,status,artist_id,medium").eq("status","Available").limit(20),
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

      setArtworks((rawAw||[]).map(a=>({id:a.id,title:a.title,images:a.images,price:a.price,status:a.status,medium:a.medium,artist_name:a.artist_id?am[a.artist_id]:undefined})));
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

  const show = (tab: string) => activeTab === "all" || activeTab === tab;

  // Filter by search (basic)
  const fArt  = artworks.filter(a   => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.artist_name?.toLowerCase().includes(search.toLowerCase()));
  const fArtist = artists.filter(a  => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase()));
  const fVen  = venues.filter(v     => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase()));
  const fExh  = exhibitions.filter(e=> !search || e.title?.toLowerCase().includes(search.toLowerCase()));
  const fCol  = collabs.filter(c    => !search || c.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#FFFBEA]">

      {/* ── TOP HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
        <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-4">

          {/* Logo */}
          <Link href="/" className="font-black text-xl text-black tracking-tight shrink-0 flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FFD400] border-2 border-black flex items-center justify-center shrink-0">
              <Palette className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="hidden sm:block">Artfolio</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 border-2 border-black bg-[#FFFBEA] px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-black/40 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search artworks, artists, venues..."
              className="text-xs font-bold text-black bg-transparent outline-none w-full placeholder:text-black/30" />
            {search && <button onClick={() => setSearch("")} className="text-black/40 hover:text-black"><X className="w-3.5 h-3.5" /></button>}
          </div>

          {/* Tabs (desktop) */}
          <nav className="hidden md:flex items-center gap-0 border-2 border-black overflow-hidden shrink-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 h-9 text-[11px] font-black tracking-wider border-r-2 border-black last:border-r-0 whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-black text-[#FFD400]" : "bg-white text-black hover:bg-[#FFD400]"}`}>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile menu */}
            <button onClick={() => setMobileNav(p => !p)} className="md:hidden w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-[#FFD400] transition-colors">
              <Menu className="w-4 h-4" />
            </button>

            {userLoaded && (
              profile ? (
                <div className="relative flex items-center gap-2">
                  <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 h-9 border-2 border-black text-xs font-black hover:bg-[#FFD400] transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </Link>
                  <button onClick={() => setMenuOpen(p => !p)} className="flex items-center">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-9 h-9 border-2 border-black object-cover" />
                      : <div className="w-9 h-9 border-2 border-black bg-[#FFD400] flex items-center justify-center font-black text-sm text-black">{profile.full_name?.[0]}</div>}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border-2 border-black z-50" style={{ boxShadow: "4px 4px 0 #000" }}>
                      <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-[#FFD400] border-b border-black"><User className="w-3.5 h-3.5" />Profile</Link>
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-[#FF6B6B] w-full"><LogOut className="w-3.5 h-3.5" />Sign out</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-0">
                  <Link href="/login" className="px-4 h-9 border-2 border-black text-xs font-black flex items-center hover:bg-[#FFD400] transition-colors">Sign in</Link>
                  <Link href="/register" className="px-4 h-9 border-l-0 border-2 border-black bg-black text-[#FFD400] text-xs font-black flex items-center hover:bg-stone-900 transition-colors">Join free</Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        {mobileNav && (
          <div className="md:hidden border-t-2 border-black flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileNav(false); }}
                className={`px-4 py-2.5 text-[10px] font-black tracking-wider whitespace-nowrap border-r-2 border-black last:border-r-0 transition-all ${activeTab === tab.id ? "bg-black text-[#FFD400]" : "bg-white text-black"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6">

        {/* ── HERO STATS ROW ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-x-2 border-b-2 border-black mb-8">
          {[
            { label: "Artworks",    val: artworks.length,    bg: "bg-white",       icon: ImageIcon  },
            { label: "Artists",     val: artists.length,     bg: "bg-[#FF6B6B]",   icon: Palette    },
            { label: "Venues",      val: venues.length,      bg: "bg-[#4ECDC4]",   icon: Building2  },
            { label: "Exhibitions", val: exhibitions.length, bg: "bg-black",       icon: Calendar   },
          ].map((s, i) => (
            <div key={s.label} className={`${s.bg} border-b-2 border-r-2 border-black last:border-r-0 p-5 flex items-center gap-3`}>
              <div className={`w-9 h-9 border-2 border-black flex items-center justify-center shrink-0 ${s.bg === "bg-black" ? "bg-[#FFD400]" : "bg-white"}`}>
                <s.icon className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${s.bg === "bg-black" ? "text-[#FFD400]" : "text-black"}`}>{loading ? "—" : s.val}</p>
                <p className={`text-[9px] font-black uppercase tracking-[0.15em] mt-0.5 ${s.bg === "bg-black" ? "text-[#FFD400]/50" : "text-black/40"}`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN LAYOUT: LEFT CONTENT + RIGHT PANEL ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* ── LEFT: carousels ─────────────────────────── */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="border-2 border-black bg-white px-8 py-4" style={{ boxShadow: "4px 4px 0 #000" }}>
                  <p className="font-black text-sm uppercase tracking-widest text-black animate-pulse">Loading...</p>
                </div>
              </div>
            ) : (
              <>
                {show("artworks") && fArt.length > 0 && (
                  <ScrollRow title="Top Picks" accent="bg-[#FF6B6B]">
                    {fArt.map((a, i) => <ArtworkCard key={a.id} a={a} idx={i} />)}
                  </ScrollRow>
                )}

                {show("artists") && fArtist.length > 0 && (
                  <>
                    <ScrollRow title="Top Portfolios" accent="bg-[#FFD400]">
                      {fArtist.map((a, i) => <ArtistCard key={a.id} a={a} idx={i} />)}
                    </ScrollRow>
                    {/* Directory buttons */}
                    <div className="grid grid-cols-2 gap-0 mb-10 border-2 border-black">
                      <Link href="/directory/artists"
                        className="flex items-center justify-between px-5 py-4 bg-black text-[#FFD400] border-r-2 border-black hover:bg-stone-900 transition-colors group">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#FFD400]/40 mb-0.5">Browse all</p>
                          <div className="flex items-center gap-2"><Palette className="w-4 h-4" /><span className="font-black text-sm">Artists Directory</span></div>
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link href="/directory/venues"
                        className="flex items-center justify-between px-5 py-4 bg-[#FFD400] text-black hover:bg-yellow-300 transition-colors group">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">Browse all</p>
                          <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /><span className="font-black text-sm">Venues Directory</span></div>
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </>
                )}

                {show("venues") && fVen.length > 0 && (
                  <ScrollRow title="Popular Venues" accent="bg-[#4ECDC4]">
                    {fVen.map((v, i) => <VenueCard key={v.id} v={v} idx={i} />)}
                  </ScrollRow>
                )}

                {show("exhibitions") && fExh.length > 0 && (
                  <ScrollRow title="Exhibitions" accent="bg-[#95E1D3]">
                    {fExh.map(e => <ExhibitionCard key={e.id} e={e} />)}
                  </ScrollRow>
                )}

                {show("collaborations") && fCol.length > 0 && (
                  <ScrollRow title="Open Collaborations" accent="bg-black">
                    {fCol.map((c, i) => <CollabCard key={c.id} c={c} idx={i} />)}
                  </ScrollRow>
                )}

                {/* Empty state */}
                {!loading && fArt.length === 0 && fArtist.length === 0 && fVen.length === 0 && fExh.length === 0 && fCol.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 border-4 border-black bg-[#FFD400] flex items-center justify-center mb-4">
                      <Star className="w-8 h-8 text-black" />
                    </div>
                    <p className="font-black text-black mb-2">{search ? "No results found" : "Nothing here yet"}</p>
                    <p className="text-sm font-bold text-black/50 mb-6">{search ? `Try a different search term` : "Be the first to join"}</p>
                    {!search && <Link href="/register" className="flex items-center gap-2 px-6 py-3 bg-black text-[#FFD400] border-2 border-black font-black text-sm hover:bg-stone-900 transition-colors">Join Artfolio <ArrowRight className="w-4 h-4" /></Link>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────── */}
          <div className="space-y-6">

            {/* CTA card (guest) / Dashboard card (logged in) */}
            {!profile && userLoaded && (
              <div className="border-2 border-black bg-black p-6">
                <div className="w-10 h-10 bg-[#FFD400] border-2 border-[#FFD400] flex items-center justify-center mb-4">
                  <Star className="w-5 h-5 text-black fill-black" />
                </div>
                <h3 className="font-black text-lg text-[#FFD400] leading-tight mb-2">Join the community</h3>
                <p className="text-xs font-bold text-white/50 leading-relaxed mb-5">Connect with artists and venues shaping the Iranian art scene.</p>
                <Link href="/register" className="flex items-center justify-center gap-2 py-3 bg-[#FFD400] border-2 border-[#FFD400] text-black font-black text-sm hover:bg-white transition-colors mb-2">
                  Join as Artist or Venue <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="flex items-center justify-center gap-2 py-3 border-2 border-white/20 text-white/60 font-black text-xs hover:border-white/40 transition-colors">
                  Already a member? Sign in
                </Link>
              </div>
            )}

            {profile && userLoaded && (
              <div className="border-2 border-black bg-white">
                <div className="border-b-2 border-black px-4 py-3 bg-[#FFD400] flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black">Your Account</span>
                  <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-wider text-black/60 hover:text-black flex items-center gap-1">
                    Dashboard <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-4 flex items-center gap-3 border-b border-black/10">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-10 h-10 border-2 border-black object-cover" />
                    : <div className="w-10 h-10 border-2 border-black bg-[#FFD400] flex items-center justify-center font-black text-black">{profile.full_name?.[0]}</div>}
                  <div>
                    <p className="font-black text-sm text-black">{profile.full_name}</p>
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Member</p>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {[
                    { href: "/dashboard/artworks/new", label: "Add Artwork", icon: ImageIcon },
                    { href: "/dashboard/pool",         label: "Discovery Pool", icon: Handshake },
                    { href: "/dashboard/feed",         label: "Post to Feed",  icon: MessageSquare },
                  ].map(item => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-black hover:bg-[#FFD400] transition-colors border border-transparent hover:border-black">
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                      <ArrowRight className="w-3 h-3 ml-auto opacity-30" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Community feed — right panel */}
            {activeTab === "all" && posts.length > 0 && (
              <div className="border-2 border-black bg-white">
                <div className="border-b-2 border-black px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-5 bg-[#95E1D3]" />
                    <span className="font-black text-xs uppercase tracking-widest text-black">Community</span>
                  </div>
                  <span className="text-[10px] font-bold text-black/30">{posts.length} posts</span>
                </div>
                <div>
                  {posts.map(p => <PostRow key={p.id} p={p} />)}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="border-2 border-black bg-white">
              <div className="border-b-2 border-black px-4 py-3">
                <span className="font-black text-xs uppercase tracking-widest text-black">Quick Links</span>
              </div>
              <div>
                {[
                  { href: "/register",          label: "Join as Artist",      icon: Palette   },
                  { href: "/register",          label: "Register a Venue",    icon: Building2 },
                  { href: "/directory/artists", label: "Artists Directory",   icon: Users     },
                  { href: "/directory/venues",  label: "Venues Directory",    icon: MapPin    },
                ].map((l, i, arr) => (
                  <Link key={l.href + l.label} href={l.href}
                    className={`flex items-center gap-3 px-4 py-3 text-xs font-bold text-black hover:bg-[#FFD400] transition-colors group ${i < arr.length - 1 ? "border-b border-black/10" : ""}`}>
                    <l.icon className="w-3.5 h-3.5 text-black/40 group-hover:text-black transition-colors shrink-0" />
                    {l.label}
                    <ArrowRight className="w-3 h-3 ml-auto text-black/20 group-hover:text-black" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── BOTTOM CTA ──────────────────────────────────── */}
        {!profile && (
          <div className="border-2 border-black bg-black mb-8 flex flex-col lg:flex-row items-stretch overflow-hidden">
            <div className="flex-1 p-8 lg:p-12">
              <h2 className="font-black text-3xl lg:text-4xl text-[#FFD400] leading-tight mb-3">Ready to showcase<br />your work?</h2>
              <p className="text-sm font-bold text-white/50 mb-6 max-w-sm">Join artists and venues building the Iranian art community on Artfolio.</p>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-7 py-3 bg-[#FFD400] text-black border-2 border-[#FFD400] font-black text-sm hover:bg-white transition-colors group">
                Get started free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            {/* Color grid */}
            <div className="grid grid-cols-3 w-full lg:w-48 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-[#FFD400]/20">
              {["bg-[#FF6B6B]","bg-[#FFD400]","bg-stone-900","bg-[#4ECDC4]","bg-stone-900","bg-[#FFD400]","bg-stone-900","bg-[#FF6B6B]","bg-[#4ECDC4]"].map((b,i) => (
                <div key={i} className={`${b} aspect-square border border-white/5`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
