"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus, X, ImageIcon, Edit2, Copy, DollarSign,
  LayoutGrid, Columns, Search, Filter, ChevronDown,
  Frame, Layers, BookOpen, Clock, TrendingUp,
  MoreHorizontal, Check, Trash2, ArrowRight, Upload,
} from "lucide-react";

// ── Artwork lifecycle stages ──────────────────────────────────────
const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8", desc: "Ideas & planning"    },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE", desc: "Currently working"   },
  { key: "complete",    label: "Complete",    color: "#4ECDC4", bg: "#F0FDF4", desc: "Finished, not listed" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7", desc: "For sale"             },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3", desc: "On hold for buyer"    },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#F5F0E8", desc: "Sold & delivered"     },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

// Normalise DB status → stage key
function toStageKey(status: string | null | undefined): string {
  const s = String(status || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[s] ? s : "concept";
}

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  width?: number; height?: number; depth?: number; unit?: string;
  price?: number; status: string; images?: string[];
  framed?: boolean; editions?: number; materials_cost?: number;
  time_spent?: number; notes?: string; created_at: string;
};

type ViewMode = "kanban" | "grid";

export default function ArtworksPage() {
  const [artworks, setArtworks]         = useState<Artwork[]>([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState<ViewMode>("kanban");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<Artwork | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [dragId, setDragId]             = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [cardMenu, setCardMenu]         = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", medium: "", year: new Date().getFullYear(), status: "concept",
    price: "", width: "", height: "", depth: "", unit: "cm",
    framed: false, editions: "", materials_cost: "", time_spent: "",
    notes: "", images: [] as string[],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setArtworks(data || []);
    setLoading(false);
  }

  async function saveArtwork(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      user_id: user.id, title: form.title, medium: form.medium || null,
      year: Number(form.year) || null, status: form.status,
      price: form.price ? Number(form.price) : null,
      width: form.width ? Number(form.width) : null,
      height: form.height ? Number(form.height) : null,
      depth: form.depth ? Number(form.depth) : null,
      unit: form.unit, framed: form.framed,
      editions: form.editions ? Number(form.editions) : null,
      materials_cost: form.materials_cost ? Number(form.materials_cost) : null,
      time_spent: form.time_spent ? Number(form.time_spent) : null,
      notes: form.notes || null, images: form.images,
    };
    await supabase.from("artworks").insert(payload);
    setShowForm(false);
    setForm({ title:"",medium:"",year:new Date().getFullYear(),status:"concept",price:"",width:"",height:"",depth:"",unit:"cm",framed:false,editions:"",materials_cost:"",time_spent:"",notes:"",images:[] });
    setSaving(false); load();
  }

  async function moveToStage(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("artworks").update({ status }).eq("id", id);
    setArtworks(p => p.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(p => p ? { ...p, status } : p);
  }

  async function markSold(id: string) {
    await moveToStage(id, "sold");
    setCardMenu(null);
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
    setSelected(null); setCardMenu(null);
  }

  async function duplicateArtwork(id: string) {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { id: _id, created_at: _ca, ...rest } = art as any;
    await supabase.from("artworks").insert({ ...rest, user_id: user.id, title: `${art.title} (copy)`, status: "concept" });
    setCardMenu(null); load();
  }

  // Drag and drop
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault(); setDragOver(stageKey);
  }
  function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    if (dragId) moveToStage(dragId, stageKey);
    setDragId(null); setDragOver(null);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  const filtered = artworks.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.medium || "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalValue = artworks.filter(a => a.price && toStageKey(a.status) === "available").reduce((s, a) => s + (a.price || 0), 0);
  const soldCount  = artworks.filter(a => toStageKey(a.status) === "sold").length;

  const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 12px", background:"#fff", border:"2px solid #E0D8CA", fontSize:13, fontFamily:"inherit", outline:"none", color:"#111110" };
  const sf = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm(p => ({ ...p, [k]: e.target.type==="checkbox" ? e.target.checked : e.target.value }));

  // ── Artwork Card ──────────────────────────────────────────────
  const ArtworkCard = ({ artwork }: { artwork: Artwork }) => {
    const stageKey = toStageKey(artwork.status);
    const stage    = STAGE_MAP[stageKey];
    const img      = Array.isArray(artwork.images) ? artwork.images[0] : null;
    const menuOpen = cardMenu === artwork.id;

    const dims = [artwork.width, artwork.height, artwork.depth].filter(Boolean);
    const dimStr = dims.length ? dims.join(" × ") + (artwork.unit ? ` ${artwork.unit}` : "") : null;

    return (
      <div draggable
        onDragStart={e => onDragStart(e, artwork.id)}
        onDragEnd={onDragEnd}
        style={{ background:"#fff", border:"2px solid #111110", boxShadow: dragId===artwork.id ? "none" : "3px 3px 0 #111110", opacity: dragId===artwork.id ? 0.5 : 1, marginBottom:10, cursor:"grab", position:"relative", transition:"transform 0.12s, box-shadow 0.12s", userSelect:"none" }}
        onMouseEnter={e => { if(dragId!==artwork.id) { (e.currentTarget as HTMLElement).style.transform="translate(-1px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; }}}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=""; (e.currentTarget as HTMLElement).style.boxShadow=dragId===artwork.id?"none":"3px 3px 0 #111110"; }}>

        {/* Image */}
        <div onClick={() => setSelected(artwork)} style={{ position:"relative", aspectRatio:"4/3", background:stage.bg, overflow:"hidden", cursor:"pointer" }}>
          {img
            ? <img src={img} alt={artwork.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ImageIcon size={28} color="#d4cfc4" />
              </div>
          }
          {/* Status badge */}
          <div style={{ position:"absolute", top:8, left:8, padding:"2px 8px", background: stage.color, border:"1.5px solid #111110", fontSize:8, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.12em", color: stageKey==="sold" ? "#FFD400" : "#fff" }}>
            {stage.label}
          </div>
          {/* Quick icons top right */}
          <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:4 }}>
            {artwork.framed && (
              <div style={{ width:20, height:20, background:"rgba(255,255,255,0.9)", border:"1.5px solid #111110", display:"flex", alignItems:"center", justifyContent:"center" }} title="Framed">
                <Frame size={10} color="#111110" />
              </div>
            )}
            {artwork.editions && artwork.editions > 1 && (
              <div style={{ width:20, height:20, background:"rgba(255,255,255,0.9)", border:"1.5px solid #111110", display:"flex", alignItems:"center", justifyContent:"center" }} title={`${artwork.editions} editions`}>
                <Layers size={10} color="#111110" />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div onClick={() => setSelected(artwork)} style={{ padding:"10px 12px 8px", cursor:"pointer" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#111110", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{artwork.title}</div>
          {artwork.medium && <div style={{ fontSize:10, fontWeight:600, color:"#9B8F7A", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{artwork.medium}</div>}
          {dimStr && <div style={{ fontSize:10, fontWeight:600, color:"#d4cfc4" }}>{dimStr}</div>}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px 10px" }}>
          {artwork.price && toStageKey(artwork.status) !== "concept" && toStageKey(artwork.status) !== "in_progress"
            ? <span style={{ fontSize:13, fontFamily:"monospace", fontWeight:800, color:"#111110" }}>${artwork.price.toLocaleString()}</span>
            : <span />
          }
          {/* 3-dot menu */}
          <div style={{ position:"relative" }}>
            <button onClick={e => { e.stopPropagation(); setCardMenu(menuOpen ? null : artwork.id); }}
              style={{ width:26, height:26, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 4px)", right:0, background:"#fff", border:"2px solid #111110", boxShadow:"4px 4px 0 #111110", zIndex:20, minWidth:160, overflow:"hidden" }}
                onClick={e => e.stopPropagation()}>
                <button onClick={() => { setSelected(artwork); setCardMenu(null); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:"#111110", borderBottom:"1px solid #F5F0E8" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                  onMouseLeave={e => (e.currentTarget.style.background="none")}>
                  <Edit2 size={12} /> View & Edit
                </button>
                <button onClick={() => { markSold(artwork.id); }}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:"#111110", borderBottom:"1px solid #F5F0E8" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                  onMouseLeave={e => (e.currentTarget.style.background="none")}>
                  <DollarSign size={12} /> Mark as Sold
                </button>
                <button onClick={() => duplicateArtwork(artwork.id)}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:"#111110", borderBottom:"1px solid #F5F0E8" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                  onMouseLeave={e => (e.currentTarget.style.background="none")}>
                  <Copy size={12} /> Duplicate
                </button>
                <button onClick={() => deleteArtwork(artwork.id)}
                  style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:"#FF6B6B" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#FFF5F5")}
                  onMouseLeave={e => (e.currentTarget.style.background="none")}>
                  <Trash2 size={12} /> Delete
                </button>
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
        .aw-col-drop{background:#FFFBEA!important;border-color:#FFD400!important;}
        .aw-grid-card:hover{transform:translate(-1px,-2px);box-shadow:5px 5px 0 #111110!important;}
      `}</style>

      {/* ── Close card menu on outside click ── */}
      {cardMenu && <div style={{ position:"fixed", inset:0, zIndex:9 }} onClick={() => setCardMenu(null)} />}

      <div>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0 }}>Artworks</h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0" }}>
              {artworks.length} works · {artworks.filter(a => toStageKey(a.status)==="available").length} available · ${totalValue.toLocaleString()} inventory value
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* View toggle */}
            <div style={{ display:"flex", border:"2px solid #111110", overflow:"hidden" }}>
              <button onClick={() => setView("kanban")} style={{ width:36, height:34, border:"none", borderRight:"1px solid #E0D8CA", background:view==="kanban"?"#111110":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Columns size={14} color={view==="kanban"?"#FFD400":"#111110"} />
              </button>
              <button onClick={() => setView("grid")} style={{ width:36, height:34, border:"none", background:view==="grid"?"#111110":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <LayoutGrid size={14} color={view==="grid"?"#FFD400":"#111110"} />
              </button>
            </div>
            {/* Search */}
            <div style={{ display:"flex", alignItems:"center", gap:6, border:"2px solid #111110", padding:"0 10px", background:"#fff", height:34 }}>
              <Search size={12} color="#9B8F7A" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artworks…"
                style={{ border:"none", outline:"none", fontSize:12, fontFamily:"inherit", background:"transparent", width:160, color:"#111110" }} />
            </div>
            {/* Add */}
            <button onClick={() => setShowForm(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110" }}>
              <Plus size={14} strokeWidth={3} /> Add Artwork
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {STAGES.map(stage => {
            const count = filtered.filter(a => toStageKey(a.status) === stage.key).length;
            return (
              <div key={stage.key} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}
                onClick={() => setSearch(stage.label)}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stage.color, border:"1.5px solid #111110" }} />
                {stage.label} <span style={{ color:"#9B8F7A" }}>({count})</span>
              </div>
            );
          })}
          {search && <button onClick={() => setSearch("")} style={{ padding:"5px 10px", border:"2px solid #FF6B6B", background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#FF6B6B" }}>✕ Clear</button>}
        </div>

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:20, alignItems:"flex-start" }}>
            {STAGES.map(stage => {
              const stageArtworks = filtered.filter(a => toStageKey(a.status) === stage.key);
              const isDragTarget  = dragOver === stage.key;
              return (
                <div key={stage.key}
                  onDragOver={e => onDragOver(e, stage.key)}
                  onDrop={e => onDrop(e, stage.key)}
                  onDragLeave={() => setDragOver(null)}
                  className={isDragTarget ? "aw-col-drop" : ""}
                  style={{ minWidth:240, width:240, flexShrink:0, background: isDragTarget ? "#FFFBEA" : "#FAFAF8", border:`2px solid ${isDragTarget ? "#FFD400" : "#E0D8CA"}`, padding:"12px 12px 4px", transition:"border-color 0.15s, background 0.15s" }}>

                  {/* Column header */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:stage.color, border:"2px solid #111110", flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.1em", flex:1 }}>{stage.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", background:"#fff", border:"1px solid #E0D8CA", padding:"1px 7px", borderRadius:12 }}>{stageArtworks.length}</span>
                    <button onClick={() => { setShowForm(true); setForm(p => ({...p, status:stage.key})); }}
                      style={{ width:22, height:22, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Cards */}
                  {stageArtworks.length === 0
                    ? <div style={{ padding:"20px 0", textAlign:"center", color:"#d4cfc4", fontSize:11, fontWeight:600, borderStyle:"dashed", borderWidth:2, borderColor:"#E0D8CA", background:"transparent", marginBottom:10 }}>
                        Drop here
                      </div>
                    : stageArtworks.map(aw => <ArtworkCard key={aw.id} artwork={aw} />)
                  }

                  {/* Add in column */}
                  <button onClick={() => { setShowForm(true); setForm(p => ({...p, status:stage.key})); }}
                    style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center", width:"100%", padding:"9px", border:"2px dashed #d4cfc4", background:"transparent", fontSize:11, fontWeight:700, color:"#9B8F7A", cursor:"pointer", marginBottom:8 }}>
                    <Plus size={12} /> Add here
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {view === "grid" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14 }}>
            {filtered.map(aw => {
              const stageKey = toStageKey(aw.status);
              const stage    = STAGE_MAP[stageKey];
              const img      = Array.isArray(aw.images) ? aw.images[0] : null;
              return (
                <div key={aw.id} className="aw-grid-card"
                  style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", cursor:"pointer", transition:"transform 0.12s, box-shadow 0.12s", overflow:"hidden" }}
                  onClick={() => setSelected(aw)}>
                  <div style={{ aspectRatio:"1/1", background:stage.bg, position:"relative" }}>
                    {img
                      ? <img src={img} alt={aw.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={28} color="#d4cfc4" /></div>
                    }
                    <div style={{ position:"absolute", top:8, left:8, padding:"2px 7px", background:stage.color, fontSize:8, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.1em", color: stageKey==="sold"?"#FFD400":"#fff" }}>
                      {stage.label}
                    </div>
                  </div>
                  <div style={{ padding:"10px 12px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw.title}</div>
                    <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw.medium || "—"}</div>
                    {aw.price && <div style={{ fontSize:12, fontFamily:"monospace", fontWeight:800, color:"#111110", marginTop:4 }}>${aw.price.toLocaleString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:"60px 24px", textAlign:"center", border:"2px dashed #E0D8CA" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎨</div>
            <div style={{ fontSize:16, fontWeight:900, color:"#111110", marginBottom:6 }}>{search ? "No artworks found" : "Your studio awaits"}</div>
            <div style={{ fontSize:13, color:"#9B8F7A", marginBottom:20 }}>{search ? `No results for "${search}"` : "Add your first artwork to start tracking your inventory"}</div>
            {!search && (
              <button onClick={() => setShowForm(true)} style={{ padding:"12px 24px", border:"2px solid #111110", background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                + Add First Artwork
              </button>
            )}
          </div>
        )}

        {/* ── ARTWORK DETAIL MODAL ── */}
        {selected && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setSelected(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>
              {/* Modal header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"2px solid #111110", background:"#FFFBEA", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:STAGE_MAP[toStageKey(selected.status)]?.color, border:"1.5px solid #111110" }} />
                  <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color:"#9B8F7A" }}>{STAGE_MAP[toStageKey(selected.status)]?.label}</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => deleteArtwork(selected.id)} style={{ width:30, height:30, border:"1.5px solid #FF6B6B", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <Trash2 size={12} color="#FF6B6B" />
                  </button>
                  <button onClick={() => setSelected(null)} style={{ width:30, height:30, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
                {/* Image panel */}
                {Array.isArray(selected.images) && selected.images[0] && (
                  <div style={{ width:220, flexShrink:0, borderRight:"2px solid #111110" }}>
                    <img src={selected.images[0]} alt={selected.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  </div>
                )}

                {/* Detail panel */}
                <div style={{ flex:1, padding:20, overflowY:"auto" }}>
                  <h2 style={{ fontSize:20, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", marginBottom:4 }}>{selected.title}</h2>
                  {selected.year && <div style={{ fontSize:12, color:"#9B8F7A", marginBottom:16 }}>{selected.year}</div>}

                  {/* Change stage */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Stage</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {STAGES.map(s => (
                        <button key={s.key} onClick={() => moveToStage(selected.id, s.key)}
                          style={{ padding:"4px 10px", border:`2px solid ${toStageKey(selected.status)===s.key ? s.color : "#E0D8CA"}`, background: toStageKey(selected.status)===s.key ? s.color : "#fff", fontSize:10, fontWeight:800, color: toStageKey(selected.status)===s.key && s.key==="sold" ? "#FFD400" : toStageKey(selected.status)===s.key ? "#fff" : "#9B8F7A", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {[
                      ["Medium",     selected.medium],
                      ["Price",      selected.price ? `$${selected.price.toLocaleString()}` : null],
                      ["Dimensions", [selected.width, selected.height, selected.depth].filter(Boolean).join(" × ") + (selected.unit ? ` ${selected.unit}` : "")],
                      ["Framed",     selected.framed ? "Yes" : "No"],
                      ["Editions",   selected.editions ? String(selected.editions) : null],
                      ["Time spent", selected.time_spent ? `${selected.time_spent}h` : null],
                      ["Materials cost", selected.materials_cost ? `$${selected.materials_cost}` : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} style={{ background:"#F5F0E8", padding:"8px 12px" }}>
                        <div style={{ fontSize:9, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>{k}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {selected.notes && (
                    <div style={{ background:"#FFFBEA", border:"1px solid #E0D8CA", padding:"10px 14px" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Notes</div>
                      <p style={{ fontSize:13, color:"#5C5346", lineHeight:1.6, margin:0 }}>{selected.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:"flex", gap:8, marginTop:16 }}>
                    <button onClick={() => markSold(selected.id)}
                      style={{ flex:1, padding:"10px", border:"2px solid #111110", background:"#111110", color:"#FFD400", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <DollarSign size={13} /> Mark as Sold
                    </button>
                    <button onClick={() => duplicateArtwork(selected.id)}
                      style={{ padding:"10px 14px", border:"2px solid #E0D8CA", background:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                      <Copy size={13} /> Duplicate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD ARTWORK FORM ── */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110", background:"#FFD400", flexShrink:0 }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", margin:0 }}>New Artwork</h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18} /></button>
              </div>
              <form onSubmit={saveArtwork} style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>

                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Title *</label>
                  <input required value={form.title} onChange={sf("title")} placeholder="Artwork title"
                    style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Stage</label>
                    <select value={form.status} onChange={sf("status")} style={{ ...inputStyle, cursor:"pointer" }}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Year</label>
                    <input type="number" value={form.year} onChange={sf("year")} style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Medium</label>
                  <input value={form.medium} onChange={sf("medium")} placeholder="Oil on canvas, Watercolor, etc."
                    style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                {/* Dimensions */}
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Dimensions</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 80px", gap:8 }}>
                    {[["width","W"],["height","H"],["depth","D"]].map(([k,p]) => (
                      <input key={k} type="number" value={(form as any)[k]} onChange={sf(k)} placeholder={p}
                        style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                    ))}
                    <select value={form.unit} onChange={sf("unit")} style={{ ...inputStyle, cursor:"pointer" }}>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Price ($)</label>
                    <input type="number" value={form.price} onChange={sf("price")} placeholder="0"
                      style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Editions</label>
                    <input type="number" value={form.editions} onChange={sf("editions")} placeholder="1"
                      style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Materials cost ($)</label>
                    <input type="number" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0"
                      style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Time spent (hours)</label>
                    <input type="number" value={form.time_spent} onChange={sf("time_spent")} placeholder="0"
                      style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#F5F0E8" }}>
                  <input type="checkbox" id="framed" checked={form.framed} onChange={sf("framed")} style={{ width:16, height:16, accentColor:"#FFD400" }} />
                  <label htmlFor="framed" style={{ fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer" }}>This artwork is framed</label>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={sf("notes")} placeholder="Materials used, technique, story behind the work…"
                    style={{ ...inputStyle, resize:"vertical" }} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#FFD400", color:"#111110", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                    {saving ? "Saving…" : "Add Artwork"}
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
