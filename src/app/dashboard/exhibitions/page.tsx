"use client";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Plus, X, MapPin, Calendar, ChevronLeft, ChevronRight,
  ExternalLink, Trash2, Edit2, Globe, Youtube, FileText,
  MessageSquare, Play, BookOpen,
  Laptop, Users, Palette, GlassWater, Mic, Home,
  ShoppingBag, Sparkles, Clock, ArrowRight, Upload,
  ImageIcon, ExternalLink as OpenIcon, ChevronDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type EventType =
  | "exhibition" | "workshop" | "online_workshop" | "drink_draw"
  | "artist_talk" | "open_studio" | "gathering" | "popup" | "other";

type Event = {
  id: string; title: string; venue?: string; description?: string;
  start_date?: string; end_date?: string; status: string;
  is_public: boolean; cover_image?: string;
  event_type?: EventType; is_online?: boolean; online_url?: string;
  location_name?: string; lat?: number; lng?: number;
  user_id?: string;
};

type ResourceType = "video" | "article" | "post";
type Resource = {
  id: string; type: ResourceType; title: string; url?: string;
  description?: string; thumbnail_url?: string; created_at: string;
};

type MainTab    = "events" | "education";
type EventsView = "cards" | "calendar";

// ── Event type config ──────────────────────────────────────────────
const EVENT_TYPES: { key: EventType; label: string; icon: React.ReactNode; color: string; bg: string; gradient: string }[] = [
  { key: "exhibition",      label: "Exhibition",      icon: <Palette size={18} />,    color: "#8B5CF6", bg: "#EDE9FE", gradient: "135deg, #4C1D95 0%, #7C3AED 50%, #A78BFA 100%" },
  { key: "workshop",        label: "Workshop",        icon: <BookOpen size={18} />,   color: "#16A34A", bg: "#DCFCE7", gradient: "135deg, #14532D 0%, #16A34A 50%, #4ADE80 100%" },
  { key: "online_workshop", label: "Online Workshop", icon: <Laptop size={18} />,     color: "#0EA5E9", bg: "#E0F2FE", gradient: "135deg, #0C4A6E 0%, #0EA5E9 50%, #38BDF8 100%" },
  { key: "drink_draw",      label: "Drink & Draw",    icon: <GlassWater size={18} />, color: "#FF6B6B", bg: "#FFE4E6", gradient: "135deg, #881337 0%, #E11D48 50%, #FB7185 100%" },
  { key: "artist_talk",     label: "Artist Talk",     icon: <Mic size={18} />,        color: "#CA8A04", bg: "#FEF9C3", gradient: "135deg, #713F12 0%, #CA8A04 50%, #FACC15 100%" },
  { key: "open_studio",     label: "Open Studio",     icon: <Home size={18} />,       color: "#D97706", bg: "#FEF3C7", gradient: "135deg, #7C2D12 0%, #EA580C 50%, #FB923C 100%" },
  { key: "gathering",       label: "Gathering",       icon: <Users size={18} />,      color: "#0D9488", bg: "#F0FDF4", gradient: "135deg, #134E4A 0%, #0D9488 50%, #2DD4BF 100%" },
  { key: "popup",           label: "Pop-up",          icon: <ShoppingBag size={18} />,color: "#EC4899", bg: "#FCE7F3", gradient: "135deg, #701A75 0%, #C026D3 50%, #E879F9 100%" },
  { key: "other",           label: "Other",           icon: <Sparkles size={18} />,   color: "#9B8F7A", bg: "#F5F0E8", gradient: "135deg, #292524 0%, #57534E 50%, #A8A29E 100%" },
];

