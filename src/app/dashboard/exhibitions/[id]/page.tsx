"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Edit2, Trash2, MapPin, Calendar, Plus, X, Image as ImageIcon } from "lucide-react";

type Exhibition = { id: string; title: string; description?: string; venue?: string; start_date?: string; end_date?: string; status: string; is_public: boolean; cover_image?: string };
type Artwork = { id: string; title: string; images?: string[]; status: string };

const STATUS_BADGE: Record<string, string> = { planning: "badge-planning", Planning: "badge-planning", upcoming: "badge-upcoming", Upcoming: "badge-upcoming", current: "badge-current", Current: "badge-current", past: "badge-past", Past: "badge-past" };

export default function ExhibitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ex }, { data: exArtworks }, { data: allA }] = await Promise.all([
      supabase.from("exhibitions").select("*").eq("id", id).single(),
      supabase.from("exhibition_artworks").select("artwork_id, artworks(*)").eq("exhibition_id", id),
      supabase.from("artworks").select("id, title, images, status").eq("user_id", user.id),
    ]);
    setExhibition(ex);
    setArtworks((exArtworks || []).map((ea: any) => ea.artworks).filter(Boolean));
    setAllArtworks(allA || []);
    setLoading(false);
  }

  async function addArtwork(artworkId: string) {
    const supabase = createClient();
    await supabase.from("exhibition_artworks").insert({ exhibition_id: id, artwork_id: artworkId });
    setShowAdd(false);
    load();
  }

  async function removeArtwork(artworkId: string) {
    const supabase = createClient();
    await supabase.from("exhibition_artworks").delete().eq("exhibition_id", id).eq("artwork_id", artworkId);
    setArtworks(p => p.filter(a => a.id !== artworkId));
  }

  async function deleteExhibition() {
    if (!confirm("Delete this exhibition?")) return;
    const supabase = createClient();
    await supabase.from("exhibitions").delete().eq("id", id);
    router.push("/dashboard/exhibitions");
  }

  function formatDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""; }

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;
  if (!exhibition) return <div className="card p-12 text-center text-stone-400">Exhibition not found</div>;

  const inIds = new Set(artworks.map(a => a.id));

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/exhibitions" className="btn-ghost mt-1"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">{exhibition.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={STATUS_BADGE[exhibition.status] || "badge-nfs"}>{exhibition.status}</span>
              {exhibition.venue && <span className="flex items-center gap-1 text-xs text-stone-500"><MapPin className="w-3 h-3" />{exhibition.venue}</span>}
              {(exhibition.start_date || exhibition.end_date) && (
                <span className="flex items-center gap-1 text-xs text-stone-500"><Calendar className="w-3 h-3" />{formatDate(exhibition.start_date)}{exhibition.end_date && ` — ${formatDate(exhibition.end_date)}`}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/exhibitions/${id}/edit`} className="btn-secondary"><Edit2 className="w-4 h-4" /> Edit</Link>
          <button onClick={deleteExhibition} className="btn-danger"><Trash2 className="w-4 h-4" /> Delete</button>
        </div>
      </div>

      {exhibition.description && (
        <div className="card p-5 mb-6"><p className="text-stone-600">{exhibition.description}</p></div>
      )}

      {/* Add artwork modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm">Add Artwork to Exhibition</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {allArtworks.filter(a => !inIds.has(a.id)).map(a => (
                <button key={a.id} onClick={() => addArtwork(a.id)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-stone-50 rounded-xl text-left">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-stone-300" /></div>}
                  </div>
                  <p className="text-sm font-medium text-stone-900">{a.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-sm">Artworks <span className="text-stone-400 font-normal text-sm">({artworks.length})</span></h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Artwork</button>
      </div>

      {artworks.length === 0 ? (
        <div className="card p-12 text-center">
          <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 mb-4">No artworks selected yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Artwork</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artworks.map(a => (
            <div key={a.id} className="card-hover overflow-hidden group">
              <div className="aspect-square bg-stone-100">
                {a.images?.[0] ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                <button onClick={() => removeArtwork(a.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded text-rose-500 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
