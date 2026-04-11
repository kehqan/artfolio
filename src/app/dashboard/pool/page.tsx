"use client";
import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X, Plus, MapPin, Calendar, ArrowUpRight, Clock,
  Search, SlidersHorizontal, Sparkles, Upload, Check,
  ChevronLeft, ChevronRight, Pencil, Trash2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Profile = {
  id: string; full_name: string; username: string;
  role?: string; avatar_url?: string; location?: string;
};

type PoolRequest = {
  id: string; user_id: string; title: string;
  description?: string; request_type: string;
  poster_type: "artist" | "venue"; poster_role: "artist" | "venue";
  cover_image?: string; images?: string[];
  location?: string; deadline?: string; status: string;
  created_at: string;
  profiles?: { full_name: string; username: string; avatar_url?: string; role?: string; location?: string; };
};

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const ARTIST_TYPES = [
  { key: "showcase",   label: "Looking to Showcase",  emoji: "🖼️", desc: "Find a venue to exhibit your work" },
  { key: "lend",       label: "Lending Artwork",       emoji: "🤝", desc: "Lend pieces to another artist or institution" },
  { key: "collab",     label: "Seeking Collaboration", emoji: "✨", desc: "Partner with another artist on a project" },
  { key: "residency",  label: "Looking for Residency", emoji: "🏠", desc: "Find a studio or residency program" },
  { key: "commission", label: "Open for Commission",   emoji: "🎨", desc: "Available for commissioned work" },
];

const VENUE_TYPES = [
  { key: "gathering",  label: "Hosting a Gathering",  emoji: "🎪", desc: "Looking for artists for an event or show" },
  { key: "selection",  label: "Selecting Artists",    emoji: "🔍", desc: "Curating a collection or exhibition" },
  { key: "buying",     label: "Looking to Buy",       emoji: "💰", desc: "Interested in acquiring artworks" },
  { key: "residency",  label: "Offering Residency",   emoji: "🏛️", desc: "Studio or residency space available" },
  { key: "collab",     label: "Venue Collaboration",  emoji: "🤝", desc: "Partner with another venue" },
];

const ALL_TYPES = [...ARTIST_TYPES, ...VENUE_TYPES];
const UNIQUE_TYPES = Array.from(new Map(ALL_TYPES.map(t => [t.key, t])).values());

