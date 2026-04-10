"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Globe, Mail, Instagram, ExternalLink,
  ImageIcon, Star, X, ChevronLeft, ChevronRight,
  Users, CalendarDays, Handshake, ShoppingBag,
  Check, Copy, ArrowRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Profile = {
  id: string; full_name: string; username: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  website?: string; email?: string; instagram?: string;
};

type StoreSettings = {
  store_name?: string; tagline?: string; accent_color?: string;
  banner_url?: string; show_bio?: boolean; show_collabs?: boolean;
  show_events?: boolean; layout?: string; is_active?: boolean;
};

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; price?: number; currency?: string;
  status: string; images?: string[]; sale_method?: string;
  width_cm?: number; height_cm?: number; depth_cm?: number; framed?: boolean;
  featured?: boolean;
};

type Collab = {
  id: string; title: string; type?: string; status: string;
  partner_name?: string; description?: string; deadline?: string;
};

type Exhibition = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string; cover_image?: string; description?: string;
};

type Tab = "store" | "artworks" | "collabs" | "events";

const SALE_CFG: Record<string, { icon: string; label: string; color: string }> = {
  direct:           { icon: "🛒", label: "Buy Now",          color: "#16A34A" },
  inquiry:          { icon: "✉️", label: "Inquiry",          color: "#0EA5E9" },
  price_on_request: { icon: "💬", label: "Price on Request", color: "#CA8A04" },
  auction:          { icon: "🔨", label: "Auction",          color: "#8B5CF6" },
  not_for_sale:     { icon: "🚫", label: "Not for Sale",     color: "#9B8F7A" },
};

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  available: { bg: "#DCFCE7", color: "#16A34A" },
  Available: { bg: "#DCFCE7", color: "#16A34A" },
  sold:      { bg: "#111110", color: "#FFD400" },
  Sold:      { bg: "#111110", color: "#FFD400" },
  reserved:  { bg: "#FEF9C3", color: "#D97706" },
  Reserved:  { bg: "#FEF9C3", color: "#D97706" },
};

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Artwork Detail Modal ─────────────────────────────────────────
function ArtworkModal({ aw, accent, onClose }: { aw: Artwork; accent: string; onClose: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = (aw.images || []).filter(Boolean);
  const sm = aw.sale_method ? SALE_CFG[aw.sale_method] : null;
  const dims = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean).join(" × ");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 820, maxHeight: "92vh", overflowY: "auto", position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, zIndex: 10, width: 36, height: 36, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="#FFD400" />
        </button>

        {/* Left: images */}
        <div style={{ background: "#FAF7F3", borderRadius: "22px 0 0 22px", overflow: "hidden", position: "relative", minHeight: 420 }}>
          {imgs.length > 0 ? (
            <>
              <img src={imgs[imgIdx]} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {imgs.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronLeft size={15} /></button>
                  <button onClick={() => setImgIdx(i => Math.min(imgs.length - 1, i + 1))} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronRight size={15} /></button>
                  <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
                    {imgs.map((_, i) => <div key={i} onClick={() => setImgIdx(i)} style={{ width: 7, height: 7, borderRadius: "50%", background: i === imgIdx ? accent : "rgba(255,255,255,0.5)", border: "1.5px solid #111110", cursor: "pointer" }} />)}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={48} color="#D4C9A8" /></div>
          )}
          {/* Thumbnails */}
          {imgs.length > 1 && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", gap: 4, padding: "0 10px 40px", overflowX: "auto" }}>
              {imgs.map((img, i) => (
                <div key={i} onClick={() => setImgIdx(i)} style={{ width: 44, height: 36, flexShrink: 0, borderRadius: 6, overflow: "hidden", border: `2px solid ${i === imgIdx ? accent : "rgba(255,255,255,0.3)"}`, cursor: "pointer" }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div style={{ padding: "32px 28px 28px", display: "flex", flexDirection: "column" }}>
          {aw.featured && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 8, background: accent, border: "1.5px solid #111110", fontSize: 10, fontWeight: 800, color: "#111110", marginBottom: 12, width: "fit-content" }}>
              <Star size={10} fill="#111110" /> Featured
            </div>
          )}
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", marginBottom: 6 }}>{aw.title}</h2>
          <div style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, marginBottom: 20 }}>{[aw.medium, aw.year].filter(Boolean).join(" · ")}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F5F0E8" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-1px" }}>
              {aw.price ? `$${Number(aw.price).toLocaleString()}` : <span style={{ fontSize: 16, color: "#9B8F7A" }}>Price on request</span>}
            </div>
            {sm && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, background: sm.color + "15", color: sm.color, border: `1.5px solid ${sm.color}40`, fontSize: 11, fontWeight: 800 }}>{sm.icon} {sm.label}</span>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[["Status", (STATUS_CFG[aw.status] ? aw.status : null)], ["Dimensions", dims || null], ["Framed", aw.framed ? "Yes" : null], ["Editions", aw.framed != null && (aw as any).editions ? `${(aw as any).editions} ed.` : null]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} style={{ padding: "10px 12px", background: "#FAF7F3", borderRadius: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{v}</div>
              </div>
            ))}
          </div>

          {aw.description && <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.7, marginBottom: 20, flex: 1 }}>{aw.description}</p>}

          <a href={`mailto:?subject=Inquiry about "${aw.title}"`} style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", padding: "13px", background: accent, border: "2.5px solid #111110", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", color: "#111110", fontFamily: "'Darker Grotesque', system-ui, sans-serif", boxShadow: "3px 3px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Mail size={15} /> {aw.sale_method === "direct" ? "Buy This Artwork" : "Inquire About This Work"}
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [settings, setSettings]     = useState<StoreSettings | null>(null);
  const [storeArtworks, setStoreArtworks] = useState<Artwork[]>([]);
  const [allArtworks, setAllArtworks]     = useState<Artwork[]>([]);
  const [collabs, setCollabs]         = useState<Collab[]>([]);
  const [events, setEvents]           = useState<Exhibition[]>([]);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [tab, setTab]                 = useState<Tab>("store");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [artworkCount, setArtworkCount]   = useState(0);
  const [copied, setCopied]               = useState(false);

  useEffect(() => {
    if (!username) return;
    load();
  }, [username]);

  async function load() {
    const sb = createClient();

    const { data: prof } = await sb.from("profiles").select("id, full_name, username, role, bio, location, avatar_url, website, email, instagram").eq("username", username).single();
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setProfile(prof);

    const { data: ss } = await sb.from("store_settings").select("*").eq("user_id", prof.id).single();
    setSettings(ss || {});

    // Store artworks
    const { data: storeEntries } = await sb.from("store_artworks").select("artwork_id, sort_order, featured").eq("user_id", prof.id).order("sort_order");
    if (storeEntries?.length) {
      const ids = storeEntries.map(e => e.artwork_id);
      const { data: aws } = await sb.from("artworks").select("id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed").in("id", ids);
      const featureMap: Record<string, boolean> = {};
      storeEntries.forEach(e => { featureMap[e.artwork_id] = e.featured; });
      const orderMap: Record<string, number> = {};
      storeEntries.forEach(e => { orderMap[e.artwork_id] = e.sort_order; });
      const sorted = (aws || []).map(aw => ({ ...aw, featured: featureMap[aw.id] || false })).sort((a, b) => (a.featured ? -1 : b.featured ? 1 : 0) || (orderMap[a.id] - orderMap[b.id]));
      setStoreArtworks(sorted);
    }

    // All artworks
    const { data: aws } = await sb.from("artworks").select("id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed").eq("user_id", prof.id).order("created_at", { ascending: false }).limit(48);
    setAllArtworks(aws || []);

    // Collabs
    const { data: co } = await sb.from("collaborations").select("id, title, type, status, partner_name, description, deadline").eq("user_id", prof.id).limit(12);
    setCollabs(co || []);

    // Events
    const { data: ex } = await sb.from("exhibitions").select("id, title, venue, start_date, end_date, status, cover_image, description").eq("user_id", prof.id).eq("is_public", true).order("start_date").limit(12);
    setEvents(ex || []);

    // Stats
    const [{ count: fc }, { count: ac }] = await Promise.all([
      sb.from("follows").select("*", { count: "exact", head: true }).eq("following_id", prof.id),
      sb.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", prof.id),
    ]);
    setFollowerCount(fc || 0);
    setArtworkCount(ac || 0);
    setLoading(false);
  }

  const accent = settings?.accent_color || "#FFD400";
  const storeName = settings?.store_name || profile?.full_name || "";
  const isVenue = profile?.role === "gallery" || profile?.role === "venue";
  const initials = (profile?.full_name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const TABS: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "store",    label: "Store",    icon: ShoppingBag, count: storeArtworks.length },
    { id: "artworks", label: "Artworks", icon: ImageIcon,   count: artworkCount },
    { id: "collabs",  label: "Collabs",  icon: Handshake,   count: collabs.length },
    { id: "events",   label: "Events",   icon: CalendarDays, count: events.length },
  ];

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: "spin 2s linear infinite", display: "inline-block" }}>🥭</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9B8F7A" }}>Loading profile…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥭</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", marginBottom: 8 }}>Profile not found</h1>
        <p style={{ fontSize: 15, color: "#9B8F7A", marginBottom: 28 }}>No one here by that name.</p>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{ padding: "10px 24px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>← Go Home</button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'Darker Grotesque',system-ui,sans-serif;background:#FFFBEA;color:#111110;scroll-behavior:smooth}

        /* ── NAV ── */
        .pub-nav{position:sticky;top:0;z-index:100;background:rgba(255,251,234,0.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:2.5px solid #111110;display:flex;align-items:center;justify-content:space-between;padding:0 28px;height:54px}

        /* ── BANNER ── */
        .pub-banner{width:100%;height:220px;overflow:hidden;border-bottom:2.5px solid #111110;position:relative}
        .pub-banner img{width:100%;height:100%;object-fit:cover;display:block}
        .pub-banner-grad{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.35) 100%)}

        /* ── MAIN LAYOUT ── */
        .pub-layout{max-width:1280px;margin:0 auto;padding:0 24px 80px;display:grid;grid-template-columns:280px 1fr;gap:32px;align-items:start}

        /* ── LEFT SIDEBAR ── */
        .pub-sidebar{position:sticky;top:70px;display:flex;flex-direction:column;gap:0}
        .pub-sidebar-card{background:#fff;border:2.5px solid #111110;border-radius:20px;overflow:hidden;box-shadow:4px 4px 0 #D4C9A8;margin-bottom:14px}

        /* ── AVATAR SECTION ── */
        .pub-avatar-wrap{padding:20px 20px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:12;border-bottom:1px solid #F5F0E8}
        .pub-avatar{width:86px;height:86px;border-radius:18px;border:3px solid #111110;overflow:hidden;background:#FFD400;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#111110;box-shadow:4px 4px 0 #111110;flex-shrink:0;margin-bottom:14px}
        .pub-role-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;border:2px solid #111110;width:fit-content;margin-bottom:10px}
        .pub-name{font-size:22px;font-weight:900;color:#111110;letter-spacing:-0.5px;line-height:1.1;margin-bottom:6px}
        .pub-tagline{font-size:13px;font-weight:600;color:#9B8F7A;line-height:1.5;margin-bottom:12px}

        /* ── STATS ROW ── */
        .pub-stats{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #F5F0E8}
        .pub-stat{padding:12px 8px;text-align:center;border-right:1px solid #F5F0E8}
        .pub-stat:last-child{border-right:none}
        .pub-stat-n{font-size:20px;font-weight:900;color:#111110;letter-spacing:-0.5px;display:block}
        .pub-stat-l{font-size:9px;font-weight:700;color:#9B8F7A;text-transform:uppercase;letter-spacing:0.1em;display:block;margin-top:2px}

        /* ── META INFO ── */
        .pub-meta{padding:14px 20px;display:flex;flex-direction:column;gap:9px}
        .pub-meta-row{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#5C5346;text-decoration:none}
        .pub-meta-row:hover{color:#111110}

        /* ── CTA BUTTONS ── */
        .pub-ctas{padding:14px 20px;display:flex;flex-direction:column;gap:8px;border-top:1px solid #F5F0E8}
        .btn-contact{width:100%;padding:11px;background:var(--accent);border:2.5px solid #111110;border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;color:#111110;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:3px 3px 0 #111110;transition:all .15s cubic-bezier(.16,1,.3,1);text-decoration:none}
        .btn-contact:hover{box-shadow:5px 5px 0 #111110;transform:translate(-1px,-1px)}
        .btn-share{width:100%;padding:9px;background:#fff;border:2px solid #E8E0D0;border-radius:12px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:#9B8F7A;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
        .btn-share:hover{border-color:#111110;color:#111110}

        /* ── RIGHT CONTENT ── */
        .pub-right{min-width:0;padding-top:0}

        /* ── PROFILE HEADER (right side) ── */
        .pub-name-header{display:none}

        /* ── TABS ── */
        .pub-tabs{display:flex;gap:0;border:2.5px solid #111110;border-radius:14px;overflow:hidden;margin-bottom:24px;background:#fff;width:fit-content}
        .pub-tab{display:flex;align-items:center;gap:7px;padding:10px 20px;border:none;border-right:1px solid #E8E0D0;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#9B8F7A;transition:all .15s cubic-bezier(.16,1,.3,1);white-space:nowrap}
        .pub-tab:last-child{border-right:none}
        .pub-tab.active{background:#111110;color:#FFD400}
        .pub-tab .tab-count{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;font-size:9px;font-weight:800;background:rgba(255,255,255,0.15);color:inherit}
        .pub-tab:not(.active) .tab-count{background:#F5F0E8;color:#9B8F7A}

        /* ── ARTWORK GRID ── */
        .art-grid-pub{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}
        .art-card-pub{background:#fff;border:2.5px solid #E8E0D0;border-radius:18px;overflow:hidden;cursor:pointer;transition:all .3s cubic-bezier(.16,1,.3,1);position:relative}
        .art-card-pub:hover{border-color:#111110;box-shadow:5px 7px 0 #111110;transform:translate(-2px,-3px)}
        .art-card-pub:hover .art-img-pub{transform:scale(1.06)}
        .art-img-pub{transition:transform .5s cubic-bezier(.16,1,.3,1)}
        .art-card-pub.featured-card{border-color:var(--accent);box-shadow:3px 4px 0 var(--accent)}

        /* ── COLLAB CARD ── */
        .collab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .collab-card{background:#fff;border:2.5px solid #E8E0D0;border-radius:18px;padding:20px;transition:all .2s cubic-bezier(.16,1,.3,1)}
        .collab-card:hover{border-color:#111110;box-shadow:4px 5px 0 #111110;transform:translate(-1px,-2px)}

        /* ── EVENT CARD ── */
        .event-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .event-card{background:#fff;border:2.5px solid #E8E0D0;border-radius:18px;overflow:hidden;transition:all .2s cubic-bezier(.16,1,.3,1)}
        .event-card:hover{border-color:#111110;box-shadow:4px 5px 0 #111110;transform:translate(-1px,-2px)}

        /* ── EMPTY ── */
        .pub-empty{padding:60px 24px;text-align:center;background:#fff;border:2.5px dashed #E0D8CA;border-radius:20px;color:#9B8F7A}
        .pub-empty-icon{font-size:40px;margin-bottom:12px}
        .pub-empty-txt{font-size:15px;font-weight:700}

        /* ── SECTION LABEL ── */
        .pub-section-label{font-size:11px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:0.16em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .pub-section-label::after{content:'';flex:1;height:1px;background:#E8E0D0}

        /* ── RESPONSIVE ── */
        @media(max-width:900px){
          .pub-layout{grid-template-columns:1fr;gap:0}
          .pub-sidebar{position:static}
          .pub-banner{height:160px}
          .pub-name-header{display:block}
          .pub-tabs{width:100%;overflow-x:auto}
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .fade-up{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
        .stagger-1{animation-delay:.05s}
        .stagger-2{animation-delay:.1s}
        .stagger-3{animation-delay:.15s}
        .stagger-4{animation-delay:.2s}
      `}</style>

      <style>{`
        :root { --accent: ${accent}; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="pub-nav">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🥭</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>artomango</span>
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/explore" style={{ textDecoration: "none" }}>
            <button style={{ padding: "6px 14px", border: "2px solid #E8E0D0", borderRadius: 9999, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
              Explore
            </button>
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button style={{ padding: "6px 14px", border: "2.5px solid #111110", borderRadius: 9999, background: accent, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
              Join free
            </button>
          </Link>
        </div>
      </nav>

      {/* ── BANNER ── */}
      <div className="pub-banner" style={{ background: settings?.banner_url ? undefined : `linear-gradient(135deg, ${accent} 0%, ${accent}66 60%, #FFFBEA 100%)` }}>
        {settings?.banner_url
          ? <><img src={settings.banner_url} alt="" /><div className="pub-banner-grad" /></>
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, opacity: 0.15 }}>🥭</div>
        }
      </div>

      {/* ── MAIN ── */}
      <div className="pub-layout">

        {/* ════════════════════ LEFT SIDEBAR ════════════════════ */}
        <aside className="pub-sidebar fade-up">

          {/* Profile card */}
          <div className="pub-sidebar-card">
            <div className="pub-avatar-wrap">
              {/* Avatar */}
              <div className="pub-avatar">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials
                }
              </div>

              {/* Role badge */}
              <div className="pub-role-badge" style={{ background: isVenue ? "#E0F2FE" : "#FFD400", color: isVenue ? "#0C4A6E" : "#111110" }}>
                {isVenue ? "🏛️ Venue" : "🎨 Artist"}
              </div>

              {/* Name */}
              <div className="pub-name">{storeName}</div>

              {/* Tagline */}
              {settings?.tagline && <div className="pub-tagline">{settings.tagline}</div>}
              {!settings?.tagline && profile?.bio && (
                <div className="pub-tagline" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{profile.bio}</div>
              )}
            </div>

            {/* Stats */}
            <div className="pub-stats">
              <div className="pub-stat">
                <span className="pub-stat-n">{artworkCount}</span>
                <span className="pub-stat-l">Works</span>
              </div>
              <div className="pub-stat">
                <span className="pub-stat-n">{followerCount}</span>
                <span className="pub-stat-l">Followers</span>
              </div>
              <div className="pub-stat">
                <span className="pub-stat-n">{events.length}</span>
                <span className="pub-stat-l">Shows</span>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="pub-sidebar-card">
            <div className="pub-meta">
              {profile?.location && (
                <div className="pub-meta-row"><MapPin size={14} color="#FF6B6B" style={{ flexShrink: 0 }} />{profile.location}</div>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="pub-meta-row">
                  <Globe size={14} color="#9B8F7A" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile.website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink size={11} color="#C0B8A8" style={{ flexShrink: 0, marginLeft: "auto" }} />
                </a>
              )}
              {profile?.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="pub-meta-row">
                  <Instagram size={14} color="#9B8F7A" style={{ flexShrink: 0 }} />
                  {profile.instagram.startsWith("@") ? profile.instagram : `@${profile.instagram}`}
                </a>
              )}
            </div>

            {/* CTA */}
            <div className="pub-ctas">
              {profile?.email && (
                <a href={`mailto:${profile.email}?subject=Hello from Artomango`} className="btn-contact">
                  <Mail size={14} /> Contact {isVenue ? "Venue" : "Artist"}
                </a>
              )}
              <button className="btn-share" onClick={copyUrl}>
                {copied ? <><Check size={13} color="#16A34A" /> Link copied!</> : <><Copy size={13} /> Share profile</>}
              </button>
            </div>
          </div>

          {/* Bio (expanded, if there's a tagline showing short version above) */}
          {profile?.bio && settings?.tagline && (
            <div className="pub-sidebar-card">
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>About</div>
                <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.7, fontWeight: 500 }}>{profile.bio}</p>
              </div>
            </div>
          )}

          {/* Artomango CTA */}
          <div style={{ background: "#111110", border: "2.5px solid #111110", borderRadius: 16, padding: "18px 20px", boxShadow: `4px 4px 0 ${accent}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 4 }}>🥭 artomango</div>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>Manage your art, find venues, grow your practice.</div>
            <Link href="/register" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "9px", background: accent, border: `2px solid ${accent}`, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                Get started free <ArrowRight size={12} />
              </button>
            </Link>
          </div>
        </aside>

        {/* ════════════════════ RIGHT CONTENT ════════════════════ */}
        <main className="pub-right fade-up stagger-2">

          {/* Mobile name header */}
          <div className="pub-name-header" style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px" }}>{storeName}</h1>
            {settings?.tagline && <p style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600, marginTop: 4 }}>{settings.tagline}</p>}
          </div>

          {/* Tabs */}
          <div className="pub-tabs" style={{ marginTop: 20 }}>
            {TABS.map(t => (
              <button key={t.id} className={`pub-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                <t.icon size={14} />
                {t.label}
                <span className="tab-count">{t.count}</span>
              </button>
            ))}
          </div>

          {/* ═══ STORE TAB ═══ */}
          {tab === "store" && (
            <div className="fade-up">
              {storeArtworks.length === 0 ? (
                <div className="pub-empty">
                  <div className="pub-empty-icon">🛍️</div>
                  <div className="pub-empty-txt">No artworks in store yet</div>
                  <div style={{ fontSize: 13, marginTop: 4, fontWeight: 500 }}>Check back soon!</div>
                </div>
              ) : (
                <>
                  {storeArtworks.some(a => a.featured) && (
                    <>
                      <div className="pub-section-label">Featured Works</div>
                      <div className="art-grid-pub" style={{ marginBottom: 28 }}>
                        {storeArtworks.filter(a => a.featured).map((aw, i) => (
                          <ArtworkCard key={aw.id} aw={aw} accent={accent} onClick={() => setSelectedArtwork(aw)} delay={i * 0.04} />
                        ))}
                      </div>
                      <div className="pub-section-label">All Store Works</div>
                    </>
                  )}
                  <div className="art-grid-pub">
                    {(storeArtworks.some(a => a.featured) ? storeArtworks.filter(a => !a.featured) : storeArtworks).map((aw, i) => (
                      <ArtworkCard key={aw.id} aw={aw} accent={accent} onClick={() => setSelectedArtwork(aw)} delay={i * 0.04} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ ARTWORKS TAB ═══ */}
          {tab === "artworks" && (
            <div className="fade-up">
              {allArtworks.length === 0 ? (
                <div className="pub-empty"><div className="pub-empty-icon">🎨</div><div className="pub-empty-txt">No artworks yet</div></div>
              ) : (
                <div className="art-grid-pub">
                  {allArtworks.map((aw, i) => (
                    <ArtworkCard key={aw.id} aw={aw} accent={accent} onClick={() => setSelectedArtwork(aw)} delay={i * 0.03} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ COLLABS TAB ═══ */}
          {tab === "collabs" && (
            <div className="fade-up">
              {collabs.length === 0 ? (
                <div className="pub-empty"><div className="pub-empty-icon">🤝</div><div className="pub-empty-txt">No collaborations yet</div></div>
              ) : (
                <div className="collab-grid">
                  {collabs.map((c, i) => {
                    const statusColors: Record<string, { bg: string; color: string }> = {
                      open:       { bg: "#DCFCE7", color: "#16A34A" },
                      Open:       { bg: "#DCFCE7", color: "#16A34A" },
                      "In Progress": { bg: "#EDE9FE", color: "#8B5CF6" },
                      in_progress:   { bg: "#EDE9FE", color: "#8B5CF6" },
                      completed:  { bg: "#F5F0E8", color: "#9B8F7A" },
                      Completed:  { bg: "#F5F0E8", color: "#9B8F7A" },
                    };
                    const sc = statusColors[c.status] || { bg: "#F5F0E8", color: "#9B8F7A" };
                    return (
                      <div key={c.id} className="collab-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", flex: 1, marginRight: 10 }}>{c.title}</div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            {c.type && <span style={{ padding: "2px 8px", borderRadius: 8, background: "#FEF9C3", color: "#854D0E", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{c.type}</span>}
                            <span style={{ padding: "2px 8px", borderRadius: 8, background: sc.bg, color: sc.color, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{c.status}</span>
                          </div>
                        </div>
                        {c.description && <p style={{ fontSize: 13, color: "#9B8F7A", lineHeight: 1.6, marginBottom: 10, fontWeight: 500 }}>{c.description.slice(0, 120)}{c.description.length > 120 ? "…" : ""}</p>}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          {c.partner_name && <span style={{ fontSize: 12, color: "#5C5346", fontWeight: 600 }}>With: <strong>{c.partner_name}</strong></span>}
                          {c.deadline && <span style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600, marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={11} />{fmtDate(c.deadline)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ EVENTS TAB ═══ */}
          {tab === "events" && (
            <div className="fade-up">
              {events.length === 0 ? (
                <div className="pub-empty"><div className="pub-empty-icon">🏛️</div><div className="pub-empty-txt">No public events yet</div></div>
              ) : (
                <div className="event-grid">
                  {events.map((ev, i) => {
                    const isCurrent = ev.status?.toLowerCase() === "current";
                    const isUpcoming = ev.status?.toLowerCase() === "upcoming";
                    const evStatusCfg: Record<string, { bg: string; color: string }> = {
                      current:  { bg: "#DCFCE7", color: "#16A34A" },
                      Current:  { bg: "#DCFCE7", color: "#16A34A" },
                      upcoming: { bg: "#EDE9FE", color: "#8B5CF6" },
                      Upcoming: { bg: "#EDE9FE", color: "#8B5CF6" },
                      planning: { bg: "#FEF9C3", color: "#CA8A04" },
                      Planning: { bg: "#FEF9C3", color: "#CA8A04" },
                      past:     { bg: "#F5F0E8", color: "#9B8F7A" },
                      Past:     { bg: "#F5F0E8", color: "#9B8F7A" },
                    };
                    const esc = evStatusCfg[ev.status] || { bg: "#F5F0E8", color: "#9B8F7A" };
                    return (
                      <div key={ev.id} className="event-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        {/* Cover image or accent bar */}
                        <div style={{ height: 100, position: "relative", overflow: "hidden", background: ev.cover_image ? "#FAF7F3" : `${accent}22` }}>
                          {ev.cover_image
                            ? <img src={ev.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🏛️</div>
                          }
                          <div style={{ position: "absolute", top: 10, left: 10 }}>
                            <span style={{ padding: "3px 9px", borderRadius: 8, background: esc.bg, color: esc.color, fontSize: 9, fontWeight: 800, textTransform: "uppercase", border: `1.5px solid ${esc.color}40` }}>{ev.status}</span>
                          </div>
                        </div>
                        <div style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{ev.title}</div>
                          {ev.venue && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 8 }}>
                              <MapPin size={11} color="#FF6B6B" />{ev.venue}
                            </div>
                          )}
                          {ev.description && <p style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.5, marginBottom: 8, fontWeight: 500 }}>{ev.description.slice(0, 100)}{ev.description.length > 100 ? "…" : ""}</p>}
                          {(ev.start_date || ev.end_date) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9B8F7A", fontWeight: 700 }}>
                              <CalendarDays size={11} />
                              {fmtDate(ev.start_date)}{ev.end_date ? ` — ${fmtDate(ev.end_date)}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "2.5px solid #111110", background: "#111110", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#555" }}>
          <span>🥭</span> <a href="/" style={{ color: "#FFD400", textDecoration: "none", fontWeight: 800 }}>artomango</a> · Manage, Exhibit, Collab
        </div>
        <Link href="/register" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD400" }}>Create your profile →</span>
        </Link>
      </div>

      {/* ── Artwork Modal ── */}
      {selectedArtwork && (
        <ArtworkModal aw={selectedArtwork} accent={accent} onClose={() => setSelectedArtwork(null)} />
      )}
    </>
  );
}

// ── Artwork card sub-component ─────────────────────────────────────
function ArtworkCard({ aw, accent, onClick, delay }: { aw: Artwork; accent: string; onClick: () => void; delay: number }) {
  const img = Array.isArray(aw.images) ? aw.images[0] : null;
  const sc = STATUS_CFG[aw.status] || { bg: "#F5F0E8", color: "#9B8F7A" };
  const sm = aw.sale_method ? SALE_CFG[aw.sale_method] : null;

  return (
    <div
      className={`art-card-pub${aw.featured ? " featured-card" : ""}`}
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      {aw.featured && (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 8, background: accent, border: "1.5px solid #111110", fontSize: 9, fontWeight: 800, color: "#111110", textTransform: "uppercase" }}>
          <Star size={9} fill="#111110" /> Featured
        </div>
      )}
      <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#FAF7F3", position: "relative" }}>
        {img
          ? <img src={img} alt={aw.title} className="art-img-pub" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={28} color="#D4C9A8" /></div>
        }
        {sm && (
          <div style={{ position: "absolute", bottom: 8, right: 8, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 9999, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", color: sm.color, fontSize: 10, fontWeight: 800, border: `1.5px solid ${sm.color}40` }}>
            {sm.icon}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{aw.title}</div>
        <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600, marginBottom: 10 }}>{[aw.medium, aw.year].filter(Boolean).join(" · ") || "—"}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: aw.price ? "#111110" : "#D4C9A8", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
            {aw.price ? `$${Number(aw.price).toLocaleString()}` : "—"}
          </div>
          <span style={{ padding: "3px 9px", borderRadius: 9999, background: sc.bg, color: sc.color, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{aw.status}</span>
        </div>
      </div>
    </div>
  );
}
