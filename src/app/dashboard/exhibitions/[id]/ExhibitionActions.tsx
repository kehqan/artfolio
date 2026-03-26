"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Artwork { id: string; title: string; images: string[]; medium: string | null; year: number | null; }

export default function ExhibitionActions({ exhibitionId, available }: { exhibitionId: string; available: Artwork[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const router = useRouter();

  async function addArtwork(artworkId: string) {
    setAdding(artworkId);
    const supabase = createClient();
    await supabase.from("exhibition_artworks").insert({ exhibition_id: exhibitionId, artwork_id: artworkId });
    setAdding(null);
    router.refresh();
  }

  async function deleteExhibition() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("exhibitions").delete().eq("id", exhibitionId);
    router.push("/dashboard/exhibitions");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-xs !py-2"><PlusCircle size={14} /> Add Artwork</button>
        {showAdd && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAdd(false)} />
            <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 shadow-dropdown rounded-lg z-20">
              {available.length === 0 ? <p className="p-4 text-sm text-slate-400">No artworks available.</p> :
                available.map((a) => (
                  <button key={a.id} onClick={() => addArtwork(a.id)} disabled={adding === a.id}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 disabled:opacity-50">
                    <div className="w-10 h-10 rounded bg-slate-75 border border-slate-150 shrink-0 overflow-hidden">
                      {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={12} className="text-slate-300" /></div>}
                    </div>
                    <div className="min-w-0 flex-1"><p className="text-sm text-slate-700 truncate">{a.title}</p><p className="text-xs text-slate-400">{a.medium}</p></div>
                    {adding === a.id ? <Loader2 size={14} className="animate-spin text-brand-600" /> : <PlusCircle size={14} className="text-slate-400" />}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
      {confirmDel ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">Delete exhibition?</span>
          <button onClick={deleteExhibition} disabled={deleting} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md">{deleting ? <Loader2 size={12} className="animate-spin" /> : "Yes"}</button>
          <button onClick={() => setConfirmDel(false)} className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-md">No</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDel(true)} className="btn-danger text-xs !py-2"><Trash2 size={14} /> Delete</button>
      )}
    </div>
  );
}
