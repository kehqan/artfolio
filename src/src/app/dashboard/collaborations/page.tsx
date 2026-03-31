"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Handshake, Plus, X, Clock, CheckCircle, Circle } from "lucide-react";

type Collab = {
  id: string; title: string; description?: string; status: string;
  partner_name?: string; partner_email?: string; type?: string;
  deadline?: string; created_at: string; user_id: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "badge-available", "in progress": "badge-upcoming",
  completed: "badge-nfs", cancelled: "badge-sold",
};
const TYPES = ["Exhibition", "Commission", "Co-creation", "Mentorship", "Studio Share", "Event", "Other"];

export default function CollaborationsPage() {
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "Co-creation",
    partner_name: "", partner_email: "", deadline: "", status: "Open",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("collaborations").select("*").order("created_at", { ascending: false });
    setCollabs((data as Collab[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("collaborations").insert({ user_id: user.id, ...form });
    setShowForm(false);
    setForm({ title: "", description: "", type: "Co-creation", partner_name: "", partner_email: "", deadline: "", status: "Open" });
    load();
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const grouped = {
    open: collabs.filter((c) => c.status?.toLowerCase() === "open"),
    "in progress": collabs.filter((c) => c.status?.toLowerCase() === "in progress"),
    completed: collabs.filter((c) => c.status?.toLowerCase() === "completed"),
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Collaborations</h1>
          <p className="page-subtitle">Track partnerships, commissions, and joint projects</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Collaboration
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">New Collaboration</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input required className="input" value={form.title} onChange={set("title")} placeholder="e.g. Joint mural project" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="select" value={form.type} onChange={set("type")}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={set("status")}>
                    <option>Open</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="textarea" value={form.description} onChange={set("description")} placeholder="What is this collaboration about?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Partner Name</label>
                  <input className="input" value={form.partner_name} onChange={set("partner_name")} placeholder="Collaborator name" />
                </div>
                <div>
                  <label className="label">Partner Email</label>
                  <input type="email" className="input" value={form.partner_email} onChange={set("partner_email")} placeholder="email@example.com" />
                </div>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" className="input" value={form.deadline} onChange={set("deadline")} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : collabs.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="heading-sm mb-2">No collaborations yet</h3>
          <p className="body-lg mb-6">Track your partnerships and joint projects</p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Collaboration</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["open", "in progress", "completed"] as const).map((status) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3 px-1">
                {status === "open" ? <Circle className="w-4 h-4 text-emerald-500" /> :
                  status === "in progress" ? <Clock className="w-4 h-4 text-sky-500" /> :
                  <CheckCircle className="w-4 h-4 text-stone-400" />}
                <h3 className="text-sm font-semibold text-stone-700 capitalize">{status}</h3>
                <span className="ml-auto text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{grouped[status].length}</span>
              </div>
              <div className="space-y-3">
                {grouped[status].map((c) => (
                  <div key={c.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-stone-900">{c.title}</h4>
                      {c.type && <span className="badge badge-nfs text-[10px]">{c.type}</span>}
                    </div>
                    {c.description && <p className="text-xs text-stone-500 line-clamp-2 mb-2">{c.description}</p>}
                    {c.partner_name && <p className="text-xs text-stone-600">With: <span className="font-medium">{c.partner_name}</span></p>}
                    {c.deadline && <p className="text-xs text-stone-400 mt-1">Due: {new Date(c.deadline).toLocaleDateString()}</p>}
                  </div>
                ))}
                {grouped[status].length === 0 && (
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center text-xs text-stone-400">
                    No {status} collaborations
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
