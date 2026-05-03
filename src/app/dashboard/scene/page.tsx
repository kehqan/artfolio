"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Clock, X, Share2, MessageSquare, Pencil,
  Calendar, Globe, Sparkles, Upload, Check,
  AlertCircle, Trash2,
} from "lucide-react";
import Link from "next/link";
import MessageModal from "@/components/MessageModal";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type PostType = "event" | "exhibition" | "collab" | "opencall" | "commission";
type FilterKey = "all" | PostType | "online" | "upcoming";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  role?: string;
}

interface FeedItem {
  id: string;
  source: "exhibition" | "pool_request" | "calendar_event";
  post_type: PostType;
  title: string;
  description?: string;
  cover_image?: string;
  images?: string[];
  location?: string;
  is_online?: boolean;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  price_from?: string;
  created_at: string;
  user_id: string;
  poster?: Profile;
  from_calendar?: boolean;
}

interface EditorPick {
  id: string;
  type: string;
  tag_label: string;
  title: string;
  body?: string;
  emoji: string;
  bg_color: string;
  visual_bg: string;
  poster_name?: string;
  meta_label?: string;
  sort_order: number;
}

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────
const POST_TYPES: Record<PostType, { label: string; emoji: string; bg: string; color: string; border: string }> = {
  event:      { label: "Event",      emoji: "🗓️", bg: "#E0F2FE", color: "#0369A1", border: "#7DD3FC" },
  exhibition: { label: "Exhibition", emoji: "🖼️", bg: "#FEF9C3", color: "#92400E", border: "#FDE047" },
  collab:     { label: "Collab",     emoji: "🤝", bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" },
  opencall:   { label: "Open Call",  emoji: "🔍", bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
  commission: { label: "Commission", emoji: "🎨", bg: "#FFE4E6", color: "#BE123C", border: "#FCA5A5" },
};

const CARD_GRADIENTS: Record<PostType, string> = {
  event:      "linear-gradient(135deg, #E0F2FE 0%, #7DD3FC 100%)",
  exhibition: "linear-gradient(135deg, #FEF9C3 0%, #FFD400 100%)",
  collab:     "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)",
  opencall:   "linear-gradient(135deg, #DCFCE7 0%, #86EFAC 100%)",
  commission: "linear-gradient(135deg, #FFE4E6 0%, #FCA5A5 100%)",
};

const CREATE_TYPES: { key: PostType; emoji: string; name: string; desc: string }[] = [
  { key: "event",      emoji: "🗓️", name: "Event",      desc: "Workshop, opening, gathering, fair" },
  { key: "exhibition", emoji: "🖼️", name: "Exhibition", desc: "Solo show, group exhibition" },
  { key: "collab",     emoji: "🤝", name: "Collab",     desc: "Looking for a partner artist" },
  { key: "opencall",   emoji: "🔍", name: "Open Call",  desc: "Seeking artist submissions" },
  { key: "commission", emoji: "🎨", name: "Commission", desc: "Open for commissioned work" },
];

const POOL_TYPE_MAP: Record<string, PostType> = {
  showcase: "exhibition", lend: "collab", collab: "collab",
  commission: "commission", gathering: "event", selection: "opencall", buying: "opencall",
};

const POST_TO_POOL_TYPE: Record<PostType, string> = {
  exhibition: "showcase", event: "gathering", collab: "collab",
  opencall: "selection", commission: "commission",
};

const CAL_TYPE_MAP: Record<string, PostType> = {
  Exhibition: "exhibition", "Group Show": "exhibition",
  Workshop: "event", Opening: "event", Fair: "event",
  Gathering: "event", Talk: "event",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "event",      label: "🗓️ Events" },
  { key: "exhibition", label: "🖼️ Exhibitions" },
  { key: "collab",     label: "🤝 Collabs" },
  { key: "opencall",   label: "🔍 Open Calls" },
  { key: "commission", label: "🎨 Commissions" },
  { key: "online",     label: "🌐 Online only" },
  { key: "upcoming",   label: "📅 Upcoming" },
];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isUpcoming(item: FeedItem): boolean {
  const ref = item.end_date || item.start_date || item.deadline;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0, 0, 0, 0));
}

function ini(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", border: "2px solid #E8E0D0",
  borderRadius: 11, fontSize: 13, fontWeight: 600, color: "#111110",
  fontFamily: "inherit", background: "#fff", outline: "none", boxSizing: "border-box",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6,
};

