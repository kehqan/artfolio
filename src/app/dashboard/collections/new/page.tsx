"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function NewCollectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", is_public: true });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("collections").insert({ user_id: user.id, ...form });
    if (!error) router.push("/dashboard/collections");
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/collections" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">New Collection</h1>
          <p className="page-subtitle">Group artworks into a named series or theme</p>
        </div>
      </div>
      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Collection Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Blue Period, 2024 Works..." />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="textarea" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What is this collection about?" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <input type="checkbox" id="public" checked={form.is_public} onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="public" className="text-sm text-stone-700 cursor-pointer">
              <span className="font-medium">Make public</span> — appears on your portfolio
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/collections" className="btn-secondary flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "Creating..." : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
