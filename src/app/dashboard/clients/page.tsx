"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Users, Search, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setClients(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const totalClients = clients.length;
  const vipClients = clients.filter((c) => c.status === "vip").length;
  const avgPurchase = clients.length > 0 ? clients.reduce((s: number, c: any) => s + (parseFloat(c.total_spent) || 0), 0) / clients.length : 0;

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    vip: "bg-purple-50 text-purple-600 border border-purple-200",
    inactive: "bg-slate-100 text-slate-500 border border-slate-200",
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your client relationships and purchase history</p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary"><PlusCircle size={16} /> Add Client</Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..." className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-2">Total Clients</p>
          <p className="text-[28px] font-bold text-slate-900 leading-none">{totalClients}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-2">VIP Clients</p>
          <p className="text-[28px] font-bold text-slate-900 leading-none">{vipClients}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-2">Average Purchase</p>
          <p className="text-[28px] font-bold text-slate-900 leading-none">${avgPurchase.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-lg font-semibold text-slate-600">{search ? "No clients match your search" : "No clients yet"}</h2>
          <p className="text-sm text-slate-400 mt-2">Add your first client to start tracking relationships.</p>
          {!search && <Link href="/dashboard/clients/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Add First Client</Link>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchases</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Purchase</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client: any) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{client.name}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.email && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={11} />{client.email}</div>}
                        {client.phone && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} />{client.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client.purchases || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">${(parseFloat(client.total_spent) || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{client.last_purchase ? new Date(client.last_purchase).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusStyle[client.status] || statusStyle.active}`}>
                        {client.status || "active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {clients.length} clients</p>
          </div>
        </div>
      )}
    </div>
  );
}
