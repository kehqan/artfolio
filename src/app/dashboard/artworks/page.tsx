"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, ImageIcon, Edit2, Copy, DollarSign,
  LayoutGrid, List, Search, ChevronUp, ChevronDown,
  MoreHorizontal, Trash2, ArrowUpDown, ExternalLink,
  Megaphone, MapPin, PencilLine, Frame, Check, X,
  TrendingUp, Package, Eye, Tag,
} from "lucide-react";

// ── "Ripe" design system ─────────────────────────────────────────
// Neo-brutalism × organic softness. Hard borders & shadows where
// it matters (cards, CTAs), generous radius where users touch
// (thumbnails, pills, buttons). Warm cream palette. Bold type.
// ─────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8",   light: "#FAF7F4" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE",   light: "#F6F4FF" },
  { key: "complete",    label: "Complete",    color: "#0EA5E9", bg: "#E0F2FE",   light: "#F0F9FF" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7",   light: "#F0FDF4" },
  { key: "reserved",    label: "Reserved",    color: "#D97706", bg: "#FEF9C3",   light: "#FFFDE7" },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#E5E5E5",   light: "#F5F5F5" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const SALE_METHODS = [
  { key: "direct",           label: "Direct sale"      },
  { key: "inquiry",          label: "Inquiry only"     },
  { key: "price_on_request", label: "Price on request" },
  { key: "auction",          label: "Auction"          },
  { key: "not_for_sale",     label: "Not for sale"     },
];

function toStageKey(status: string | null | undefined): string {
  const s = String(status || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[s] ? s : "available";
}

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  width_cm?: number; height_cm?: number; depth_cm?: number;
  price?: number; currency?: string; status: string; images?: string[];
  framed?: boolean; editions?: number; materials_cost?: number;
  time_spent?: number; notes?: string; sale_method?: string;
  venue_location?: string; visibility_venues?: string; visibility_online?: string;
  location?: string; created_at: string; updated_at?: string;
};

type EditCell  = { id: string; field: string } | null;
type SortKey   = "title" | "medium" | "year" | "status" | "price" | "created_at";
type SortDir   = "asc" | "desc";
type ViewMode  = "grid" | "table";

// ── Status pill ──────────────────────────────────────────────────
function StatusPill({ stageKey }: { stageKey: string }) {
  const st = STAGE_MAP[stageKey] || STAGE_MAP["available"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px",
      background: st.bg,
      color: st.color,
      borderRadius: 9999,
      border: `1.5px solid ${st.color}40`,
      fontSize: 11, fontWeight: 800,
      textTransform: "uppercase", letterSpacing: "0.06em",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
      {st.label}
    </span>
  );
}

