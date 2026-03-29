"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Square, MapPin, MessageSquare,
  Calendar, Users, ArrowRight, Palette, LayoutDashboard,
  LogOut, User
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type Artwork = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string };
type Venue   = { id: string; name: string; type: string; city?: string; logo_url?: string; cover_image_url?: string };
type Post    = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string };
type Exhibition = { id: string; title: string; venue?: string; start_date?: string; cover_image?: string; status: string };
type Collab  = { id: string; title: string; type?: string; partner_name?: string; status: string };
type Profile = { full_name: string; avatar_url?: string } | null;

const TABS = ["Artworks", "Artists", "Venues", "Exhibitions", "Collaborations"];

// ── Carousel wrapper ──────────────────────────────────────────────
function Carousel({ title, icon: Icon, accentColor, children }: {
  title: string; icon: React.ElementType; accentColor: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => ref.current?.scrollBy({ left: dir === "l" ? -320 : 320, behavior: "smooth" });
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${accentColor} border-4 border-black w-10 h-10 flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-black">{title}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => scroll("l")}
            className="w-9 h-9 border-4 border-black bg-white flex items-center justify-center hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
          </button>
          <button onClick={() => scroll("r")}
            className="w-9 h-9 border-4 border-black bg-white flex items-center justify-center hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <ChevronRight className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
      </div>
      {/* Scrollable row */}
      <div ref={ref} className="flex gap-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────
function ArtworkCard({ a }: { a: Artwork }) {
  return (
    <div className="shrink-0 w-52 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 group">
      <div className="w-full h-52 bg-stone-100 overflow-hidden border-b-4 border-black">
        {a.images?.[0]
          ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Square className="w-10 h-10 text-stone-300" /></div>}
      </div>
      <div className="p-3">
        <p className="font-black text-black text-sm truncate leading-tight">{a.title}</p>
        {a.artist_name && <p className="text-xs text-black/60 font-medium truncate mt-0.5">{a.artist_name}</p>}
        <div className="flex items-center justify-between mt-2">
          {a.status?.toLowerCase() === "available"
            ? <span className="px-2 py-0.5 bg-[#FFD400] border-2 border-black text-[10px] font-black uppercase">Available</span>
            : <span className="px-2 py-0.5 bg-black text-[#FFD400] border-2 border-black text-[10px] font-black uppercase">Sold</span>}
          {a.price && <span className="text-xs font-black font-mono">${a.price.toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

function VenueCard({ v }: { v: Venue }) {
  return (
    <Link href={`/venue/${v.id}`} className="shrink-0 w-64 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 block group">
      <div className="w-full h-36 bg-stone-100 overflow-hidden border-b-4 border-black relative">
        {v.cover_image_url
          ? <img src={v.cover_image_url} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-10 h-10 text-stone-300" /></div>}
        {v.logo_url && (
          <img src={v.logo_url} alt="" className="absolute bottom-2 left-3 w-10 h-10 border-2 border-black object-cover bg-white" />
        )}
      </div>
      <div className="p-3">
        <p className="font-black text-black text-sm truncate">{v.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-black uppercase text-black/50 tracking-wider capitalize">{v.type}</span>
          {v.city && <><span className="text-black/30">·</span><span className="text-[10px] font-bold text-black/50 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{v.city}</span></>}
        </div>
      </div>
    </Link>
  );
}

function PostCard({ p }: { p: Post }) {
  return (
    <div className="shrink-0 w-60 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 group">
      <div className="w-full h-40 bg-stone-100 overflow-hidden border-b-4 border-black">
        {p.images?.[0]
          ? <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-stone-50 p-4">
              <p className="text-xs text-black/60 font-medium line-clamp-5 leading-relaxed">{p.content}</p>
            </div>}
      </div>
      {p.profile_name && (
        <div className="p-3 flex items-center gap-2">
          {p.profile_avatar
            ? <img src={p.profile_avatar} alt="" className="w-7 h-7 border-2 border-black object-cover" />
            : <div className="w-7 h-7 border-2 border-black bg-[#FFD400] flex items-center justify-center text-xs font-black">{p.profile_name[0]}</div>}
          <span className="text-xs font-bold text-black truncate">{p.profile_name}</span>
        </div>
      )}
    </div>
  );
}

function ExhibitionCard({ e }: { e: Exhibition }) {
  const isCurrent = e.status?.toLowerCase() === "current";
  return (
    <div className="shrink-0 w-56 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 group">
      <div className="w-full h-36 bg-stone-100 overflow-hidden border-b-4 border-black relative">
        {e.cover_image
          ? <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Calendar className="w-10 h-10 text-stone-300" /></div>}
        <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black ${isCurrent ? "bg-[#FFD400] text-black" : "bg-[#4ECDC4] text-black"}`}>
          {e.status}
        </span>
      </div>
      <div className="p-3">
        <p className="font-black text-black text-sm truncate leading-tight">{e.title}</p>
        {e.venue && <p className="text-xs text-black/60 font-medium truncate mt-0.5">{e.venue}</p>}
        {e.start_date && <p className="text-[10px] text-black/40 font-bold mt-1">{new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
      </div>
    </div>
  );
}

function CollabCard({ c }: { c: Collab }) {
  return (
    <div className="shrink-0 w-56 bg-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col justify-between min-h-[140px]">
      <div>
        {c.type && <span className="px-2 py-0.5 bg-[#FFD400] text-black text-[10px] font-black uppercase border border-[#FFD400] inline-block mb-3">{c.type}</span>}
        <p className="font-black text-white text-sm leading-snug line-clamp-2">{c.title}</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {c.partner_name && <p className="text-[10px] text-white/50 font-bold truncate">With: {c.partner_name}</p>}
        <span className="px-2 py-0.5 bg-[#FFD400] text-black text-[10px] font-black uppercase ml-auto">{c.status}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState("Artworks");
  const [profile, setProfile] = useState<Profile>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
        setProfile(p);
      }
      setUserLoaded(true);

      // Content
      const [
        { data: rawArtworks }, { data: rawArtists },
        { data: rawVenues }, { data: rawPosts },
        { data: rawProfiles }, { data: rawExhibitions }, { data: rawCollabs }
      ] = await Promise.all([
        supabase.from("artworks").select("id, title, images, price, status, artist_id").eq("status", "Available").limit(20),
        supabase.from("artists").select("id, name").limit(200),
        supabase.from("venues").select("id, name, type, city, logo_url, cover_image_url").limit(12),
        supabase.from("posts").select("id, content, images, user_id").order("created_at", { ascending: false }).limit(12),
        supabase.from("profiles").select("id, full_name, avatar_url").limit(300),
        supabase.from("exhibitions").select("id, title, venue, start_date, cover_image, status").in("status", ["Current", "Upcoming", "current", "upcoming"]).limit(12),
        supabase.from("collaborations").select("id, title, type, partner_name, status").eq("status", "Open").limit(12),
      ]);

      const artistMap: Record<string, string> = {};
      for (const a of rawArtists || []) artistMap[a.id] = a.name;
      const profileMap: Record<string, { name: string; avatar?: string }> = {};
      for (const p of rawProfiles || []) profileMap[p.id] = { name: p.full_name, avatar: p.avatar_url };

      setArtworks((rawArtworks || []).map((a) => ({ id: a.id, title: a.title, images: a.images, price: a.price, status: a.status, artist_name: a.artist_id ? artistMap[a.artist_id] : undefined })));
      setVenues((rawVenues || []).map((v) => ({ id: v.id, name: v.name, type: v.type, city: v.city, logo_url: v.logo_url, cover_image_url: v.cover_image_url })));
      setPosts((rawPosts || []).map((p) => ({ id: p.id, content: p.content, images: p.images, profile_name: profileMap[p.user_id]?.name, profile_avatar: profileMap[p.user_id]?.avatar })));
      setExhibitions((rawExhibitions || []).map((e) => ({ id: e.id, title: e.title, venue: e.venue, start_date: e.start_date, cover_image: e.cover_image, status: e.status })));
      setCollabs((rawCollabs || []).map((c) => ({ id: c.id, title: c.title, type: c.type, partner_name: c.partner_name, status: c.status })));
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#FFD400] relative">

      {/* ── Sticky Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FFD400] border-b-4 border-black py-4">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="text-2xl font-black tracking-tight text-black shrink-0">Artfolio</Link>

          {/* Tabs */}
          <nav className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-black border-4 border-black whitespace-nowrap transition-all ${
                  activeTab === tab ? "bg-black text-[#FFD400]" : "bg-white text-black hover:translate-x-[2px] hover:translate-y-[2px]"
                }`}>
                {tab}
              </button>
            ))}
          </nav>

          {/* Auth */}
          {userLoaded && (
            profile ? (
              <div className="flex items-center gap-3 relative shrink-0">
                <Link href="/dashboard" className="text-sm font-bold text-black hover:opacity-70 hidden sm:block">Dashboard</Link>
                <button onClick={() => setMenuOpen((p) => !p)} className="flex items-center gap-2">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-10 h-10 border-4 border-black object-cover" />
                    : <div className="w-10 h-10 border-4 border-black bg-black flex items-center justify-center text-[#FFD400] font-black text-sm">{profile.full_name?.[0]}</div>}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-black hover:bg-[#FFD400] transition-colors"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
                    <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-black hover:bg-[#FFD400] transition-colors"><User className="w-4 h-4" /> Profile</Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-black hover:bg-red-100 w-full border-t-2 border-black"><LogOut className="w-4 h-4" /> Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/login" className="text-sm font-black underline text-black">Sign in</Link>
                <Link href="/register" className="px-5 py-2 bg-black text-[#FFD400] border-4 border-black font-black text-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                  Join free
                </Link>
              </div>
            )
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="max-w-[1400px] mx-auto px-6 py-16">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-3xl mb-8 relative">
          <h1 className="text-5xl font-black text-black mb-4 leading-tight">
            Discover art.<br />Connect spaces.
          </h1>
          <p className="text-lg font-medium text-black/70">
            Browse artworks from emerging artists, explore venues, and follow the community.
          </p>
          {/* Speech bubble tail */}
          <div className="absolute -bottom-6 left-12 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[24px] border-t-white" />
          <div className="absolute -bottom-[34px] left-[50px] w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[24px] border-t-black" />
        </div>

        {!profile && (
          <div className="mt-10">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-black text-[#FFD400] border-4 border-black font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              Join as Artist or Venue →
            </Link>
          </div>
        )}
        {profile && (
          <div className="mt-10">
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3 bg-black text-[#FFD400] border-4 border-black font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              <LayoutDashboard className="w-5 h-5" /> Go to your dashboard
            </Link>
          </div>
        )}
      </section>

      {/* ── Carousels ──────────────────────────────────────── */}
      <section className="max-w-[1400px] mx-auto px-6 pb-16 space-y-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="bg-white border-4 border-black px-8 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-black">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {artworks.length > 0 && (
              <Carousel title="TOP PICKS" icon={Square} accentColor="bg-[#FF6B6B]">
                {artworks.map((a) => <ArtworkCard key={a.id} a={a} />)}
              </Carousel>
            )}
            {venues.length > 0 && (
              <Carousel title="POPULAR VENUES" icon={MapPin} accentColor="bg-[#4ECDC4]">
                {venues.map((v) => <VenueCard key={v.id} v={v} />)}
              </Carousel>
            )}
            {posts.length > 0 && (
              <Carousel title="FROM THE COMMUNITY" icon={MessageSquare} accentColor="bg-[#95E1D3]">
                {posts.map((p) => <PostCard key={p.id} p={p} />)}
              </Carousel>
            )}
            {exhibitions.length > 0 && (
              <Carousel title="UPCOMING & CURRENT EXHIBITIONS" icon={Calendar} accentColor="bg-[#4ECDC4]">
                {exhibitions.map((e) => <ExhibitionCard key={e.id} e={e} />)}
              </Carousel>
            )}
            {collabs.length > 0 && (
              <Carousel title="OPEN COLLABORATIONS" icon={Users} accentColor="bg-[#FFD400] border-4 border-black">
                {collabs.map((c) => <CollabCard key={c.id} c={c} />)}
              </Carousel>
            )}
          </>
        )}
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      <section className="max-w-[1400px] mx-auto px-6 py-24">
        <div className="bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
          <h2 className="text-4xl font-black text-[#FFD400] mb-4">Ready to showcase your work?</h2>
          <p className="text-xl text-white mb-8 font-medium">Join artists and venues on Artfolio</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#FFD400] text-black border-4 border-white font-black text-lg hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Decorative */}
      <div className="absolute top-20 right-20 text-6xl opacity-20 rotate-12 select-none pointer-events-none">★</div>
      <div className="absolute bottom-32 left-16 text-5xl opacity-20 -rotate-12 select-none pointer-events-none">✦</div>
      <div className="absolute top-1/3 left-10 w-32 h-32 border-4 border-black/10 rotate-45 pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-black/10 rounded-full pointer-events-none" />
    </div>
  );
}
