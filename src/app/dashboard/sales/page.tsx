"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, DollarSign, Search, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, revenue: 0, commission: 0, avgSale: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("sales").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
      const items = data || [];

      // Enrich with artwork titles
      const artworkIds = items.map((s: any) => s.artwork_id).filter(Boolean);
      let artworkMap: Record<string, any> = {};
      if (artworkIds.length > 0) {
        const { data: artworks } = await supabase.from("artworks").select("id, title, medium").in("id", artworkIds);
        (artworks || []).forEach((a: any) => { artworkMap[a.id] = a; });
      }

      const enriched = items.map((s: any, i: number) => ({
        ...s,
        sale_id: `SAL-${String(s.sale_number || i + 1).padStart(3, "0")}`,
        artwork_title: artworkMap[s.artwork_id]?.title || "Unknown",
      }));

      const totalRev = items.filter((s: any) => s.status !== "cancelled").reduce((sum: number, s: any) => sum + (parseFloat(s.sale_price) || 0), 0);
      const totalComm = items.filter((s: any) => s.status !== "cancelled").reduce((sum: number, s: any) => sum + ((parseFloat(s.sale_price) || 0) * (parseFloat(s.commission_percent) || 0) / 100), 0);
      const avgSale = items.length > 0 ? totalRev / items.length : 0;

      setStats({ total: items.length, revenue: totalRev, commission: totalComm, avgSale });
      setSales(enriched);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.artwork_title?.toLowerCase().includes(q) || s.buyer_name?.toLowerCase().includes(q) || s.sale_id?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all artwork sales</p>
        </div>
        <Link href="/dashboard/sales/new" className="btn-primary"><PlusCircle size={16} /> Record Sale</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Sales", value: stats.total.toString() },
          { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}` },
          { label: "Commission Earned", value: `$${stats.commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: "Average Sale", value: `$${stats.avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500 mb-2">{s.label}</p>
            <p className="text-[28px] font-bold text-slate-900 leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by artwork, buyer, or sale ID..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <DollarSign size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-lg font-semibold text-slate-600">No sales recorded</h2>
          <p className="text-sm text-slate-400 mt-2">Start tracking your artwork sales and revenue.</p>
          <Link href="/dashboard/sales/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Record First Sale</Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sale ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Artwork</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Artist</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sale: any) => {
                  const price = parseFloat(sale.sale_price) || 0;
                  const comm = price * (parseFloat(sale.commission_percent) || 0) / 100;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{sale.sale_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{sale.artwork_title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">—</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.buyer_name || "—"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">${price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">${comm.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.payment_method ? sale.payment_method.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {sales.length} sales</p>
          </div>
        </div>
      )}
    </div>
  );
}
