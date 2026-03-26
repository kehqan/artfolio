import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, FolderOpen, Image as ImageIcon } from "lucide-react";

export default async function CollectionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collections } = await supabase
    .from("collections")
    .select("*, collection_artworks(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get cover images for each collection
  const items = collections || [];
  const enriched = await Promise.all(
    items.map(async (col) => {
      const { data: links } = await supabase
        .from("collection_artworks")
        .select("artwork_id, artworks(images)")
        .eq("collection_id", col.id)
        .order("sort_order", { ascending: true })
        .limit(4);
      const previews = (links || [])
        .map((l: any) => l.artworks?.images?.[0])
        .filter(Boolean);
      const artworkCount = (col as any).collection_artworks?.[0]?.count || 0;
      return { ...col, previews, artworkCount };
    })
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="section-label">Organize</span>
          <h1 className="heading-md mt-2">My Collections</h1>
          <p className="text-sm text-slate-9000 mt-1">
            {items.length} collection{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/collections/new" className="btn-primary">
          <PlusCircle size={16} />
          New Collection
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="border border-slate-150 bg-slate-50 p-16 text-center">
          <FolderOpen size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">No collections yet</h2>
          <p className="text-sm text-slate-9000 mt-2 max-w-sm mx-auto">
            Create collections to group your artworks for exhibitions, series, or portfolios.
          </p>
          <Link href="/dashboard/collections/new" className="btn-primary mt-6 inline-flex">
            <PlusCircle size={16} />
            Create Your First Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map((col) => (
            <Link
              key={col.id}
              href={`/dashboard/collections/${col.id}`}
              className="group border border-slate-150 bg-slate-50 hover:bg-slate-50 transition-all duration-300"
            >
              <div className="aspect-[3/2] bg-slate-50 overflow-hidden">
                {col.previews.length > 0 ? (
                  <div className="grid grid-cols-2 h-full gap-px bg-slate-100">
                    {col.previews.slice(0, 4).map((img: string, i: number) => (
                      <div key={i} className="bg-slate-50 overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ))}
                    {col.previews.length < 4 &&
                      [...Array(4 - col.previews.length)].map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50 flex items-center justify-center">
                          <ImageIcon size={16} className="text-slate-200" />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen size={32} className="text-slate-300" strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display text-base text-slate-800 group-hover:text-brand-600 transition-colors">
                  {col.title}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-9000">
                  <span>{col.artworkCount} artwork{col.artworkCount !== 1 ? "s" : ""}</span>
                  {!col.is_public && <span className="text-slate-400">· Private</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
