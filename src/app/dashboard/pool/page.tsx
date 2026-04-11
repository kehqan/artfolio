"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X, Plus, ImageIcon, ChevronDown, MapPin,
  Calendar, Handshake, Eye, Building2, Palette,
  ArrowUpRight, Clock, Search, SlidersHorizontal,
  Sparkles, Upload, Check,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Profile = {
  id: string;
  full_name: string;
  username: string;
  role?: string;
  avatar_url?: string;
  location?: string;
};

type PoolRequest = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  request_type: string;
  poster_type: "artist" | "venue";
  cover_image?: string;
  location?: string;
  deadline?: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url?: string;
    role?: string;
    location?: string;
  };
};

// ─────────────────────────────────────────────
// Request type configs
// ─────────────────────────────────────────────
const ARTIST_TYPES = [
  { key: "showcase",    label: "Looking to Showcase",   emoji: "🖼️",  desc: "Find a venue to exhibit your work" },
  { key: "lend",        label: "Lending Artwork",        emoji: "🤝",  desc: "Lend pieces to another artist or institution" },
  { key: "collab",      label: "Seeking Collaboration",  emoji: "✨",  desc: "Partner with another artist on a project" },
  { key: "residency",   label: "Looking for Residency",  emoji: "🏠",  desc: "Find a studio or residency program" },
  { key: "commission",  label: "Open for Commission",    emoji: "🎨",  desc: "Available for commissioned work" },
];

const VENUE_TYPES = [
  { key: "gathering",   label: "Hosting a Gathering",    emoji: "🎪",  desc: "Looking for artists for an event or show" },
  { key: "selection",   label: "Selecting Artists",      emoji: "🔍",  desc: "Curating a collection or exhibition" },
  { key: "buying",      label: "Looking to Buy",         emoji: "💰",  desc: "Interested in acquiring artworks" },
  { key: "residency",   label: "Offering Residency",     emoji: "🏛️",  desc: "Studio or residency space available" },
  { key: "collab",      label: "Venue Collaboration",    emoji: "🤝",  desc: "Partner with another venue or institution" },
];

