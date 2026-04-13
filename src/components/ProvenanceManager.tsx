"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, Save, History, MapPin, CalendarDays,
  Shield, CheckCircle2, Trash2, Award, Fingerprint,
} from "lucide-react";

type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string;
  notes?: string; created_at: string;
};

const EVENT_TYPES = [
  { key: "created",     label: "Created",     emoji: "✦" },
  { key: "sold",        label: "Sold",        emoji: "◆" },
  { key: "transferred", label: "Transferred", emoji: "→" },
  { key: "exhibited",   label: "Exhibited",   emoji: "▣" },
  { key: "restored",    label: "Restored",    emoji: "◎" },
  { key: "appraised",   label: "Appraised",   emoji: "◈" },
  { key: "donated",     label: "Donated",     emoji: "♡" },
  { key: "loaned",      label: "Loaned",      emoji: "⇄" },
];

const AUTH_STATUSES = [
  { key: "original",        label: "Original Work",   color: "#16A34A" },
  { key: "limited_edition", label: "Limited Edition",  color: "#CA8A04" },
  { key: "reproduction",    label: "Reproduction",     color: "#9B8F7A" },
];

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 13px",
  border: "2px solid #E8E0D0", borderRadius: 11,
  fontSize: 13, fontWeight: 600, color: "#111110",
  fontFamily: "inherit", background: "#fff", outline: "none",
  transition: "border-color .15s",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6,
};

