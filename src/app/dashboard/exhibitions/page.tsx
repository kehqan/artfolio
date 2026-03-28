"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, LayoutGrid, MapPin, Calendar, Trash2, Edit2 } from "lucide-react";

type Exhibition = {
  id: string; title: string; description?: string; venue?: string;
  start_date?: string; end_date?: string; status: string;
  is_public: boolean; cover_image?: string; artwork_count?: number;
};

const STATUS_BADGE: Record<string, string> = {
  planning: "badge-planning", upcoming: "badge-upcoming",
  current: "badge-current", past: "badge-past",
};

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("exhibitions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const enriched = await Promise.all((data || []).map(async (ex) => {
      const { count } = await supabase.from("exhibition_artworks").select("*", { count: "exact", head: true }).eq("exhibition_id", ex.id);
      return { ...ex, artwork_count: count || 0 };
    }));
    setExhibitions(enriched);
    setLoading(false);
  }

  async function deleteExhibition(id: string) {
    if (!confirm("Delete this exhibition?")) return;
    const supabase = createClient();
    await supabase.from("exhibitions").delete().eq("id", id);
    setExhibitions((p) => p.filter((e) => e.id !== id));
  }

  function formatDate(d?: string) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Exhibitions</h1>
          <p className="page-subtitle">Plan and track your shows and appearances</p>
        </div>
        <Link href="/dashboard/exhibitions/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Exhibition
        </Link>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : exhibitions.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="heading-sm mb-2">No exhibitions yet</h3>
          <p className="body-lg mb-6">Plan your first show or exhibition</p>
          <Link href="/dashboard/exhibitions/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create Exhibition
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exhibitions.map((ex) => (
            <div key={ex.id} className="card-hover overflow-hidden group">
              <div className="h-36 bg-stone-100">
                {ex.cover_image ? (
                  <img src={ex.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutGrid className="w-10 h-10 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-stone-900">{ex.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Link href={`/dashboard/exhibitions/${ex.id}/edit`} className="p-1 hover:bg-stone-100 rounded"><Edit2 className="w-3.5 h-3.5 text-stone-500" /></Link>
                    <button onClick={() => deleteExhibition(ex.id)} className="p-1 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-500" /></button>
                  </div>
                </div>
                <span className={STATUS_BADGE[ex.status?.toLowerCase()] || "badge-nfs"}>{ex.status}</span>
                {ex.venue && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2">
                    <MapPin className="w-3 h-3" /> {ex.venue}
                  </div>
                )}
                {(ex.start_date || ex.end_date) && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ex.start_date)}
                    {ex.end_date && ` — ${formatDate(ex.end_date)}`}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-stone-400">{ex.artwork_count} artworks</span>
                  <Link href={`/dashboard/exhibitions/${ex.id}`} className="text-xs text-emerald-600 font-semibold hover:underline">View →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