const TYPE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  showcase:   { bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" },
  lend:       { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" },
  collab:     { bg: "#FEF9C3", color: "#CA8A04", border: "#FDE047" },
  residency:  { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  commission: { bg: "#FFE4E6", color: "#BE123C", border: "#FCA5A5" },
  gathering:  { bg: "#FFD400", color: "#111110", border: "#111110" },
  selection:  { bg: "#F0FDF4", color: "#166534", border: "#86EFAC" },
  buying:     { bg: "#111110", color: "#FFD400", border: "#333" },
  open:       { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" },
  closed:     { bg: "#F5F0E8", color: "#9B8F7A", border: "#E8E0D0" },
};

function typeStyle(key: string) {
  return TYPE_STYLE[key] || { bg: "#F5F0E8", color: "#9B8F7A", border: "#E8E0D0" };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─────────────────────────────────────────────
// Request Detail Modal
// ─────────────────────────────────────────────
function RequestModal({ req, onClose, currentUserId }: {
  req: PoolRequest;
  onClose: () => void;
  currentUserId?: string;
}) {
  const ts = typeStyle(req.request_type);
  const allTypes = [...ARTIST_TYPES, ...VENUE_TYPES];
  const typeInfo = allTypes.find(t => t.key === req.request_type);
  const isVenue = req.poster_type === "venue";
  const isOwn = currentUserId === req.user_id;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(17,17,16,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", position: "relative" }}
      >
        {/* Cover image or gradient header */}
        <div style={{ position: "relative", height: 200, borderRadius: "22px 22px 0 0", overflow: "hidden", background: req.cover_image ? "#111" : isVenue ? "#111110" : "#FFD400", flexShrink: 0 }}>
          {req.cover_image
            ? <img src={req.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
            : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, opacity: 0.15 }}>
                {isVenue ? "🏛️" : "🎨"}
              </div>
            )
          }
          {/* gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(17,17,16,0.7) 100%)" }} />
          {/* type badge */}
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9999, background: ts.bg, border: `2px solid ${ts.border}`, fontSize: 11, fontWeight: 800, color: ts.color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {typeInfo?.emoji} {typeInfo?.label || req.request_type}
          </div>
          {/* role badge */}
          <div style={{ position: "absolute", top: 14, right: 52, padding: "4px 10px", borderRadius: 9999, background: isVenue ? "#E0F2FE" : "#FFD400", border: "2px solid #111110", fontSize: 10, fontWeight: 800, color: isVenue ? "#0C4A6E" : "#111110", textTransform: "uppercase" }}>
            {isVenue ? "🏛️ Venue" : "🎨 Artist"}
          </div>
          {/* close */}
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={15} color="#FFD400" />
          </button>
        </div>

        <div style={{ padding: "24px 28px 32px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: "2.5px solid #111110", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
              {req.profiles?.avatar_url
                ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (req.profiles?.full_name || "?")[0]
              }
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{req.profiles?.full_name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>
                @{req.profiles?.username}
                {req.profiles?.location && ` · ${req.profiles.location}`}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {timeAgo(req.created_at)}
            </div>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.7px", lineHeight: 1.1, marginBottom: 14 }}>{req.title}</h2>

          {/* Description */}
          {req.description && (
            <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.75, fontWeight: 500, marginBottom: 20 }}>{req.description}</p>
          )}

          {/* Meta row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            {req.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "#5C5346", border: "1.5px solid #E8E0D0" }}>
                <MapPin size={11} color="#FF6B6B" /> {req.location}
              </div>
            )}
            {req.deadline && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "#5C5346", border: "1.5px solid #E8E0D0" }}>
                <Calendar size={11} color="#9B8F7A" /> Deadline: {fmtDate(req.deadline)}
              </div>
            )}
            <div style={{ padding: "5px 12px", background: req.status === "open" ? "#DCFCE7" : "#F5F0E8", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: req.status === "open" ? "#16A34A" : "#9B8F7A", border: `1.5px solid ${req.status === "open" ? "#86EFAC" : "#E8E0D0"}` }}>
              {req.status === "open" ? "✓ Open" : "Closed"}
            </div>
          </div>

          {/* CTA */}
          {!isOwn && (
            <div style={{ display: "flex", gap: 10 }}>
              <a href={req.profiles?.username ? `/${req.profiles.username}` : "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1 }}>
                <button style={{ width: "100%", padding: "13px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#111110" }}>
                  <ArrowUpRight size={16} /> View Profile & Connect
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// New Request Modal
// ─────────────────────────────────────────────
function NewRequestModal({ userRole, userId, onClose, onCreated }: {
  userRole: string;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const sb = createClient();
  const isVenue = userRole === "gallery" || userRole === "venue";
  const TYPES = isVenue ? VENUE_TYPES : ARTIST_TYPES;

  const [step, setStep] = useState<"type" | "details">("type");
  const [form, setForm] = useState({
    request_type: "",
    title: "",
    description: "",
    cover_image: "",
    location: "",
    deadline: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadCover(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `pool/${userId}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
      setForm(p => ({ ...p, cover_image: publicUrl }));
    }
    setUploading(false);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError("Please add a title"); return; }
    setSaving(true);
    setError("");
    const { error: insertErr } = await sb.from("pool_requests").insert({
      user_id: userId,
      poster_type: isVenue ? "venue" : "artist",
      request_type: form.request_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      cover_image: form.cover_image || null,
      location: form.location.trim() || null,
      deadline: form.deadline || null,
      status: "open",
    });
    setSaving(false);
    if (insertErr) { setError(insertErr.message); return; }
    onCreated();
    onClose();
  }

  const selectedType = TYPES.find(t => t.key === form.request_type);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(17,17,16,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "2px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 3 }}>
              {isVenue ? "🏛️ Venue Request" : "🎨 Artist Request"}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", letterSpacing: "-0.4px" }}>
              {step === "type" ? "What are you looking for?" : "Add the details"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={15} color="#FFD400" />
          </button>
        </div>

        <div style={{ padding: "22px 24px 28px" }}>

          {/* STEP 1: Pick type */}
          {step === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TYPES.map(t => {
                const ts = typeStyle(t.key);
                const selected = form.request_type === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setForm(p => ({ ...p, request_type: t.key }))}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `2.5px solid ${selected ? "#111110" : "#E8E0D0"}`, borderRadius: 16, background: selected ? "#FFFBEA" : "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s", boxShadow: selected ? "3px 3px 0 #111110" : "none" }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: ts.bg, border: `2px solid ${selected ? "#111110" : ts.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {t.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>{t.desc}</div>
                    </div>
                    {selected && <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={12} strokeWidth={3} /></div>}
                  </button>
                );
              })}

              <button
                onClick={() => { if (form.request_type) setStep("details"); }}
                disabled={!form.request_type}
                style={{ marginTop: 8, padding: "13px", background: form.request_type ? "#FFD400" : "#F5F0E8", border: "2.5px solid #111110", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: form.request_type ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110", boxShadow: form.request_type ? "3px 3px 0 #111110" : "none", transition: "all .15s" }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2: Details */}
          {step === "details" && (
            <div>
              {/* Selected type indicator */}
              {selectedType && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 20 }}>{selectedType.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{selectedType.label}</div>
                    <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{selectedType.desc}</div>
                  </div>
                  <button onClick={() => setStep("type")} style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>Change</button>
                </div>
              )}

              {/* Cover image */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Cover Image <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(optional)</span></label>
                {form.cover_image ? (
                  <div style={{ position: "relative", height: 140, borderRadius: 14, overflow: "hidden", border: "2px solid #111110" }}>
                    <img src={form.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => setForm(p => ({ ...p, cover_image: "" }))} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X size={13} color="#FFD400" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{ height: 100, border: "2.5px dashed #D4C9A8", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "#FAF7F3", transition: "all .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#FFD400")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#D4C9A8")}
                  >
                    {uploading ? <div style={{ width: 20, height: 20, border: "2.5px solid #FFD400", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> : <Upload size={20} color="#C0B8A8" />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>{uploading ? "Uploading…" : "Click to upload"}</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />
              </div>

              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={selectedType ? `e.g. ${selectedType.label} — describe your need` : "Add a clear title…"}
                  style={{ width: "100%", padding: "11px 14px", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#111110", fontFamily: "inherit", background: "#fff", outline: "none", transition: "border-color .15s" }}
                  onFocus={e => (e.target.style.borderColor = "#FFD400")}
                  onBlur={e => (e.target.style.borderColor = "#E8E0D0")}
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7 }}>Details <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Share context — what are you looking for, what can you offer, timeline, style…"
                  rows={4}
                  style={{ width: "100%", padding: "11px 14px", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 13, fontWeight: 500, color: "#111110", fontFamily: "inherit", background: "#fff", outline: "none", resize: "vertical", transition: "border-color .15s" }}
                  onFocus={e => (e.target.style.borderColor = "#FFD400")}
                  onBlur={e => (e.target.style.borderColor = "#E8E0D0")}
                />
              </div>

              {/* Location + Deadline row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7 }}>Location <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(opt.)</span></label>
                  <input
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="City, Country"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#111110", fontFamily: "inherit", background: "#fff", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#FFD400")}
                    onBlur={e => (e.target.style.borderColor = "#E8E0D0")}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7 }}>Deadline <span style={{ fontWeight: 600, color: "#C0B8A8" }}>(opt.)</span></label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#111110", fontFamily: "inherit", background: "#fff", outline: "none" }}
                    onFocus={e => (e.target.style.borderColor = "#FFD400")}
                    onBlur={e => (e.target.style.borderColor = "#E8E0D0")}
                  />
                </div>
              </div>

              {error && <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 14 }}>⚠ {error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep("type")} style={{ padding: "12px 20px", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.title.trim()}
                  style={{ flex: 1, padding: "12px", background: saving || !form.title.trim() ? "#F5F0E8" : "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: saving || !form.title.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving || !form.title.trim() ? "none" : "3px 3px 0 #111110" }}
                >
                  {saving ? "Posting…" : "Post to Pool ✓"}
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
// Pool Request Card
// ─────────────────────────────────────────────
function PoolCard({ req, onClick }: { req: PoolRequest; onClick: () => void }) {
  const ts = typeStyle(req.request_type);
  const allTypes = [...ARTIST_TYPES, ...VENUE_TYPES];
  const typeInfo = allTypes.find(t => t.key === req.request_type);
  const isVenue = req.poster_type === "venue";
  const initials = (req.profiles?.full_name || "?")[0];

  return (
    <div
      onClick={onClick}
      style={{ background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "all .25s cubic-bezier(.16,1,.3,1)", position: "relative" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#111110";
        (e.currentTarget as HTMLElement).style.boxShadow = "5px 6px 0 #111110";
        (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      {/* Image / header area */}
      <div style={{ height: 140, position: "relative", overflow: "hidden", background: req.cover_image ? "#111" : isVenue ? "#111110" : "#FFD400", flexShrink: 0 }}>
        {req.cover_image
          ? <img src={req.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s cubic-bezier(.16,1,.3,1)" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, opacity: 0.18 }}>
              {isVenue ? "🏛️" : "🎨"}
            </div>
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(17,17,16,0.55) 100%)" }} />

        {/* Type chip */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 9999, background: ts.bg, border: `1.5px solid ${ts.border}`, fontSize: 9, fontWeight: 800, color: ts.color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {typeInfo?.emoji} {typeInfo?.label || req.request_type}
        </div>

        {/* Role badge top-right */}
        <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 9px", borderRadius: 9999, background: isVenue ? "#E0F2FE" : "#FFD400", border: "1.5px solid #111110", fontSize: 9, fontWeight: 800, color: isVenue ? "#0C4A6E" : "#111110", textTransform: "uppercase" }}>
          {isVenue ? "Venue" : "Artist"}
        </div>

        {/* Author avatar bottom-left */}
        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: "2px solid #fff", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
            {req.profiles?.avatar_url
              ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {req.profiles?.full_name}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", letterSpacing: "-0.3px", marginBottom: 6, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
          {req.title}
        </div>
        {req.description && (
          <p style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.55, fontWeight: 500, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
            {req.description}
          </p>
        )}

        {/* Footer row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: req.description ? 0 : 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {req.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
                <MapPin size={10} color="#FF6B6B" /> {req.location}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8" }}>{timeAgo(req.created_at)}</span>
        </div>

        {/* Open/closed status dot */}
        <div style={{ position: "absolute", bottom: 16, right: 14, width: 8, height: 8, borderRadius: "50%", background: req.status === "open" ? "#16A34A" : "#C0B8A8", border: "1.5px solid #fff" }} />
      </div>
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
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<PoolRequest | null>(null);

  // Filters
  const [filterRole, setFilterRole] = useState<"all" | "artist" | "venue">("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadUser();
    loadRequests();
  }, []);

  async function loadUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from("profiles").select("id, full_name, username, role, avatar_url, location").eq("id", user.id).single();
    if (data) setProfile(data);
  }

  async function loadRequests() {
    setLoading(true);
    const { data } = await sb
      .from("pool_requests")
      .select("*, profiles(full_name, username, avatar_url, role, location)")
      .order("created_at", { ascending: false })
      .limit(80);
    setRequests((data as PoolRequest[]) || []);
    setLoading(false);
  }

  const allTypes = [...ARTIST_TYPES, ...VENUE_TYPES];
  const uniqueTypes = Array.from(new Map(allTypes.map(t => [t.key, t])).values());

  const filtered = requests.filter(r => {
    if (filterRole !== "all" && r.poster_type !== filterRole) return false;
    if (filterType !== "all" && r.request_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const myRequests = requests.filter(r => r.user_id === profile?.id);
  const isVenueUser = profile?.role === "gallery" || profile?.role === "venue";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        body{font-family:'Darker Grotesque',system-ui,sans-serif}

        .pool-card-img:hover img { transform: scale(1.05); }

        .filter-chip{
          display:inline-flex;align-items:center;gap:5px;
          padding:6px 14px;border-radius:9999px;border:2px solid #E8E0D0;
          background:#fff;font-size:12px;font-weight:700;color:#9B8F7A;
          cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;
        }
        .filter-chip:hover{border-color:#111110;color:#111110}
        .filter-chip.active{background:#111110;border-color:#111110;color:#FFD400}
        .filter-chip.artist-active{background:#FFD400;border-color:#111110;color:#111110}
        .filter-chip.venue-active{background:#E0F2FE;border-color:#0C4A6E;color:#0C4A6E}

        .search-wrap{
          display:flex;align-items:center;gap:8px;
          background:#fff;border:2px solid #E8E0D0;borderRadius:12px;
          padding:0 14px;height:40px;flex:1;min-width:0;max-width:320px;
          transition:border-color .15s;
        }
        .search-wrap:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.15)}
        .search-wrap input{flex:1;border:none;outline:none;font-size:13px;font-family:inherit;font-weight:600;color:#111110;background:transparent}

        .pool-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
          gap:18px;
        }

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .fu{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Page body ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── TOP HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FFD400", border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
                <Sparkles size={18} color="#111110" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0 }}>The Pool</h1>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A", margin: 0 }}>
              Open requests from artists and venues — find your next collab, showcase, or acquisition
            </p>
          </div>

          {/* New request CTA */}
          {profile && (
            <button
              onClick={() => setShowNew(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .15s", flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              <Plus size={16} />
              Post a Request
            </button>
          )}
        </div>

        {/* ── MY REQUESTS (if any) ── */}
        {myRequests.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              Your requests
              <div style={{ flex: 1, height: 1, background: "#E8E0D0" }} />
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
              {myRequests.map(r => {
                const ts = typeStyle(r.request_type);
                const allT = [...ARTIST_TYPES, ...VENUE_TYPES];
                const ti = allT.find(t => t.key === r.request_type);
                return (
                  <div key={r.id} onClick={() => setSelected(r)} style={{ flexShrink: 0, width: 240, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#FFD400"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #FFD400"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 9999, background: ts.bg, color: ts.color, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{ti?.emoji} {ti?.label || r.request_type}</span>
                      <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: r.status === "open" ? "#16A34A" : "#C0B8A8", flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{r.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#C0B8A8", marginTop: 6 }}>{timeAgo(r.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILTERS ── */}
        <div style={{ marginBottom: 22 }}>
          {/* Search + filter toggle row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div className="search-wrap">
              <Search size={13} color="#C0B8A8" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…" />
            </div>
            <button onClick={() => setShowFilters(p => !p)} className={`filter-chip${showFilters ? " active" : ""}`}>
              <SlidersHorizontal size={12} /> Filters {showFilters ? "▲" : "▼"}
            </button>
            <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>
              {filtered.length} requests
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="fu" style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Role filter */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Posted by</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["all", "All"], ["artist", "🎨 Artists"], ["venue", "🏛️ Venues"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFilterRole(v as any)} className={`filter-chip${filterRole === v ? (v === "artist" ? " artist-active" : v === "venue" ? " venue-active" : " active") : ""}`}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Type filter */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Request type</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setFilterType("all")} className={`filter-chip${filterType === "all" ? " active" : ""}`}>All types</button>
                  {uniqueTypes.map(t => (
                    <button key={t.key} onClick={() => setFilterType(t.key)} className={`filter-chip${filterType === t.key ? " active" : ""}`}>{t.emoji} {t.label}</button>
                  ))}
                </div>
              </div>
              {/* Status filter */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Status</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["all", "All"], ["open", "✓ Open"], ["closed", "Closed"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFilterStatus(v as any)} className={`filter-chip${filterStatus === v ? " active" : ""}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick role pills when filters closed */}
          {!showFilters && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["all", "All"], ["artist", "🎨 Artists"], ["venue", "🏛️ Venues"]].map(([v, l]) => (
                <button key={v} onClick={() => setFilterRole(v as any)} className={`filter-chip${filterRole === v ? (v === "artist" ? " artist-active" : v === "venue" ? " venue-active" : " active") : ""}`}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── REQUESTS GRID ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", flexDirection: "column", gap: 14 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #FFD400", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading pool…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center", background: "#fff", border: "2.5px dashed #E0D8CA", borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🌊</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#111110", marginBottom: 6 }}>The pool is quiet</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A", marginBottom: 24 }}>
              {search || filterRole !== "all" || filterType !== "all" ? "No requests match your filters." : "Be the first to post a request!"}
            </div>
            {profile && (
              <button onClick={() => setShowNew(true)} style={{ padding: "11px 24px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>
                + Post a Request
              </button>
            )}
          </div>
        ) : (
          <div className="pool-grid">
            {filtered.map((r, i) => (
              <div key={r.id} className="fu" style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
                <PoolCard req={r} onClick={() => setSelected(r)} />
              </div>
            ))}
          </div>
        )}

        {/* ── SQL reminder ── */}
        <div style={{ marginTop: 48, background: "#111110", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#FFD400", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Run once in Supabase SQL editor</div>
          <pre style={{ fontSize: 11, color: "#888", lineHeight: 1.8, overflow: "auto" }}>{`create table if not exists pool_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  poster_type text not null check (poster_type in ('artist','venue')),
  request_type text not null,
  title text not null,
  description text,
  cover_image text,
  location text,
  deadline date,
  status text default 'open' check (status in ('open','closed')),
  created_at timestamptz default now()
);
alter table pool_requests enable row level security;
create policy "Anyone can view open requests" on pool_requests for select using (true);
create policy "Users manage own requests" on pool_requests for all using (auth.uid() = user_id);`}</pre>
        </div>
      </div>

      {/* ── MODALS ── */}
      {selected && (
        <RequestModal req={selected} onClose={() => setSelected(null)} currentUserId={profile?.id} />
      )}
      {showNew && profile && (
        <NewRequestModal
          userRole={profile.role || "artist"}
          userId={profile.id}
          onClose={() => setShowNew(false)}
          onCreated={loadRequests}
        />
      )}
    </>
  );
}
