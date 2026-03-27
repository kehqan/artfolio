"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Star,
  TrendingUp,
  UserCheck,
  AlertCircle,
} from "lucide-react";

interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  last_purchase: string | null;
  total_spent: number;
  created_at: string;
}

const STATUS_OPTIONS = ["lead", "active", "vip", "inactive"];

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  vip: "bg-purple-100 text-purple-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "lead",
    notes: "",
    last_purchase: "",
    total_spent: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  async function handleSave() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      ...form,
      user_id: user.id,
      phone: form.phone || null,
      notes: form.notes || null,
      last_purchase: form.last_purchase || null,
      total_spent: Number(form.total_spent) || 0,
    };
    if (editingClient) {
      await supabase.from("clients").update(payload).eq("id", editingClient.id);
    } else {
      await supabase.from("clients").insert(payload);
    }
    resetForm();
    fetchClients();
  }

  async function handleDelete(id: string) {
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  }

  function startEdit(c: Client) {
    setEditingClient(c);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      status: c.status,
      notes: c.notes || "",
      last_purchase: c.last_purchase || "",
      total_spent: c.total_spent,
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingClient(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      status: "lead",
      notes: "",
      last_purchase: "",
      total_spent: 0,
    });
    setShowForm(false);
  }

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = clients.length;
  const activeCount = clients.filter((c) => c.status === "active").length;
  const vipCount = clients.filter((c) => c.status === "vip").length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your client relationships
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-indigo-50 text-indigo-600">
            <Users2 className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500 mt-1">Total Clients</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-green-50 text-green-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
          <div className="text-sm text-gray-500 mt-1">Active</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-purple-50 text-purple-600">
            <Star className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{vipCount}</div>
          <div className="text-sm text-gray-500 mt-1">VIP</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-amber-50 text-amber-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {"$" + totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">Total Revenue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={
                statusFilter === s
                  ? "px-3 py-2 rounded-lg text-sm capitalize bg-indigo-600 text-white"
                  : "px-3 py-2 rounded-lg text-sm capitalize bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            Loading clients...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400">No clients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Last Purchase
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-sm text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "px-2 py-1 rounded-full text-xs font-medium capitalize " +
                        (STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600")
                      }
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {c.last_purchase
                      ? new Date(c.last_purchase).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {"$" + (c.total_spent || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Client name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="client@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Purchase
                  </label>
                  <input
                    type="date"
                    value={form.last_purchase}
                    onChange={(e) =>
                      setForm({ ...form, last_purchase: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Spent ($)
                  </label>
                  <input
                    type="number"
                    value={form.total_spent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        total_spent: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Any notes about this client..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  {editingClient ? "Save Changes" : "Add Client"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
