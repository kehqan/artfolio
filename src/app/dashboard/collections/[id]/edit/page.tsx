"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EditCollectionPage() {
  const params = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("collections").select("*").eq("id", params.id).single();
      if (data) { setTitle(data.title); setDescription(data.description || ""); setIsPublic(data.is_public); }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("collections").update({
      title: title.trim(), description: description.trim() || null, is_public: isPublic, updated_at: new Date().toISOString(),
    }).eq("id", params.id);
    if (err) { setError("Failed to update."); setSaving(false); return; }
    router.push(`/dashboard/collections/${params.id}`);
    router.refresh();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-9000" /></div>;

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all";

  return (
    <div className="max-w-2xl">
      <Link href={`/dashboard/collections/${params.id}`} className="inline-flex items-center gap-2 text-sm text-slate-9000 hover:text-slate-600 transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Collection
      </Link>
      <div className="mb-8"><span className="section-label">Edit</span><h1 className="heading-md mt-2">Edit Collection</h1></div>
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">Title</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></div>
        <div><label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
        <div><label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-3">Visibility</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-2.5 border text-sm transition-all ${isPublic ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-9000"}`}>Public</button>
            <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-2.5 border text-sm transition-all ${!isPublic ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-9000"}`}>Private</button>
          </div></div>
        <div className="pt-4 border-t border-slate-150">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Update Collection</>}
          </button>
        </div>
      </form>
    </div>
  );
}
