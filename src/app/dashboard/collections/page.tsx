"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, FolderOpen, Lock, Globe, Edit2, Trash2 } from "lucide-react";

type Collection = {
  id: string; name: string; description?: string; is_public: boolean;
  created_at: string; artwork_count?: number; preview_images?: string[];
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCollections(); }, []);

  async function loadCollections() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("collections").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    const enriched = await Promise.all(data.map(async (c) => {
      const { data: artworks } = await supabase
        .from("collection_artworks").select("artwork_id, artworks(images)")
        .eq("collection_id", c.id).limit(4);
      const images = artworks?.flatMap((a: any) => a.artworks?.images?.slice(0, 1) || []) || [];
      return { ...c, artwork_count: artworks?.length || 0, preview_images: images };
    }));
    setCollections(enriched);
    setLoading(false);
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection?")) return;
    const supabase = createClient();
    await supabase.from("collections").delete().eq("id", id);
    setCollections((p) => p.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-subtitle">Group your artworks into series and themed sets</p>
        </div>
        <Link href="/dashboard/collections/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Collection
        </Link>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : collections.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="heading-sm mb-2">No collections yet</h3>
          <p className="body-lg mb-6">Organize your artworks into themed groups</p>
          <Link href="/dashboard/collections/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((c) => (
            <div key={c.id} className="card-hover overflow-hidden group">
              {/* Mosaic preview */}
              <div className={`grid h-36 bg-stone-100 ${c.preview_images && c.preview_images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {c.preview_images && c.preview_images.length > 0 ? (
                  c.preview_images.slice(0, 4).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-full h-full object-cover" style={{ maxHeight: c.preview_images!.length > 2 ? "50%" : "100%" }} />
                  ))
                ) : (
                  <div className="flex items-center justify-center">
                    <FolderOpen className="w-10 h-10 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-stone-900 truncate">{c.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.is_public ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-stone-400" />}
                    <Link href={`/dashboard/collections/${c.id}/edit`} className="p-1 hover:bg-stone-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    </Link>
                    <button onClick={() => deleteCollection(c.id)} className="p-1 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-stone-500 line-clamp-2 mb-2">{c.description}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{c.artwork_count} artworks</span>
                  <span className={`badge text-[10px] ${c.is_public ? "badge-available" : "badge-nfs"}`}>
                    {c.is_public ? "Public" : "Private"}
                  </span>
                </div>
                <Link href={`/dashboard/collections/${c.id}`} className="mt-3 w-full btn-secondary text-xs py-2 justify-center block text-center">
                  View Collection
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
