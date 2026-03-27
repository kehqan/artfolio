"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Globe, Lock, Image as ImageIcon, X } from "lucide-react";

type Artwork = { id: string; title: string; images?: string[]; status: string; medium?: string; year?: number; price?: number };
type Collection = { id: string; name?: string; title?: string; description?: string; is_public: boolean; user_id: string };

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: col } = await supabase.from("collections").select("*").eq("id", id).single();
    if (!col) { setLoading(false); return; }
    setCollection(col);

    const { data: colArtworks } = await supabase
      .from("collection_artworks")
      .select("artwork_id, artworks(*)")
      .eq("collection_id", id);

    const artworkList = (colArtworks || []).map((ca: any) => ca.artworks).filter(Boolean);
    setArtworks(artworkList);

    const { data: allA } = await supabase.from("artworks").select("id, title, images, status, medium, year, price").eq("user_id", user.id);
    setAllArtworks(allA || []);
    setLoading(false);
  }

  async function addArtwork(artworkId: string) {
    const supabase = createClient();
    await supabase.from("collection_artworks").insert({ collection_id: id, artwork_id: artworkId });
    setShowAdd(false);
    load();
  }

  async function removeArtwork(artworkId: string) {
    if (!confirm("Remove from collection?")) return;
    const supabase = createClient();
    await supabase.from("collection_artworks").delete().eq("collection_id", id).eq("artwork_id", artworkId);
    setArtworks(prev => prev.filter(a => a.id !== artworkId));
  }

  async function deleteCollection() {
    if (!confirm("Delete this collection? Artworks won't be deleted.")) return;
    const supabase = createClient();
    await supabase.from("collections").delete().eq("id", id);
    router.push("/dashboard/collections");
  }

  const collectionName = collection?.name || collection?.title || "Collection";
  const inCollectionIds = new Set(artworks.map(a => a.id));
  const availableToAdd = allArtworks.filter(a => !inCollectionIds.has(a.id));

  const STATUS_BADGE: Record<string, string> = {
    available: "badge-available", Available: "badge-available",
    sold: "badge-sold", Sold: "badge-sold",
    reserved: "badge-reserved", Reserved: "badge-reserved",
  };

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;
  if (!collection) return <div className="card p-12 text-center text-stone-400">Collection not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/collections" className="btn-ghost mt-1"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">{collectionName}</h1>
              {collection.is_public
                ? <Globe className="w-4 h-4 text-emerald-500" />
                : <Lock className="w-4 h-4 text-stone-400" />}
            </div>
            {collection.description && <p className="page-subtitle mt-1">{collection.description}</p>}
            <p className="text-xs text-stone-400 mt-1">{artworks.length} artworks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/collections/${id}/edit`} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
          <button onClick={deleteCollection} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Add artwork modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm">Add Artwork to Collection</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {availableToAdd.length === 0 ? (
              <p className="text-stone-500 text-sm py-8 text-center">All your artworks are already in this collection.</p>
            ) : (
              <div className="overflow-y-auto space-y-2">
                {availableToAdd.map(a => (
                  <button key={a.id} onClick={() => addArtwork(a.id)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-stone-50 rounded-xl text-left transition-colors">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                      {a.images?.[0]
                        ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-stone-300" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                      <p className="text-xs text-stone-500">{[a.medium, a.year].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className={STATUS_BADGE[a.status] || "badge-nfs"}>{a.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Artworks grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-sm">Artworks</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Artwork
        </button>
      </div>

      {artworks.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="heading-sm mb-2">No artworks yet</h3>
          <p className="body-lg mb-6">Add artworks to this collection</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Artwork</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {artworks.map(a => (
            <div key={a.id} className="card-hover overflow-hidden group">
              <div className="aspect-square bg-stone-100">
                {a.images?.[0]
                  ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={STATUS_BADGE[a.status] || "badge-nfs"}>{a.status}</span>
                  <button onClick={() => removeArtwork(a.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded text-rose-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
