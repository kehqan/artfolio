"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Save, Search, X, Check, Plus,
  ImageIcon, FileText, Users, Handshake, Palette,
  ChevronRight, AlertCircle, User,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type ContractType = "exhibition" | "collaboration" | "commission" | "general";

type Party = {
  id?: string;           // undefined = external
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  username?: string;
  isExternal?: boolean;
};

type Artwork = {
  id: string; title: string; images?: string[];
  medium?: string; price?: number; status: string;
};

// ── Contract type config ───────────────────────────────────────────
const CONTRACT_TYPES = [
  {
    key: "exhibition" as ContractType,
    label: "Exhibition Agreement",
    emoji: "🖼️",
    desc: "Artist shows work at a venue — dates, commission, insurance, transport",
    color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED",
    who: "Artist ↔ Venue",
  },
  {
    key: "collaboration" as ContractType,
    label: "Collaboration Agreement",
    emoji: "🤝",
    desc: "Two artists co-creating — credits, IP split, revenue division",
    color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9",
    who: "Artist ↔ Artist",
  },
  {
    key: "commission" as ContractType,
    label: "Commission Agreement",
    emoji: "🎨",
    desc: "Creating a work on request — specs, fee, timeline, delivery",
    color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04",
    who: "Artist ↔ Buyer / Venue",
  },
  {
    key: "general" as ContractType,
    label: "General Partnership",
    emoji: "📋",
    desc: "Flexible catch-all agreement for any arrangement",
    color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A",
    who: "Any ↔ Any",
  },
];