export default function ArtworksPage() {
  const router = useRouter();
  const [artworks,      setArtworks]      = useState<Artwork[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState<ViewMode>("grid");
  const [search,        setSearch]        = useState("");
  const [stageFilter,   setStageFilter]   = useState("All");
  const [sortKey,       setSortKey]       = useState<SortKey>("created_at");
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");
  const [editCell,      setEditCell]      = useState<EditCell>(null);
  const [editValue,     setEditValue]     = useState("");
  const [editMode,      setEditMode]      = useState(false);
  const [savingCell,    setSavingCell]    = useState(false);
  const [rowMenu,       setRowMenu]       = useState<string | null>(null);
  const [hoverCard,     setHoverCard]     = useState<string | null>(null);
  const [dragId,        setDragId]        = useState<string | null>(null);
  const [dragOver,      setDragOver]      = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (editCell) setTimeout(() => editInputRef.current?.focus(), 30);
  }, [editCell]);

  async function load() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setArtworks(data || []);
    setLoading(false);
  }

  async function commitEdit() {
    if (!editCell || savingCell) return;
    setSavingCell(true);
    const sb = createClient();
    const numFields = ["price","year","width_cm","height_cm","depth_cm","materials_cost","time_spent","editions"];
    const val = numFields.includes(editCell.field)
      ? (editValue === "" ? null : Number(editValue))
      : (editValue || null);
    await sb.from("artworks").update({ [editCell.field]: val, updated_at: new Date().toISOString() }).eq("id", editCell.id);
    setArtworks(p => p.map(a => a.id === editCell!.id ? { ...a, [editCell!.field]: val } : a));
    setEditCell(null); setSavingCell(false);
  }

  function cancelEdit() { setEditCell(null); setEditValue(""); }

  async function moveToStage(id: string, status: string) {
    const sb = createClient();
    await sb.from("artworks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setArtworks(p => p.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork permanently?")) return;
    const sb = createClient();
    await sb.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
    setRowMenu(null);
  }

  async function duplicateArtwork(id: string) {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = art as any;
    await sb.from("artworks").insert({ ...rest, user_id: user.id, title: `${art.title} (copy)`, status: "concept" });
    setRowMenu(null); load();
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const filtered = artworks
    .filter(a => {
      const q = search.toLowerCase();
      const matchQ = !search || a.title.toLowerCase().includes(q) || (a.medium||"").toLowerCase().includes(q);
      const matchS = stageFilter === "All" || STAGE_MAP[toStageKey(a.status)]?.label === stageFilter;
      return matchQ && matchS;
    })
    .sort((a, b) => {
      let av: any = (a as any)[sortKey] ?? "";
      let bv: any = (b as any)[sortKey] ?? "";
      if (sortKey === "price")  { av = a.price||0;   bv = b.price||0; }
      if (sortKey === "status") { av = toStageKey(a.status); bv = toStageKey(b.status); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

  // Drag & drop for kanban-style grid
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  // Stats
  const totalValue     = artworks.filter(a => a.price && toStageKey(a.status) === "available").reduce((s,a) => s+(a.price||0), 0);
  const availableCount = artworks.filter(a => toStageKey(a.status) === "available").length;
  const soldCount      = artworks.filter(a => toStageKey(a.status) === "sold").length;

  // ── Editable cell ────────────────────────────────────────────
  const EditableCell = ({ artwork, field, children, options }: {
    artwork: Artwork; field: string; children: React.ReactNode;
    options?: { key: string; label: string }[];
  }) => {
    const isEditing = editCell?.id === artwork.id && editCell?.field === field;
    if (isEditing) {
      if (options) return (
        <td style={tdStyle} onClick={e => e.stopPropagation()}>
          <select ref={editInputRef as any} value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") commitEdit(); }}
            style={{ width:"100%", padding:"6px 8px", border:"2px solid #FFD400", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", background:"#FFFBEA" }}>
            <option value="">—</option>
            {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </td>
      );
      return (
        <td style={tdStyle} onClick={e => e.stopPropagation()}>
          <input ref={editInputRef as any} value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") commitEdit(); }}
            style={{ width:"100%", padding:"6px 8px", border:"2px solid #FFD400", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", background:"#FFFBEA" }} />
        </td>
      );
    }
    return (
      <td style={{ ...tdStyle, cursor: editMode ? "text" : "default", background: editMode ? "#FFFEF8" : "transparent" }}
        onClick={e => { if (editMode) { e.stopPropagation(); setEditCell({ id: artwork.id, field }); setEditValue(String((artwork as any)[field] ?? "")); } }}>
        {children}
      </td>
    );
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderBottom: "1px solid #F0EBE3",
    borderRight: "1px solid #F0EBE3",
    verticalAlign: "middle",
    fontSize: 13,
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 800,
    color: "#9B8F7A",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    borderBottom: "2px solid #E8E0D0",
    borderRight: "1px solid #F0EBE3",
    background: "#FAF7F3",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  function SortTh({ k, label, w }: { k: SortKey; label: string; w?: number }) {
    const active = sortKey === k;
    return (
      <th style={{ ...thStyle, cursor: "pointer", width: w }}
        onClick={() => toggleSort(k)}
        onMouseEnter={e => (e.currentTarget.style.background = "#F5F0E8")}
        onMouseLeave={e => (e.currentTarget.style.background = "#FAF7F3")}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {label}
          {active
            ? sortDir === "asc"
              ? <ChevronUp size={11} color="#FFD400" />
              : <ChevronDown size={11} color="#FFD400" />
            : <ArrowUpDown size={11} color="#d4cfc4" />}
        </div>
      </th>
    );
  }

  // ── Artwork card (grid view) ──────────────────────────────────
  function ArtworkCard({ aw }: { aw: Artwork }) {
    const sk  = toStageKey(aw.status);
    const st  = STAGE_MAP[sk];
    const img = Array.isArray(aw.images) ? aw.images[0] : null;
    const isHover   = hoverCard === aw.id;
    const isDragging = dragId === aw.id;
    const menuOpen  = rowMenu === aw.id;

    return (
      <div
        draggable
        onDragStart={e => onDragStart(e, aw.id)}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHoverCard(aw.id)}
        onMouseLeave={() => { setHoverCard(null); }}
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "2px solid #E8E0D0",
          boxShadow: isHover && !isDragging
            ? "6px 8px 0 #111110"
            : isDragging ? "none" : "3px 4px 0 #D4C9A8",
          overflow: "hidden",
          opacity: isDragging ? 0.4 : 1,
          cursor: "pointer",
          position: "relative",
          transition: "box-shadow 0.15s, transform 0.15s, border-color 0.15s",
          transform: isHover && !isDragging ? "translate(-2px,-3px)" : "none",
          borderColor: isHover ? "#111110" : "#E8E0D0",
        }}
        onClick={() => { if (!rowMenu) router.push(`/dashboard/artworks/${aw.id}`); }}
      >
        {/* Thumbnail */}
        <div style={{ position: "relative", aspectRatio: "4/3", background: st.light, overflow: "hidden" }}>
          {img
            ? <img src={img} alt={aw.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.3s", transform: isHover ? "scale(1.04)" : "scale(1)" }} />
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                <ImageIcon size={32} color="#D4C9A8" />
                <span style={{ fontSize:11, color:"#C8BFB0", fontWeight:600 }}>No image</span>
              </div>
          }
          {/* Stage pill overlay */}
          <div style={{ position:"absolute", top:10, left:10 }}>
            <StatusPill stageKey={sk} />
          </div>
          {aw.framed && (
            <div style={{ position:"absolute", top:10, right:10, width:26, height:26, borderRadius:8, background:"rgba(255,255,255,0.92)", border:"1.5px solid #E8E0D0", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Frame size={12} color="#9B8F7A" />
            </div>
          )}
          {/* Hover overlay with quick actions */}
          <div style={{ position:"absolute", inset:0, background:"rgba(17,17,16,0.45)", opacity: isHover ? 1 : 0, transition:"opacity 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); router.push(`/dashboard/artworks/${aw.id}`); }}
              style={{ padding:"8px 14px", borderRadius:9999, background:"#fff", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:5, color:"#111110" }}>
              <Eye size={13} /> View
            </button>
            <Link href={`/dashboard/artworks/${aw.id}/edit`} onClick={e => e.stopPropagation()} style={{ textDecoration:"none" }}>
              <div style={{ padding:"8px 14px", borderRadius:9999, background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:5, color:"#111110" }}>
                <Edit2 size={13} /> Edit
              </div>
            </Link>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding:"14px 16px 12px" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#111110", letterSpacing:"-0.2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
            {aw.title}
          </div>
          {aw.medium && (
            <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:8 }}>
              {aw.medium}{aw.year ? ` · ${aw.year}` : ""}
            </div>
          )}

          {/* Price + location row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ fontSize:16, fontFamily:"monospace", fontWeight:900, color: aw.price ? "#111110" : "#D4C9A8" }}>
              {aw.price ? `$${Number(aw.price).toLocaleString()}` : "—"}
            </div>
            {(aw.venue_location || aw.location) && (
              <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, color:"#9B8F7A", fontWeight:600, overflow:"hidden", maxWidth:120 }}>
                <MapPin size={10} color="#FF6B6B" style={{ flexShrink:0 }}/>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {aw.venue_location || aw.location}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px 12px", borderTop:"1px solid #F5F0E8" }}>
          <Link href={`/dashboard/artworks/${aw.id}/promotion`} onClick={e => e.stopPropagation()} style={{ textDecoration:"none" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:9999, border:"1.5px solid #E8E0D0", fontSize:11, fontWeight:700, color:"#9B8F7A", background:"#FAF7F3", transition:"all 0.12s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#FFD400"; (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.color="#111110"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="#FAF7F3"; (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.color="#9B8F7A"; }}>
              <Megaphone size={10}/> Promote
            </div>
          </Link>

          {/* 3-dot menu */}
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setRowMenu(menuOpen ? null : aw.id)}
              style={{ width:30, height:30, borderRadius:9999, border:"1.5px solid #E8E0D0", background:"#FAF7F3", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
              onMouseEnter={e => { (e.currentTarget.style.background="#F0EBE3"); }}
              onMouseLeave={e => { (e.currentTarget.style.background="#FAF7F3"); }}>
              <MoreHorizontal size={14} color="#9B8F7A"/>
            </button>
            {menuOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 6px)", right:0, background:"#fff", border:"2px solid #111110", borderRadius:12, boxShadow:"4px 6px 0 #111110", zIndex:50, minWidth:170, overflow:"hidden", padding:4 }}>
                {[
                  { label:"View detail",  icon:ExternalLink, fn:() => { router.push(`/dashboard/artworks/${aw.id}`); setRowMenu(null); } },
                  { label:"Edit",         icon:Edit2,        fn:() => { router.push(`/dashboard/artworks/${aw.id}/edit`); setRowMenu(null); } },
                  { label:"Mark as sold", icon:DollarSign,   fn:() => { moveToStage(aw.id,"sold"); setRowMenu(null); } },
                  { label:"Duplicate",    icon:Copy,         fn:() => duplicateArtwork(aw.id) },
                  { label:"Delete",       icon:Trash2,       fn:() => deleteArtwork(aw.id), danger:true },
                ].map(item => (
                  <button key={item.label} type="button" onClick={item.fn}
                    style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"9px 12px", border:"none", borderRadius:8, background:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:(item as any).danger?"#EF4444":"#111110", textAlign:"left", fontFamily:"inherit" }}
                    onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? "#FEF2F2" : "#FFFBEA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <item.icon size={13}/>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
        .aw-row:hover td { background: #FFFBEA !important; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .aw-card-enter { animation: fadeSlide 0.25s ease forwards; }
      `}</style>

      {/* Overlays for closing menus */}
      {rowMenu  && <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={() => setRowMenu(null)} />}
      {editCell && <div style={{ position:"fixed", inset:0, zIndex:30 }} onClick={commitEdit} />}

      <div>

        {/* ════════════════════════════
            HEADER
        ════════════════════════════ */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:20 }}>
            <div>
              <h1 style={{ fontSize:32, fontWeight:900, color:"#111110", letterSpacing:"-1px", margin:0, lineHeight:1 }}>Artworks</h1>
              <p style={{ fontSize:14, color:"#9B8F7A", margin:"6px 0 0", fontWeight:600 }}>
                Your complete inventory
              </p>
            </div>

            <Link href="/dashboard/artworks/new" style={{ textDecoration:"none" }}>
              <button style={{ display:"flex", alignItems:"center", gap:7, padding:"11px 20px", background:"#FFD400", border:"2px solid #111110", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110", transition:"all 0.12s", whiteSpace:"nowrap" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow="4px 4px 0 #111110"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; }}>
                <Plus size={16} strokeWidth={3}/> Add Artwork
              </button>
            </Link>
          </div>

          {/* Stat cards row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Total works",   value: artworks.length,          icon:Package,     color:"#8B5CF6", bg:"#EDE9FE" },
              { label:"Available",     value: availableCount,           icon:Tag,         color:"#16A34A", bg:"#DCFCE7" },
              { label:"Sold",          value: soldCount,                icon:Check,       color:"#111110", bg:"#E5E5E5" },
              { label:"Inventory",     value:`$${totalValue.toLocaleString()}`, icon:TrendingUp, color:"#D97706", bg:"#FEF9C3" },
            ].map(stat => (
              <div key={stat.label} style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, padding:"14px 16px", boxShadow:"2px 3px 0 #E0D8CA" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em" }}>{stat.label}</span>
                  <div style={{ width:28, height:28, borderRadius:8, background:stat.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <stat.icon size={14} color={stat.color} />
                  </div>
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:"#111110", letterSpacing:"-0.5px" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Controls row */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            {/* Search */}
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, padding:"0 12px", height:38, flex:1, minWidth:160, maxWidth:280 }}
              onFocusWithin={(e: any) => (e.currentTarget.style.borderColor = "#FFD400")}
              onBlur={(e: any) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.borderColor = "#E8E0D0"; }}>
              <Search size={14} color="#9B8F7A"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artworks…"
                style={{ border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent", color:"#111110", fontWeight:500, width:"100%" }}/>
              {search && <button type="button" onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#C0B8A8", padding:0, display:"flex" }}><X size={12}/></button>}
            </div>

            {/* Status filter pills */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <button onClick={() => setStageFilter("All")}
                style={{ padding:"6px 14px", borderRadius:9999, border:"2px solid", borderColor:stageFilter==="All"?"#111110":"#E8E0D0", background:stageFilter==="All"?"#111110":"#fff", color:stageFilter==="All"?"#FFD400":"#9B8F7A", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.1s" }}>
                All <span style={{ opacity:0.6 }}>({artworks.length})</span>
              </button>
              {STAGES.map(st => {
                const count  = artworks.filter(a => toStageKey(a.status) === st.key).length;
                const active = stageFilter === st.label;
                return (
                  <button key={st.key} onClick={() => setStageFilter(active ? "All" : st.label)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:9999, border:`2px solid ${active ? st.color : "#E8E0D0"}`, background:active ? st.bg : "#fff", fontSize:12, fontWeight:700, cursor:"pointer", color:"#111110", transition:"all 0.1s" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
                    {st.label} <span style={{ color:"#9B8F7A", fontWeight:600 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
              {/* Edit cells toggle — table only */}
              {view === "table" && (
                <button onClick={() => { setEditMode(p => !p); setEditCell(null); }}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, border:"2px solid", borderColor:editMode?"#111110":"#E8E0D0", background:editMode?"#FFD400":"#fff", color:"#111110", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:editMode?"2px 2px 0 #111110":"none", transition:"all 0.12s" }}>
                  <PencilLine size={13}/> {editMode ? "Done editing" : "Edit cells"}
                </button>
              )}

              {/* Sort */}
              {view === "grid" && (
                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                  style={{ height:38, padding:"0 12px", border:"2px solid #E8E0D0", borderRadius:10, background:"#fff", fontSize:12, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
                  <option value="created_at">Newest first</option>
                  <option value="title">Title A→Z</option>
                  <option value="year">Year</option>
                  <option value="price">Price</option>
                  <option value="status">Stage</option>
                </select>
              )}

              {/* View toggle */}
              <div style={{ display:"flex", background:"#fff", border:"2px solid #111110", borderRadius:10, overflow:"hidden" }}>
                <button onClick={() => setView("grid")}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", border:"none", borderRight:"1px solid #E8E0D0", background:view==="grid"?"#111110":"transparent", color:view==="grid"?"#FFD400":"#9B8F7A", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.12s" }}>
                  <LayoutGrid size={13}/> Grid
                </button>
                <button onClick={() => setView("table")}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", border:"none", background:view==="table"?"#111110":"transparent", color:view==="table"?"#FFD400":"#9B8F7A", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.12s" }}>
                  <List size={13}/> Table
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════
            LOADING
        ════════════════════════════ */}
        {loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:18 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ borderRadius:20, background:"#F5F0E8", border:"2px solid #E8E0D0", overflow:"hidden", aspectRatio:"3/4", animation:"fadeSlide 0.3s ease both", animationDelay:`${i*0.05}s` }} />
            ))}
          </div>
        )}

        {/* ════════════════════════════
            EMPTY STATE
        ════════════════════════════ */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"80px 40px", background:"#fff", borderRadius:20, border:"2px solid #E8E0D0", boxShadow:"3px 4px 0 #E0D8CA" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🥭</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", marginBottom:8 }}>
              {search || stageFilter !== "All" ? "No artworks match your filters" : "Your inventory is empty"}
            </div>
            <div style={{ fontSize:14, color:"#9B8F7A", fontWeight:600, marginBottom:28 }}>
              {search || stageFilter !== "All"
                ? "Try clearing your filters to see all artworks."
                : "Add your first artwork to start building your collection."}
            </div>
            {!search && stageFilter === "All" && (
              <Link href="/dashboard/artworks/new" style={{ textDecoration:"none" }}>
                <button style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"12px 24px", background:"#FFD400", border:"2px solid #111110", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                  <Plus size={16} strokeWidth={3}/> Add first artwork
                </button>
              </Link>
            )}
          </div>
        )}

        {/* ════════════════════════════
            GRID VIEW
        ════════════════════════════ */}
        {!loading && filtered.length > 0 && view === "grid" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:18 }}>
            {/* Add card */}
            <Link href="/dashboard/artworks/new" style={{ textDecoration:"none" }}>
              <div style={{ borderRadius:20, border:"2px dashed #C0B8A8", background:"#FAF7F3", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, minHeight:280, cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="#111110"; el.style.background="#FFF7E0"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="#C0B8A8"; el.style.background="#FAF7F3"; }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"#FFD400", border:"2px solid #111110", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"2px 2px 0 #111110" }}>
                  <Plus size={20} strokeWidth={3}/>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:"#9B8F7A" }}>Add artwork</span>
              </div>
            </Link>

            {filtered.map((aw, i) => (
              <div key={aw.id} className="aw-card-enter" style={{ animationDelay:`${Math.min(i,10)*0.04}s` }}>
                <ArtworkCard aw={aw} />
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════
            TABLE VIEW
        ════════════════════════════ */}
        {!loading && filtered.length > 0 && view === "table" && (
          <div style={{ background:"#fff", border:"2px solid #111110", borderRadius:16, boxShadow:"4px 5px 0 #111110", overflow:"hidden" }}>
            {editMode && (
              <div style={{ padding:"10px 18px", background:"#FFD400", borderBottom:"2px solid #111110", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <PencilLine size={14}/>
                  <span style={{ fontSize:13, fontWeight:800 }}>Edit mode — click any cell to update it inline</span>
                </div>
                <button onClick={() => { setEditMode(false); setEditCell(null); }}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 13px", border:"2px solid #111110", borderRadius:8, background:"#111110", color:"#FFD400", fontSize:12, fontWeight:800, cursor:"pointer" }}>
                  <Check size={12}/> Done
                </button>
              </div>
            )}

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:980 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width:96, cursor:"default", borderRadius:"14px 0 0 0" }}>Image</th>
                    <SortTh k="title"   label="Title"  w={200} />
                    <SortTh k="medium"  label="Medium" w={150} />
                    <SortTh k="year"    label="Year"   w={64}  />
                    <th style={{ ...thStyle, w:100, cursor:"default" } as any}>Size (cm)</th>
                    <SortTh k="status"  label="Stage"  w={130} />
                    <SortTh k="price"   label="Price"  w={100} />
                    <th style={{ ...thStyle, width:120, cursor:"default" }}>Sale method</th>
                    <th style={{ ...thStyle, width:140, cursor:"default" }}>Location</th>
                    <th style={{ ...thStyle, width:90,  cursor:"default", borderRight:"none" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Quick-add row */}
                  <tr>
                    <td colSpan={10} style={{ borderBottom:"2px dashed #E8E0D0", padding:0 }}>
                      <Link href="/dashboard/artworks/new" style={{ textDecoration:"none", display:"block", padding:"10px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, color:"#9B8F7A", fontSize:13, fontWeight:600 }}>
                          <Plus size={14} color="#C0B8A8"/> Add new artwork…
                        </div>
                      </Link>
                    </td>
                  </tr>

                  {filtered.map(aw => {
                    const sk  = toStageKey(aw.status);
                    const st  = STAGE_MAP[sk];
                    const img = Array.isArray(aw.images) ? aw.images[0] : null;
                    const dims = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean).join(" × ");
                    const menuOpen = rowMenu === aw.id;

                    return (
                      <tr key={aw.id} className="aw-row"
                        style={{ cursor: editMode ? "default" : "pointer" }}
                        onClick={() => { if (!editMode && !editCell && !rowMenu) router.push(`/dashboard/artworks/${aw.id}`); }}>

                        {/* Thumbnail */}
                        <td style={{ ...tdStyle, padding:8, width:96 }}>
                          <div style={{ width:72, height:56, borderRadius:10, overflow:"hidden", background:st.light, flexShrink:0 }}>
                            {img
                              ? <img src={img} alt={aw.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={18} color="#D4C9A8"/></div>
                            }
                          </div>
                        </td>

                        {/* Title */}
                        <EditableCell artwork={aw} field="title">
                          <span style={{ fontSize:13, fontWeight:700, color:"#111110", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
                            {aw.title}
                          </span>
                        </EditableCell>

                        {/* Medium */}
                        <EditableCell artwork={aw} field="medium">
                          <span style={{ fontSize:12, color:"#5C5346", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>
                            {aw.medium || <span style={{ color:"#D4C9A8" }}>—</span>}
                          </span>
                        </EditableCell>

                        {/* Year */}
                        <EditableCell artwork={aw} field="year">
                          <span style={{ fontSize:12, color:"#9B8F7A" }}>{aw.year || "—"}</span>
                        </EditableCell>

                        {/* Dimensions (read-only) */}
                        <td style={tdStyle}>
                          <span style={{ fontSize:11, fontFamily:"monospace", color:"#9B8F7A" }}>{dims || "—"}</span>
                        </td>

                        {/* Stage */}
                        <EditableCell artwork={aw} field="status" options={STAGES.map(s => ({ key:s.key, label:s.label }))}>
                          <StatusPill stageKey={sk} />
                        </EditableCell>

                        {/* Price */}
                        <EditableCell artwork={aw} field="price">
                          <span style={{ fontSize:13, fontFamily:"monospace", fontWeight:700, color:"#111110" }}>
                            {aw.price ? `$${Number(aw.price).toLocaleString()}` : <span style={{ color:"#D4C9A8" }}>—</span>}
                          </span>
                        </EditableCell>

                        {/* Sale method */}
                        <EditableCell artwork={aw} field="sale_method" options={SALE_METHODS}>
                          <span style={{ fontSize:12, color:"#5C5346", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:110 }}>
                            {SALE_METHODS.find(m => m.key === aw.sale_method)?.label || <span style={{ color:"#D4C9A8" }}>—</span>}
                          </span>
                        </EditableCell>

                        {/* Location */}
                        <EditableCell artwork={aw} field="venue_location">
                          <span style={{ fontSize:12, color:"#5C5346", display:"flex", alignItems:"center", gap:4, overflow:"hidden", whiteSpace:"nowrap", maxWidth:130 }}>
                            {(aw.venue_location || aw.location)
                              ? <><MapPin size={10} color="#FF6B6B" style={{ flexShrink:0 }}/><span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{aw.venue_location || aw.location}</span></>
                              : <span style={{ color:"#D4C9A8" }}>—</span>
                            }
                          </span>
                        </EditableCell>

                        {/* Actions */}
                        <td style={{ ...tdStyle, borderRight:"none", textAlign:"center" }} onClick={e => e.stopPropagation()}>
                          <div style={{ position:"relative", display:"flex", justifyContent:"center" }}>
                            <button type="button"
                              onClick={() => setRowMenu(menuOpen ? null : aw.id)}
                              style={{ width:30, height:30, borderRadius:9999, border:"1.5px solid #E8E0D0", background:"#FAF7F3", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                              <MoreHorizontal size={14} color="#9B8F7A"/>
                            </button>
                            {menuOpen && (
                              <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"#fff", border:"2px solid #111110", borderRadius:12, boxShadow:"4px 6px 0 #111110", zIndex:50, minWidth:160, overflow:"hidden", padding:4 }}>
                                {[
                                  { label:"View",         icon:ExternalLink, fn:() => { router.push(`/dashboard/artworks/${aw.id}`); setRowMenu(null); } },
                                  { label:"Edit",         icon:Edit2,        fn:() => { router.push(`/dashboard/artworks/${aw.id}/edit`); setRowMenu(null); } },
                                  { label:"Promote",      icon:Megaphone,    fn:() => { router.push(`/dashboard/artworks/${aw.id}/promotion`); setRowMenu(null); } },
                                  { label:"Duplicate",    icon:Copy,         fn:() => duplicateArtwork(aw.id) },
                                  { label:"Delete",       icon:Trash2,       fn:() => deleteArtwork(aw.id), danger:true },
                                ].map(item => (
                                  <button key={item.label} type="button" onClick={item.fn}
                                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", border:"none", borderRadius:8, background:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:(item as any).danger?"#EF4444":"#111110", textAlign:"left", fontFamily:"inherit" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? "#FEF2F2" : "#FFFBEA")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                    <item.icon size={12}/>{item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{ padding:"10px 18px", borderTop:"1px solid #F0EBE3", background:"#FAF7F3", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"0 0 14px 14px" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#9B8F7A" }}>
                {filtered.length} of {artworks.length} artworks
                {editMode ? " · Click any cell to edit · Click Done when finished" : " · Click a row to view detail · Toggle 'Edit cells' to update inline"}
              </span>
              <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>
                ${totalValue.toLocaleString()} inventory value
              </span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
