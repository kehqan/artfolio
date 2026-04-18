"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Edit2, Copy, Trash2, ChevronLeft, ChevronRight,
  X, ImageIcon, Shield, ExternalLink, Hash, Monitor,
  Layers, MapPin, Check, FileText, DollarSign, Clock,
  Eye, EyeOff, Maximize2,
} from "lucide-react";

// ── Stage config ───────────────────────────────────────────────────
const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8", grad: "135deg,#57534E,#9B8F7A" },
  { key: "in_progress", label: "In Progress", color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED" },
  { key: "complete",    label: "Complete",    color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A" },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04" },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#E5E5E5", grad: "135deg,#000,#374151" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const ART_TYPE_CFG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  physical: { label: "Physical",       emoji: "🖼️", color: "#7C3AED", bg: "#EDE9FE" },
  digital:  { label: "Digital",        emoji: "💻", color: "#0EA5E9", bg: "#E0F2FE" },
  print:    { label: "Print / Edition",emoji: "🖨️", color: "#CA8A04", bg: "#FEF9C3" },
  mixed:    { label: "Mixed Media",    emoji: "🎨", color: "#EC4899", bg: "#FCE7F3" },
};

const AUTH_CFG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  original:        { label: "Original Work",   emoji: "✦", color: "#16A34A", bg: "#DCFCE7" },
  limited_edition: { label: "Limited Edition", emoji: "◈", color: "#CA8A04", bg: "#FEF9C3" },
  reproduction:    { label: "Reproduction",    emoji: "◇", color: "#9B8F7A", bg: "#F5F0E8" },
  pending:         { label: "Pending",         emoji: "○", color: "#9B8F7A", bg: "#F5F0E8" },
};

const SALE_LABELS: Record<string, { label: string; emoji: string }> = {
  direct:           { label: "Direct purchase",  emoji: "🛒" },
  inquiry:          { label: "Inquiry only",      emoji: "✉️" },
  price_on_request: { label: "Price on request",  emoji: "💬" },
  auction:          { label: "Auction",           emoji: "🔨" },
  not_for_sale:     { label: "Not for sale",      emoji: "🚫" },
};

const PROV_EMOJI: Record<string, string> = { milanote:"🟤", pinterest:"📌", figma:"🎨", miro:"🟡", notion:"📓", other:"🔗" };
const PROV_GRAD: Record<string, string> = {
  milanote:  "135deg,#3D2010,#8B4513",
  pinterest: "135deg,#7F1D1D,#E60023",
  figma:     "135deg,#4C1D95,#7C3AED",
  miro:      "135deg,#713F12,#CA8A04",
  notion:    "135deg,#111827,#374151",
  other:     "135deg,#075985,#0EA5E9",
};

