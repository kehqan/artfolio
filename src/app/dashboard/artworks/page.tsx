"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, SlidersHorizontal, X, ArrowUpDown,
  ChevronLeft, ChevronRight, ImageIcon,
} from "lucide-react";

type Artwork = {
  id: string;
  title: string;
  medium?: string;
  year?: number;
  dimensions?: string;
  price?: number;
  status: string;
  images?: string[];
  location?: string;
  sale_method?: string;
  created_at: string;
};

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  available:      { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  Available:      { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  sold:           { label: "Sold",         bg: "#111110", color: "#FFD400" },
  Sold:           { label: "Sold",         bg: "#111110", color: "#FFD400" },
  reserved:       { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  Reserved:       { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  "not for sale": { label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "Not for Sale": { label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "in storage":   { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
  "In Storage":   { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
};

const SALE_METHOD_CFG: Record<string, { label: string; icon: string; color: string }> = {
  "direct":          { label: "Direct Purchase", icon: "🛒", color: "#166534" },
  "inquiry":         { label: "Inquiry Only",    icon: "✉️", color: "#854D0E" },
  "price_on_request":{ label: "Price on Request",icon: "💬", color: "#0C4A6E" },
  "auction":         { label: "Auction",         icon: "🔨", color: "#6B21A8" },
  "not_for_sale":    { label: "Not for Sale",    icon: "🚫", color: "#374151" },
};

const PAGE_SIZE  = 10;
const STATUSES   = ["All", "Available", "Sold", "Reserved", "Not for Sale", "In Storage"];

export default function ArtworksPage() {
  const [artworks, setArtworks]   = useState<Artwork[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [sortCol, setSortCol]     = useState<keyof Artwork>("created_at");
  const [sortAsc, setSortAsc]     = useState(false);
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("artworks")
        .select("id, title, medium, year, dimensions, price, status, images, location, sale_method, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setArtworks((data as Artwork[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} artwork(s)?`)) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().in("id", Array.from(selected));
    setArtworks(p => p.filter(a => !selected.has(a.id)));
    setSelected(new Set());
  }

  const filtered = artworks
    .filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || a.title?.toLowerCase().includes(q)
        || a.medium?.toLowerCase().includes(q)
        || a.location?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All"
        || a.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col: keyof Artwork) {
    if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }
  function toggleAll() {
    setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(a => a.id)));
  }
  function toggleOne(id: string) {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const TH = ({ col, label }: { col: keyof Artwork; label: string }) => (
    <th onClick={() => toggleSort(col)} style={{
      padding: "11px 14px", textAlign: "left", whiteSpace: "nowrap",
      fontSize: 10, fontWeight: 800, textTransform: "uppercase",
      letterSpacing: "0.12em", color: "#9B8F7A",
      borderBottom: "2px solid #111110", cursor: "pointer",
      userSelect: "none", background: "#F5F0E8",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        <ArrowUpDown size={10} style={{ opacity: sortCol === col ? 1 : 0.3, color: sortCol === col ? "#FFD400" : "inherit" }} />
      </span>
    </th>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CFG[status] ?? { label: status, bg: "#F5F0E8", color: "#5C5346" };
    return (
      <span style={{ background: cfg.bg, color: cfg.color, border: "2px solid #111110", padding: "2px 9px", borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px", display: "inline-block" }}>
        {cfg.label}
      </span>
    );
  };

  const SaleMethodBadge = ({ method }: { method?: string }) => {
    if (!method) return <span style={{ color: "#d4cfc4", fontSize: 12 }}>—</span>;
    const cfg = SALE_METHOD_CFG[method] ?? { label: method, icon: "💡", color: "#5C5346" };
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: cfg.color }}>
        <span>{cfg.icon}</span> {cfg.label}
      </span>
    );
  };

  return (
    <>
      <style>{`
        .aw-row:hover { background: #F5F0E8 !important; }
        .aw-row:hover .aw-arrow { opacity: 1 !important; }
        .aw-filter:hover { background: #FFD400 !important; }
        .aw-page:hover:not(:disabled) { background: #FFD400 !important; }
        .aw-del:hover { background: #FF6B6B !important; color: #fff !important; }
      `}</style>

      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 2 }}>My Artworks</h1>
            <p style={{ fontSize: 13, color: "#9B8F7A" }}>{artworks.length} work{artworks.length !== 1 ? "s" : ""} in your inventory</p>
          </div>
          <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "#FFD400", color: "#111110", border: "2px solid #111110", borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
              <Plus size={15} strokeWidth={3} /> Add Artwork
            </button>
          </Link>
        </div>

        {/* Filters + search */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <SlidersHorizontal size={13} color="#9B8F7A" />
            {STATUSES.map(s => (
              <button key={s} className="aw-filter" onClick={() => { setStatus(s); setPage(1); }} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", border: "2px solid #111110", borderRadius: 20,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: statusFilter === s ? "#FFD400" : "#fff",
                boxShadow: statusFilter === s ? "2px 2px 0 #111110" : "none",
                transition: "background 0.1s",
              }}>
                {statusFilter === s && s !== "All" && <X size={9} strokeWidth={3} />}
                {s}
              </button>
            ))}
            {selected.size > 0 && (
              <button className="aw-del" onClick={deleteSelected} style={{ padding: "5px 12px", border: "2px solid #cc0000", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#cc0000", transition: "background 0.1s" }}>
                Delete {selected.size}
              </button>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9B8F7A" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title, medium, location…" style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "2px solid #111110", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", outline: "none", width: 240 }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9B8F7A", fontSize: 14 }}>Loading artworks…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎨</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 6 }}>
                {search || statusFilter !== "All" ? "No results found" : "No artworks yet"}
              </div>
              <div style={{ fontSize: 13, color: "#9B8F7A", marginBottom: 18 }}>
                {search || statusFilter !== "All" ? "Try adjusting your filters" : "Add your first piece to get started"}
              </div>
              {!search && statusFilter === "All" && (
                <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                  <button style={{ padding: "10px 20px", border: "2px solid #111110", borderRadius: 6, background: "#FFD400", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>＋ Add Artwork</button>
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {/* Checkbox */}
                    <th style={{ padding: "11px 14px", background: "#F5F0E8", borderBottom: "2px solid #111110", width: 36 }}>
                      <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} style={{ accentColor: "#FFD400", width: 14, height: 14, cursor: "pointer" }} />
                    </th>
                    {/* Image — wider */}
                    <th style={{ padding: "11px 14px", background: "#F5F0E8", borderBottom: "2px solid #111110", width: 80 }} />
                    <TH col="title"       label="Artwork" />
                    <TH col="medium"      label="Medium" />
                    <TH col="year"        label="Year" />
                    <TH col="location"    label="Location" />
                    <TH col="sale_method" label="Sale Method" />
                    <TH col="status"      label="Status" />
                    <TH col="price"       label="Price" />
                    {/* Arrow */}
                    <th style={{ padding: "11px 14px", background: "#F5F0E8", borderBottom: "2px solid #111110", width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, idx) => (
                    <tr key={a.id} className="aw-row" style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #E0D8CA", transition: "background 0.1s", cursor: "pointer" }}>

                      {/* Checkbox */}
                      <td style={{ padding: "10px 14px" }} onClick={e => { e.stopPropagation(); toggleOne(a.id); }}>
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} style={{ accentColor: "#FFD400", width: 14, height: 14, cursor: "pointer" }} />
                      </td>

                      {/* Image — 72×72 */}
                      <td style={{ padding: "8px 6px 8px 14px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <div style={{ width: 72, height: 72, borderRadius: 6, border: "2px solid #111110", overflow: "hidden", background: "#F5F0E8", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {a.images?.[0]
                              ? <img src={a.images[0]} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <ImageIcon size={20} color="#9B8F7A" />
                            }
                          </div>
                        </Link>
                      </td>

                      {/* Title */}
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{a.title}</div>
                          {a.dimensions && <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 2 }}>{a.dimensions}</div>}
                        </Link>
                      </td>

                      {/* Medium */}
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          {a.medium
                            ? <span style={{ padding: "3px 9px", border: "1.5px solid #d4cfc4", borderRadius: 20, fontSize: 11, fontWeight: 600, color: "#5C5346", background: "#F5F0E8" }}>{a.medium}</span>
                            : <span style={{ color: "#d4cfc4", fontSize: 12 }}>—</span>
                          }
                        </Link>
                      </td>

                      {/* Year */}
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#5C5346", fontWeight: 600 }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          {a.year ?? "—"}
                        </Link>
                      </td>

                      {/* Location */}
                      <td style={{ padding: "10px 14px", maxWidth: 160 }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          {a.location ? (
                            <span style={{ fontSize: 12, color: "#5C5346", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 13 }}>📍</span>
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{a.location}</span>
                            </span>
                          ) : (
                            <span style={{ color: "#d4cfc4", fontSize: 12 }}>—</span>
                          )}
                        </Link>
                      </td>

                      {/* Sale Method */}
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <SaleMethodBadge method={a.sale_method} />
                        </Link>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <StatusBadge status={a.status} />
                        </Link>
                      </td>

                      {/* Price */}
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#111110" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          {a.price ? `$${a.price.toLocaleString()}` : <span style={{ color: "#d4cfc4" }}>—</span>}
                        </Link>
                      </td>

                      {/* Arrow */}
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <span className="aw-arrow" style={{ fontSize: 14, color: "#9B8F7A", opacity: 0, transition: "opacity 0.1s" }}>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="aw-page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "2px solid #111110", borderRadius: 6, fontSize: 13, fontWeight: 700, background: "#fff", color: "#111110", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, transition: "background 0.1s" }}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5C5346" }}>Page {page} of {totalPages}</span>
            <button className="aw-page" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "2px solid #111110", borderRadius: 6, fontSize: 13, fontWeight: 700, background: "#fff", color: "#111110", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, transition: "background 0.1s" }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
