"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, LayoutGrid, List, Table2, Edit2, Trash2, Image as ImageIcon } from "lucide-react";

type Artwork = {
  id: string; title: string; year?: number; medium?: string;
  dimensions?: string; price?: number; status: string;
  images?: string[]; location?: string; created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  available: "badge-available", sold: "badge-sold",
  reserved: "badge-reserved", "not for sale": "badge-nfs",
  "in storage": "badge-storage",
};

export default function ArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [view, setView] = useState<"table" | "grid" | "list">("table");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtworks();
  }, []);

  async function loadArtworks() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setArtworks(data || []);
    setLoading(false);
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    setArtworks((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = artworks.filter((a) =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.medium?.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = artworks.reduce((acc, a) => {
    const s = a.status?.toLowerCase() || "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">My Artworks</h1>
          <p className="page-subtitle">{artworks.length} works in your inventory</p>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Artwork
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Available", key: "available", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Sold", key: "sold", color: "bg-rose-50 text-rose-700 border-rose-200" },
          { label: "Reserved", key: "reserved", color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Not for Sale", key: "not for sale", color: "bg-stone-50 text-stone-600 border-stone-200" },
        ].map((s) => (
          <div key={s.key} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${s.color}`}>
            <span className="text-xs font-semibold">{s.label}</span>
            <span className="text-lg font-display font-semibold">{statusCounts[s.key] || 0}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text" placeholder="Search artworks..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
          {([["table", Table2], ["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={`p-2.5 ${view === v ? "bg-stone-900 text-white" : "bg-white text-stone-500 hover:bg-stone-50"} transition-colors`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="heading-sm mb-2">No artworks yet</h3>
          <p className="body-lg mb-6">Start building your inventory</p>
          <Link href="/dashboard/artworks/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Add First Artwork
          </Link>
        </div>
      ) : view === "table" ? (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th><th>Title</th><th>Medium</th>
                <th>Year</th><th>Dimensions</th><th>Price</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100">
                      {a.images?.[0] ? (
                        <img src={a.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-stone-300" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td><span className="font-medium text-stone-900">{a.title}</span></td>
                  <td className="text-stone-500">{a.medium || "—"}</td>
                  <td className="text-stone-500">{a.year || "—"}</td>
                  <td className="font-mono text-xs text-stone-500">{a.dimensions || "—"}</td>
                  <td>{a.price ? <span className="font-mono text-sm">${a.price.toLocaleString()}</span> : <span className="text-stone-400">—</span>}</td>
                  <td><span className={STATUS_BADGE[a.status?.toLowerCase()] || "badge-nfs"}>{a.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/artworks/${a.id}/edit`} className="btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></Link>
                      <button onClick={() => deleteArtwork(a.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="card-hover overflow-hidden group">
              <div className="aspect-square bg-stone-100">
                {a.images?.[0] ? (
                  <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-stone-900 truncate">{a.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={STATUS_BADGE[a.status?.toLowerCase()] || "badge-nfs"}>{a.status}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/artworks/${a.id}/edit`} className="p-1 hover:bg-stone-100 rounded"><Edit2 className="w-3 h-3" /></Link>
                    <button onClick={() => deleteArtwork(a.id)} className="p-1 hover:bg-rose-50 text-rose-500 rounded"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-stone-100">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 transition-colors">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-stone-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 truncate">{a.title}</p>
                <p className="text-xs text-stone-500">{[a.medium, a.year].filter(Boolean).join(" · ")}</p>
              </div>
              <span className={STATUS_BADGE[a.status?.toLowerCase()] || "badge-nfs"}>{a.status}</span>
              {a.price && <span className="font-mono text-sm text-stone-600">${a.price.toLocaleString()}</span>}
              <div className="flex gap-1">
                <Link href={`/dashboard/artworks/${a.id}/edit`} className="btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></Link>
                <button onClick={() => deleteArtwork(a.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
