"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Building2, Palette, X, ChevronDown, ChevronUp,
  MessageCircle, Search, Filter, Calendar, DollarSign,
  Clock, CheckCircle, Circle, Handshake, MapPin,
} from "lucide-react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";

// ── Types ──────────────────────────────────────────────────────────
type Collab = {
  id: string; title: string; description?: string; status: string;
  partner_name?: string; partner_email?: string; type?: string;
  deadline?: string; created_at: string; user_id: string;
  location_name?: string; lat?: number; lng?: number;
};

type PoolRequest = {
  id: string; poster_type: "artist" | "venue"; title: string;
  description?: string; art_styles?: string[];
  budget_min?: number; budget_max?: number;
  venue_city?: string; location_name?: string;
  lat?: number; lng?: number;
  contact_email?: string; contact_note?: string; deadline?: string;
  status: string; created_at: string; user_id: string;
  profile_name?: string; profile_avatar?: string;
};

type ActiveTab = "pool" | "mine";

const ART_STYLES = ["Abstract","Realism","Photography","Sculpture","Digital","Illustration","Ceramics","Textile","Printmaking","Mixed Media","Oil","Watercolor","Minimalist","Contemporary"];
const COLLAB_TYPES = ["Exhibition","Commission","Co-creation","Mentorship","Studio Share","Event","Other"];