const TYPE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  showcase:   { bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" },
  lend:       { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" },
  collab:     { bg: "#FEF9C3", color: "#CA8A04", border: "#FDE047" },
  residency:  { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  commission: { bg: "#FFE4E6", color: "#BE123C", border: "#FCA5A5" },
  gathering:  { bg: "#FFD400", color: "#111110", border: "#111110" },
  selection:  { bg: "#F0FDF4", color: "#166534", border: "#86EFAC" },
  buying:     { bg: "#111110", color: "#FFD400", border: "#333"    },
};

function tStyle(key: string) {
  return TYPE_STYLE[key] || { bg: "#F5F0E8", color: "#9B8F7A", border: "#E8E0D0" };
}
function tInfo(key: string) { return ALL_TYPES.find(t => t.key === key); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today"; if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`; if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function getImgs(req: PoolRequest): string[] {
  const arr = (req.images || []).filter(Boolean);
  if (arr.length > 0) return arr;
  if (req.cover_image) return [req.cover_image];
  return [];
}

const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 7 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 13px", border: "2px solid #E8E0D0", borderRadius: 11, fontSize: 13, fontWeight: 600, color: "#111110", fontFamily: "inherit", background: "#fff", outline: "none", transition: "border-color .15s", boxSizing: "border-box" as const };

// ─────────────────────────────────────────────
// Album Viewer
// ─────────────────────────────────────────────
function AlbumViewer({ imgs, height = 240, radius = "22px 22px 0 0" }: { imgs: string[]; height?: number; radius?: string }) {
  const [idx, setIdx] = useState(0);
  if (imgs.length === 0) return null;
  return (
    <div style={{ position: "relative", height, borderRadius: radius, overflow: "hidden", background: "#111", flexShrink: 0 }}>
      <img src={imgs[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(17,17,16,0.6) 100%)" }} />
      {imgs.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); }} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => Math.min(imgs.length - 1, i + 1)); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={14} />
          </button>
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {imgs.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 9999, background: i === idx ? "#FFD400" : "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.3)", cursor: "pointer", transition: "all .2s" }} />
            ))}
          </div>
          <div style={{ position: "absolute", top: 10, right: 50, padding: "2px 8px", borderRadius: 9999, background: "rgba(17,17,16,0.6)", fontSize: 10, fontWeight: 800, color: "#fff" }}>
            {idx + 1}/{imgs.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Request Detail Modal
// ─────────────────────────────────────────────
function RequestModal({ req, onClose, currentUserId, onEdit, onDelete }: {
  req: PoolRequest; onClose: () => void; currentUserId?: string;
  onEdit: (r: PoolRequest) => void; onDelete: (id: string) => void;
}) {
  const ti = tInfo(req.request_type);
  const style = tStyle(req.request_type);
  const isVenue = (req.poster_role || req.poster_type) === "venue";
  const isOwn = currentUserId === req.user_id;
  const imgs = getImgs(req);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(17,17,16,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>
        {/* Image header */}
        <div style={{ position: "relative" }}>
          {imgs.length > 0
            ? <AlbumViewer imgs={imgs} height={240} radius="22px 22px 0 0" />
            : <div style={{ height: 160, borderRadius: "22px 22px 0 0", background: isVenue ? "#111110" : "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, opacity: 0.12 }}>{isVenue ? "🏛️" : "🎨"}</div>
          }
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, background: style.bg, border: `1.5px solid ${style.border}`, fontSize: 10, fontWeight: 800, color: style.color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {ti?.emoji} {ti?.label || req.request_type}
          </div>
          <div style={{ position: "absolute", top: 14, right: 54, padding: "4px 10px", borderRadius: 9999, background: isVenue ? "#E0F2FE" : "#FFD400", border: "1.5px solid #111110", fontSize: 10, fontWeight: 800, color: isVenue ? "#0C4A6E" : "#111110" }}>
            {isVenue ? "🏛️ Venue" : "🎨 Artist"}
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} color="#FFD400" />
          </button>
        </div>

        <div style={{ padding: "22px 26px 28px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid #111110", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
              {req.profiles?.avatar_url ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (req.profiles?.full_name || "?")[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{req.profiles?.full_name || "Unknown"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{req.profiles?.username ? `@${req.profiles.username}` : ""}{req.profiles?.location ? ` · ${req.profiles.location}` : ""}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} /> {timeAgo(req.created_at)}</div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-0.6px", lineHeight: 1.15, marginBottom: 12 }}>{req.title}</h2>
          {req.description && <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.75, fontWeight: 500, marginBottom: 18 }}>{req.description}</p>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {req.location && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "#5C5346", border: "1.5px solid #E8E0D0" }}><MapPin size={10} color="#FF6B6B" /> {req.location}</div>}
            {req.deadline && <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "#5C5346", border: "1.5px solid #E8E0D0" }}><Calendar size={10} color="#9B8F7A" /> Deadline: {fmtDate(req.deadline)}</div>}
            <div style={{ padding: "5px 12px", background: req.status === "open" ? "#DCFCE7" : "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: req.status === "open" ? "#16A34A" : "#9B8F7A", border: `1.5px solid ${req.status === "open" ? "#86EFAC" : "#E8E0D0"}` }}>{req.status === "open" ? "✓ Open" : "Closed"}</div>
          </div>

          {isOwn ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onClose(); onEdit(req); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>
                <Pencil size={14} /> Edit request
              </button>
              <button onClick={() => { if (confirm("Delete this request?")) { onDelete(req.id); onClose(); } }} style={{ padding: "12px 16px", background: "#fff", border: "2.5px solid #EF4444", borderRadius: 13, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ) : (
            <a href={req.profiles?.username ? `/${req.profiles.username}` : "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
              <button style={{ width: "100%", padding: "13px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#111110" }}>
                <ArrowUpRight size={16} /> View Profile & Connect
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// New / Edit Request Form Modal
// ─────────────────────────────────────────────
function RequestFormModal({ userRole, userId, existing, onClose, onSaved }: {
  userRole: string; userId: string; existing?: PoolRequest;
  onClose: () => void; onSaved: () => void;
}) {
  const sb = createClient();
  const isVenue = userRole === "gallery" || userRole === "venue";
  const TYPES = isVenue ? VENUE_TYPES : ARTIST_TYPES;
  const isEdit = !!existing;

  const [step, setStep] = useState<"type" | "details">(isEdit ? "details" : "type");
  const [form, setForm] = useState({
    request_type: existing?.request_type || "",
    title: existing?.title || "",
    description: existing?.description || "",
    images: (existing?.images?.filter(Boolean) || (existing?.cover_image ? [existing.cover_image] : [])) as string[],
    location: existing?.location || "",
    deadline: existing?.deadline?.slice(0, 10) || "",
    status: existing?.status || "open",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImages(files: FileList) {
    setUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      // CRITICAL: path must start with userId/ to pass the storage INSERT policy
      const path = `${userId}/pool/${Date.now()}-${i}.${ext}`;
      const { error: upErr, data } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
      if (!upErr) {
        const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
        uploaded.push(publicUrl);
      } else {
        console.error("Upload failed:", upErr.message);
        setError(`Upload failed: ${upErr.message}`);
      }
    }
    setForm(p => ({ ...p, images: [...p.images, ...uploaded] }));
    setUploading(false);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Please add a title"); return; }
    setSaving(true); setError("");
    const payload: any = {
      poster_type: isVenue ? "venue" : "artist",
      poster_role: isVenue ? "venue" : "artist",
      request_type: form.request_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      cover_image: form.images[0] || null,
      images: form.images,
      location: form.location.trim() || null,
      deadline: form.deadline || null,
      status: form.status,
    };
    let err: any;
    if (isEdit && existing) {
      ({ error: err } = await sb.from("pool_requests").update(payload).eq("id", existing.id));
    } else {
      ({ error: err } = await sb.from("pool_requests").insert({ ...payload, user_id: userId }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  }

  const selType = TYPES.find(t => t.key === form.request_type);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(17,17,16,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "2px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 2 }}>
              {isVenue ? "🏛️ Venue" : "🎨 Artist"} · {isEdit ? "Edit request" : "New request"}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111110", letterSpacing: "-0.4px" }}>
              {step === "type" ? "What are you looking for?" : isEdit ? "Edit your request" : "Add the details"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={13} color="#FFD400" />
          </button>
        </div>

        <div style={{ padding: "18px 20px 24px" }}>
          {/* ── STEP 1: type picker ── */}
          {step === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {TYPES.map(t => {
                const st = tStyle(t.key);
                const sel = form.request_type === t.key;
                return (
                  <button key={t.key} onClick={() => setForm(p => ({ ...p, request_type: t.key }))} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", border: `2.5px solid ${sel ? "#111110" : "#E8E0D0"}`, borderRadius: 13, background: sel ? "#FFFBEA" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .12s", boxShadow: sel ? "3px 3px 0 #111110" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, border: `2px solid ${sel ? "#111110" : st.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{t.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", marginBottom: 1 }}>{t.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{t.desc}</div>
                    </div>
                    {sel && <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={11} strokeWidth={3} /></div>}
                  </button>
                );
              })}
              <button onClick={() => { if (form.request_type) setStep("details"); }} disabled={!form.request_type} style={{ marginTop: 6, padding: "12px", background: form.request_type ? "#FFD400" : "#F5F0E8", border: "2.5px solid #111110", borderRadius: 13, fontSize: 13, fontWeight: 800, cursor: form.request_type ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110", boxShadow: form.request_type ? "3px 3px 0 #111110" : "none" }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: details ── */}
          {step === "details" && (
            <div>
              {/* Type indicator */}
              {selType && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>{selType.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>{selType.label}</div>
                    <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{selType.desc}</div>
                  </div>
                  {!isEdit && <button onClick={() => setStep("type")} style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>Change</button>}
                </div>
              )}

              {/* Photos */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Photos <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(optional · select multiple)</span></label>
                {form.images.length > 0 ? (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
                    {form.images.map((url, i) => (
                      <div key={i} style={{ position: "relative", width: 70, height: 70, borderRadius: 10, overflow: "hidden", border: `2px solid ${i === 0 ? "#FFD400" : "#111110"}`, flexShrink: 0 }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {i === 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(17,17,16,0.75)", fontSize: 7, fontWeight: 800, color: "#FFD400", textAlign: "center", padding: "2px 0", textTransform: "uppercase" }}>Cover</div>}
                        <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 3, right: 3, width: 17, height: 17, borderRadius: 5, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <X size={9} color="#FFD400" />
                        </button>
                      </div>
                    ))}
                    <div onClick={() => fileRef.current?.click()} style={{ width: 70, height: 70, borderRadius: 10, border: "2.5px dashed #D4C9A8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", background: "#FAF7F3" }}>
                      {uploading ? <div style={{ width: 13, height: 13, border: "2px solid #FFD400", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> : <Plus size={15} color="#C0B8A8" />}
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#C0B8A8" }}>{uploading ? "…" : "Add"}</span>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()} style={{ height: 86, border: "2.5px dashed #D4C9A8", borderRadius: 11, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", background: "#FAF7F3", transition: "border-color .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#FFD400")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#D4C9A8")}
                  >
                    {uploading ? <div style={{ width: 18, height: 18, border: "2.5px solid #FFD400", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> : <Upload size={18} color="#C0B8A8" />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>{uploading ? "Uploading…" : "Click to add photos"}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#C0B8A8" }}>First photo becomes the cover</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) uploadImages(e.target.files); e.target.value = ""; }} />
              </div>

              {/* Title */}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Add a clear, descriptive title…" maxLength={120} style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Details <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What are you looking for, what can you offer, timeline, style…" rows={3} style={{ ...inp, resize: "vertical" as const }} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
              </div>

              {/* Location + Deadline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Location <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(opt.)</span></label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
                </div>
                <div>
                  <label style={lbl}>Deadline <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(opt.)</span></label>
                  <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
                </div>
              </div>

              {/* Status (edit only) */}
              {isEdit && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Status</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["open", "closed"].map(s => (
                      <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))} style={{ flex: 1, padding: "9px", border: `2px solid ${form.status === s ? "#111110" : "#E8E0D0"}`, borderRadius: 10, background: form.status === s ? (s === "open" ? "#DCFCE7" : "#F5F0E8") : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: form.status === s ? (s === "open" ? "#16A34A" : "#9B8F7A") : "#9B8F7A", textTransform: "capitalize" as const }}>
                        {s === "open" ? "✓ Open" : "Closed"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 12 }}>⚠ {error}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                {!isEdit && <button onClick={() => setStep("type")} style={{ padding: "11px 16px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>← Back</button>}
                <button onClick={handleSubmit} disabled={saving || !form.title.trim() || uploading} style={{ flex: 1, padding: "11px", background: saving || !form.title.trim() || uploading ? "#F5F0E8" : "#FFD400", border: "2.5px solid #111110", borderRadius: 11, fontSize: 13, fontWeight: 800, cursor: saving || !form.title.trim() || uploading ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving || !form.title.trim() || uploading ? "none" : "3px 3px 0 #111110" }}>
                  {saving ? "Saving…" : uploading ? "Uploading…" : isEdit ? "Save changes ✓" : "Post to Pool ✓"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pool Card
// ─────────────────────────────────────────────
function PoolCard({ req, onClick, isOwn }: { req: PoolRequest; onClick: () => void; isOwn: boolean }) {
  const style = tStyle(req.request_type);
  const ti = tInfo(req.request_type);
  const isVenue = (req.poster_role || req.poster_type) === "venue";
  const imgs = getImgs(req);

  return (
    <div onClick={onClick} style={{ background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "all .25s cubic-bezier(.16,1,.3,1)", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#111110"; el.style.boxShadow = "5px 6px 0 #111110"; el.style.transform = "translate(-2px,-3px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#E8E0D0"; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      {/* Image */}
      <div style={{ height: 148, position: "relative", overflow: "hidden", background: imgs.length > 0 ? "#111" : isVenue ? "#111110" : "#FFD400", flexShrink: 0 }}>
        {imgs.length > 0
          ? <img src={imgs[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, opacity: 0.14 }}>{isVenue ? "🏛️" : "🎨"}</div>
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 28%, rgba(17,17,16,0.6) 100%)" }} />

        <div style={{ position: "absolute", top: 9, left: 9, display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 9999, background: style.bg, border: `1.5px solid ${style.border}`, fontSize: 9, fontWeight: 800, color: style.color, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
          {ti?.emoji} {ti?.label || req.request_type}
        </div>

        {imgs.length > 1 && (
          <div style={{ position: "absolute", top: 9, right: isOwn ? 44 : 9, padding: "2px 7px", borderRadius: 9999, background: "rgba(17,17,16,0.65)", fontSize: 9, fontWeight: 800, color: "#fff" }}>
            📷 {imgs.length}
          </div>
        )}

        {isOwn && (
          <div style={{ position: "absolute", top: 9, right: 9, padding: "2px 7px", borderRadius: 9999, background: "#FFD400", border: "1.5px solid #111110", fontSize: 9, fontWeight: 800, color: "#111110" }}>Yours</div>
        )}

        <div style={{ position: "absolute", bottom: 9, left: 9, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, border: "2px solid #fff", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
            {req.profiles?.avatar_url ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (req.profiles?.full_name || "?")[0]}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{req.profiles?.full_name}</span>
        </div>

        <div style={{ position: "absolute", bottom: 9, right: 9, padding: "2px 7px", borderRadius: 9999, background: isVenue ? "#E0F2FE" : "#FFD400", border: "1.5px solid #111110", fontSize: 8, fontWeight: 800, color: isVenue ? "#0C4A6E" : "#111110", textTransform: "uppercase" as const }}>
          {isVenue ? "Venue" : "Artist"}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", letterSpacing: "-0.3px", marginBottom: 5, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{req.title}</div>
        {req.description && (
          <p style={{ fontSize: 11, color: "#9B8F7A", lineHeight: 1.5, fontWeight: 500, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{req.description}</p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: req.description ? 0 : 6 }}>
          {req.location ? <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}><MapPin size={9} color="#FF6B6B" />{req.location}</span> : <span />}
          <span style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8" }}>{timeAgo(req.created_at)}</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 14, right: 14, width: 7, height: 7, borderRadius: "50%", background: req.status === "open" ? "#16A34A" : "#C0B8A8", border: "1.5px solid #fff" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function PoolPage() {
  const sb = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<PoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editReq, setEditReq] = useState<PoolRequest | undefined>(undefined);
  const [selected, setSelected] = useState<PoolRequest | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | "artist" | "venue">("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadUser(); loadRequests(); }, []);

  async function loadUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from("profiles").select("id, full_name, username, role, avatar_url, location").eq("id", user.id).single();
    if (data) setProfile(data as Profile);
  }

  async function loadRequests() {
    setLoading(true);
    const { data: reqs, error } = await sb
      .from("pool_requests")
      .select("id, user_id, title, description, request_type, poster_type, poster_role, cover_image, images, location, deadline, status, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) { console.error("Pool fetch error:", error); setLoading(false); return; }
    if (!reqs?.length) { setRequests([]); setLoading(false); return; }

    const userIds = Array.from(new Set(reqs.map((r: any) => r.user_id)));
    const { data: profs } = await sb.from("profiles").select("id, full_name, username, avatar_url, role, location").in("id", userIds);
    const profMap: Record<string, any> = {};
    (profs || []).forEach((p: any) => { profMap[p.id] = p; });

    const merged = reqs.map((r: any) => ({
      ...r,
      poster_role: r.poster_role || r.poster_type || "artist",
      images: Array.isArray(r.images) ? r.images.filter(Boolean) : [],
      profiles: profMap[r.user_id] || null,
    }));
    setRequests(merged as PoolRequest[]);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await sb.from("pool_requests").delete().eq("id", id);
    setRequests(p => p.filter(r => r.id !== id));
  }

  const filtered = requests.filter(r => {
    const role = r.poster_role || r.poster_type;
    if (filterRole !== "all" && role !== filterRole) return false;
    if (filterType !== "all" && r.request_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const myRequests = requests.filter(r => r.user_id === profile?.id);

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        .fc{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:9999px;border:2px solid #E8E0D0;background:#fff;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:inherit}
        .fc:hover{border-color:#111110;color:#111110}
        .fc.on{background:#111110;border-color:#111110;color:#FFD400}
        .fc.artist{background:#FFD400;border-color:#111110;color:#111110}
        .fc.venue{background:#E0F2FE;border-color:#0C4A6E;color:#0C4A6E}
        .sw{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:10px;padding:0 12px;height:38px;flex:1;min-width:0;max-width:280px;transition:border-color .15s}
        .sw:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.14)}
        .sw input{flex:1;border:none;outline:none;font-size:13px;font-family:inherit;font-weight:600;color:#111110;background:transparent}
        .pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:15px}
        @keyframes fu{from{opacity:0;transform:translateY(13px)}to{opacity:1;transform:none}}
        .fu{animation:fu .3s cubic-bezier(.16,1,.3,1) both}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FFD400", border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
                <Sparkles size={16} color="#111110" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-0.6px", margin: 0 }}>The Pool</h1>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", margin: 0 }}>Open requests from artists and venues — find your next collab, showcase, or acquisition</p>
          </div>
          {profile && (
            <button onClick={() => { setEditReq(undefined); setShowForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .12s", flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              <Plus size={15} /> Post a Request
            </button>
          )}
        </div>

        {/* My requests strip */}
        {myRequests.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 11, display: "flex", alignItems: "center", gap: 8 }}>
              Your requests <div style={{ flex: 1, height: 1, background: "#E8E0D0" }} />
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {myRequests.map(r => {
                const ti = tInfo(r.request_type);
                const style = tStyle(r.request_type);
                return (
                  <div key={r.id} onClick={() => setSelected(r)} style={{ flexShrink: 0, width: 210, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 13, padding: "11px 13px", cursor: "pointer", transition: "all .12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFD400"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #FFD400"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <span style={{ padding: "2px 7px", borderRadius: 9999, background: style.bg, color: style.color, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const }}>{ti?.emoji} {ti?.label || r.request_type}</span>
                      <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: r.status === "open" ? "#16A34A" : "#C0B8A8", flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#111110", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{r.title}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8" }}>{timeAgo(r.created_at)}</span>
                      <button onClick={e => { e.stopPropagation(); setEditReq(r); setShowForm(true); }} style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", background: "none", border: "1.5px solid #E8E0D0", borderRadius: 7, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                        <Pencil size={9} /> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div className="sw"><Search size={12} color="#C0B8A8" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…" /></div>
            <button onClick={() => setShowFilters(p => !p)} className={`fc${showFilters ? " on" : ""}`}><SlidersHorizontal size={11} /> Filters {showFilters ? "▲" : "▼"}</button>
            <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>{filtered.length} requests</div>
          </div>

          {showFilters && (
            <div className="fu" style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 13, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 11, marginBottom: 10 }}>
              {[
                { label: "Posted by", opts: [["all","All",""],["artist","🎨 Artists","artist"],["venue","🏛️ Venues","venue"]] as [string,string,string][], val: filterRole, set: setFilterRole },
                { label: "Status", opts: [["all","All",""],["open","✓ Open",""],["closed","Closed",""]] as [string,string,string][], val: filterStatus, set: setFilterStatus },
              ].map(({ label, opts, val, set }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 7 }}>{label}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {opts.map(([v, l, cls]) => <button key={v} onClick={() => set(v as any)} className={`fc${val === v ? (cls ? ` ${cls}` : " on") : ""}`}>{l}</button>)}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 7 }}>Type</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <button onClick={() => setFilterType("all")} className={`fc${filterType === "all" ? " on" : ""}`}>All</button>
                  {UNIQUE_TYPES.map(t => <button key={t.key} onClick={() => setFilterType(t.key)} className={`fc${filterType === t.key ? " on" : ""}`}>{t.emoji} {t.label}</button>)}
                </div>
              </div>
            </div>
          )}

          {!showFilters && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([["all","All",""],["artist","🎨 Artists","artist"],["venue","🏛️ Venues","venue"]] as [string,string,string][]).map(([v,l,cls]) => (
                <button key={v} onClick={() => setFilterRole(v as any)} className={`fc${filterRole === v ? (cls ? ` ${cls}` : " on") : ""}`}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 0", gap: 12 }}>
            <div style={{ width: 30, height: 30, border: "3px solid #FFD400", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading pool…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center", background: "#fff", border: "2.5px dashed #E0D8CA", borderRadius: 20 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🌊</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#111110", marginBottom: 6 }}>The pool is quiet</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginBottom: 20 }}>
              {search || filterRole !== "all" || filterType !== "all" ? "No requests match your filters." : "Be the first to post a request!"}
            </div>
            {profile && <button onClick={() => { setEditReq(undefined); setShowForm(true); }} style={{ padding: "10px 20px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>+ Post a Request</button>}
          </div>
        ) : (
          <div className="pg">
            {filtered.map((r, i) => (
              <div key={r.id} className="fu" style={{ animationDelay: `${Math.min(i * 0.03, 0.25)}s` }}>
                <PoolCard req={r} onClick={() => setSelected(r)} isOwn={r.user_id === profile?.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selected && (
        <RequestModal req={selected} onClose={() => setSelected(null)} currentUserId={profile?.id}
          onEdit={r => { setEditReq(r); setShowForm(true); }}
          onDelete={async id => { await handleDelete(id); setSelected(null); }}
        />
      )}
      {showForm && profile && (
        <RequestFormModal userRole={profile.role || "artist"} userId={profile.id} existing={editReq}
          onClose={() => { setShowForm(false); setEditReq(undefined); }}
          onSaved={loadRequests}
        />
      )}
    </>
  );
}
