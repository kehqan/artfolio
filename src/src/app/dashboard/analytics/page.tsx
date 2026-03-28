"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, DollarSign, Image as ImageIcon, Users } from "lucide-react";

type Sale = {
  id: string;
  sale_price: number;
  commission_percent?: number;
  commission_percentage?: number;
  sale_date?: string;
  status: string;
};

type Artwork = { id: string; status: string };

export default function AnalyticsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: salesData }, { data: artworksData }, { count: followers }] = await Promise.all([
        supabase.from("sales").select("*").or(`user_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from("artworks").select("id, status").eq("user_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      ]);

      setSales(salesData || []);
      setArtworks(artworksData || []);
      setFollowerCount(followers || 0);
      setLoading(false);
    }
    load();
  }, []);

  const completedSales = sales.filter((s) => s.status?.toLowerCase() === "completed");
  const totalRevenue = completedSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const totalCommission = completedSales.reduce((sum, s) => {
    const pct = s.commission_percentage ?? s.commission_percent ?? 0;
    return sum + (s.sale_price * pct) / 100;
  }, 0);
  const netRevenue = totalRevenue - totalCommission;

  const statusCounts = artworks.reduce((acc, a) => {
    const s = (a.status || "unknown").toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Revenue by month (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });

  const revenueByMonth = months.map(({ label, year, month }) => {
    const total = completedSales
      .filter((s) => {
        if (!s.sale_date) return false;
        const d = new Date(s.sale_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, s) => sum + (s.sale_price || 0), 0);
    return { label, total };
  });

  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.total), 1);

  const stats = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Net Revenue", value: `$${netRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Total Artworks", value: artworks.length, icon: ImageIcon, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Followers", value: followerCount, icon: Users, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading analytics...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Your performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="card p-6">
          <h2 className="heading-sm mb-6">Revenue (Last 6 Months)</h2>
          <div className="flex items-end gap-3 h-40">
            {revenueByMonth.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-stone-500 font-mono">{m.total > 0 ? `$${m.total}` : ""}</span>
                <div
                  className="w-full rounded-t-lg bg-emerald-500 transition-all duration-500 min-h-[4px]"
                  style={{ height: `${(m.total / maxRevenue) * 120}px` }}
                />
                <span className="text-xs text-stone-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Artwork status */}
        <div className="card p-6">
          <h2 className="heading-sm mb-6">Artwork Status</h2>
          {artworks.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No artworks yet</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: "available", label: "Available", color: "bg-emerald-500" },
                { key: "sold", label: "Sold", color: "bg-rose-500" },
                { key: "reserved", label: "Reserved", color: "bg-amber-500" },
                { key: "not for sale", label: "Not for Sale", color: "bg-stone-400" },
              ].map((s) => {
                const count = statusCounts[s.key] || 0;
                const pct = artworks.length ? Math.round((count / artworks.length) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-600">{s.label}</span>
                      <span className="font-medium text-stone-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
