"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Image, DollarSign, Users, Settings, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [stats, setStats] = useState({ artworks: 0, revenue: 0, clients: 0, available: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: artworkCount } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: availableCount } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "available");
      const { count: clientCount } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { data: sales } = await supabase.from("sales").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(5);

      const totalRevenue = (sales || []).filter((s: any) => s.status !== "cancelled").reduce((sum: number, s: any) => sum + (parseFloat(s.sale_price) || 0), 0);

      // Enrich sales with artwork data
      const artworkIds = (sales || []).map((s: any) => s.artwork_id).filter(Boolean);
      let artworkMap: Record<string, any> = {};
      if (artworkIds.length > 0) {
        const { data: artworks } = await supabase.from("artworks").select("id, title").in("id", artworkIds);
        (artworks || []).forEach((a: any) => { artworkMap[a.id] = a; });
      }

      setStats({ artworks: artworkCount || 0, revenue: totalRevenue, clients: clientCount || 0, available: availableCount || 0 });
      setRecentSales((sales || []).map((s: any) => ({ ...s, artwork_title: artworkMap[s.artwork_id]?.title || "Unknown" })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your gallery.</p>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary">Add Artwork</Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Artworks", value: stats.artworks.toString(), change: "+12%", up: true, icon: Image },
          { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, change: "+18%", up: true, icon: DollarSign },
          { label: "Active Clients", value: stats.clients.toString(), change: "+8%", up: true, icon: Users },
          { label: "Available Artworks", value: stats.available.toString(), change: "-5%", up: false, icon: Settings },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{stat.label}</span>
              <stat.icon size={16} className="text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-bold text-slate-900 leading-none">{stat.value}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {stat.up ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
              <span className={`text-xs font-medium ${stat.up ? "text-emerald-600" : "text-red-500"}`}>{stat.change}</span>
              <span className="text-xs text-slate-400">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Recent Sales</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSales.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">No sales recorded yet</div>
            ) : (
              recentSales.map((sale: any) => (
                <div key={sale.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sale.artwork_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">by {sale.buyer_name || "Unknown buyer"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">${parseFloat(sale.sale_price || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <Link href="/dashboard/sales" className="block text-center text-sm text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-lg transition-colors">View All Sales</Link>
          </div>
        </div>

        {/* Low Stock Artists */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Low Stock Artists</h2>
          </div>
          <div className="px-6 py-4 space-y-5">
            {[
              { name: "Maria Garcia", available: 2, total: 15 },
              { name: "David Chen", available: 3, total: 12 },
              { name: "Emma Wilson", available: 1, total: 8 },
            ].map((artist) => (
              <div key={artist.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-900">{artist.name}</span>
                  <span className="text-xs text-slate-500">{artist.available}/{artist.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full" style={{ width: `${(artist.available / artist.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <Link href="/dashboard/artworks" className="block text-center text-sm text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-lg transition-colors">View Inventory</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
