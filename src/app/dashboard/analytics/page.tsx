"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const revenueData = [
  { month: "Oct", revenue: 42000 },
  { month: "Nov", revenue: 48000 },
  { month: "Dec", revenue: 51000 },
  { month: "Jan", revenue: 55000 },
  { month: "Feb", revenue: 54000 },
  { month: "Mar", revenue: 68000 },
];

const salesCountData = [
  { month: "Oct", sales: 12 },
  { month: "Nov", sales: 14 },
  { month: "Dec", sales: 13 },
  { month: "Jan", sales: 17 },
  { month: "Feb", sales: 15 },
  { month: "Mar", sales: 19 },
];

const categoryData = [
  { name: "Landscape", value: 35, color: "#1e293b" },
  { name: "Abstract", value: 28, color: "#64748b" },
  { name: "Portrait", value: 18, color: "#94a3b8" },
  { name: "Seascape", value: 12, color: "#cbd5e1" },
  { name: "Other", value: 7, color: "#e2e8f0" },
];

const topArtists = [
  { rank: 1, name: "Maria Garcia", sales: 15, revenue: "$48,500" },
  { rank: 2, name: "David Chen", sales: 12, revenue: "$42,000" },
  { rank: 3, name: "Emma Wilson", sales: 10, revenue: "$38,200" },
  { rank: 4, name: "James Lee", sales: 9, revenue: "$35,600" },
  { rank: 5, name: "Sophia Martinez", sales: 8, revenue: "$31,800" },
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ revenue: 0, avgSale: 0, artworks: 0, sales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sales } = await supabase.from("sales").select("sale_price").eq("seller_id", user.id);
      const { count: artworks } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const totalRev = (sales || []).reduce((s: number, x: any) => s + (parseFloat(x.sale_price) || 0), 0);
      const avgSale = sales?.length ? totalRev / sales.length : 0;
      setStats({ revenue: totalRev, avgSale, artworks: artworks || 0, sales: sales?.length || 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Track your gallery&apos;s performance and insights</p>
        </div>
        <select className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none">
          <option>Last 6 Months</option>
          <option>Last 12 Months</option>
          <option>This Year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Revenue Growth", value: "+24%", sub: "↑ vs. last period", color: "text-emerald-600" },
          { label: "Avg. Sale Value", value: `$${stats.avgSale ? stats.avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "9,850"}`, sub: "↑ 12% increase", color: "text-emerald-600" },
          { label: "Conversion Rate", value: "38%", sub: "— stable", color: "text-slate-500" },
          { label: "Inventory Turnover", value: "4.2x", sub: "↑ 8% increase", color: "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500 mb-2">{kpi.label}</p>
            <p className="text-[28px] font-bold text-slate-900 leading-none">{kpi.value}</p>
            <p className={`text-xs mt-2 ${kpi.color}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + Sales by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Line type="monotone" dataKey="revenue" stroke="#1e293b" strokeWidth={2} dot={{ r: 4, fill: "#1e293b" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-2 mt-2 justify-center">
            <div className="w-3 h-0.5 bg-slate-900 rounded" />
            <span className="text-xs text-slate-400">revenue</span>
          </div>
        </div>

        {/* Sales by Category - Pie */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Sales by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={{ stroke: "#94a3b8" }}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Monthly Sales Count + Top Artists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Monthly Sales Count</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesCountData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="sales" fill="#1e293b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-2 mt-2 justify-center">
            <div className="w-3 h-3 bg-slate-900 rounded-sm" />
            <span className="text-xs text-slate-400">sales</span>
          </div>
        </div>

        {/* Top Performing Artists */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Top Performing Artists</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topArtists.map((artist) => (
              <div key={artist.rank} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  artist.rank <= 3 ? "bg-slate-900" : "bg-slate-400"
                }`}>
                  {artist.rank}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{artist.name}</p>
                  <p className="text-xs text-slate-500">{artist.sales} sales</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{artist.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
