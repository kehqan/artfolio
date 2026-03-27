"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function NewExhibitionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", venue: "", start_date: "", end_date: "",
    status: "Planning", is_public: true,h
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("exhibitions").insert({ user_id: user.id, ...form, start_date: form.start_date || null, end_date: form.end_date || null });
    router.push("/dashboard/exhibitions");
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/exhibitions" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">New Exhibition</h1>
          <p className="page-subtitle">Plan a show or exhibition</p>
        </div>
      </div>
      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Exhibition Title *</label>
            <input required className="input" value={form.title} onChange={set("title")} placeholder="Exhibition name" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="textarea" value={form.description} onChange={set("description")} placeholder="About this exhibition..." />
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input" value={form.venue} onChange={set("venue")} placeholder="Gallery name, location..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={set("start_date")} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date} onChange={set("end_date")} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={set("status")}>
              <option>Planning</option><option>Upcoming</option><option>Current</option><option>Past</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
            <input type="checkbox" id="public" checked={form.is_public} onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="public" className="text-sm text-stone-700 cursor-pointer">
              <span className="font-medium">Make public</span> — visible on your portfolio
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/exhibitions" className="btn-secondary flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? "Creating..." : "Create Exhibition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
