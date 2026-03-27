"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users, Image, FileText, Handshake, Award, ShoppingBag,
  LogOut, Trash2, Eye, Edit3, BarChart2, Palette, Settings,
  ChevronRight, X, Check, AlertCircle, Sun, Moon, Save,
  Layout, Type, Sliders
} from "lucide-react";

const ADMIN_USER = "admin";
const ADMIN_PASS = "artfolio2024";

type Tab = "users" | "artworks" | "posts" | "collaborations" | "exhibitions" | "sales" | "design";

interface DesignSettings {
  primaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  carouselImages: string[];
  buttonStyle: "rounded" | "square" | "pill";
  fontFamily: string;
  darkMode: boolean;
}

const defaultDesign: DesignSettings = {
  primaryColor: "#6366f1",
  accentColor: "#8b5cf6",
  heroTitle: "Your Art, Beautifully Managed & Shared",
  heroSubtitle: "The all-in-one platform for artists to manage, showcase, and sell their work.",
  heroImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1400&q=80",
  carouselImages: [
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1400&q=80",
    "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1400&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1400&q=80",
  ],
  buttonStyle: "rounded",
  fontFamily: "Inter",
  darkMode: false,
};

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [data, setData] = useState<Record<Tab, any[]>>({
    users: [], artworks: [], posts: [], collaborations: [], exhibitions: [], sales: [], design: []
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [design, setDesign] = useState<DesignSettings>(defaultDesign);
  const [designSaved, setDesignSaved] = useState(false);

  const supabase = createClient();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setAuthed(true);
      setLoginError("");
      loadTab("users");
    } else {
      setLoginError("Invalid credentials");
    }
  };

  const loadTab = async (tab: Tab) => {
    if (tab === "design") return;
    setLoading(true);
    const tableMap: Record<Tab, string> = {
      users: "profiles",
      artworks: "artworks",
      posts: "posts",
      collaborations: "collaborations",
      exhibitions: "exhibitions",
      sales: "sales",
      design: "",
    };
    const table = tableMap[tab];
    if (!table) { setLoading(false); return; }
    const { data: rows, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
    if (!error && rows) {
      setData(prev => ({ ...prev, [tab]: rows }));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authed) loadTab(activeTab);
    // Load design settings from localStorage
    const saved = localStorage.getItem("artfolio_design");
    if (saved) {
      try { setDesign(JSON.parse(saved)); } catch {}
    }
  }, [authed, activeTab]);

  const handleDelete = async (tab: Tab, id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    const tableMap: Record<Tab, string> = {
      users: "profiles", artworks: "artworks", posts: "posts",
      collaborations: "collaborations", exhibitions: "exhibitions", sales: "sales", design: ""
    };
    const table = tableMap[tab];
    if (!table) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { showToast("Delete failed: " + error.message, "error"); }
    else { showToast("Deleted successfully"); loadTab(tab); }
  };

  const saveDesign = () => {
    localStorage.setItem("artfolio_design", JSON.stringify(design));
    setDesignSaved(true);
    showToast("Design settings saved!");
    setTimeout(() => setDesignSaved(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users", icon: <Users size={16} /> },
    { id: "artworks", label: "Artworks", icon: <Image size={16} /> },
    { id: "posts", label: "Posts", icon: <FileText size={16} /> },
    { id: "collaborations", label: "Collabs", icon: <Handshake size={16} /> },
    { id: "exhibitions", label: "Exhibitions", icon: <Award size={16} /> },
    { id: "sales", label: "Sales", icon: <ShoppingBag size={16} /> },
    { id: "design", label: "Design", icon: <Palette size={16} /> },
  ];

  const renderColumns = (tab: Tab): string[] => {
    const cols: Record<Tab, string[]> = {
      users: ["id", "full_name", "username", "role", "created_at"],
      artworks: ["id", "title", "status", "price", "created_at"],
      posts: ["id", "content", "created_at"],
      collaborations: ["id", "title", "type", "status", "deadline"],
      exhibitions: ["id", "title", "venue", "status", "start_date"],
      sales: ["id", "artwork_id", "amount", "sale_date"],
      design: [],
    };
    return cols[tab] || [];
  };

  // --- Login Screen ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">Admin Panel</h1>
                <p className="text-gray-400 text-sm">Artfolio Platform Control</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} /> {loginError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard ---
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Settings size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">Artfolio Admin</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full">v1.0</span>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Users", val: data.users.length, color: "from-indigo-500 to-indigo-700" },
            { label: "Artworks", val: data.artworks.length, color: "from-purple-500 to-purple-700" },
            { label: "Posts", val: data.posts.length, color: "from-pink-500 to-pink-700" },
            { label: "Sales", val: data.sales.length, color: "from-emerald-500 to-emerald-700" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4`}>
              <div className="text-white/70 text-xs mb-1">{s.label}</div>
              <div className="text-2xl font-bold text-white">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Design Tab */}
        {activeTab === "design" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Colors */}
              <div className="bg-gray-900 rounded-xl p-5 border border-white/5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Palette size={16} /> Colors</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={design.primaryColor}
                        onChange={e => setDesign(d => ({ ...d, primaryColor: e.target.value }))}
                        className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent" />
                      <input type="text" value={design.primaryColor}
                        onChange={e => setDesign(d => ({ ...d, primaryColor: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm w-32" />
                      <div className="w-8 h-8 rounded-full" style={{ background: design.primaryColor }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={design.accentColor}
                        onChange={e => setDesign(d => ({ ...d, accentColor: e.target.value }))}
                        className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent" />
                      <input type="text" value={design.accentColor}
                        onChange={e => setDesign(d => ({ ...d, accentColor: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm w-32" />
                      <div className="w-8 h-8 rounded-full" style={{ background: design.accentColor }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography & Style */}
              <div className="bg-gray-900 rounded-xl p-5 border border-white/5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Type size={16} /> Typography & Style</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Font Family</label>
                    <select value={design.fontFamily}
                      onChange={e => setDesign(d => ({ ...d, fontFamily: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                      {["Inter", "Playfair Display", "Poppins", "DM Sans", "Cormorant Garamond"].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Button Style</label>
                    <div className="flex gap-2">
                      {(["rounded", "square", "pill"] as const).map(s => (
                        <button key={s}
                          onClick={() => setDesign(d => ({ ...d, buttonStyle: s }))}
                          className={`px-4 py-2 text-sm border transition-colors ${
                            design.buttonStyle === s
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-white/10 text-gray-400 hover:text-white"
                          } ${s === "rounded" ? "rounded-md" : s === "pill" ? "rounded-full" : "rounded-none"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Content */}
              <div className="bg-gray-900 rounded-xl p-5 border border-white/5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Layout size={16} /> Hero Section</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Hero Title</label>
                    <input type="text" value={design.heroTitle}
                      onChange={e => setDesign(d => ({ ...d, heroTitle: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Hero Subtitle</label>
                    <textarea value={design.heroSubtitle}
                      onChange={e => setDesign(d => ({ ...d, heroSubtitle: e.target.value }))}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Hero Background Image URL</label>
                    <input type="text" value={design.heroImage}
                      onChange={e => setDesign(d => ({ ...d, heroImage: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    {design.heroImage && (
                      <img src={design.heroImage} alt="preview" className="mt-2 rounded-lg w-full h-24 object-cover opacity-70" />
                    )}
                  </div>
                </div>
              </div>

              {/* Carousel Images */}
              <div className="bg-gray-900 rounded-xl p-5 border border-white/5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Sliders size={16} /> Carousel Images</h3>
                <div className="space-y-2">
                  {design.carouselImages.map((img, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={img}
                        onChange={e => {
                          const imgs = [...design.carouselImages];
                          imgs[i] = e.target.value;
                          setDesign(d => ({ ...d, carouselImages: imgs }));
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs" />
                      <button onClick={() => setDesign(d => ({
                        ...d, carouselImages: d.carouselImages.filter((_, j) => j !== i)
                      }))} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => setDesign(d => ({ ...d, carouselImages: [...d.carouselImages, ""] }))}
                    className="text-indigo-400 hover:text-indigo-300 text-sm mt-1"
                  >+ Add image URL</button>
                </div>
              </div>
            </div>

            <button onClick={saveDesign}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              <Save size={16} /> Save Design Settings
            </button>

            <div className="bg-gray-900 rounded-xl p-4 border border-white/5 text-sm text-gray-400">
              <p className="font-medium text-white mb-1">How it works</p>
              <p>Design settings are stored and applied to the landing page automatically. Changes to colors, fonts, hero content and carousel images are reflected on the public-facing site.</p>
            </div>
          </div>
        )}

        {/* Data Tables */}
        {activeTab !== "design" && (
          <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : data[activeTab].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <AlertCircle size={32} className="mb-2" />
                <p>No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      {renderColumns(activeTab).map(col => (
                        <th key={col} className="text-left px-4 py-3 text-gray-400 font-medium capitalize">
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data[activeTab].map((row: any) => (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        {renderColumns(activeTab).map(col => (
                          <td key={col} className="px-4 py-3 text-gray-300 max-w-xs">
                            <span className="truncate block" title={String(row[col] ?? "")}>
                              {col === "id" ? String(row[col] ?? "").slice(0, 8) + "..." :
                               col === "content" ? String(row[col] ?? "").slice(0, 60) + (String(row[col] ?? "").length > 60 ? "..." : "") :
                               col.includes("date") || col === "created_at" ?
                                 new Date(row[col]).toLocaleDateString() :
                               col === "price" || col === "amount" ?
                                 row[col] ? "$" + Number(row[col]).toFixed(2) : "-" :
                               String(row[col] ?? "-")}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(activeTab, row.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
