"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, TrendingUp, CheckCircle, Clock, Plus, X } from "lucide-react";

type Sale = {
  id: string; buyer_name?: string; buyer_email?: string; sale_price: number;
  commission_percentage?: number; sale_date?: string; status: string;
  payment_method?: string; notes?: string; artwork_id: string;
  artwork_title?: string; artwork_image?: string;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<{ id: string; title: string; price?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    artwork_id: "", buyer_name: "", buyer_email: "", sale_price: "",
    commission_percentage: "0", sale_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer", status: "Completed", notes: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: salesData }, { data: artworksData }] = await Promise.all([
      supabase.from("sales").select("*, artworks(title, images)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("artworks").select("id, title, price").eq("user_id", user.id).eq("status", "Available"),
    ]);
    setSales((salesData || []).map((s: any) => ({
      ...s, artwork_title: s.artworks?.title, artwork_image: s.artworks?.images?.[0],
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
      user_id: user.id, artwork_id: form.artwork_id,
      buyer_name: form.buyer_name || null, buyer_email: form.buyer_email || null,
      sale_price: parseFloat(form.sale_price),
      commission_percentage: parseFloat(form.commission_percentage) || 0,
      sale_date: form.sale_date || null, payment_method: form.payment_method,
      status: form.status, notes: form.notes || null,
    });
    if (form.status === "Completed") {
      await supabase.from("artworks").update({ status: "Sold" }).eq("id", form.artwork_id);
    }
    setShowForm(false);
    setForm({ artwork_id: "", buyer_name: "", buyer_email: "", sale_price: "", commission_percentage: "0", sale_date: new Date().toISOString().split("T")[0], payment_method: "Bank Transfer", status: "Completed", notes: "" });
    load();
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const totalRevenue = sales.filter((s) => s.status === "Completed").reduce((a, s) => a + (s.sale_price || 0), 0);
  const totalCommission = sales.filter((s) => s.status === "Completed").reduce((a, s) => a + (s.sale_price * (s.commission_percentage || 0) / 100), 0);
  const netRevenue = totalRevenue - totalCommission;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Sales Tracking</h1>
          <p className="page-subtitle">Monitor your artwork sales and revenue</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Record Sale
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Commission Paid", value: `$${totalCommission.toLocaleString()}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Net Revenue", value: `$${netRevenue.toLocaleString()}`, icon: DollarSign, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Total Sales", value: sales.length, icon: CheckCircle, color: "text-stone-600", bg: "bg-stone-100" },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-display font-semibold text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Record Sale modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">Record a Sale</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRecord} className="space-y-4">
              <div>
                <label className="label">Artwork *</label>
                <select required className="select" value={form.artwork_id} onChange={set("artwork_id")}>
                  <option value="">Select artwork</option>
                  {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Buyer Name</label>
                  <input className="input" value={form.buyer_name} onChange={set("buyer_name")} placeholder="Buyer name" />
                </div>
                <div>
                  <label className="label">Buyer Email</label>
                  <input type="email" className="input" value={form.buyer_email} onChange={set("buyer_email")} placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sale Price (USD) *</label>
                  <input required type="number" className="input" value={form.sale_price} onChange={set("sale_price")} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Commission %</label>
                  <input type="number" className="input" value={form.commission_percentage} onChange={set("commission_percentage")} placeholder="0" min="0" max="100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sale Date</label>
                  <input type="date" className="input" value={form.sale_date} onChange={set("sale_date")} />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="select" value={form.payment_method} onChange={set("payment_method")}>
                    <option>Bank Transfer</option><option>Credit Card</option><option>Cash</option><option>Check</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={set("status")}>
                  <option>Completed</option><option>Pending</option><option>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea rows={2} className="textarea" value={form.notes} onChange={set("notes")} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? "Saving..." : "Record Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales table */}
      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : sales.length === 0 ? (
        <div className="card p-16 text-center">
          <DollarSign className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="heading-sm mb-2">No sales recorded</h3>
          <p className="body-lg mb-6">Record your first artwork sale</p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Record Sale</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artwork</th><th>Buyer</th><th>Sale Price</th>
                <th>Commission</th><th>Net</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const commission = s.sale_price * (s.commission_percentage || 0) / 100;
                const net = s.sale_price - commission;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {s.artwork_image && <img src={s.artwork_image} alt="" className="w-8 h-8 rounded object-cover" />}
                        <span className="font-medium text-stone-900 text-sm">{s.artwork_title || "—"}</span>
                      </div>
                    </td>
                    <td className="text-stone-600 text-sm">{s.buyer_name || "—"}</td>
                    <td className="font-mono text-sm">${s.sale_price.toLocaleString()}</td>
                    <td className="font-mono text-sm text-amber-600">${commission.toFixed(0)}</td>
                    <td className="font-mono text-sm text-emerald-600 font-semibold">${net.toLocaleString()}</td>
                    <td className="text-stone-500 text-xs">{s.sale_date ? new Date(s.sale_date).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className={s.status === "Completed" ? "badge-available" : s.status === "Pending" ? "badge-reserved" : "badge-sold"}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