// ── Shared form primitives ─────────────────────────────────────────
const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", background: "#fff",
  border: "2px solid #E8E0D0", borderRadius: 11, fontSize: 13,
  fontFamily: "inherit", fontWeight: 600, color: "#111110",
  outline: "none", boxSizing: "border-box", transition: "border-color .15s",
};
function FI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={INP} {...props}
    onFocus={e => (e.target.style.borderColor = "#FFD400")}
    onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />;
}
function FTA(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea style={{ ...INP, resize: "vertical" }} {...props}
    onFocus={e => (e.target.style.borderColor = "#FFD400")}
    onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />;
}
function FSel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select style={{ ...INP, cursor: "pointer" }} {...props}
    onFocus={e => (e.target.style.borderColor = "#FFD400")}
    onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />;
}
function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 6 }}>
      {children}{hint && <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#C0B8A8", marginLeft: 4 }}>{hint}</span>}
    </div>
  );
}
function Section({ title, emoji, children }: { title: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8" }}>
      <div style={{ padding: "13px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", gap: 8 }}>
        {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
        <span style={{ fontSize: 13, fontWeight: 900, color: "#111110" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

// ── Party search component ─────────────────────────────────────────
function PartyPicker({ value, onChange, label, myId }: {
  value: Party | null;
  onChange: (p: Party | null) => void;
  label: string;
  myId: string;
}) {
  const sb = createClient();
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showExt,   setShowExt]   = useState(false);
  const [extName,   setExtName]   = useState("");
  const [extEmail,  setExtEmail]  = useState("");
  const [extRole,   setExtRole]   = useState("artist");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQuery(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await sb.from("profiles")
        .select("id,full_name,username,role,avatar_url")
        .neq("id", myId)
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(6);
      setResults(data || []);
      setSearching(false);
    }, 300);
  }

  function pickUser(u: any) {
    onChange({ id: u.id, name: u.full_name, email: "", role: u.role || "artist", avatar_url: u.avatar_url, username: u.username });
    setQuery(""); setResults([]);
  }

  function confirmExternal() {
    if (!extName.trim()) return;
    onChange({ name: extName.trim(), email: extEmail.trim(), role: extRole, isExternal: true });
    setShowExt(false); setExtName(""); setExtEmail("");
  }

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#111110", overflow: "hidden", flexShrink: 0 }}>
          {value.avatar_url ? <img src={value.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(value.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{value.name}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>
            {value.isExternal ? "⚡ External · " : ""}
            {value.role}{value.email ? ` · ${value.email}` : ""}
          </div>
        </div>
        <button type="button" onClick={() => onChange(null)}
          style={{ width: 26, height: 26, borderRadius: 8, border: "1.5px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={12} color="#9B8F7A" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <Label>{label}</Label>

      {!showExt ? (
        <>
          {/* Search on-platform users */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, padding: "0 12px", transition: "border-color .15s", marginBottom: 8 }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "#FFD400")}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "#E8E0D0")}>
            <Search size={13} color="#9B8F7A" />
            <input value={query} onChange={e => handleQuery(e.target.value)} placeholder="Search by name or @username…"
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#111110", background: "transparent", padding: "10px 0" }} />
            {searching && <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #FFD400", borderTopColor: "transparent", animation: "spin .6s linear infinite", flexShrink: 0 }} />}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ background: "#fff", border: "2px solid #111110", borderRadius: 13, boxShadow: "4px 4px 0 #111110", overflow: "hidden", marginBottom: 8 }}>
              {results.map(u => (
                <button key={u.id} type="button" onClick={() => pickUser(u)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", borderBottom: "1px solid #F5F0E8", background: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F5F0E8", border: "1.5px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, overflow: "hidden", flexShrink: 0 }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(u.full_name || "?")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{u.full_name}</div>
                    <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>{u.role} {u.username ? `· @${u.username}` : ""}</div>
                  </div>
                  <ChevronRight size={13} color="#C0B8A8" />
                </button>
              ))}
            </div>
          )}

          {/* External option */}
          <button type="button" onClick={() => setShowExt(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", border: "1.5px dashed #D4C9A8", borderRadius: 10, background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A", transition: "all .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.color="#111110"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#D4C9A8"; (e.currentTarget as HTMLElement).style.color="#9B8F7A"; }}>
            <Plus size={12} /> Add external party (not on Artomango)
          </button>
        </>
      ) : (
        /* External party form */
        <div style={{ padding: "14px", background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: 13, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#111110", marginBottom: -2 }}>External party details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FI value={extName} onChange={e => setExtName(e.target.value)} placeholder="Full name *" />
            <FI type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} placeholder="Email (for link)" />
          </div>
          <FSel value={extRole} onChange={e => setExtRole(e.target.value)}>
            <option value="artist">Artist</option>
            <option value="venue">Venue / Gallery</option>
            <option value="collector">Collector</option>
            <option value="other">Other</option>
          </FSel>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setShowExt(false)} style={{ flex: 1, padding: "8px", border: "1.5px solid #E8E0D0", borderRadius: 9, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>Cancel</button>
            <button type="button" onClick={confirmExternal} disabled={!extName.trim()} style={{ flex: 2, padding: "8px", border: "2px solid #111110", borderRadius: 9, background: extName.trim() ? "#FFD400" : "#F5F0E8", fontSize: 12, fontWeight: 800, cursor: extName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110" }}>
              Add external party ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Artwork picker ─────────────────────────────────────────────────
function ArtworkPicker({ artworks, selected, onChange }: {
  artworks: Artwork[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }
  if (artworks.length === 0) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "#C0B8A8" }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>🎨</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>No artworks in your inventory yet</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>Select the works included in this agreement</div>
      {artworks.map(aw => {
        const on = selected.includes(aw.id);
        const img = Array.isArray(aw.images) ? aw.images[0] : null;
        return (
          <button key={aw.id} type="button" onClick={() => toggle(aw.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", border: `2px solid ${on ? "#7C3AED" : "#E8E0D0"}`, borderRadius: 12, background: on ? "#EDE9FE" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .12s", boxShadow: on ? "2px 2px 0 #111110" : "none" }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, overflow: "hidden", border: "1.5px solid #E8E0D0", flexShrink: 0, background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={14} color="#D4C9A8" />}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A" }}>
                {aw.medium || "—"}{aw.price ? ` · €${Number(aw.price).toLocaleString()}` : ""}
              </div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? "#7C3AED" : "#E8E0D0"}`, background: on ? "#7C3AED" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {on && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
      {selected.length > 0 && (
        <div style={{ padding: "6px 11px", background: "#EDE9FE", border: "1.5px solid #C4B5FD", borderRadius: 9, fontSize: 11, fontWeight: 700, color: "#6D28D9" }}>
          ✓ {selected.length} artwork{selected.length > 1 ? "s" : ""} linked to this contract
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NewContractPage() {
  const router     = useRouter();
  const params     = useSearchParams();

  // Pre-select type from query param e.g. /contracts/new?type=exhibition
  const preType    = params.get("type") as ContractType | null;

  const [step,     setStep]     = useState<"type" | "form">(preType ? "form" : "type");
  const [cType,    setCType]    = useState<ContractType>(preType || "exhibition");
  const [myId,     setMyId]     = useState("");
  const [myName,   setMyName]   = useState("");
  const [myRole,   setMyRole]   = useState("artist");
  const [myEmail,  setMyEmail]  = useState("");
  const [counterparty, setCounterparty] = useState<Party | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [linkedArtworks, setLinkedArtworks] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<string[]>([]);

  // Form fields
  const [form, setForm] = useState({
    title: "",
    description: "",
    special_conditions: "",
    venue_name: "",
    venue_address: "",
    start_date: "",
    end_date: "",
    // Exhibition
    commission_pct: "",
    artwork_insurance: false,
    insurance_value: "",
    installation_date: "",
    deinstallation_date: "",
    opening_event_date: "",
    transport_by: "artist",
    unsold_return_by: "",
    // Collaboration
    ip_split: "50/50",
    credit_line: "",
    revenue_split: "",
    deliverables: "",
    // Commission
    commission_fee: "",
    deposit_pct: "30",
    deposit_due_date: "",
    final_payment_date: "",
    artwork_specs: "",
    revision_rounds: "2",
    delivery_method: "pickup",
    // General
    agreed_terms: "",
  });

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const sb2 = (k: string) => () => setForm(p => ({ ...p, [k]: !(p as any)[k] }));

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      setMyEmail(user.email || "");
      const { data: prof } = await sb.from("profiles").select("full_name,role").eq("id", user.id).single();
      setMyName(prof?.full_name || "");
      setMyRole(prof?.role || "artist");
      const { data: aws } = await sb.from("artworks").select("id,title,images,medium,price,status").eq("user_id", user.id).order("created_at", { ascending: false });
      setArtworks(aws || []);
    });
  }, []);

  // Auto-fill title when type + counterparty chosen
  useEffect(() => {
    if (!form.title && counterparty?.name) {
      const typeCfg = CONTRACT_TYPES.find(t => t.key === cType);
      setForm(p => ({ ...p, title: `${typeCfg?.label} — ${counterparty.name}` }));
    }
  }, [counterparty, cType]);

  const showArtworks = cType === "exhibition" || cType === "commission";
  const typeCfg = CONTRACT_TYPES.find(t => t.key === cType)!;

  async function handleSave(sendNow: boolean) {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Please add a title for this contract");
    if (!counterparty)       errs.push("Please add the other party");
    if (errs.length) { setErrors(errs); return; }
    setErrors([]); setSaving(true);

    const sb = createClient();
    const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);

    // Generate external token if counterparty has no account
    const token = !counterparty!.id
      ? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      : null;

    const payload: Record<string, unknown> = {
      contract_type:        cType,
      status:               sendNow ? "sent" : "draft",
      title:                form.title.trim(),
      initiator_id:         myId,
      initiator_role:       myRole,
      initiator_name:       myName,
      initiator_email:      myEmail,
      counterparty_id:      counterparty!.id || null,
      counterparty_role:    counterparty!.role,
      counterparty_name:    counterparty!.name,
      counterparty_email:   counterparty!.email || null,
      counterparty_token:   token,
      description:          form.description  || null,
      special_conditions:   form.special_conditions || null,
      venue_name:           form.venue_name   || null,
      venue_address:        form.venue_address || null,
      start_date:           form.start_date   || null,
      end_date:             form.end_date     || null,
    };

    // Type-specific fields
    if (cType === "exhibition") {
      Object.assign(payload, {
        commission_pct:      numOrNull(form.commission_pct),
        artwork_insurance:   form.artwork_insurance,
        insurance_value:     numOrNull(form.insurance_value),
        installation_date:   form.installation_date   || null,
        deinstallation_date: form.deinstallation_date || null,
        opening_event_date:  form.opening_event_date  || null,
        transport_by:        form.transport_by         || null,
        unsold_return_by:    form.unsold_return_by     || null,
      });
    } else if (cType === "collaboration") {
      Object.assign(payload, {
        ip_split:     form.ip_split    || null,
        credit_line:  form.credit_line || null,
        revenue_split: form.revenue_split || null,
        deliverables: form.deliverables  || null,
      });
    } else if (cType === "commission") {
      Object.assign(payload, {
        commission_fee:     numOrNull(form.commission_fee),
        deposit_pct:        numOrNull(form.deposit_pct),
        deposit_due_date:   form.deposit_due_date   || null,
        final_payment_date: form.final_payment_date || null,
        artwork_specs:      form.artwork_specs       || null,
        revision_rounds:    numOrNull(form.revision_rounds),
        delivery_method:    form.delivery_method     || null,
      });
    } else {
      payload.agreed_terms = form.agreed_terms || null;
    }

    const { data: contract, error } = await sb.from("contracts").insert(payload).select().single();
    if (error || !contract) { setSaving(false); setErrors([error?.message || "Failed to save"]); return; }

    // Link artworks
    if (linkedArtworks.length > 0) {
      await sb.from("contract_artworks").insert(
        linkedArtworks.map(aid => ({ contract_id: contract.id, artwork_id: aid }))
      );
    }

    setSaving(false);
    router.push(`/dashboard/contracts/${contract.id}`);
  }

  // ── STEP 1: Type selector ──────────────────────────────────────
  if (step === "type") {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <Link href="/dashboard/contracts" style={{ textDecoration: "none" }}>
              <button type="button" style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ArrowLeft size={16} color="#9B8F7A" />
              </button>
            </Link>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111110", margin: 0, letterSpacing: "-.5px" }}>New Contract</h1>
              <p style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, margin: 0 }}>What kind of agreement is this?</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CONTRACT_TYPES.map(t => (
              <button key={t.key} type="button" onClick={() => { setCType(t.key); setStep("form"); }}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .2s cubic-bezier(.16,1,.3,1)", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor="#111110"; el.style.boxShadow="4px 5px 0 #111110"; el.style.transform="translate(-2px,-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor="#E8E0D0"; el.style.boxShadow="none"; el.style.transform="none"; }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: `linear-gradient(${t.grad})` }} />
                <div style={{ width: 52, height: 52, borderRadius: 15, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: `2px solid ${t.color}20` }}>
                  {t.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 3 }}>{t.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.5 }}>{t.desc}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: t.color, marginTop: 5, textTransform: "uppercase", letterSpacing: ".1em" }}>{t.who}</div>
                </div>
                <ChevronRight size={18} color="#C0B8A8" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── STEP 2: Form ───────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div className="cn-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button type="button" onClick={() => setStep("type")} style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={16} color="#9B8F7A" />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: typeCfg.bg, border: `1.5px solid ${typeCfg.color}30`, fontSize: 10, fontWeight: 800, color: typeCfg.color }}>
                {typeCfg.emoji} {typeCfg.label}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(16px,2.5vw,22px)", fontWeight: 900, color: "#111110", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {form.title || "New Contract"}
            </h1>
          </div>
        </div>
        <div className="cn-actions">
          <Link href="/dashboard/contracts" style={{ textDecoration: "none" }}>
            <button type="button" style={{ padding: "9px 16px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>Cancel</button>
          </Link>
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            style={{ padding: "9px 16px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>
            Save draft
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", border: "2.5px solid #111110", borderRadius: 11, background: saving ? "#F5F0E8" : "#FFD400", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving ? "none" : "3px 3px 0 #111110", transition: "all .15s" }}>
            {saving ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #111110", borderTopColor: "transparent", animation: "spin .6s linear infinite" }} /> Saving…</> : <><Save size={13} /> Send for signature</>}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#FEF2F2", border: "2px solid #EF4444", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            {errors.map((e, i) => <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{e}</div>)}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="cn-grid">

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Contract basics */}
          <Section title="Contract Basics" emoji="📋">
            <div>
              <Label>Contract Title</Label>
              <FI value={form.title} onChange={sf("title")} placeholder={`${typeCfg.label} — Party Name`} />
            </div>
            <div>
              <Label>Description / Purpose</Label>
              <FTA rows={2} value={form.description} onChange={sf("description")} placeholder="What is this agreement about? Keep it clear and simple." />
            </div>
            <div className="cn-grid-2">
              <div>
                <Label>Start Date</Label>
                <FI type="date" value={form.start_date} onChange={sf("start_date")} />
              </div>
              <div>
                <Label>End Date</Label>
                <FI type="date" value={form.end_date} onChange={sf("end_date")} />
              </div>
            </div>
            {(cType === "exhibition" || cType === "commission") && (
              <div>
                <Label>Venue / Location Name</Label>
                <FI value={form.venue_name} onChange={sf("venue_name")} placeholder="Gallery name, studio, etc." />
              </div>
            )}
            {form.venue_name && (
              <div>
                <Label hint="(optional)">Venue Address</Label>
                <FI value={form.venue_address} onChange={sf("venue_address")} placeholder="Full address" />
              </div>
            )}
          </Section>

          {/* ── Exhibition specific ── */}
          {cType === "exhibition" && (
            <Section title="Exhibition Terms" emoji="🖼️">
              <div className="cn-grid-2">
                <div>
                  <Label hint="(%)">Gallery Commission</Label>
                  <FI type="number" min="0" max="100" value={form.commission_pct} onChange={sf("commission_pct")} placeholder="e.g. 40" />
                </div>
                <div>
                  <Label>Transport by</Label>
                  <FSel value={form.transport_by} onChange={sf("transport_by")}>
                    <option value="artist">Artist</option>
                    <option value="venue">Venue</option>
                    <option value="shared">Shared (split cost)</option>
                  </FSel>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={sb2("artwork_insurance")}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.artwork_insurance ? "#FFD400" : "#E8E0D0"}`, background: form.artwork_insurance ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}>
                  {form.artwork_insurance && <Check size={11} strokeWidth={3} color="#111110" />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>Venue provides artwork insurance</span>
              </div>
              {form.artwork_insurance && (
                <div>
                  <Label>Insurance Value (€)</Label>
                  <FI type="number" min="0" value={form.insurance_value} onChange={sf("insurance_value")} placeholder="Total insured value" />
                </div>
              )}
              <div className="cn-grid-2">
                <div><Label>Installation Date</Label><FI type="date" value={form.installation_date} onChange={sf("installation_date")} /></div>
                <div><Label>Opening Event</Label><FI type="date" value={form.opening_event_date} onChange={sf("opening_event_date")} /></div>
              </div>
              <div className="cn-grid-2">
                <div><Label>Deinstallation Date</Label><FI type="date" value={form.deinstallation_date} onChange={sf("deinstallation_date")} /></div>
                <div><Label>Unsold Works Return By</Label><FI type="date" value={form.unsold_return_by} onChange={sf("unsold_return_by")} /></div>
              </div>
            </Section>
          )}

          {/* ── Collaboration specific ── */}
          {cType === "collaboration" && (
            <Section title="Collaboration Terms" emoji="🤝">
              <div>
                <Label>IP / Ownership Split</Label>
                <FSel value={form.ip_split} onChange={sf("ip_split")}>
                  <option value="50/50">50/50 — Equal ownership</option>
                  <option value="initiator">Initiator owns fully</option>
                  <option value="counterparty">Other party owns fully</option>
                  <option value="custom">Custom (define in special conditions)</option>
                </FSel>
              </div>
              <div>
                <Label>Revenue Split</Label>
                <FI value={form.revenue_split} onChange={sf("revenue_split")} placeholder="e.g. 60% Artist / 40% Venue, or 50/50" />
              </div>
              <div>
                <Label>Credit Line</Label>
                <FI value={form.credit_line} onChange={sf("credit_line")} placeholder='How credit appears e.g. "A & B in collaboration"' />
              </div>
              <div>
                <Label hint="(optional)">Deliverables</Label>
                <FTA rows={2} value={form.deliverables} onChange={sf("deliverables")} placeholder="What each party commits to delivering…" />
              </div>
            </Section>
          )}

          {/* ── Commission specific ── */}
          {cType === "commission" && (
            <Section title="Commission Terms" emoji="🎨">
              <div className="cn-grid-2">
                <div>
                  <Label>Commission Fee (€)</Label>
                  <FI type="number" min="0" value={form.commission_fee} onChange={sf("commission_fee")} placeholder="Total agreed fee" />
                </div>
                <div>
                  <Label hint="(% upfront)">Deposit</Label>
                  <FI type="number" min="0" max="100" value={form.deposit_pct} onChange={sf("deposit_pct")} placeholder="30" />
                </div>
              </div>
              <div className="cn-grid-2">
                <div><Label>Deposit Due</Label><FI type="date" value={form.deposit_due_date} onChange={sf("deposit_due_date")} /></div>
                <div><Label>Final Payment Due</Label><FI type="date" value={form.final_payment_date} onChange={sf("final_payment_date")} /></div>
              </div>
              <div>
                <Label>Artwork Specifications</Label>
                <FTA rows={2} value={form.artwork_specs} onChange={sf("artwork_specs")} placeholder="Size, medium, subject matter, style references…" />
              </div>
              <div className="cn-grid-2">
                <div>
                  <Label>Revision Rounds</Label>
                  <FSel value={form.revision_rounds} onChange={sf("revision_rounds")}>
                    {["1","2","3","5","unlimited"].map(v => <option key={v} value={v}>{v === "unlimited" ? "Unlimited" : `${v} round${v !== "1" ? "s" : ""}`}</option>)}
                  </FSel>
                </div>
                <div>
                  <Label>Delivery Method</Label>
                  <FSel value={form.delivery_method} onChange={sf("delivery_method")}>
                    <option value="pickup">Pickup in person</option>
                    <option value="shipping">Shipping (artist arranges)</option>
                    <option value="digital">Digital delivery</option>
                    <option value="venue">Venue collects</option>
                  </FSel>
                </div>
              </div>
            </Section>
          )}

          {/* ── General specific ── */}
          {cType === "general" && (
            <Section title="Agreement Terms" emoji="📋">
              <div>
                <Label>What has been agreed?</Label>
                <FTA rows={5} value={form.agreed_terms} onChange={sf("agreed_terms")} placeholder="Describe the full agreement in plain language. No legal jargon needed — just be clear and specific about what both parties commit to." />
              </div>
            </Section>
          )}

          {/* Special conditions (all types) */}
          <Section title="Special Conditions" emoji="📝">
            <FTA rows={2} value={form.special_conditions} onChange={sf("special_conditions")} placeholder="Any extra terms, exceptions, or clarifications both parties have agreed on…" />
          </Section>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Parties */}
          <Section title="The Parties" emoji="🤝">
            {/* My side */}
            <div>
              <Label>You ({myRole})</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "#111110", borderRadius: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
                  {myName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#FFD400" }}>{myName}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,212,0,.5)" }}>{myRole} · Initiating party</div>
                </div>
              </div>
            </div>

            <PartyPicker value={counterparty} onChange={setCounterparty} label="Other Party" myId={myId} />
          </Section>

          {/* Artwork linking */}
          {showArtworks && (
            <Section title="Linked Artworks" emoji="🖼️">
              <ArtworkPicker artworks={artworks} selected={linkedArtworks} onChange={setLinkedArtworks} />
            </Section>
          )}

          {/* What happens next */}
          <div style={{ background: "#111110", borderRadius: 18, padding: "16px 18px", border: "2px solid #111110", boxShadow: "3px 3px 0 #D4C9A8" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#FFD400", marginBottom: 10 }}>What happens when you send</div>
            {[
              counterparty?.id
                ? "The other party gets a notification in their Artomango dashboard"
                : "A unique signing link is generated for the external party",
              "Both parties review and sign with their full name",
              "When both have signed, the contract is sealed and saved",
              "Key dates will be added to both calendars when signed",
              showArtworks && linkedArtworks.length > 0
                ? `${linkedArtworks.length} artwork${linkedArtworks.length > 1 ? "s" : ""} will be noted in their passport`
                : null,
            ].filter(Boolean).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: "#111110" }}>{i + 1}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.6)", lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Save buttons repeat */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" onClick={() => handleSave(true)} disabled={saving}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", border: "2.5px solid #111110", borderRadius: 14, background: saving ? "#F5F0E8" : "#FFD400", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving ? "none" : "3px 3px 0 #111110" }}>
              {saving ? "Saving…" : <><Save size={14} /> Send for Signature</>}
            </button>
            <button type="button" onClick={() => handleSave(false)} disabled={saving}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "10px", border: "2px solid #E8E0D0", borderRadius: 14, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>
              <FileText size={13} /> Save as draft
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .cn-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
  .cn-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
  .cn-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; align-items:start; }
  .cn-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  @media (max-width:820px) { .cn-grid { grid-template-columns:1fr !important; } }
  @media (max-width:640px) {
    .cn-header { flex-direction:column; align-items:flex-start; }
    .cn-actions { width:100%; flex-wrap:wrap; }
    .cn-actions > * { flex:1; justify-content:center !important; }
    .cn-grid-2 { grid-template-columns:1fr !important; }
  }
`;
