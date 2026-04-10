"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Store, Eye, EyeOff, Copy, Check, ExternalLink,
  Plus, X, Star, GripVertical, Upload, Palette,
  Globe, Handshake, MapPin, CalendarDays, QrCode,
  ImageIcon, ArrowRight, Settings, Zap, Layout,
  LayoutGrid, List, Rows3, ChevronDown, Save,
  Sparkles, Users, ShoppingBag,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
type StoreSettings = {
  id?: string;
  store_name: string;
  tagline: string;
  accent_color: string;
  banner_url: string;
  show_bio: boolean;
  show_collabs: boolean;
  show_events: boolean;
  show_location: boolean;
  is_active: boolean;
  layout: string;
};

type Artwork = {
  id: string; title: string; status: string; images?: string[];
  price?: number; medium?: string; sale_method?: string;
  currency?: string;
};

type StoreArtwork = {
  artwork_id: string;
  sort_order: number;
  featured: boolean;
};

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "", tagline: "", accent_color: "#FFD400",
  banner_url: "", show_bio: true, show_collabs: true,
  show_events: true, show_location: true, is_active: false,
  layout: "grid",
};

const COLOR_PRESETS = [
  { hex: "#FFD400", name: "Mango" },
  { hex: "#FF6B6B", name: "Coral" },
  { hex: "#4ECDC4", name: "Teal" },
  { hex: "#8B5CF6", name: "Violet" },
  { hex: "#111110", name: "Noir" },
  { hex: "#16A34A", name: "Forest" },
  { hex: "#EA580C", name: "Burnt" },
  { hex: "#0EA5E9", name: "Sky" },
  { hex: "#D946EF", name: "Fuchsia" },
  { hex: "#F5F0E8", name: "Cream" },
];

const LAYOUT_OPTIONS = [
  { key: "grid",    label: "Grid",    icon: LayoutGrid, desc: "Classic grid layout" },
  { key: "masonry", label: "Masonry", icon: Rows3,      desc: "Pinterest-style flow" },
  { key: "list",    label: "List",    icon: List,        desc: "Detailed list view" },
];

const SALE_METHOD_ICON: Record<string, string> = {
  direct: "🛒", inquiry: "✉️", price_on_request: "💬",
  auction: "🔨", not_for_sale: "🚫",
};

