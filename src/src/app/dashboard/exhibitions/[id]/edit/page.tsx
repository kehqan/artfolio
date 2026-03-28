"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function EditExhibitionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState({ title: "", description: "", venue: "", start_date: "", end_date: "", status: "Planning", is_public: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("exhibitions").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setForm({ title: data.title || "", description: data.description || "", venue: data.venue || "", start_date: data.start_date || "", end_date: data.end_date || "", status: data.status || "Planning", is_public: data.is_public ?? true });
      setLoading(false);
    });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("exhibitions").update({ ...form, start_date: form.start_date || null, end_date: form.end_date || null }).eq("id", id);
    router.push(`/dashboard/exhibitions/${id}`);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/exhibitions/${id}`} className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div><h1 className="page-title">Edit Exhibition</h1><p className="page-subtitle">Update exhibition details</p></div>
      </div>
      <div className="max-w-lg">
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div><label className="label">Title *</label><input required className="input" value={form.title} onChange={set("title")} /></div>
          <div><label className="label">Description</label><textarea rows={3} className="textarea" value={form.description} onChange={set("description")} /></div>
          <div><label className="label">Venue</label><input className="input" value={form.venue} onChange={set("venue")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date} onChange={set("start_date")} /></div>
            <div><label className="label">End Date</label><input type="date" className="input" value={form.end_date} onChange={set("end_date")} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={set("status")}>
              <option>Planning</option><option>Upcoming</option><option>Current</option><option>Past</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <input type="checkbox" id="public" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="public" className="text-sm text-stone-700 cursor-pointer"><span className="font-medium">Make public</span></label>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href={`/dashboard/exhibitions/${id}`} className="btn-secondary flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
