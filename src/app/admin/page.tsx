"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck, LogOut, Image as ImageIcon, Users, BarChart3,
  MessageSquare, Settings, Eye, Trash2, Plus, Save,
  Check, X, Star, ArrowUpDown, RefreshCw, ChevronDown, ChevronUp,
  Palette, Building2, Package, Globe,
} from "lucide-react";

const ADMIN_EMAIL    = "kasradm7@gmail.com";
const ADMIN_PASSWORD = "Artfolio@Admin2026!";

type Tab = "hero" | "featured" | "users" | "artworks" | "posts" | "venues";

type HeroSettings = {
  id: number; headline: string; subheadline: string;
  cta_primary: string; cta_secondary: string;
  artwork_url: string; artwork_caption: string;
};

type FeaturedPost = {
  id: string; post_id?: string; custom_text: string;
  custom_author: string; custom_avatar: string;
  is_review: boolean; rating: number;
  is_active: boolean; sort_order: number;
};

type UserRow   = { id: string; full_name: string; email?: string; role: string; username?: string; created_at: string; avatar_url?: string };
type ArtworkRow = { id: string; title: string; status: string; price?: number; user_id: string; created_at: string; images?: string[] };
type PostRow    = { id: string; content?: string; user_id: string; created_at: string; images?: string[]; profile_name?: string };
type VenueRow   = { id: string; name: string; type: string; city?: string; contact_email?: string };

