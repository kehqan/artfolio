"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight, Image as ImageIcon, Building2, MessageSquare,
  LayoutGrid, Handshake, ChevronLeft, ChevronRight, MapPin,
  Palette, LayoutDashboard, LogOut, User
} from "lucide-react";

type Artwork  = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string; artist_username?: string };
type Venue    = { id: string; name: string; type: string; city?: string; logo_url?: string; cover_image_url?: string };
type Post     = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string };
type Exhibition = { id: string; title: string; venue?: string; start_date?: string; cover_image?: string; status: string };
type Collab   = { id: string; title: string; type?: string; partner_name?: string; status: string };
type Profile  = { full_name: string; avatar_url?: string } | null;

// ─── Carousel shell ─────────────────────────────────────────────
function Carousel({ title, icon: Icon, children, linkHref, linkLabel }: {
  title: string; icon: React.ElementType;
  children: React.ReactNode; linkHref?: string; linkLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => ref.current?.scrollBy({ left: dir === "l" ? -320 : 320, behavior: "smooth" });
  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-5 px-4 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-display text-xl font-semibold text-stone-900">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll("l")} className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors shadow-sm">
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
          <button onClick={() => scroll("r")} className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors shadow-sm">
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
          {linkHref && (
            <Link href={linkHref} className="ml-2 text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              {linkLabel || "See all"} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto px-4 md:px-10 pb-2" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </section>
  );
}

// ─── Cards ──────────────────────────────────────────────────────
function ArtworkCard({ a }: { a: Artwork }) {
  return (
    <div className="shrink-0 w-52 group">
      <div className="w-52 h-52 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        {a.images?.[0] ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-stone-300" /></div>}
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{a.title}</p>
      {a.artist_name && <p className="text-xs text-stone-500 truncate">{a.artist_name}</p>}
      {a.price && <p className="text-xs font-mono text-emerald-600 mt-0.5">${a.price.toLocaleString()}</p>}
    </div>
  );
}

function VenueCard({ v }: { v: Venue }) {
  return (
    <Link href={`/venue/${v.id}`} className="shrink-0 w-64 group block">
      <div className="w-64 h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow relative">
        {v.cover_image_url ? <img src={v.cover_image_url} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-10 h-10 text-stone-300" /></div>}
        {v.logo_url && <img src={v.logo_url} alt="" className="absolute bottom-3 left-3 w-10 h-10 rounded-xl object-cover border-2 border-white shadow" />}
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{v.name}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-xs text-stone-400 capitalize">{v.type}</span>
        {v.city && <><span className="text-stone-300">·</span><span className="text-xs text-stone-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{v.city}</span></>}
      </div>
    </Link>
  );
}

function PostCard({ p }: { p: Post }) {
  return (
    <div className="shrink-0 w-60 group">
      <div className="w-60 h-40 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 p-4">
              <p className="text-xs text-stone-500 line-clamp-5">{p.content}</p>
            </div>}
      </div>
      {p.profile_name && (
        <div className="flex items-center gap-2">
          {p.profile_avatar ? <img src={p.profile_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{p.profile_name[0]}</div>}
          <p className="text-xs font-medium text-stone-700 truncate">{p.profile_name}</p>
        </div>
      )}
    </div>
  );
}

function ExhibitionCard({ e }: { e: Exhibition }) {
  const statusColor = (s: string) => s?.toLowerCase() === "current" ? "bg-emerald-500" : s?.toLowerCase() === "upcoming" ? "bg-sky-500" : "bg-stone-300";
  return (
    <div className="shrink-0 w-56 group">
      <div className="w-56 h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow relative">
        {e.cover_image ? <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><LayoutGrid className="w-10 h-10 text-stone-300" /></div>}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white ${statusColor(e.status)}`}>{e.status}</span>
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{e.title}</p>
      {e.venue && <p className="text-xs text-stone-500 truncate">{e.venue}</p>}
      {e.start_date && <p className="text-xs text-stone-400 mt-0.5">{new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
    </div>
  );
}

function CollabCard({ c }: { c: Collab }) {
  return (
    <div className="shrink-0 w-56 group">
      <div className="w-56 h-28 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 mb-3 shadow-sm group-hover:shadow-md transition-shadow flex flex-col items-start justify-end p-4">
        {c.type && <span className="text-[10px] font-bold uppercase text-stone-400 mb-1">{c.type}</span>}
        <p className="font-semibold text-white text-sm line-clamp-2">{c.title}</p>
      </div>
      {c.partner_name && <p className="text-xs text-stone-500">With: {c.partner_name}</p>}
      <span className={`badge text-[10px] mt-1 ${c.status === "Open" ? "badge-available" : "badge-nfs"}`}>{c.status}</span>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────
export default function ExplorePage() {
  const [profile, setProfile] = useState<Profile>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Check if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
        setProfile(p);
      }
      setUserLoaded(true);

      // Load content (public, no auth needed)
      const [
        { data: rawArtworks }, { data: rawArtists },
        { data: rawVenues }, { data: rawPosts },
        { data: rawProfiles }, { data: rawExhibitions }, { data: rawCollabs }
      ] = await Promise.all([
        supabase.from("artworks").select("id, title, images, price, status, artist_id").eq("status", "Available").limit(20),
        supabase.from("artists").select("id, name, username").limit(200),
        supabase.from("venues").select("id, name, type, city, logo_url, cover_image_url").limit(12),
        supabase.from("posts").select("id, content, images, user_id").order("created_at", { ascending: false }).limit(12),
        supabase.from("profiles").select("id, full_name, avatar_url").limit(300),
        supabase.from("exhibitions").select("id, title, venue, start_date, cover_image, status").in("status", ["Current", "Upcoming", "current", "upcoming"]).limit(12),
        supabase.from("collaborations").select("id, title, type, partner_name, status").eq("status", "Open").limit(12),
      ]);

      const artistMap: Record<string, { name: string; username: string }> = {};
      for (const a of rawArtists || []) artistMap[a.id] = { name: a.name, username: a.username };
      const profileMap: Record<string, { name: string; avatar?: string }> = {};
      for (const p of rawProfiles || []) profileMap[p.id] = { name: p.full_name, avatar: p.avatar_url };

      setArtworks((rawArtworks || []).map((a) => ({
        id: a.id, title: a.title, images: a.images, price: a.price, status: a.status,
        artist_name: a.artist_id ? artistMap[a.artist_id]?.name : undefined,
        artist_username: a.artist_id ? artistMap[a.artist_id]?.username : undefined,
      })));
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
    <div className="min-h-screen bg-stone-50">
      {/* Smart header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center justify-between px-4 md:px-10 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-stone-900 text-lg">Artfolio</span>
          </Link>

          {userLoaded && (
            profile ? (
              // ── LOGGED IN ────────────────────────────────────────
              <div className="flex items-center gap-3 relative">
                <Link href="/dashboard" className="btn-ghost text-sm hidden sm:inline-flex">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={() => setMenuOpen((p) => !p)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-stone-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-white font-semibold text-sm">
                      {profile.full_name?.[0] || "A"}
                    </div>
                  )}
                  <span className="text-sm font-medium text-stone-700 hidden sm:block max-w-[120px] truncate">{profile.full_name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50">
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 w-full text-left">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // ── GUEST ────────────────────────────────────────────
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
                <Link href="/register" className="btn-primary text-sm py-2">Join free</Link>
              </div>
            )
          )}
        </div>
      </header>

      {/* Dark hero */}
      <div className="relative overflow-hidden bg-stone-900 text-white px-4 md:px-10 py-20 mb-12">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="grid grid-cols-6 h-full gap-1">
            {artworks.slice(0, 12).map((a) => a.images?.[0] && (
              <div key={a.id} className="overflow-hidden">
                <img src={a.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="relative max-w-xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
            Discover art. Connect spaces.
          </h1>
          <p className="text-stone-300 text-lg mb-8 max-w-md">
            Browse artworks from emerging artists, explore venues, and follow the community — all in one place.
          </p>
          {!profile && (
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
              Join as Artist or Venue <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {profile && (
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              <LayoutDashboard className="w-4 h-4" /> Go to your dashboard
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400">Loading...</div>
      ) : (
        <div className="pb-4">
          {artworks.length > 0 && (
            <Carousel title="Top Picks" icon={ImageIcon}>
              {artworks.map((a) => <ArtworkCard key={a.id} a={a} />)}
            </Carousel>
          )}
          {venues.length > 0 && (
            <Carousel title="Popular Venues" icon={Building2}>
              {venues.map((v) => <VenueCard key={v.id} v={v} />)}
            </Carousel>
          )}
          {posts.length > 0 && (
            <Carousel title="From the Community" icon={MessageSquare}>
              {posts.map((p) => <PostCard key={p.id} p={p} />)}
            </Carousel>
          )}
          {exhibitions.length > 0 && (
            <Carousel title="Upcoming & Current Exhibitions" icon={LayoutGrid}>
              {exhibitions.map((e) => <ExhibitionCard key={e.id} e={e} />)}
            </Carousel>
          )}
          {collabs.length > 0 && (
            <Carousel title="Open Collaborations" icon={Handshake}>
              {collabs.map((c) => <CollabCard key={c.id} c={c} />)}
            </Carousel>
          )}

          {!profile && (
            <div className="mx-4 md:mx-10 mt-8 mb-12 rounded-3xl bg-stone-900 text-white px-8 py-12 text-center">
              <h2 className="font-display text-3xl font-bold mb-3">Ready to share your work?</h2>
              <p className="text-stone-400 mb-6 max-w-md mx-auto">Join artists and venues already using Artfolio to connect and grow.</p>
              <Link href="/register" className="btn-accent px-8 py-3 text-base inline-flex items-center gap-2">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
