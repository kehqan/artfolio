"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight, Search, ImageIcon, MapPin, ChevronDown,
  Palette, Building2, LayoutDashboard, LogOut, User,
  Menu, X, BarChart3, Users, Handshake, FolderOpen,
  Globe, Heart, MessageCircle, Share2, Star, Zap,
  ShieldCheck, TrendingUp, Package,
} from "lucide-react";

type AppProfile = { full_name: string; avatar_url?: string; username?: string } | null;
type Artwork = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string };
type Artist  = { id: string; name: string; username?: string; city?: string; avatar_url?: string };
type Venue   = { id: string; name: string; type: string; city?: string; logo_url?: string };
type FeaturedPost = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string; is_review?: boolean; rating?: number };
type HeroSettings = { headline?: string; subheadline?: string; cta_primary?: string; cta_secondary?: string; artwork_url?: string; artwork_caption?: string };

function timeAgo(d?: string) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const FEATURES = [
  {
    group: "For Artists",
    accent: "#FF6B6B",
    icon: Palette,
    items: [
      { icon: Package,    title: "Art Inventory",    desc: "Track every work — images, status, pricing, location, provenance. Your complete artwork database." },
      { icon: FolderOpen, title: "Collections",      desc: "Group works into series and themed sets. Organize exactly how you think." },
      { icon: Globe,      title: "Public Portfolio", desc: "A stunning gallery page at artfolio.com/yourname. Share it with the world." },
      { icon: BarChart3,  title: "Sales & CRM",      desc: "Record sales, track revenue, commissions, and manage your collector relationships." },
      { icon: TrendingUp, title: "Analytics",        desc: "Understand your audience, track followers, and measure what's working." },
      { icon: Handshake,  title: "Collabs & Pool",   desc: "Post opportunities, find partners, and track all your joint projects in one place." },
    ],
  },
  {
    group: "For Venues",
    accent: "#4ECDC4",
    icon: Building2,
    items: [
      { icon: Search,     title: "Discover Artists", desc: "Browse local talent by style, medium, and location. Find the perfect fit for your walls." },
      { icon: Handshake,  title: "Discovery Pool",   desc: "Post what you're looking for. Artists apply directly with their portfolios." },
      { icon: Globe,      title: "Venue Profile",    desc: "Showcase your space, display current exhibitions, and attract the right artists." },
      { icon: Users,      title: "Community",        desc: "Connect with the broader art community. Post updates. Follow artists you love." },
    ],
  },
];