export default function AdminPage() {
  const [authed, setAuthed]           = useState(false);
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPass, setLoginPass]     = useState("");
  const [loginErr, setLoginErr]       = useState("");
  const [tab, setTab]                 = useState<Tab>("hero");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [stats, setStats]             = useState({ users: 0, artworks: 0, posts: 0, venues: 0 });

  // Data states
  const [hero, setHero]               = useState<HeroSettings>({ id: 1, headline: "artist venue", subheadline: "Where local artists meet venues. Showcase work. Fill walls. Build community.", cta_primary: "Join free", cta_secondary: "Sign in", artwork_url: "", artwork_caption: "" });
  const [featured, setFeatured]       = useState<FeaturedPost[]>([]);
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [artworks, setArtworks]       = useState<ArtworkRow[]>([]);
  const [posts, setPosts]             = useState<PostRow[]>([]);
  const [venues, setVenues]           = useState<VenueRow[]>([]);

  // New featured post form
  const [newFP, setNewFP] = useState({ custom_text: "", custom_author: "", custom_avatar: "", is_review: false, rating: 5, post_id: "" });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setAuthed(true);
      loadAll();
    } else {
      setLoginErr("Invalid credentials");
    }
  }

  async function loadAll() {
    const supabase = createClient();

    const [{ count: uc }, { count: ac }, { count: pc }, { count: vc }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("artworks").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("venues").select("*", { count: "exact", head: true }),
    ]);
    setStats({ users: uc||0, artworks: ac||0, posts: pc||0, venues: vc||0 });

    // Hero
    const { data: heroData } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
    if (heroData) setHero(heroData);

    // Featured posts
    const { data: fp } = await supabase.from("featured_posts").select("*").order("sort_order", { ascending: true });
    setFeatured(fp || []);

    // Users
    const { data: ud } = await supabase.from("profiles").select("id, full_name, role, username, created_at, avatar_url").order("created_at", { ascending: false }).limit(100);
    setUsers(ud || []);

    // Artworks
    const { data: ad } = await supabase.from("artworks").select("id, title, status, price, user_id, created_at, images").order("created_at", { ascending: false }).limit(100);
    setArtworks(ad || []);

    // Posts with profile names
    const { data: pd } = await supabase.from("posts").select("id, content, user_id, created_at, images").order("created_at", { ascending: false }).limit(100);
    const { data: pr } = await supabase.from("profiles").select("id, full_name").limit(500);
    const pm: Record<string,string> = {};
    for (const p of pr||[]) pm[p.id] = p.full_name;
    setPosts((pd||[]).map(p => ({ ...p, profile_name: pm[p.user_id] })));

    // Venues
    const { data: vd } = await supabase.from("venues").select("id, name, type, city, contact_email").order("created_at", { ascending: false }).limit(100);
    setVenues(vd || []);
  }

  async function saveHero() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("hero_settings").upsert({ ...hero, id: 1 });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addFeaturedPost() {
    if (!newFP.custom_text && !newFP.post_id) return;
    const supabase = createClient();
    const maxOrder = featured.length > 0 ? Math.max(...featured.map(f => f.sort_order)) + 1 : 0;
    await supabase.from("featured_posts").insert({
      ...newFP, is_active: true, sort_order: maxOrder,
    });
    setNewFP({ custom_text: "", custom_author: "", custom_avatar: "", is_review: false, rating: 5, post_id: "" });
    loadAll();
  }

  async function toggleFeatured(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("featured_posts").update({ is_active: !current }).eq("id", id);
    setFeatured(p => p.map(f => f.id === id ? { ...f, is_active: !current } : f));
  }

  async function deleteFeatured(id: string) {
    if (!confirm("Remove this featured post?")) return;
    const supabase = createClient();
    await supabase.from("featured_posts").delete().eq("id", id);
    setFeatured(p => p.filter(f => f.id !== id));
  }

  async function deletePost(id: string) {
    if (!confirm("Permanently delete this post?")) return;
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", id);
    setPosts(p => p.filter(post => post.id !== id));
  }

  async function deleteUser(id: string) {
    if (!confirm("This will remove the user's profile. Continue?")) return;
    const supabase = createClient();
    await supabase.from("profiles").delete().eq("id", id);
    setUsers(p => p.filter(u => u.id !== id));
  }

  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "hero",     label: "Hero & CTA",       icon: Globe },
    { id: "featured", label: "Featured Posts",   icon: Star,        count: featured.filter(f=>f.is_active).length },
    { id: "users",    label: "Users",             icon: Users,       count: stats.users },
    { id: "artworks", label: "Artworks",          icon: Package,     count: stats.artworks },
    { id: "posts",    label: "Posts",             icon: MessageSquare, count: stats.posts },
    { id: "venues",   label: "Venues",            icon: Building2,   count: stats.venues },
  ];

  // ── LOGIN SCREEN ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#111110", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, background: "#FFD400", border: "3px solid #FFD400", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={22} color="#111110" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>Admin Panel</div>
              <div style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Artfolio Platform</div>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loginErr && (
              <div style={{ background: "#FF6B6B", color: "#111110", padding: "10px 14px", fontSize: 13, fontWeight: 700, border: "2px solid #FF6B6B" }}>
                {loginErr}
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                style={{ width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "2px solid #2a2a2a", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#FFD400")}
                onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required
                style={{ width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "2px solid #2a2a2a", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#FFD400")}
                onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
            </div>
            <button type="submit" style={{ padding: "13px", background: "#FFD400", color: "#111110", fontSize: 13, fontWeight: 800, border: "2px solid #FFD400", cursor: "pointer", marginTop: 8, letterSpacing: "0.05em" }}>
              Access Admin Panel →
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#333", fontWeight: 700 }}>
            <a href="/" style={{ color: "#555", textDecoration: "none" }}>← Back to Artfolio</a>
          </p>
        </div>
      </div>
    );
  }

  // ── ADMIN PANEL ───────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "#fff",
    border: "2px solid #d4cfc4", fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", color: "#111110",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>

      {/* Top bar */}
      <header style={{ background: "#111110", borderBottom: "3px solid #111110", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={14} color="#111110" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>Artfolio Admin</span>
          <span style={{ padding: "2px 8px", background: "#FF6B6B", color: "#fff", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginLeft: 4 }}>Restricted</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <Globe size={12} /> Live Site
          </a>
          <button onClick={() => setAuthed(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: "1px solid #333", color: "#f44", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 24px" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Users",    value: stats.users,    color: "#FFD400" },
            { label: "Artworks", value: stats.artworks, color: "#4ECDC4" },
            { label: "Posts",    value: stats.posts,    color: "#FF6B6B" },
            { label: "Venues",   value: stats.venues,   color: "#95E1D3" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "2px solid #111110", padding: "18px 20px", boxShadow: "3px 3px 0 #111110" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111110" }}>{s.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, background: s.color, border: "1px solid #111110" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "3px solid #111110", marginBottom: 28, gap: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
              border: "none", borderBottom: tab === t.id ? "4px solid #FFD400" : "4px solid transparent",
              background: tab === t.id ? "#FFD400" : "transparent",
              fontSize: 12, fontWeight: 800, color: "#111110", cursor: "pointer",
              marginBottom: -3, whiteSpace: "nowrap", letterSpacing: "0.03em",
            }}>
              <t.icon size={13} />
              {t.label}
              {t.count !== undefined && (
                <span style={{ background: tab === t.id ? "#111110" : "#E0D8CA", color: tab === t.id ? "#FFD400" : "#5C5346", padding: "1px 7px", fontSize: 10, fontWeight: 800, borderRadius: 20 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
          <button onClick={() => loadAll()} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #111110", background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* ── HERO TAB ── */}
        {tab === "hero" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#fff", border: "2px solid #111110", padding: 24, boxShadow: "3px 3px 0 #111110" }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: "0 0 20px", letterSpacing: "-0.3px" }}>Hero Content</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Headline (first word = black box, rest = white box)</label>
                  <input value={hero.headline} onChange={e => setHero(p => ({...p, headline: e.target.value}))}
                    style={inputStyle} placeholder="artist venue"
                    onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                </div>
                <div>
                  <label style={labelStyle}>Subheadline</label>
                  <textarea rows={3} value={hero.subheadline} onChange={e => setHero(p => ({...p, subheadline: e.target.value}))}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Primary CTA button</label>
                    <input value={hero.cta_primary} onChange={e => setHero(p => ({...p, cta_primary: e.target.value}))}
                      style={inputStyle} placeholder="Join free"
                      onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Secondary CTA button</label>
                    <input value={hero.cta_secondary} onChange={e => setHero(p => ({...p, cta_secondary: e.target.value}))}
                      style={inputStyle} placeholder="Sign in"
                      onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "2px solid #111110", padding: 24, boxShadow: "3px 3px 0 #111110" }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: "0 0 20px", letterSpacing: "-0.3px" }}>Hero Artwork Frame</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Artwork image URL</label>
                  <input value={hero.artwork_url} onChange={e => setHero(p => ({...p, artwork_url: e.target.value}))}
                    style={inputStyle} placeholder="https://... (Supabase storage URL)"
                    onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                </div>
                {hero.artwork_url && (
                  <div style={{ border: "2px solid #111110", overflow: "hidden", aspectRatio: "4/3" }}>
                    <img src={hero.artwork_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Caption (shown below frame)</label>
                  <input value={hero.artwork_caption} onChange={e => setHero(p => ({...p, artwork_caption: e.target.value}))}
                    style={inputStyle} placeholder="e.g. 'Untitled No.3' by Neda Rahimi"
                    onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                </div>
              </div>
            </div>

            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={saveHero} disabled={saving} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 28px",
                background: saved ? "#4ECDC4" : "#FFD400", color: "#111110",
                border: "3px solid #111110", fontSize: 13, fontWeight: 800, cursor: "pointer",
                boxShadow: "3px 3px 0 #111110",
              }}>
                {saved ? <><Check size={15} /> Saved!</> : saving ? "Saving…" : <><Save size={15} /> Save Hero Settings</>}
              </button>
            </div>
          </div>
        )}

        {/* ── FEATURED POSTS TAB ── */}
        {tab === "featured" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Add new */}
            <div style={{ background: "#fff", border: "2px solid #111110", padding: 24, boxShadow: "3px 3px 0 #111110" }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: "0 0 4px", letterSpacing: "-0.3px" }}>Add Featured Post</h2>
              <p style={{ fontSize: 12, color: "#9B8F7A", margin: "0 0 20px", fontWeight: 500 }}>These appear in the "From the community" section on the landing page.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Quote / Post text *</label>
                  <textarea rows={3} value={newFP.custom_text} onChange={e => setNewFP(p => ({...p, custom_text: e.target.value}))}
                    style={{ ...inputStyle, resize: "vertical" }} placeholder="Enter the post content or quote to feature…"
                    onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Author name</label>
                    <input value={newFP.custom_author} onChange={e => setNewFP(p => ({...p, custom_author: e.target.value}))}
                      style={inputStyle} placeholder="Neda Rahimi"
                      onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Avatar URL (optional)</label>
                    <input value={newFP.custom_avatar} onChange={e => setNewFP(p => ({...p, custom_avatar: e.target.value}))}
                      style={inputStyle} placeholder="https://..."
                      onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#d4cfc4")} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <input type="checkbox" checked={newFP.is_review} onChange={e => setNewFP(p => ({...p, is_review: e.target.checked}))}
                      style={{ width: 16, height: 16, accentColor: "#FFD400" }} />
                    Show as review (with stars)
                  </label>
                  {newFP.is_review && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>Stars:</label>
                      <select value={newFP.rating} onChange={e => setNewFP(p => ({...p, rating: Number(e.target.value)}))}
                        style={{ padding: "4px 8px", border: "2px solid #d4cfc4", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={addFeaturedPost} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px",
                  background: "#FFD400", color: "#111110", border: "3px solid #111110",
                  fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110",
                }}>
                  <Plus size={15} /> Add to Featured
                </button>
              </div>
            </div>

            {/* Current featured */}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: "0 0 16px", letterSpacing: "-0.3px" }}>
                Active Featured Posts ({featured.filter(f=>f.is_active).length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {featured.length === 0 && (
                  <div style={{ background: "#fff", border: "2px dashed #d4cfc4", padding: 24, textAlign: "center", color: "#9B8F7A", fontSize: 13, fontWeight: 600 }}>
                    No featured posts yet. Add one to the left.
                  </div>
                )}
                {featured.map(fp => (
                  <div key={fp.id} style={{ background: "#fff", border: `2px solid ${fp.is_active ? "#111110" : "#E0D8CA"}`, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12, opacity: fp.is_active ? 1 : 0.5 }}>
                    {fp.is_review && (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {Array.from({length: fp.rating}).map((_,i) => <Star key={i} size={11} fill="#FFD400" color="#FFD400" />)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "#111110", margin: "0 0 4px", lineHeight: 1.5, fontWeight: 500 }}>{fp.custom_text?.slice(0,100)}{fp.custom_text?.length > 100 ? "…" : ""}</p>
                      {fp.custom_author && <p style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", margin: 0 }}>{fp.custom_author}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleFeatured(fp.id, fp.is_active)} style={{ width: 28, height: 28, border: `2px solid ${fp.is_active ? "#4ECDC4" : "#d4cfc4"}`, background: fp.is_active ? "#4ECDC4" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Eye size={12} color="#111110" />
                      </button>
                      <button onClick={() => deleteFeatured(fp.id)} style={{ width: 28, height: 28, border: "2px solid #FF6B6B", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={12} color="#FF6B6B" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F5F0E8", borderBottom: "2px solid #111110" }}>
                    {["Avatar","Name","Role","Username","Joined","Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9B8F7A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #E0D8CA", background: i%2===0?"#fff":"#FAFAF8" }}>
                      <td style={{ padding: "10px 14px" }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #E0D8CA" }} />
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFD400", border: "2px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{u.full_name?.[0]}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111110" }}>{u.full_name}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "2px 8px", background: u.role==="gallery"?"#E0F2FE":"#DCFCE7", color: u.role==="gallery"?"#0C4A6E":"#166534", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{u.role||"artist"}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>@{u.username||"—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => deleteUser(u.id)} style={{ width: 28, height: 28, border: "1.5px solid #FF6B6B", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={11} color="#FF6B6B" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ARTWORKS TAB ── */}
        {tab === "artworks" && (
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F5F0E8", borderBottom: "2px solid #111110" }}>
                    {["Image","Title","Status","Price","Added"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9B8F7A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {artworks.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #E0D8CA", background: i%2===0?"#fff":"#FAFAF8" }}>
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ width: 44, height: 44, border: "2px solid #E0D8CA", overflow: "hidden", background: "#F5F0E8" }}>
                          {a.images?.[0] ? <img src={a.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={16} color="#d4cfc4" /></div>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111110" }}>{a.title}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "2px 8px", background: a.status==="Available"?"#DCFCE7":a.status==="Sold"?"#111110":"#F3F4F6", color: a.status==="Available"?"#166534":a.status==="Sold"?"#FFD400":"#374151", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{a.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#111110" }}>{a.price ? `$${a.price.toLocaleString()}` : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── POSTS TAB ── */}
        {tab === "posts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.map((post, i) => (
              <div key={post.id} style={{ background: "#fff", border: "2px solid #111110", padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "2px 2px 0 #111110" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>{post.profile_name || "Unknown"}</span>
                    <span style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  {post.content && <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{post.content.slice(0, 200)}{post.content.length > 200 ? "…" : ""}</p>}
                  {post.images && post.images.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {post.images.slice(0,3).map((img, j) => (
                        <img key={j} src={img} alt="" style={{ width: 60, height: 60, objectFit: "cover", border: "1.5px solid #E0D8CA" }} />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => deletePost(post.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "2px solid #FF6B6B", background: "#fff", color: "#FF6B6B", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            ))}
            {posts.length === 0 && (
              <div style={{ background: "#fff", border: "2px dashed #d4cfc4", padding: 40, textAlign: "center", color: "#9B8F7A", fontWeight: 600 }}>No posts yet</div>
            )}
          </div>
        )}

        {/* ── VENUES TAB ── */}
        {tab === "venues" && (
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F5F0E8", borderBottom: "2px solid #111110" }}>
                    {["Name","Type","City","Contact"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9B8F7A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v, i) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid #E0D8CA", background: i%2===0?"#fff":"#FAFAF8" }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#111110" }}>{v.name}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "2px 8px", background: "#E0F2FE", color: "#0C4A6E", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{v.type}</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>{v.city||"—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>{v.contact_email||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
