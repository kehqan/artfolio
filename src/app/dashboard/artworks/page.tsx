"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, LayoutGrid, List, ImageIcon,
  ChevronUp, ChevronDown, ArrowUpDown, Edit2, Trash2, Copy,
  Check, PencilLine,
} from "lucide-react";
import {
  Badge, Button, ButtonLink, Card, Chip, EmptyState, Menu, Modal,
  PageHeader, SearchField, Select, Skeleton, StatTile, Tabs, cn,
} from "@/components/ui";
import { STAGES, STAGE_MAP, toStageKey, formatPrice } from "@/lib/artwork-stage";

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

// ── Table cell styles ──────────────────────────────────────────
const TH = "whitespace-nowrap border-b-hair border-line bg-sunken px-3.5 py-2.5 text-left font-ui text-caption font-semibold uppercase tracking-[0.06em] text-fg-3";
const TD = "border-b-hair border-line px-3.5 py-3 align-middle font-ui text-body-sm text-fg";

function dims(aw: Artwork) {
  if (!aw.width_cm || !aw.height_cm) return null;
  return `${aw.width_cm} × ${aw.height_cm}${aw.depth_cm ? ` × ${aw.depth_cm}` : ""} cm`;
}

// ── Sortable header cell ───────────────────────────────────────
function SortTh({ k, label, sortKey, sortDir, onSort }: { k: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className={TH} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 uppercase hover:text-fg", active && "text-fg")}>
        {label}
        {active
          ? sortDir === "asc" ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />
          : <ArrowUpDown size={12} aria-hidden className="text-n-400" />}
      </button>
    </th>
  );
}

