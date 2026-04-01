"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Edit2, Megaphone, Copy, Trash2,
  ChevronLeft, ChevronRight, X, ImageIcon,
  Clock, DollarSign as Money, TrendingUp,
} from "lucide-react";

const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "complete",    label: "Complete",    color: "#4ECDC4", bg: "#F0FDF4" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7" },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3" },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#E5E5E5" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const SALE_METHOD_LABELS: Record<string, string> = {
  direct: "Direct purchase", inquiry: "Inquiry only",
  price_on_request: "Price on request", auction: "Auction", not_for_sale: "Not for sale",
};

function toStageKey(status: string | null | undefined) {
  const s = String(status || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[s] ? s : "available";
}

export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [artwork, setArtwork]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [lightbox, setLightbox]   = useState<number | null>(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("artworks").select("*").eq("id", id).single();
    setArtwork(data);
    setLoading(false);
  }

  async function moveToStage(status: string) {
    const supabase = createClient();
    await supabase.from("artworks").update({ status }).eq("id", id);
    setArtwork((p: any) => ({ ...p, status }));
  }

  async function handleDelete() {
    if (!confirm("Delete this artwork permanently?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    router.push("/dashboard/artworks");
  }

  async function handleDuplicate() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !artwork) return;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = artwork;
    const { data } = await supabase.from("artworks").insert({ ...rest, user_id: user.id, title: `${artwork.title} (copy)`, status: "concept" }).select().single();
    if (data) router.push(`/dashboard/artworks/${data.id}`);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9B8F7A" }}>Loading…</div>;
  if (!artwork) return <div style={{ padding: 40, textAlign: "center", color: "#FF6B6B" }}>Artwork not found</div>;

  const images  = Array.isArray(artwork.images) ? artwork.images.filter(Boolean) : [];
  const sk      = toStageKey(artwork.status);
  const stage   = STAGE_MAP[sk];
  const dims    = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);
  const profit  = artwork.price && artwork.materials_cost ? artwork.price - artwork.materials_cost : null;

  return (
    <>
      <style>{`
        .album-thumb:hover { border-color: #FFD400 !important; opacity: 1 !important; }
        .stage-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.max(0, (l||0) - 1)); }}
            style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <ChevronLeft size={20} />
          </button>
          <img src={images[lightbox]} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: "85vw", maxHeight: "85vh", objectFit: "contain", border: "2px solid rgba(255,255,255,0.2)" }} />
          <button onClick={e => { e.stopPropagation(); setLightbox(l => Math.min(images.length - 1, (l||0) + 1)); }}
            style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <ChevronRight size={20} />
          </button>
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <X size={16} />
          </button>
          {/* Film strip */}
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
            {images.map((img: string, i: number) => (
              <div key={i} onClick={e => { e.stopPropagation(); setLightbox(i); }}
                className="album-thumb"
                style={{ width: 56, height: 42, border: `2px solid ${i === lightbox ? "#FFD400" : "rgba(255,255,255,0.2)"}`, overflow: "hidden", cursor: "pointer", opacity: i === lightbox ? 1 : 0.5, transition: "opacity 0.15s, border-color 0.15s" }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700 }}>
            {(lightbox||0) + 1} / {images.length}
          </div>
        </div>
      )}

      <div>
        {/* ── Breadcrumb + Actions ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/dashboard/artworks" style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <ArrowLeft size={13} /> Artworks
              </button>
            </Link>
            <span style={{ color: "#d4cfc4" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{artwork.title}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/dashboard/artworks/${id}/promotion`} style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <Megaphone size={13} /> Promote
              </button>
            </Link>
            <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #111110", background: "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                <Edit2 size={13} /> Edit
              </button>
            </Link>
            <button onClick={handleDuplicate} style={{ width: 34, height: 34, border: "2px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Copy size={13} color="#9B8F7A" />
            </button>
            <button onClick={handleDelete} style={{ width: 34, height: 34, border: "2px solid #FF6B6B", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Trash2 size={13} color="#FF6B6B" />
            </button>
          </div>
        </div>

        {/* ── Main layout: image left, details right ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>

          {/* LEFT: Image album */}
          <div>
            {/* Main image */}
            <div style={{ border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", overflow: "hidden", marginBottom: 12, cursor: images.length > 0 ? "zoom-in" : "default" }}
              onClick={() => images.length > 0 && setLightbox(0)}>
              {images[0]
                ? <img src={images[0]} alt={artwork.title} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                : <div style={{ width: "100%", aspectRatio: "4/3", background: stage.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ImageIcon size={48} color="#d4cfc4" />
                  </div>
              }
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {images.map((img: string, i: number) => (
                  <div key={i} className="album-thumb"
                    onClick={() => setLightbox(i)}
                    style={{ width: 72, height: 56, border: `2px solid ${i === 0 ? "#FFD400" : "#E0D8CA"}`, overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s" }}>
                    <img src={img} alt={`Image ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
                <div style={{ width: 72, height: 56, border: "2px dashed #d4cfc4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 9, fontWeight: 700, color: "#9B8F7A", textAlign: "center" }}>
                  <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none", color: "inherit" }}>
                    + Add<br/>image
                  </Link>
                </div>
              </div>
            )}
            {images.length === 0 && (
              <Link href={`/dashboard/artworks/${id}/edit`} style={{ textDecoration: "none" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px dashed #d4cfc4", fontSize: 12, fontWeight: 700, color: "#9B8F7A", cursor: "pointer" }}>
                  + Add images
                </div>
              </Link>
            )}
            {images.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                {images.length} image{images.length > 1 ? "s" : ""} · Click to open gallery
              </div>
            )}
          </div>

          {/* RIGHT: Details panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Title + stage badge */}
            <div style={{ background: "#fff", border: "2px solid #111110", padding: "20px 22px", boxShadow: "3px 3px 0 #111110" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: stage.bg, border: `1.5px solid ${stage.color}`, fontSize: 10, fontWeight: 900, color: stage.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                {stage.label}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: "0 0 4px" }}>{artwork.title}</h1>
              {artwork.year && <div style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600 }}>{artwork.year}</div>}
            </div>

            {/* Stage control */}
            <div style={{ background: "#fff", border: "2px solid #111110", padding: "16px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Lifecycle stage</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {STAGES.map(s => {
                  const active = sk === s.key;
                  return (
                    <button key={s.key} className="stage-btn" onClick={() => moveToStage(s.key)}
                      style={{ padding: "5px 10px", border: `2px solid ${active ? s.color : "#E0D8CA"}`, background: active ? s.color : "#fff", fontSize: 10, fontWeight: 800, color: active && s.key === "sold" ? "#FFD400" : active ? "#fff" : "#9B8F7A", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.1s" }}>
                      {active && "✓ "}{s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Price",           value: artwork.price ? `$${Number(artwork.price).toLocaleString()}` : null,              icon: Money },
                { label: "Materials cost",  value: artwork.materials_cost ? `$${Number(artwork.materials_cost).toLocaleString()}` : null, icon: Money },
                { label: "Est. profit",     value: profit ? `$${profit.toLocaleString()}` : null,                                    icon: TrendingUp },
                { label: "Time spent",      value: artwork.time_spent ? `${artwork.time_spent}h` : null,                             icon: Clock },
              ].filter(m => m.value).map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.label} style={{ background: "#fff", border: "2px solid #111110", padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>{m.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Metadata */}
            <div style={{ background: "#fff", border: "2px solid #111110", padding: "16px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  ["Medium",        artwork.medium],
                  ["Dimensions",    dims.length ? dims.join(" × ") + " cm" : null],
                  ["Framed",        artwork.framed ? "Yes" : null],
                  ["Editions",      artwork.editions ? `${artwork.editions} editions` : null],
                  ["Sale method",   SALE_METHOD_LABELS[artwork.sale_method] || null],
                  ["Location",      artwork.venue_location || artwork.location],
                  ["Online",        artwork.visibility_online],
                ].filter(([, v]) => v).map(([k, v], i, arr) => (
                  <div key={k as string} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F5F0E8" : "none" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", width: 110, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111110", flex: 1 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {artwork.notes && (
              <div style={{ background: "#FFFBEA", border: "2px solid #111110", padding: "14px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Notes</div>
                <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.7, margin: 0 }}>{artwork.notes}</p>
              </div>
            )}

            {/* Promotion CTA */}
            <Link href={`/dashboard/artworks/${id}/promotion`} style={{ textDecoration: "none" }}>
              <div style={{ background: "#111110", border: "2px solid #111110", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "3px 3px 0 #FFD400" }}>
                <Megaphone size={18} color="#FFD400" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#FFD400" }}>Manage Promotion</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Plan content, schedule posts, track campaigns</div>
                </div>
                <ChevronRight size={16} color="#FFD400" />
              </div>
            </Link>

            {/* Meta */}
            <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>
              Added {new Date(artwork.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              {artwork.updated_at && ` · Updated ${new Date(artwork.updated_at).toLocaleDateString("en-US", { day: "numeric", month: "long" })}`}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