const ET: Record<string, typeof EVENT_TYPES[0]> = Object.fromEntries(EVENT_TYPES.map(e => [e.key, e]));
function getETC(type?: string) { return ET[type as EventType] || ET["other"]; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number)    { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

function isUpcoming(ev: Event) {
  const ref = ev.end_date || ev.start_date;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0,0,0,0));
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateLong(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ══════════════════════════════════════════════════════════════════
// EVENT DETAIL MODAL
// ══════════════════════════════════════════════════════════════════
function EventDetailModal({ ev, onClose, onEdit, onDelete, isOwn }: {
  ev: Event; onClose: () => void;
  onEdit: () => void; onDelete: () => void; isOwn: boolean;
}) {
  const etc = getETC(ev.event_type);
  const hasImage = !!ev.cover_image;

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:620, maxHeight:"92vh", overflowY:"auto", position:"relative" }}
      >
        {/* Cover / gradient header */}
        <div style={{
          height: hasImage ? 220 : 140,
          borderRadius:"22px 22px 0 0",
          background: hasImage ? "#111" : `linear-gradient(${etc.gradient})`,
          position:"relative", overflow:"hidden", flexShrink:0,
        }}>
          {hasImage && (
            <img src={ev.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }} />
          )}
          {/* Overlay gradient for text readability */}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.65) 100%)" }} />

          {/* Type badge */}
          <div style={{ position:"absolute", top:16, left:16, display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99, background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.3)", backdropFilter:"blur(8px)", fontSize:10, fontWeight:900, color:"#fff", textTransform:"uppercase", letterSpacing:".14em" }}>
            <span style={{ color:etc.color }}>{React.cloneElement(etc.icon as React.ReactElement, { size:12 })}</span>
            {etc.label}
            {ev.is_online && <span style={{ background:"rgba(14,165,233,.3)", color:"#7DD3FC", padding:"1px 6px", borderRadius:4 }}>Online</span>}
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:32, height:32, borderRadius:10, background:"rgba(0,0,0,.4)", border:"1.5px solid rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(8px)" }}>
            <X size={15} color="#fff" />
          </button>

          {/* Title on image */}
          <div style={{ position:"absolute", bottom:20, left:20, right:60 }}>
            <h2 style={{ fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color:"#fff", letterSpacing:"-0.6px", lineHeight:1.1, margin:0, textShadow:"0 2px 12px rgba(0,0,0,.4)" }}>
              {ev.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"22px 26px 28px" }}>

          {/* Meta chips */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
            {(ev.start_date || ev.end_date) && (
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"#F5F0E8", border:"1.5px solid #E8E0D0", borderRadius:99, fontSize:12, fontWeight:700, color:"#5C5346" }}>
                <Calendar size={11} color="#9B8F7A" />
                {fmtDateLong(ev.start_date)}
                {ev.end_date && ev.end_date !== ev.start_date && <> — {fmtDate(ev.end_date)}</>}
              </div>
            )}
            {(ev.venue || ev.location_name) && !ev.is_online && (
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"#FFE4E6", border:"1.5px solid #FCA5A5", borderRadius:99, fontSize:12, fontWeight:700, color:"#BE123C" }}>
                <MapPin size={11} color="#FF6B6B" />
                {ev.venue || ev.location_name}
              </div>
            )}
            <div style={{ padding:"5px 12px", background: isUpcoming(ev) ? "#DCFCE7" : "#F5F0E8", border:`1.5px solid ${isUpcoming(ev) ? "#86EFAC" : "#E8E0D0"}`, borderRadius:99, fontSize:12, fontWeight:800, color: isUpcoming(ev) ? "#16A34A" : "#9B8F7A" }}>
              {isUpcoming(ev) ? "📅 Upcoming" : "🗂️ Past"}
            </div>
          </div>

          {/* Description */}
          {ev.description && (
            <p style={{ fontSize:14, color:"#5C5346", lineHeight:1.75, fontWeight:500, marginBottom:20 }}>
              {ev.description}
            </p>
          )}

          {/* Online join button */}
          {ev.is_online && ev.online_url && (
            <a href={ev.online_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none", display:"block", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", background: `linear-gradient(${getETC("online_workshop").gradient})`, border:"2.5px solid #111110", borderRadius:13, fontSize:14, fontWeight:800, color:"#fff", boxShadow:"3px 3px 0 #111110", cursor:"pointer" }}>
                <Globe size={15} /> Join Online <ArrowRight size={14} />
              </div>
            </a>
          )}

          {/* Action buttons */}
          {isOwn && (
            <div style={{ display:"flex", gap:8, marginTop: ev.is_online && ev.online_url ? 0 : 4 }}>
              <button onClick={() => { onClose(); onEdit(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:13, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110", transition:"all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                <Edit2 size={13} /> Edit Event
              </button>
              <button onClick={() => { if (confirm("Delete this event?")) { onDelete(); onClose(); } }} style={{ padding:"11px 16px", background:"#fff", border:"2.5px solid #EF4444", borderRadius:13, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#EF4444", display:"flex", alignItems:"center", gap:6 }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EVENT CARD — immersive gradient design
// ══════════════════════════════════════════════════════════════════
function EventCard({ ev, onEdit, onDelete, delay = 0, isOwn = false }: {
  ev: Event; onEdit: () => void; onDelete: () => void; delay?: number; isOwn?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const etc = getETC(ev.event_type);
  const past = !isUpcoming(ev);
  const hasImg = !!ev.cover_image;

  return (
    <>
      <div
        className="ev-card-new"
        style={{ animationDelay:`${delay}s`, cursor:"pointer" }}
        onClick={() => setShowDetail(true)}
      >
        {/* Hero area */}
        <div style={{
          height: 200,
          position:"relative",
          background: hasImg ? "#111" : `linear-gradient(${etc.gradient})`,
          overflow:"hidden",
          borderRadius:"18px 18px 0 0",
          flexShrink:0,
        }}>
          {hasImg && (
            <img src={ev.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity: past ? 0.6 : 0.85, transition:"transform .4s cubic-bezier(.16,1,.3,1)", }} className="ev-card-img" />
          )}
          {/* Gradient overlay */}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,.04) 0%, rgba(0,0,0,.6) 100%)" }} />

          {/* Top badges */}
          <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.25)", backdropFilter:"blur(8px)", fontSize:9, fontWeight:900, color:"#fff", textTransform:"uppercase", letterSpacing:".12em" }}>
              {React.cloneElement(etc.icon as React.ReactElement, { size:10, color:"#fff" })}
              {etc.label}
            </div>
            {ev.is_online && (
              <div style={{ padding:"4px 8px", borderRadius:99, background:"rgba(14,165,233,.3)", border:"1px solid rgba(56,189,248,.5)", fontSize:9, fontWeight:800, color:"#7DD3FC" }}>ONLINE</div>
            )}
            {past && (
              <div style={{ padding:"4px 8px", borderRadius:99, background:"rgba(0,0,0,.35)", border:"1px solid rgba(255,255,255,.15)", fontSize:9, fontWeight:800, color:"rgba(255,255,255,.5)" }}>PAST</div>
            )}
          </div>

          {/* Owner controls */}
          {isOwn && (
            <div style={{ position:"absolute", top:10, right:10, display:"flex", gap:5 }} onClick={e => e.stopPropagation()}>
              <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ width:28, height:28, border:"1.5px solid rgba(255,255,255,.3)", background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8, backdropFilter:"blur(8px)" }}>
                <Edit2 size={11} color="#fff" />
              </button>
              <button onClick={e => { e.stopPropagation(); if (confirm("Delete?")) onDelete(); }} style={{ width:28, height:28, border:"1.5px solid rgba(255,100,100,.5)", background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8, backdropFilter:"blur(8px)" }}>
                <Trash2 size={11} color="#FF6B6B" />
              </button>
            </div>
          )}

          {/* Bottom title overlay */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"14px 16px 16px" }}>
            <h3 style={{ fontSize:17, fontWeight:900, color:"#fff", letterSpacing:"-.4px", margin:0, lineHeight:1.2, textShadow:"0 1px 8px rgba(0,0,0,.5)", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any, overflow:"hidden" }}>
              {ev.title}
            </h3>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding:"14px 16px 16px", background:"#fff", borderRadius:"0 0 18px 18px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {(ev.start_date || ev.end_date) && (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#5C5346", fontWeight:600 }}>
                <Calendar size={11} color="#9B8F7A" />
                {fmtDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` — ${fmtDate(ev.end_date)}` : ""}
              </div>
            )}
            {(ev.venue || ev.location_name) && !ev.is_online && (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#5C5346", fontWeight:600 }}>
                <MapPin size={11} color="#FF6B6B" />
                {ev.venue || ev.location_name}
              </div>
            )}
            {ev.is_online && ev.online_url && (
              <a href={ev.online_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#0EA5E9", fontWeight:700, textDecoration:"none" }}>
                <Globe size={11} /> Join online <ArrowRight size={10} />
              </a>
            )}
            {ev.description && (
              <p style={{ fontSize:12, color:"#9B8F7A", fontWeight:500, lineHeight:1.5, margin:0, marginTop:2, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any, overflow:"hidden" }}>
                {ev.description}
              </p>
            )}
          </div>

          {/* Tap hint */}
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:etc.color }}>
            View details <ChevronRight size={11} />
          </div>
        </div>
      </div>

      {showDetail && (
        <EventDetailModal
          ev={ev}
          onClose={() => setShowDetail(false)}
          onEdit={onEdit}
          onDelete={onDelete}
          isOwn={isOwn}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// RESOURCE DETAIL MODAL
// ══════════════════════════════════════════════════════════════════
function ResourceDetailModal({ res, onClose, onDelete, isOwn }: {
  res: Resource; onClose: () => void; onDelete: () => void; isOwn: boolean;
}) {
  const CFG = {
    video:   { icon: <Youtube size={20} />,       color:"#FF0000", bg:"#FFF0F0", label:"Video",   gradient:"135deg, #450a0a 0%, #b91c1c 50%, #f87171 100%" },
    article: { icon: <FileText size={20} />,      color:"#0EA5E9", bg:"#E0F2FE", label:"Article", gradient:"135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%" },
    post:    { icon: <MessageSquare size={20} />, color:"#8B5CF6", bg:"#EDE9FE", label:"Post",    gradient:"135deg, #2e1065 0%, #7c3aed 50%, #a78bfa 100%" },
  };
  const cfg = CFG[res.type] || CFG.article;
  const ytId = res.type === "video" && res.url
    ? res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]
    : null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header gradient */}
        <div style={{ height:100, borderRadius:"22px 22px 0 0", background:`linear-gradient(${cfg.gradient})`, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ color:"rgba(255,255,255,.9)" }}>{React.cloneElement(cfg.icon as React.ReactElement, { size:40 })}</div>
          <div style={{ position:"absolute", top:10, left:14, padding:"3px 10px", borderRadius:99, background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.25)", fontSize:9, fontWeight:900, color:"#fff", textTransform:"uppercase", letterSpacing:".14em" }}>
            {cfg.label}
          </div>
          <button onClick={onClose} style={{ position:"absolute", top:12, right:12, width:30, height:30, borderRadius:8, background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={14} color="#fff" />
          </button>
        </div>

        <div style={{ padding:"22px 24px 26px" }}>
          <h2 style={{ fontSize:20, fontWeight:900, color:"#111110", letterSpacing:"-.5px", marginBottom:12 }}>{res.title}</h2>

          {/* YouTube embed */}
          {ytId && (
            <div style={{ borderRadius:14, overflow:"hidden", marginBottom:16, border:"2px solid #111110", aspectRatio:"16/9", background:"#000" }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                style={{ width:"100%", height:"100%", border:"none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {res.description && (
            <p style={{ fontSize:14, color:"#5C5346", lineHeight:1.75, marginBottom:18 }}>{res.description}</p>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {res.url && (
              <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"12px", background:`linear-gradient(${cfg.gradient})`, border:"2.5px solid #111110", borderRadius:13, fontSize:14, fontWeight:800, color:"#fff", boxShadow:"3px 3px 0 #111110", cursor:"pointer" }}>
                  {React.cloneElement(cfg.icon as React.ReactElement, { size:15, color:"#fff" })}
                  {res.type === "video" ? "Watch on YouTube" : res.type === "article" ? "Read Article" : "View Post"}
                  <ArrowRight size={14} />
                </div>
              </a>
            )}
            {isOwn && (
              <button onClick={() => { if (confirm("Delete this resource?")) { onDelete(); onClose(); } }} style={{ padding:"10px", background:"#fff", border:"2px solid #EF4444", borderRadius:13, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Trash2 size={13} /> Delete Resource
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// RESOURCE CARD — immersive, clickable
// ══════════════════════════════════════════════════════════════════
function ResourceCard({ res, onDelete, delay = 0, isOwn = false }: {
  res: Resource; onDelete: () => void; delay?: number; isOwn?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);

  const CFG = {
    video:   { icon: <Youtube size={16} />,       color:"#FF0000", bg:"#FFF0F0", label:"Video",   gradient:"135deg, #450a0a 0%, #b91c1c 60%, #f87171 100%" },
    article: { icon: <FileText size={16} />,      color:"#0EA5E9", bg:"#E0F2FE", label:"Article", gradient:"135deg, #0c4a6e 0%, #0284c7 60%, #38bdf8 100%" },
    post:    { icon: <MessageSquare size={16} />, color:"#8B5CF6", bg:"#EDE9FE", label:"Post",    gradient:"135deg, #2e1065 0%, #7c3aed 60%, #a78bfa 100%" },
  };
  const cfg = CFG[res.type] || CFG.article;

  const ytId = res.type === "video" && res.url
    ? res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]
    : null;
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  return (
    <>
      <div
        className="res-card-new"
        style={{ animationDelay:`${delay}s`, cursor:"pointer" }}
        onClick={() => setShowDetail(true)}
      >
        {/* Left: thumbnail or gradient swatch */}
        <div style={{
          width:100, flexShrink:0,
          background: thumbUrl ? "#000" : `linear-gradient(${cfg.gradient})`,
          borderRadius:"14px 0 0 14px",
          overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center",
          position:"relative",
        }}>
          {thumbUrl
            ? <img src={thumbUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:.85 }} />
            : <span style={{ opacity:.9 }}>{React.cloneElement(cfg.icon as React.ReactElement, { size:28, color:"#fff" })}</span>
          }
          {thumbUrl && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.25)" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Play size={12} color="#111110" />
              </div>
            </div>
          )}
        </div>

        {/* Right: content */}
        <div style={{ padding:"12px 14px", flex:1, minWidth:0, display:"flex", flexDirection:"column", justifyContent:"center", gap:4 }}>
          {/* Type badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, background:cfg.bg, fontSize:9, fontWeight:800, color:cfg.color, textTransform:"uppercase", letterSpacing:".12em", width:"fit-content" }}>
            {React.cloneElement(cfg.icon as React.ReactElement, { size:9 })}
            {cfg.label}
          </div>
          <div style={{ fontSize:13, fontWeight:800, color:"#111110", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
            {res.title}
          </div>
          {res.description && (
            <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:500, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {res.description}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div style={{ display:"flex", alignItems:"center", paddingRight:14, color:cfg.color, flexShrink:0 }}>
          <ChevronRight size={16} />
        </div>
      </div>

      {showDetail && (
        <ResourceDetailModal
          res={res}
          onClose={() => setShowDetail(false)}
          onDelete={onDelete}
          isOwn={isOwn}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function EventsEducationPage() {
  const sb = createClient();

  const [mainTab,     setMainTab]     = useState<MainTab>("events");
  const [eventsView,  setEventsView]  = useState<EventsView>("cards");
  const [events,      setEvents]      = useState<Event[]>([]);
  const [resources,   setResources]   = useState<Resource[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [showResForm, setShowResForm] = useState(false);
  const [savingRes,   setSavingRes]   = useState(false);
  const [calDate,     setCalDate]     = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", venue: "", description: "", start_date: "", end_date: "",
    event_type: "exhibition" as EventType, is_online: false, online_url: "",
    is_public: true, location_name: "", cover_image: "",
  });

  const [resForm, setResForm] = useState({ type: "video" as ResourceType, title: "", url: "", description: "" });

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id); });
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: evs }, { data: ress }] = await Promise.all([
      sb.from("exhibitions").select("*").eq("user_id", user.id).order("start_date", { ascending: true }),
      sb.from("education_resources").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setEvents(evs || []);
    setResources(ress || []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ title:"", venue:"", description:"", start_date:"", end_date:"", event_type:"exhibition", is_online:false, online_url:"", is_public:true, location_name:"", cover_image:"" });
    setLocationCoords(null);
    setShowForm(true);
  }

  function openEdit(ev: Event) {
    setEditId(ev.id);
    setForm({ title:ev.title||"", venue:ev.venue||"", description:ev.description||"", start_date:ev.start_date||"", end_date:ev.end_date||"", event_type:(ev.event_type as EventType)||"exhibition", is_online:ev.is_online||false, online_url:ev.online_url||"", is_public:ev.is_public, location_name:ev.location_name||ev.venue||"", cover_image:ev.cover_image||"" });
    setLocationCoords(ev.lat && ev.lng ? { lat:ev.lat, lng:ev.lng } : null);
    setShowForm(true);
  }

  async function uploadCover(file: File) {
    if (!userId) return;
    setCoverUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/events/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
    if (!upErr) {
      const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
      setForm(p => ({ ...p, cover_image: publicUrl }));
    }
    setCoverUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const now = new Date();
    const start = form.start_date ? new Date(form.start_date) : null;
    const end   = form.end_date   ? new Date(form.end_date)   : null;
    let status = "upcoming";
    if (end && end < now) status = "past";
    else if (start && start <= now && (!end || end >= now)) status = "current";

    const payload = {
      title: form.title, venue: form.location_name || form.venue || null,
      description: form.description || null, start_date: form.start_date || null,
      end_date: form.end_date || null, event_type: form.event_type,
      is_online: form.is_online, online_url: form.online_url || null,
      is_public: form.is_public, location_name: form.location_name || form.venue || null,
      lat: locationCoords?.lat || null, lng: locationCoords?.lng || null,
      cover_image: form.cover_image || null,
      status, updated_at: new Date().toISOString(),
    };

    if (editId) { await sb.from("exhibitions").update(payload).eq("id", editId); }
    else { await sb.from("exhibitions").insert({ ...payload, user_id: user.id }); }

    setShowForm(false); setSaving(false); load();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await sb.from("exhibitions").delete().eq("id", id);
    setEvents(p => p.filter(e => e.id !== id));
  }

  async function handleSaveResource(e: React.FormEvent) {
    e.preventDefault(); setSavingRes(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSavingRes(false); return; }
    await sb.from("education_resources").insert({ ...resForm, user_id: user.id });
    setResForm({ type:"video", title:"", url:"", description:"" });
    setShowResForm(false); setSavingRes(false); load();
  }

  async function deleteResource(id: string) {
    await sb.from("education_resources").delete().eq("id", id);
    setResources(p => p.filter(r => r.id !== id));
  }

  const sf  = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const rSf = (k: string) => (e: React.ChangeEvent<any>) => setResForm(p => ({ ...p, [k]: e.target.value }));

  const upcoming  = events.filter(isUpcoming).sort((a,b) => (a.start_date||"").localeCompare(b.start_date||""));
  const past      = events.filter(e => !isUpcoming(e)).sort((a,b) => (b.start_date||"").localeCompare(a.start_date||""));
  const workshops = events.filter(e => e.event_type === "workshop" || e.event_type === "online_workshop");

  const calEvents: Record<string, Event[]> = {};
  events.forEach(ev => {
    if (ev.start_date) {
      const k = ev.start_date.split("T")[0];
      if (!calEvents[k]) calEvents[k] = [];
      calEvents[k].push(ev);
    }
  });

  return (
    <>
      <style>{CSS}</style>
      <div>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, color:"#111110", letterSpacing:"-0.7px", margin:0 }}>Events & Education</h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0", fontWeight:600 }}>
              {upcoming.length} upcoming · {past.length} past · {workshops.length} workshops
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {mainTab === "education" && (
              <button onClick={() => setShowResForm(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"border-color .15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}>
                <BookOpen size={14} /> Add Resource
              </button>
            )}
            <button onClick={openCreate} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110", transition:"all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
              <Plus size={14} strokeWidth={3} /> New Event
            </button>
          </div>
        </div>

        {/* ── MAIN TABS ── */}
        <div style={{ display:"flex", borderBottom:"2px solid #E8E0D0", marginBottom:24, gap:0 }}>
          {([["events","🗓️ Events"],["education","📚 Education Hub"]] as const).map(([key,label]) => (
            <button key={key} onClick={() => setMainTab(key)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px", border:"none", background:"transparent", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", color: mainTab===key ? "#111110" : "#9B8F7A", borderBottom: mainTab===key ? "2.5px solid #FFD400" : "2.5px solid transparent", marginBottom:"-2px", transition:"color .15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════ EVENTS TAB ════════════════ */}
        {mainTab === "events" && (
          <div>
            {/* View switcher */}
            <div style={{ display:"flex", border:"2.5px solid #111110", borderRadius:14, overflow:"hidden", width:"fit-content", marginBottom:24 }}>
              {([["cards","🃏 Cards"],["calendar","📆 Calendar"]] as const).map(([key,label]) => (
                <button key={key} onClick={() => setEventsView(key)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", border:"none", background: eventsView===key ? "#111110" : "#fff", color: eventsView===key ? "#FFD400" : "#9B8F7A", fontFamily:"inherit", fontSize:12, fontWeight:800, cursor:"pointer", borderRight: key==="cards" ? "2px solid #111110" : "none", transition:"all .15s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── CARDS VIEW ── */}
            {eventsView === "cards" && (
              <div>
                {loading ? (
                  <div style={{ padding:60, textAlign:"center", color:"#9B8F7A" }}>Loading…</div>
                ) : events.length === 0 ? (
                  <div style={{ padding:"60px 24px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:20, background:"#fff" }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>🗓️</div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#111110", marginBottom:6 }}>No events yet</div>
                    <div style={{ fontSize:13, color:"#9B8F7A", marginBottom:20 }}>Create your first exhibition, workshop or gathering</div>
                    <button onClick={openCreate} style={{ padding:"10px 20px", border:"2.5px solid #111110", background:"#FFD400", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>+ New Event</button>
                  </div>
                ) : (
                  <>
                    {upcoming.length > 0 && (
                      <div style={{ marginBottom:36 }}>
                        <div className="section-label">📅 Upcoming ({upcoming.length})</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:18 }}>
                          {upcoming.map((ev, i) => (
                            <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} delay={i * 0.04} isOwn={ev.user_id === userId} />
                          ))}
                        </div>
                      </div>
                    )}
                    {past.length > 0 && (
                      <div>
                        <div className="section-label">🗂️ Past ({past.length})</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:18 }}>
                          {past.map((ev, i) => (
                            <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} delay={i * 0.04} past isOwn={ev.user_id === userId} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CALENDAR VIEW ── */}
            {eventsView === "calendar" && (
              <div style={{ background:"#fff", border:"2.5px solid #111110", borderRadius:20, overflow:"hidden", boxShadow:"4px 5px 0 #D4C9A8" }}>
                {/* Calendar header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #E8E0D0", background:"#FFFBEA" }}>
                  <button onClick={() => setCalDate(d => { const m = d.month === 0 ? { year:d.year-1, month:11 } : { year:d.year, month:d.month-1 }; return m; })} style={{ width:32, height:32, border:"2px solid #E8E0D0", borderRadius:9, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <ChevronLeft size={15} />
                  </button>
                  <div style={{ fontSize:16, fontWeight:900, color:"#111110" }}>{MONTHS[calDate.month]} {calDate.year}</div>
                  <button onClick={() => setCalDate(d => { const m = d.month === 11 ? { year:d.year+1, month:0 } : { year:d.year, month:d.month+1 }; return m; })} style={{ width:32, height:32, border:"2px solid #E8E0D0", borderRadius:9, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <ChevronRight size={15} />
                  </button>
                </div>
                {/* Day headers */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid #E8E0D0" }}>
                  {DAYS_SHORT.map(d => <div key={d} style={{ padding:"8px 0", textAlign:"center", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".08em" }}>{d}</div>)}
                </div>
                {/* Day cells */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
                  {Array.from({ length: getFirstDow(calDate.year, calDate.month) }).map((_, i) => (
                    <div key={`e${i}`} style={{ minHeight:80, borderRight:"1px solid #F5F0E8", borderBottom:"1px solid #F5F0E8", background:"#FAFAF8" }} />
                  ))}
                  {Array.from({ length: getDaysInMonth(calDate.year, calDate.month) }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calDate.year}-${String(calDate.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayEvs = calEvents[dateStr] || [];
                    const isToday = dateStr === new Date().toISOString().split("T")[0];
                    return (
                      <div key={day} style={{ minHeight:80, padding:"6px 4px", borderRight:"1px solid #F5F0E8", borderBottom:"1px solid #F5F0E8", cursor: dayEvs.length > 0 ? "pointer" : "default" }}>
                        <div style={{ marginBottom:4, textAlign:"right" }}>
                          {isToday
                            ? <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, background:"#111110", color:"#FFD400", fontSize:11, fontWeight:900, borderRadius:"50%" }}>{day}</span>
                            : <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>{day}</span>}
                        </div>
                        {dayEvs.slice(0,2).map(ev => {
                          const etc = getETC(ev.event_type);
                          return (
                            <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 5px", marginBottom:2, background:etc.bg, border:`1px solid ${etc.color}40`, borderRadius:5, fontSize:9, fontWeight:700, color:etc.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}
                              onClick={() => openEdit(ev)}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background:etc.color, flexShrink:0 }}/>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvs.length > 2 && <div style={{ fontSize:8, color:"#9B8F7A", fontWeight:700 }}>+{dayEvs.length-2}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ EDUCATION HUB TAB ════════════════ */}
        {mainTab === "education" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, alignItems:"start" }}>

            {/* LEFT: Workshops */}
            <div>
              <div className="section-label">🎓 Workshops ({workshops.length})</div>
              {workshops.length === 0 ? (
                <div style={{ padding:"36px 20px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:16, background:"#fff", color:"#9B8F7A" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>No workshops yet</div>
                  <div style={{ fontSize:12, marginTop:4, fontWeight:500 }}>Create a workshop or online workshop event</div>
                  <button onClick={openCreate} style={{ marginTop:14, padding:"8px 16px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>+ New Workshop</button>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
                  {workshops.map((ev, i) => (
                    <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} delay={i * 0.04} isOwn={ev.user_id === userId} />
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Resources */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div className="section-label" style={{ margin:0 }}>📖 Resources ({resources.length})</div>
                <button onClick={() => setShowResForm(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", border:"2px solid #E8E0D0", borderRadius:9, background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"border-color .15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}>
                  <Plus size={12} strokeWidth={3} /> Add
                </button>
              </div>
              {resources.length === 0 ? (
                <div style={{ padding:"36px 20px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:16, background:"#fff", color:"#9B8F7A" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📚</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>No resources yet</div>
                  <div style={{ fontSize:12, marginTop:4, fontWeight:500 }}>Add YouTube videos, articles or community posts</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {resources.map((res, i) => (
                    <ResourceCard key={res.id} res={res} onDelete={() => deleteResource(res.id)} delay={i * 0.04} isOwn={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ NEW EVENT FORM MODAL ════════════════ */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:22, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto" }}>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"2px solid #111110", background:"#FFD400", borderRadius:"20px 20px 0 0" }}>
                <h2 style={{ fontSize:18, fontWeight:900, color:"#111110", margin:0 }}>{editId ? "Edit Event" : "New Event"}</h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} style={{ padding:"24px" }}>

                {/* ── Event type ── */}
                <div style={{ marginBottom:22 }}>
                  <label className="ev-label">What kind of event? *</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {EVENT_TYPES.map(et => (
                      <div key={et.key}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`2.5px solid ${form.event_type===et.key?"#111110":"#E8E0D0"}`, borderRadius:12, cursor:"pointer", background: form.event_type===et.key ? et.bg : "#fff", transition:"all .14s", boxShadow: form.event_type===et.key ? "2px 2px 0 #111110" : "none" }}
                        onClick={() => setForm(p => ({ ...p, event_type:et.key }))}>
                        <span style={{ color:et.color }}>{React.cloneElement(et.icon as React.ReactElement, { size:15 })}</span>
                        <span style={{ fontSize:11, fontWeight:800, color: form.event_type===et.key ? "#111110" : "#9B8F7A" }}>{et.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Cover image ── */}
                <div style={{ marginBottom:18 }}>
                  <label className="ev-label">Cover Image (optional)</label>
                  {form.cover_image ? (
                    <div style={{ position:"relative", borderRadius:14, overflow:"hidden", border:"2px solid #E8E0D0", marginBottom:8, height:140 }}>
                      <img src={form.cover_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      <button type="button" onClick={() => setForm(p => ({ ...p, cover_image:"" }))} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:8, background:"#111110", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        <X size={12} color="#FFD400" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => coverInputRef.current?.click()} style={{ width:"100%", height:100, border:"2px dashed #E8E0D0", borderRadius:14, background:"#F5F0E8", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:700, color:"#9B8F7A", fontFamily:"inherit", transition:"border-color .15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#111110"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"}>
                      <Upload size={20} color="#C0B8A8" />
                      {coverUploading ? "Uploading…" : "Upload cover photo"}
                    </button>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </div>

                {/* ── Title ── */}
                <div style={{ marginBottom:16 }}>
                  <label className="ev-label">Title *</label>
                  <input required className="ev-input" value={form.title} onChange={sf("title")} placeholder="Name your event…" />
                </div>

                {/* ── Description ── */}
                <div style={{ marginBottom:16 }}>
                  <label className="ev-label">Description</label>
                  <textarea className="ev-input" rows={3} value={form.description} onChange={sf("description")} placeholder="What's this event about?" style={{ resize:"vertical" }} />
                </div>

                {/* ── Online toggle ── */}
                <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"#F5F0E8", borderRadius:12, border:"1.5px solid #E8E0D0" }}>
                  <input type="checkbox" id="is_online" checked={form.is_online} onChange={sf("is_online")} style={{ width:16, height:16, accentColor:"#111110" }} />
                  <label htmlFor="is_online" style={{ fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer" }}>This is an online event</label>
                </div>

                {form.is_online ? (
                  <div style={{ marginBottom:16 }}>
                    <label className="ev-label">Online URL</label>
                    <input className="ev-input" type="url" value={form.online_url} onChange={sf("online_url")} placeholder="https://zoom.us/…" />
                  </div>
                ) : (
                  <div style={{ marginBottom:16 }}>
                    <label className="ev-label">Location</label>
                    <PlacesAutocomplete
                      value={form.location_name}
                      placeholder="Search venue or address…"
                      onChange={(result, raw) => {
                        setForm(p => ({ ...p, location_name: raw }));
                        if (result?.lat && result?.lng) setLocationCoords({ lat: result.lat, lng: result.lng });
                      }}
                    />
                  </div>
                )}

                {/* ── Dates ── */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                  <div><label className="ev-label">Start Date</label><input type="date" className="ev-input" value={form.start_date} onChange={sf("start_date")} /></div>
                  <div><label className="ev-label">End Date</label><input type="date" className="ev-input" value={form.end_date} onChange={sf("end_date")} /></div>
                </div>

                {/* ── Public toggle ── */}
                <div style={{ marginBottom:22, display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"#F5F0E8", borderRadius:12, border:"1.5px solid #E8E0D0" }}>
                  <input type="checkbox" id="is_public" checked={form.is_public} onChange={sf("is_public")} style={{ width:16, height:16, accentColor:"#111110" }} />
                  <label htmlFor="is_public" style={{ fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer" }}>Make this event public</label>
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:12, border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button type="submit" disabled={saving || coverUploading} style={{ flex:2, padding:12, border:"2.5px solid #111110", borderRadius:12, background:"#FFD400", fontSize:14, fontWeight:800, cursor:saving||coverUploading?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110", opacity:saving||coverUploading?0.7:1 }}>
                    {saving ? "Saving…" : coverUploading ? "Uploading image…" : editId ? "Update Event" : "Create Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════════════ ADD RESOURCE MODAL ════════════════ */}
        {showResForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setShowResForm(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:22, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:480 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"2px solid #111110", background:"#111110", borderRadius:"20px 20px 0 0" }}>
                <h2 style={{ fontSize:18, fontWeight:900, color:"#FFD400", margin:0 }}>Add Educational Resource</h2>
                <button onClick={() => setShowResForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#FFD400" }}><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveResource} style={{ padding:"24px" }}>
                <div style={{ marginBottom:18 }}>
                  <label className="ev-label">Resource type</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {([
                      { key:"video",   label:"Video",   icon:<Youtube size={16}/>,      color:"#FF0000" },
                      { key:"article", label:"Article", icon:<FileText size={16}/>,     color:"#0EA5E9" },
                      { key:"post",    label:"Post",    icon:<MessageSquare size={16}/>, color:"#8B5CF6" },
                    ] as const).map(rt => (
                      <div key={rt.key}
                        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px 0", border:`2.5px solid ${resForm.type===rt.key?"#111110":"#E8E0D0"}`, borderRadius:12, cursor:"pointer", background:resForm.type===rt.key?"#F5F0E8":"#fff", fontSize:13, fontWeight:800, color:resForm.type===rt.key?"#111110":"#9B8F7A", transition:"all .15s", boxShadow:resForm.type===rt.key?"2px 2px 0 #111110":"none" }}
                        onClick={() => setResForm(p => ({ ...p, type:rt.key }))}>
                        <span style={{ color:rt.color }}>{rt.icon}</span>{rt.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label className="ev-label">Title *</label>
                  <input required className="ev-input" value={resForm.title} onChange={rSf("title")} placeholder="e.g. Introduction to oil painting techniques" />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label className="ev-label">{resForm.type==="video"?"YouTube URL":resForm.type==="article"?"Article URL":"Link (optional)"}</label>
                  <input className="ev-input" type="url" value={resForm.url} onChange={rSf("url")} placeholder="https://…" />
                </div>
                <div style={{ marginBottom:22 }}>
                  <label className="ev-label">Notes / Description</label>
                  <textarea className="ev-input" rows={2} value={resForm.description} onChange={rSf("description")} placeholder="What's this about?" style={{ resize:"vertical" }} />
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowResForm(false)} style={{ flex:1, padding:12, border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button type="submit" disabled={savingRes} style={{ flex:1, padding:12, border:"2.5px solid #111110", borderRadius:12, background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>
                    {savingRes ? "Saving…" : "Add Resource"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box}
  body{font-family:'Darker Grotesque',system-ui,sans-serif}

  .ev-input{width:100%;padding:11px 14px;border:2px solid #E8E0D0;border-radius:12px;font-size:14px;font-family:inherit;font-weight:600;color:#111110;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
  .ev-input:focus{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.2)}
  .ev-label{display:block;font-size:10px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px}

  .section-label{font-size:11px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px;display:flex;align-items:center;gap:6px}

  /* ── EVENT CARD ── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .ev-card-new{
    background:#fff;
    border:2.5px solid #E8E0D0;
    border-radius:20px;
    overflow:hidden;
    transition:all .25s cubic-bezier(.16,1,.3,1);
    animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;
  }
  .ev-card-new:hover{
    border-color:#111110;
    box-shadow:5px 6px 0 #111110;
    transform:translate(-2px,-3px);
  }
  .ev-card-new:hover .ev-card-img{
    transform:scale(1.04);
  }

  /* ── RESOURCE CARD ── */
  .res-card-new{
    background:#fff;
    border:2.5px solid #E8E0D0;
    border-radius:16px;
    overflow:hidden;
    display:flex;
    align-items:stretch;
    transition:all .22s cubic-bezier(.16,1,.3,1);
    animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;
    min-height:80px;
  }
  .res-card-new:hover{
    border-color:#111110;
    box-shadow:4px 5px 0 #111110;
    transform:translate(-1px,-2px);
  }
`;
