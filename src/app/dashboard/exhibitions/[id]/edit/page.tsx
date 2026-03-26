"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EditExhibitionPage() {
  const params = useParams();
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState(""); const [status, setStatus] = useState("planning");
  const [isPublic, setIsPublic] = useState(true); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("exhibitions").select("*").eq("id", params.id).single();
      if (data) { setTitle(data.title); setDescription(data.description || ""); setVenue(data.venue || "");
        setStartDate(data.start_date || ""); setEndDate(data.end_date || ""); setStatus(data.status || "planning"); setIsPublic(data.is_public); }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    await supabase.from("exhibitions").update({ title, description: description || null, venue: venue || null, start_date: startDate || null, end_date: endDate || null, status, is_public: isPublic, updated_at: new Date().toISOString() }).eq("id", params.id);
    router.push(`/dashboard/exhibitions/${params.id}`); router.refresh();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>;
  const statuses = ["planning","upcoming","current","past"];

  return (
    <div className="max-w-2xl">
      <Link href={`/dashboard/exhibitions/${params.id}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="heading-md mb-6">Edit Exhibition</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Title</label><input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" /></div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" /></div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Venue</label><input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" /></div>
        </div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status</label>
          <div className="flex gap-2">{statuses.map((s) => (<button key={s} type="button" onClick={() => setStatus(s)} className={`px-3 py-2 text-xs font-medium rounded-md border capitalize transition-all ${status === s ? "bg-slate-900 text-white border-slate-900" : "text-slate-500 border-slate-200"}`}>{s}</button>))}</div></div>
        <div className="pt-4 border-t border-slate-150"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Update</>}</button></div>
      </form>
    </div>
  );
}
