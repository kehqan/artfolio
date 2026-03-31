"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Edit2, Trash2, X, Users } from "lucide-react";

type Client = {
  id: string; name: string; email?: string; phone?: string;
  total_spent: number; purchases: number; status: string;
  notes?: string; last_purchase?: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: "badge-available", vip: "badge-storage", inactive: "badge-nfs",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "active", notes: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (editingId) {
      await supabase.from("clients").update(form).eq("id", editingId);
    } else {
      await supabase.from("clients").insert({ ...form, user_id: user.id });
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", status: "active", notes: "" });
    load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    const supabase = createClient();
    await supabase.from("clients").delete().eq("id", id);
    setClients((p) => p.filter((c) => c.id !== id));
  }

  function startEdit(client: Client) {
    setForm({ name: client.name, email: client.email || "", phone: client.phone || "", status: client.status, notes: client.notes || "" });
    setEditingId(client.id);
    setShowForm(true);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = clients.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = clients.reduce((s, c) => s + (c.total_spent || 0), 0);
  const vipCount = clients.filter((c) => c.status === "vip").length;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your collector and buyer relationships</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", email: "", phone: "", status: "active", notes: "" }); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-semibold text-stone-900">{clients.length}</p>
          <p className="text-xs text-stone-500 mt-1">Total Clients</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-semibold text-stone-900">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-stone-500 mt-1">Total Revenue</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-semibold text-stone-900">{vipCount}</p>
          <p className="text-xs text-stone-500 mt-1">VIP Clients</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">{editingId ? "Edit Client" : "Add Client"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="label">Name *</label><input required className="input" value={form.name} onChange={set("name")} placeholder="Client name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set("email")} placeholder="email@example.com" /></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set("phone")} placeholder="+1 555 000" /></div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={set("status")}>
                  <option value="active">Active</option><option value="vip">VIP</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div><label className="label">Notes</label><textarea rows={2} className="textarea" value={form.notes} onChange={set("notes")} placeholder="Internal notes..." /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="heading-sm mb-2">No clients yet</h3>
          <p className="body-lg mb-6">Add your collectors and buyers</p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Purchases</th><th>Total Spent</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><span className="font-medium text-stone-900">{c.name}</span></td>
                  <td className="text-stone-500 text-sm">{c.email || "—"}</td>
                  <td className="text-stone-500 text-sm">{c.phone || "—"}</td>
                  <td className="text-stone-600">{c.purchases || 0}</td>
                  <td className="font-mono text-sm">${(c.total_spent || 0).toLocaleString()}</td>
                  <td><span className={STATUS_BADGE[c.status] || "badge-nfs"}>{c.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(c)} className="btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
