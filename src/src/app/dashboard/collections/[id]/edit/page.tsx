"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function EditCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState({ name: "", description: "", is_public: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("collections").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setForm({ name: data.name || data.title || "", description: data.description || "", is_public: data.is_public ?? true });
      setLoading(false);
    });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("collections").update({ name: form.name, title: form.name, description: form.description, is_public: form.is_public }).eq("id", id);
    router.push(`/dashboard/collections/${id}`);
  }

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/collections/${id}`} className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">Edit Collection</h1>
          <p className="page-subtitle">Update collection details</p>
        </div>
      </div>
      <div className="max-w-lg">
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div>
            <label className="label">Collection Name *</label>
            <input required className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <input type="checkbox" id="public" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="public" className="text-sm text-stone-700 cursor-pointer">
              <span className="font-medium">Make public</span> — appears on your portfolio
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href={`/dashboard/collections/${id}`} className="btn-secondary flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
