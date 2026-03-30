"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, SlidersHorizontal, X, ArrowUpDown, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

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
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  available:     { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  Available:     { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  sold:          { label: "Sold",         bg: "#111110", color: "#FFD400" },
  Sold:          { label: "Sold",         bg: "#111110", color: "#FFD400" },
  reserved:      { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  Reserved:      { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  "not for sale":{ label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "Not for Sale":{ label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "in storage":  { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
  "In Storage":  { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
};

const PAGE_SIZE = 9;
const STATUS_FILTERS = ["All", "Available", "Sold", "Reserved", "Not for Sale", "In Storage"];

export default function ArtworksPage() {
  const [artworks, setArtworks]     = useState<Artwork[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("All");
  const [sortCol, setSortCol]       = useState<keyof Artwork>("created_at");
  const [sortAsc, setSortAsc]       = useState(false);
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("artworks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setArtworks(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} artwork(s)?`)) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().in("id", Array.from(selected));
    setArtworks(prev => prev.filter(a => !selected.has(a.id)));
    setSelected(new Set());
  }

  // filter + sort + paginate
  const filtered = artworks
    .filter(a => {
      const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.medium?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || a.status?.toLowerCase() === statusFilter.toLowerCase();
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
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(a => a.id)));
  }

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#F3F4F6", color: "#374151" };
    return (
      <span style={{
        background: cfg.bg, color: cfg.color,
        border: `2px solid #111110`,
        padding: "2px 10px", borderRadius: 4,
        fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px",
        display: "inline-block",
      }}>{cfg.label}</span>
    );
  };

  const ColHeader = ({ col, label }: { col: keyof Artwork; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap",
        fontSize: 11, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#9B8F7A",
        borderBottom: "2px solid #111110", cursor: "pointer",
        userSelect: "none", background: "#F5F0E8",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        <ArrowUpDown size={11} style={{ opacity: sortCol === col ? 1 : 0.3, color: sortCol === col ? "#FFD400" : "inherit" }} />
      </span>
    </th>
  );

  return (
    <>
      <style>{`
        .aw-row:hover { background: #F5F0E8 !important; }
        .aw-row:hover .aw-row-arrow { opacity: 1 !important; }
        .aw-filter-btn:hover { background: #FFD400 !important; color: #111110 !important; }
        .aw-page-btn:hover { background: #FFD400 !important; border-color: #111110 !important; color: #111110 !important; }
        .aw-del-btn:hover { background: #FF6B6B !important; color: #fff !important; }
      `}</style>

      <div>
        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 2 }}>
              My Artworks
            </h1>
            <p style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 500 }}>
              {artworks.length} work{artworks.length !== 1 ? "s" : ""} in your inventory
            </p>
          </div>
          <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px", background: "#FFD400", color: "#111110",
              border: "2px solid #111110", borderRadius: 6,
              fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: "3px 3px 0 #111110",
            }}>
              <Plus size={15} strokeWidth={3} /> Add Artwork
            </button>
          </Link>
        </div>

        {/* ── FILTERS ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Status filter pills */}
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                className="aw-filter-btn"
                onClick={() => { setStatus(s); setPage(1); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", border: "2px solid #111110", borderRadius: 20,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: statusFilter === s ? "#FFD400" : "#fff",
                  color: "#111110",
                  boxShadow: statusFilter === s ? "2px 2px 0 #111110" : "none",
                  transition: "background 0.1s",
                }}
              >
                {statusFilter === s && s !== "All" && <X size={10} strokeWidth={3} />}
                <SlidersHorizontal size={11} style={{ opacity: s === "All" ? 1 : 0 }} />
                {s === "All" && <SlidersHorizontal size={11} />}
                {s}
              </button>
            ))}

            {/* Delete selection */}
            {selected.size > 0 && (
              <button
                className="aw-del-btn"
                onClick={deleteSelected}
                style={{
                  padding: "6px 14px", border: "2px solid #111110", borderRadius: 6,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: "#fff", color: "#cc0000",
                  transition: "background 0.1s",
                }}
              >
                Delete {selected.size}
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#9B8F7A",
            }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search artworks..."
              style={{
                paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                border: "2px solid #111110", borderRadius: 6,
                fontSize: 13, fontFamily: "inherit", background: "#fff",
                outline: "none", width: 220,
              }}
            />
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{
          background: "#fff", border: "2px solid #111110",
          boxShadow: "4px 4px 0 #111110", borderRadius: 8, overflow: "hidden",
          marginBottom: 18,
        }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#9B8F7A", fontSize: 14 }}>
              Loading artworks…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>
                {search || statusFilter !== "All" ? "No results found" : "No artworks yet"}
              </div>
              <div style={{ fontSize: 13, color: "#9B8F7A", marginBottom: 20 }}>
                {search || statusFilter !== "All" ? "Try adjusting your filters" : "Add your first piece to get started"}
              </div>
              {!search && statusFilter === "All" && (
                <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "10px 20px", border: "2px solid #111110", borderRadius: 6,
                    background: "#FFD400", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", boxShadow: "3px 3px 0 #111110",
                  }}>
                    ＋ Add Artwork
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: "12px 16px", background: "#F5F0E8",
                      borderBottom: "2px solid #111110", width: 40,
                    }}>
                      <input
                        type="checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        style={{ accentColor: "#FFD400", width: 15, height: 15, cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ padding: "12px 16px", background: "#F5F0E8", borderBottom: "2px solid #111110", width: 56 }} />
                    <ColHeader col="title"  label="Artwork" />
                    <ColHeader col="medium" label="Medium" />
                    <ColHeader col="year"   label="Year" />
                    <ColHeader col="status" label="Status" />
                    <ColHeader col="price"  label="Price" />
                    <th style={{
                      padding: "12px 16px", background: "#F5F0E8",
                      borderBottom: "2px solid #111110", width: 40,
                    }} />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, idx) => (
                    <tr
                      key={a.id}
                      className="aw-row"
                      style={{
                        background: idx % 2 === 0 ? "#fff" : "#FAFAF8",
                        borderBottom: "1px solid #E0D8CA",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Checkbox */}
                      <td
                        style={{ padding: "14px 16px" }}
                        onClick={e => { e.stopPropagation(); toggleSelect(a.id); }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          style={{ accentColor: "#FFD400", width: 15, height: 15, cursor: "pointer" }}
                        />
                      </td>

                      {/* Thumbnail */}
                      <td style={{ padding: "10px 6px 10px 16px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 4,
                            border: "2px solid #111110", overflow: "hidden",
                            background: "#F5F0E8", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {a.images?.[0]
                              ? <img src={a.images[0]} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <ImageIcon size={18} color="#9B8F7A" />
                            }
                          </div>
                        </Link>
                      </td>

                      {/* Title */}
                      <td style={{ padding: "14px 16px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111110" }}>{a.title}</div>
                          {a.dimensions && (
                            <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 2 }}>{a.dimensions}</div>
                          )}
                        </Link>
                      </td>

                      {/* Medium */}
                      <td style={{ padding: "14px 16px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          {a.medium ? (
                            <span style={{
                              padding: "3px 10px", border: "1.5px solid #d4cfc4",
                              borderRadius: 20, fontSize: 11, fontWeight: 600,
                              color: "#5C5346", background: "#F5F0E8",
                            }}>{a.medium}</span>
                          ) : <span style={{ color: "#d4cfc4", fontSize: 13 }}>—</span>}
                        </Link>
                      </td>

                      {/* Year */}
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#5C5346", fontWeight: 600 }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          {a.year ?? "—"}
                        </Link>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          {statusBadge(a.status)}
                        </Link>
                      </td>

                      {/* Price */}
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#111110" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          {a.price ? `$${a.price.toLocaleString()}` : <span style={{ color: "#d4cfc4" }}>—</span>}
                        </Link>
                      </td>

                      {/* Arrow */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <Link href={`/dashboard/artworks/${a.id}`} style={{ textDecoration: "none" }}>
                          <span className="aw-row-arrow" style={{
                            fontSize: 16, color: "#9B8F7A", opacity: 0,
                            transition: "opacity 0.1s",
                          }}>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              className="aw-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", border: "2px solid #111110", borderRadius: 6,
                fontSize: 13, fontWeight: 700, cursor: page === 1 ? "not-allowed" : "pointer",
                background: "#fff", color: "#111110",
                opacity: page === 1 ? 0.4 : 1,
                transition: "background 0.1s",
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <span style={{ fontSize: 13, fontWeight: 700, color: "#5C5346" }}>
              Page {page} of {totalPages}
            </span>

            <button
              className="aw-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", border: "2px solid #111110", borderRadius: 6,
                fontSize: 13, fontWeight: 700, cursor: page === totalPages ? "not-allowed" : "pointer",
                background: "#fff", color: "#111110",
                opacity: page === totalPages ? 0.4 : 1,
                transition: "background 0.1s",
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
