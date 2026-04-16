"use client";
import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X, Plus, MapPin, ArrowUpRight, Clock,
  Search, SlidersHorizontal, Sparkles, Upload, Check,
  ChevronLeft, ChevronRight, Pencil, Trash2, MessageSquare,
} from "lucide-react";
import MessageModal from "@/components/MessageModal";

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
  const [msgOpen, setMsgOpen] = useState(false);  // ← NEW

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

          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid #111110", overflow: "hidden", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
              {req.profiles?.avatar_url ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (req.profiles?.full_name || "?")[0]}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{req.profiles?.full_name || "Unknown"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>
                {req.profiles?.location || req.location || ""}
                {req.profiles?.role && <> · <span style={{ textTransform: "capitalize" }}>{req.profiles.role}</span></>}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#C0B8A8", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {timeAgo(req.created_at)}
            </div>
          </div>

          {/* Title & description */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 10 }}>{req.title}</h2>
          {req.description && <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.75, marginBottom: 16, fontWeight: 500 }}>{req.description}</p>}

          {/* Meta chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {req.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 11px", borderRadius: 9999, background: "#F5F0E8", border: "1.5px solid #E8E0D0", fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
                <MapPin size={10} color="#FF6B6B" /> {req.location}
              </div>
            )}
            {req.deadline && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 11px", borderRadius: 9999, background: "#FEF9C3", border: "1.5px solid #FDE047", fontSize: 11, fontWeight: 700, color: "#854D0E" }}>
                <Clock size={10} /> Deadline: {fmtDate(req.deadline)}
              </div>
            )}
            <div style={{ padding: "4px 11px", borderRadius: 9999, background: req.status === "open" ? "#DCFCE7" : "#F5F0E8", border: `1.5px solid ${req.status === "open" ? "#86EFAC" : "#E8E0D0"}`, fontSize: 11, fontWeight: 800, color: req.status === "open" ? "#16A34A" : "#9B8F7A", textTransform: "capitalize" }}>
              {req.status}
            </div>
          </div>

          {/* Action buttons */}
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
            // ── NON-OWNER: Message + View Profile ──────────────────
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Primary: Send Message */}
              <button
                onClick={() => setMsgOpen(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <MessageSquare size={15} /> Send Message
              </button>

              {/* Secondary: View Profile */}
              {req.profiles?.username && (
                <a href={`/${req.profiles.username}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 13, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "border-color .15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}
                  >
                    <ArrowUpRight size={14} /> View Profile
                  </button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MessageModal for this collab request ── */}
      <MessageModal
        isOpen={msgOpen}
        onClose={() => setMsgOpen(false)}
        recipientId={req.user_id}
        recipientName={req.profiles?.full_name || "Artist"}
        recipientAvatar={req.profiles?.avatar_url}
        recipientRole={req.profiles?.role}
        contextType="collab"
        contextTitle={req.title}
        contextId={req.id}
        contextMeta={{
          emoji: isVenue ? "🏛️" : "🎨",
          label: tInfo(req.request_type)?.label || req.request_type,
          image: getImgs(req)[0],
          subtitle: req.location || req.profiles?.location,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Pool Card — unified card design
// ─────────────────────────────────────────────
function PoolCard({ req, onClick, isOwn }: { req: PoolRequest; onClick: () => void; isOwn: boolean }) {
  const [msgOpen, setMsgOpen] = useState(false);
  const [isHov, setIsHov] = useState(false);

  const style = tStyle(req.request_type);
  const ti = tInfo(req.request_type);
  const isVenue = (req.poster_role || req.poster_type) === "venue";
  const imgs = getImgs(req);
  const hasImg = imgs.length > 0;

  // Fallback gradient when no image
  const fallbackGradient = isVenue
    ? "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)"
    : "linear-gradient(135deg, #1a0a00 0%, #7c2d00 50%, #ea580c 100%)";

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHov(true)}
        onMouseLeave={() => setIsHov(false)}
        style={{
          background: "#fff",
          border: `2.5px solid ${isHov ? "#111110" : "#E8E0D0"}`,
          borderRadius: 20, overflow: "hidden", cursor: "pointer",
          transition: "all .25s cubic-bezier(.16,1,.3,1)", position: "relative",
          boxShadow: isHov ? "5px 6px 0 #111110" : "3px 4px 0 #D4C9A8",
          transform: isHov ? "translate(-2px,-3px)" : "none",
        }}
      >
        {/* ── HERO ── */}
        <div style={{
          height: 200, position: "relative", overflow: "hidden", flexShrink: 0,
          background: hasImg ? "#111" : fallbackGradient,
        }}>
          {hasImg && (
            <img src={imgs[0]} alt="" style={{
              width: "100%", height: "100%", objectFit: "cover",
              transition: "transform .4s cubic-bezier(.16,1,.3,1)",
              transform: isHov ? "scale(1.04)" : "scale(1)",
            }} />
          )}
          {!hasImg && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, opacity: 0.2 }}>
              {isVenue ? "🏛️" : "🎨"}
            </div>
          )}

          {/* Dark gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.62) 100%)" }} />

          {/* ── Liquid glass type badge — top left ── */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 99,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              fontSize: 9, fontWeight: 900, color: "#fff",
              textTransform: "uppercase" as const, letterSpacing: ".12em",
            }}>
              {ti?.emoji} {ti?.label || req.request_type}
            </div>
            {imgs.length > 1 && (
              <div style={{
                padding: "4px 8px", borderRadius: 99,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                fontSize: 9, fontWeight: 800, color: "#fff",
              }}>
                {imgs.length} photos
              </div>
            )}
          </div>

          {/* ── Liquid glass owner controls — top right ── */}
          {isOwn && (
            <div style={{ position: "absolute", top: 10, right: 10 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", gap: 5 }}>
                {/* edit/delete handled via onClick → detail modal */}
              </div>
            </div>
          )}

          {/* ── Author + title on image bottom ── */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px 14px" }}>
            {/* Author row */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                border: "1.5px solid rgba(255,255,255,0.4)",
                overflow: "hidden", background: "#FFD400",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900, color: "#111110", flexShrink: 0,
              }}>
                {req.profiles?.avatar_url
                  ? <img src={req.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (req.profiles?.full_name || "?")[0]}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {req.profiles?.full_name || "Unknown"}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{timeAgo(req.created_at)}</span>
            </div>
            {/* Title */}
            <h3 style={{
              fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-.3px", margin: 0, lineHeight: 1.2,
              textShadow: "0 1px 8px rgba(0,0,0,.5)",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden",
            }}>
              {req.title}
            </h3>
          </div>
        </div>

        {/* ── CARD BODY ── */}
        <div style={{ padding: "12px 14px 14px" }}>
          {/* Description */}
          {req.description && (
            <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", marginBottom: 8 }}>
              {req.description}
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {req.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>
                <MapPin size={9} color="#FF6B6B" />{req.location}
              </span>
            )}
            {req.deadline && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#854D0E" }}>
                <Clock size={9} /> {fmtDate(req.deadline)}
              </span>
            )}
          </div>
        </div>

        {/* ── CARD FOOTER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 12px", borderTop: "1px solid #F5F0E8" }}>
          {/* Status liquid glass pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 11px", borderRadius: 99,
            background: req.status === "open" ? "rgba(22,163,74,0.1)" : "rgba(155,143,122,0.1)",
            border: `1.5px solid ${req.status === "open" ? "rgba(22,163,74,0.3)" : "rgba(155,143,122,0.2)"}`,
            fontSize: 10, fontWeight: 800,
            color: req.status === "open" ? "#16A34A" : "#9B8F7A",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: req.status === "open" ? "#16A34A" : "#C0B8A8" }} />
            {req.status === "open" ? "Open" : "Closed"}
          </div>

          {/* Message liquid glass pill (non-owners) */}
          {!isOwn && (
            <button
              onClick={e => { e.stopPropagation(); setMsgOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 12px", borderRadius: 99, border: "none",
                background: "rgba(255,212,0,0.15)",
                border: "1.5px solid rgba(255,212,0,0.4)" as any,
                backdropFilter: "blur(4px)",
                fontSize: 10, fontWeight: 800, color: "#111110",
                cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "#FFD400"; el.style.borderColor = "#111110"; el.style.boxShadow = "2px 2px 0 #111110"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,212,0,0.15)"; el.style.borderColor = "rgba(255,212,0,0.4)"; el.style.boxShadow = "none"; }}
            >
              <MessageSquare size={10} /> Message
            </button>
          )}
        </div>
      </div>

      {/* MessageModal */}
      {!isOwn && (
        <MessageModal
          isOpen={msgOpen}
          onClose={() => setMsgOpen(false)}
          recipientId={req.user_id}
          recipientName={req.profiles?.full_name || "Artist"}
          recipientAvatar={req.profiles?.avatar_url}
          recipientRole={req.profiles?.role}
          contextType="collab"
          contextTitle={req.title}
          contextId={req.id}
          contextMeta={{
            emoji: isVenue ? "🏛️" : "🎨",
            label: tInfo(req.request_type)?.label || req.request_type,
            image: imgs[0],
            subtitle: req.location || req.profiles?.location,
          }}
        />
      )}
    </>
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
      const path = `${userId}/pool/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
      if (!upErr) {
        const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
        uploaded.push(publicUrl);
      } else {
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
          {/* Step 1: Type picker */}
          {step === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {TYPES.map(t => {
                const st = tStyle(t.key);
                const sel = form.request_type === t.key;
                return (
                  <button key={t.key} onClick={() => setForm(p => ({ ...p, request_type: t.key }))} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", border: `2.5px solid ${sel ? "#111110" : "#E8E0D0"}`, borderRadius: 13, background: sel ? "#FFFBEA" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .14s", textAlign: "left" as const }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, border: `1.5px solid ${st.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{t.emoji}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 500 }}>{t.desc}</div>
                    </div>
                    {sel && <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={11} strokeWidth={3} /></div>}
                  </button>
                );
              })}
              <button disabled={!form.request_type} onClick={() => setStep("details")} style={{ marginTop: 8, padding: "12px", background: form.request_type ? "#FFD400" : "#F5F0E8", border: "2.5px solid #111110", borderRadius: 13, fontSize: 14, fontWeight: 800, cursor: form.request_type ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110", boxShadow: form.request_type ? "3px 3px 0 #111110" : "none" }}>
                {selType ? `Continue with "${selType.label}" →` : "Select a type to continue"}
              </button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!isEdit && (
                <button onClick={() => setStep("type")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: -4 }}>
                  ← Change type ({selType?.emoji} {selType?.label})
                </button>
              )}

              <div>
                <label style={lbl}>Title *</label>
                <input style={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Describe what you're looking for…" />
              </div>

              <div>
                <label style={lbl}>Description</label>
                <textarea style={{ ...inp, minHeight: 90, resize: "vertical" as const }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="More details about your request, timeline, what you're looking for…" rows={3} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Location</label>
                  <input style={inp} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Prague, CZ" />
                </div>
                <div>
                  <label style={lbl}>Deadline</label>
                  <input type="date" style={inp} value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
                </div>
              </div>

              {/* Images */}
              <div>
                <label style={lbl}>Images ({form.images.length}/5)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ width: 72, height: 72, borderRadius: 10, border: "2px solid #E8E0D0", overflow: "hidden", position: "relative" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <X size={9} color="#FFD400" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <button onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 10, border: "2px dashed #E8E0D0", background: "#F5F0E8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#9B8F7A", fontFamily: "inherit" }}>
                      <Upload size={16} color="#9B8F7A" /> Add
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files && uploadImages(e.target.files)} />
                {uploading && <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 700 }}>Uploading…</div>}
              </div>

              {/* Status */}
              <div>
                <label style={lbl}>Status</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["open", "closed"] as const).map(s => (
                    <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))} style={{ flex: 1, padding: "9px", border: `2px solid ${form.status === s ? "#111110" : "#E8E0D0"}`, borderRadius: 10, background: form.status === s ? "#FFD400" : "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}>{error}</div>}

              <button onClick={handleSubmit} disabled={saving || !form.title.trim() || uploading} style={{ padding: "13px", background: saving || !form.title.trim() || uploading ? "#F5F0E8" : "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontSize: 14, fontWeight: 800, cursor: saving || !form.title.trim() || uploading ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving || !form.title.trim() || uploading ? "none" : "3px 3px 0 #111110" }}>
                {saving ? "Saving…" : uploading ? "Uploading…" : isEdit ? "Save changes ✓" : "Post to Pool ✓"}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
            <button
              onClick={() => { setEditReq(undefined); setShowForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .12s", flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              <Plus size={14} strokeWidth={3} /> Post a Request
            </button>
          )}
        </div>

        {/* Filters bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="sw">
            <Search size={13} color="#9B8F7A" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…" />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", display: "flex", padding: 0 }}><X size={12} /></button>}
          </div>

          <button onClick={() => setShowFilters(p => !p)} className={`fc${showFilters ? " on" : ""}`}>
            <SlidersHorizontal size={12} /> {showFilters ? "Hide filters" : "Filters"}
          </button>

          {(["all", "open", "closed"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`fc${filterStatus === s ? " on" : ""}`} style={{ textTransform: "capitalize" }}>{s === "all" ? "All status" : s}</button>
          ))}
        </div>

        {showFilters && (
          <div style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, padding: "16px 20px", marginBottom: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 7 }}>Who</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {([["all","All",""],["artist","🎨 Artists","artist"],["venue","🏛️ Venues","venue"]] as [string,string,string][]).map(([v,l,cls]) => (
                  <button key={v} onClick={() => setFilterRole(v as any)} className={`fc${filterRole === v ? (cls ? ` ${cls}` : " on") : ""}`}>{l}</button>
                ))}
              </div>
            </div>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {([["all","All",""],["artist","🎨 Artists","artist"],["venue","🏛️ Venues","venue"]] as [string,string,string][]).map(([v,l,cls]) => (
              <button key={v} onClick={() => setFilterRole(v as any)} className={`fc${filterRole === v ? (cls ? ` ${cls}` : " on") : ""}`}>{l}</button>
            ))}
          </div>
        )}

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
        <RequestModal
          req={selected}
          onClose={() => setSelected(null)}
          currentUserId={profile?.id}
          onEdit={r => { setEditReq(r); setShowForm(true); }}
          onDelete={async id => { await handleDelete(id); setSelected(null); }}
        />
      )}
      {showForm && profile && (
        <RequestFormModal
          userRole={profile.role || "artist"}
          userId={profile.id}
          existing={editReq}
          onClose={() => { setShowForm(false); setEditReq(undefined); }}
          onSaved={loadRequests}
        />
      )}
    </>
  );
}
