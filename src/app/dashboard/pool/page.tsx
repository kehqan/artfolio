"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Building2, Palette, X, ChevronDown, ChevronUp,
  MessageCircle, Search, Filter, Calendar, DollarSign
} from "lucide-react";

const ART_STYLES = ["Abstract", "Realism", "Photography", "Sculpture", "Digital", "Illustration", "Ceramics", "Textile", "Printmaking", "Mixed Media", "Oil", "Watercolor", "Minimalist", "Contemporary"];

type Request = {
  id: string; poster_type: "artist" | "venue"; title: string; description?: string;
  art_styles?: string[]; budget_min?: number; budget_max?: number;
  venue_city?: string; contact_email?: string; contact_note?: string;
  deadline?: string; status: string; created_at: string; user_id: string;
  artwork_images?: string[];
  profile_name?: string; profile_avatar?: string;
};

type TabFilter = "all" | "artist" | "venue";

export default function DiscoveryPoolPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);

  const [form, setForm] = useState({
    poster_type: "artist" as "artist" | "venue",
    title: "",
    description: "",
    art_styles: [] as string[],
    budget_min: "",
    budget_max: "",
    venue_city: "",
    contact_email: "",
    contact_note: "",
    deadline: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: reqs } = await supabase
      .from("pool_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!reqs) { setLoading(false); return; }

    // Enrich with profile names
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(500);
    const pm: Record<string, { name: string; avatar?: string }> = {};
    for (const p of profiles || []) pm[p.id] = { name: p.full_name, avatar: p.avatar_url };

    setRequests(reqs.map((r) => ({
      ...r,
      profile_name: pm[r.user_id]?.name,
      profile_avatar: pm[r.user_id]?.avatar,
    })));
    setLoading(false);
  }

  function toggleStyle(s: string) {
    setForm((p) => ({ ...p, art_styles: p.art_styles.includes(s) ? p.art_styles.filter((x) => x !== s) : [...p.art_styles, s] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("pool_requests").insert({
      user_id: userId,
      poster_type: form.poster_type,
      title: form.title,
      description: form.description || null,
      art_styles: form.art_styles,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      venue_city: form.venue_city || null,
      contact_email: form.contact_email || null,
      contact_note: form.contact_note || null,
      deadline: form.deadline || null,
    });
    setShowForm(false);
    setForm({ poster_type: "artist", title: "", description: "", art_styles: [], budget_min: "", budget_max: "", venue_city: "", contact_email: "", contact_note: "", deadline: "" });
    setSaving(false);
    load();
  }

  async function sendResponse(requestId: string) {
    if (!userId || !responseMsg.trim()) return;
    setSendingResponse(true);
    const supabase = createClient();
    await supabase.from("pool_responses").upsert({ request_id: requestId, user_id: userId, message: responseMsg });
    setResponseMsg("");
    setRespondingId(null);
    setSendingResponse(false);
    alert("Your interest has been sent! The poster will be notified.");
  }

  const filtered = requests.filter((r) => {
    const matchTab = tab === "all" || r.poster_type === tab;
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()) || r.art_styles?.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  const venueCount = requests.filter((r) => r.poster_type === "venue").length;
  const artistCount = requests.filter((r) => r.poster_type === "artist").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Discovery Pool</h1>
          <p className="page-subtitle">Artists seeking venues · Venues seeking artworks</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Post a Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-display font-semibold text-stone-900">{requests.length}</p>
          <p className="text-xs text-stone-500 mt-1">Open Requests</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Building2 className="w-4 h-4 text-sky-600" />
            <p className="text-2xl font-display font-semibold text-stone-900">{venueCount}</p>
          </div>
          <p className="text-xs text-stone-500">Venues looking for art</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Palette className="w-4 h-4 text-emerald-600" />
            <p className="text-2xl font-display font-semibold text-stone-900">{artistCount}</p>
          </div>
          <p className="text-xs text-stone-500">Artists seeking venues</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." className="input pl-9" />
        </div>
        <div className="flex rounded-xl border border-stone-200 overflow-hidden">
          {([["all", "All"], ["venue", "Venues"], ["artist", "Artists"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-stone-900 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Post form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="heading-sm">Post a Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Who is posting */}
              <div>
                <label className="label">I am a... *</label>
                <div className="grid grid-cols-2 gap-3">
                  {([["artist", "Artist", "Looking for a venue to show my work"], ["venue", "Venue", "Looking for artworks to display"]] as const).map(([key, lbl, sub]) => (
                    <button key={key} type="button" onClick={() => setForm((p) => ({ ...p, poster_type: key }))}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${form.poster_type === key ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {key === "artist" ? <Palette className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        <span className="font-semibold text-sm">{lbl}</span>
                      </div>
                      <p className="text-xs text-stone-500">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Request title *</label>
                <input required className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={form.poster_type === "artist" ? "e.g. Oil painter seeking gallery space in Tehran" : "e.g. Looking for abstract art for our café walls"} />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="textarea" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={form.poster_type === "artist" ? "Describe your work, exhibition needs, timeline..." : "Describe your space, aesthetic, what you're looking for..."} />
              </div>

              {/* Art styles */}
              <div>
                <label className="label">Art styles / types</label>
                <div className="flex flex-wrap gap-2">
                  {ART_STYLES.map((s) => (
                    <button key={s} type="button" onClick={() => toggleStyle(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.art_styles.includes(s) ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Budget min (USD)</label>
                  <input type="number" className="input" value={form.budget_min} onChange={(e) => setForm((p) => ({ ...p, budget_min: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Budget max (USD)</label>
                  <input type="number" className="input" value={form.budget_max} onChange={(e) => setForm((p) => ({ ...p, budget_max: e.target.value }))} placeholder="5000" />
                </div>
              </div>

              {/* Location (venue) / deadline */}
              <div className="grid grid-cols-2 gap-3">
                {form.poster_type === "venue" && (
                  <div>
                    <label className="label flex items-center gap-1">City</label>
                    <input className="input" value={form.venue_city} onChange={(e) => setForm((p) => ({ ...p, venue_city: e.target.value }))} placeholder="Tehran" />
                  </div>
                )}
                <div>
                  <label className="label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Deadline</label>
                  <input type="date" className="input" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label">Contact email (optional)</label>
                <input type="email" className="input" value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))} placeholder="your@email.com" />
              </div>

              <div>
                <label className="label">Note for responders</label>
                <textarea rows={2} className="textarea" value={form.contact_note} onChange={(e) => setForm((p) => ({ ...p, contact_note: e.target.value }))} placeholder="Any extra info for people reaching out..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? "Posting..." : "Post Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Response modal */}
      {respondingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm">Express Interest</h2>
              <button onClick={() => setRespondingId(null)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-stone-500 mb-3">Send a message to the poster. They'll receive your profile info.</p>
            <textarea rows={4} className="textarea mb-4" value={responseMsg} onChange={(e) => setResponseMsg(e.target.value)} placeholder="Hi, I'd love to connect about this opportunity..." />
            <div className="flex gap-3">
              <button onClick={() => setRespondingId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => sendResponse(respondingId)} disabled={sendingResponse || !responseMsg.trim()} className="btn-primary flex-1 justify-center">
                {sendingResponse ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request cards */}
      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="heading-sm mb-2">No requests yet</h3>
          <p className="body-lg mb-6">Be the first — post what you're looking for</p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Post a Request</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Type badge */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${r.poster_type === "venue" ? "bg-sky-50" : "bg-emerald-50"}`}>
                      {r.poster_type === "venue" ? <Building2 className="w-5 h-5 text-sky-600" /> : <Palette className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`badge text-[10px] ${r.poster_type === "venue" ? "badge-storage" : "badge-available"}`}>
                          {r.poster_type === "venue" ? "Venue seeking artwork" : "Artist seeking venue"}
                        </span>
                        {r.deadline && <span className="text-xs text-stone-400">Until {new Date(r.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                      </div>
                      <h3 className="font-semibold text-stone-900 leading-snug">{r.title}</h3>
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="shrink-0 p-1.5 hover:bg-stone-100 rounded-lg text-stone-400">
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Summary row */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {r.art_styles && r.art_styles.length > 0 && r.art_styles.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full">{s}</span>
                  ))}
                  {r.art_styles && r.art_styles.length > 4 && <span className="text-xs text-stone-400">+{r.art_styles.length - 4} more</span>}
                  {(r.budget_min || r.budget_max) && (
                    <span className="text-xs text-stone-500 font-mono">
                      ${r.budget_min?.toLocaleString() || "0"} – ${r.budget_max?.toLocaleString() || "?"}
                    </span>
                  )}
                  {r.venue_city && <span className="text-xs text-stone-500">📍 {r.venue_city}</span>}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === r.id && (
                <div className="border-t border-stone-100 p-5 bg-stone-50">
                  {r.description && <p className="text-sm text-stone-600 mb-4 leading-relaxed">{r.description}</p>}

                  {/* Poster info */}
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
                      <button onClick={() => { setRespondingId(r.id); setResponseMsg(""); }}
                        className="btn-primary">
                        <MessageCircle className="w-4 h-4" /> I'm interested
                      </button>
                    )}
                    {r.contact_email && (
                      <a href={`mailto:${r.contact_email}`} className="btn-secondary text-sm">Email directly</a>
                    )}
                    <span className="text-xs text-stone-400 ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
