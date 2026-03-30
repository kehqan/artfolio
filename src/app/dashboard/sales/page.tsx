"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ArrowUpDown, ChevronLeft, ChevronRight,
  DollarSign, TrendingUp, BarChart3, CheckCircle,
} from "lucide-react";

type Sale = {
  id: string;
  buyer_name?: string;
  buyer_email?: string;
  sale_price: number;
  commission_percentage?: number;
  sale_date?: string;
  status: string;
  payment_method?: string;
  notes?: string;
  artwork_id?: string;
  artwork_title?: string;
  artwork_image?: string;
};

const SALE_STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  Completed: { bg: "#DCFCE7", color: "#166534" },
  completed: { bg: "#DCFCE7", color: "#166534" },
  Pending:   { bg: "#FEF9C3", color: "#854D0E" },
  pending:   { bg: "#FEF9C3", color: "#854D0E" },
  Cancelled: { bg: "#FEE2E2", color: "#991B1B" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B" },
};

const PAGE_SIZE = 10;

export default function SalesPage() {
  const [sales, setSales]       = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<{ id: string; title: string; price?: number }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [page, setPage]         = useState(1);
  const [sortCol, setSortCol]   = useState<string>("created_at");
  const [sortAsc, setSortAsc]   = useState(false);
  const [statusFilter, setStatusF] = useState("All");

  const [form, setForm] = useState({
    artwork_id: "", buyer_name: "", buyer_email: "", sale_price: "",
    commission_percentage: "0",
    sale_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer", status: "Completed", notes: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: salesData }, { data: artworksData }] = await Promise.all([
      supabase.from("sales").select("*, artworks(title, images)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("artworks").select("id, title, price").eq("user_id", user.id),
    ]);
    setSales((salesData || []).map((s: any) => ({
      ...s,
      artwork_title: s.artworks?.title,
      artwork_image: s.artworks?.images?.[0],
    })));
    setArtworks(artworksData || []);
    setLoading(false);
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("sales").insert({
      user_id: user.id,
      artwork_id: form.artwork_id || null,
      buyer_name: form.buyer_name || null,
      buyer_email: form.buyer_email || null,
      sale_price: parseFloat(form.sale_price),
      commission_percentage: parseFloat(form.commission_percentage) || 0,
      sale_date: form.sale_date || null,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes || null,
    });
    if (form.status === "Completed" && form.artwork_id) {
      await supabase.from("artworks").update({ status: "Sold" }).eq("id", form.artwork_id);
    }
    setShowForm(false);
    setForm({
      artwork_id: "", buyer_name: "", buyer_email: "", sale_price: "",
      commission_percentage: "0",
      sale_date: new Date().toISOString().split("T")[0],
      payment_method: "Bank Transfer", status: "Completed", notes: "",
    });
    load();
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Stats
  const completed = sales.filter(s => s.status?.toLowerCase() === "completed");
  const totalRevenue    = completed.reduce((a, s) => a + (s.sale_price || 0), 0);
  const totalCommission = completed.reduce((a, s) => a + (s.sale_price * (s.commission_percentage || 0) / 100), 0);
  const netRevenue      = totalRevenue - totalCommission;
  const avgSale         = completed.length ? totalRevenue / completed.length : 0;

  const statCards = [
    { label: "Total Revenue",    value: `$${totalRevenue.toLocaleString()}`,    icon: DollarSign,  accent: "#FFD400" },
    { label: "Net Revenue",      value: `$${netRevenue.toLocaleString()}`,       icon: TrendingUp,  accent: "#95E1D3" },
    { label: "Commission Paid",  value: `$${totalCommission.toLocaleString()}`,  icon: BarChart3,   accent: "#FF6B6B" },
    { label: "Total Sales",      value: sales.length,                            icon: CheckCircle, accent: "#4ECDC4" },
  ];

  // Filter + sort + paginate
  const filtered = sales
    .filter(s => statusFilter === "All" || s.status?.toLowerCase() === statusFilter.toLowerCase())
    .sort((a, b) => {
      const va = (a as any)[sortCol] ?? "";
      const vb = (b as any)[sortCol] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const ColHeader = ({ col, label }: { col: string; label: string }) => (
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

  const statusBadge = (status: string) => {
    const cfg = SALE_STATUS_CONFIG[status] ?? { bg: "#F3F4F6", color: "#374151" };
    return (
      <span style={{
        background: cfg.bg, color: cfg.color,
        border: "2px solid #111110",
        padding: "2px 10px", borderRadius: 4,
        fontSize: 11, fontWeight: 800, textTransform: "uppercase",
        display: "inline-block",
      }}>{status}</span>
    );
  };

  return (
    <>
      <style>{`
        .sl-row:hover  { background: #F5F0E8 !important; }
        .sl-page-btn:hover { background: #FFD400 !important; border-color: #111110 !important; }
        .sl-filter-btn:hover { background: #FFD400 !important; }
        .sl-input:focus { border-color: #FFD400 !important; box-shadow: 0 0 0 3px rgba(255,212,0,0.2) !important; }
        .sl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
      `}</style>

      <div>
        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 2 }}>
              Sales Tracking
            </h1>
            <p style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 500 }}>
              Monitor your artwork sales and revenue
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px", background: "#FFD400", color: "#111110",
              border: "2px solid #111110", borderRadius: 6,
              fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: "3px 3px 0 #111110",
            }}
          >
            <Plus size={15} strokeWidth={3} /> Record Sale
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              background: "#fff", border: "2px solid #111110",
              boxShadow: "3px 3px 0 #111110", borderRadius: 8,
              padding: "18px 20px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 6,
                background: s.accent, border: "2px solid #111110",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <s.icon size={18} color="#111110" />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", color: "#111110", fontFamily: typeof s.value === "number" ? "inherit" : "monospace" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── STATUS FILTERS ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["All", "Completed", "Pending", "Cancelled"].map(s => (
            <button
              key={s}
              className="sl-filter-btn"
              onClick={() => { setStatusF(s); setPage(1); }}
              style={{
                padding: "6px 14px", border: "2px solid #111110", borderRadius: 20,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: statusFilter === s ? "#FFD400" : "#fff",
                color: "#111110",
                boxShadow: statusFilter === s ? "2px 2px 0 #111110" : "none",
                transition: "background 0.1s",
              }}
            >{s}</button>
          ))}
        </div>

        {/* ── TABLE ── */}
        <div style={{
          background: "#fff", border: "2px solid #111110",
          boxShadow: "4px 4px 0 #111110", borderRadius: 8, overflow: "hidden",
          marginBottom: 18,
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9B8F7A", fontSize: 14 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>
                {statusFilter !== "All" ? "No sales with this status" : "No sales recorded"}
              </div>
              <div style={{ fontSize: 13, color: "#9B8F7A", marginBottom: 20 }}>Record your first artwork sale</div>
              <button onClick={() => setShowForm(true)} style={{
                padding: "10px 20px", border: "2px solid #111110", borderRadius: 6,
                background: "#FFD400", fontWeight: 700, fontSize: 13,
                cursor: "pointer", boxShadow: "3px 3px 0 #111110",
              }}>
                ＋ Record Sale
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <ColHeader col="artwork_title"         label="Artwork" />
                    <ColHeader col="buyer_name"            label="Buyer" />
                    <ColHeader col="sale_price"            label="Sale Price" />
                    <ColHeader col="commission_percentage" label="Commission" />
                    <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9B8F7A", borderBottom: "2px solid #111110", background: "#F5F0E8" }}>Net</th>
                    <ColHeader col="sale_date"             label="Date" />
                    <ColHeader col="payment_method"        label="Payment" />
                    <ColHeader col="status"                label="Status" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, idx) => {
                    const commission = s.sale_price * (s.commission_percentage || 0) / 100;
                    const net = s.sale_price - commission;
                    return (
                      <tr key={s.id} className="sl-row" style={{
                        background: idx % 2 === 0 ? "#fff" : "#FAFAF8",
                        borderBottom: "1px solid #E0D8CA",
                        transition: "background 0.1s",
                      }}>
                        {/* Artwork */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {s.artwork_image && (
                              <img src={s.artwork_image} alt="" style={{
                                width: 36, height: 36, objectFit: "cover",
                                border: "2px solid #111110", borderRadius: 4, flexShrink: 0,
                              }} />
                            )}
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>
                              {s.artwork_title || <span style={{ color: "#9B8F7A" }}>—</span>}
                            </span>
                          </div>
                        </td>
                        {/* Buyer */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{s.buyer_name || "—"}</div>
                          {s.buyer_email && (
                            <div style={{ fontSize: 11, color: "#9B8F7A" }}>{s.buyer_email}</div>
                          )}
                        </td>
                        {/* Sale Price */}
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#111110" }}>
                          ${s.sale_price.toLocaleString()}
                        </td>
                        {/* Commission */}
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 13, color: "#FF6B6B", fontWeight: 700 }}>
                          ${commission.toFixed(0)}
                          {s.commission_percentage ? (
                            <span style={{ fontSize: 10, color: "#9B8F7A", marginLeft: 4 }}>({s.commission_percentage}%)</span>
                          ) : null}
                        </td>
                        {/* Net */}
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#00874A" }}>
                          ${net.toLocaleString()}
                        </td>
                        {/* Date */}
                        <td style={{ padding: "14px 16px", fontSize: 12, color: "#5C5346", fontWeight: 600 }}>
                          {s.sale_date ? new Date(s.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        {/* Payment */}
                        <td style={{ padding: "14px 16px" }}>
                          {s.payment_method ? (
                            <span style={{
                              padding: "3px 10px", border: "1.5px solid #d4cfc4",
                              borderRadius: 20, fontSize: 11, fontWeight: 600,
                              color: "#5C5346", background: "#F5F0E8",
                            }}>{s.payment_method}</span>
                          ) : <span style={{ color: "#d4cfc4" }}>—</span>}
                        </td>
                        {/* Status */}
                        <td style={{ padding: "14px 16px" }}>
                          {statusBadge(s.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="sl-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", border: "2px solid #111110", borderRadius: 6,
              fontSize: 13, fontWeight: 700, background: "#fff", color: "#111110",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.4 : 1, transition: "background 0.1s",
            }}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5C5346" }}>Page {page} of {totalPages}</span>
            <button className="sl-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", border: "2px solid #111110", borderRadius: 6,
              fontSize: 13, fontWeight: 700, background: "#fff", color: "#111110",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              opacity: page === totalPages ? 0.4 : 1, transition: "background 0.1s",
            }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── RECORD SALE MODAL ── */}
      {showForm && (
        <div className="sl-overlay" onClick={() => setShowForm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", border: "2px solid #111110",
              borderRadius: 10, boxShadow: "6px 6px 0 #111110",
              width: "100%", maxWidth: 520,
              maxHeight: "90vh", overflowY: "auto",
            }}
          >
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", borderBottom: "2px solid #111110",
              background: "#FFD400",
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "#111110", margin: 0 }}>Record a Sale</h2>
              <button onClick={() => setShowForm(false)} style={{
                width: 28, height: 28, border: "2px solid #111110", borderRadius: 4,
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}><X size={13} /></button>
            </div>

            <form onSubmit={handleRecord} style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Artwork */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Artwork</label>
                  <select required className="sl-input" value={form.artwork_id} onChange={set("artwork_id")} style={{
                    width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                    fontSize: 14, fontFamily: "inherit", fontWeight: 600, background: "#fff",
                    cursor: "pointer", outline: "none", boxSizing: "border-box",
                  }}>
                    <option value="">Select artwork…</option>
                    {artworks.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>

                {/* Buyer */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Buyer Name</label>
                    <input className="sl-input" value={form.buyer_name} onChange={set("buyer_name")} placeholder="Name" style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Buyer Email</label>
                    <input className="sl-input" type="email" value={form.buyer_email} onChange={set("buyer_email")} placeholder="email@..." style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                </div>

                {/* Price + Commission */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Sale Price (USD) *</label>
                    <input required className="sl-input" type="number" value={form.sale_price} onChange={set("sale_price")} placeholder="0.00" style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Commission %</label>
                    <input className="sl-input" type="number" min="0" max="100" value={form.commission_percentage} onChange={set("commission_percentage")} placeholder="0" style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                </div>

                {/* Date + Payment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Sale Date</label>
                    <input className="sl-input" type="date" value={form.sale_date} onChange={set("sale_date")} style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Payment</label>
                    <select className="sl-input" value={form.payment_method} onChange={set("payment_method")} style={{
                      width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                      fontSize: 14, fontFamily: "inherit", background: "#fff", cursor: "pointer",
                      outline: "none", boxSizing: "border-box",
                    }}>
                      <option>Bank Transfer</option>
                      <option>Credit Card</option>
                      <option>Cash</option>
                      <option>Check</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Status</label>
                  <select className="sl-input" value={form.status} onChange={set("status")} style={{
                    width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                    fontSize: 14, fontFamily: "inherit", background: "#fff", cursor: "pointer",
                    outline: "none", boxSizing: "border-box",
                  }}>
                    <option>Completed</option>
                    <option>Pending</option>
                    <option>Cancelled</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Notes</label>
                  <textarea className="sl-input" rows={2} value={form.notes} onChange={set("notes")} placeholder="Optional notes…" style={{
                    width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
                    fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
                  }} />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{
                    flex: 1, padding: "11px", border: "2px solid #111110", borderRadius: 6,
                    background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} style={{
                    flex: 1, padding: "11px", border: "2px solid #111110", borderRadius: 6,
                    background: "#FFD400", color: "#111110",
                    fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "3px 3px 0 #111110",
                  }}>
                    {saving ? "Saving…" : "Record Sale"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
