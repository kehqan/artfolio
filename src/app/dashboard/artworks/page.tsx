"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ImageIcon, Edit2, Copy, DollarSign,
  Table2, Columns, Search, ChevronUp, ChevronDown,
  Frame, Layers, MoreHorizontal, Trash2, Check,
  ArrowUpDown, ExternalLink, Filter,
} from "lucide-react";

// ── Artwork lifecycle stages ──────────────────────────────────────
const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8" },
  { key: "in_progress", label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "complete",    label: "Complete",    color: "#4ECDC4", bg: "#F0FDF4" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7" },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3" },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#E5E5E5" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

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

type SortKey = "title" | "medium" | "year" | "status" | "price" | "created_at";
type SortDir = "asc" | "desc";
type ViewTab = "table" | "kanban";

const STATUS_FILTER_OPTIONS = ["All", ...STAGES.map(s => s.label)];

export default function ArtworksPage() {
  const [artworks, setArtworks]       = useState<Artwork[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<ViewTab>("table");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey]         = useState<SortKey>("created_at");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");
  const [selected, setSelected]       = useState<Artwork | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [cardMenu, setCardMenu]       = useState<string | null>(null);
  const [rowMenu, setRowMenu]         = useState<string | null>(null);

  // Drag state
  const [dragId, setDragId]           = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", medium: "", year: new Date().getFullYear(), status: "concept",
    price: "", width: "", height: "", depth: "", unit: "cm",
    framed: false, editions: "", materials_cost: "", time_spent: "", notes: "",
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
    await supabase.from("artworks").insert({
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
      notes: form.notes || null,
    });
    setShowForm(false);
    resetForm();
    setSaving(false); load();
  }

  function resetForm() {
    setForm({ title:"",medium:"",year:new Date().getFullYear(),status:"concept",price:"",width:"",height:"",depth:"",unit:"cm",framed:false,editions:"",materials_cost:"",time_spent:"",notes:"" });
  }

  async function moveToStage(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("artworks").update({ status }).eq("id", id);
    setArtworks(p => p.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(p => p ? { ...p, status } : p);
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork permanently?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
    setSelected(null); setCardMenu(null); setRowMenu(null);
  }

  async function duplicateArtwork(id: string) {
    const art = artworks.find(a => a.id === id);
    if (!art) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { id: _id, created_at: _ca, ...rest } = art as any;
    await supabase.from("artworks").insert({ ...rest, user_id: user.id, title: `${art.title} (copy)`, status: "concept" });
    setCardMenu(null); setRowMenu(null); load();
  }

  // ── Sorting ────────────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ── Filtered + sorted list ─────────────────────────────────────
  const filtered = artworks
    .filter(a => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.medium || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || STAGE_MAP[toStageKey(a.status)]?.label === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "price")      { av = a.price || 0;       bv = b.price || 0; }
      else if (sortKey === "year")  { av = a.year || 0;        bv = b.year || 0; }
      else if (sortKey === "status"){ av = toStageKey(a.status); bv = toStageKey(b.status); }
      else if (sortKey === "created_at") { av = a.created_at; bv = b.created_at; }
      else { av = (a as any)[sortKey] || ""; bv = (b as any)[sortKey] || ""; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // ── Drag & Drop ────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }
  function onDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageKey);
  }
  function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) moveToStage(id, stageKey);
    setDragId(null); setDragOver(null);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  // ── Stats ──────────────────────────────────────────────────────
  const totalValue = artworks.filter(a => a.price && toStageKey(a.status) === "available").reduce((s, a) => s + (a.price || 0), 0);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", background: "#fff",
    border: "2px solid #E0D8CA", fontSize: 13, fontFamily: "inherit",
    outline: "none", color: "#111110",
  };
  const sf = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={11} color="#d4cfc4" style={{ marginLeft: 4 }} />;
    return sortDir === "asc"
      ? <ChevronUp size={11} color="#FFD400" style={{ marginLeft: 4 }} />
      : <ChevronDown size={11} color="#FFD400" style={{ marginLeft: 4 }} />;
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800,
    color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em",
    borderBottom: "2px solid #111110", borderRight: "1px solid #E0D8CA",
    background: "#F5F0E8", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px", borderBottom: "1px solid #E0D8CA",
    borderRight: "1px solid #E0D8CA", verticalAlign: "middle", fontSize: 13,
  };

  // ── Kanban Card ────────────────────────────────────────────────
  const KanbanCard = ({ artwork }: { artwork: Artwork }) => {
    const stageKey = toStageKey(artwork.status);
    const stage    = STAGE_MAP[stageKey];
    const img      = Array.isArray(artwork.images) ? artwork.images[0] : null;
    const menuOpen = cardMenu === artwork.id;
    const dims     = [artwork.width, artwork.height, artwork.depth].filter(Boolean);
    const dimStr   = dims.length ? dims.join(" × ") + (artwork.unit ? ` ${artwork.unit}` : "") : null;
    const isDragging = dragId === artwork.id;

    return (
      <div draggable
        onDragStart={e => onDragStart(e, artwork.id)}
        onDragEnd={onDragEnd}
        style={{
          background: "#fff", border: "2px solid #111110",
          boxShadow: isDragging ? "none" : "3px 3px 0 #111110",
          opacity: isDragging ? 0.4 : 1,
          marginBottom: 10, cursor: "grab", position: "relative",
          transition: "box-shadow 0.12s, transform 0.12s, opacity 0.12s",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!isDragging) { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; } }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = isDragging ? "none" : "3px 3px 0 #111110"; }}>

        {/* Thumbnail */}
        <div onClick={() => setSelected(artwork)} style={{ position: "relative", aspectRatio: "4/3", background: stage.bg, overflow: "hidden", cursor: "pointer" }}>
          {img
            ? <img src={img} alt={artwork.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon size={24} color="#d4cfc4" />
              </div>
          }
          {/* Status pill */}
          <div style={{ position: "absolute", top: 7, left: 7, padding: "2px 7px", background: stage.color, fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: stageKey === "sold" ? "#FFD400" : "#fff", border: "1.5px solid rgba(0,0,0,0.15)" }}>
            {stage.label}
          </div>
          {/* Icon badges */}
          <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 3 }}>
            {artwork.framed && (
              <div style={{ width: 20, height: 20, background: "rgba(255,255,255,0.92)", border: "1.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Frame size={10} color="#111110" />
              </div>
            )}
            {(artwork.editions || 0) > 1 && (
              <div style={{ width: 20, height: 20, background: "rgba(255,255,255,0.92)", border: "1.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={10} color="#111110" />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div onClick={() => setSelected(artwork)} style={{ padding: "9px 12px 6px", cursor: "pointer" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{artwork.title}</div>
          {artwork.medium && <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artwork.medium}</div>}
          {dimStr && <div style={{ fontSize: 10, fontWeight: 500, color: "#d4cfc4", marginTop: 2 }}>{dimStr}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px 10px" }}>
          {artwork.price && !["concept", "in_progress"].includes(stageKey)
            ? <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 800, color: "#111110" }}>${artwork.price.toLocaleString()}</span>
            : <span />
          }
          {/* 3-dot menu */}
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setCardMenu(menuOpen ? null : artwork.id); }}
              style={{ width: 26, height: 26, border: "1.5px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", bottom: "calc(100% + 4px)", right: 0, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 30, minWidth: 160, overflow: "hidden" }}
                onClick={e => e.stopPropagation()}>
                {[
                  { label: "View detail", icon: ExternalLink, action: () => { setSelected(artwork); setCardMenu(null); } },
                  { label: "Mark as sold",  icon: DollarSign,   action: () => { moveToStage(artwork.id, "sold"); setCardMenu(null); } },
                  { label: "Duplicate",     icon: Copy,         action: () => duplicateArtwork(artwork.id) },
                  { label: "Delete",        icon: Trash2,       action: () => deleteArtwork(artwork.id), danger: true },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", borderBottom: "1px solid #F5F0E8", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: item.danger ? "#FF6B6B" : "#111110", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = item.danger ? "#FFF5F5" : "#FFFBEA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <item.icon size={12} /> {item.label}
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
        * { box-sizing: border-box; }
        .aw-row:hover td { background: #FFFBEA !important; }
        .aw-col-drop { border-color: #FFD400 !important; background: #FFFBEA !important; }
        .aw-th-hover:hover { background: #FFFBEA !important; color: #111110 !important; }
      `}</style>

      {/* Close menus on outside click */}
      {(cardMenu || rowMenu) && <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => { setCardMenu(null); setRowMenu(null); }} />}

      <div>
        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0 }}>Artworks</h1>
            <p style={{ fontSize: 13, color: "#9B8F7A", margin: "4px 0 0" }}>
              {artworks.length} works · {artworks.filter(a => toStageKey(a.status) === "available").length} available · ${totalValue.toLocaleString()} inventory value
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", border: "2px solid #111110", overflow: "hidden" }}>
              <button onClick={() => setTab("table")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "none", borderRight: "1px solid #E0D8CA", background: tab === "table" ? "#111110" : "#fff", color: tab === "table" ? "#FFD400" : "#111110", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                <Table2 size={13} /> Table
              </button>
              <button onClick={() => setTab("kanban")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "none", background: tab === "kanban" ? "#111110" : "#fff", color: tab === "kanban" ? "#FFD400" : "#111110", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                <Columns size={13} /> Kanban
              </button>
            </div>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #111110", padding: "0 10px", background: "#fff", height: 34 }}>
              <Search size={12} color="#9B8F7A" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ border: "none", outline: "none", fontSize: 12, fontFamily: "inherit", background: "transparent", width: 140, color: "#111110" }} />
            </div>
            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ height: 34, padding: "0 10px", border: "2px solid #111110", background: "#fff", fontSize: 11, fontWeight: 700, color: "#111110", cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
              {STATUS_FILTER_OPTIONS.map(o => <option key={o} value={o}>{o === "All" ? "All stages" : o}</option>)}
            </select>
            {/* Add */}
            <button onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#FFD400", border: "2px solid #111110", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "2px 2px 0 #111110", whiteSpace: "nowrap" }}>
              <Plus size={14} strokeWidth={3} /> Add Artwork
            </button>
          </div>
        </div>

        {/* Stage count pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {STAGES.map(stage => {
            const count = artworks.filter(a => toStageKey(a.status) === stage.key).length;
            const active = statusFilter === stage.label;
            return (
              <button key={stage.key} onClick={() => setStatusFilter(active ? "All" : stage.label)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", border: `2px solid ${active ? stage.color : "#E0D8CA"}`, background: active ? stage.bg : "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#111110" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: stage.color }} />
                {stage.label} <span style={{ color: "#9B8F7A" }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════
            TABLE VIEW
        ═══════════════════════════════════════════════════════ */}
        {tab === "table" && (
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    {/* Thumb */}
                    <th style={{ ...thStyle, width: 60, cursor: "default" }}></th>
                    {/* Title */}
                    <th className="aw-th-hover" style={thStyle} onClick={() => toggleSort("title")}>
                      <div style={{ display: "flex", alignItems: "center" }}>Title <SortIcon k="title" /></div>
                    </th>
                    {/* Medium */}
                    <th className="aw-th-hover" style={thStyle} onClick={() => toggleSort("medium")}>
                      <div style={{ display: "flex", alignItems: "center" }}>Medium <SortIcon k="medium" /></div>
                    </th>
                    {/* Year */}
                    <th className="aw-th-hover" style={{ ...thStyle, width: 70 }} onClick={() => toggleSort("year")}>
                      <div style={{ display: "flex", alignItems: "center" }}>Year <SortIcon k="year" /></div>
                    </th>
                    {/* Dimensions */}
                    <th style={{ ...thStyle, cursor: "default", width: 130 }}>Dimensions</th>
                    {/* Status */}
                    <th className="aw-th-hover" style={{ ...thStyle, width: 110 }} onClick={() => toggleSort("status")}>
                      <div style={{ display: "flex", alignItems: "center" }}>Stage <SortIcon k="status" /></div>
                    </th>
                    {/* Price */}
                    <th className="aw-th-hover" style={{ ...thStyle, width: 100 }} onClick={() => toggleSort("price")}>
                      <div style={{ display: "flex", alignItems: "center" }}>Price <SortIcon k="price" /></div>
                    </th>
                    {/* Extras */}
                    <th style={{ ...thStyle, cursor: "default", width: 90 }}>Details</th>
                    {/* Actions */}
                    <th style={{ ...thStyle, cursor: "default", width: 50, borderRight: "none" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Quick add row */}
                  <tr style={{ background: "#FAFAF8" }}>
                    <td style={{ ...tdStyle, width: 60, background: "#FAFAF8" }}>
                      <div style={{ width: 40, height: 32, background: "#F0EBE1", border: "1.5px dashed #d4cfc4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Plus size={12} color="#d4cfc4" />
                      </div>
                    </td>
                    <td colSpan={7} style={{ ...tdStyle, background: "#FAFAF8" }}>
                      <button onClick={() => setShowForm(true)}
                        style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                        + Add new artwork…
                      </button>
                    </td>
                    <td style={{ ...tdStyle, borderRight: "none", background: "#FAFAF8" }} />
                  </tr>

                  {loading ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9B8F7A", borderRight: "none" }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9B8F7A", borderRight: "none" }}>
                      {search || statusFilter !== "All" ? "No artworks match your filters" : "No artworks yet — add your first one above"}
                    </td></tr>
                  ) : filtered.map(aw => {
                    const stageKey = toStageKey(aw.status);
                    const stage    = STAGE_MAP[stageKey];
                    const img      = Array.isArray(aw.images) ? aw.images[0] : null;
                    const dims     = [aw.width, aw.height, aw.depth].filter(Boolean);
                    const dimStr   = dims.length ? dims.join(" × ") + (aw.unit ? ` ${aw.unit}` : "") : "—";
                    const menuOpen = rowMenu === aw.id;

                    return (
                      <tr key={aw.id} className="aw-row" style={{ cursor: "pointer" }} onClick={() => setSelected(aw)}>
                        {/* Thumb */}
                        <td style={{ ...tdStyle, width: 60, padding: "8px 10px" }}>
                          <div style={{ width: 44, height: 36, background: stage.bg, overflow: "hidden", flexShrink: 0, border: "1px solid #E0D8CA" }}>
                            {img
                              ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={14} color="#d4cfc4" /></div>
                            }
                          </div>
                        </td>
                        {/* Title */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{aw.title}</div>
                        </td>
                        {/* Medium */}
                        <td style={{ ...tdStyle, color: "#5C5346" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{aw.medium || "—"}</div>
                        </td>
                        {/* Year */}
                        <td style={{ ...tdStyle, color: "#9B8F7A", width: 70 }}>{aw.year || "—"}</td>
                        {/* Dimensions */}
                        <td style={{ ...tdStyle, fontSize: 12, fontFamily: "monospace", color: "#9B8F7A", width: 130 }}>{dimStr}</td>
                        {/* Stage */}
                        <td style={{ ...tdStyle, width: 110 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: stage.bg, border: `1.5px solid ${stage.color}`, fontSize: 10, fontWeight: 800, color: stage.color, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: stage.color }} />
                            {stage.label}
                          </div>
                        </td>
                        {/* Price */}
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 700, color: "#111110", width: 100 }}>
                          {aw.price ? `$${aw.price.toLocaleString()}` : "—"}
                        </td>
                        {/* Details icons */}
                        <td style={{ ...tdStyle, width: 90 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {aw.framed && <div title="Framed" style={{ width: 22, height: 22, background: "#F5F0E8", border: "1px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center" }}><Frame size={11} color="#9B8F7A" /></div>}
                            {(aw.editions || 0) > 1 && <div title={`${aw.editions} editions`} style={{ width: 22, height: 22, background: "#F5F0E8", border: "1px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center" }}><Layers size={11} color="#9B8F7A" /></div>}
                          </div>
                        </td>
                        {/* Row actions */}
                        <td style={{ ...tdStyle, borderRight: "none", width: 50, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                          <div style={{ position: "relative" }}>
                            <button onClick={e => { e.stopPropagation(); setRowMenu(menuOpen ? null : aw.id); }}
                              style={{ width: 28, height: 28, border: "1.5px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpen && (
                              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 30, minWidth: 160, overflow: "hidden" }}>
                                {[
                                  { label: "View detail",  icon: ExternalLink, action: () => { setSelected(aw); setRowMenu(null); } },
                                  { label: "Mark as sold", icon: DollarSign,   action: () => { moveToStage(aw.id, "sold"); setRowMenu(null); } },
                                  { label: "Duplicate",    icon: Copy,         action: () => duplicateArtwork(aw.id) },
                                  { label: "Delete",       icon: Trash2,       action: () => deleteArtwork(aw.id), danger: true },
                                ].map(item => (
                                  <button key={item.label} onClick={item.action}
                                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", borderBottom: "1px solid #F5F0E8", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: (item as any).danger ? "#FF6B6B" : "#111110", textAlign: "left" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = (item as any).danger ? "#FFF5F5" : "#FFFBEA")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                    <item.icon size={12} /> {item.label}
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
            <div style={{ padding: "10px 16px", borderTop: "1px solid #E0D8CA", background: "#FAFAF8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>{filtered.length} of {artworks.length} artworks</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>Click any row to view detail</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            KANBAN VIEW
        ═══════════════════════════════════════════════════════ */}
        {tab === "kanban" && (
          <div>
            <p style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 14 }}>
              Drag cards between columns to move artworks through their lifecycle. Click any card to view details.
            </p>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 20, alignItems: "flex-start" }}>
              {STAGES.map(stage => {
                const stageArtworks = filtered.filter(a => toStageKey(a.status) === stage.key);
                const isDragTarget  = dragOver === stage.key && dragId !== null;
                const isDraggingOver = isDragTarget && dragId && toStageKey(artworks.find(a=>a.id===dragId)?.status||"") !== stage.key;

                return (
                  <div key={stage.key}
                    onDragOver={e => onDragOver(e, stage.key)}
                    onDrop={e => onDrop(e, stage.key)}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                    }}
                    className={isDraggingOver ? "aw-col-drop" : ""}
                    style={{
                      minWidth: 240, width: 240, flexShrink: 0,
                      background: isDraggingOver ? "#FFFBEA" : "#FAFAF8",
                      border: `2px solid ${isDraggingOver ? "#FFD400" : "#E0D8CA"}`,
                      padding: "12px 12px 4px",
                      transition: "border-color 0.15s, background 0.15s",
                    }}>
                    {/* Column header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color, border: "2px solid #111110", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 900, color: "#111110", textTransform: "uppercase", letterSpacing: "0.1em", flex: 1 }}>{stage.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", background: "#fff", border: "1px solid #E0D8CA", padding: "1px 7px", borderRadius: 12 }}>{stageArtworks.length}</span>
                      <button onClick={() => { setShowForm(true); setForm(p => ({ ...p, status: stage.key })); }}
                        style={{ width: 22, height: 22, border: "1.5px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Drop zone hint when empty */}
                    {stageArtworks.length === 0 && (
                      <div style={{ padding: "18px 0", textAlign: "center", border: "2px dashed #E0D8CA", marginBottom: 10, color: "#d4cfc4", fontSize: 11, fontWeight: 600 }}>
                        {isDraggingOver ? "✓ Drop here" : "Drop cards here"}
                      </div>
                    )}

                    {/* Cards */}
                    {stageArtworks.map(aw => <KanbanCard key={aw.id} artwork={aw} />)}

                    {/* Add in column */}
                    <button onClick={() => { setShowForm(true); setForm(p => ({ ...p, status: stage.key })); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", width: "100%", padding: "8px", border: "2px dashed #d4cfc4", background: "transparent", fontSize: 11, fontWeight: 700, color: "#9B8F7A", cursor: "pointer", marginBottom: 8 }}>
                      <Plus size={11} /> Add here
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ARTWORK DETAIL MODAL
        ═══════════════════════════════════════════════════════ */}
        {selected && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setSelected(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "#fff", border: "2px solid #111110", boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "2px solid #111110", background: "#FFFBEA", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_MAP[toStageKey(selected.status)]?.color, border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9B8F7A" }}>{STAGE_MAP[toStageKey(selected.status)]?.label}</span>
                  <span style={{ fontSize: 10, color: "#d4cfc4", fontWeight: 600 }}>· Added {new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => deleteArtwork(selected.id)} style={{ width: 30, height: 30, border: "1.5px solid #FF6B6B", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Trash2 size={12} color="#FF6B6B" />
                  </button>
                  <button onClick={() => duplicateArtwork(selected.id)} style={{ width: 30, height: 30, border: "1.5px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Copy size={12} color="#9B8F7A" />
                  </button>
                  <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, border: "1.5px solid #E0D8CA", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
                {/* Image panel */}
                {Array.isArray(selected.images) && selected.images[0] && (
                  <div style={{ width: 240, flexShrink: 0, borderRight: "2px solid #111110", background: "#F5F0E8", overflow: "hidden" }}>
                    <img src={selected.images[0]} alt={selected.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}

                {/* Detail panel */}
                <div style={{ flex: 1, padding: "20px 22px", overflowY: "auto" }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 4 }}>{selected.title}</h2>
                  {selected.year && <div style={{ fontSize: 12, color: "#9B8F7A", marginBottom: 18, fontWeight: 600 }}>{selected.year}</div>}

                  {/* Stage change */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Move to stage</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {STAGES.map(s => {
                        const active = toStageKey(selected.status) === s.key;
                        return (
                          <button key={s.key} onClick={() => moveToStage(selected.id, s.key)}
                            style={{ padding: "4px 10px", border: `2px solid ${active ? s.color : "#E0D8CA"}`, background: active ? s.color : "#fff", fontSize: 10, fontWeight: 800, color: active && s.key === "sold" ? "#FFD400" : active ? "#fff" : "#9B8F7A", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.1s" }}>
                            {active && "✓ "}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metadata grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                      ["Medium",          selected.medium],
                      ["Price",           selected.price ? `$${selected.price.toLocaleString()}` : null],
                      ["Dimensions",      [selected.width, selected.height, selected.depth].filter(Boolean).join(" × ") + (selected.unit && [selected.width, selected.height, selected.depth].some(Boolean) ? ` ${selected.unit}` : "")],
                      ["Framed",          selected.framed ? "Yes" : null],
                      ["Editions",        selected.editions ? String(selected.editions) : null],
                      ["Time spent",      selected.time_spent ? `${selected.time_spent} hours` : null],
                      ["Materials cost",  selected.materials_cost ? `$${selected.materials_cost}` : null],
                      ["Profit (est.)",   selected.price && selected.materials_cost ? `$${(selected.price - selected.materials_cost).toLocaleString()}` : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} style={{ background: "#F5F0E8", padding: "8px 12px" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {selected.notes && (
                    <div style={{ background: "#FFFBEA", border: "1px solid #E0D8CA", padding: "10px 14px", marginBottom: 16 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Notes</div>
                      <p style={{ fontSize: 13, color: "#5C5346", lineHeight: 1.7, margin: 0 }}>{selected.notes}</p>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { moveToStage(selected.id, "sold"); }}
                      style={{ flex: 1, padding: "10px", border: "2px solid #111110", background: "#111110", color: "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <DollarSign size={13} /> Mark as Sold
                    </button>
                    <button onClick={() => duplicateArtwork(selected.id)}
                      style={{ padding: "10px 16px", border: "2px solid #E0D8CA", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <Copy size={13} /> Duplicate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ADD ARTWORK FORM MODAL
        ═══════════════════════════════════════════════════════ */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "#fff", border: "2px solid #111110", boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "2px solid #111110", background: "#FFD400", flexShrink: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: 0 }}>New Artwork</h2>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
              </div>

              <form onSubmit={saveArtwork} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Title *</label>
                  <input required value={form.title} onChange={sf("title")} placeholder="Artwork title" style={inputStyle}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Stage</label>
                    <select value={form.status} onChange={sf("status")} style={{ ...inputStyle, cursor: "pointer" }}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Year</label>
                    <input type="number" value={form.year} onChange={sf("year")} style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Medium</label>
                  <input value={form.medium} onChange={sf("medium")} placeholder="Oil on canvas, Acrylic, Watercolor…" style={inputStyle}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Dimensions</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", gap: 8 }}>
                    {[["width","W"],["height","H"],["depth","D"]].map(([k,p]) => (
                      <input key={k} type="number" value={(form as any)[k]} onChange={sf(k)} placeholder={p} style={inputStyle}
                        onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                    ))}
                    <select value={form.unit} onChange={sf("unit")} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="cm">cm</option><option value="in">in</option><option value="mm">mm</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Price ($)</label>
                    <input type="number" value={form.price} onChange={sf("price")} placeholder="0" style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Editions</label>
                    <input type="number" value={form.editions} onChange={sf("editions")} placeholder="1" style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Materials cost ($)</label>
                    <input type="number" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0" style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Time spent (hrs)</label>
                    <input type="number" value={form.time_spent} onChange={sf("time_spent")} placeholder="0" style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F5F0E8" }}>
                  <input type="checkbox" id="framed" checked={form.framed} onChange={sf("framed")} style={{ width: 16, height: 16, accentColor: "#FFD400" }} />
                  <label htmlFor="framed" style={{ fontSize: 13, fontWeight: 700, color: "#111110", cursor: "pointer" }}>This artwork is framed</label>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Notes</label>
                  <textarea rows={3} value={form.notes} onChange={sf("notes")} placeholder="Materials, technique, story, storage location…"
                    style={{ ...inputStyle, resize: "vertical" }} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", border: "2px solid #111110", background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: "11px", border: "2px solid #111110", background: "#FFD400", color: "#111110", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
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
