"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, X, LayoutGrid, List, ImageIcon,
  Package, Tag, TrendingUp, ChevronUp, ChevronDown,
  ArrowUpDown, Edit2, Trash2, Copy, MoreHorizontal,
  Check, PencilLine,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  width_cm?: number; height_cm?: number; depth_cm?: number;
  price?: number; currency?: string; status: string; images?: string[];
  framed?: boolean; editions?: number; materials_cost?: number;
  time_spent?: number; notes?: string; sale_method?: string;
  venue_location?: string; location?: string;
  created_at: string; updated_at?: string;
};
type SortKey  = "title" | "medium" | "year" | "status" | "price" | "created_at";
type SortDir  = "asc" | "desc";
type ViewMode = "grid" | "table";
type EditCell = { id: string; field: string } | null;

// ── Stage config ───────────────────────────────────────────────
const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8",
    grad: "135deg, #57534E 0%, #9B8F7A 60%, #D4C9A8 100%" },
  { key: "in_progress", label: "In Progress", color: "#7C3AED", bg: "#EDE9FE",
    grad: "135deg, #4C1D95 0%, #7C3AED 55%, #A78BFA 100%" },
  { key: "complete",    label: "Complete",    color: "#0EA5E9", bg: "#E0F2FE",
    grad: "135deg, #075985 0%, #0EA5E9 55%, #38BDF8 100%" },
  { key: "available",   label: "Available",   color: "#16A34A", bg: "#DCFCE7",
    grad: "135deg, #14532D 0%, #16A34A 55%, #4ADE80 100%" },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3",
    grad: "135deg, #713F12 0%, #CA8A04 55%, #FDE047 100%" },
  { key: "sold",        label: "Sold",        color: "#111110", bg: "#E5E5E5",
    grad: "135deg, #000 0%, #374151 55%, #6B7280 100%" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

function toStageKey(status: string | null | undefined) {
  const s = String(status || "").toLowerCase().replace(/ /g, "_");
  return STAGE_MAP[s] ? s : "available";
}

// ── Shared table styles (Ripe standard) ───────────────────────
const TH: React.CSSProperties = {
  padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 800,
  color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".13em",
  background: "#F5F0E8", borderBottom: "2px solid #E8E0D0",
  whiteSpace: "nowrap", userSelect: "none", cursor: "pointer",
};
const TD: React.CSSProperties = {
  padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#111110",
  borderBottom: "1px solid #F0EAE0", verticalAlign: "middle",
};

// ── Status pill ────────────────────────────────────────────────
function StatusPill({ stageKey }: { stageKey: string }) {
  const st = STAGE_MAP[stageKey] || STAGE_MAP["available"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: st.bg, color: st.color, borderRadius: 9999, border: `1.5px solid ${st.color}40`, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
      {st.label}
    </span>
  );
}

// ── SortTh ─────────────────────────────────────────────────────
function SortTh({ k, label, sortKey, sortDir, onSort }: { k: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th onClick={() => onSort(k)} style={{ ...TH, color: active ? "#111110" : "#9B8F7A" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {active ? sortDir === "asc" ? <ChevronUp size={11} color="#FFD400" /> : <ChevronDown size={11} color="#FFD400" /> : <ArrowUpDown size={10} color="#D4C9A8" />}
      </span>
    </th>
  );
}

// ══════════════════════════════════════════════════════════════
// ARTWORK CARD — Ripe × liquid glass standard
// ══════════════════════════════════════════════════════════════
function ArtworkCard({ aw, onEdit, onDelete, onDuplicate }: {
  aw: Artwork;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [hov, setHov]       = useState(false);
  const [menu, setMenu]     = useState(false);
  const sk  = toStageKey(aw.status);
  const st  = STAGE_MAP[sk];
  const img = Array.isArray(aw.images) ? aw.images[0] : null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMenu(false); }}
      style={{
        background: "#fff",
        border: `2.5px solid ${hov ? "#111110" : "#E8E0D0"}`,
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        boxShadow: hov ? "5px 6px 0 #111110" : "3px 4px 0 #D4C9A8",
        transform: hov ? "translate(-2px,-3px)" : "none",
        transition: "all .25s cubic-bezier(.16,1,.3,1)",
      }}
    >
      {/* ── Hero image (200px unified height) ── */}
      <Link href={`/dashboard/artworks/${aw.id}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ height: 200, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          {img ? (
            <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", transform: hov ? "scale(1.04)" : "scale(1)", transition: "transform .5s cubic-bezier(.16,1,.3,1)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(${st.grad})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImageIcon size={40} color="rgba(255,255,255,0.3)" />
            </div>
          )}

          {/* Dark gradient overlay (for text readability) */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)" }} />

          {/* Liquid glass status badge — top left */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: 9, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: ".1em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
            {st.label}
          </div>

          {/* Price badge — top right (liquid glass) */}
          {aw.price && (
            <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 9px", borderRadius: 9999, background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: 11, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>
              ${aw.price.toLocaleString()}
            </div>
          )}

          {/* Title overlaid on image */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px 11px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>{aw.title}</div>
            {(aw.medium || aw.year) && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600, marginTop: 2 }}>
                {[aw.medium, aw.year].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ── Footer ── */}
      <div style={{ padding: "10px 12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          {aw.medium && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", background: "#F5F0E8", padding: "2px 8px", borderRadius: 99, border: "1px solid #E8E0D0", whiteSpace: "nowrap" }}>{aw.medium}</span>
          )}
          {aw.year && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>{aw.year}</span>
          )}
        </div>

        {/* ⋯ menu */}
        <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenu(p => !p)}
            style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#111110"; (e.currentTarget as HTMLElement).style.background = "#FFD400"; }}
            onMouseLeave={e => { if (!menu) { (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; (e.currentTarget as HTMLElement).style.background = "#FAF7F3"; } }}>
            <MoreHorizontal size={13} color="#9B8F7A" />
          </button>
          {menu && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", right: 0, background: "#fff", border: "2px solid #111110", borderRadius: 12, boxShadow: "4px 5px 0 #111110", zIndex: 50, minWidth: 140, overflow: "hidden", padding: 4 }}>
              {[
                { label: "Edit", icon: Edit2, fn: onEdit },
                { label: "Duplicate", icon: Copy, fn: onDuplicate },
                { label: "Delete", icon: Trash2, fn: onDelete, danger: true },
              ].map(item => (
                <button key={item.label} onClick={() => { item.fn(); setMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: item.danger ? "#EF4444" : "#111110", fontFamily: "inherit", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = item.danger ? "#FEF2F2" : "#FFFBEA")}
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
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ArtworksPage() {
  const router = useRouter();
  const [artworks,    setArtworks]    = useState<Artwork[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState<ViewMode>("grid");
  const [search,      setSearch]      = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortKey,     setSortKey]     = useState<SortKey>("created_at");
  const [sortDir,     setSortDir]     = useState<SortDir>("desc");
  const [editMode,    setEditMode]    = useState(false);
  const [editCell,    setEditCell]    = useState<EditCell>(null);
  const [editValue,   setEditValue]   = useState("");
  const [savingCell,  setSavingCell]  = useState(false);
  const [rowMenu,     setRowMenu]     = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (editCell) setTimeout(() => editInputRef.current?.focus(), 30); }, [editCell]);

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
    const val = numFields.includes(editCell.field) ? (editValue === "" ? null : Number(editValue)) : editValue || null;
    await sb.from("artworks").update({ [editCell.field]: val }).eq("id", editCell.id);
    setArtworks(p => p.map(a => a.id === editCell.id ? { ...a, [editCell.field]: val } : a));
    setEditCell(null); setSavingCell(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this artwork permanently?")) return;
    const sb = createClient();
    await sb.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
  }

  async function handleDuplicate(aw: Artwork) {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { id, created_at, updated_at, ...rest } = aw;
    await sb.from("artworks").insert({ ...rest, user_id: user.id, title: `${aw.title} (copy)`, status: "concept" });
    load();
  }

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  // ── Stats
  const availableCount = artworks.filter(a => String(a.status).toLowerCase() === "available").length;
  const soldCount      = artworks.filter(a => String(a.status).toLowerCase() === "sold").length;
  const totalValue     = artworks.filter(a => a.price).reduce((s, a) => s + (a.price || 0), 0);

  // ── Filter + sort
  const filtered = artworks
    .filter(a => {
      if (stageFilter !== "All" && toStageKey(a.status) !== stageFilter) return false;
      if (search) { const q = search.toLowerCase(); return a.title?.toLowerCase().includes(q) || a.medium?.toLowerCase().includes(q); }
      return true;
    })
    .sort((a, b) => {
      const av = (a as any)[sortKey] ?? ""; const bv = (b as any)[sortKey] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  // ── Inline-edit cell renderer (table view)
  function EditableCell({ aw, field, children }: { aw: Artwork; field: string; children: React.ReactNode }) {
    const isEditing = editCell?.id === aw.id && editCell?.field === field;
    if (!editMode) return <td style={TD}>{children}</td>;
    if (isEditing) {
      if (field === "status") {
        return (
          <td style={{ ...TD, padding: 6 }}>
            <select ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit} style={{ width: "100%", padding: "5px 8px", border: "2px solid #FFD400", borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 700, outline: "none" }}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </td>
        );
      }
      return (
        <td style={{ ...TD, padding: 6 }}>
          <input ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
            style={{ width: "100%", padding: "5px 8px", border: "2px solid #FFD400", borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 700, outline: "none" }} />
        </td>
      );
    }
    return (
      <td style={{ ...TD, cursor: "text", background: "#FFFEF8" }} onClick={e => { e.stopPropagation(); setEditCell({ id: aw.id, field }); setEditValue(String((aw as any)[field] ?? "")); }}>
        {children}
      </td>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Darker Grotesque', system-ui, sans-serif; }

        .aw-search { display:flex; align-items:center; gap:8px; background:#fff; border:2px solid #E8E0D0; border-radius:11px; padding:0 12px; height:38px; flex:1; min-width:160px; max-width:260px; transition:border-color .15s; }
        .aw-search:focus-within { border-color:#FFD400; box-shadow:0 0 0 3px rgba(255,212,0,.14); }
        .aw-search-input { flex:1; border:none; outline:none; font-family:inherit; font-size:13px; font-weight:600; color:#111110; background:transparent; }
        .aw-search-input::placeholder { color:#C0B8A8; }

        .aw-filter-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:99px; border:2px solid #E8E0D0; background:#fff; font-size:12px; font-weight:700; color:#9B8F7A; cursor:pointer; transition:all .12s; white-space:nowrap; font-family:inherit; }
        .aw-filter-btn:hover { border-color:#111110; color:#111110; }
        .aw-filter-btn.active { background:#111110; border-color:#111110; color:#FFD400; }

        .ripe-table-wrap { background:#fff; border:2.5px solid #111110; border-radius:18px; overflow:hidden; box-shadow:4px 5px 0 #D4C9A8; margin-bottom:8px; overflow-x:auto; }
        .ripe-table { width:100%; border-collapse:collapse; min-width:760px; }
        .ripe-row { cursor:pointer; transition:background .1s; }
        .ripe-row:hover td { background:#FFFBEA !important; }
        .ripe-row:last-child td { border-bottom:none !important; }

        .ripe-menu-btn { width:28px; height:28px; border-radius:8px; border:1.5px solid #E8E0D0; background:#FAF7F3; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .12s; }
        .ripe-menu-btn:hover { border-color:#111110; background:#FFD400; }
        .ripe-dropdown { position:absolute; top:calc(100% + 4px); right:0; background:#fff; border:2px solid #111110; border-radius:12px; box-shadow:4px 5px 0 #111110; z-index:50; min-width:140px; overflow:hidden; padding:4px; }
        .ripe-dropdown-item { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; border:none; border-radius:8px; background:none; cursor:pointer; font-size:13px; font-weight:600; color:#111110; font-family:inherit; text-align:left; transition:background .1s; }
        .ripe-dropdown-item:hover { background:#FFFBEA; }
        .ripe-dropdown-item.danger { color:#EF4444; }
        .ripe-dropdown-item.danger:hover { background:#FEF2F2; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .aw-card-enter { animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both; }

        /* ── RESPONSIVE ── */
        @media (max-width: 640px) {
          .aw-toolbar { flex-wrap: wrap !important; gap: 8px !important; }
          .aw-filters { flex-wrap: wrap !important; gap: 6px !important; }
          .aw-search { max-width: 100% !important; flex: 1 1 100% !important; }
          .aw-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .aw-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .aw-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .aw-header-actions { width: 100%; display: flex; gap: 8px; }
          .aw-header-actions a, .aw-header-actions button { flex: 1; justify-content: center !important; }
        }
        @media (max-width: 420px) {
          .aw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="aw-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 3 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FFD400", border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}><ImageIcon size={16} color="#111110" /></div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-.6px", margin: 0 }}>Artworks</h1>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", margin: 0 }}>{artworks.length} works · {availableCount} available · {soldCount} sold</p>
        </div>
        <div className="aw-header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110", transition: "all .15s", fontFamily: "inherit", color: "#111110" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <Plus size={14} strokeWidth={3} /> Add Artwork
            </button>
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="aw-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Works",  value: artworks.length,                  icon: Package,    color: "#8B5CF6", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED" },
          { label: "Available",    value: availableCount,                   icon: Tag,        color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A" },
          { label: "Sold",         value: soldCount,                        icon: Check,      color: "#111110", bg: "#E5E5E5", grad: "135deg,#000,#374151" },
          { label: "Inventory",    value: `$${totalValue.toLocaleString()}`, icon: TrendingUp, color: "#D97706", bg: "#FEF9C3", grad: "135deg,#713F12,#D97706" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, overflow: "hidden", boxShadow: "2px 3px 0 #E0D8CA" }}>
            <div style={{ height: 4, background: `linear-gradient(${s.grad})` }} />
            <div style={{ padding: "13px 15px", display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={15} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-.4px", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="aw-toolbar" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {/* Search */}
        <div className="aw-search">
          <Search size={13} color="#9B8F7A" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artworks…" className="aw-search-input" />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", display: "flex", padding: 0 }}><X size={12} /></button>}
        </div>

        {/* Stage filters */}
        <div className="aw-filters" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setStageFilter("All")} className={`aw-filter-btn${stageFilter === "All" ? " active" : ""}`}>All <span style={{ opacity: .6, fontSize: 10 }}>({artworks.length})</span></button>
          {STAGES.map(s => {
            const count = artworks.filter(a => toStageKey(a.status) === s.key).length;
            if (count === 0) return null;
            return (
              <button key={s.key} onClick={() => setStageFilter(s.key)} className={`aw-filter-btn${stageFilter === s.key ? " active" : ""}`}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                {s.label} <span style={{ opacity: .6, fontSize: 10 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {/* Edit cells — table only */}
          {view === "table" && (
            <button onClick={() => { setEditMode(p => !p); setEditCell(null); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", border: "2px solid", borderColor: editMode ? "#111110" : "#E8E0D0", borderRadius: 10, background: editMode ? "#FFD400" : "#fff", color: "#111110", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: editMode ? "2px 2px 0 #111110" : "none", transition: "all .12s" }}>
              <PencilLine size={13} /> {editMode ? "Done" : "Edit cells"}
            </button>
          )}

          {/* Sort — grid only */}
          {view === "grid" && (
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              style={{ height: 38, padding: "0 12px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, color: "#111110", cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
              <option value="created_at">Newest first</option>
              <option value="title">Title A→Z</option>
              <option value="year">Year</option>
              <option value="price">Price</option>
              <option value="status">Stage</option>
            </select>
          )}

          {/* View toggle */}
          <div style={{ display: "flex", border: "2px solid #111110", borderRadius: 11, overflow: "hidden" }}>
            <button onClick={() => setView("grid")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "none", borderRight: "1px solid #E8E0D0", background: view === "grid" ? "#111110" : "#fff", color: view === "grid" ? "#FFD400" : "#9B8F7A", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <LayoutGrid size={13} /> Grid
            </button>
            <button onClick={() => setView("table")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "none", background: view === "table" ? "#111110" : "#fff", color: view === "table" ? "#FFD400" : "#9B8F7A", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <List size={13} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* ── LOADING SKELETONS ── */}
      {loading && (
        <div className="aw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ borderRadius: 20, background: "#F5F0E8", border: "2px solid #E8E0D0", overflow: "hidden", height: 260, animation: `fadeUp .3s ease both`, animationDelay: `${i*.05}s` }}>
              <div style={{ height: 200, background: "linear-gradient(135deg, #E8E0D0, #F5F0E8)" }} />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ height: 12, borderRadius: 6, background: "#E8E0D0", width: "70%", marginBottom: 6 }} />
                <div style={{ height: 10, borderRadius: 6, background: "#F0EAE0", width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 40px", background: "#fff", borderRadius: 20, border: "2px solid #E8E0D0", boxShadow: "3px 4px 0 #E0D8CA" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🥭</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-.5px", marginBottom: 8 }}>
            {search || stageFilter !== "All" ? "No artworks match your filters" : "Your inventory is empty"}
          </div>
          <div style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600, marginBottom: 28 }}>
            {search || stageFilter !== "All" ? "Try clearing your filters." : "Add your first artwork to get started."}
          </div>
          {!search && stageFilter === "All" && (
            <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 24px", background: "#FFD400", border: "2px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>
                <Plus size={16} strokeWidth={3} /> Add first artwork
              </button>
            </Link>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════════════════════ */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div className="aw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
          {/* Add card */}
          <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
            <div style={{ borderRadius: 20, border: "2px dashed #C0B8A8", background: "#FAF7F3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, height: 280, cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#111110"; el.style.background = "#FFF7E0"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#C0B8A8"; el.style.background = "#FAF7F3"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
                <Plus size={20} strokeWidth={3} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Add artwork</span>
            </div>
          </Link>

          {filtered.map((aw, i) => (
            <div key={aw.id} className="aw-card-enter" style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
              <ArtworkCard
                aw={aw}
                onEdit={() => router.push(`/dashboard/artworks/${aw.id}/edit`)}
                onDelete={() => handleDelete(aw.id)}
                onDuplicate={() => handleDuplicate(aw)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TABLE VIEW — Ripe standard
      ══════════════════════════════════════════════════════ */}
      {!loading && filtered.length > 0 && view === "table" && (
        <>
          {/* Edit mode banner */}
          {editMode && (
            <div style={{ padding: "10px 16px", background: "#FFD400", border: "2px solid #111110", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800 }}>
                <PencilLine size={14} /> Click any highlighted cell to edit inline
              </div>
              <button onClick={() => { setEditMode(false); setEditCell(null); }}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "2px solid #111110", borderRadius: 8, background: "#111110", color: "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                <Check size={12} /> Done
              </button>
            </div>
          )}

          <div className="ripe-table-wrap">
            <table className="ripe-table">
              <thead>
                <tr>
                  <th style={{ ...TH, width: 52, cursor: "default" }}>Image</th>
                  <SortTh k="title"      label="Title"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="medium"     label="Medium"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="year"       label="Year"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="price"      label="Price"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="status"     label="Stage"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="created_at" label="Added"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th style={{ ...TH, width: 44, cursor: "default" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(aw => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  const sk = toStageKey(aw.status);
                  const st = STAGE_MAP[sk];
                  return (
                    <tr key={aw.id} className="ripe-row" onClick={() => router.push(`/dashboard/artworks/${aw.id}`)}>

                      {/* Thumbnail */}
                      <td style={{ ...TD, padding: "8px 10px", width: 52 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, overflow: "hidden", border: "1.5px solid #E8E0D0", flexShrink: 0, background: img ? "#000" : `linear-gradient(${st.grad})` }}>
                          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={13} color="rgba(255,255,255,0.5)" /></div>}
                        </div>
                      </td>

                      {/* Title */}
                      <EditableCell aw={aw} field="title">
                        <div style={{ fontWeight: 800, color: "#111110", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                      </EditableCell>

                      {/* Medium */}
                      <EditableCell aw={aw} field="medium">
                        <span style={{ color: "#9B8F7A", fontSize: 12 }}>{aw.medium || "—"}</span>
                      </EditableCell>

                      {/* Year */}
                      <EditableCell aw={aw} field="year">
                        <span style={{ color: "#9B8F7A", fontSize: 12 }}>{aw.year || "—"}</span>
                      </EditableCell>

                      {/* Price */}
                      <EditableCell aw={aw} field="price">
                        <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: aw.price ? "#111110" : "#D4C9A8" }}>
                          {aw.price ? `$${aw.price.toLocaleString()}` : "—"}
                        </span>
                      </EditableCell>

                      {/* Stage */}
                      <EditableCell aw={aw} field="status">
                        <StatusPill stageKey={sk} />
                      </EditableCell>

                      {/* Added */}
                      <td style={{ ...TD, fontSize: 12, color: "#9B8F7A" }}>
                        {new Date(aw.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>

                      {/* Actions */}
                      <td style={{ ...TD, padding: "11px 10px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setRowMenu(rowMenu === aw.id ? null : aw.id)} className="ripe-menu-btn">
                            <MoreHorizontal size={14} color="#9B8F7A" />
                          </button>
                          {rowMenu === aw.id && (
                            <div className="ripe-dropdown">
                              {[
                                { label: "View",      icon: ImageIcon, fn: () => { router.push(`/dashboard/artworks/${aw.id}`); setRowMenu(null); } },
                                { label: "Edit",      icon: Edit2,     fn: () => { router.push(`/dashboard/artworks/${aw.id}/edit`); setRowMenu(null); } },
                                { label: "Duplicate", icon: Copy,      fn: () => { handleDuplicate(aw); setRowMenu(null); } },
                                { label: "Delete",    icon: Trash2,    fn: () => { handleDelete(aw.id); setRowMenu(null); }, danger: true },
                              ].map(item => (
                                <button key={item.label} onClick={item.fn} className={`ripe-dropdown-item${(item as any).danger ? " danger" : ""}`}>
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
        </>
      )}
    </>
  );
}