// ─────────────────────────────────────────────────────────────────
// TypeBadge
// ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: PostType }) {
  const cfg = POST_TYPES[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 11px", background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 99, fontSize: 10, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 28 }: { name?: string; avatarUrl?: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.35), border: "2px solid #111110", background: "#FFD400", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 900, color: "#111110", overflow: "hidden" }}>
      {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Feed Card
// ─────────────────────────────────────────────────────────────────
function FeedCard({ item, isOwn, onClick }: { item: FeedItem; isOwn: boolean; onClick: () => void }) {
  const cfg = POST_TYPES[item.post_type];
  const grad = CARD_GRADIENTS[item.post_type];
  const coverImg = item.cover_image || (item.images && item.images[0]);

  return (
    <div onClick={onClick} style={{ marginBottom: 18, background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", cursor: "pointer", transition: "all .15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "6px 8px 0 #D4C9A8"; (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 4px 0 #D4C9A8"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
      {/* Cover */}
      <div style={{ height: coverImg ? 180 : 110, background: grad, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {coverImg
          ? <img src={coverImg} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <span style={{ fontSize: 40 }}>{cfg.emoji}</span>}
        <div style={{ position: "absolute", top: 10, left: 10 }}><TypeBadge type={item.post_type} /></div>
        {isOwn && <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 9px", background: "#111110", border: "2px solid #fff", borderRadius: 99, fontSize: 9, fontWeight: 800, color: "#fff" }}>✏️ Your post</div>}
        {item.from_calendar && <div style={{ position: "absolute", bottom: 8, left: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: "#EDE9FE", border: "1.5px solid #C4B5FD", borderRadius: 99, fontSize: 9, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em" }}>📆 From Calendar</div>}
      </div>
      {/* Body */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", lineHeight: 1.25, marginBottom: 8 }}>{item.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {(item.location || item.is_online) && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>
              {item.is_online ? <Globe size={11} /> : <MapPin size={11} />}
              <span>{item.is_online ? "Online" : item.location}</span>
            </div>
          )}
          {item.start_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>
              <Calendar size={11} />
              <span>{fmtDate(item.start_date)}{item.end_date && item.end_date !== item.start_date ? ` — ${fmtDate(item.end_date)}` : ""}</span>
            </div>
          )}
          {item.deadline && !item.start_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>
              <Clock size={11} /><span>Deadline: {fmtDate(item.deadline)}</span>
            </div>
          )}
          {item.price_from && <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>💰 From {item.price_from}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 11, borderTop: "1.5px solid #E8E0D0" }}>
          <Avatar name={item.poster?.full_name} avatarUrl={item.poster?.avatar_url} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111110", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.poster?.full_name || "Unknown"}</div>
            {item.poster?.role && <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A" }}>{item.poster.role}</div>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────────────────────────
function DetailModal({ item, isOwn, userId, onClose, onEdit }: { item: FeedItem; isOwn: boolean; userId: string | null; onClose: () => void; onEdit: () => void }) {
  const [showMsg, setShowMsg] = useState(false);
  const cfg = POST_TYPES[item.post_type];
  const grad = CARD_GRADIENTS[item.post_type];
  const coverImg = item.cover_image || (item.images && item.images[0]);

  const handleShare = () => {
    const url = `${window.location.origin}/scene`;
    if (navigator.share) { navigator.share({ title: item.title, url }).catch(() => {}); }
    else { navigator.clipboard.writeText(url).then(() => alert("Link copied!")); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,17,16,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 10px 0 #D4C9A8", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ height: coverImg ? 220 : 180, background: grad, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "2.5px solid #111110", overflow: "hidden" }}>
            {coverImg ? <img src={coverImg} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ fontSize: 72 }}>{cfg.emoji}</span>}
            <div style={{ position: "absolute", top: 14, left: 14 }}><TypeBadge type={item.post_type} /></div>
            {item.from_calendar && <div style={{ position: "absolute", bottom: 12, left: 14, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#EDE9FE", border: "1.5px solid #C4B5FD", borderRadius: 99, fontSize: 9, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em" }}>📆 From Calendar</div>}
            <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, background: "#fff", border: "2.5px solid #111110", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #D4C9A8", color: "#111110" }}><X size={16} /></button>
          </div>
          <div style={{ padding: "20px 24px 24px" }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111110", marginBottom: 12, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{item.title}</h2>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
              {(item.location || item.is_online) && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#5C5346" }}>{item.is_online ? <Globe size={11} /> : <MapPin size={11} />}{item.is_online ? "Online" : item.location}</div>}
              {item.start_date && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#5C5346" }}><Calendar size={11} />{fmtDate(item.start_date)}{item.end_date && item.end_date !== item.start_date ? ` — ${fmtDate(item.end_date)}` : ""}</div>}
              {item.deadline && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#FEF9C3", border: "1.5px solid #FDE047", borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#92400E" }}><Clock size={11} />Deadline: {fmtDate(item.deadline)}</div>}
              {isUpcoming(item) ? <div style={{ padding: "5px 12px", background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 99, fontSize: 11, fontWeight: 800, color: "#166534" }}>📅 Upcoming</div> : <div style={{ padding: "5px 12px", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 99, fontSize: 11, fontWeight: 800, color: "#9B8F7A" }}>🗂️ Past</div>}
            </div>
            {item.description && <p style={{ fontSize: 14, fontWeight: 600, color: "#5C5346", lineHeight: 1.6, marginBottom: 20 }}>{item.description}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#F5F0E8", border: "2px solid #E8E0D0", borderRadius: 14, marginBottom: 16 }}>
              <Avatar name={item.poster?.full_name} avatarUrl={item.poster?.avatar_url} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{item.poster?.full_name || "Unknown"}</div>
                {item.poster?.role && <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{item.poster.role}</div>}
              </div>
              {item.poster?.username && (
                <Link href={`/${item.poster.username}`} style={{ textDecoration: "none" }}>
                  <button style={{ padding: "7px 13px", border: "2px solid #111110", borderRadius: 10, fontFamily: "inherit", fontSize: 11, fontWeight: 800, cursor: "pointer", background: "#fff", boxShadow: "2px 2px 0 #D4C9A8", color: "#111110" }}>View profile →</button>
                </Link>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {isOwn ? (
                <button onClick={onEdit} style={{ flex: 1, padding: 13, background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#111110" }}>
                  <Pencil size={15} /> Edit Post
                </button>
              ) : (
                <button onClick={() => setShowMsg(true)} style={{ flex: 1, padding: 13, background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#111110" }}>
                  <MessageSquare size={15} /> Message
                </button>
              )}
              <button onClick={handleShare} style={{ flex: 1, padding: 13, background: "#fff", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #D4C9A8", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#111110" }}>
                <Share2 size={15} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>
      {showMsg && item.poster && (
        <MessageModal isOpen={showMsg} recipientId={item.poster.id} recipientName={item.poster.full_name} onClose={() => setShowMsg(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Auth Wall
// ─────────────────────────────────────────────────────────────────
function AuthWall({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(17,17,16,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", maxWidth: 560, width: "calc(100% - 48px)", filter: "blur(6px)", pointerEvents: "none", userSelect: "none", background: "#fff", border: "2.5px solid #111110", borderRadius: 24, overflow: "hidden" }}>
        <div style={{ height: 150, background: CARD_GRADIENTS[item.post_type], display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "2.5px solid #111110" }}>
          <span style={{ fontSize: 56 }}>{POST_TYPES[item.post_type].emoji}</span>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 8 }}>{item.title}</div>
          {item.description && <div style={{ fontSize: 13, color: "#5C5346" }}>{item.description.substring(0, 120)}…</div>}
        </div>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 380, background: "#fff", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 10px 0 #111110", padding: "32px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Join The Scene</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginBottom: 24, lineHeight: 1.5 }}>Create a free account to message artists, share posts, and connect with the Prague art community.</div>
        <Link href="/register" style={{ textDecoration: "none", display: "block" }}>
          <button style={{ width: "100%", padding: 14, background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 15, fontWeight: 900, cursor: "pointer", boxShadow: "3px 4px 0 #111110", marginBottom: 10, color: "#111110" }}>✦ Create free account</button>
        </Link>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", margin: "6px 0" }}>Already a member?</div>
        <Link href="/login" style={{ textDecoration: "none", display: "block" }}>
          <button style={{ width: "100%", padding: 13, background: "#fff", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #D4C9A8", color: "#111110" }}>Sign in →</button>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Create Picker Modal
// ─────────────────────────────────────────────────────────────────
function CreatePickerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (type: PostType) => void }) {
  const [selected, setSelected] = useState<PostType | null>(null);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,17,16,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 10px 0 #D4C9A8", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "2px solid #E8E0D0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fff" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>New Post</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#111110" }}>Post to The Scene</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", marginTop: 2 }}>What are you sharing with the Prague art community?</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, border: "2.5px solid #111110", borderRadius: 10, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#111110" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CREATE_TYPES.map(t => (
            <button key={t.key} onClick={() => setSelected(t.key)} style={{ padding: "16px 14px", border: `2.5px solid ${selected === t.key ? "#111110" : "#E8E0D0"}`, borderRadius: 16, cursor: "pointer", textAlign: "left", background: selected === t.key ? "#FFD400" : "#fff", boxShadow: selected === t.key ? "3px 3px 0 #111110" : "none", transform: selected === t.key ? "translate(-1px,-1px)" : "none", transition: "all .15s", fontFamily: "inherit" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{t.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", marginBottom: 3 }}>{t.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.3 }}>{t.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <button disabled={!selected} onClick={() => selected && onSelect(selected)} style={{ width: "100%", padding: 13, background: selected ? "#111110" : "#F5F0E8", border: `2.5px solid ${selected ? "#111110" : "#E8E0D0"}`, borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: selected ? "pointer" : "not-allowed", color: selected ? "#FFD400" : "#C0B8A8", boxShadow: selected ? "3px 4px 0 #D4C9A8" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all .15s" }}>
            {selected ? `Continue with ${POST_TYPES[selected].emoji} ${POST_TYPES[selected].label} →` : "Select a post type to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Post Form Modal — full form with image upload, validation, DB
// ─────────────────────────────────────────────────────────────────
function PostFormModal({ type, userId, editItem, onClose, onSaved }: { type: PostType; userId: string; editItem?: FeedItem | null; onClose: () => void; onSaved: () => void }) {
  const sb = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editItem;
  const cfg = POST_TYPES[type];

  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const [images, setImages]     = useState<string[]>(
    editItem?.images?.filter(Boolean) || (editItem?.cover_image ? [editItem.cover_image] : [])
  );
  const [form, setForm] = useState({
    title:            editItem?.title || "",
    description:      editItem?.description || "",
    location:         editItem?.location || "",
    is_online:        editItem?.is_online || false,
    start_date:       editItem?.start_date?.slice(0, 10) || "",
    end_date:         editItem?.end_date?.slice(0, 10) || "",
    deadline:         editItem?.deadline?.slice(0, 10) || "",
    price_from:       editItem?.price_from || "",
    num_artists:      "",
    submission_link:  "",
    commission_scope: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  async function uploadImages(files: FileList) {
    setUploading(true);
    setError("");
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/scene/${Date.now()}-${i}.${ext}`;
      try {
        const { error: upErr } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { setError(`Upload failed: ${upErr.message}`); }
        else {
          const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
          uploaded.push(publicUrl);
        }
      } catch (e: any) { setError(`Upload error: ${e.message}`); }
    }
    setImages(prev => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function handleSave() {
    setError("");
    if (!form.title.trim()) { setError("Title is required — give your post a clear title."); return; }

    setSaving(true);
    try {
      if (type === "exhibition") {
        const payload: any = {
          title:       form.title.trim(),
          description: form.description.trim() || null,
          venue:       form.is_online ? null : (form.location.trim() || null),
          start_date:  form.start_date || null,
          end_date:    form.end_date || null,
          cover_image: images[0] || null,
          is_public:   true,
          status:      "upcoming",
        };
        if (isEdit && editItem?.source === "exhibition") {
          const { error: err } = await sb.from("exhibitions").update(payload).eq("id", editItem.id);
          if (err) throw new Error(err.message);
        } else {
          const { error: err } = await sb.from("exhibitions").insert({ ...payload, user_id: userId });
          if (err) throw new Error(err.message);
        }
      } else {
        // All other types → pool_requests
        const extraDesc: string[] = [];
        if (form.description.trim()) extraDesc.push(form.description.trim());
        if (type === "opencall" && form.num_artists) extraDesc.push(`Looking for ${form.num_artists} artists.`);
        if (type === "opencall" && form.submission_link) extraDesc.push(`Submit at: ${form.submission_link}`);
        if (type === "commission" && form.commission_scope) extraDesc.push(`Scope: ${form.commission_scope}`);

        const payload: any = {
          title:        form.title.trim(),
          description:  extraDesc.join("\n\n") || null,
          request_type: POST_TO_POOL_TYPE[type],
          poster_type:  "artist",
          poster_role:  "artist",
          cover_image:  images[0] || null,
          images:       images,
          location:     form.is_online ? "Online" : (form.location.trim() || null),
          deadline:     form.deadline || null,
          status:       "open",
        };
        if (isEdit && editItem) {
          const { error: err } = await sb.from("pool_requests").update(payload).eq("id", editItem.id);
          if (err) throw new Error(err.message);
        } else {
          const { error: err } = await sb.from("pool_requests").insert({ ...payload, user_id: userId });
          if (err) throw new Error(err.message);
        }
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const showDates      = type === "event" || type === "exhibition";
  const showDeadline   = type === "collab" || type === "opencall";
  const showOpenCall   = type === "opencall";
  const showCommission = type === "commission";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(17,17,16,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 540, background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 10px 0 #111110", maxHeight: "92vh", overflowY: "auto" }}>

        {/* Sticky header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "2px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: cfg.bg, border: `2px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cfg.emoji}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em" }}>{isEdit ? "Edit Post" : "New Post"}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#111110" }}>{cfg.label}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "2px solid #111110", borderRadius: 9, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#111110" }}><X size={15} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#FFE4E6", border: "2px solid #FCA5A5", borderRadius: 12 }}>
              <AlertCircle size={16} color="#BE123C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#BE123C" }}>{error}</span>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label style={LBL}>Cover Image</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              {images.map((url, i) => (
                <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 12, overflow: "hidden", border: "2px solid #111110", flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => setImages(p => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 6, background: "#111110", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={10} color="#fff" />
                  </button>
                  {i === 0 && <div style={{ position: "absolute", bottom: 3, left: 3, padding: "1px 6px", background: "#FFD400", borderRadius: 4, fontSize: 8, fontWeight: 900, color: "#111110" }}>COVER</div>}
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: 80, height: 80, borderRadius: 12, border: "2px dashed #E8E0D0", background: "#fff", cursor: uploading ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, transition: "all .15s" }}
                onMouseEnter={e => !uploading && ((e.currentTarget as HTMLElement).style.borderColor = "#111110")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0")}>
                {uploading ? <div style={{ fontSize: 9, fontWeight: 700, color: "#9B8F7A", textAlign: "center", padding: "0 6px" }}>Uploading…</div> : <><Upload size={16} color="#9B8F7A" /><span style={{ fontSize: 9, fontWeight: 700, color: "#9B8F7A" }}>Add photo</span></>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files && uploadImages(e.target.files)} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={LBL}>Title *</label>
            <input
              style={{ ...INP, borderColor: error && !form.title.trim() ? "#FCA5A5" : "#E8E0D0", fontSize: 14, fontWeight: 700 }}
              value={form.title} onChange={set("title")}
              placeholder={
                type === "event" ? "e.g. Open Studios Night — Holešovice" :
                type === "exhibition" ? "e.g. Fragments of Light — Solo Show" :
                type === "collab" ? "e.g. Seeking a Sound Artist for Immersive Installation" :
                type === "opencall" ? "e.g. Summer Group Show — Open for Submissions" :
                "e.g. Open for Mural Commissions"
              }
            />
          </div>

          {/* Description */}
          <div>
            <label style={LBL}>Description</label>
            <textarea
              style={{ ...INP, resize: "vertical", minHeight: 100, lineHeight: 1.5 }}
              value={form.description} onChange={set("description")}
              placeholder={
                type === "collab" ? "Describe your project and what kind of collaborator you're looking for…" :
                type === "opencall" ? "What is the show about? What kind of work are you looking for?" :
                type === "commission" ? "What kinds of commissions do you take? Medium, style, scale…" :
                "Tell the community what this is about…"
              }
            />
          </div>

          {/* Location */}
          <div>
            <label style={LBL}>Location</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input style={{ ...INP, flex: 1, opacity: form.is_online ? 0.4 : 1 }} value={form.location} onChange={set("location")} placeholder="Gallery name, venue, city…" disabled={form.is_online} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#111110", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                <input type="checkbox" checked={form.is_online} onChange={e => setForm(p => ({ ...p, is_online: e.target.checked, location: e.target.checked ? "" : p.location }))} style={{ width: 16, height: 16 }} />
                🌐 Online
              </label>
            </div>
          </div>

          {/* Date fields */}
          {showDates && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LBL}>Start Date</label>
                <input type="date" style={INP} value={form.start_date} onChange={set("start_date")} />
              </div>
              <div>
                <label style={LBL}>End Date</label>
                <input type="date" style={INP} value={form.end_date} onChange={set("end_date")} min={form.start_date} />
              </div>
            </div>
          )}

          {/* Deadline */}
          {showDeadline && (
            <div>
              <label style={LBL}>Application Deadline</label>
              <input type="date" style={INP} value={form.deadline} onChange={set("deadline")} />
            </div>
          )}

          {/* Open Call extras */}
          {showOpenCall && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LBL}>Artists Sought</label>
                <input style={INP} type="number" min="1" value={form.num_artists} onChange={set("num_artists")} placeholder="e.g. 4" />
              </div>
              <div>
                <label style={LBL}>Submission Link</label>
                <input style={INP} value={form.submission_link} onChange={set("submission_link")} placeholder="https://…" />
              </div>
            </div>
          )}

          {/* Commission extras */}
          {showCommission && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LBL}>Starting Price</label>
                <input style={INP} value={form.price_from} onChange={set("price_from")} placeholder="e.g. 800 €" />
              </div>
              <div>
                <label style={LBL}>Commission Scope</label>
                <input style={INP} value={form.commission_scope} onChange={set("commission_scope")} placeholder="e.g. Murals, portraits…" />
              </div>
            </div>
          )}

          {/* Visibility note */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 12 }}>
            <Check size={15} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#5C5346", lineHeight: 1.4 }}>
              This post will be <strong>visible to everyone</strong> in The Scene feed. You can edit or remove it at any time.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "0 22px 22px" }}>
          <button onClick={handleSave} disabled={saving || uploading} style={{ width: "100%", padding: "14px 20px", background: saving || uploading ? "#F5F0E8" : "#FFD400", border: `2.5px solid ${saving || uploading ? "#E8E0D0" : "#111110"}`, borderRadius: 13, fontFamily: "inherit", fontSize: 15, fontWeight: 900, cursor: saving || uploading ? "not-allowed" : "pointer", color: saving || uploading ? "#C0B8A8" : "#111110", boxShadow: saving || uploading ? "none" : "3px 4px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .15s" }}
            onMouseEnter={e => !saving && !uploading && ((e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = "none")}>
            {saving ? "Posting…" : uploading ? "Uploading images…" : isEdit ? "Save Changes ✓" : "Post to The Scene ✦"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Editor's Pick Carousel
// ─────────────────────────────────────────────────────────────────
function EditorsCarousel({ picks }: { picks: EditorPick[] }) {
  const [idx, setIdx] = useState(0);
  const CARD_W = 354;
  const VISIBLE = 3;
  const total = picks.length;
  if (total === 0) return null;
  const canPrev = idx > 0;
  const canNext = idx < total - VISIBLE;

  return (
    <div style={{ padding: "20px 32px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", background: "#111110", border: "2px solid #111110", borderRadius: 99, fontSize: 10, fontWeight: 800, color: "#FFD400", letterSpacing: "0.08em", textTransform: "uppercase" }}>✦ Editor's Pick</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>Curated by the Artomango team</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ dir: -1, lbl: "←", can: canPrev }, { dir: 1, lbl: "→", can: canNext }].map(b => (
            <button key={b.dir} onClick={() => setIdx(p => Math.max(0, Math.min(total - VISIBLE, p + b.dir)))} disabled={!b.can} style={{ width: 30, height: 30, border: "2px solid #111110", borderRadius: 9, background: "#fff", cursor: b.can ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #D4C9A8", opacity: b.can ? 1 : 0.35, fontSize: 13, fontWeight: 900, color: "#111110" }}>{b.lbl}</button>
          ))}
        </div>
      </div>
      <div style={{ overflow: "hidden", borderRadius: 18 }}>
        <div style={{ display: "flex", gap: 14, transform: `translateX(-${idx * CARD_W}px)`, transition: "transform .35s cubic-bezier(.4,0,.2,1)" }}>
          {picks.map(pick => (
            <div key={pick.id} style={{ flexShrink: 0, width: 340, height: 130, border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", background: pick.bg_color, boxShadow: "3px 4px 0 #D4C9A8", cursor: "pointer", display: "flex", transition: "all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "6px 7px 0 #D4C9A8"; (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 4px 0 #D4C9A8"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
              <div style={{ width: 110, flexShrink: 0, background: pick.visual_bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, borderRight: "2px solid #111110" }}>{pick.emoji}</div>
              <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
                <div>
                  <div style={{ display: "inline-block", padding: "3px 9px", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 99, fontSize: 9, fontWeight: 800, color: pick.bg_color === "#111110" ? "#FFD400" : "#111110", background: "rgba(255,255,255,0.15)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{pick.tag_label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25, color: pick.bg_color === "#111110" ? "#fff" : "#111110", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pick.title}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: pick.bg_color === "#111110" ? "#888" : "#9B8F7A" }}>{pick.poster_name || pick.meta_label || "Artomango team"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 10 }}>
        {picks.map((_, i) => (
          <div key={i} onClick={() => setIdx(Math.min(i, Math.max(0, total - VISIBLE)))} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, cursor: "pointer", background: i === idx ? "#111110" : "#E8E0D0", transition: "all .2s" }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function ScenePage() {
  const sb = createClient();

  const [userId, setUserId]             = useState<string | null>(null);
  const [feed, setFeed]                 = useState<FeedItem[]>([]);
  const [picks, setPicks]               = useState<EditorPick[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<FilterKey>("all");
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [authWallItem, setAuthWallItem] = useState<FeedItem | null>(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [createType, setCreateType]     = useState<PostType | null>(null);
  const [editItem, setEditItem]         = useState<FeedItem | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await sb.auth.getUser();
      setUserId(user?.id || null);
    };
    init();
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const [exhRes, poolRes, calRes] = await Promise.all([
        sb.from("exhibitions")
          .select("id, user_id, title, description, cover_image, venue, start_date, end_date, created_at, profiles(id, full_name, username, avatar_url, role)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(60),
        sb.from("pool_requests")
          .select("id, user_id, title, description, cover_image, images, request_type, location, deadline, created_at, profiles(id, full_name, username, avatar_url, role)")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(60),
        sb.from("calendar_events")
          .select("id, user_id, title, description, venue, location_name, is_online, start_date, end_date, event_type, created_at, profiles(id, full_name, username, avatar_url, role)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      const exhItems: FeedItem[] = (exhRes.data || []).map((e: any): FeedItem => ({
        id: e.id, source: "exhibition", post_type: "exhibition",
        title: e.title, description: e.description, cover_image: e.cover_image,
        location: e.venue, is_online: false, start_date: e.start_date, end_date: e.end_date,
        created_at: e.created_at, user_id: e.user_id,
        poster: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles,
        from_calendar: false,
      }));

      const poolItems: FeedItem[] = (poolRes.data || []).map((p: any): FeedItem => ({
        id: p.id, source: "pool_request",
        post_type: POOL_TYPE_MAP[p.request_type] || "collab",
        title: p.title, description: p.description, cover_image: p.cover_image,
        images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
        location: p.location, deadline: p.deadline,
        created_at: p.created_at, user_id: p.user_id,
        poster: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        from_calendar: false,
      }));

      const calItems: FeedItem[] = (calRes.data || []).map((c: any): FeedItem => ({
        id: `cal_${c.id}`, source: "calendar_event",
        post_type: CAL_TYPE_MAP[c.event_type || ""] || "event",
        title: c.title, description: c.description,
        location: c.venue || c.location_name, is_online: c.is_online || false,
        start_date: c.start_date, end_date: c.end_date,
        created_at: c.created_at, user_id: c.user_id,
        poster: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
        from_calendar: true,
      }));

      // Merge, deduplicate by id, sort desc
      const seen = new Set<string>();
      const merged: FeedItem[] = [];
      for (const item of [...exhItems, ...poolItems, ...calItems]) {
        if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFeed(merged);
    } catch (err) {
      console.error("Scene feed load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPicks = useCallback(async () => {
    try {
      const { data } = await sb.from("editor_picks").select("*").eq("is_active", true).order("sort_order", { ascending: true });
      setPicks(data || []);
    } catch (err) {
      console.error("Editor picks load error:", err);
    }
  }, []);

  useEffect(() => { loadFeed(); loadPicks(); }, [loadFeed, loadPicks]);

  const filteredFeed = feed.filter(item => {
    if (filter === "all")      return true;
    if (filter === "online")   return !!item.is_online;
    if (filter === "upcoming") return isUpcoming(item);
    return item.post_type === filter;
  });

  const stats = {
    total:     feed.length,
    upcoming:  feed.filter(isUpcoming).length,
    collabs:   feed.filter(i => i.post_type === "collab" || i.post_type === "opencall").length,
    opencalls: feed.filter(i => i.post_type === "opencall").length,
  };

  const col1 = filteredFeed.filter((_, i) => i % 3 === 0);
  const col2 = filteredFeed.filter((_, i) => i % 3 === 1);
  const col3 = filteredFeed.filter((_, i) => i % 3 === 2);

  const handleCardClick = (item: FeedItem) => {
    if (!userId) { setAuthWallItem(item); return; }
    setSelectedItem(item);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .scene-page { min-height: 100vh; background: #FFFBEA; font-family: 'Darker Grotesque', sans-serif; }
        .scene-feed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 20px 32px 48px; }
        @media (max-width: 1100px) { .scene-feed-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px) { .scene-feed-grid { grid-template-columns: 1fr; padding: 16px; } .scene-header { padding: 20px 16px 0 !important; flex-direction: column !important; align-items: flex-start !important; } .scene-stats { margin: 16px 16px 0 !important; } .scene-filters { padding: 14px 16px 0 !important; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #E8E0D0; border-radius: 99px; }
      `}</style>

      <div className="scene-page">
        {/* Header */}
        <div className="scene-header" style={{ padding: "28px 32px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>🌆 The Scene</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111110", lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>Collabs &amp; Events</h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginTop: 5 }}>What the Prague art scene is doing right now</p>
          </div>
          {userId && (
            <button onClick={() => setShowPicker(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 14, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #111110", transition: "all .15s", flexShrink: 0, color: "#111110" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 6px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 4px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
              <Sparkles size={15} /> Post to The Scene
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="scene-stats" style={{ display: "flex", margin: "20px 32px 0", border: "2.5px solid #111110", borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "3px 4px 0 #D4C9A8" }}>
          {[{ num: stats.total, lbl: "Live Posts" }, { num: stats.upcoming, lbl: "Upcoming" }, { num: stats.collabs, lbl: "Collabs & Calls" }, { num: stats.opencalls, lbl: "Open Calls" }].map((s, i, arr) => (
            <div key={s.lbl} style={{ flex: 1, padding: "14px 18px", textAlign: "center", borderRight: i < arr.length - 1 ? "2px solid #E8E0D0" : "none" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111110", lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Editor's Pick */}
        <EditorsCarousel picks={picks} />

        {/* Filters */}
        <div className="scene-filters" style={{ padding: "18px 32px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f, i) => (
            <React.Fragment key={f.key}>
              {i === 6 && <div style={{ width: 1, height: 24, background: "#E8E0D0", margin: "0 4px" }} />}
              <button onClick={() => setFilter(f.key)} style={{ padding: "7px 15px", border: "2px solid", borderColor: filter === f.key ? "#111110" : "#E8E0D0", borderRadius: 99, background: filter === f.key ? "#111110" : "#fff", color: filter === f.key ? "#FFD400" : "#9B8F7A", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                {f.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div style={{ padding: "60px 32px", textAlign: "center", color: "#9B8F7A" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌆</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Loading The Scene…</div>
          </div>
        ) : filteredFeed.length === 0 ? (
          <div style={{ padding: "60px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: "#9B8F7A", marginBottom: 20 }}>{filter === "all" ? "Be the first to post to the scene." : "No posts match this filter yet."}</div>
            {userId && (
              <button onClick={() => setShowPicker(true)} style={{ padding: "11px 22px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 13, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 4px 0 #111110", color: "#111110" }}>✦ Post to The Scene</button>
            )}
          </div>
        ) : (
          <div className="scene-feed-grid">
            <div style={{ display: "flex", flexDirection: "column" }}>{col1.map(item => <FeedCard key={item.id} item={item} isOwn={item.user_id === userId} onClick={() => handleCardClick(item)} />)}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>{col2.map(item => <FeedCard key={item.id} item={item} isOwn={item.user_id === userId} onClick={() => handleCardClick(item)} />)}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>{col3.map(item => <FeedCard key={item.id} item={item} isOwn={item.user_id === userId} onClick={() => handleCardClick(item)} />)}</div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedItem && (
        <DetailModal item={selectedItem} isOwn={selectedItem.user_id === userId} userId={userId} onClose={() => setSelectedItem(null)}
          onEdit={() => { setEditItem(selectedItem); setCreateType(selectedItem.post_type); setSelectedItem(null); }} />
      )}
      {authWallItem && <AuthWall item={authWallItem} onClose={() => setAuthWallItem(null)} />}
      {showPicker && <CreatePickerModal onClose={() => setShowPicker(false)} onSelect={type => { setCreateType(type); setShowPicker(false); }} />}
      {createType && (
        <PostFormModal type={createType} userId={userId || ""} editItem={editItem}
          onClose={() => { setCreateType(null); setEditItem(null); }}
          onSaved={() => { loadFeed(); }} />
      )}
    </>
  );
}