export default function ProvenanceManager({ artworkId }: { artworkId: string }) {
  const [entries, setEntries]       = useState<ProvenanceEntry[]>([]);
  const [authStatus, setAuthStatus] = useState("");
  const [authBy, setAuthBy]         = useState("");
  const [certId, setCertId]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [showAuth, setShowAuth]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    event_type: "created", owner_name: "", is_anonymous: false,
    date: "", location: "", notes: "",
  });

  useEffect(() => { load(); }, [artworkId]);

  async function load() {
    const sb = createClient();
    const [{ data: aw }, { data: prov }] = await Promise.all([
      sb.from("artworks").select("certificate_id, authentication_status, authenticated_by").eq("id", artworkId).single(),
      sb.from("provenance_entries").select("*").eq("artwork_id", artworkId).order("date", { ascending: true }),
    ]);
    if (aw) {
      setAuthStatus(aw.authentication_status || "pending");
      setAuthBy(aw.authenticated_by || "");
      setCertId(aw.certificate_id || "");
    }
    setEntries(prov || []);
    setLoading(false);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/provenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.entry) {
      setEntries(p => [...p, data.entry].sort((a, b) => (a.date || "").localeCompare(b.date || "")));
      setShowForm(false);
      setForm({ event_type: "created", owner_name: "", is_anonymous: false, date: "", location: "", notes: "" });
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Remove this provenance entry?")) return;
    const sb = createClient();
    await sb.from("provenance_entries").delete().eq("id", id);
    setEntries(p => p.filter(e => e.id !== id));
  }

  async function authenticate(status: string) {
    setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authentication_status: status, authenticated_by: authBy }),
    });
    const data = await res.json();
    if (data.success) {
      setAuthStatus(data.authentication_status);
      setShowAuth(false);
    }
    setSaving(false);
  }

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div style={{ padding: 20, textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Certificate info */}
      <div style={{ background: "#111110", border: "2px solid #111110", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Fingerprint size={14} color="#FFD400" />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#FFD400", letterSpacing: "0.14em", textTransform: "uppercase" }}>Certificate ID</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: "#FFD400", letterSpacing: "0.1em" }}>
            {certId || "Not generated yet"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAuth(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: authStatus !== "pending" ? "#16A34A" : "#FFD400", border: "2px solid #111110", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: authStatus !== "pending" ? "#fff" : "#111110" }}>
            <Shield size={13} />
            {authStatus !== "pending" ? "Re-authenticate" : "Authenticate"}
          </button>
          <a href={`/artwork/${artworkId}/passport`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#FFD400", border: "2px solid #FFD400", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
              View Passport →
            </button>
          </a>
        </div>
      </div>

      {/* Provenance entries */}
      <div style={{ background: "#fff", border: "2px solid #111110", borderRadius: 14, overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "2px solid #111110", background: "#FAF7F3" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 900, color: "#111110" }}>
            <History size={15} /> Provenance ({entries.length})
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#FFD400", border: "2px solid #111110", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "2px 2px 0 #111110" }}>
            <Plus size={12} /> Add Entry
          </button>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📜</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>No provenance entries yet</div>
            <div style={{ fontSize: 12, color: "#C0B8A8", marginTop: 4 }}>Add the creation event to start the history</div>
          </div>
        ) : (
          entries.map((entry, i) => {
            const et = EVENT_TYPES.find(t => t.key === entry.event_type) || EVENT_TYPES[0];
            return (
              <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 18px", borderBottom: "1px solid #F5F0E8" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFD400", border: "1.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0, marginTop: 2 }}>
                  {et.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{et.label}</span>
                    {entry.date && <span style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                  </div>
                  {entry.owner_name && !entry.is_anonymous && <div style={{ fontSize: 12, fontWeight: 700, color: "#5C5346" }}>{entry.owner_name}</div>}
                  {entry.is_anonymous && <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", fontStyle: "italic" }}>Private collection</div>}
                  {entry.location && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}><MapPin size={10} color="#FF6B6B" />{entry.location}</div>}
                  {entry.notes && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, marginTop: 4 }}>{entry.notes}</div>}
                </div>
                <button onClick={() => deleteEntry(entry.id)} style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid #FFE4E6", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={11} color="#FF6B6B" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add provenance form modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 20, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "2px solid #111110", background: "#FFD400", borderRadius: "18px 18px 0 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#111110", margin: 0 }}>Add Provenance Entry</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={addEntry} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Event type *</label>
                <select value={form.event_type} onChange={sf("event_type")} style={{ ...inp, cursor: "pointer" }} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")}>
                  {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={form.date} onChange={sf("date")} style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
                </div>
                <div>
                  <label style={lbl}>Location</label>
                  <input value={form.location} onChange={sf("location")} placeholder="City, Country" style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
                </div>
              </div>
              <div>
                <label style={lbl}>Owner / Party Name</label>
                <input value={form.owner_name} onChange={sf("owner_name")} placeholder="Collector, gallery, artist…" style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F5F0E8", borderRadius: 10, cursor: "pointer" }} onClick={() => setForm(p => ({ ...p, is_anonymous: !p.is_anonymous }))}>
                <div style={{ width: 20, height: 20, border: `2px solid ${form.is_anonymous ? "#FFD400" : "#E8E0D0"}`, background: form.is_anonymous ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form.is_anonymous && <div style={{ width: 10, height: 10, background: "#111110" }} />}
                </div>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#111110", cursor: "pointer" }}>Keep owner anonymous (private collection)</label>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={sf("notes")} placeholder="Additional details…" style={{ ...inp, resize: "vertical" }} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 11, border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 11, border: "2.5px solid #111110", borderRadius: 11, background: "#FFD400", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>
                  {saving ? "Adding…" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Authentication modal ── */}
      {showAuth && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAuth(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 20, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "2px solid #111110", background: "#111110", borderRadius: "18px 18px 0 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#FFD400", margin: 0 }}>🛡️ Authenticate Artwork</h3>
              <button onClick={() => setShowAuth(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFD400" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Authenticated by</label>
                <input value={authBy} onChange={e => setAuthBy(e.target.value)} placeholder="Your name or organization" style={inp} onFocus={e => (e.target.style.borderColor = "#FFD400")} onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
              </div>
              <div>
                <label style={lbl}>Authentication status</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {AUTH_STATUSES.map(s => (
                    <button key={s.key} onClick={() => authenticate(s.key)} disabled={saving}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", border: `2.5px solid ${authStatus === s.key ? s.color : "#E8E0D0"}`, borderRadius: 12, background: authStatus === s.key ? s.color + "18" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, border: "2px solid #111110", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{s.label}</span>
                      {authStatus === s.key && <CheckCircle2 size={16} color={s.color} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowAuth(false)} style={{ padding: 11, border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
