"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewCollectionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); setSaving(false); return; }

    const { data, error: insertError } = await supabase
      .from("collections")
      .insert({ user_id: user.id, title: title.trim(), description: description.trim() || null, is_public: isPublic })
      .select("id")
      .single();

    if (insertError) { setError("Failed to create collection."); console.error(insertError); setSaving(false); return; }
    router.push(`/dashboard/collections/${data.id}`);
    router.refresh();
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all";

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/collections" className="inline-flex items-center gap-2 text-sm text-slate-9000 hover:text-slate-600 transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Collections
      </Link>
      <div className="mb-8">
        <span className="section-label">New</span>
        <h1 className="heading-md mt-2">Create Collection</h1>
      </div>
      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">Title <span className="text-red-600">*</span></label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Collection name" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this collection about?" className={`${inputClass} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-3">Visibility</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsPublic(true)} className={`px-4 py-2.5 border text-sm transition-all ${isPublic ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-9000 hover:border-slate-300"}`}>Public</button>
            <button type="button" onClick={() => setIsPublic(false)} className={`px-4 py-2.5 border text-sm transition-all ${!isPublic ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-200 text-slate-9000 hover:border-slate-300"}`}>Private</button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Public collections appear on your portfolio page.</p>
        </div>
        <div className="pt-4 border-t border-slate-150">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Save size={16} /> Create Collection</>}
          </button>
        </div>
      </form>
    </div>
  );
}
