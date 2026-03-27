"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, DollarSign, Users, Eye, Award, Image, ArrowUp, ArrowDown } from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    artworks: 0, sales: 0, totalRevenue: 0,
    exhibitions: 0, followers: 0, collaborations: 0,
  });
  const [salesByMonth, setSalesByMonth] = useState<{ month: string; amount: number; count: number }[]>([]);
  const [artworksByStatus, setArtworksByStatus] = useState<{ status: string; count: number }[]>([]);
  const [topArtworks, setTopArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const uid = user.id;

    // Parallel queries
    const [artRes, salesRes, exRes, follRes, collabRes] = await Promise.all([
      supabase.from("artworks").select("id, title, status, price, created_at").eq("user_id", uid),
      supabase.from("sales").select("amount, sale_date, artwork_id").eq("user_id", uid),
      supabase.from("exhibitions").select("id").eq("user_id", uid),
      supabase.from("followers").select("id").eq("following_id", uid),
      supabase.from("collaborations").select("id").eq("user_id", uid),
    ]);

    const artworks = artRes.data || [];
    const sales = salesRes.data || [];
    const totalRevenue = sales.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    setStats({
      artworks: artworks.length,
      sales: sales.length,
      totalRevenue,
      exhibitions: exRes.data?.length || 0,
      followers: follRes.data?.length || 0,
      collaborations: collabRes.data?.length || 0,
    });

    // Sales by month (last 6 months)
    const months: Record<string, { amount: number; count: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = { amount: 0, count: 0 };
    }
    sales.forEach(s => {
      const d = new Date(s.sale_date);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (months[key]) { months[key].amount += Number(s.amount) || 0; months[key].count++; }
    });
    setSalesByMonth(Object.entries(months).map(([month, v]) => ({ month, ...v })));

    // Artworks by status
    const statusCounts: Record<string, number> = {};
    artworks.forEach(a => { statusCounts[a.status || "unknown"] = (statusCounts[a.status || "unknown"] || 0) + 1; });
    setArtworksByStatus(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

    // Top artworks by price
    const sorted = [...artworks].filter(a => a.price).sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 5);
    setTopArtworks(sorted);

    setLoading(false);
  };

  const statCards: StatCard[] = [
    { label: "Total Artworks", value: stats.artworks, change: 0, icon: <Image size={20} />, color: "bg-indigo-500" },
    { label: "Total Sales", value: stats.sales, change: 0, icon: <DollarSign size={20} />, color: "bg-emerald-500" },
    { label: "Revenue", value: "$" + stats.totalRevenue.toFixed(2), change: 0, icon: <TrendingUp size={20} />, color: "bg-violet-500" },
    { label: "Exhibitions", value: stats.exhibitions, change: 0, icon: <Award size={20} />, color: "bg-pink-500" },
    { label: "Followers", value: stats.followers, change: 0, icon: <Users size={20} />, color: "bg-blue-500" },
    { label: "Collaborations", value: stats.collaborations, change: 0, icon: <Eye size={20} />, color: "bg-orange-500" },
  ];

  const maxBar = Math.max(...salesByMonth.map(m => m.amount), 1);
  const statusColors: Record<string, string> = {
    available: "#6366f1", sold: "#10b981", reserved: "#f59e0b", "not for sale": "#6b7280"
  };
  const totalArtworks = artworksByStatus.reduce((s, a) => s + a.count, 0) || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Your business performance at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center text-white`}>
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Monthly Revenue</h2>
          <p className="text-xs text-gray-400 mb-4">Last 6 months</p>
          <div className="flex items-end gap-2 h-40">
            {salesByMonth.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">${m.amount > 0 ? m.amount.toFixed(0) : ""}</span>
                <div
                  className="w-full bg-indigo-500 rounded-t-md transition-all duration-500"
                  style={{ height: `${Math.max((m.amount / maxBar) * 120, m.amount > 0 ? 8 : 3)}px` }}
                />
                <span className="text-xs text-gray-400 truncate w-full text-center">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">${stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Artwork Status Donut */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Artworks by Status</h2>
          <p className="text-xs text-gray-400 mb-4">Portfolio breakdown</p>
          {artworksByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No artworks yet</div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg viewBox="0 0 120 120" className="w-32 h-32">
                  {(() => {
                    let offset = 0;
                    const circumference = 2 * Math.PI * 45;
                    return artworksByStatus.map(({ status, count }) => {
                      const pct = count / totalArtworks;
                      const dash = pct * circumference;
                      const el = (
                        <circle key={status} cx="60" cy="60" r="45"
                          fill="none"
                          stroke={statusColors[status] || "#94a3b8"}
                          strokeWidth="18"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset * circumference}
                          style={{ transition: "all 0.5s" }}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                  <text x="60" y="55" textAnchor="middle" className="text-lg" style={{ fontSize: 16, fontWeight: 700, fill: "#1f2937" }}>{stats.artworks}</text>
                  <text x="60" y="72" textAnchor="middle" style={{ fontSize: 9, fill: "#9ca3af" }}>artworks</text>
                </svg>
              </div>
              <div className="space-y-2">
                {artworksByStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: statusColors[status] || "#94a3b8" }} />
                      <span className="text-gray-600 capitalize">{status}</span>
                    </div>
                    <span className="font-medium text-gray-900">{count} <span className="text-gray-400 font-normal">({Math.round(count / totalArtworks * 100)}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Artworks */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Top Artworks by Value</h2>
          <p className="text-xs text-gray-400 mb-4">Highest priced works</p>
          {topArtworks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No priced artworks</div>
          ) : (
            <div className="space-y-3">
              {topArtworks.map((art, i) => (
                <div key={art.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{art.title || "Untitled"}</div>
                    <div className="text-xs text-gray-400 capitalize">{art.status}</div>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">${Number(art.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Count Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Sales Count</h2>
          <p className="text-xs text-gray-400 mb-4">Transactions per month</p>
          <div className="space-y-2">
            {salesByMonth.map(m => {
              const maxCount = Math.max(...salesByMonth.map(x => x.count), 1);
              return (
                <div key={m.month} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-12 text-xs">{m.month}</span>
                  <div className="flex-1 bg-gray-50 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${(m.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-700 font-medium w-4 text-right">{m.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
