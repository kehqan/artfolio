"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Check, Copy, ExternalLink, Shield,
  ImageIcon, Calendar, Handshake, FileText,
  CheckCircle2, Clock, XCircle, Edit2, Trash2,
  Hash, AlertCircle, Send,
} from "lucide-react";

// ── Config ─────────────────────────────────────────────────────────
const CONTRACT_TYPES: Record<string, { label: string; emoji: string; color: string; bg: string; grad: string }> = {
  exhibition:    { label: "Exhibition Agreement",    emoji: "🖼️", color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED" },
  collaboration: { label: "Collaboration Agreement", emoji: "🤝", color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9" },
  commission:    { label: "Commission Agreement",    emoji: "🎨", color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04" },
  general:       { label: "General Partnership",     emoji: "📋", color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A" },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:            { label: "Draft",            color: "#9B8F7A", bg: "#F5F0E8", icon: FileText     },
  sent:             { label: "Sent",             color: "#CA8A04", bg: "#FEF9C3", icon: Send          },
  partially_signed: { label: "Partially Signed", color: "#0EA5E9", bg: "#E0F2FE", icon: Clock         },
  signed:           { label: "Fully Signed",     color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2  },
  cancelled:        { label: "Cancelled",        color: "#EF4444", bg: "#FEF2F2", icon: XCircle       },
};

// ── Helpers ────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateShort(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Info row ───────────────────────────────────────────────────────
function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #F5F0E8", gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", textAlign: "right", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", ...style }}>{children}</div>;
}
function CardHead({ title, emoji }: { title: string; emoji?: string }) {
  return (
    <div style={{ padding: "12px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", gap: 8 }}>
      {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
      <span style={{ fontSize: 13, fontWeight: 900, color: "#111110" }}>{title}</span>
    </div>
  );
}

// ── Signing block ──────────────────────────────────────────────────
function SignBlock({
  label, role, signed, signedAt, signature, canSign,
  sigName, onSigChange, onSign, signing,
}: {
  label: string; role: string; signed: boolean; signedAt?: string | null;
  signature?: string | null; canSign: boolean;
  sigName: string; onSigChange: (v: string) => void;
  onSign: () => void; signing: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{ background: signed ? "#F0FDF4" : "#FAF7F3", border: `2px solid ${signed ? "#86EFAC" : "#E8E0D0"}`, borderRadius: 16, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em" }}>{role}</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>{label}</div>
        </div>
        {signed
          ? <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "#DCFCE7", border: "1.5px solid #86EFAC" }}>
              <CheckCircle2 size={13} color="#16A34A" />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#16A34A" }}>Signed</span>
            </div>
          : <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 99, background: "#F5F0E8", border: "1.5px solid #E8E0D0" }}>
              <Clock size={11} color="#9B8F7A" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>Pending</span>
            </div>
        }
      </div>

      {signed ? (
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#111110", fontStyle: "italic", marginBottom: 4 }}>{signature}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>Signed {fmtDateTime(signedAt)}</div>
        </div>
      ) : canSign ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>Type your full name to sign</div>
            <input value={sigName} onChange={e => onSigChange(e.target.value)}
              placeholder="Your full legal name…"
              style={{ width: "100%", padding: "10px 13px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, fontSize: 15, fontFamily: "Georgia, serif", fontStyle: "italic", color: "#111110", outline: "none", boxSizing: "border-box" }}
              onFocus={e => (e.target.style.borderColor = "#FFD400")}
              onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }} onClick={() => setAgreed(p => !p)}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${agreed ? "#FFD400" : "#E8E0D0"}`, background: agreed ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all .15s" }}>
              {agreed && <Check size={11} strokeWidth={3} color="#111110" />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#5C5346", lineHeight: 1.5 }}>
              I have read and agree to all the terms in this contract. I understand that my typed name constitutes a legally binding digital signature.
            </span>
          </div>
          <button onClick={onSign} disabled={!sigName.trim() || !agreed || signing}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", border: "2.5px solid #111110", borderRadius: 12, background: sigName.trim() && agreed && !signing ? "#FFD400" : "#F5F0E8", fontSize: 13, fontWeight: 800, cursor: sigName.trim() && agreed && !signing ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110", boxShadow: sigName.trim() && agreed && !signing ? "3px 3px 0 #111110" : "none", transition: "all .15s" }}>
            {signing ? "Signing…" : <><Check size={13} /> Sign Contract</>}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>Waiting for this party to sign…</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ContractDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [contract,  setContract]  = useState<any>(null);
  const [artworks,  setArtworks]  = useState<any[]>([]);
  const [myId,      setMyId]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);
  const [signing,   setSigning]   = useState(false);
  const [mySig,     setMySig]     = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    const { data: c } = await sb.from("contracts").select("*").eq("id", id).single();
    setContract(c);

    if (c) {
      const { data: ca } = await sb.from("contract_artworks")
        .select("artwork_id, notes, artworks(id,title,images,medium,price,status)")
        .eq("contract_id", id);
      setArtworks((ca || []).map((r: any) => ({ ...r.artworks, notes: r.notes })));
    }
    setLoading(false);
  }

  async function handleSign() {
    if (!mySig.trim()) return;
    setSigning(true);
    const sb = createClient();
    const isInitiator = contract.initiator_id === myId;
    const now = new Date().toISOString();

    const update: Record<string, unknown> = isInitiator
      ? { initiator_signed_at: now, initiator_signature: mySig.trim() }
      : { counterparty_signed_at: now, counterparty_signature: mySig.trim() };

    // Check if both will now be signed
    const bothSigned = isInitiator
      ? !!contract.counterparty_signed_at
      : !!contract.initiator_signed_at;

    if (bothSigned) {
      update.status      = "signed";
      update.executed_at = now;
    } else {
      update.status = "partially_signed";
    }

    await sb.from("contracts").update(update).eq("id", id);

    // Add provenance note to linked artworks if now fully signed
    if (bothSigned && artworks.length > 0) {
      for (const aw of artworks) {
        await sb.from("provenance_entries").insert({
          artwork_id:  aw.id,
          event_type:  contract.contract_type === "exhibition" ? "exhibited" : "transferred",
          date:        now.split("T")[0],
          notes:       `Part of signed contract: ${contract.title} (${contract.reference_number || id.slice(0, 8)})`,
        });
      }
    }

    // Create calendar events if fully signed
    if (bothSigned) {
      const events: any[] = [];
      const addEvent = (userId: string, type: string, title: string, date: string) => {
        if (date) events.push({ contract_id: id, user_id: userId, event_type: type, title, date });
      };
      const parties = [contract.initiator_id, contract.counterparty_id].filter(Boolean);
      parties.forEach((uid: string) => {
        if (contract.start_date)          addEvent(uid, "start",    `🚀 ${contract.title} — Starts`,         contract.start_date);
        if (contract.end_date)            addEvent(uid, "end",      `🏁 ${contract.title} — Ends`,           contract.end_date);
        if (contract.opening_event_date)  addEvent(uid, "opening",  `🎉 Opening: ${contract.title}`,         contract.opening_event_date);
        if (contract.installation_date)   addEvent(uid, "deadline", `🔧 Installation: ${contract.title}`,    contract.installation_date);
        if (contract.deinstallation_date) addEvent(uid, "deadline", `📦 Deinstall: ${contract.title}`,       contract.deinstallation_date);
        if (contract.deposit_due_date)    addEvent(uid, "deposit_due", `💰 Deposit Due: ${contract.title}`,  contract.deposit_due_date);
        if (contract.final_payment_date)  addEvent(uid, "delivery", `💳 Final Payment: ${contract.title}`,  contract.final_payment_date);
      });
      if (events.length > 0) {
        await sb.from("contract_calendar_events").insert(events);
      }
    }

    setSigning(false);
    load();
  }

  async function handleCancel() {
    if (!confirm("Cancel this contract? Both parties will be notified.")) return;
    setCancelling(true);
    const sb = createClient();
    await sb.from("contracts").update({ status: "cancelled" }).eq("id", id);
    setCancelling(false);
    load();
  }

  function copySigningLink() {
    const url = `${window.location.origin}/contracts/sign/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #FFD400", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading contract…</div>
      </div>
    </>
  );

  if (!contract) return (
    <>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111110", marginBottom: 16 }}>Contract not found</div>
        <Link href="/dashboard/contracts"><button style={{ padding: "10px 20px", background: "#FFD400", border: "2px solid #111110", borderRadius: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>← Back</button></Link>
      </div>
    </>
  );

  const typeCfg     = CONTRACT_TYPES[contract.contract_type] || CONTRACT_TYPES.general;
  const statusCfg   = STATUS_CFG[contract.status] || STATUS_CFG.draft;
  const isInitiator = contract.initiator_id === myId;
  const iSigned     = !!contract.initiator_signed_at;
  const theySigned  = !!contract.counterparty_signed_at;
  const iFullySigned = contract.status === "signed";
  const canISign    = isInitiator ? !iSigned : !theySigned;
  const isExternal  = !contract.counterparty_id;
  const isDraft     = contract.status === "draft";
  const isCancelled = contract.status === "cancelled";

  const StatusIcon = statusCfg.icon;

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div className="cd-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Link href="/dashboard/contracts" style={{ textDecoration: "none" }}>
            <button style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowLeft size={16} color="#9B8F7A" />
            </button>
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: typeCfg.bg, border: `1.5px solid ${typeCfg.color}30`, fontSize: 10, fontWeight: 800, color: typeCfg.color }}>
                {typeCfg.emoji} {typeCfg.label}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: statusCfg.bg, border: `1.5px solid ${statusCfg.color}30`, fontSize: 10, fontWeight: 800, color: statusCfg.color }}>
                <StatusIcon size={10} /> {statusCfg.label}
              </span>
              {contract.reference_number && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8", fontFamily: "monospace" }}>{contract.reference_number}</span>
              )}
            </div>
            <h1 style={{ fontSize: "clamp(16px,2.5vw,22px)", fontWeight: 900, color: "#111110", margin: 0, letterSpacing: "-.4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contract.title}</h1>
          </div>
        </div>

        <div className="cd-actions">
          {/* Copy external signing link */}
          {isExternal && !iFullySigned && !isCancelled && (
            <button onClick={copySigningLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: copied ? "#16A34A" : "#9B8F7A", transition: "all .15s" }}>
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy signing link</>}
            </button>
          )}
          {/* Cancel */}
          {!iFullySigned && !isCancelled && isInitiator && (
            <button onClick={handleCancel} disabled={cancelling} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", border: "2px solid #FFE4E6", borderRadius: 11, background: "#FFF5F5", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#EF4444" }}>
              <XCircle size={12} /> {cancelling ? "Cancelling…" : "Cancel contract"}
            </button>
          )}
        </div>
      </div>

      {/* ── Fully signed celebration banner ── */}
      {iFullySigned && (
        <div style={{ marginBottom: 18, padding: "14px 18px", background: "#111110", border: "2.5px solid #16A34A", borderRadius: 16, display: "flex", alignItems: "center", gap: 14, boxShadow: "3px 3px 0 #16A34A" }}>
          <div style={{ fontSize: 32, flexShrink: 0 }}>🎉</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD400" }}>Contract fully executed!</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>
              Both parties signed on {fmtDateShort(contract.executed_at)}. Key dates have been added to your calendar.
            </div>
          </div>
          <CheckCircle2 size={28} color="#16A34A" style={{ marginLeft: "auto", flexShrink: 0 }} />
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="cd-grid">

        {/* ── LEFT: Contract content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Overview */}
          <Card>
            <CardHead title="Contract Overview" emoji="📋" />
            <div style={{ padding: "6px 18px 14px" }}>
              {contract.description && (
                <p style={{ fontSize: 13, fontWeight: 500, color: "#5C5346", lineHeight: 1.75, margin: "12px 0 14px", paddingBottom: 14, borderBottom: "1px solid #F5F0E8" }}>
                  {contract.description}
                </p>
              )}
              <Row label="Start Date"    value={fmtDate(contract.start_date)} />
              <Row label="End Date"      value={fmtDate(contract.end_date)} />
              <Row label="Venue"         value={contract.venue_name} />
              <Row label="Venue Address" value={contract.venue_address} />
            </div>
          </Card>

          {/* Exhibition terms */}
          {contract.contract_type === "exhibition" && (
            <Card>
              <CardHead title="Exhibition Terms" emoji="🖼️" />
              <div style={{ padding: "6px 18px 14px" }}>
                <Row label="Gallery Commission" value={contract.commission_pct ? `${contract.commission_pct}%` : null} />
                <Row label="Transport"          value={contract.transport_by} />
                <Row label="Insurance"          value={contract.artwork_insurance ? `Yes — €${Number(contract.insurance_value || 0).toLocaleString()} insured` : "Not included"} />
                <Row label="Installation"       value={fmtDate(contract.installation_date)} />
                <Row label="Opening Event"      value={fmtDate(contract.opening_event_date)} />
                <Row label="Deinstallation"     value={fmtDate(contract.deinstallation_date)} />
                <Row label="Unsold Return By"   value={fmtDate(contract.unsold_return_by)} />
              </div>
            </Card>
          )}

          {/* Collaboration terms */}
          {contract.contract_type === "collaboration" && (
            <Card>
              <CardHead title="Collaboration Terms" emoji="🤝" />
              <div style={{ padding: "6px 18px 14px" }}>
                <Row label="IP / Ownership" value={contract.ip_split} />
                <Row label="Revenue Split"  value={contract.revenue_split} />
                <Row label="Credit Line"    value={contract.credit_line} />
                {contract.deliverables && (
                  <div style={{ paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>Deliverables</div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.7, margin: 0 }}>{contract.deliverables}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Commission terms */}
          {contract.contract_type === "commission" && (
            <Card>
              <CardHead title="Commission Terms" emoji="🎨" />
              <div style={{ padding: "6px 18px 14px" }}>
                <Row label="Commission Fee"    value={contract.commission_fee ? `€${Number(contract.commission_fee).toLocaleString()}` : null} />
                <Row label="Deposit"           value={contract.deposit_pct ? `${contract.deposit_pct}% — €${Math.round(contract.commission_fee * contract.deposit_pct / 100).toLocaleString()}` : null} />
                <Row label="Deposit Due"       value={fmtDate(contract.deposit_due_date)} />
                <Row label="Final Payment"     value={fmtDate(contract.final_payment_date)} />
                <Row label="Revision Rounds"   value={contract.revision_rounds} />
                <Row label="Delivery"          value={contract.delivery_method} />
                {contract.artwork_specs && (
                  <div style={{ paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>Artwork Specs</div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.7, margin: 0 }}>{contract.artwork_specs}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* General terms */}
          {contract.contract_type === "general" && contract.agreed_terms && (
            <Card>
              <CardHead title="Agreed Terms" emoji="📋" />
              <div style={{ padding: "14px 18px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{contract.agreed_terms}</p>
              </div>
            </Card>
          )}

          {/* Special conditions */}
          {contract.special_conditions && (
            <Card>
              <CardHead title="Special Conditions" emoji="📝" />
              <div style={{ padding: "14px 18px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.8, margin: 0 }}>{contract.special_conditions}</p>
              </div>
            </Card>
          )}

          {/* Linked artworks */}
          {artworks.length > 0 && (
            <Card>
              <CardHead title={`Linked Artworks (${artworks.length})`} emoji="🖼️" />
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {artworks.map((aw: any) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  return (
                    <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#FAF7F3", borderRadius: 12, border: "1.5px solid #E8E0D0", transition: "all .15s", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, overflow: "hidden", border: "1.5px solid #E8E0D0", flexShrink: 0, background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={14} color="#D4C9A8" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A" }}>{aw.medium || "—"}{aw.price ? ` · €${Number(aw.price).toLocaleString()}` : ""}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 8, background: "#DCFCE7", border: "1px solid #86EFAC" }}>
                          <Shield size={10} color="#16A34A" />
                          <span style={{ fontSize: 9, fontWeight: 800, color: "#16A34A" }}>In passport</span>
                        </div>
                        <ExternalLink size={11} color="#C0B8A8" style={{ flexShrink: 0 }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Parties + Signing ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Parties summary */}
          <Card>
            <CardHead title="The Parties" emoji="🤝" />
            <div style={{ padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#111110", borderRadius: 12, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
                  {contract.initiator_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#FFD400" }}>{contract.initiator_name}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,212,0,.4)" }}>{contract.initiator_role} · Initiator</div>
                </div>
                {iSigned && <CheckCircle2 size={16} color="#16A34A" style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: "#E8E0D0" }} />
                <Handshake size={16} color="#D4C9A8" />
                <div style={{ height: 1, flex: 1, background: "#E8E0D0" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FAF7F3", border: "1.5px solid #E8E0D0", borderRadius: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F5F0E8", border: "1.5px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#9B8F7A", flexShrink: 0 }}>
                  {contract.counterparty_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{contract.counterparty_name}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A" }}>
                    {contract.counterparty_role}
                    {isExternal ? " · ⚡ External" : ""}
                  </div>
                </div>
                {theySigned && <CheckCircle2 size={16} color="#16A34A" style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>

              {/* External link copy */}
              {isExternal && !iFullySigned && !isCancelled && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#FEF9C3", border: "1.5px solid #FDE047", borderRadius: 11 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#713F12", marginBottom: 6 }}>External party — share signing link</div>
                  <button onClick={copySigningLink} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", border: "1.5px solid #FDE047", borderRadius: 9, background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: copied ? "#16A34A" : "#92400E" }}>
                    {copied ? <><Check size={11} /> Copied to clipboard!</> : <><Copy size={11} /> Copy signing link</>}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Signing section */}
          {!isCancelled && contract.status !== "draft" && (
            <Card>
              <CardHead title="Signatures" emoji="✍️" />
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                <SignBlock
                  label={contract.initiator_name}
                  role={contract.initiator_role}
                  signed={iSigned}
                  signedAt={contract.initiator_signed_at}
                  signature={contract.initiator_signature}
                  canSign={isInitiator && !iSigned}
                  sigName={mySig}
                  onSigChange={setMySig}
                  onSign={handleSign}
                  signing={signing}
                />
                <SignBlock
                  label={contract.counterparty_name}
                  role={contract.counterparty_role}
                  signed={theySigned}
                  signedAt={contract.counterparty_signed_at}
                  signature={contract.counterparty_signature}
                  canSign={!isInitiator && !theySigned && !!myId}
                  sigName={mySig}
                  onSigChange={setMySig}
                  onSign={handleSign}
                  signing={signing}
                />
              </div>
            </Card>
          )}

          {/* Draft — send button */}
          {isDraft && isInitiator && (
            <Card>
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A", marginBottom: 12 }}>
                  This contract is saved as a draft. When you're ready, send it to {contract.counterparty_name} for signature.
                </div>
                <button onClick={async () => {
                  const sb = createClient();
                  await sb.from("contracts").update({ status: "sent" }).eq("id", id);
                  load();
                }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "12px", border: "2.5px solid #111110", borderRadius: 12, background: "#FFD400", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>
                  <Send size={13} /> Send for Signature
                </button>
              </div>
            </Card>
          )}

          {/* Calendar events */}
          <div style={{ padding: "14px 16px", background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 16, boxShadow: "2px 3px 0 #E0D8CA" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111110", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={14} color="#9B8F7A" /> Key Dates
            </div>
            {[
              { label: "Start",         date: contract.start_date },
              { label: "End",           date: contract.end_date },
              { label: "Opening",       date: contract.opening_event_date },
              { label: "Installation",  date: contract.installation_date },
              { label: "Deinstall",     date: contract.deinstallation_date },
              { label: "Deposit Due",   date: contract.deposit_due_date },
              { label: "Final Payment", date: contract.final_payment_date },
              { label: "Return By",     date: contract.unsold_return_by },
            ].filter(d => d.date).map(d => (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F5F0E8" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>{d.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#111110", fontFamily: "monospace" }}>{fmtDateShort(d.date)}</span>
              </div>
            ))}
            {![contract.start_date, contract.end_date, contract.opening_event_date, contract.installation_date, contract.deposit_due_date].some(Boolean) && (
              <div style={{ fontSize: 12, fontWeight: 600, color: "#C0B8A8" }}>No key dates set</div>
            )}
            {iFullySigned && (
              <div style={{ marginTop: 10, fontSize: 10, fontWeight: 700, color: "#16A34A", display: "flex", alignItems: "center", gap: 5 }}>
                <Check size={10} /> Dates added to both parties' calendars
              </div>
            )}
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

  .cd-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
  .cd-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
  .cd-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; align-items:start; }

  @media (max-width:900px) { .cd-grid { grid-template-columns:1fr !important; } }
  @media (max-width:640px) {
    .cd-header { flex-direction:column; align-items:flex-start; }
    .cd-actions { width:100%; flex-wrap:wrap; }
  }
`;
