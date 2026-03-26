"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ArtworkFilters from "./ArtworkFilters";

const statusBadge: Record<string, string> = {
  available: "badge-available", sold: "badge-sold", not_for_sale: "badge-not-for-sale", reserved: "badge-reserved",
};
const statusLabel: Record<string, string> = {
  available: "Available", sold: "Sold", not_for_sale: "Not for Sale", reserved: "Reserved",
};

export default function ArtworksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("table");

  useEffect(() => {
    loadArtworks();
  }, []);

  async function loadArtworks() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAllItems(data || []);
    setItems(data || []);
    setLoading(false);
  }

  // Filter locally
  const filtered = allItems.filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) && !a.medium?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: allItems.length,
    available: allItems.filter((a) => a.status === "available").length,
    sold: allItems.filter((a) => a.status === "sold").length,
    not_for_sale: allItems.filter((a) => a.status === "not_for_sale").length,
    reserved: allItems.filter((a) => a.status === "reserved").length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-md">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">{counts.all} artwork{counts.all !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary"><PlusCircle size={16} /> Add Artwork</Link>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: "available", label: "Available", count: counts.available, color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-100" },
          { key: "reserved", label: "Reserved", count: counts.reserved, color: "bg-amber-500", light: "bg-amber-50 border-amber-100" },
          { key: "not_for_sale", label: "Not for Sale", count: counts.not_for_sale, color: "bg-slate-400", light: "bg-slate-50 border-slate-150" },
          { key: "sold", label: "Sold", count: counts.sold, color: "bg-red-500", light: "bg-red-50 border-red-100" },
        ].map((s) => (
          <button key={s.key} onClick={() => setStatus(status === s.key ? "all" : s.key)} className={`rounded-lg border p-4 text-left transition-all ${s.light} ${status === s.key ? "ring-2 ring-slate-900" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold text-slate-800">{s.count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <ArtworkFilters currentStatus={status} currentSearch={search} currentView={view} counts={counts}
        onStatusChange={setStatus} onSearchChange={setSearch} onViewChange={setView} />

      {filtered.length === 0 ? (
        <div className="card p-16 text-center mt-4">
          <ImageIcon size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">{search || status !== "all" ? "No artworks match" : "No artworks yet"}</h2>
          <p className="text-sm text-slate-400 mt-2">{search || status !== "all" ? "Try adjusting your filters." : "Start building your inventory."}</p>
          {!search && status === "all" && <Link href="/dashboard/artworks/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Add Your First Artwork</Link>}
        </div>
      ) : view === "table" ? (
        <div className="table-container mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="table-header">
              <tr><th className="w-14"></th><th>Title</th><th>Medium</th><th>Year</th><th>Dimensions</th><th>Price</th><th>Location</th><th>Status</th><th>Added</th><th className="w-24">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const dims = [a.width_cm, a.height_cm, a.depth_cm].filter(Boolean).join(" × ");
                return (
                  <tr key={a.id} className="table-row">
                    <td><Link href={`/dashboard/artworks/${a.id}`}><div className="w-10 h-10 rounded bg-slate-100 overflow-hidden border border-slate-150">
                      {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={12} className="text-slate-300" /></div>}
                    </div></Link></td>
                    <td><Link href={`/dashboard/artworks/${a.id}`} className="font-medium text-slate-800 hover:text-brand-600 transition-colors">{a.title}</Link></td>
                    <td className="text-slate-500">{a.medium || "—"}</td>
                    <td className="text-slate-500">{a.year || "—"}</td>
                    <td className="text-slate-500 font-mono text-xs">{dims ? `${dims} cm` : "—"}</td>
                    <td className="font-medium">{a.price != null ? `${a.currency} ${parseFloat(a.price).toLocaleString()}` : "—"}</td>
                    <td className="text-slate-500 max-w-[120px] truncate">{a.location || "—"}</td>
                    <td><span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusBadge[a.status] || "badge-available"}`}>{statusLabel[a.status] || a.status}</span></td>
                    <td className="text-slate-400 text-xs">{new Date(a.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td><div className="flex items-center gap-1">
                      <Link href={`/dashboard/artworks/${a.id}`} className="px-2 py-1 text-[11px] text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">View</Link>
                      <Link href={`/dashboard/artworks/${a.id}/edit`} className="px-2 py-1 text-[11px] text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">Edit</Link>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "grid" ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((a) => (
            <Link key={a.id} href={`/dashboard/artworks/${a.id}`} className="card-hover group overflow-hidden">
              <div className="aspect-square bg-slate-75 overflow-hidden relative">
                {a.images?.[0] ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" strokeWidth={1} /></div>}
                <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[a.status] || "badge-available"}`}>{statusLabel[a.status] || a.status}</span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-600 transition-colors">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{[a.medium, a.year].filter(Boolean).join(" · ")}</p>
                {a.price != null && <p className="text-xs font-medium text-slate-600 mt-1">{a.currency} {parseFloat(a.price).toLocaleString()}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 card overflow-hidden">
          {filtered.map((a, idx) => (
            <Link key={a.id} href={`/dashboard/artworks/${a.id}`} className={`flex items-center gap-4 p-4 hover:bg-slate-25 transition-colors ${idx > 0 ? "border-t border-slate-100" : ""}`}>
              <div className="w-14 h-14 rounded bg-slate-75 border border-slate-150 shrink-0 overflow-hidden">
                {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-slate-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-800 truncate">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{[a.medium, a.year].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {a.price != null && <span className="text-sm font-medium text-slate-700">{a.currency} {parseFloat(a.price).toLocaleString()}</span>}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[a.status] || "badge-available"}`}>{statusLabel[a.status] || a.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
