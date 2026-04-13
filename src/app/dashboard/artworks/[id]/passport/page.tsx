"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Shield, CheckCircle2, Fingerprint, ExternalLink,
  Plus, Trash2, Clock, MapPin, Calendar, X, Check, Eye,
  Award, History, QrCode, Copy, Sparkles, Lock,
} from "lucide-react";

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  images?: string[]; certificate_id?: string;
  authentication_status?: string; authenticated_by?: string;
  authentication_date?: string; authentication_notes?: string;
  user_id: string;
};

type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string;
  notes?: string; created_at: string;
};

const EVENT_TYPES = [
  { key: "created",     label: "Created",     emoji: "✦", color: "#FFD400" },
  { key: "sold",        label: "Sold",        emoji: "◆", color: "#16A34A" },
  { key: "transferred", label: "Transferred", emoji: "→", color: "#0EA5E9" },
  { key: "exhibited",   label: "Exhibited",   emoji: "▣", color: "#8B5CF6" },
  { key: "restored",    label: "Restored",    emoji: "◎", color: "#D97706" },
  { key: "appraised",   label: "Appraised",   emoji: "◈", color: "#4ECDC4" },
  { key: "donated",     label: "Donated",     emoji: "♡", color: "#EC4899" },
  { key: "loaned",      label: "Loaned",      emoji: "⇄", color: "#FF6B6B" },
];

const AUTH_STATUSES = [
  { key: "original",        label: "Original Work",    desc: "One-of-a-kind, handmade piece",          color: "#16A34A", bg: "#DCFCE7", emoji: "✦" },
  { key: "limited_edition", label: "Limited Edition",  desc: "Part of a numbered limited series",       color: "#CA8A04", bg: "#FEF9C3", emoji: "◈" },
  { key: "reproduction",    label: "Reproduction",     desc: "A copy or print of an original work",    color: "#9B8F7A", bg: "#F5F0E8", emoji: "◇" },
];

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  border: "2px solid #E8E0D0", borderRadius: 12,
  fontSize: 14, fontWeight: 600, color: "#111110",
  fontFamily: "inherit", background: "#fff", outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  boxSizing: "border-box" as const,
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 7,
};

