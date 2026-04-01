"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ImageIcon, Edit2, Copy, DollarSign,
  Table2, Columns, Search, ChevronUp, ChevronDown,
  Frame, MoreHorizontal, Trash2,
  ArrowUpDown, ExternalLink, Megaphone, MapPin,
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

const SALE_METHODS = [
  { key: "direct",           label: "Direct"           },
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

type EditCell = { id: string; field: string } | null;
type SortKey = "title" | "medium" | "year" | "status" | "price" | "created_at";
type SortDir = "asc" | "desc";
type ViewTab = "table" | "kanban";

export default function ArtworksPage() {
  const router = useRouter();
  const [artworks, setArtworks]     = useState<Artwork[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<ViewTab>("table");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey]       = useState<SortKey>("created_at");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [editCell, setEditCell]     = useState<EditCell>(null);
  const [editValue, setEditValue]   = useState("");
  const [rowMenu, setRowMenu]       = useState<string | null>(null);
  const [cardMenu, setCardMenu]     = useState<string | null>(null);
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (editCell) setTimeout(() => editInputRef.current?.focus(), 30);
  }, [editCell]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setArtworks(data || []);
    setLoading(false);
  }

  // ── Inline cell editing ─────────────────────────────────────────
  function startEdit(artwork: Artwork, field: string) {
    setEditCell({ id: artwork.id, field });
    setEditValue(String((artwork as any)[field] ?? ""));
    setRowMenu(null);
  }

  async function commitEdit() {
    if (!editCell || savingCell) return;
    setSavingCell(true);
    const supabase = createClient();
    const numFields = ["price", "year", "width_cm", "height_cm", "depth_cm", "materials_cost", "time_spent", "editions"];
    const val = numFields.includes(editCell.field)
      ? (editValue === "" ? null : Number(editValue))
      : (editValue || null);
    await supabase.from("artworks").update({ [editCell.field]: val, updated_at: new Date().toISOString() }).eq("id", editCell.id);
    setArtworks(p => p.map(a => a.id === editCell!.id ? { ...a, [editCell!.field]: val } : a));
    setEditCell(null);
    setSavingCell(false);
  }

  function cancelEdit() { setEditCell(null); setEditValue(""); }

  async function moveToStage(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("artworks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setArtworks(p => p.map(a => a.id === id ? { ...a, status } : a));
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork permanently?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
    setRowMenu(null); setCardMenu(null);
  }

  async function duplicateArtwork(id: string) {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = art as any;
    await supabase.from("artworks").insert({ ...rest, user_id: user.id, title: `${art.title} (copy)`, status: "concept" });
    setRowMenu(null); setCardMenu(null); load();
  }

  // ── Sort ─────────────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ── Filtered + sorted ────────────────────────────────────────
  const filtered = artworks
    .filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !search || a.title.toLowerCase().includes(q) || (a.medium||"").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || STAGE_MAP[toStageKey(a.status)]?.label === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any = (a as any)[sortKey] ?? "";
      let bv: any = (b as any)[sortKey] ?? "";
      if (sortKey === "price")  { av = a.price||0; bv = b.price||0; }
      if (sortKey === "status") { av = toStageKey(a.status); bv = toStageKey(b.status); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // ── Drag & Drop ──────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id);
  }
  function onDragOver(e: React.DragEvent, key: string) { e.preventDefault(); setDragOver(key); }
  function onDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) moveToStage(id, key);
    setDragId(null); setDragOver(null);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  const totalValue = artworks.filter(a=>a.price&&toStageKey(a.status)==="available").reduce((s,a)=>s+(a.price||0),0);

  // ── Editable cell component ──────────────────────────────────
  const EditableCell = ({ artwork, field, children, selectOptions, width }: {
    artwork: Artwork; field: string; children: React.ReactNode;
    selectOptions?: { key: string; label: string }[]; width?: number;
  }) => {
    const isEditing = editCell?.id === artwork.id && editCell?.field === field;
    if (isEditing) {
      if (selectOptions) {
        return (
          <td style={{ padding: "4px 8px", borderBottom: "1px solid #E0D8CA", borderRight: "1px solid #E0D8CA" }} onClick={e => e.stopPropagation()}>
            <select ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") commitEdit(); }}
              style={{ width: "100%", padding: "5px 8px", border: "2px solid #FFD400", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#FFFBEA", cursor: "pointer" }}>
              <option value="">—</option>
              {selectOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </td>
        );
      }
      return (
        <td style={{ padding: "4px 8px", borderBottom: "1px solid #E0D8CA", borderRight: "1px solid #E0D8CA" }} onClick={e => e.stopPropagation()}>
          <input ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") commitEdit(); }}
            style={{ width: "100%", padding: "5px 8px", border: "2px solid #FFD400", fontSize: 12, fontFamily: "inherit", outline: "none", background: "#FFFBEA" }} />
        </td>
      );
    }
    return (
      <td style={{ padding: "10px 12px", borderBottom: "1px solid #E0D8CA", borderRight: "1px solid #E0D8CA", cursor: "text", maxWidth: width || "auto" }}
        onDoubleClick={e => { e.stopPropagation(); startEdit(artwork, field); }}
        title="Double-click to edit">
        {children}
      </td>
    );
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800,
    color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em",
    borderBottom: "2px solid #111110", borderRight: "1px solid #E0D8CA",
    background: "#F5F0E8", whiteSpace: "nowrap", userSelect: "none",
  };

  const SortTh = ({ k, label, width }: { k: SortKey; label: string; width?: number }) => (
    <th style={{ ...thStyle, cursor: "pointer", width }} onClick={() => toggleSort(k)}
      onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEA")}
      onMouseLeave={e => (e.currentTarget.style.background = "#F5F0E8")}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {sortKey === k
          ? (sortDir === "asc" ? <ChevronUp size={11} color="#FFD400" /> : <ChevronDown size={11} color="#FFD400" />)
          : <ArrowUpDown size={11} color="#d4cfc4" />}
      </div>
    </th>
  );

  // ── Kanban Card ──────────────────────────────────────────────
  const KanbanCard = ({ aw }: { aw: Artwork }) => {
    const sk = toStageKey(aw.status);
    const st = STAGE_MAP[sk];
    const img = Array.isArray(aw.images) ? aw.images[0] : null;
    const menuOpen = cardMenu === aw.id;
    const isDragging = dragId === aw.id;
    return (
      <div draggable onDragStart={e => onDragStart(e, aw.id)} onDragEnd={onDragEnd}
        style={{ background:"#fff", border:"2px solid #111110", boxShadow: isDragging?"none":"3px 3px 0 #111110", opacity: isDragging?0.4:1, marginBottom:10, cursor:"grab", position:"relative", userSelect:"none", transition:"box-shadow 0.12s, transform 0.12s" }}
        onMouseEnter={e => { if(!isDragging){(e.currentTarget as HTMLElement).style.transform="translate(-1px,-2px)";(e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110";}}}
        onMouseLeave={e => {(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow=isDragging?"none":"3px 3px 0 #111110";}}>
        {/* Image */}
        <div onClick={() => router.push(`/dashboard/artworks/${aw.id}`)}
          style={{ position:"relative", aspectRatio:"4/3", background:st.bg, overflow:"hidden", cursor:"pointer" }}>
          {img ? <img src={img} alt={aw.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={24} color="#d4cfc4" /></div>}
          <div style={{ position:"absolute", top:7, left:7, padding:"2px 7px", background:st.color, fontSize:8, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.12em", color:sk==="sold"?"#FFD400":"#fff" }}>{st.label}</div>
          {aw.framed && <div style={{ position:"absolute", top:7, right:7, width:20, height:20, background:"rgba(255,255,255,0.92)", border:"1.5px solid #111110", display:"flex", alignItems:"center", justifyContent:"center" }}><Frame size={10} color="#111110" /></div>}
        </div>
        {/* Body */}
        <div onClick={() => router.push(`/dashboard/artworks/${aw.id}`)} style={{ padding:"9px 12px 6px", cursor:"pointer" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{aw.title}</div>
          {aw.medium && <div style={{ fontSize:10, fontWeight:600, color:"#9B8F7A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw.medium}</div>}
          {(aw.width_cm||aw.height_cm) && <div style={{ fontSize:10, color:"#d4cfc4", marginTop:2 }}>{[aw.width_cm,aw.height_cm,aw.depth_cm].filter(Boolean).join(" × ")} cm</div>}
        </div>
        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 12px 10px" }}>
          {aw.price && !["concept","in_progress"].includes(sk)
            ? <span style={{ fontSize:12, fontFamily:"monospace", fontWeight:800, color:"#111110" }}>${aw.price.toLocaleString()}</span>
            : <span />}
          <div style={{ position:"relative" }}>
            <button onClick={e=>{e.stopPropagation();setCardMenu(menuOpen?null:aw.id);}}
              style={{ width:26, height:26, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <MoreHorizontal size={13}/>
            </button>
            {menuOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 4px)", right:0, background:"#fff", border:"2px solid #111110", boxShadow:"4px 4px 0 #111110", zIndex:30, minWidth:160, overflow:"hidden" }}
                onClick={e=>e.stopPropagation()}>
                {[
                  { label:"View detail", icon:ExternalLink, action:()=>{router.push(`/dashboard/artworks/${aw.id}`);setCardMenu(null);} },
                  { label:"Mark as sold", icon:DollarSign, action:()=>{moveToStage(aw.id,"sold");setCardMenu(null);} },
                  { label:"Duplicate", icon:Copy, action:()=>duplicateArtwork(aw.id) },
                  { label:"Delete", icon:Trash2, action:()=>deleteArtwork(aw.id), danger:true },
                ].map(item=>(
                  <button key={item.label} onClick={item.action}
                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", borderBottom:"1px solid #F5F0E8", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:(item as any).danger?"#FF6B6B":"#111110", textAlign:"left" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=(item as any).danger?"#FFF5F5":"#FFFBEA")}
                    onMouseLeave={e=>(e.currentTarget.style.background="none")}>
                    <item.icon size={12}/> {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        .aw-row:hover td{background:#FFFBEA!important}
        .aw-col-drop{border-color:#FFD400!important;background:#FFFBEA!important}
      `}</style>

      {(rowMenu||cardMenu) && <div style={{ position:"fixed", inset:0, zIndex:9 }} onClick={()=>{setRowMenu(null);setCardMenu(null);}}/>}
      {editCell && <div style={{ position:"fixed", inset:0, zIndex:8 }} onClick={commitEdit}/>}

      <div>
        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0 }}>Artworks</h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0" }}>
              {artworks.length} works · {artworks.filter(a=>toStageKey(a.status)==="available").length} available · ${totalValue.toLocaleString()} inventory value
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {/* Tab toggle */}
            <div style={{ display:"flex", border:"2px solid #111110", overflow:"hidden" }}>
              <button onClick={()=>setTab("table")} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", border:"none", borderRight:"1px solid #E0D8CA", background:tab==="table"?"#111110":"#fff", color:tab==="table"?"#FFD400":"#111110", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                <Table2 size={13}/> Table
              </button>
              <button onClick={()=>setTab("kanban")} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", border:"none", background:tab==="kanban"?"#111110":"#fff", color:tab==="kanban"?"#FFD400":"#111110", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                <Columns size={13}/> Kanban
              </button>
            </div>
            {/* Search */}
            <div style={{ display:"flex", alignItems:"center", gap:6, border:"2px solid #111110", padding:"0 10px", background:"#fff", height:34 }}>
              <Search size={12} color="#9B8F7A"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{ border:"none", outline:"none", fontSize:12, fontFamily:"inherit", background:"transparent", width:130, color:"#111110" }}/>
            </div>
            {/* Status filter */}
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{ height:34, padding:"0 10px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
              <option value="All">All stages</option>
              {STAGES.map(s=><option key={s.key} value={s.label}>{s.label}</option>)}
            </select>
            {/* Add */}
            <Link href="/dashboard/artworks/new" style={{ textDecoration:"none" }}>
              <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110", whiteSpace:"nowrap" }}>
                <Plus size={14} strokeWidth={3}/> Add Artwork
              </button>
            </Link>
          </div>
        </div>

        {/* Stage pills */}
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {STAGES.map(st=>{
            const count = artworks.filter(a=>toStageKey(a.status)===st.key).length;
            const active = statusFilter===st.label;
            return (
              <button key={st.key} onClick={()=>setStatusFilter(active?"All":st.label)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 11px", border:`2px solid ${active?st.color:"#E0D8CA"}`, background:active?st.bg:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#111110" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:st.color }}/>
                {st.label} <span style={{ color:"#9B8F7A" }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════
            TABLE VIEW
        ════════════════════════════════════════ */}
        {tab === "table" && (
          <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1100 }}>
                <thead>
                  <tr>
                    {/* Image — wide */}
                    <th style={{ ...thStyle, width:180, cursor:"default" }}>Image</th>
                    <SortTh k="title"      label="Title"        width={180}/>
                    <SortTh k="medium"     label="Medium"       width={140}/>
                    <SortTh k="year"       label="Year"         width={60} />
                    <th style={{ ...thStyle, width:110, cursor:"default" }}>Size (cm)</th>
                    <SortTh k="status"     label="Stage"        width={110}/>
                    <SortTh k="price"      label="Price"        width={90} />
                    <th style={{ ...thStyle, width:110, cursor:"default" }}>Sale method</th>
                    <th style={{ ...thStyle, width:130, cursor:"default" }}>Venue / visibility</th>
                    <th style={{ ...thStyle, width:80,  cursor:"default", borderRight:"none" }}>Promotion</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Inline add row */}
                  <tr>
                    <td colSpan={10} style={{ padding:"0", borderBottom:"2px dashed #E0D8CA" }}>
                      <Link href="/dashboard/artworks/new" style={{ textDecoration:"none", display:"block", padding:"10px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, color:"#9B8F7A", fontSize:12, fontWeight:600 }}>
                          <Plus size={13} color="#9B8F7A"/> Add new artwork…
                        </div>
                      </Link>
                    </td>
                  </tr>

                  {loading ? (
                    <tr><td colSpan={10} style={{ padding:40, textAlign:"center", color:"#9B8F7A", borderRight:"none" }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding:40, textAlign:"center", color:"#9B8F7A", borderRight:"none" }}>
                      {search||statusFilter!=="All" ? "No artworks match your filters." : "No artworks yet — add your first one."}
                    </td></tr>
                  ) : filtered.map(aw => {
                    const sk  = toStageKey(aw.status);
                    const st  = STAGE_MAP[sk];
                    const img = Array.isArray(aw.images) ? aw.images[0] : null;
                    const dims = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean).join(" × ");
                    const menuOpen = rowMenu === aw.id;
                    return (
                      <tr key={aw.id} className="aw-row"
                        style={{ cursor:"pointer" }}
                        onClick={() => router.push(`/dashboard/artworks/${aw.id}`)}>

                        {/* ── LARGE IMAGE CELL (1/3 row concept) ── */}
                        <td style={{ padding:0, width:180, borderBottom:"1px solid #E0D8CA", borderRight:"1px solid #E0D8CA", verticalAlign:"top" }}>
                          <div style={{ width:180, height:130, background:st.bg, overflow:"hidden", position:"relative", flexShrink:0 }}>
                            {img
                              ? <img src={img} alt={aw.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={28} color="#d4cfc4"/></div>
                            }
                            {/* Edit overlay on hover */}
                            <Link href={`/dashboard/artworks/${aw.id}/edit`} onClick={e=>e.stopPropagation()}>
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.15s" }}
                                className="img-edit-overlay">
                                <div style={{ background:"rgba(0,0,0,0.6)", color:"#fff", padding:"4px 10px", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                                  <Edit2 size={11}/> Edit
                                </div>
                              </div>
                            </Link>
                          </div>
                        </td>

                        {/* Title */}
                        <EditableCell artwork={aw} field="title" width={180}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>
                            {aw.title}
                          </div>
                          <div style={{ fontSize:10, color:"#d4cfc4", marginTop:2 }}>double-click to edit</div>
                        </EditableCell>

                        {/* Medium */}
                        <EditableCell artwork={aw} field="medium" width={140}>
                          <div style={{ fontSize:12, color:"#5C5346", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{aw.medium||<span style={{color:"#d4cfc4"}}>—</span>}</div>
                        </EditableCell>

                        {/* Year */}
                        <EditableCell artwork={aw} field="year" width={60}>
                          <div style={{ fontSize:12, color:"#9B8F7A" }}>{aw.year||"—"}</div>
                        </EditableCell>

                        {/* Dimensions */}
                        <td style={{ padding:"10px 12px", borderBottom:"1px solid #E0D8CA", borderRight:"1px solid #E0D8CA", width:110 }}>
                          <div style={{ fontSize:11, fontFamily:"monospace", color:"#9B8F7A" }}>{dims||"—"}</div>
                        </td>

                        {/* Stage */}
                        <EditableCell artwork={aw} field="status" selectOptions={STAGES.map(s=>({key:s.key,label:s.label}))} width={110}>
                          <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", background:st.bg, border:`1.5px solid ${st.color}`, fontSize:10, fontWeight:800, color:st.color, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>
                            <div style={{ width:5, height:5, borderRadius:"50%", background:st.color }}/>{st.label}
                          </div>
                        </EditableCell>

                        {/* Price */}
                        <EditableCell artwork={aw} field="price" width={90}>
                          <div style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:"#111110" }}>
                            {aw.price ? `$${aw.price.toLocaleString()}` : <span style={{color:"#d4cfc4"}}>—</span>}
                          </div>
                        </EditableCell>

                        {/* Sale method */}
                        <EditableCell artwork={aw} field="sale_method" selectOptions={SALE_METHODS} width={110}>
                          <div style={{ fontSize:11, color:"#5C5346", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:100 }}>
                            {SALE_METHODS.find(m=>m.key===aw.sale_method)?.label || <span style={{color:"#d4cfc4"}}>—</span>}
                          </div>
                        </EditableCell>

                        {/* Venue / Visibility */}
                        <EditableCell artwork={aw} field="venue_location" width={130}>
                          <div style={{ fontSize:11, color:"#5C5346", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:110 }}>
                            {aw.venue_location||aw.location
                              ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={10}/>{aw.venue_location||aw.location}</span>
                              : <span style={{color:"#d4cfc4"}}>—</span>}
                          </div>
                        </EditableCell>

                        {/* Promotion */}
                        <td style={{ padding:"10px 12px", borderBottom:"1px solid #E0D8CA", borderRight:"none", width:80, textAlign:"center" }}
                          onClick={e=>e.stopPropagation()}>
                          <Link href={`/dashboard/artworks/${aw.id}/promotion`} style={{ textDecoration:"none" }}>
                            <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 9px", border:"1.5px solid #E0D8CA", background:"#F5F0E8", fontSize:10, fontWeight:700, color:"#9B8F7A", cursor:"pointer" }}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#FFD400";(e.currentTarget as HTMLElement).style.borderColor="#111110";(e.currentTarget as HTMLElement).style.color="#111110";}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#F5F0E8";(e.currentTarget as HTMLElement).style.borderColor="#E0D8CA";(e.currentTarget as HTMLElement).style.color="#9B8F7A";}}>
                              <Megaphone size={11}/> Plan
                            </div>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{ padding:"10px 16px", borderTop:"1px solid #E0D8CA", background:"#FAFAF8", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>{filtered.length} of {artworks.length} artworks · Double-click any cell to edit inline</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>Click row to view detail</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            KANBAN VIEW
        ════════════════════════════════════════ */}
        {tab === "kanban" && (
          <div>
            <p style={{ fontSize:12, color:"#9B8F7A", fontWeight:600, marginBottom:14 }}>
              Drag cards between columns to move artwork through the lifecycle. Click any card to view full detail.
            </p>
            <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:20, alignItems:"flex-start" }}>
              {STAGES.map(stage=>{
                const stageArtworks = filtered.filter(a=>toStageKey(a.status)===stage.key);
                const isDragTarget  = dragOver===stage.key && dragId!==null;
                const moving = isDragTarget && dragId && toStageKey(artworks.find(a=>a.id===dragId)?.status||"")!==stage.key;
                return (
                  <div key={stage.key}
                    onDragOver={e=>onDragOver(e,stage.key)}
                    onDrop={e=>onDrop(e,stage.key)}
                    onDragLeave={e=>{ if(!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                    className={moving?"aw-col-drop":""}
                    style={{ minWidth:240, width:240, flexShrink:0, background:moving?"#FFFBEA":"#FAFAF8", border:`2px solid ${moving?"#FFD400":"#E0D8CA"}`, padding:"12px 12px 4px", transition:"border-color 0.15s, background 0.15s" }}>
                    {/* Column header */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:stage.color, border:"2px solid #111110", flexShrink:0 }}/>
                      <span style={{ fontSize:11, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.1em", flex:1 }}>{stage.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", background:"#fff", border:"1px solid #E0D8CA", padding:"1px 7px", borderRadius:12 }}>{stageArtworks.length}</span>
                      <button onClick={()=>{router.push(`/dashboard/artworks/new?status=${stage.key}`);}}
                        style={{ width:22, height:22, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                        <Plus size={11}/>
                      </button>
                    </div>
                    {stageArtworks.length===0 && (
                      <div style={{ padding:"18px 0", textAlign:"center", border:"2px dashed #E0D8CA", marginBottom:10, color:"#d4cfc4", fontSize:11, fontWeight:600 }}>
                        {moving?"✓ Drop here":"Drop cards here"}
                      </div>
                    )}
                    {stageArtworks.map(aw=><KanbanCard key={aw.id} aw={aw}/>)}
                    <Link href={`/dashboard/artworks/new?status=${stage.key}`} style={{ textDecoration:"none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center", width:"100%", padding:"8px", border:"2px dashed #d4cfc4", background:"transparent", fontSize:11, fontWeight:700, color:"#9B8F7A", cursor:"pointer", marginBottom:8 }}>
                        <Plus size={11}/> Add here
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .img-edit-overlay { opacity: 0 !important; }
        tr:hover .img-edit-overlay { opacity: 1 !important; }
      `}</style>
    </>
  );
}
