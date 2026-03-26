"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error: err } = await supabase.from("clients").insert({
      user_id: user.id, name: name.trim(), email: email.trim() || null,
      phone: phone.trim() || null, status, notes: notes.trim() || null,
    });
    if (err) { setError("Failed to add client."); setSaving(false); return; }
    router.push("/dashboard/clients");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Client</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="input-field" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="input-field" /></div>
        </div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status</label>
          <div className="flex gap-2">
            {["active", "vip", "inactive"].map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border capitalize transition-all ${status === s ? "bg-slate-900 text-white border-slate-900" : "text-slate-500 border-slate-200 hover:border-slate-300"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes about this client..." className="input-field resize-none" /></div>
        <div className="pt-4 border-t border-slate-100">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : <><Save size={16} /> Add Client</>}
          </button>
        </div>
      </form>
    </div>
  );
}
