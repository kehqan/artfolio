"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Globe, Instagram, ExternalLink,
  ImageIcon, Star, X, ChevronLeft, ChevronRight,
  Users, CalendarDays, Handshake, ShoppingBag,
  Check, Copy, MessageSquare, Layers,
} from "lucide-react";
import MessageModal from "@/components/MessageModal";

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
type Tab = "store" | "artworks" | "collabs" | "events" | "moodboards";

type Moodboard = {
  id: string;
  provider: string;
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  og_image?: string;
  tags: string[];
};

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

// ── Artwork Detail Modal ───────────────────────────────────────────
function ArtworkModal({ aw, accent, profile, onClose }: {
  aw: Artwork; accent: string; profile: Profile; onClose: () => void;
}) {
  const [imgIdx, setImgIdx]   = useState(0);
  const [msgOpen, setMsgOpen] = useState(false);
  const imgs = (aw.images || []).filter(Boolean);
  const sm   = aw.sale_method ? SALE_CFG[aw.sale_method] : null;
  const dims = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean).join(" × ");
  const canBuy = aw.sale_method && aw.sale_method !== "not_for_sale" && aw.status?.toLowerCase() !== "sold";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 820, maxHeight: "92vh", overflowY: "auto", position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, zIndex: 10, width: 36, height: 36, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="#FFD400" />
        </button>

        {/* Left: image */}
        <div style={{ background: "#FAF7F3", borderRadius: "22px 0 0 22px", overflow: "hidden", position: "relative", minHeight: 420 }}>
          {imgs.length > 0 ? (
            <>
              <img src={imgs[imgIdx]} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {imgs.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronLeft size={15} /></button>
                  <button onClick={() => setImgIdx(i => Math.min(imgs.length - 1, i + 1))} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronRight size={15} /></button>
                  <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
                    {imgs.map((_, i) => <div key={i} onClick={() => setImgIdx(i)} style={{ width: 7, height: 7, borderRadius: "50%", background: i === imgIdx ? "#FFD400" : "rgba(255,255,255,.5)", border: "1px solid rgba(0,0,0,.3)", cursor: "pointer", transition: "all .2s" }} />)}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={60} color="#D4C9A8" /></div>
          )}
        </div>

        {/* Right: info */}
        <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>
            {sm && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, background: "#F5F0E8", border: "1.5px solid #E8E0D0", fontSize: 11, fontWeight: 800, color: sm.color, marginBottom: 12 }}>
                {sm.icon} {sm.label}
              </div>
            )}
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111110", marginBottom: 6, letterSpacing: "-.5px", lineHeight: 1.15 }}>{aw.title}</h2>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A", marginBottom: 16 }}>
              {[aw.year, aw.medium].filter(Boolean).join(" · ")}
            </div>
            {aw.description && (
              <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.75, marginBottom: 18, fontWeight: 500 }}>{aw.description}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {dims && <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>📐 {dims} cm</div>}
              {aw.framed && <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>🖼️ Framed</div>}
            </div>
            {aw.price && (
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-1px", marginBottom: 20 }}>
                {aw.currency || "€"}{aw.price.toLocaleString()}
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Primary: Contact Artist (message) */}
            {canBuy && (
              <button
                onClick={() => setMsgOpen(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "13px", background: accent, border: "2.5px solid #111110",
                  borderRadius: 13, fontSize: 14, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110",
                  transition: "all .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; }}
              >
                <MessageSquare size={15} />
                {aw.sale_method === "direct" ? "Buy This Artwork" : "Inquire About This Work"}
              </button>
            )}

            {/* Always show: general message */}
            <button
              onClick={() => setMsgOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px", background: "#fff", border: "2px solid #E8E0D0",
                borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", color: "#111110", transition: "border-color .15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}
            >
              <MessageSquare size={13} /> Message {profile.full_name.split(" ")[0]}
            </button>
          </div>
        </div>

        {/* Message modal */}
        <MessageModal
          isOpen={msgOpen}
          onClose={() => setMsgOpen(false)}
          recipientId={profile.id}
          recipientName={profile.full_name}
          recipientAvatar={profile.avatar_url}
          recipientRole={profile.role}
          contextType="artwork_inquiry"
          contextTitle={aw.title}
          contextId={aw.id}
          contextMeta={{
            emoji: "🖼️",
            label: "Artwork Inquiry",
            image: imgs[0],
            subtitle: [aw.year, aw.medium, aw.price ? `${aw.currency || "€"}${aw.price.toLocaleString()}` : null].filter(Boolean).join(" · "),
          }}
        />
      </div>
    </div>
  );
}

// ── Artwork Card ──────────────────────────────────────────────────
function ArtworkCard({ aw, accent, onClick, delay }: { aw: Artwork; accent: string; onClick: () => void; delay: number }) {
  const img = Array.isArray(aw.images) ? aw.images[0] : null;
  const sc  = STATUS_CFG[aw.status] || { bg: "#F5F0E8", color: "#9B8F7A" };
  const sm  = aw.sale_method ? SALE_CFG[aw.sale_method] : null;

  return (
    <div
      className={`art-card-pub${aw.featured ? " featured-card" : ""}`}
      onClick={onClick}
      style={{ animationDelay: `${delay}s`, position: "relative" }}
    >
      {aw.featured && (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 8, background: accent, border: "1.5px solid #111110", fontSize: 9, fontWeight: 800, color: "#111110", textTransform: "uppercase" }}>
          <Star size={9} fill="#111110" /> Featured
        </div>
      )}
      <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#FAF7F3", position: "relative" }}>
        {img
          ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s cubic-bezier(.16,1,.3,1)" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={40} color="#D4C9A8" /></div>
        }
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 4, letterSpacing: "-.3px" }}>{aw.title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", marginBottom: 10 }}>
          {[aw.year, aw.medium].filter(Boolean).join(" · ")}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 7, background: sc.bg, color: sc.color }}>{aw.status}</span>
            {sm && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 7, background: "#F5F0E8", color: "#5C5346" }}>{sm.icon} {sm.label}</span>}
          </div>
          {aw.price && <span style={{ fontSize: 15, fontWeight: 900, color: "#111110" }}>{aw.currency || "€"}{aw.price.toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function PublicProfilePage() {
  const params   = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile]               = useState<Profile | null>(null);
  const [settings, setSettings]             = useState<StoreSettings | null>(null);
  const [storeArtworks, setStoreArtworks]   = useState<Artwork[]>([]);
  const [allArtworks, setAllArtworks]       = useState<Artwork[]>([]);
  const [collabs, setCollabs]               = useState<Collab[]>([]);
  const [events, setEvents]                 = useState<Exhibition[]>([]);
  const [loading, setLoading]               = useState(true);
  const [notFound, setNotFound]             = useState(false);
  const [tab, setTab]                       = useState<Tab>("store");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [followerCount, setFollowerCount]   = useState(0);
  const [artworkCount, setArtworkCount]     = useState(0);
  const [copied, setCopied]                 = useState(false);
  const [msgOpen, setMsgOpen]               = useState(false); // ← NEW
  const [moodboards, setMoodboards]         = useState<Moodboard[]>([]);

  useEffect(() => { if (username) load(); }, [username]);

  async function load() {
    const sb = createClient();
    const { data: prof } = await sb.from("profiles").select("id, full_name, username, role, bio, location, avatar_url, website, email, instagram").eq("username", username).single();
    if (!prof) { setNotFound(true); setLoading(false); return; }
    setProfile(prof);

    const { data: ss } = await sb.from("store_settings").select("*").eq("user_id", prof.id).single();
    setSettings(ss || {});

    const { data: storeEntries } = await sb.from("store_artworks").select("artwork_id, sort_order, featured").eq("user_id", prof.id).order("sort_order");
    if (storeEntries?.length) {
      const ids = storeEntries.map(e => e.artwork_id);
      const { data: aws } = await sb.from("artworks").select("id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed").in("id", ids);
      const featureMap: Record<string, boolean> = {};
      storeEntries.forEach(e => { featureMap[e.artwork_id] = e.featured; });
      const orderMap: Record<string, number> = {};
      storeEntries.forEach(e => { orderMap[e.artwork_id] = e.sort_order; });
      setStoreArtworks((aws || []).map(aw => ({ ...aw, featured: featureMap[aw.id] || false })).sort((a, b) => (a.featured ? -1 : b.featured ? 1 : (orderMap[a.id] || 0) - (orderMap[b.id] || 0))));
    }

    const { data: allA } = await sb.from("artworks").select("id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed").eq("user_id", prof.id).order("created_at", { ascending: false });
    setAllArtworks(allA || []);
    setArtworkCount(allA?.length || 0);

    const { data: co } = await sb.from("collaborations").select("id, title, type, status, partner_name, description, deadline").eq("user_id", prof.id).limit(20);
    setCollabs(co || []);

    const { data: ex } = await sb.from("exhibitions").select("id, title, venue, start_date, end_date, status, cover_image, description").eq("user_id", prof.id).eq("is_public", true).order("start_date", { ascending: false }).limit(20);
    setEvents(ex || []);

    // Public moodboards
    const { data: mb } = await sb.from("moodboards").select("id,provider,url,title,description,thumbnail_url,og_image,tags").eq("user_id", prof.id).eq("is_public", true).order("created_at", { ascending: false });
    setMoodboards((mb || []).map((b: any) => ({ ...b, tags: b.tags || [] })));

    const { count } = await sb.from("follows").select("*", { count: "exact", head: true }).eq("following_id", prof.id);
    setFollowerCount(count || 0);
    setLoading(false);
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFBEA", fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>
      <div style={{ fontSize: 40, animation: "pulse 1.5s ease-in-out infinite" }}>🥭</div>
    </div>
  );

  if (notFound || !profile) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFBEA", fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌵</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Profile not found</div>
        <Link href="/" style={{ color: "#9B8F7A", fontSize: 14, fontWeight: 700 }}>← Back to Artomango</Link>
      </div>
    </div>
  );

  const accent = settings?.accent_color || "#FFD400";
  const storeName = settings?.store_name || profile.full_name;
  const isVenue = profile.role === "gallery" || profile.role === "venue";
  const displayArtworks = tab === "store" ? storeArtworks : allArtworks;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-family: 'Darker Grotesque', system-ui, sans-serif; }
        body { background: #FFFBEA; color: #111110; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes spin { to { transform:rotate(360deg); } }
        .art-card-pub {
          background: #fff; border: 2.5px solid #E8E0D0; border-radius: 18px; overflow: hidden;
          cursor: pointer; transition: all .25s cubic-bezier(.16,1,.3,1);
          animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both;
        }
        .art-card-pub:hover { border-color: #111110; box-shadow: 5px 6px 0 #111110; transform: translate(-2px,-3px); }
        .featured-card { border-color: ${accent}; border-width: 2.5px; }
        .pub-tab { padding: 8px 16px; border-radius: 99px; border: none; background: transparent; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; color: #9B8F7A; transition: all .15s; }
        .pub-tab:hover { color: #111110; background: rgba(0,0,0,.04); }
        .pub-tab.active { background: #111110; color: #FFD400; }
        .pub-meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #9B8F7A; text-decoration: none; }
        .pub-meta-row:hover { color: #111110; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>

        {/* ── BANNER ── */}
        {settings?.banner_url && (
          <div style={{ height: 200, borderRadius: "0 0 24px 24px", overflow: "hidden", marginBottom: -60, position: "relative" }}>
            <img src={settings.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.4))" }} />
          </div>
        )}

        {/* ── PROFILE HEADER ── */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "flex-end", padding: settings?.banner_url ? "70px 0 28px" : "32px 0 28px", borderBottom: "2px solid #E8E0D0" }}>

          {/* Avatar */}
          <div style={{ width: 88, height: 88, borderRadius: 22, border: "3px solid #111110", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#111110", flexShrink: 0, boxShadow: "4px 4px 0 #111110" }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (profile.full_name || "?")[0]
            }
          </div>

          {/* Info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-.7px" }}>{storeName}</h1>
              {profile.role && (
                <span style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 99, padding: "2px 10px", textTransform: "uppercase", letterSpacing: ".1em" }}>
                  {profile.role}
                </span>
              )}
            </div>
            {profile.bio && settings?.show_bio !== false && (
              <p style={{ fontSize: 14, color: "#5C5346", fontWeight: 500, lineHeight: 1.6, marginBottom: 10, maxWidth: 520 }}>{profile.bio}</p>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {profile.location && <span className="pub-meta-row"><MapPin size={13} /> {profile.location}</span>}
              {profile.website && (
                <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="pub-meta-row">
                  <Globe size={13} /> {profile.website.replace(/^https?:\/\//, "")} <ExternalLink size={10} />
                </a>
              )}
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="pub-meta-row">
                  <Instagram size={13} /> {profile.instagram.startsWith("@") ? profile.instagram : `@${profile.instagram}`}
                </a>
              )}
              <span className="pub-meta-row"><Users size={13} /> {followerCount} followers</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            {/* ── PRIMARY: Message button ── */}
            <button
              onClick={() => setMsgOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", background: accent,
                border: "2.5px solid #111110", borderRadius: 12,
                fontSize: 13, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", color: "#111110",
                boxShadow: "3px 3px 0 #111110", transition: "all .15s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; }}
            >
              <MessageSquare size={14} /> Message {isVenue ? "Venue" : "Artist"}
            </button>
            {/* Share */}
            <button
              onClick={copyUrl}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "border-color .15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}
            >
              {copied ? <><Check size={13} color="#16A34A" /> Copied!</> : <><Copy size={13} /> Share</>}
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 4, padding: "16px 0", borderBottom: "2px solid #E8E0D0", overflowX: "auto" }}>
          {[
            { key: "store",      label: `🛍 Store (${storeArtworks.length})` },
            { key: "artworks",   label: `🖼 All Works (${artworkCount})` },
            { key: "collabs",    label: `🤝 Collabs (${collabs.length})` },
            { key: "events",     label: `📅 Events (${events.length})` },
            { key: "moodboards", label: `🗂 Moodboards (${moodboards.length})` },
          ].map(t => (
            <button key={t.key} className={`pub-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as Tab)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: "28px 0 60px" }}>
          {/* Store / Artworks */}
          {(tab === "store" || tab === "artworks") && (
            <>
              {displayArtworks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: "#9B8F7A" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 4 }}>No artworks yet</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {tab === "store" ? "This artist hasn't added artworks to their store yet." : "No artworks found."}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
                  {displayArtworks.map((aw, i) => (
                    <ArtworkCard
                      key={aw.id} aw={aw} accent={accent} delay={i * 0.03}
                      onClick={() => setSelectedArtwork(aw)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Collabs */}
          {tab === "collabs" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {collabs.length === 0 ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 24px", color: "#9B8F7A" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🤝</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No collaborations listed.</div>
                </div>
              ) : collabs.map(c => (
                <div key={c.id} style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, padding: "18px 20px", boxShadow: "2px 3px 0 #E0D8CA" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>{c.type}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{c.title}</div>
                  {c.description && <p style={{ fontSize: 12, color: "#5C5346", lineHeight: 1.6, marginBottom: 10 }}>{c.description}</p>}
                  <div style={{ fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 7, background: c.status === "Open" ? "#DCFCE7" : "#F5F0E8", color: c.status === "Open" ? "#16A34A" : "#9B8F7A", display: "inline-block" }}>{c.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* Events */}
          {tab === "events" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {events.length === 0 ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 24px", color: "#9B8F7A" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No events listed.</div>
                </div>
              ) : events.map(ev => (
                <div key={ev.id} style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, overflow: "hidden", boxShadow: "2px 3px 0 #E0D8CA" }}>
                  {ev.cover_image && <img src={ev.cover_image} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} />}
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{ev.title}</div>
                    {ev.venue && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 4 }}>{ev.venue}</div>}
                    {ev.start_date && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9B8F7A", fontWeight: 700 }}>
                        <CalendarDays size={11} />{fmtDate(ev.start_date)}{ev.end_date ? ` — ${fmtDate(ev.end_date)}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ MOODBOARDS TAB ═══ */}
          {tab === "moodboards" && (
            <div className="fade-up">
              {moodboards.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: "#9B8F7A" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 4 }}>No moodboards shared yet</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20, fontSize: 13, fontWeight: 600, color: "#9B8F7A" }}>
                    {moodboards.length} visual {moodboards.length === 1 ? "board" : "boards"} shared publicly
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
                    {moodboards.map((board, i) => {
                      const PROV: Record<string, { emoji: string; label: string; grad: string }> = {
                        milanote:  { emoji: "🟤", label: "Milanote",  grad: "135deg,#3D2010,#8B4513,#D2691E" },
                        pinterest: { emoji: "📌", label: "Pinterest", grad: "135deg,#7F1D1D,#E60023,#FF4757" },
                        figma:     { emoji: "🎨", label: "Figma",     grad: "135deg,#4C1D95,#7C3AED,#A78BFA" },
                        miro:      { emoji: "🟡", label: "Miro",      grad: "135deg,#713F12,#CA8A04,#FBBF24" },
                        notion:    { emoji: "📓", label: "Notion",    grad: "135deg,#111827,#374151,#6B7280" },
                        other:     { emoji: "🔗", label: "Board",     grad: "135deg,#075985,#0EA5E9,#38BDF8" },
                      };
                      const cfg = PROV[board.provider] || PROV.other;
                      const thumb = board.thumbnail_url || board.og_image;

                      return (
                        <div key={board.id}
                          style={{ background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 20, overflow: "hidden", transition: "all .25s cubic-bezier(.16,1,.3,1)", animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) ${Math.min(i * .04, .3)}s both` }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="#111110"; el.style.boxShadow="5px 6px 0 #111110"; el.style.transform="translate(-2px,-3px)"; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="#E8E0D0"; el.style.boxShadow="none"; el.style.transform="none"; }}>

                          {/* Hero */}
                          <div style={{ height: 200, position: "relative", overflow: "hidden" }}>
                            {thumb
                              ? <img src={thumb} alt={board.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", background: `linear-gradient(${cfg.grad})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 44, opacity: .7, marginBottom: 6 }}>{cfg.emoji}</div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: ".14em" }}>{cfg.label}</div>
                                  </div>
                                </div>
                            }
                            {/* Gradient overlay */}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)" }} />
                            {/* Liquid glass provider badge */}
                            <div style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: 9, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: ".1em" }}>
                              {cfg.emoji} {cfg.label}
                            </div>
                            {/* Title overlay */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 13px 12px" }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{board.title}</div>
                              {board.description && (
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{board.description}</div>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div style={{ padding: "11px 13px 13px" }}>
                            {board.tags.length > 0 && (
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                                {board.tags.map(t => (
                                  <span key={t} style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 99, background: "#F5F0E8", border: "1px solid #E8E0D0", fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>{t}</span>
                                ))}
                              </div>
                            )}
                            <a href={board.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
                              <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", background: "#111110", border: "2px solid #111110", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#FFD400", transition: "background .12s" }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background="#000")}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background="#111110")}>
                                <ExternalLink size={12} /> Open Board
                              </button>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "2.5px solid #111110", background: "#111110", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#555" }}>
          <img src="/logo.png" alt="" style={{width:18,height:18,objectFit:"contain"}} /> <a href="/" style={{ color: "#FFD400", textDecoration: "none", fontWeight: 800 }}>artomango</a> · Manage, Exhibit, Collab
        </div>
        <Link href="/register" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD400" }}>Create your profile →</span>
        </Link>
      </div>

      {/* ── Artwork Modal ── */}
      {selectedArtwork && (
        <ArtworkModal
          aw={selectedArtwork}
          accent={accent}
          profile={profile}
          onClose={() => setSelectedArtwork(null)}
        />
      )}

      {/* ── Direct Message Modal (profile-level) ── */}
      <MessageModal
        isOpen={msgOpen}
        onClose={() => setMsgOpen(false)}
        recipientId={profile.id}
        recipientName={profile.full_name}
        recipientAvatar={profile.avatar_url}
        recipientRole={profile.role}
        contextType="direct"
        contextTitle={`Message to ${profile.full_name}`}
        contextMeta={{
          emoji: isVenue ? "🏛️" : "🎨",
          label: isVenue ? "Venue" : "Artist",
          subtitle: profile.location || "",
        }}
      />
    </>
  );
}
