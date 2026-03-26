"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewExhibitionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planning");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in."); setSaving(false); return; }
    const { data, error: err } = await supabase.from("exhibitions").insert({
      user_id: user.id, title: title.trim(), description: description.trim() || null, venue: venue.trim() || null,
      start_date: startDate || null, end_date: endDate || null, status, is_public: isPublic,
    }).select("id").single();
    if (err) { setError("Failed to create exhibition."); setSaving(false); return; }
    router.push(`/dashboard/exhibitions/${data.id}`);
    router.refresh();
  }

  const statuses = [
    { value: "planning", label: "Planning" },
    { value: "upcoming", label: "Upcoming" },
    { value: "current", label: "Current" },
    { value: "past", label: "Past" },
  ];

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/exhibitions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="heading-md mb-6">New Exhibition</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exhibition name" className="input-field" /></div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="About this exhibition..." className="input-field resize-none" /></div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Venue</label>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Gallery name or location" className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" /></div>
        </div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status</label>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={`px-3 py-2 text-xs font-medium rounded-md border transition-all ${status === s.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setIsPublic(true)} className={`px-3 py-2 text-xs font-medium rounded-md border transition-all ${isPublic ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>Public</button>
          <button type="button" onClick={() => setIsPublic(false)} className={`px-3 py-2 text-xs font-medium rounded-md border transition-all ${!isPublic ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>Private</button>
        </div>
        <div className="pt-4 border-t border-slate-150">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Save size={16} /> Create Exhibition</>}
          </button>
        </div>
      </form>
    </div>
  );
}