export default function PassportManagePage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;
  const router = useRouter();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [entryForm, setEntryForm] = useState({
    event_type: "created", owner_name: "", is_anonymous: false,
    date: "", location: "", notes: "",
  });

  const [authForm, setAuthForm] = useState({
    authentication_status: "original",
    authenticated_by: "",
    notes: "",
  });

  useEffect(() => { if (artworkId) load(); }, [artworkId]);

  async function load() {
    const sb = createClient();
    const [{ data: aw }, { data: prov }] = await Promise.all([
      sb.from("artworks")
        .select("id, title, medium, year, images, certificate_id, authentication_status, authenticated_by, authentication_date, authentication_notes, user_id")
        .eq("id", artworkId!)
        .single(),
      sb.from("provenance_entries")
        .select("*")
        .eq("artwork_id", artworkId!)
        .order("date", { ascending: true }),
    ]);
    setArtwork(aw);
    setProvenance(prov || []);

    // Pre-fill auth form with existing data
    if (aw?.authenticated_by) setAuthForm(f => ({ ...f, authenticated_by: aw.authenticated_by! }));
    if (aw?.authentication_notes) setAuthForm(f => ({ ...f, notes: aw.authentication_notes! }));
    if (aw?.authentication_status && aw.authentication_status !== "pending") {
      setAuthForm(f => ({ ...f, authentication_status: aw.authentication_status! }));
    }

    setLoading(false);
  }

  async function generatePassport() {
    if (!artwork) return;
    setGenerating(true);

    const sb = createClient();

    // Generate certificate ID if not exists
    if (!artwork.certificate_id) {
      const certId = `AM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      await sb.from("artworks").update({ certificate_id: certId }).eq("id", artwork.id);
      setArtwork(a => a ? { ...a, certificate_id: certId } : a);
    }

    // Auto-add "Created" provenance entry if none exists
    if (provenance.length === 0) {
      const { data: entry } = await sb.from("provenance_entries").insert({
        artwork_id: artwork.id,
        event_type: "created",
        date: artwork.year ? `${artwork.year}-01-01` : new Date().toISOString().split("T")[0],
        notes: `Artwork created by the artist${artwork.medium ? ` in ${artwork.medium}` : ""}.`,
      }).select().single();
      if (entry) setProvenance([entry]);
    }

    setGenerating(false);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);

    // Reload
    load();
  }

  async function addProvenanceEntry(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/provenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryForm),
    });
    const data = await res.json();
    if (data.entry) {
      setProvenance(p => [...p, data.entry].sort((a, b) => (a.date || "").localeCompare(b.date || "")));
      setShowAddEntry(false);
      setEntryForm({ event_type: "created", owner_name: "", is_anonymous: false, date: "", location: "", notes: "" });
    }
    setSaving(false);
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authentication_status: authForm.authentication_status,
        authenticated_by: authForm.authenticated_by,
        notes: authForm.notes,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setArtwork(a => a ? { ...a, authentication_status: data.authentication_status, authenticated_by: data.authenticated_by, authentication_date: data.authentication_date } : a);
      setShowAuthModal(false);
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Remove this provenance entry?")) return;
    const sb = createClient();
    await sb.from("provenance_entries").delete().eq("id", id);
    setProvenance(p => p.filter(e => e.id !== id));
  }

  function copyPassportUrl() {
    const url = `${window.location.origin}/artwork/${artworkId}/passport`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const qrUrl = artwork?.certificate_id
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/artwork/${artworkId}/passport`)}&bgcolor=FFFBEA&color=111110&margin=16`
    : null;

  const isVerified = artwork?.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_STATUSES.find(s => s.key === artwork?.authentication_status) || AUTH_STATUSES[0];
  const hasPassport = !!artwork?.certificate_id;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#9B8F7A", fontSize: 14, fontWeight: 700 }}>
      Loading passport…
    </div>
  );

  if (!artwork) return (
    <div style={{ padding: 40, textAlign: "center", color: "#FF6B6B" }}>Artwork not found</div>
  );

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        .inp:focus{border-color:#FFD400!important;box-shadow:0 0 0 3px rgba(255,212,0,.15)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes passIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .pass-in{animation:passIn .4s cubic-bezier(.16,1,.3,1) both}
        .stagger-1{animation-delay:.05s}
        .stagger-2{animation-delay:.1s}
        .stagger-3{animation-delay:.15s}
        .stagger-4{animation-delay:.2s}
        .ev-card:hover{border-color:#111110!important;box-shadow:3px 4px 0 #111110!important;transform:translate(-1px,-1px)}
        .auth-option:hover{border-color:#111110!important;background:#FFFBEA!important}
        .auth-option.selected{border-color:#111110!important;box-shadow:3px 3px 0 #111110!important}
      `}</style>

      {/* ── Add Provenance Modal ── */}
      {showAddEntry && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowAddEntry(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 22, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "2px solid #111110", background: "#FFD400", borderRadius: "20px 20px 0 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: 0 }}>Add Provenance Entry</h3>
              <button onClick={() => setShowAddEntry(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={addProvenanceEntry} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Event type *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EVENT_TYPES.map(et => (
                    <button key={et.key} type="button"
                      onClick={() => setEntryForm(f => ({ ...f, event_type: et.key }))}
                      style={{ padding: "6px 12px", border: `2px solid ${entryForm.event_type === et.key ? et.color : "#E8E0D0"}`, borderRadius: 9999, background: entryForm.event_type === et.key ? et.color + "18" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: entryForm.event_type === et.key ? et.color : "#9B8F7A", transition: "all .1s" }}>
                      {et.emoji} {et.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" className="inp" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Location</label>
                  <input className="inp" value={entryForm.location} onChange={e => setEntryForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Owner / Involved party</label>
                <input className="inp" value={entryForm.owner_name} onChange={e => setEntryForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Collector, gallery, museum…" style={inp} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F5F0E8", borderRadius: 10, cursor: "pointer" }}
                onClick={() => setEntryForm(f => ({ ...f, is_anonymous: !f.is_anonymous }))}>
                <div style={{ width: 20, height: 20, border: `2px solid ${entryForm.is_anonymous ? "#FFD400" : "#E0D8CA"}`, background: entryForm.is_anonymous ? "#FFD400" : "#fff", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {entryForm.is_anonymous && <Check size={12} strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>Keep anonymous (private collection)</span>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea className="inp" rows={2} value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context…" style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowAddEntry(false)} style={{ flex: 1, padding: 11, border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 11, border: "2.5px solid #111110", borderRadius: 11, background: "#FFD400", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>
                  {saving ? "Adding…" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Authenticate Modal ── */}
      {showAuthModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowAuthModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 22, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "2px solid #111110", background: "#111110", borderRadius: "20px 20px 0 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#FFD400", margin: 0 }}>🛡️ Authenticate Artwork</h3>
              <button onClick={() => setShowAuthModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFD400" }}><X size={18} /></button>
            </div>
            <form onSubmit={authenticate} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Status *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {AUTH_STATUSES.map(s => (
                    <div key={s.key}
                      className={`auth-option${authForm.authentication_status === s.key ? " selected" : ""}`}
                      onClick={() => setAuthForm(f => ({ ...f, authentication_status: s.key }))}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: `2px solid ${authForm.authentication_status === s.key ? s.color : "#E8E0D0"}`, borderRadius: 12, background: authForm.authentication_status === s.key ? s.bg : "#fff", cursor: "pointer", transition: "all .15s" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, border: "2px solid #111110", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{s.emoji} {s.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{s.desc}</div>
                      </div>
                      {authForm.authentication_status === s.key && <CheckCircle2 size={16} color={s.color} style={{ marginLeft: "auto" }} />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Authenticated by</label>
                <input required className="inp" value={authForm.authenticated_by} onChange={e => setAuthForm(f => ({ ...f, authenticated_by: e.target.value }))} placeholder="Your name or institution" style={inp} />
              </div>
              <div>
                <label style={lbl}>Authentication notes (optional)</label>
                <textarea className="inp" rows={2} value={authForm.notes} onChange={e => setAuthForm(f => ({ ...f, notes: e.target.value }))} placeholder="Condition, materials, method…" style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowAuthModal(false)} style={{ flex: 1, padding: 11, border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 11, border: "2.5px solid #111110", borderRadius: 11, background: "#FFD400", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>
                  {saving ? "Saving…" : isVerified ? "Update" : "Authenticate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MAIN PAGE ── */}
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={`/dashboard/artworks/${artworkId}`} style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <ArrowLeft size={13} /> {artwork.title}
              </button>
            </Link>
            <span style={{ color: "#d4cfc4" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>Digital Passport</span>
          </div>

          {hasPassport && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyPassportUrl}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {copied ? <><Check size={13} color="#16A34A" /> Copied!</> : <><Copy size={13} /> Copy link</>}
              </button>
              <a href={`/artwork/${artworkId}/passport`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2.5px solid #111110", borderRadius: 10, background: "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "2px 2px 0 #111110" }}>
                  <ExternalLink size={13} /> View Passport
                </button>
              </a>
            </div>
          )}
        </div>

        {/* ── GENERATE CTA (if no passport yet) ── */}
        {!hasPassport && (
          <div className="pass-in" style={{ marginBottom: 24, background: "#111110", border: "2.5px solid #111110", borderRadius: 22, padding: "36px 32px", boxShadow: "6px 6px 0 #FFD400", display: "grid", gridTemplateColumns: "1fr auto", gap: 28, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,212,0,.5)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>
                🛡️ No passport yet
              </div>
              <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: "#FFD400", letterSpacing: "-1px", margin: "0 0 10px", lineHeight: 1.05 }}>
                Generate a Digital Passport
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.4)", fontWeight: 600, lineHeight: 1.6, maxWidth: 460, marginBottom: 20 }}>
                Create a permanent certificate of authenticity for <strong style={{ color: "rgba(255,212,0,.7)" }}>{artwork.title}</strong>. 
                It records provenance, authentication, and exhibition history — shareable via link or QR code.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { emoji: "📜", label: "Provenance trail" },
                  { emoji: "🛡️", label: "Authentication seal" },
                  { emoji: "🔗", label: "Shareable link" },
                  { emoji: "📱", label: "QR code" },
                ].map(f => (
                  <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>
                    {f.emoji} {f.label}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={generatePassport} disabled={generating}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 28px", background: "#FFD400", border: "2.5px solid #FFD400", borderRadius: 14, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", color: "#111110", whiteSpace: "nowrap", flexShrink: 0, transition: "all .2s", boxShadow: generating ? "none" : "4px 4px 0 rgba(255,212,0,.3)" }}>
              {generating
                ? <><div style={{ width: 16, height: 16, border: "2px solid #111110", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Generating…</>
                : <><Sparkles size={16} /> Generate Passport</>}
            </button>
          </div>
        )}

        {/* ── PASSPORT EXISTS ── */}
        {hasPassport && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

            {/* Left: provenance timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Provenance header */}
              <div className="pass-in" style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "4px 5px 0 #D4C9A8" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "2px solid #111110", background: "#FAF7F3" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 900, color: "#111110" }}>
                    <History size={16} /> Provenance History
                    <span style={{ padding: "2px 9px", borderRadius: 9999, background: "#E8E0D0", fontSize: 11, fontWeight: 800, color: "#9B8F7A" }}>{provenance.length}</span>
                  </div>
                  <button onClick={() => setShowAddEntry(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#FFD400", border: "2px solid #111110", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "2px 2px 0 #111110" }}>
                    <Plus size={12} strokeWidth={3} /> Add Entry
                  </button>
                </div>

                {provenance.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 6 }}>No provenance entries yet</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginBottom: 16 }}>Add the creation event to start the history</div>
                    <button onClick={() => { setEntryForm(f => ({ ...f, event_type: "created" })); setShowAddEntry(true); }}
                      style={{ padding: "9px 18px", background: "#FFD400", border: "2px solid #111110", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "2px 2px 0 #111110" }}>
                      + Add Creation Event
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "8px 0" }}>
                    {provenance.map((entry, i) => {
                      const et = EVENT_TYPES.find(t => t.key === entry.event_type) || EVENT_TYPES[0];
                      return (
                        <div key={entry.id} className="ev-card" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 20px", borderBottom: i < provenance.length - 1 ? "1px solid #F5F0E8" : "none", transition: "all .2s" }}>
                          {/* Timeline dot */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0, marginTop: 4 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: et.color + "18", border: `2px solid ${et.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: et.color }}>
                              {et.emoji}
                            </div>
                            {i < provenance.length - 1 && <div style={{ width: 2, height: 20, background: "#F0EBE3", margin: "4px 0" }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{et.label}</span>
                              {entry.date && <span style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} />{fmtDate(entry.date)}</span>}
                            </div>
                            {entry.owner_name && !entry.is_anonymous && <div style={{ fontSize: 13, fontWeight: 700, color: "#5C5346", marginBottom: 3 }}>{entry.owner_name}</div>}
                            {entry.is_anonymous && <div style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", fontStyle: "italic", marginBottom: 3 }}>Private collection</div>}
                            {entry.location && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 3 }}><MapPin size={10} color="#FF6B6B" />{entry.location}</div>}
                            {entry.notes && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, lineHeight: 1.5 }}>{entry.notes}</div>}
                          </div>
                          <button onClick={() => deleteEntry(entry.id)}
                            style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #FFE4E6", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all .15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                            <Trash2 size={11} color="#FF6B6B" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick add buttons */}
              <div className="pass-in stagger-2" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { et: EVENT_TYPES[1], label: "Record a sale" },
                  { et: EVENT_TYPES[3], label: "Add exhibition" },
                  { et: EVENT_TYPES[5], label: "Log appraisal" },
                ].map(({ et, label }) => (
                  <button key={et.key}
                    onClick={() => { setEntryForm(f => ({ ...f, event_type: et.key })); setShowAddEntry(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `2px solid ${et.color}40`, borderRadius: 10, background: et.color + "0d", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: et.color, transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = et.color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = et.color + "40"; }}>
                    {et.emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: passport card + auth */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Passport certificate card */}
              <div className="pass-in stagger-1" style={{ background: "#111110", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "5px 6px 0 #FFD400" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #222" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🥭</span>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,212,0,.4)", letterSpacing: "0.3em", textTransform: "uppercase" }}>Artomango</div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#FFD400", letterSpacing: "0.08em" }}>ARTWORK PASSPORT</div>
                    </div>
                  </div>
                  {/* Cert ID */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,212,0,.4)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>Certificate ID</div>
                    <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "#FFD400", letterSpacing: "0.12em", background: "rgba(255,212,0,.06)", border: "1px solid rgba(255,212,0,.15)", borderRadius: 8, padding: "8px 12px" }}>
                      {artwork.certificate_id}
                    </div>
                  </div>
                </div>

                {/* Auth status */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #222" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Authentication</div>
                  {isVerified ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 9999, background: authCfg.bg, border: `2px solid ${authCfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                          {authCfg.emoji}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{authCfg.label}</span>
                        <CheckCircle2 size={14} color="#16A34A" style={{ marginLeft: "auto" }} />
                      </div>
                      {artwork.authenticated_by && <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>By: {artwork.authenticated_by}</div>}
                      {artwork.authentication_date && <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>On: {fmtDate(artwork.authentication_date)}</div>}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8, border: "1px dashed #333" }}>
                      <Lock size={13} color="#555" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Not authenticated yet</span>
                    </div>
                  )}
                </div>

                {/* QR + actions */}
                <div style={{ padding: "14px 20px" }}>
                  {qrUrl && (
                    <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
                      <div style={{ border: "2px solid #333", borderRadius: 10, overflow: "hidden", background: "#fff", padding: 6 }}>
                        <img src={qrUrl} alt="Passport QR" style={{ width: 100, height: 100, display: "block" }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => setShowAuthModal(true)}
                      style={{ width: "100%", padding: "10px", background: isVerified ? "rgba(22,163,74,.15)" : "#FFD400", border: `2px solid ${isVerified ? "#16A34A" : "#FFD400"}`, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: isVerified ? "#16A34A" : "#111110", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Shield size={13} /> {isVerified ? "Update Authentication" : "Authenticate Artwork"}
                    </button>
                    <a href={`/artwork/${artworkId}/passport`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <button style={{ width: "100%", padding: "10px", background: "transparent", border: "2px solid rgba(255,255,255,.15)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Eye size={13} /> View Public Passport
                      </button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Success banner */}
              {generated && (
                <div className="pass-in" style={{ background: "#DCFCE7", border: "2px solid #16A34A", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>Passport generated!</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#15803D" }}>Certificate ID created & saved</div>
                  </div>
                </div>
              )}

              {/* Artwork mini card */}
              <div className="pass-in stagger-3" style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, overflow: "hidden", boxShadow: "3px 3px 0 #E0D8CA" }}>
                {artwork.images?.[0] && (
                  <div style={{ height: 120, overflow: "hidden", background: "#FAF7F3" }}>
                    <img src={artwork.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 4 }}>{artwork.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>{[artwork.medium, artwork.year].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
