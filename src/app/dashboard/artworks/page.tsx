import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Image as ImageIcon, LayoutGrid, List, Table } from "lucide-react";
import ArtworkFilters from "./ArtworkFilters";

const statusBadge: Record<string, string> = {
  available: "badge-available",
  sold: "badge-sold",
  not_for_sale: "badge-not-for-sale",
  reserved: "badge-reserved",
};
const statusLabel: Record<string, string> = {
  available: "Available", sold: "Sold", not_for_sale: "Not for Sale", reserved: "Reserved",
};

interface Props { searchParams: { status?: string; search?: string; view?: string } }

export default async function ArtworksPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (searchParams.status && searchParams.status !== "all") query = query.eq("status", searchParams.status);
  if (searchParams.search) query = query.or(`title.ilike.%${searchParams.search}%,medium.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`);
  const { data: artworks } = await query;
  const items = artworks || [];

  const { data: allArtworks } = await supabase.from("artworks").select("status").eq("user_id", user.id);
  const counts = {
    all: allArtworks?.length || 0,
    available: allArtworks?.filter((a) => a.status === "available").length || 0,
    sold: allArtworks?.filter((a) => a.status === "sold").length || 0,
    not_for_sale: allArtworks?.filter((a) => a.status === "not_for_sale").length || 0,
    reserved: allArtworks?.filter((a) => a.status === "reserved").length || 0,
  };

  const view = searchParams.view || "table";

  return (
    <div>
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-md">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">{counts.all} artwork{counts.all !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary">
          <PlusCircle size={16} /> Add Artwork
        </Link>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: "available", label: "Available", count: counts.available, color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-100" },
          { key: "reserved", label: "Reserved", count: counts.reserved, color: "bg-amber-500", light: "bg-amber-50 border-amber-100" },
          { key: "not_for_sale", label: "Not for Sale", count: counts.not_for_sale, color: "bg-slate-400", light: "bg-slate-50 border-slate-150" },
          { key: "sold", label: "Sold", count: counts.sold, color: "bg-red-500", light: "bg-red-50 border-red-100" },
        ].map((s) => (
          <div key={s.key} className={`rounded-lg border p-4 ${s.light}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold text-slate-800">{s.count}</p>
          </div>
        ))}
      </div>

      <ArtworkFilters currentStatus={searchParams.status || "all"} currentSearch={searchParams.search || ""} currentView={view} counts={counts} />

      {items.length === 0 ? (
        <div className="card p-16 text-center mt-4">
          <ImageIcon size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">{searchParams.search || searchParams.status ? "No artworks match your filters" : "No artworks yet"}</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">{searchParams.search || searchParams.status ? "Try adjusting your filters." : "Start building your inventory."}</p>
          {!searchParams.search && !searchParams.status && (
            <Link href="/dashboard/artworks/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Add Your First Artwork</Link>
          )}
        </div>
      ) : view === "table" ? (
        /* ─── Airtable-style Table View ─── */
        <div className="table-container mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="table-header">
              <tr>
                <th className="w-16">Image</th>
                <th>Title</th>
                <th>Medium / Type</th>
                <th>Year</th>
                <th>Dimensions</th>
                <th>Price</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {items.map((artwork) => {
                const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean).join(" × ");
                return (
                  <tr key={artwork.id} className="table-row cursor-pointer" onClick={() => {}}>
                    <td>
                      <Link href={`/dashboard/artworks/${artwork.id}`}>
                        <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden border border-slate-150">
                          {artwork.images?.[0] ? (
                            <img src={artwork.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon size={12} className="text-slate-300" /></div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/dashboard/artworks/${artwork.id}`} className="font-medium text-slate-800 hover:text-brand-600 transition-colors">
                        {artwork.title}
                      </Link>
                    </td>
                    <td className="text-slate-500">{artwork.medium || "—"}</td>
                    <td className="text-slate-500">{artwork.year || "—"}</td>
                    <td className="text-slate-500 font-mono text-xs">{dims ? `${dims} cm` : "—"}</td>
                    <td className="font-medium">{artwork.price != null ? `${artwork.currency} ${parseFloat(artwork.price).toLocaleString()}` : "—"}</td>
                    <td className="text-slate-500">{artwork.location || "—"}</td>
                    <td>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBadge[artwork.status] || "badge-available"}`}>
                        {statusLabel[artwork.status] || artwork.status}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">
                      {new Date(artwork.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "grid" ? (
        /* ─── Grid View ─── */
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((artwork) => (
            <Link key={artwork.id} href={`/dashboard/artworks/${artwork.id}`} className="card-hover group overflow-hidden">
              <div className="aspect-square bg-slate-75 overflow-hidden relative">
                {artwork.images?.[0] ? (
                  <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" strokeWidth={1} /></div>
                )}
                <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[artwork.status] || "badge-available"}`}>
                  {statusLabel[artwork.status] || artwork.status}
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-600 transition-colors">{artwork.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{[artwork.medium, artwork.year].filter(Boolean).join(" · ")}</p>
                {artwork.price != null && <p className="text-xs font-medium text-slate-600 mt-1">{artwork.currency} {parseFloat(artwork.price).toLocaleString()}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* ─── List View ─── */
        <div className="mt-4 card overflow-hidden">
          {items.map((artwork, idx) => (
            <Link key={artwork.id} href={`/dashboard/artworks/${artwork.id}`}
              className={`flex items-center gap-4 p-4 hover:bg-slate-25 transition-colors ${idx > 0 ? "border-t border-slate-100" : ""}`}>
              <div className="w-14 h-14 rounded bg-slate-75 border border-slate-150 shrink-0 overflow-hidden">
                {artwork.images?.[0] ? <img src={artwork.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-slate-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-800 truncate">{artwork.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{[artwork.medium, artwork.year].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {artwork.price != null && <span className="text-sm font-medium text-slate-700">{artwork.currency} {parseFloat(artwork.price).toLocaleString()}</span>}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[artwork.status] || "badge-available"}`}>{statusLabel[artwork.status] || artwork.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