// ── Main Component ─────────────────────────────────────────────────
export default function CollabPoolPage() {
  const [activeTab, setActiveTab]     = useState<ActiveTab>("pool");
  const [userId, setUserId]           = useState<string | null>(null);
  const [poolRequests, setPoolRequests] = useState<PoolRequest[]>([]);
  const [myCollabs, setMyCollabs]     = useState<Collab[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState<"all" | "artist" | "venue">("all");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [formMode, setFormMode]       = useState<"pool" | "collab">("pool");
  const [saving, setSaving]           = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [poolLocationCoords, setPoolLocationCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [collabLocationCoords, setCollabLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Pool form
  const [poolForm, setPoolForm] = useState({
    poster_type: "artist" as "artist" | "venue",
    title: "", description: "", art_styles: [] as string[],
    budget_min: "", budget_max: "", venue_city: "", location_name: "",
    contact_email: "", contact_note: "", deadline: "",
  });

  // Collab form
  const [collabForm, setCollabForm] = useState({
    title: "", description: "", type: "Co-creation",
    partner_name: "", partner_email: "", deadline: "", status: "Open",
    location_name: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const [{ data: reqs }, { data: collabs }] = await Promise.all([
      supabase.from("pool_requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("collaborations").select("*").order("created_at", { ascending: false }),
    ]);

    if (reqs) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(500);
      const pm: Record<string, { name: string; avatar?: string }> = {};
      for (const p of profiles || []) pm[p.id] = { name: p.full_name, avatar: p.avatar_url };
      setPoolRequests(reqs.map(r => ({ ...r, profile_name: pm[r.user_id]?.name, profile_avatar: pm[r.user_id]?.avatar })));
    }

    setMyCollabs(collabs || []);
    setLoading(false);
  }

  // Pool submit
  async function handlePoolSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("pool_requests").insert({
      user_id: userId,
      poster_type: poolForm.poster_type,
      title: poolForm.title,
      description: poolForm.description || null,
      art_styles: poolForm.art_styles,
      budget_min: poolForm.budget_min ? Number(poolForm.budget_min) : null,
      budget_max: poolForm.budget_max ? Number(poolForm.budget_max) : null,
      venue_city:    poolForm.location_name || poolForm.venue_city || null,
      location_name: poolForm.location_name || poolForm.venue_city || null,
      lat:           poolLocationCoords?.lat  || null,
      lng:           poolLocationCoords?.lng  || null,
      contact_email: poolForm.contact_email || null,
      contact_note: poolForm.contact_note || null,
      deadline: poolForm.deadline || null,
    });
    setShowForm(false);
    setSaving(false);
    load();
  }

  // Collab submit
  async function handleCollabSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("collaborations").insert({
      user_id: userId,
      title:         collabForm.title,
      description:   collabForm.description || null,
      type:          collabForm.type,
      partner_name:  collabForm.partner_name || null,
      partner_email: collabForm.partner_email || null,
      deadline:      collabForm.deadline || null,
      status:        collabForm.status,
      location_name: collabForm.location_name || null,
      lat:           collabLocationCoords?.lat || null,
      lng:           collabLocationCoords?.lng || null,
    });
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function sendResponse(requestId: string) {
    if (!userId || !responseMsg.trim()) return;
    const supabase = createClient();
    await supabase.from("pool_responses").upsert({ request_id: requestId, user_id: userId, message: responseMsg });
    setResponseMsg(""); setRespondingId(null);
    alert("Your interest has been sent!");
  }

  function toggleStyle(s: string) {
    setPoolForm(p => ({ ...p, art_styles: p.art_styles.includes(s) ? p.art_styles.filter(x => x !== s) : [...p.art_styles, s] }));
  }

  const filteredPool = poolRequests.filter(r => {
    const matchType = typeFilter === "all" || r.poster_type === typeFilter;
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const groupedCollabs = {
    open: myCollabs.filter(c => c.status?.toLowerCase() === "open"),
    "in progress": myCollabs.filter(c => c.status?.toLowerCase() === "in progress"),
    completed: myCollabs.filter(c => c.status?.toLowerCase() === "completed"),
  };

  const setCollabField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCollabForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Collabs & Discovery Pool</h1>
          <p className="page-subtitle">Find partners, post opportunities, track collaborations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFormMode("pool"); setShowForm(true); }} className="btn-secondary text-sm">
            <Building2 className="w-4 h-4" /> Post to Pool
          </button>
          <button onClick={() => { setFormMode("collab"); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> New Collab
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Open Requests", value: poolRequests.length, color: "bg-[#FFD400]" },
          { label: "My Collabs",    value: myCollabs.length,    color: "bg-[#4ECDC4]" },
          { label: "In Progress",   value: groupedCollabs["in progress"].length, color: "bg-[#FF6B6B]" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", border:"2px solid #111110", borderRadius:8, padding:"16px 18px", boxShadow:"3px 3px 0 #111110" }}>
            <div style={{ fontSize:26, fontWeight:900, color:"#111110" }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:0, borderBottom:"2px solid #111110", marginBottom:20 }}>
        {([["pool","Discovery Pool"],["mine","My Collaborations"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:"10px 20px", border:"none", borderBottom: activeTab === id ? "3px solid #FFD400" : "none", background: activeTab === id ? "#FFD400" : "transparent", fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer", marginBottom: activeTab === id ? -2 : 0 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── DISCOVERY POOL TAB ── */}
      {activeTab === "pool" && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..." className="input pl-9" />
            </div>
            <div className="flex border-2 border-black overflow-hidden">
              {([["all","All"],["venue","Venues"],["artist","Artists"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setTypeFilter(k)}
                  style={{ padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", background: typeFilter === k ? "#111110" : "#fff", color: typeFilter === k ? "#FFD400" : "#111110", border:"none", borderRight: k !== "artist" ? "1px solid #111110" : "none" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="card p-12 text-center text-stone-400">Loading…</div>
          ) : filteredPool.length === 0 ? (
            <div className="card p-16 text-center">
              <Filter className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <h3 className="heading-sm mb-2">No requests yet</h3>
              <p className="body-lg mb-5">Be the first to post what you're looking for</p>
              <button onClick={() => { setFormMode("pool"); setShowForm(true); }} className="btn-primary">
                <Plus className="w-4 h-4" /> Post a Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPool.map(r => (
                <div key={r.id} className="card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${r.poster_type === "venue" ? "bg-sky-50" : "bg-emerald-50"}`}>
                          {r.poster_type === "venue" ? <Building2 className="w-5 h-5 text-sky-600" /> : <Palette className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`badge text-[10px] ${r.poster_type === "venue" ? "badge-storage" : "badge-available"}`}>
                              {r.poster_type === "venue" ? "Venue seeking artwork" : "Artist seeking venue"}
                            </span>
                            {r.deadline && <span className="text-xs text-stone-400">Until {new Date(r.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
                          </div>
                          <h3 className="font-semibold text-stone-900 leading-snug">{r.title}</h3>
                        </div>
                      </div>
                      <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="shrink-0 p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
                        {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {r.art_styles?.slice(0,4).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full">{s}</span>
                      ))}
                      {(r.budget_min || r.budget_max) && (
                        <span className="text-xs text-stone-500 font-mono">${r.budget_min?.toLocaleString() || "0"} – ${r.budget_max?.toLocaleString() || "?"}</span>
                      )}
                      {(r.venue_city||r.location_name) && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin size={10}/> {r.location_name||r.venue_city}
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedId === r.id && (
                    <div className="border-t border-stone-100 p-5 bg-stone-50">
                      {r.description && <p className="text-sm text-stone-600 mb-4 leading-relaxed">{r.description}</p>}
                      {r.profile_name && (
                        <div className="flex items-center gap-2 mb-4">
                          {r.profile_avatar ? <img src={r.profile_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            : <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{r.profile_name[0]}</div>}
                          <span className="text-sm text-stone-600">Posted by <span className="font-medium text-stone-900">{r.profile_name}</span></span>
                        </div>
                      )}
                      {r.contact_note && (
                        <div className="p-3 bg-white rounded-xl border border-stone-200 text-sm text-stone-600 mb-4">
                          <span className="font-medium text-stone-800">Note: </span>{r.contact_note}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {userId !== r.user_id && (
                          <button onClick={() => { setRespondingId(r.id); setResponseMsg(""); }} className="btn-primary">
                            <MessageCircle className="w-4 h-4" /> I'm interested
                          </button>
                        )}
                        {r.contact_email && <a href={`mailto:${r.contact_email}`} className="btn-secondary text-sm">Email directly</a>}
                        <span className="text-xs text-stone-400 ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY COLLABORATIONS TAB ── */}
      {activeTab === "mine" && (
        <div>
          {loading ? (
            <div className="card p-12 text-center text-stone-400">Loading…</div>
          ) : myCollabs.length === 0 ? (
            <div className="card p-16 text-center">
              <Handshake className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h3 className="heading-sm mb-2">No collaborations yet</h3>
              <p className="body-lg mb-5">Track your partnerships and joint projects</p>
              <button onClick={() => { setFormMode("collab"); setShowForm(true); }} className="btn-primary">
                <Plus className="w-4 h-4" /> New Collaboration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(["open","in progress","completed"] as const).map(status => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    {status === "open" ? <Circle className="w-4 h-4 text-emerald-500" />
                      : status === "in progress" ? <Clock className="w-4 h-4 text-sky-500" />
                      : <CheckCircle className="w-4 h-4 text-stone-400" />}
                    <h3 className="text-sm font-semibold text-stone-700 capitalize">{status}</h3>
                    <span className="ml-auto text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{groupedCollabs[status].length}</span>
                  </div>
                  <div className="space-y-3">
                    {groupedCollabs[status].map(c => (
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
                    {groupedCollabs[status].length === 0 && (
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
      )}

      {/* ── RESPOND MODAL ── */}
      {respondingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm">Express Interest</h2>
              <button onClick={() => setRespondingId(null)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-stone-500 mb-3">Send a message — they'll receive your profile info.</p>
            <textarea rows={4} className="textarea mb-4" value={responseMsg} onChange={e => setResponseMsg(e.target.value)} placeholder="Hi, I'd love to connect about this opportunity…" />
            <div className="flex gap-3">
              <button onClick={() => setRespondingId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => sendResponse(respondingId)} disabled={!responseMsg.trim()} className="btn-primary flex-1 justify-center">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* ── POST FORM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">{formMode === "pool" ? "Post to Discovery Pool" : "New Collaboration"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {formMode === "pool" ? (
              <form onSubmit={handlePoolSubmit} className="space-y-4">
                <div>
                  <label className="label">I am a… *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([["artist","Artist","Looking for a venue"],["venue","Venue","Looking for artworks"]] as const).map(([k,l,sub]) => (
                      <button key={k} type="button" onClick={() => setPoolForm(p => ({ ...p, poster_type: k }))}
                        className={`p-4 rounded-xl border-2 text-left ${poolForm.poster_type === k ? "border-stone-900 bg-stone-50" : "border-stone-200"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {k === "artist" ? <Palette className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          <span className="font-semibold text-sm">{l}</span>
                        </div>
                        <p className="text-xs text-stone-500">{sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Request title *</label>
                  <input required className="input" value={poolForm.title} onChange={e => setPoolForm(p => ({...p,title:e.target.value}))}
                    placeholder={poolForm.poster_type === "artist" ? "Oil painter seeking gallery space" : "Looking for abstract art for café walls"} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea rows={3} className="textarea" value={poolForm.description} onChange={e => setPoolForm(p => ({...p,description:e.target.value}))} placeholder="Describe your needs…" />
                </div>
                <div>
                  <label className="label">Art styles</label>
                  <div className="flex flex-wrap gap-2">
                    {ART_STYLES.map(s => (
                      <button key={s} type="button" onClick={() => toggleStyle(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${poolForm.art_styles.includes(s) ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Budget min (USD)</label>
                    <input type="number" className="input" value={poolForm.budget_min} onChange={e => setPoolForm(p => ({...p,budget_min:e.target.value}))} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Budget max (USD)</label>
                    <input type="number" className="input" value={poolForm.budget_max} onChange={e => setPoolForm(p => ({...p,budget_max:e.target.value}))} placeholder="5000" />
                  </div>
                </div>
                {/* Location with autocomplete */}
                <PlacesAutocomplete
                  label="Location / city"
                  value={poolForm.location_name || poolForm.venue_city}
                  placeholder="Search city or venue…"
                  onChange={(result, raw) => {
                    setPoolForm(p => ({ ...p, location_name: raw, venue_city: raw }));
                    if (result) setPoolLocationCoords({ lat: result.lat, lng: result.lng });
                    else setPoolLocationCoords(null);
                  }}
                />
                {poolLocationCoords && (
                  <div style={{ fontSize:11, color:"#4ECDC4", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                    <MapPin size={11}/> Location saved — will appear on the Prague map
                  </div>
                )}
                <div>
                  <label className="label">Deadline</label>
                  <input type="date" className="input" value={poolForm.deadline} onChange={e => setPoolForm(p => ({...p,deadline:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Contact email (optional)</label>
                  <input type="email" className="input" value={poolForm.contact_email} onChange={e => setPoolForm(p => ({...p,contact_email:e.target.value}))} placeholder="your@email.com" />
                </div>
                <div>
                  <label className="label">Note for responders</label>
                  <textarea rows={2} className="textarea" value={poolForm.contact_note} onChange={e => setPoolForm(p => ({...p,contact_note:e.target.value}))} placeholder="Any extra info…" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Posting…" : "Post Request"}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCollabSubmit} className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input required className="input" value={collabForm.title} onChange={setCollabField("title")} placeholder="e.g. Joint mural project" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select className="select" value={collabForm.type} onChange={setCollabField("type")}>
                      {COLLAB_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="select" value={collabForm.status} onChange={setCollabField("status")}>
                      <option>Open</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea rows={3} className="textarea" value={collabForm.description} onChange={setCollabField("description")} placeholder="What is this collaboration about?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Partner Name</label>
                    <input className="input" value={collabForm.partner_name} onChange={setCollabField("partner_name")} placeholder="Collaborator name" />
                  </div>
                  <div>
                    <label className="label">Partner Email</label>
                    <input type="email" className="input" value={collabForm.partner_email} onChange={setCollabField("partner_email")} placeholder="email@example.com" />
                  </div>
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input type="date" className="input" value={collabForm.deadline} onChange={setCollabField("deadline")} />
                </div>
                <PlacesAutocomplete
                  label="Location (optional)"
                  value={collabForm.location_name}
                  placeholder="Where will this collab happen?"
                  onChange={(result, raw) => {
                    setCollabForm(p => ({ ...p, location_name: raw }));
                    if (result) setCollabLocationCoords({ lat: result.lat, lng: result.lng });
                    else setCollabLocationCoords(null);
                  }}
                />
                {collabLocationCoords && (
                  <div style={{ fontSize:11, color:"#4ECDC4", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                    <MapPin size={11}/> Location saved — will appear on the Prague map
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Saving…" : "Create"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