export default function HomePage() {
  const [appProfile, setAppProfile]   = useState<AppProfile>(null);
  const [userLoaded, setUserLoaded]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [mobileNav, setMobileNav]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [artworks, setArtworks]       = useState<Artwork[]>([]);
  const [artists, setArtists]         = useState<Artist[]>([]);
  const [venues, setVenues]           = useState<Venue[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [hero, setHero]               = useState<HeroSettings>({});
  const [tab, setTab]                 = useState<"artworks"|"artists"|"venues">("artworks");
  const [search, setSearch]           = useState("");
  const exploreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", user.id).single();
        setAppProfile(p);
      }
      setUserLoaded(true);

      // Hero settings
      const { data: heroData } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
      if (heroData) setHero(heroData);

      // Featured/curated posts
      const { data: featuredData } = await supabase
        .from("featured_posts")
        .select("*, posts(content, images, user_id, created_at), profiles(full_name, avatar_url)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);

      if (featuredData && featuredData.length > 0) {
        setFeaturedPosts(featuredData.map((f: any) => ({
          id: f.id,
          content: f.custom_text || f.posts?.content,
          images: f.posts?.images,
          profile_name: f.profiles?.full_name || f.custom_author,
          profile_avatar: f.profiles?.avatar_url || f.custom_avatar,
          is_review: f.is_review,
          rating: f.rating,
        })));
      }

      // Explore data
      const [{ data: rawAw }, { data: rawAr }, { data: rawVe }, { data: rawPr }] = await Promise.all([
        supabase.from("artworks").select("id,title,images,price,status,user_id").eq("status","Available").order("created_at",{ascending:false}).limit(12),
        supabase.from("profiles").select("id,full_name,username,location,avatar_url").eq("role","artist").limit(12),
        supabase.from("venues").select("id,name,type,city,logo_url").limit(8),
        supabase.from("profiles").select("id,full_name").limit(300),
      ]);
      const pm: Record<string,string> = {};
      for (const p of rawPr||[]) pm[p.id] = p.full_name;
      setArtworks((rawAw||[]).map(a => ({ id:a.id, title:a.title, images:a.images, price:a.price, status:a.status, artist_name:pm[a.user_id] })));
      setArtists((rawAr||[]).map(a => ({ id:a.id, name:a.full_name, username:a.username, city:a.location, avatar_url:a.avatar_url })));
      setVenues((rawVe||[]).map(v => ({ id:v.id, name:v.name, type:v.type, city:v.city, logo_url:v.logo_url })));
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAppProfile(null); setMenuOpen(false);
    window.location.reload();
  }

  const fArt    = artworks.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()));
  const fArtist = artists.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()));
  const fVen    = venues.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()));
  const initial = appProfile?.full_name?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>

      {/* ── STICKY NAV ──────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#111110", borderBottom: "3px solid #111110" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, maxWidth: 1400, margin: "0 auto" }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, background: "#FFD400", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Palette size={13} color="#111110" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>Artfolio</span>
          </Link>

          {/* Desktop nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 0 }} className="hidden-mobile">
            {[["Features","#features"],["Explore","#explore"],["Artists","/directory/artists"],["Venues","/directory/venues"]].map(([label, href]) => (
              <a key={label} href={href} style={{ padding: "0 16px", height: 56, display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: "#888", textDecoration: "none", borderRight: "1px solid #1e1e1e", transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#FFD400")}
                onMouseLeave={e => (e.currentTarget.style.color = "#888")}>
                {label}
              </a>
            ))}
          </nav>

          {/* Auth */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setMobileNav(p=>!p)} style={{ width: 34, height: 34, background: "none", border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }} className="show-mobile">
              <Menu size={15} />
            </button>

            {userLoaded && (
              appProfile ? (
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                  <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "all 0.1s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFD400"; (e.currentTarget as HTMLElement).style.color = "#111110"; (e.currentTarget as HTMLElement).style.borderColor = "#FFD400"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888"; (e.currentTarget as HTMLElement).style.borderColor = "#333"; }}>
                    <LayoutDashboard size={13} /> Dashboard
                  </Link>
                  <button onClick={() => setMenuOpen(p=>!p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {appProfile.avatar_url
                      ? <img src={appProfile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #333" }} />
                      : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFD400", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#111110" }}>{initial}</div>}
                  </button>
                  {menuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 160, background: "#1a1a1a", border: "1px solid #333", zIndex: 50 }}>
                      <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#ccc", textDecoration: "none", borderBottom: "1px solid #2a2a2a" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#FFD400") && (e.currentTarget.style.color = "#111110")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent") && (e.currentTarget.style.color = "#ccc")}>
                        <User size={13} /> Profile
                      </Link>
                      <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#f44", background: "none", border: "none", cursor: "pointer", width: "100%" }}>
                        <LogOut size={13} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex" }}>
                  <Link href="/login" style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#888", textDecoration: "none", border: "1px solid #333", marginRight: -1, transition: "all 0.1s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#888"; }}>
                    Sign in
                  </Link>
                  <Link href="/register" style={{ padding: "8px 16px", fontSize: 12, fontWeight: 800, color: "#111110", background: "#FFD400", border: "1px solid #FFD400", textDecoration: "none", transition: "background 0.1s" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#fff")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#FFD400")}>
                    Join free
                  </Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileNav && (
          <div style={{ background: "#1a1a1a", borderTop: "1px solid #2a2a2a", padding: "8px 0" }}>
            {[["Features","#features"],["Explore","#explore"],["Artists","/directory/artists"],["Venues","/directory/venues"]].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMobileNav(false)} style={{ display: "block", padding: "10px 24px", fontSize: 13, fontWeight: 700, color: "#888", textDecoration: "none" }}>
                {label}
              </a>
            ))}
            {!appProfile && (
              <div style={{ display: "flex", gap: 8, padding: "10px 24px" }}>
                <Link href="/login" style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#888", textDecoration: "none", border: "1px solid #333" }}>Sign in</Link>
                <Link href="/register" style={{ padding: "8px 16px", fontSize: 12, fontWeight: 800, color: "#111110", background: "#FFD400", textDecoration: "none" }}>Join free</Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section style={{ background: "#FFD400", borderBottom: "4px solid #111110", position: "relative", overflow: "hidden" }}>
        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "12px 12px", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 480, alignItems: "center", gap: 0 }}>

            {/* LEFT — copy */}
            <div style={{ padding: "64px 48px 64px 0", borderRight: "4px solid #111110" }}>
              {/* Eyebrow */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#111110", color: "#FFD400", padding: "5px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 24 }}>
                <span>Art · Community · Discovery</span>
              </div>

              {/* Headline */}
              <h1 style={{ margin: "0 0 8px 0", lineHeight: 1 }}>
                <span style={{ display: "inline-block", background: "#111110", color: "#fff", padding: "6px 14px", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-2px", marginBottom: 8 }}>
                  {hero.headline?.split(" ")[0] || "artist"}
                </span>
                <br />
                <span style={{ display: "inline-block", background: "#fff", color: "#111110", padding: "6px 14px", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-2px", border: "3px solid #111110" }}>
                  {"+ " + (hero.headline?.split(" ").slice(1).join(" ") || "venue")}
                </span>
              </h1>

              <p style={{ fontSize: 16, fontWeight: 600, color: "#111110", lineHeight: 1.6, maxWidth: 420, margin: "20px 0 32px 0", opacity: 0.8 }}>
                {hero.subheadline || "Where local artists meet venues. Showcase work. Fill walls. Build community."}
              </p>

              {/* CTAs */}
              {userLoaded && (
                appProfile ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", background: "#111110", color: "#FFD400", fontSize: 13, fontWeight: 800, textDecoration: "none", border: "3px solid #111110", boxShadow: "4px 4px 0 #000" }}>
                      <LayoutDashboard size={15} /> {hero.cta_primary || "Go to Dashboard"}
                    </Link>
                    <button onClick={() => exploreRef.current?.scrollIntoView({behavior:"smooth"})} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", background: "#fff", color: "#111110", fontSize: 13, fontWeight: 800, border: "3px solid #111110", cursor: "pointer" }}>
                      Explore <ChevronDown size={15} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", background: "#111110", color: "#FFD400", fontSize: 13, fontWeight: 800, textDecoration: "none", border: "3px solid #111110", boxShadow: "4px 4px 0 #000" }}>
                      {hero.cta_primary || "Join free"} <ArrowRight size={15} />
                    </Link>
                    <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", background: "#fff", color: "#111110", fontSize: 13, fontWeight: 800, textDecoration: "none", border: "3px solid #111110" }}>
                      {hero.cta_secondary || "Sign in"}
                    </Link>
                    <button onClick={() => exploreRef.current?.scrollIntoView({behavior:"smooth"})} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 8px", background: "transparent", color: "#111110", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", opacity: 0.6 }}>
                      Browse first <ChevronDown size={13} />
                    </button>
                  </div>
                )
              )}
            </div>

            {/* RIGHT — artwork frame */}
            <div style={{ padding: "40px 0 40px 48px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
                {/* Main frame */}
                <div style={{ border: "4px solid #111110", boxShadow: "8px 8px 0 #111110", background: "#fff", aspectRatio: "4/3", overflow: "hidden", position: "relative" }}>
                  {hero.artwork_url ? (
                    <img src={hero.artwork_url} alt="Featured artwork" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F0E8", gap: 12 }}>
                      <ImageIcon size={40} color="#9B8F7A" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textAlign: "center", padding: "0 16px" }}>
                        Set featured artwork<br />in Admin Panel
                      </span>
                    </div>
                  )}
                  {/* Corner tag */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, background: "#FFD400", border: "2px solid #111110", borderTop: "2px solid #111110", padding: "4px 10px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Featured
                  </div>
                </div>
                {hero.artwork_caption && (
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "#111110", opacity: 0.6 }}>{hero.artwork_caption}</div>
                )}
                {/* Decorative offset block */}
                <div style={{ position: "absolute", top: -10, right: -10, width: "100%", height: "100%", border: "4px solid #111110", zIndex: -1, background: "#FFD400", maxWidth: 380 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ────────────────────────────────────── */}
      <section id="features" style={{ background: "#FAFAF8", borderBottom: "4px solid #111110" }}>

        {/* Section header */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "inline-block", background: "#111110", color: "#FFD400", padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
                Everything you need
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "#111110", letterSpacing: "-1px", margin: 0, lineHeight: 1.1 }}>
                Built for every<br />player in the art scene
              </h2>
            </div>
            <p style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600, maxWidth: 300, lineHeight: 1.6, margin: 0 }}>
              From inventory to community — every tool an artist or venue needs, in one platform.
            </p>
          </div>
        </div>

        {/* Feature groups */}
        {FEATURES.map((group, gi) => (
          <div key={group.group} style={{ borderTop: "2px solid #E0D8CA", maxWidth: 1200, margin: "0 auto", padding: gi === FEATURES.length - 1 ? "48px 24px 64px" : "48px 24px" }}>
            {/* Group header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, background: group.accent, border: "3px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0 #111110" }}>
                <group.icon size={18} color="#111110" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em" }}>Tools for</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px" }}>{group.group}</div>
              </div>
            </div>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {group.items.map((item, idx) => (
                <div key={item.title} style={{
                  background: "#fff",
                  border: "2px solid #111110",
                  padding: "20px 22px",
                  boxShadow: "3px 3px 0 #111110",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  cursor: "default",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, background: group.accent, border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <item.icon size={14} color="#111110" />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111110", margin: 0, letterSpacing: "-0.2px" }}>{item.title}</h3>
                  </div>
                  <p style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── COMMUNITY POSTS (Admin-curated) ────────────────────── */}
      {featuredPosts.length > 0 && (
        <section style={{ background: "#111110", borderBottom: "4px solid #111110", padding: "64px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "inline-block", background: "#FFD400", color: "#111110", padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, border: "2px solid #FFD400" }}>
                From the community
              </div>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", margin: 0 }}>
                What artists & venues are saying
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {featuredPosts.map(post => (
                <div key={post.id} style={{ background: "#1a1a1a", border: "2px solid #2a2a2a", padding: "20px" }}>
                  {/* Stars if review */}
                  {post.is_review && post.rating && (
                    <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
                      {Array.from({length: 5}).map((_,i) => (
                        <Star key={i} size={13} fill={i < post.rating! ? "#FFD400" : "transparent"} color={i < post.rating! ? "#FFD400" : "#444"} />
                      ))}
                    </div>
                  )}
                  {post.images?.[0] && (
                    <div style={{ marginBottom: 14, border: "2px solid #2a2a2a", overflow: "hidden", aspectRatio: "16/9" }}>
                      <img src={post.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  {post.content && (
                    <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7, margin: "0 0 16px", fontWeight: 500 }}>
                      "{post.content}"
                    </p>
                  )}
                  {post.profile_name && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {post.profile_avatar
                        ? <img src={post.profile_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #333" }} />
                        : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFD400", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#111110" }}>{post.profile_name[0]}</div>}
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>{post.profile_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EXPLORE SECTION ─────────────────────────────────────── */}
      <div ref={exploreRef} id="explore" style={{ background: "#FAFAF8", borderBottom: "4px solid #111110", padding: "64px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "inline-block", background: "#111110", color: "#FFD400", padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
                Browse the platform
              </div>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0 }}>Explore Artfolio</h2>
            </div>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, border: "2px solid #111110", background: "#fff" }}>
              <Search size={14} color="#9B8F7A" style={{ marginLeft: 12 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{ padding: "10px 12px", border: "none", outline: "none", fontSize: 13, fontWeight: 600, fontFamily: "inherit", minWidth: 200 }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "3px solid #111110", marginBottom: 28 }}>
            {(["artworks","artists","venues"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "10px 24px", border: "none", borderBottom: tab === t ? "4px solid #FFD400" : "4px solid transparent",
                background: tab === t ? "#FFD400" : "transparent",
                fontSize: 12, fontWeight: 800, color: "#111110", cursor: "pointer", textTransform: "capitalize",
                marginBottom: -3, letterSpacing: "0.05em",
              }}>{t}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Link href="/directory/artists" style={{ padding: "7px 14px", border: "2px solid #111110", background: "#fff", fontSize: 11, fontWeight: 800, color: "#111110", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                <Palette size={11} /> All Artists
              </Link>
              <Link href="/directory/venues" style={{ padding: "7px 14px", border: "2px solid #111110", background: "#FFD400", fontSize: 11, fontWeight: 800, color: "#111110", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                <Building2 size={11} /> All Venues
              </Link>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#9B8F7A", fontSize: 14, fontWeight: 700 }}>Loading…</div>
          ) : tab === "artworks" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {fArt.map((a, i) => {
                const bgs = ["#fff","#FFF3C4","#fff","#111110"];
                const txs = ["#111110","#111110","#111110","#FFD400"];
                return (
                  <div key={a.id} style={{ background: bgs[i%4], border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", transition: "transform 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}>
                    <div style={{ aspectRatio: "1/1", background: "#F5F0E8", overflow: "hidden", borderBottom: "2px solid #111110", position: "relative" }}>
                      {a.images?.[0]
                        ? <img src={a.images[0]} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={28} color="#9B8F7A" /></div>}
                      <div style={{ position: "absolute", top: 0, left: 0, background: "#FFD400", border: "1px solid #111110", padding: "2px 7px", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{a.status}</div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: txs[i%4], margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</p>
                      {a.artist_name && <p style={{ fontSize: 10, color: txs[i%4], opacity: 0.5, margin: 0, fontWeight: 600 }}>{a.artist_name}</p>}
                      {a.price && <p style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 800, color: txs[i%4], margin: "6px 0 0" }}>${a.price.toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
              {fArt.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9B8F7A", fontWeight: 700 }}>No artworks found</div>}
            </div>
          ) : tab === "artists" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {fArtist.map((a, i) => {
                const acs = ["#FF6B6B","#4ECDC4","#FFD400","#95E1D3"];
                return (
                  <Link key={a.id} href={a.username ? `/profile/${a.username}` : "#"} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", transition: "transform 0.1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}>
                      <div style={{ height: 120, background: acs[i%4], borderBottom: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {a.avatar_url
                          ? <img src={a.avatar_url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 36, fontWeight: 900, color: "#111110" }}>{a.name?.[0]}</span>}
                      </div>
                      <div style={{ padding: "10px 12px" }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#111110", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</p>
                        {a.city && <p style={{ fontSize: 10, color: "#9B8F7A", margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={9} />{a.city}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {fArtist.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9B8F7A", fontWeight: 700 }}>No artists found</div>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {fVen.map(v => (
                <Link key={v.id} href={`/venue/${v.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", display: "flex", alignItems: "center", gap: 14, padding: 16, transition: "transform 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}>
                    {v.logo_url
                      ? <img src={v.logo_url} alt="" style={{ width: 48, height: 48, border: "2px solid #111110", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 48, height: 48, background: "#4ECDC4", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#111110", flexShrink: 0 }}>{v.name?.[0]}</div>}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#111110", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</p>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>{v.type}</p>
                      {v.city && <p style={{ fontSize: 10, color: "#9B8F7A", margin: 0, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={9} />{v.city}</p>}
                    </div>
                  </div>
                </Link>
              ))}
              {fVen.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#9B8F7A", fontWeight: 700 }}>No venues found</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CTA (guests only) ─────────────────────────────── */}
      {!appProfile && userLoaded && (
        <section style={{ background: "#111110", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "inline-block", background: "#FFD400", color: "#111110", padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20, border: "2px solid #FFD400" }}>
              Get started today
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: "0 0 16px", lineHeight: 1.1 }}>
              Ready to showcase<br />your work?
            </h2>
            <p style={{ fontSize: 15, color: "#888", fontWeight: 600, lineHeight: 1.6, margin: "0 0 36px" }}>
              Join artists and venues already building the art community on Artfolio.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "#FFD400", color: "#111110", fontSize: 14, fontWeight: 800, textDecoration: "none", border: "3px solid #FFD400", boxShadow: "4px 4px 0 #FFD400" }}>
                Join as Artist <ArrowRight size={16} />
              </Link>
              <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none", border: "3px solid #444" }}>
                Register a Venue
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background: "#0a0a09", borderTop: "2px solid #1e1e1e", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em" }}>Artfolio ✦</span>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy","Support","Admin"].map(l => (
            <Link key={l} href={l === "Admin" ? "/admin" : "#"} style={{ fontSize: 11, fontWeight: 700, color: "#444", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#FFD400")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#444")}>
              {l}
            </Link>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#2a2a2a", fontWeight: 700 }}>© 2026</span>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
