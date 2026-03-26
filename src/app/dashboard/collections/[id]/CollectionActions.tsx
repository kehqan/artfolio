"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Artwork {
  id: string;
  title: string;
  images: string[];
  medium: string | null;
  year: number | null;
}

export default function CollectionActions({ collectionId, available }: { collectionId: string; available: Artwork[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function addArtwork(artworkId: string) {
    setAdding(artworkId);
    const supabase = createClient();
    await supabase.from("collection_artworks").insert({ collection_id: collectionId, artwork_id: artworkId });
    setAdding(null);
    router.refresh();
  }

  async function deleteCollection() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("collections").delete().eq("id", collectionId);
    router.push("/dashboard/collections");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Add Artwork Dropdown */}
      <div className="relative">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary !py-2 !px-4 text-xs">
          <PlusCircle size={14} /> Add Artwork
        </button>
        {showAdd && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAdd(false)} />
            <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-canvas-950 border border-canvas-800/60 shadow-xl z-20">
              {available.length === 0 ? (
                <p className="p-4 text-sm text-canvas-500">No artworks available to add.</p>
              ) : (
                available.map((artwork) => (
                  <button key={artwork.id} onClick={() => addArtwork(artwork.id)} disabled={adding === artwork.id}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-canvas-900/50 transition-colors border-b border-canvas-800/20 last:border-0 disabled:opacity-50">
                    <div className="w-10 h-10 bg-canvas-900 border border-canvas-800/40 shrink-0 overflow-hidden">
                      {artwork.images?.[0] ? (
                        <img src={artwork.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={12} className="text-canvas-700" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-canvas-200 truncate">{artwork.title}</p>
                      <p className="text-xs text-canvas-500 truncate">{artwork.medium || ""} {artwork.year || ""}</p>
                    </div>
                    {adding === artwork.id ? <Loader2 size={14} className="animate-spin text-accent-500" /> : <PlusCircle size={14} className="text-canvas-600" />}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Collection */}
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400">Delete collection?</span>
          <button onClick={deleteCollection} disabled={deleting} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50">
            {deleting ? <Loader2 size={12} className="animate-spin" /> : "Yes"}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 border border-canvas-700 text-canvas-400 text-xs">No</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-4 py-2 border border-canvas-800/60 text-canvas-500 text-xs uppercase tracking-wide hover:border-red-500/50 hover:text-red-400 transition-all">
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}