function toStageKey(s: string | null | undefined) {
  const k = String(s || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[k] ? k : "available";
}

// ── Shared info row ────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F0E8", gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", textAlign: "right", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", ...style }}>
      {children}
    </div>
  );
}
function CardHeader({ title, emoji, right }: { title: string; emoji?: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
        <span style={{ fontSize: 13, fontWeight: 900, color: "#111110", letterSpacing: "-.2px" }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [artwork,    setArtwork]    = useState<any>(null);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lightbox,   setLightbox]   = useState<number | null>(null);
  const [activeImg,  setActiveImg]  = useState(0);
  const [stageOpen,  setStageOpen]  = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from("artworks").select("*").eq("id", id).single();
    setArtwork(data);

    // Load linked moodboards if any
    if (data?.linked_moodboard_ids?.length) {
      const { data: mb } = await sb
        .from("moodboards")
        .select("id,provider,url,title,description,thumbnail_url,og_image,tags")
        .in("id", data.linked_moodboard_ids);
      setMoodboards(mb || []);
    }
    setLoading(false);
  }

  async function moveToStage(status: string) {
    const sb = createClient();
    await sb.from("artworks").update({ status }).eq("id", id);
    setArtwork((p: any) => ({ ...p, status }));
    setStageOpen(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this artwork permanently? This cannot be undone.")) return;
    const sb = createClient();
    await sb.from("artworks").delete().eq("id", id);
    router.push("/dashboard/artworks");
  }

  async function handleDuplicate() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !artwork) return;
    const { id: _id, created_at, updated_at, ...rest } = artwork;
    const { data } = await sb.from("artworks").insert({ ...rest, user_id: user.id, title: `${artwork.title} (copy)`, status: "concept" }).select().single();
    if (data) router.push(`/dashboard/artworks/${data.id}`);
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #FFD400", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading artwork…</div>
      </div>
    </>
  );

  if (!artwork) return (
    <>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111110", marginBottom: 8 }}>Artwork not found</div>
        <Link href="/dashboard/artworks"><button style={{ padding: "10px 20px", background: "#FFD400", border: "2px solid #111110", borderRadius: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>← Back to artworks</button></Link>
      </div>
    </>
  );

  const images     = Array.isArray(artwork.images) ? artwork.images.filter(Boolean) : [];
  const sk         = toStageKey(artwork.status);
  const stage      = STAGE_MAP[sk];
  const atCfg      = ART_TYPE_CFG[artwork.art_type] || ART_TYPE_CFG.physical;
  const authCfg    = AUTH_CFG[artwork.authentication_status || "pending"];
  const saleCfg    = artwork.sale_method ? SALE_LABELS[artwork.sale_method] : null;
  const dims       = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean).join(" × ");
  const hasDims    = !!dims;
  const isDigital  = artwork.art_type === "digital" || artwork.art_type === "mixed";
  const isPrint    = artwork.art_type === "print";

  return (
    <>
      <style>{CSS}</style>

      {/* ── Lightbox ── */}
      {lightbox !== null && images.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(17,17,16,.95)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }} style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} color="#fff" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.max(0, (l ?? 0) - 1)); }} style={{ position: "absolute", left: 16, width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronLeft size={18} color="#fff" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.min(images.length - 1, (l ?? 0) + 1)); }} style={{ position: "absolute", right: 16, width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronRight size={18} color="#fff" />
              </button>
            </>
          )}
          <img src={images[lightbox]} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 4 }} onClick={e => e.stopPropagation()} />
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
            {images.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setLightbox(i); }} style={{ width: i === lightbox ? 20 : 7, height: 7, borderRadius: 99, background: i === lightbox ? "#FFD400" : "rgba(255,255,255,.35)", cursor: "pointer", transition: "all .2s" }} />
            ))}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="aw-detail-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Link href="/dashboard/artworks" style={{ textDecoration: "none" }}>
            <button style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowLeft size={16} color="#9B8F7A" />
            </button>
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Art type badge */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, background: atCfg.bg, border: `1.5px solid ${atCfg.color}40`, fontSize: 10, fontWeight: 800, color: atCfg.color, textTransform: "uppercase", letterSpacing: ".1em", flexShrink: 0 }}>
                {atCfg.emoji} {atCfg.label}
              </span>
              {/* Stage badge */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: stage.bg, border: `1.5px solid ${stage.color}40`, fontSize: 10, fontWeight: 800, color: stage.color, flexShrink: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: stage.color }} />
                {stage.label}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(17px,2.5vw,24px)", fontWeight: 900, color: "#111110", letterSpacing: "-.5px", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artwork.title}</h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="aw-detail-actions">
          {/* Stage changer */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setStageOpen(p => !p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all .15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
              onMouseLeave={e => { if (!stageOpen) e.currentTarget.style.borderColor="#E8E0D0"; }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: stage.color }} />
              {stage.label}
            </button>
            {stageOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "2px solid #111110", borderRadius: 14, boxShadow: "5px 5px 0 #111110", zIndex: 100, minWidth: 160, overflow: "hidden", padding: 4 }}>
                {STAGES.map(s => (
                  <button key={s.key} onClick={() => moveToStage(s.key)}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", border: "none", borderRadius: 9, background: sk === s.key ? "#FFFBEA" : "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: sk === s.key ? 800 : 600, color: "#111110" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                    onMouseLeave={e => { if (sk !== s.key) e.currentTarget.style.background="none"; }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    {s.label}
                    {sk === s.key && <Check size={11} color="#CA8A04" style={{ marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 11, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="4px 4px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <Edit2 size={12} /> Edit
            </button>
          </Link>

          <button onClick={handleDuplicate} style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .15s" }}
            title="Duplicate"
            onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
            onMouseLeave={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
            <Copy size={13} color="#9B8F7A" />
          </button>

          <button onClick={handleDelete} style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #FFE4E6", background: "#FFF5F5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .15s" }}
            title="Delete"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#EF4444"; (e.currentTarget as HTMLElement).style.background="#FEF2F2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#FFE4E6"; (e.currentTarget as HTMLElement).style.background="#FFF5F5"; }}>
            <Trash2 size={13} color="#EF4444" />
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="aw-detail-grid">

        {/* ════ LEFT: Images ════ */}
        <div>
          {/* Main image */}
          <div style={{ borderRadius: 20, border: "2.5px solid #111110", boxShadow: "4px 5px 0 #D4C9A8", overflow: "hidden", marginBottom: 10, cursor: images.length > 0 ? "zoom-in" : "default", position: "relative" }}
            onClick={() => images.length > 0 && setLightbox(activeImg)}>
            {images[activeImg] ? (
              <>
                <img src={images[activeImg]} alt={artwork.title} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 99, background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                  <Maximize2 size={10} /> Expand
                </div>
              </>
            ) : (
              <div style={{ width: "100%", aspectRatio: "4/3", background: `linear-gradient(${stage.grad})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon size={52} color="rgba(255,255,255,.3)" />
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {images.map((img: string, i: number) => (
                <div key={i} onClick={() => setActiveImg(i)}
                  style={{ width: 72, height: 56, borderRadius: 10, border: `2px solid ${i === activeImg ? "#111110" : "#E8E0D0"}`, overflow: "hidden", flexShrink: 0, cursor: "pointer", transition: "border-color .15s", boxShadow: i === activeImg ? "2px 2px 0 #111110" : "none" }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}

          {/* Passport preview CTA */}
          <Link href={`/dashboard/artworks/${id}/passport`} style={{ textDecoration: "none", display: "block", marginTop: 16 }}>
            <div style={{ background: "#111110", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", border: "2px solid #111110", boxShadow: "3px 3px 0 #D4C9A8", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #D4C9A8"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: artwork.certificate_id ? "#16A34A" : "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Shield size={18} color="#111110" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#FFD400" }}>
                  {artwork.certificate_id ? "View Digital Passport" : "Create Digital Passport"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,212,0,.5)", fontWeight: 600 }}>
                  {artwork.certificate_id ? `Certificate · ${artwork.certificate_id}` : "Authentication, provenance & certificate"}
                </div>
              </div>
              <ExternalLink size={14} color="rgba(255,212,0,.5)" />
            </div>
          </Link>

          {/* ── MOODBOARDS (storytelling) ── */}
          {moodboards.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Card>
                <CardHeader title="Story Behind This Work" emoji="🗂️"
                  right={
                    <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none", fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
                      Manage
                    </Link>
                  }
                />
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {moodboards.map(mb => {
                    const thumb = mb.thumbnail_url || mb.og_image;
                    const grad = PROV_GRAD[mb.provider] || PROV_GRAD.other;
                    const emoji = PROV_EMOJI[mb.provider] || "🔗";
                    return (
                      <a key={mb.id} href={mb.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", background: "#FAF7F3", borderRadius: 13, border: "1.5px solid #E8E0D0", cursor: "pointer", transition: "all .15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.background="#FFFBEA"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.background="#FAF7F3"; }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: `linear-gradient(${grad})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mb.title}</div>
                            {mb.description && <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mb.description}</div>}
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8", marginTop: 2 }}>{emoji} {mb.provider}</div>
                          </div>
                          <ExternalLink size={12} color="#C0B8A8" style={{ flexShrink: 0 }} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ════ RIGHT: Details ════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Core info */}
          <Card>
            <CardHeader title="Artwork Details" emoji="📝" />
            <div style={{ padding: "6px 18px 14px" }}>
              {artwork.description && (
                <p style={{ fontSize: 13, fontWeight: 500, color: "#5C5346", lineHeight: 1.75, margin: "12px 0 14px", paddingBottom: 14, borderBottom: "1px solid #F5F0E8" }}>
                  {artwork.description}
                </p>
              )}
              {artwork.year && <InfoRow label="Year" value={artwork.year} />}
              {artwork.medium && <InfoRow label="Medium" value={artwork.medium} />}
              {/* Auth type */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F0E8" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em" }}>Type</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: authCfg.bg, border: `1.5px solid ${authCfg.color}40`, fontSize: 11, fontWeight: 800, color: authCfg.color }}>
                  {authCfg.emoji} {authCfg.label}
                </span>
              </div>
              {/* Edition code */}
              {artwork.edition_code && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F0E8" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em" }}>Edition</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "#111110", fontSize: 12, fontWeight: 900, color: "#FFD400", fontFamily: "monospace" }}>
                    <Hash size={10} color="#FFD400" /> {artwork.edition_code}
                  </span>
                </div>
              )}
              {artwork.edition_total && !artwork.edition_code && (
                <InfoRow label="Editions" value={`${artwork.edition_number ? `#${artwork.edition_number} of ` : ""}${artwork.edition_total}`} mono />
              )}
            </div>
          </Card>

          {/* Physical properties */}
          {(hasDims || artwork.framed !== undefined) && (
            <Card>
              <CardHeader title="Physical" emoji="📐" />
              <div style={{ padding: "6px 18px 14px" }}>
                {hasDims && <InfoRow label="Dimensions" value={`${dims} cm`} mono />}
                {artwork.framed !== null && artwork.framed !== undefined && (
                  <InfoRow label="Framed" value={artwork.framed ? "Yes ✓" : "No"} />
                )}
              </div>
            </Card>
          )}

          {/* Digital properties */}
          {isDigital && (artwork.file_format || artwork.resolution || artwork.digital_file_url) && (
            <Card>
              <CardHeader title="Digital File" emoji="💻" />
              <div style={{ padding: "6px 18px 14px" }}>
                {artwork.file_format && <InfoRow label="Format" value={artwork.file_format} />}
                {artwork.resolution && <InfoRow label="Resolution" value={artwork.resolution} mono />}
                {artwork.digital_file_url && (
                  <div style={{ padding: "10px 0", borderBottom: "1px solid #F5F0E8" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>File URL</div>
                    <a href={artwork.digital_file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#0EA5E9", textDecoration: "none" }}>
                      <ExternalLink size={11} /> Open file <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Sales & Pricing */}
          <Card>
            <CardHeader title="Sales & Pricing" emoji="💰" />
            <div style={{ padding: "6px 18px 14px" }}>
              {artwork.price ? (
                <div style={{ padding: "14px 0 10px", borderBottom: "1px solid #F5F0E8" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#111110", letterSpacing: "-1.5px", fontFamily: "monospace" }}>
                    {artwork.currency || "€"}{Number(artwork.price).toLocaleString()}
                  </div>
                </div>
              ) : (
                <InfoRow label="Price" value="Not set" />
              )}
              {saleCfg && <InfoRow label="Sale method" value={`${saleCfg.emoji} ${saleCfg.label}`} />}
              {artwork.venue_location && <InfoRow label="Location" value={artwork.venue_location} />}
            </div>
          </Card>

          {/* Business (internal) */}
          {(artwork.materials_cost || artwork.time_spent || artwork.notes) && (
            <Card>
              <CardHeader title="Internal Notes" emoji="🔒" />
              <div style={{ padding: "6px 18px 14px" }}>
                {artwork.materials_cost && <InfoRow label="Materials cost" value={`${artwork.currency || "€"}${Number(artwork.materials_cost).toLocaleString()}`} mono />}
                {artwork.time_spent && <InfoRow label="Time spent" value={`${artwork.time_spent}h`} />}
                {artwork.price && artwork.materials_cost && (
                  <div style={{ padding: "10px 0", borderBottom: "1px solid #F5F0E8" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Est. profit</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", fontFamily: "monospace" }}>
                      {artwork.currency || "€"}{(Number(artwork.price) - Number(artwork.materials_cost)).toLocaleString()}
                    </div>
                  </div>
                )}
                {artwork.notes && (
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>Notes</div>
                    <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{artwork.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Link href={`/dashboard/artworks/${id}/passport`} style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "10px 0", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.boxShadow="2px 2px 0 #111110"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                <Shield size={13} /> Passport
              </button>
            </Link>
            <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "10px 0", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.boxShadow="2px 2px 0 #111110"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                <Edit2 size={13} /> Edit
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

  .aw-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .aw-detail-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .aw-detail-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 22px;
    align-items: start;
  }

  @media (max-width: 900px) {
    .aw-detail-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .aw-detail-header { flex-direction: column; align-items: flex-start; }
    .aw-detail-actions { width: 100%; justify-content: flex-start; }
  }
`;