/* ══════════════════════════════════════════════════════════════════ */
export default function MyStorePage() {
  const [userId, setUserId]               = useState<string | null>(null);
  const [username, setUsername]            = useState<string | null>(null);
  const [settings, setSettings]           = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [allArtworks, setAllArtworks]     = useState<Artwork[]>([]);
  const [storeArtworks, setStoreArtworks] = useState<StoreArtwork[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [copied, setCopied]              = useState(false);
  const [activeTab, setActiveTab]         = useState<"artworks" | "customize" | "settings">("artworks");
  const [showQR, setShowQR]               = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [customColor, setCustomColor]     = useState("");
  const [profileName, setProfileName]     = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const storeUrl = username
    ? `${typeof window !== "undefined" ? window.location.origin : "https://artfolio-tawny.vercel.app"}/${username}`
    : null;

  const qrUrl = storeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(storeUrl)}&bgcolor=FFFBEA&color=111110&margin=16`
    : null;

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Profile
    const { data: prof } = await supabase.from("profiles").select("username, full_name").eq("id", user.id).single();
    setUsername(prof?.username || null);
    setProfileName(prof?.full_name || "");

    // Store settings
    const { data: ss } = await supabase.from("store_settings").select("*").eq("user_id", user.id).single();
    if (ss) {
      setSettings({
        id: ss.id,
        store_name: ss.store_name || "",
        tagline: ss.tagline || "",
        accent_color: ss.accent_color || "#FFD400",
        banner_url: ss.banner_url || "",
        show_bio: ss.show_bio ?? true,
        show_collabs: ss.show_collabs ?? true,
        show_events: ss.show_events ?? true,
        show_location: ss.show_location ?? true,
        is_active: ss.is_active ?? false,
        layout: ss.layout || "grid",
      });
    }

    // All artworks
    const { data: aw } = await supabase.from("artworks")
      .select("id, title, status, images, price, medium, sale_method, currency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAllArtworks(aw || []);

    // Store artworks
    const { data: sa } = await supabase.from("store_artworks")
      .select("artwork_id, sort_order, featured")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setStoreArtworks(sa || []);

    setLoading(false);
  }

  /* ── Save settings ──────────────────────────────────────────── */
  async function saveAll() {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();

    // Upsert store settings
    await supabase.from("store_settings").upsert({
      user_id: userId,
      store_name: settings.store_name || null,
      tagline: settings.tagline || null,
      accent_color: settings.accent_color,
      banner_url: settings.banner_url || null,
      show_bio: settings.show_bio,
      show_collabs: settings.show_collabs,
      show_events: settings.show_events,
      show_location: settings.show_location,
      is_active: settings.is_active,
      layout: settings.layout,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Sync store artworks
    await supabase.from("store_artworks").delete().eq("user_id", userId);
    if (storeArtworks.length > 0) {
      await supabase.from("store_artworks").insert(
        storeArtworks.map((sa, i) => ({
          user_id: userId,
          artwork_id: sa.artwork_id,
          sort_order: i,
          featured: sa.featured,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  /* ── Toggle artwork in store ─────────────────────────────────── */
  function toggleArtwork(artworkId: string) {
    setStoreArtworks(prev => {
      const exists = prev.find(sa => sa.artwork_id === artworkId);
      if (exists) return prev.filter(sa => sa.artwork_id !== artworkId);
      return [...prev, { artwork_id: artworkId, sort_order: prev.length, featured: false }];
    });
  }

  function toggleFeatured(artworkId: string) {
    setStoreArtworks(prev =>
      prev.map(sa => sa.artwork_id === artworkId ? { ...sa, featured: !sa.featured } : sa)
    );
  }

  function moveArtwork(artworkId: string, dir: -1 | 1) {
    setStoreArtworks(prev => {
      const idx = prev.findIndex(sa => sa.artwork_id === artworkId);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((sa, i) => ({ ...sa, sort_order: i }));
    });
  }

  /* ── Banner upload ──────────────────────────────────────────── */
  async function handleBannerUpload(file: File) {
    if (!userId) return;
    setBannerUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/store-banner-${Date.now()}.${ext}`;
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, contentType: file.type }),
      });
      const { signedUrl } = await res.json();
      if (signedUrl) {
        await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        const { data: { publicUrl } } = supabase.storage.from("artwork-images").getPublicUrl(path);
        setSettings(p => ({ ...p, banner_url: publicUrl }));
      }
    } catch { /* silent */ }
    setBannerUploading(false);
  }

  /* ── Copy URL ──────────────────────────────────────────────── */
  function copyUrl() {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  const inStore = new Set(storeArtworks.map(sa => sa.artwork_id));
  const storeArtworksFull = storeArtworks
    .map(sa => ({ ...sa, artwork: allArtworks.find(a => a.id === sa.artwork_id) }))
    .filter(sa => sa.artwork);

  const sf = (k: keyof StoreSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings(p => ({ ...p, [k]: e.target.value }));

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#9B8F7A", fontSize: 14, fontWeight: 700 }}>
      Loading MyStore…
    </div>
  );

  return (
    <>
      <style>{`
        .ms-card { background:#fff; border:2.5px solid #111110; border-radius:20px; box-shadow:4px 5px 0 #D4C9A8; overflow:hidden; }
        .ms-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:2px solid #111110; background:#FAF7F3; border-radius:20px 20px 0 0; }
        .ms-toggle { width:48px; height:26px; border-radius:13px; border:2.5px solid #111110; cursor:pointer; position:relative; transition:background 0.2s; flex-shrink:0; }
        .ms-toggle-knob { width:18px; height:18px; border-radius:50%; background:#111110; position:absolute; top:1.5px; transition:left 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .ms-tab { padding:10px 18px; border:none; border-bottom:3px solid transparent; background:none; font-family:inherit; font-size:13px; font-weight:700; color:#9B8F7A; cursor:pointer; transition:all 0.15s; white-space:nowrap; display:flex; align-items:center; gap:6px; }
        .ms-tab:hover { color:#111110; }
        .ms-tab.active { color:#111110; border-bottom-color:#FFD400; }
        .ms-aw-card { display:flex; align-items:center; gap:14px; padding:12px 16px; border-bottom:1px solid #F5F0E8; transition:background 0.12s; }
        .ms-aw-card:hover { background:#FFFBEA; }
        .ms-aw-card:last-child { border-bottom:none; }
        .ms-color-swatch { width:32px; height:32px; border-radius:10px; border:2.5px solid #E8E0D0; cursor:pointer; transition:all 0.15s cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; }
        .ms-color-swatch:hover { transform:scale(1.12); }
        .ms-color-swatch.active { border-color:#111110; box-shadow:2px 2px 0 #111110; transform:scale(1.08); }
        .ms-input { width:100%; padding:10px 13px; border:2px solid #E8E0D0; border-radius:12px; font-size:14px; font-family:inherit; font-weight:600; color:#111110; outline:none; background:#fff; transition:border-color 0.15s,box-shadow 0.15s; }
        .ms-input:focus { border-color:#FFD400; box-shadow:0 0 0 3px rgba(255,212,0,0.15); }
        .ms-label { display:block; font-size:10px; font-weight:800; color:#9B8F7A; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:7px; }
        .ms-toggle-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid #F5F0E8; }
        .ms-toggle-row:last-child { border-bottom:none; }
        @keyframes ripeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .ripe-in { animation:ripeIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div>
        {/* ═══ HEADER ═══ */}
        <div className="ripe-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: settings.accent_color, border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0 #111110" }}>
              <ShoppingBag size={22} color="#111110" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1 }}>MyStore</h1>
              <p style={{ fontSize: 13, color: "#9B8F7A", margin: "2px 0 0", fontWeight: 600 }}>
                Your public storefront · {storeArtworks.length} artwork{storeArtworks.length !== 1 ? "s" : ""} published
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Store active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: settings.is_active ? "#DCFCE7" : "#F5F0E8", border: `2px solid ${settings.is_active ? "#16A34A" : "#E8E0D0"}`, borderRadius: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: settings.is_active ? "#16A34A" : "#9B8F7A" }}>
                {settings.is_active ? "Store Live" : "Store Offline"}
              </span>
              <div className="ms-toggle"
                style={{ background: settings.is_active ? "#16A34A" : "#E8E0D0" }}
                onClick={() => setSettings(p => ({ ...p, is_active: !p.is_active }))}>
                <div className="ms-toggle-knob" style={{ left: settings.is_active ? 23 : 2, background: settings.is_active ? "#fff" : "#111110" }} />
              </div>
            </div>

            {/* Save button */}
            <button onClick={saveAll} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", background: saved ? "#4ECDC4" : "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110", transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)", fontFamily: "inherit", color: "#111110" }}>
              {saved ? <><Check size={14} /> Saved!</> : saving ? "Saving…" : <><Save size={14} /> Save Store</>}
            </button>
          </div>
        </div>

        {/* ═══ STORE URL BAR ═══ */}
        {username ? (
          <div className="ms-card ripe-in" style={{ marginBottom: 20, animationDelay: "0.05s" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 12, padding: "10px 14px" }}>
                <Globe size={14} color="#9B8F7A" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                  {storeUrl}
                </span>
              </div>
              <button onClick={copyUrl}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "2px solid #111110", borderRadius: 10, background: copied ? "#DCFCE7" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {copied ? <><Check size={13} color="#16A34A" /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
              <a href={storeUrl || "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "2px solid #111110", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <ExternalLink size={13} /> Preview
                </button>
              </a>
              <button onClick={() => setShowQR(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", border: "2px solid #111110", borderRadius: 10, background: showQR ? "#FFD400" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                <QrCode size={13} /> QR Code
              </button>
            </div>

            {/* QR Code panel */}
            {showQR && qrUrl && (
              <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 20, borderTop: "1px solid #F5F0E8", paddingTop: 16 }}>
                <div style={{ border: "2.5px solid #111110", borderRadius: 16, overflow: "hidden", boxShadow: "3px 3px 0 #D4C9A8", flexShrink: 0 }}>
                  <img src={qrUrl} alt="Store QR Code" style={{ width: 160, height: 160, display: "block" }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 6 }}>Share your store</div>
                  <div style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.6, marginBottom: 12 }}>
                    Print this QR code on business cards, exhibition labels, or anywhere your audience can scan to visit your store.
                  </div>
                  <a href={qrUrl} download={`mystore-${username}-qr.png`} style={{ textDecoration: "none" }}>
                    <button style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2px solid #111110", borderRadius: 8, background: "#FFD400", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Download QR
                    </button>
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ms-card ripe-in" style={{ marginBottom: 20, animationDelay: "0.05s" }}>
            <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 12 }}>
              <Sparkles size={20} color="#CA8A04" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#854D0E" }}>Set a username first to get your store URL</div>
                <div style={{ fontSize: 12, color: "#9B8F7A", marginTop: 2 }}>Go to Profile Settings → set your username</div>
              </div>
              <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
                <button style={{ padding: "8px 14px", border: "2px solid #111110", borderRadius: 8, background: "#FFD400", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Set Username →
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ═══ TABS ═══ */}
        <div className="ripe-in" style={{ display: "flex", borderBottom: "2px solid #E8E0D0", marginBottom: 20, gap: 0, animationDelay: "0.1s" }}>
          {([
            { id: "artworks", label: "Store Artworks", icon: ImageIcon, count: storeArtworks.length },
            { id: "customize", label: "Customize", icon: Palette },
            { id: "settings", label: "Visibility", icon: Settings },
          ] as const).map(tab => (
            <button key={tab.id} className={`ms-tab${activeTab === tab.id ? " active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={14} />
              {tab.label}
              {"count" in tab && tab.count !== undefined && (
                <span style={{ background: activeTab === tab.id ? "#111110" : "#E8E0D0", color: activeTab === tab.id ? "#FFD400" : "#9B8F7A", padding: "1px 7px", borderRadius: 9999, fontSize: 10, fontWeight: 800 }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ TAB: STORE ARTWORKS ═══ */}
        {activeTab === "artworks" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

            {/* Left: Published artworks (in store) */}
            <div className="ms-card">
              <div className="ms-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#16A34A", border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>In Your Store</span>
                  <span style={{ padding: "1px 8px", borderRadius: 9999, background: "#DCFCE7", color: "#16A34A", fontSize: 11, fontWeight: 800 }}>{storeArtworks.length}</span>
                </div>
              </div>

              {storeArtworksFull.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <ShoppingBag size={28} color="#D4C9A8" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#9B8F7A" }}>No artworks in your store yet</div>
                  <div style={{ fontSize: 12, color: "#C0B8A8", marginTop: 4 }}>Select artworks from the right to add them →</div>
                </div>
              ) : (
                <div>
                  {storeArtworksFull.map((sa, idx) => {
                    const aw = sa.artwork!;
                    const img = Array.isArray(aw.images) ? aw.images[0] : null;
                    return (
                      <div key={sa.artwork_id} className="ms-aw-card">
                        {/* Reorder handle */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button onClick={() => moveArtwork(sa.artwork_id, -1)} disabled={idx === 0}
                            style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.2 : 0.5, padding: 0, lineHeight: 1, fontSize: 10 }}>▲</button>
                          <button onClick={() => moveArtwork(sa.artwork_id, 1)} disabled={idx === storeArtworksFull.length - 1}
                            style={{ background: "none", border: "none", cursor: idx === storeArtworksFull.length - 1 ? "default" : "pointer", opacity: idx === storeArtworksFull.length - 1 ? 0.2 : 0.5, padding: 0, lineHeight: 1, fontSize: 10 }}>▼</button>
                        </div>

                        {/* Thumbnail */}
                        <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "2px solid #E8E0D0", flexShrink: 0, background: "#FAF7F3" }}>
                          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={16} color="#D4C9A8" /></div>}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                            {aw.price ? `$${Number(aw.price).toLocaleString()}` : "No price"} · {aw.status}
                          </div>
                        </div>

                        {/* Featured star */}
                        <button onClick={() => toggleFeatured(sa.artwork_id)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${sa.featured ? "#FFD400" : "#E8E0D0"}`, background: sa.featured ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}
                          title={sa.featured ? "Unfeature" : "Mark as featured"}>
                          <Star size={13} color="#111110" fill={sa.featured ? "#111110" : "none"} />
                        </button>

                        {/* Remove */}
                        <button onClick={() => toggleArtwork(sa.artwork_id)}
                          style={{ width: 30, height: 30, borderRadius: 8, border: "2px solid #FFE4E6", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                          <X size={12} color="#FF6B6B" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: All artworks (pick to add) */}
            <div className="ms-card">
              <div className="ms-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#9B8F7A", border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Your Inventory</span>
                  <span style={{ padding: "1px 8px", borderRadius: 9999, background: "#F5F0E8", color: "#9B8F7A", fontSize: 11, fontWeight: 800 }}>{allArtworks.length}</span>
                </div>
              </div>

              {allArtworks.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <ImageIcon size={28} color="#D4C9A8" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#9B8F7A" }}>No artworks yet</div>
                  <Link href="/dashboard/artworks/new" style={{ fontSize: 12, fontWeight: 700, color: "#FFD400", textDecoration: "none" }}>
                    + Add your first artwork
                  </Link>
                </div>
              ) : (
                <div>
                  {allArtworks.map(aw => {
                    const isIn = inStore.has(aw.id);
                    const img = Array.isArray(aw.images) ? aw.images[0] : null;
                    return (
                      <div key={aw.id} className="ms-aw-card" style={{ opacity: isIn ? 0.5 : 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "2px solid #E8E0D0", flexShrink: 0, background: "#FAF7F3" }}>
                          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={16} color="#D4C9A8" /></div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                            {aw.medium || "—"} · {aw.price ? `$${Number(aw.price).toLocaleString()}` : "No price"}
                            {aw.sale_method && ` ${SALE_METHOD_ICON[aw.sale_method] || ""}`}
                          </div>
                        </div>
                        <button onClick={() => toggleArtwork(aw.id)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `2px solid ${isIn ? "#16A34A" : "#111110"}`, background: isIn ? "#DCFCE7" : "#FFD400", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all 0.15s", flexShrink: 0 }}>
                          {isIn ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: CUSTOMIZE ═══ */}
        {activeTab === "customize" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

            {/* Left: Branding */}
            <div className="ms-card">
              <div className="ms-header">
                <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Branding</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label className="ms-label">Store Name</label>
                  <input className="ms-input" value={settings.store_name} onChange={sf("store_name")}
                    placeholder={profileName ? `${profileName}'s Store` : "My Art Store"} />
                  <div style={{ fontSize: 10, color: "#C0B8A8", marginTop: 4 }}>Leave empty to use your profile name</div>
                </div>
                <div>
                  <label className="ms-label">Tagline</label>
                  <input className="ms-input" value={settings.tagline} onChange={sf("tagline")}
                    placeholder="e.g. Original artworks from Prague" />
                </div>
                <div>
                  <label className="ms-label">Banner Image</label>
                  {settings.banner_url && (
                    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "2px solid #E8E0D0", marginBottom: 10, aspectRatio: "3/1" }}>
                      <img src={settings.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => setSettings(p => ({ ...p, banner_url: "" }))}
                        style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 8, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <X size={12} color="#FFD400" />
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => bannerInputRef.current?.click()}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <Upload size={13} /> {bannerUploading ? "Uploading…" : "Upload banner"}
                    </button>
                    <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])} />
                    <span style={{ fontSize: 11, color: "#C0B8A8", display: "flex", alignItems: "center" }}>or paste URL below</span>
                  </div>
                  <input className="ms-input" value={settings.banner_url} onChange={sf("banner_url")}
                    placeholder="https://..." style={{ marginTop: 8 }} />
                </div>
              </div>
            </div>

            {/* Right: Colors + Layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ms-card">
                <div className="ms-header">
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Accent Color</span>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {COLOR_PRESETS.map(c => (
                      <div key={c.hex} className={`ms-color-swatch${settings.accent_color === c.hex ? " active" : ""}`}
                        style={{ background: c.hex }}
                        onClick={() => setSettings(p => ({ ...p, accent_color: c.hex }))}
                        title={c.name} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label className="ms-label" style={{ marginBottom: 0, whiteSpace: "nowrap" }}>Custom hex</label>
                    <input className="ms-input" style={{ maxWidth: 120, fontFamily: "monospace" }}
                      value={customColor || settings.accent_color}
                      onChange={e => {
                        setCustomColor(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          setSettings(p => ({ ...p, accent_color: e.target.value }));
                        }
                      }}
                      placeholder="#FFD400" />
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: settings.accent_color, border: "2.5px solid #111110", flexShrink: 0 }} />
                  </div>
                </div>
              </div>

              <div className="ms-card">
                <div className="ms-header">
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Store Layout</span>
                </div>
                <div style={{ padding: 20, display: "flex", gap: 10 }}>
                  {LAYOUT_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = settings.layout === opt.key;
                    return (
                      <button key={opt.key} onClick={() => setSettings(p => ({ ...p, layout: opt.key }))}
                        style={{ flex: 1, padding: "14px 12px", borderRadius: 14, border: `2.5px solid ${active ? "#111110" : "#E8E0D0"}`, background: active ? "#FFD400" : "#fff", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "all 0.15s", boxShadow: active ? "2px 2px 0 #111110" : "none" }}>
                        <Icon size={20} color="#111110" style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{opt.label}</div>
                        <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600, marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: VISIBILITY SETTINGS ═══ */}
        {activeTab === "settings" && (
          <div style={{ maxWidth: 560 }}>
            <div className="ms-card">
              <div className="ms-header">
                <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>What visitors can see</span>
              </div>
              <div style={{ padding: "4px 20px 16px" }}>
                {[
                  { key: "show_bio",      label: "Artist Bio & Profile", desc: "Your name, photo, bio, and website link", icon: Users },
                  { key: "show_collabs",   label: "Collaborations",       desc: "Active collabs and partnership requests", icon: Handshake },
                  { key: "show_events",    label: "Events & Exhibitions", desc: "Upcoming and current shows",             icon: CalendarDays },
                  { key: "show_location",  label: "Location",             desc: "Your city and map presence",             icon: MapPin },
                ].map(item => {
                  const Icon = item.icon;
                  const on = settings[item.key as keyof StoreSettings] as boolean;
                  return (
                    <div key={item.key} className="ms-toggle-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: on ? "#F0FDF4" : "#F5F0E8", border: `1.5px solid ${on ? "#4ECDC4" : "#E8E0D0"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={16} color={on ? "#16A34A" : "#9B8F7A"} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111110" }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500 }}>{item.desc}</div>
                        </div>
                      </div>
                      <div className="ms-toggle"
                        style={{ background: on ? "#4ECDC4" : "#E8E0D0" }}
                        onClick={() => setSettings(p => ({ ...p, [item.key]: !on }))}>
                        <div className="ms-toggle-knob" style={{ left: on ? 23 : 2, background: on ? "#fff" : "#111110" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
