import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Image as ImageIcon } from "lucide-react";
import CollectionActions from "./CollectionActions";

interface Props { params: { id: string } }

export default async function CollectionDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collection } = await supabase
    .from("collections").select("*").eq("id", params.id).eq("user_id", user.id).single();
  if (!collection) notFound();

  // Get artworks in this collection
  const { data: links } = await supabase
    .from("collection_artworks")
    .select("artwork_id, sort_order, artworks(*)")
    .eq("collection_id", params.id)
    .order("sort_order", { ascending: true });
  const artworks = (links || []).map((l: any) => l.artworks).filter(Boolean);

  // Get all user artworks not in this collection (for adding)
  const inIds = artworks.map((a: any) => a.id);
  let availableQuery = supabase.from("artworks").select("id, title, images, medium, year").eq("user_id", user.id).order("created_at", { ascending: false });
  if (inIds.length > 0) {
    availableQuery = availableQuery.not("id", "in", `(${inIds.join(",")})`);
  }
  const { data: available } = await availableQuery;

  return (
    <div>
      <Link href="/dashboard/collections" className="inline-flex items-center gap-2 text-sm text-slate-9000 hover:text-slate-600 transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Collections
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="heading-md">{collection.title}</h1>
            {!collection.is_public && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 border border-slate-200 text-slate-9000">Private</span>
            )}
          </div>
          {collection.description && <p className="text-sm text-slate-500 mt-1">{collection.description}</p>}
          <p className="text-xs text-slate-400 mt-2">{artworks.length} artwork{artworks.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/collections/${collection.id}/edit`} className="btn-secondary !py-2 !px-4 text-xs">
            <Pencil size={14} /> Edit
          </Link>
        </div>
      </div>

      <CollectionActions collectionId={collection.id} available={available || []} />

      {/* Artwork Grid */}
      {artworks.length === 0 ? (
        <div className="border border-slate-150 bg-slate-50 p-16 text-center mt-6">
          <ImageIcon size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">No artworks in this collection</h2>
          <p className="text-sm text-slate-9000 mt-2">Use the dropdown above to add artworks.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artworks.map((artwork: any) => (
            <Link key={artwork.id} href={`/dashboard/artworks/${artwork.id}`}
              className="group border border-slate-150 bg-slate-50 hover:bg-slate-50 transition-all">
              <div className="aspect-square bg-slate-50 overflow-hidden">
                {artwork.images?.[0] ? (
                  <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon size={24} className="text-slate-300" /></div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm text-slate-700 truncate group-hover:text-brand-600 transition-colors">{artwork.title}</h3>
                {artwork.medium && <p className="text-xs text-slate-9000 mt-0.5 truncate">{artwork.medium}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
