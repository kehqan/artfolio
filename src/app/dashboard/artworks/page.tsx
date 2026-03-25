import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Image as ImageIcon,
  Calendar,
  Tag,
  DollarSign,
} from "lucide-react";
import ArtworkFilters from "./ArtworkFilters";

const statusColors: Record<string, string> = {
  available: "bg-green-500/10 text-green-400 border-green-500/20",
  sold: "bg-red-500/10 text-red-400 border-red-500/20",
  not_for_sale: "bg-canvas-700/20 text-canvas-400 border-canvas-700/30",
  reserved: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  sold: "Sold",
  not_for_sale: "Not for Sale",
  reserved: "Reserved",
};

interface Props {
  searchParams: { status?: string; search?: string; view?: string };
}

export default async function ArtworksPage({ searchParams }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Build query
  let query = supabase
    .from("artworks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.search) {
    query = query.or(
      `title.ilike.%${searchParams.search}%,medium.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`
    );
  }

  const { data: artworks } = await query;
  const items = artworks || [];

  // Get status counts
  const { data: allArtworks } = await supabase
    .from("artworks")
    .select("status")
    .eq("user_id", user.id);

  const counts = {
    all: allArtworks?.length || 0,
    available: allArtworks?.filter((a) => a.status === "available").length || 0,
    sold: allArtworks?.filter((a) => a.status === "sold").length || 0,
    not_for_sale:
      allArtworks?.filter((a) => a.status === "not_for_sale").length || 0,
    reserved: allArtworks?.filter((a) => a.status === "reserved").length || 0,
  };

  const viewMode = searchParams.view || "grid";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="section-label">Inventory</span>
          <h1 className="heading-md mt-2">My Artworks</h1>
          <p className="text-sm text-canvas-500 mt-1">
            {counts.all} artwork{counts.all !== 1 ? "s" : ""} in your inventory
          </p>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary">
          <PlusCircle size={16} />
          Add Artwork
        </Link>
      </div>

      {/* Filters */}
      <ArtworkFilters
        currentStatus={searchParams.status || "all"}
        currentSearch={searchParams.search || ""}
        currentView={viewMode}
        counts={counts}
      />

      {/* Content */}
      {items.length === 0 ? (
        <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center mt-6">
          <ImageIcon
            size={40}
            className="text-canvas-700 mx-auto mb-4"
            strokeWidth={1}
          />
          <h2 className="font-display text-xl text-canvas-300">
            {searchParams.search || searchParams.status
              ? "No artworks match your filters"
              : "No artworks yet"}
          </h2>
          <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
            {searchParams.search || searchParams.status
              ? "Try adjusting your filters or search term."
              : "Start building your inventory by adding your first artwork."}
          </p>
          {!searchParams.search && !searchParams.status && (
            <Link
              href="/dashboard/artworks/new"
              className="btn-primary mt-6 inline-flex"
            >
              <PlusCircle size={16} />
              Add Your First Artwork
            </Link>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="mt-6 border border-canvas-800/40">
          {items.map((artwork, index) => (
            <Link
              key={artwork.id}
              href={`/dashboard/artworks/${artwork.id}`}
              className={`flex items-center gap-4 p-4 hover:bg-canvas-900/40 transition-colors ${
                index > 0 ? "border-t border-canvas-800/40" : ""
              }`}
            >
              <div className="w-16 h-16 bg-canvas-900 border border-canvas-800/40 shrink-0 overflow-hidden">
                {artwork.images?.[0] ? (
                  <img
                    src={artwork.images[0]}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={16} className="text-canvas-700" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-canvas-100 truncate">
                  {artwork.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-canvas-500">
                  {artwork.medium && <span>{artwork.medium}</span>}
                  {artwork.year && <span>{artwork.year}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {artwork.price != null && (
                  <span className="text-sm text-canvas-300">
                    {artwork.currency} {parseFloat(artwork.price).toLocaleString()}
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 border ${
                    statusColors[artwork.status] || statusColors.available
                  }`}
                >
                  {statusLabels[artwork.status] || artwork.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((artwork) => (
            <Link
              key={artwork.id}
              href={`/dashboard/artworks/${artwork.id}`}
              className="group border border-canvas-800/40 bg-canvas-900/20 hover:bg-canvas-900/40 transition-all duration-300 hover:border-canvas-700/60"
            >
              {/* Image */}
              <div className="aspect-square bg-canvas-900 overflow-hidden relative">
                {artwork.images?.[0] ? (
                  <img
                    src={artwork.images[0]}
                    alt={artwork.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon
                      size={32}
                      className="text-canvas-700"
                      strokeWidth={1}
                    />
                  </div>
                )}
                <span
                  className={`absolute top-3 right-3 text-[9px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 border ${
                    statusColors[artwork.status] || statusColors.available
                  }`}
                >
                  {statusLabels[artwork.status] || artwork.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-display text-base text-canvas-100 group-hover:text-accent-400 transition-colors truncate">
                  {artwork.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-canvas-500">
                  {artwork.medium && (
                    <span className="truncate">{artwork.medium}</span>
                  )}
                  {artwork.medium && artwork.year && (
                    <span className="text-canvas-700">·</span>
                  )}
                  {artwork.year && <span>{artwork.year}</span>}
                </div>
                {artwork.price != null && (
                  <p className="text-sm text-canvas-300 mt-2">
                    {artwork.currency}{" "}
                    {parseFloat(artwork.price).toLocaleString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