// ── Image or quiet placeholder ─────────────────────────────────
function ArtImage({ src, alt, className, iconSize = 28 }: { src: string | null; alt: string; className?: string; iconSize?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
  }
  return (
    <div className={cn("grid h-full w-full place-items-center bg-sunken text-n-400", className)}>
      <ImageIcon size={iconSize} aria-hidden />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ARTWORK CARD: image clean on top, details below
// ══════════════════════════════════════════════════════════════
function ArtworkCard({ aw, onEdit, onDelete, onDuplicate }: {
  aw: Artwork;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const st  = STAGE_MAP[toStageKey(aw.status)];
  const img = Array.isArray(aw.images) ? aw.images[0] : null;
  const price = formatPrice(aw.price, aw.currency);
  const meta = [aw.medium, dims(aw), aw.year].filter(Boolean).join(" · ");

  return (
    <Card interactive padding="none" className="group flex h-full flex-col">
      <Link href={`/dashboard/artworks/${aw.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
          <ArtImage src={img} alt={aw.title} className="transition-transform duration-base ease-out group-hover:scale-[1.03]" />
          <Badge tone={st.tone} dot className="absolute left-2.5 top-2.5">
            {st.label}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 px-4 pt-3.5">
          <h3 className="truncate font-display text-h3 text-fg">{aw.title}</h3>
          {meta && <p className="truncate font-ui text-label text-fg-3">{meta}</p>}
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 pb-3.5 pt-2.5">
        <span className={cn("font-ui text-body font-bold tabular-nums", price ? "text-fg" : "text-fg-3 font-medium text-label")}>
          {price ?? "No price yet"}
        </span>
        <Menu
          label={`Actions for ${aw.title}`}
          placement="top"
          items={[
            { label: "Edit", icon: Edit2, onSelect: onEdit },
            { label: "Duplicate", icon: Copy, onSelect: onDuplicate },
            { label: "Delete", icon: Trash2, onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </Card>
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
  const [toDelete,    setToDelete]    = useState<Artwork | null>(null);
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

  const filtering = Boolean(search) || stageFilter !== "All";

  // ── Inline-edit cell renderer (table view)
  function EditableCell({ aw, field, children }: { aw: Artwork; field: string; children: React.ReactNode }) {
    const isEditing = editCell?.id === aw.id && editCell?.field === field;
    if (!editMode) return <td className={TD}>{children}</td>;
    const cellInput = "h-8 w-full rounded-chip border-hair border-ink bg-surface px-2 font-ui text-body-sm text-fg shadow-hard-1 outline-none";
    if (isEditing) {
      if (field === "status") {
        return (
          <td className={cn(TD, "py-1.5")}>
            <select ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} className={cellInput} aria-label="Stage">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </td>
        );
      }
      return (
        <td className={cn(TD, "py-1.5")}>
          <input ref={editInputRef as any} value={editValue} onChange={e => setEditValue(e.target.value)} aria-label={field}
            onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
            className={cellInput} />
        </td>
      );
    }
    return (
      <td className={cn(TD, "cursor-text hover:bg-mango-soft")} onClick={e => { e.stopPropagation(); setEditCell({ id: aw.id, field }); setEditValue(String((aw as any)[field] ?? "")); }}>
        {children}
      </td>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-ui">
      {/* ── HEADER ── */}
      <PageHeader
        title="Artworks"
        description={`${artworks.length} works · ${availableCount} available · ${soldCount} sold`}
        actions={
          <ButtonLink href="/dashboard/artworks/new" variant="primary">
            <Plus size={16} aria-hidden /> Add artwork
          </ButtonLink>
        }
      />

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total works" value={artworks.length} />
        <StatTile label="Available" value={availableCount} />
        <StatTile label="Sold" value={soldCount} />
        <StatTile label="Inventory value" value={formatPrice(totalValue) ?? "$0"} />
      </div>

      {/* ── TOOLBAR ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField value={search} onChange={setSearch} placeholder="Search by title or medium" className="min-w-[200px] flex-1 sm:max-w-[320px]" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {view === "table" && (
              <Button size="sm" variant={editMode ? "primary" : "secondary"} onClick={() => { setEditMode(p => !p); setEditCell(null); }}>
                {editMode ? <Check size={15} aria-hidden /> : <PencilLine size={15} aria-hidden />}
                {editMode ? "Done editing" : "Edit cells"}
              </Button>
            )}
            {view === "grid" && (
              <div className="w-40">
              <Select aria-label="Sort artworks" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
                <option value="created_at">Newest first</option>
                <option value="title">Title A–Z</option>
                <option value="year">Year</option>
                <option value="price">Price</option>
                <option value="status">Stage</option>
              </Select>
              </div>
            )}
            <Tabs<ViewMode>
              label="View"
              value={view}
              onChange={setView}
              items={[{ value: "grid", label: "Grid" }, { value: "table", label: "Table" }]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stage">
          <Chip selected={stageFilter === "All"} onClick={() => setStageFilter("All")}>
            All <span className="tabular-nums opacity-60">{artworks.length}</span>
          </Chip>
          {STAGES.map(s => {
            const count = artworks.filter(a => toStageKey(a.status) === s.key).length;
            if (count === 0) return null;
            return (
              <Chip key={s.key} selected={stageFilter === s.key} onClick={() => setStageFilter(s.key)}>
                {s.label} <span className="tabular-nums opacity-60">{count}</span>
              </Chip>
            );
          })}
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} padding="none">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── EMPTY ── */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<ImageIcon size={22} aria-hidden />}
          title={filtering ? "No artworks match these filters" : "Your inventory is empty"}
          description={filtering
            ? "Try another search, or show all stages."
            : "Add your first artwork with its photos, size and price. You can keep it private until it's ready."}
          action={filtering
            ? <Button size="sm" onClick={() => { setSearch(""); setStageFilter("All"); }}>Clear filters</Button>
            : <ButtonLink href="/dashboard/artworks/new" variant="primary" size="sm"><Plus size={15} aria-hidden /> Add first artwork</ButtonLink>}
        />
      )}

      {/* ── GRID VIEW ── */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(aw => (
            <ArtworkCard
              key={aw.id}
              aw={aw}
              onEdit={() => router.push(`/dashboard/artworks/${aw.id}/edit`)}
              onDelete={() => setToDelete(aw)}
              onDuplicate={() => handleDuplicate(aw)}
            />
          ))}
          <Link
            href="/dashboard/artworks/new"
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-card border-outline border-dashed border-line-strong text-fg-3 transition-colors duration-fast hover:border-ink hover:text-fg"
          >
            <span className="grid h-11 w-11 place-items-center rounded-control border-outline border-ink bg-mango text-on-mango shadow-hard-1">
              <Plus size={20} aria-hidden />
            </span>
            <span className="font-ui text-label font-semibold">Add artwork</span>
          </Link>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!loading && filtered.length > 0 && view === "table" && (
        <div className="flex flex-col gap-3">
          {editMode && (
            <div className="flex items-center gap-2 rounded-control bg-mango-soft px-4 py-2.5 font-ui text-body-sm text-fg">
              <PencilLine size={15} aria-hidden /> Click a cell to edit it. Press Enter to save or Esc to cancel.
            </div>
          )}

          <div className="overflow-x-auto rounded-card border-hair border-line bg-surface">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(TH, "w-14")}><span className="sr-only">Image</span></th>
                  <SortTh k="title"      label="Title"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="medium"     label="Medium" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="year"       label="Year"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="price"      label="Price"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh k="status"     label="Stage"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className={TH}>Location</th>
                  <SortTh k="created_at" label="Added"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className={cn(TH, "w-12")}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(aw => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  const st = STAGE_MAP[toStageKey(aw.status)];
                  const price = formatPrice(aw.price, aw.currency);
                  const loc = aw.venue_location || aw.location;
                  return (
                    <tr key={aw.id} className="cursor-pointer transition-colors duration-fast hover:bg-sunken [&:last-child>td]:border-b-0" onClick={() => router.push(`/dashboard/artworks/${aw.id}`)}>
                      <td className={cn(TD, "py-2")}>
                        <div className="h-10 w-10 overflow-hidden rounded-chip border-hair border-line">
                          <ArtImage src={img} alt="" iconSize={15} />
                        </div>
                      </td>
                      <EditableCell aw={aw} field="title">
                        <span className="block max-w-[220px] truncate font-semibold">{aw.title}</span>
                      </EditableCell>
                      <EditableCell aw={aw} field="medium">
                        <span className="text-fg-2">{aw.medium || "—"}</span>
                      </EditableCell>
                      <EditableCell aw={aw} field="year">
                        <span className="tabular-nums text-fg-2">{aw.year || "—"}</span>
                      </EditableCell>
                      <EditableCell aw={aw} field="price">
                        <span className={cn("tabular-nums", price ? "font-semibold" : "text-fg-3")}>{price ?? "—"}</span>
                      </EditableCell>
                      <EditableCell aw={aw} field="status">
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </EditableCell>
                      <td className={cn(TD, "max-w-[180px] text-fg-2")}>
                        {loc ? <span className="block truncate" title={loc}>{loc}</span> : <span className="text-fg-3">—</span>}
                      </td>
                      <td className={cn(TD, "whitespace-nowrap tabular-nums text-fg-2")}>
                        {new Date(aw.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className={cn(TD, "py-2")} onClick={e => e.stopPropagation()}>
                        <Menu
                          label={`Actions for ${aw.title}`}
                          items={[
                            { label: "View", icon: ImageIcon, onSelect: () => router.push(`/dashboard/artworks/${aw.id}`) },
                            { label: "Edit", icon: Edit2, onSelect: () => router.push(`/dashboard/artworks/${aw.id}/edit`) },
                            { label: "Duplicate", icon: Copy, onSelect: () => handleDuplicate(aw) },
                            { label: "Delete", icon: Trash2, onSelect: () => setToDelete(aw), danger: true },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION ── */}
      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete this artwork?"
        description={toDelete ? `"${toDelete.title}" and its details will be removed for good. This can't be undone.` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => { if (toDelete) handleDelete(toDelete.id); setToDelete(null); }}>
              Delete artwork
            </Button>
          </>
        }
      />
    </div>
  );
}
