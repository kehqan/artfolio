"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, CheckCircle2, Settings, Palette, Type, Layout, Globe, Users, BarChart3, RefreshCw } from "lucide-react";

interface SettingsMap { [key: string]: any; }

const tabs = [
  { id: "site", label: "Site Config", icon: Settings },
  { id: "hero", label: "Landing Hero", icon: Layout },
  { id: "features", label: "Features Text", icon: Type },
  { id: "stats", label: "Platform Stats", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "data", label: "Data Overview", icon: Globe },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("site");
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [dataCounts, setDataCounts] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();

    // Load settings
    const { data: settingsData } = await supabase.from("admin_settings").select("*");
    const map: SettingsMap = {};
    (settingsData || []).forEach((s: any) => { map[s.key] = s.value; });
    setSettings(map);

    // Load users
    const { data: profilesData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(profilesData || []);

    // Load counts
    const { count: artworks } = await supabase.from("artworks").select("*", { count: "exact", head: true });
    const { count: collections } = await supabase.from("collections").select("*", { count: "exact", head: true });
    const { count: exhibitions } = await supabase.from("exhibitions").select("*", { count: "exact", head: true });
    const { count: sales } = await supabase.from("sales").select("*", { count: "exact", head: true });
    const { count: posts } = await supabase.from("posts").select("*", { count: "exact", head: true });
    setDataCounts({ artworks, collections, exhibitions, sales, posts, users: profilesData?.length || 0 });

    setLoading(false);
  }

  async function saveSettings(key: string, value: any) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("admin_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    if (!error) {
      setSaved(key);
      setTimeout(() => setSaved(""), 2000);
    }
    setSaving(false);
  }

  function updateSetting(key: string, field: string, value: string) {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  const inputClass = "input-field";
  const labelClass = "block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5";

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-md">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your platform content, design, and data</p>
        </div>
        <button onClick={loadAll} className="btn-secondary text-xs"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-slate-150 pb-3">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Site Config */}
      {activeTab === "site" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-display text-lg text-slate-800 mb-4">Site Configuration</h2>
          <div className="space-y-4">
            <div><label className={labelClass}>Site Name</label>
              <input type="text" value={settings.site_config?.site_name || ""} onChange={(e) => updateSetting("site_config", "site_name", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Tagline</label>
              <input type="text" value={settings.site_config?.tagline || ""} onChange={(e) => updateSetting("site_config", "tagline", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Description</label>
              <textarea value={settings.site_config?.description || ""} onChange={(e) => updateSetting("site_config", "description", e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
            <div><label className={labelClass}>Primary Brand Color (hex)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.site_config?.primary_color || "#16a34a"} onChange={(e) => updateSetting("site_config", "primary_color", e.target.value)} className="w-10 h-10 rounded border border-slate-200 cursor-pointer" />
                <input type="text" value={settings.site_config?.primary_color || "#16a34a"} onChange={(e) => updateSetting("site_config", "primary_color", e.target.value)} className={`${inputClass} !w-32`} />
              </div>
            </div>
            <div><label className={labelClass}>Logo Letter</label>
              <input type="text" maxLength={2} value={settings.site_config?.logo_text || "A"} onChange={(e) => updateSetting("site_config", "logo_text", e.target.value)} className={`${inputClass} !w-20`} /></div>
            <div className="pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings("site_config", settings.site_config)} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved === "site_config" ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landing Hero */}
      {activeTab === "hero" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-display text-lg text-slate-800 mb-4">Landing Page Hero</h2>
          <div className="space-y-4">
            <div><label className={labelClass}>Hero Title</label>
              <input type="text" value={settings.landing_hero?.title || ""} onChange={(e) => updateSetting("landing_hero", "title", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Hero Subtitle</label>
              <textarea value={settings.landing_hero?.subtitle || ""} onChange={(e) => updateSetting("landing_hero", "subtitle", e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Primary Button Text</label>
                <input type="text" value={settings.landing_hero?.cta_primary || ""} onChange={(e) => updateSetting("landing_hero", "cta_primary", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Secondary Button Text</label>
                <input type="text" value={settings.landing_hero?.cta_secondary || ""} onChange={(e) => updateSetting("landing_hero", "cta_secondary", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings("landing_hero", settings.landing_hero)} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved === "landing_hero" ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Text */}
      {activeTab === "features" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-display text-lg text-slate-800 mb-4">Features Section</h2>
          <div className="space-y-4">
            <div><label className={labelClass}>Section Title</label>
              <input type="text" value={settings.landing_features?.section_title || ""} onChange={(e) => updateSetting("landing_features", "section_title", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Section Subtitle</label>
              <textarea value={settings.landing_features?.section_subtitle || ""} onChange={(e) => updateSetting("landing_features", "section_subtitle", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></div>
            <div className="pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings("landing_features", settings.landing_features)} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved === "landing_features" ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Stats */}
      {activeTab === "stats" && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-display text-lg text-slate-800 mb-4">Platform Stats (shown on landing page)</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Stat {n} Label</label>
                  <input type="text" value={settings.platform_stats?.[`stat${n}_label`] || ""} onChange={(e) => updateSetting("platform_stats", `stat${n}_label`, e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Stat {n} Value</label>
                  <input type="text" value={settings.platform_stats?.[`stat${n}_value`] || ""} onChange={(e) => updateSetting("platform_stats", `stat${n}_value`, e.target.value)} className={inputClass} /></div>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings("platform_stats", settings.platform_stats)} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saved === "platform_stats" ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div>
          <div className="card p-4 mb-4 flex items-center gap-6">
            <div><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</span><p className="text-2xl font-semibold text-slate-800">{users.length}</p></div>
            <div><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Artists</span><p className="text-2xl font-semibold text-slate-800">{users.filter((u) => u.role === "artist").length}</p></div>
            <div><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Galleries</span><p className="text-2xl font-semibold text-slate-800">{users.filter((u) => u.role === "gallery").length}</p></div>
          </div>
          <div className="table-container overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="table-header">
                <tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Location</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="table-row">
                    <td className="font-medium text-slate-800">{u.full_name || "—"}</td>
                    <td className="text-slate-500">{u.email || "—"}</td>
                    <td className="text-brand-600">{u.username || "—"}</td>
                    <td><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${u.role === "gallery" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-purple-50 text-purple-600 border border-purple-200"}`}>{u.role}</span></td>
                    <td className="text-slate-500">{u.location || "—"}</td>
                    <td className="text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Overview */}
      {activeTab === "data" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Users", count: dataCounts.users || 0, color: "text-blue-600" },
              { label: "Artworks", count: dataCounts.artworks || 0, color: "text-emerald-600" },
              { label: "Collections", count: dataCounts.collections || 0, color: "text-purple-600" },
              { label: "Exhibitions", count: dataCounts.exhibitions || 0, color: "text-amber-600" },
              { label: "Sales", count: dataCounts.sales || 0, color: "text-red-600" },
              { label: "Posts", count: dataCounts.posts || 0, color: "text-slate-600" },
            ].map((d) => (
              <div key={d.label} className="card p-4 text-center">
                <p className={`text-3xl font-semibold ${d.color}`}>{d.count}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <h3 className="font-display text-lg text-slate-800 mb-3">Platform Health</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Database: <span className="text-emerald-600 font-medium">Connected</span> (Supabase)</p>
              <p>Storage: <span className="text-emerald-600 font-medium">Active</span> (Supabase Storage)</p>
              <p>Hosting: <span className="text-emerald-600 font-medium">Live</span> (Vercel)</p>
              <p>Auth: <span className="text-emerald-600 font-medium">Active</span> (Supabase Auth)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
