"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight, Search, ImageIcon, MapPin, ChevronDown,
  Palette, Building2, Users, Calendar, Handshake,
  Send, Trash2, X, Heart, MessageCircle, Share2,
  UserPlus, UserCheck, LayoutDashboard, LogOut, User,
  Menu,
} from "lucide-react";

type Profile = { full_name: string; avatar_url?: string; username?: string } | null;
type Artwork = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string; medium?: string };
type Artist  = { id: string; name: string; username?: string; city?: string; avatar_url?: string; medium?: string };
type Venue   = { id: string; name: string; type: string; city?: string; logo_url?: string };
type Post    = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string; created_at?: string; user_id?: string };

function timeAgo(d?: string) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function HomePage() {
  const [profile, setProfile]         = useState<Profile>(null);
  const [userLoaded, setUserLoaded]   = useState(false);
  const [userId, setUserId]           = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [tab, setTab]                 = useState<"feed" | "artworks" | "artists" | "venues">("feed");
  const [menuOpen, setMenuOpen]       = useState(false);
  const [mobileNav, setMobileNav]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [artworks, setArtworks]       = useState<Artwork[]>([]);
  const [artists, setArtists]         = useState<Artist[]>([]);
  const [venues, setVenues]           = useState<Venue[]>([]);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [newPost, setNewPost]         = useState("");
  const [posting, setPosting]         = useState(false);
  const [following, setFollowing]     = useState<Set<string>>(new Set());
  const exploreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", user.id).single();
        setProfile(p);
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        setFollowing(new Set(follows?.map(f => f.following_id) || []));
      }
      setUserLoaded(true);

      const [{ data: rawAw }, { data: rawAr }, { data: rawVe }, { data: rawPo }, { data: rawPr }] = await Promise.all([
        supabase.from("artworks").select("id,title,images,price,status,user_id,medium").eq("status","Available").order("created_at",{ascending:false}).limit(20),
        supabase.from("profiles").select("id,full_name,username,location,avatar_url,role").eq("role","artist").limit(16),
        supabase.from("venues").select("id,name,type,city,logo_url").limit(12),
        supabase.from("posts").select("id,content,images,user_id,created_at").order("created_at",{ascending:false}).limit(20),
        supabase.from("profiles").select("id,full_name,avatar_url,username").limit(300),
      ]);

      const pm: Record<string,{name:string;avatar?:string;username?:string}> = {};
      for (const p of rawPr||[]) pm[p.id] = {name:p.full_name, avatar:p.avatar_url, username:p.username};

      setArtworks((rawAw||[]).map(a => ({
        id:a.id, title:a.title, images:a.images, price:a.price,
        status:a.status, medium:a.medium,
        artist_name: pm[a.user_id]?.name,
      })));
      setArtists((rawAr||[]).map(a => ({
        id:a.id, name:a.full_name, username:a.username,
        city:a.location, avatar_url:a.avatar_url, medium:a.role,
      })));
      setVenues((rawVe||[]).map(v => ({id:v.id,name:v.name,type:v.type,city:v.city,logo_url:v.logo_url})));
      setPosts((rawPo||[]).map(p => ({
        id:p.id, content:p.content, images:p.images,
        user_id:p.user_id, created_at:p.created_at,
        profile_name:pm[p.user_id]?.name,
        profile_avatar:pm[p.user_id]?.avatar,
      })));
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null); setMenuOpen(false);
    window.location.reload();
  }

  async function submitPost() {
    if (!newPost.trim() || !userId) return;
    setPosting(true);
    const supabase = createClient();
    await supabase.from("posts").insert({ user_id: userId, content: newPost });
    setNewPost("");
    // Reload posts
    const { data: rawPo } = await supabase.from("posts").select("id,content,images,user_id,created_at").order("created_at",{ascending:false}).limit(20);
    const { data: rawPr } = await supabase.from("profiles").select("id,full_name,avatar_url").limit(300);
    const pm: Record<string,{name:string;avatar?:string}> = {};
    for (const p of rawPr||[]) pm[p.id]={name:p.full_name,avatar:p.avatar_url};
    setPosts((rawPo||[]).map(p=>({id:p.id,content:p.content,images:p.images,user_id:p.user_id,created_at:p.created_at,profile_name:pm[p.user_id]?.name,profile_avatar:pm[p.user_id]?.avatar})));
    setPosting(false);
  }

  async function toggleFollow(targetId: string) {
    if (!userId) return;
    const supabase = createClient();
    if (following.has(targetId)) {
      await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
      setFollowing(p => { const n = new Set(p); n.delete(targetId); return n; });
    } else {
      await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
      setFollowing(p => new Set([...Array.from(p), targetId]));
    }
  }

  const fArt = artworks.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()));
  const fArtist = artists.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()));
  const fVen = venues.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()));

  const initial = profile?.full_name?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#FFFBEA]">

      {/* ── STICKY HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
        <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-3">

          {/* Logo */}
          <Link href="/" className="font-black text-xl text-black tracking-tight shrink-0 flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FFD400] border-2 border-black flex items-center justify-center">
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
            {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-black/40" /></button>}
          </div>

          {/* Tabs — desktop */}
          <nav className="hidden lg:flex items-center border-2 border-black overflow-hidden shrink-0">
            {(["feed","artworks","artists","venues"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); exploreRef.current?.scrollIntoView({behavior:"smooth"}); }}
                className={`px-4 h-9 text-[11px] font-black tracking-wider border-r-2 border-black last:border-r-0 capitalize transition-all ${tab === t ? "bg-black text-[#FFD400]" : "bg-white text-black hover:bg-[#FFD400]"}`}>
                {t}
              </button>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setMobileNav(p=>!p)} className="lg:hidden w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-[#FFD400]">
              <Menu className="w-4 h-4" />
            </button>

            {userLoaded && (
              profile ? (
                <div className="relative flex items-center gap-2">
                  <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 h-9 border-2 border-black text-xs font-black hover:bg-[#FFD400] transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </Link>
                  <button onClick={() => setMenuOpen(p=>!p)}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-9 h-9 border-2 border-black object-cover" />
                      : <div className="w-9 h-9 border-2 border-black bg-[#FFD400] flex items-center justify-center font-black text-sm">{initial}</div>}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border-2 border-black z-50 shadow-[4px_4px_0_#000]">
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-[#FFD400] border-b border-black">
                        <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                      </Link>
                      <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-[#FFD400] border-b border-black">
                        <User className="w-3.5 h-3.5" /> Profile
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-[#FF6B6B] w-full">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <Link href="/login" className="px-4 h-9 border-2 border-black text-xs font-black flex items-center hover:bg-[#FFD400]">Sign in</Link>
                  <Link href="/register" className="px-4 h-9 border-l-0 border-2 border-black bg-black text-[#FFD400] text-xs font-black flex items-center hover:bg-stone-900">Join free</Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        {mobileNav && (
          <div className="lg:hidden border-t-2 border-black flex overflow-x-auto" style={{scrollbarWidth:"none"}}>
            {(["feed","artworks","artists","venues"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setMobileNav(false); exploreRef.current?.scrollIntoView({behavior:"smooth"}); }}
                className={`px-4 py-2.5 text-[10px] font-black tracking-wider whitespace-nowrap border-r-2 border-black last:border-r-0 capitalize ${tab === t ? "bg-black text-[#FFD400]" : "bg-white text-black"}`}>
                {t}
              </button>
            ))}
            {profile && (
              <Link href="/dashboard" className="px-4 py-2.5 text-[10px] font-black whitespace-nowrap border-r-2 border-black text-black">
                Dashboard
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#FFD400] border-b-4 border-black">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:"radial-gradient(circle, black 1px, transparent 1px)",backgroundSize:"10px 10px"}} />

        <div className="relative max-w-4xl mx-auto px-6 py-16 lg:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-black text-[#FFD400] px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase mb-6">
            <span>Art · Community · Discovery</span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="inline-block border-4 border-black bg-white px-6 py-3 shadow-[6px_6px_0_#000]">
              <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tight leading-none">artist</h1>
            </div>
            <div className="block">
              <div className="inline-block border-4 border-black bg-white px-6 py-3 shadow-[6px_6px_0_#000]">
                <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tight leading-none">+ venue</h1>
              </div>
            </div>
          </div>

          <p className="text-black font-semibold max-w-md mx-auto mb-8 leading-relaxed">
            Where local artists meet venues. Showcase work. Fill walls. Build community.
          </p>

          {userLoaded && (
            profile ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/dashboard" className="inline-flex items-center gap-2 bg-black text-[#FFD400] border-2 border-black px-6 py-3 font-black text-sm hover:bg-stone-900 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
                  <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                </Link>
                <button onClick={() => exploreRef.current?.scrollIntoView({behavior:"smooth"})}
                  className="inline-flex items-center gap-2 bg-white text-black border-2 border-black px-6 py-3 font-black text-sm hover:bg-stone-100 transition-colors">
                  Explore Community <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/register" className="inline-flex items-center gap-2 bg-black text-[#FFD400] border-2 border-black px-6 py-3 font-black text-sm hover:bg-stone-900 transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.3)] group">
                  Join free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 bg-white text-black border-2 border-black px-6 py-3 font-black text-sm hover:bg-stone-50 transition-colors">
                  Sign in
                </Link>
                <button onClick={() => exploreRef.current?.scrollIntoView({behavior:"smooth"})}
                  className="inline-flex items-center gap-2 text-black/70 font-bold text-sm hover:text-black">
                  Browse first <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )
          )}

          {/* Scroll indicator */}
          <div className="mt-10 flex justify-center">
            <button onClick={() => exploreRef.current?.scrollIntoView({behavior:"smooth"})}
              className="flex flex-col items-center gap-1 text-black/40 hover:text-black transition-colors animate-bounce">
              <span className="text-[10px] font-black tracking-widest uppercase">Explore</span>
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── EXPLORE + FEED (merged) ────────────────────────────── */}
      <div ref={exploreRef} className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black mb-8">
          {[
            { label: "Artworks",  val: artworks.length, bg: "bg-white",     icon: ImageIcon  },
            { label: "Artists",   val: artists.length,  bg: "bg-[#FF6B6B]", icon: Palette    },
            { label: "Venues",    val: venues.length,   bg: "bg-[#4ECDC4]", icon: Building2  },
            { label: "Posts",     val: posts.length,    bg: "bg-black",     icon: MessageCircle },
          ].map((s, i) => (
            <div key={s.label} className={`${s.bg} border-r-2 border-black last:border-r-0 p-4 flex items-center gap-3`}>
              <div className={`w-8 h-8 border-2 border-black flex items-center justify-center shrink-0 ${s.bg === "bg-black" ? "bg-[#FFD400]" : "bg-white"}`}>
                <s.icon className="w-3.5 h-3.5 text-black" />
              </div>
              <div>
                <p className={`text-xl font-black leading-none ${s.bg === "bg-black" ? "text-[#FFD400]" : "text-black"}`}>{loading ? "—" : s.val}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${s.bg === "bg-black" ? "text-[#FFD400]/50" : "text-black/40"}`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: main content ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab content */}
            {tab === "feed" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-[#FF6B6B]" />
                    <h2 className="font-black text-sm uppercase tracking-widest">Community Feed</h2>
                  </div>
                  {!profile && (
                    <Link href="/register" className="text-[10px] font-black uppercase tracking-wider border-2 border-black px-3 py-1 hover:bg-[#FFD400] transition-colors">
                      Join to Post
                    </Link>
                  )}
                </div>

                {/* Compose — only for logged in */}
                {profile && (
                  <div className="border-2 border-black bg-white">
                    <div className="flex items-start gap-3 p-4">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-9 h-9 border-2 border-black object-cover shrink-0" />
                        : <div className="w-9 h-9 bg-[#FFD400] border-2 border-black flex items-center justify-center font-black shrink-0">{initial}</div>}
                      <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                        placeholder="Share an update, studio shot, or work in progress…"
                        rows={2}
                        className="flex-1 text-sm font-medium text-black bg-transparent outline-none resize-none placeholder:text-black/30" />
                    </div>
                    <div className="flex items-center justify-end gap-2 px-4 pb-3 border-t border-black/10 pt-2">
                      <button onClick={submitPost} disabled={posting || !newPost.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-[#FFD400] border-2 border-black font-black text-xs hover:bg-stone-900 disabled:opacity-40 transition-colors">
                        <Send className="w-3.5 h-3.5" /> {posting ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Posts */}
                {loading ? (
                  <div className="border-2 border-black bg-white p-12 text-center font-black text-black/30 text-sm animate-pulse">Loading feed…</div>
                ) : posts.length === 0 ? (
                  <div className="border-2 border-black bg-white p-16 text-center">
                    <p className="font-black text-black mb-2">No posts yet</p>
                    {!profile && <Link href="/register" className="text-[10px] font-black uppercase border-2 border-black px-3 py-1 hover:bg-[#FFD400]">Be the first →</Link>}
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className="border-2 border-black bg-white hover:shadow-[4px_4px_0_#111110] transition-shadow">
                      {/* Post header */}
                      <div className="flex items-center gap-3 p-4 border-b border-black/10">
                        {post.profile_avatar
                          ? <img src={post.profile_avatar} alt="" className="w-9 h-9 border-2 border-black object-cover shrink-0" />
                          : <div className="w-9 h-9 bg-[#FFD400] border-2 border-black flex items-center justify-center font-black text-sm shrink-0">{post.profile_name?.[0] || "?"}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-black truncate">{post.profile_name || "Artist"}</p>
                          <p className="text-[10px] font-bold text-black/30">{timeAgo(post.created_at)}</p>
                        </div>
                        {userId === post.user_id && (
                          <button className="text-black/20 hover:text-black/60 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      {/* Content */}
                      {post.content && (
                        <div className="px-4 py-3 text-sm font-medium text-black/80 leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </div>
                      )}
                      {/* Images */}
                      {post.images && post.images.length > 0 && (
                        <div className={`grid gap-0.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                          {post.images.slice(0, 4).map((img, i) => (
                            <img key={i} src={img} alt="" className={`w-full object-cover ${post.images!.length === 1 ? "aspect-video" : "aspect-square"}`} />
                          ))}
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-black/10">
                        <button className="flex items-center gap-1.5 text-[11px] font-black text-black/40 hover:text-[#FF6B6B] transition-colors">
                          <Heart className="w-3.5 h-3.5" /> Like
                        </button>
                        <button className="flex items-center gap-1.5 text-[11px] font-black text-black/40 hover:text-black transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" /> Comment
                        </button>
                        <button className="flex items-center gap-1.5 text-[11px] font-black text-black/40 hover:text-black transition-colors ml-auto">
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "artworks" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-6 bg-[#FF6B6B]" />
                  <h2 className="font-black text-sm uppercase tracking-widest">Available Works</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fArt.map((a, i) => {
                    const bgs = ["bg-white","bg-[#FFF3C4]","bg-white","bg-black"];
                    const txs = ["text-black","text-black","text-black","text-white"];
                    return (
                      <div key={a.id} className={`${bgs[i%4]} border-2 border-black group hover:-translate-y-1 transition-transform`}>
                        <div className="aspect-square bg-stone-100 overflow-hidden border-b-2 border-black relative">
                          {a.images?.[0]
                            ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
                          <div className={`absolute top-0 left-0 px-2 py-0.5 text-[9px] font-black uppercase border-b-2 border-r-2 border-black bg-[#FFD400] text-black`}>
                            {a.status}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className={`font-black text-xs leading-tight truncate ${txs[i%4]}`}>{a.title}</p>
                          {a.artist_name && <p className={`text-[10px] font-bold opacity-50 truncate ${txs[i%4]}`}>{a.artist_name}</p>}
                          {a.price && <p className={`text-xs font-black mt-1 font-mono ${txs[i%4]}`}>${a.price.toLocaleString()}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "artists" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-[#FFD400]" />
                    <h2 className="font-black text-sm uppercase tracking-widest">Artists</h2>
                  </div>
                  <Link href="/directory/artists" className="text-[10px] font-black uppercase tracking-wider border-2 border-black px-3 py-1 hover:bg-[#FFD400]">
                    All Artists →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fArtist.map((a, i) => {
                    const acs = ["bg-[#FF6B6B]","bg-[#4ECDC4]","bg-[#FFD400]","bg-[#95E1D3]"];
                    return (
                      <Link key={a.id} href={a.username ? `/profile/${a.username}` : "#"}
                        className="border-2 border-black bg-white group hover:-translate-y-1 transition-transform block">
                        <div className={`${acs[i%4]} border-b-2 border-black h-28 flex items-center justify-center overflow-hidden`}>
                          {a.avatar_url
                            ? <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover" />
                            : <span className="text-3xl font-black text-black">{a.name?.[0]}</span>}
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-xs text-black truncate">{a.name}</p>
                            {a.city && <p className="text-[9px] font-bold text-black/40 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5"/>{a.city}</p>}
                          </div>
                          {userId && userId !== a.id && (
                            <button onClick={e => { e.preventDefault(); toggleFollow(a.id); }}
                              className={`w-7 h-7 border-2 border-black flex items-center justify-center shrink-0 transition-colors ${following.has(a.id) ? "bg-black" : "bg-white hover:bg-[#FFD400]"}`}>
                              {following.has(a.id)
                                ? <UserCheck className="w-3.5 h-3.5 text-[#FFD400]" />
                                : <UserPlus className="w-3.5 h-3.5 text-black" />}
                            </button>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "venues" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-[#4ECDC4]" />
                    <h2 className="font-black text-sm uppercase tracking-widest">Venues</h2>
                  </div>
                  <Link href="/directory/venues" className="text-[10px] font-black uppercase tracking-wider border-2 border-black px-3 py-1 hover:bg-[#FFD400]">
                    All Venues →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fVen.map(v => (
                    <Link key={v.id} href={`/venue/${v.id}`}
                      className="border-2 border-black bg-white flex items-center gap-4 p-4 hover:-translate-y-0.5 transition-transform group">
                      {v.logo_url
                        ? <img src={v.logo_url} alt="" className="w-12 h-12 border-2 border-black object-cover shrink-0" />
                        : <div className="w-12 h-12 border-2 border-black bg-[#4ECDC4] flex items-center justify-center shrink-0 font-black text-lg">{v.name?.[0]}</div>}
                      <div className="min-w-0">
                        <p className="font-black text-sm text-black truncate">{v.name}</p>
                        <p className="text-[10px] font-bold text-black/40 uppercase">{v.type}</p>
                        {v.city && <p className="text-[9px] text-black/40 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5"/>{v.city}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ──────────────────────────────── */}
          <div className="space-y-5">

            {/* CTA or quick actions */}
            {!profile && userLoaded ? (
              <div className="border-2 border-black bg-black p-6">
                <div className="w-10 h-10 bg-[#FFD400] border-2 border-[#FFD400] flex items-center justify-center mb-4">
                  <Palette className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-black text-lg text-[#FFD400] mb-2 leading-tight">Join the community</h3>
                <p className="text-xs font-bold text-white/40 leading-relaxed mb-5">Connect with artists and venues shaping the art scene.</p>
                <Link href="/register" className="flex items-center justify-center gap-2 py-3 bg-[#FFD400] border-2 border-[#FFD400] text-black font-black text-sm hover:bg-white transition-colors mb-2">
                  Join as Artist or Venue <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="flex items-center justify-center gap-2 py-2.5 border-2 border-white/20 text-white/50 font-black text-xs hover:border-white/40">
                  Already a member? Sign in
                </Link>
              </div>
            ) : profile && (
              <div className="border-2 border-black bg-white">
                <div className="border-b-2 border-black px-4 py-3 bg-[#FFD400] flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest">Quick Actions</span>
                </div>
                <div className="p-3 space-y-1">
                  {[
                    { href: "/dashboard/artworks/new", label: "Add Artwork",     icon: ImageIcon  },
                    { href: "/dashboard/feed",         label: "Post to Feed",    icon: Send       },
                    { href: "/dashboard/pool",         label: "Discovery Pool",  icon: Handshake  },
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

            {/* Directory links */}
            <div className="border-2 border-black bg-white">
              <div className="border-b-2 border-black px-4 py-3">
                <span className="font-black text-xs uppercase tracking-widest">Directories</span>
              </div>
              <Link href="/directory/artists" className="flex items-center justify-between px-4 py-3.5 border-b-2 border-black bg-black text-[#FFD400] hover:bg-stone-900 transition-colors group">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">Browse all</p>
                    <p className="font-black text-sm">Artists Directory</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/directory/venues" className="flex items-center justify-between px-4 py-3.5 bg-[#FFD400] hover:bg-yellow-300 transition-colors group">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-black" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">Browse all</p>
                    <p className="font-black text-sm text-black">Venues Directory</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Recent artists preview */}
            {artists.slice(0,4).length > 0 && (
              <div className="border-2 border-black bg-white">
                <div className="border-b-2 border-black px-4 py-3 flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest">Artists</span>
                  <Link href="/directory/artists" className="text-[10px] font-black text-black/40 hover:text-black">All →</Link>
                </div>
                {artists.slice(0,4).map((a,i) => (
                  <Link key={a.id} href={a.username ? `/profile/${a.username}` : "#"}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-black/10 last:border-b-0 hover:bg-[#FFFBEA] transition-colors">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" className="w-8 h-8 border-2 border-black object-cover shrink-0" />
                      : <div className={`w-8 h-8 border-2 border-black flex items-center justify-center font-black text-xs shrink-0 ${["bg-[#FF6B6B]","bg-[#4ECDC4]","bg-[#FFD400]","bg-[#95E1D3]"][i%4]}`}>{a.name?.[0]}</div>}
                    <div className="min-w-0">
                      <p className="font-black text-xs text-black truncate">{a.name}</p>
                      {a.city && <p className="text-[9px] text-black/30">{a.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA (guests only) ───────────────────────────── */}
      {!profile && userLoaded && (
        <div className="border-t-2 border-black bg-black py-16 px-6 text-center">
          <h2 className="font-black text-3xl text-[#FFD400] mb-3">Ready to showcase your work?</h2>
          <p className="text-white/40 font-bold mb-8 max-w-md mx-auto">Join artists and venues already building the art community on Artfolio.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-[#FFD400] text-black border-2 border-[#FFD400] font-black hover:bg-white transition-colors group">
              Get started free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white/20 text-white/60 font-black hover:border-white/40 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
