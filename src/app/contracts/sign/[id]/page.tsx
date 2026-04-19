"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Shield, CheckCircle2, AlertCircle, Handshake } from "lucide-react";

// ── Config ─────────────────────────────────────────────────────────
const CONTRACT_TYPES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  exhibition:    { label: "Exhibition Agreement",    emoji: "🖼️", color: "#7C3AED", bg: "#EDE9FE" },
  collaboration: { label: "Collaboration Agreement", emoji: "🤝", color: "#0EA5E9", bg: "#E0F2FE" },
  commission:    { label: "Commission Agreement",    emoji: "🎨", color: "#CA8A04", bg: "#FEF9C3" },
  general:       { label: "General Partnership",     emoji: "📋", color: "#16A34A", bg: "#DCFCE7" },
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F0E8", gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ExternalSignPage() {
  const { id } = useParams<{ id: string }>();

  const [contract,  setContract]  = useState<any>(null);
  const [artworks,  setArtworks]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [sigName,   setSigName]   = useState("");
  const [agreed,    setAgreed]    = useState(false);
  const [signing,   setSigning]   = useState(false);
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    if (!id) return;
    const sb = createClient();
    sb.from("contracts").select("*").eq("id", id).single().then(async ({ data, error: err }) => {
      if (err || !data) { setError("This contract link is invalid or has expired."); setLoading(false); return; }
      if (data.status === "signed") { setDone(true); setLoading(false); setContract(data); return; }
      if (data.status === "cancelled") { setError("This contract has been cancelled."); setLoading(false); return; }
      setContract(data);

      const { data: ca } = await sb.from("contract_artworks")
        .select("artwork_id, artworks(id,title,medium,price)")
        .eq("contract_id", id);
      setArtworks((ca || []).map((r: any) => r.artworks));
      setLoading(false);
    });
  }, [id]);

  async function handleSign() {
    if (!sigName.trim() || !agreed) return;
    setSigning(true);
    const sb = createClient();
    const now = new Date().toISOString();

    const bothSigned = !!contract.initiator_signed_at;
    const update: Record<string, unknown> = {
      counterparty_signed_at: now,
      counterparty_signature: sigName.trim(),
      status: bothSigned ? "signed" : "partially_signed",
    };
    if (bothSigned) update.executed_at = now;

    await sb.from("contracts").update(update).eq("id", id);

    // Provenance notes on artworks if fully signed
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

    setSigning(false);
    setDone(true);
  }

  // ── States ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#FFFBEA" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #FFD400", borderTopColor: "transparent", animation: "spin .7s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading contract…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#FFFBEA", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 8 }}>Link unavailable</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A" }}>{error}</div>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#FFFBEA", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", border: "3px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <CheckCircle2 size={36} color="#16A34A" />
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#111110", marginBottom: 8, letterSpacing: "-.5px" }}>
          {contract?.status === "signed" ? "Contract fully executed! 🎉" : "Signature received!"}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.7, marginBottom: 24 }}>
          {contract?.status === "signed"
            ? "Both parties have signed. The agreement is now active. You'll receive a copy by email."
            : "Your signature has been recorded. The other party will be notified to complete their signature."}
        </div>
        <div style={{ padding: "14px 20px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 14, fontSize: 13, fontWeight: 600, color: "#9B8F7A" }}>
          You can close this page safely.
        </div>
        <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, color: "#C0B8A8" }}>
          Powered by Artomango · <a href="/" style={{ color: "#FFD400", fontWeight: 700, textDecoration: "none" }}>artomango.com</a>
        </div>
      </div>
    </div>
  );

  if (!contract) return null;

  const typeCfg = CONTRACT_TYPES[contract.contract_type] || CONTRACT_TYPES.general;
  const alreadySigned = !!contract.counterparty_signed_at;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Darker Grotesque', system-ui, sans-serif; background: #FFFBEA; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#FFFBEA" }}>

        {/* Top bar */}
        <div style={{ background: "#111110", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#111110" }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#FFD400" }}>Artomango</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>Secure signing page</span>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* Contract header */}
          <div style={{ animation: "fadeUp .4s ease both", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: typeCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `2px solid ${typeCfg.color}20`, flexShrink: 0 }}>
                {typeCfg.emoji}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: typeCfg.color, textTransform: "uppercase", letterSpacing: ".1em" }}>{typeCfg.label}</div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-.5px", margin: 0 }}>{contract.title}</h1>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A" }}>
              You've been invited to sign this agreement by <strong style={{ color: "#111110" }}>{contract.initiator_name}</strong>.
              Please review all terms carefully before signing.
            </div>
          </div>

          {/* Parties */}
          <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", marginBottom: 18, animation: "fadeUp .4s .06s ease both" }}>
            <div style={{ padding: "12px 16px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", fontSize: 13, fontWeight: 900, color: "#111110", display: "flex", alignItems: "center", gap: 7 }}>
              <Handshake size={14} color="#9B8F7A" /> The Parties
            </div>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>{contract.initiator_role}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{contract.initiator_name}</div>
                {contract.initiator_email && <div style={{ fontSize: 11, color: "#9B8F7A" }}>{contract.initiator_email}</div>}
              </div>
              <Handshake size={18} color="#D4C9A8" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 120, textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>{contract.counterparty_role}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{contract.counterparty_name}</div>
                {contract.counterparty_email && <div style={{ fontSize: 11, color: "#9B8F7A" }}>{contract.counterparty_email}</div>}
              </div>
            </div>
          </div>

          {/* Contract terms */}
          <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", marginBottom: 18, animation: "fadeUp .4s .1s ease both" }}>
            <div style={{ padding: "12px 16px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", fontSize: 13, fontWeight: 900, color: "#111110" }}>📋 Terms & Details</div>
            <div style={{ padding: "6px 16px 14px" }}>
              {contract.description && <p style={{ fontSize: 13, fontWeight: 500, color: "#5C5346", lineHeight: 1.7, margin: "12px 0 14px", paddingBottom: 12, borderBottom: "1px solid #F5F0E8" }}>{contract.description}</p>}
              <Row label="Start Date"    value={fmtDate(contract.start_date)} />
              <Row label="End Date"      value={fmtDate(contract.end_date)} />
              <Row label="Venue"         value={contract.venue_name} />
              {contract.contract_type === "exhibition" && <>
                <Row label="Commission"    value={contract.commission_pct ? `${contract.commission_pct}%` : null} />
                <Row label="Transport"     value={contract.transport_by} />
                <Row label="Insurance"     value={contract.artwork_insurance ? "Provided by venue" : "Not included"} />
                <Row label="Opening"       value={fmtDate(contract.opening_event_date)} />
                <Row label="Return By"     value={fmtDate(contract.unsold_return_by)} />
              </>}
              {contract.contract_type === "collaboration" && <>
                <Row label="IP Split"      value={contract.ip_split} />
                <Row label="Revenue Split" value={contract.revenue_split} />
                <Row label="Credit"        value={contract.credit_line} />
              </>}
              {contract.contract_type === "commission" && <>
                <Row label="Fee"           value={contract.commission_fee ? `€${Number(contract.commission_fee).toLocaleString()}` : null} />
                <Row label="Deposit"       value={contract.deposit_pct ? `${contract.deposit_pct}% upfront` : null} />
                <Row label="Delivery"      value={contract.delivery_method} />
                <Row label="Revisions"     value={contract.revision_rounds ? `${contract.revision_rounds} rounds` : null} />
              </>}
              {contract.contract_type === "general" && contract.agreed_terms && (
                <div style={{ paddingTop: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{contract.agreed_terms}</p>
                </div>
              )}
              {contract.special_conditions && <Row label="Special Conditions" value={contract.special_conditions} />}
            </div>
          </div>

          {/* Artwork list */}
          {artworks.length > 0 && (
            <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", marginBottom: 18, animation: "fadeUp .4s .14s ease both" }}>
              <div style={{ padding: "12px 16px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", fontSize: 13, fontWeight: 900, color: "#111110" }}>🖼️ Included Artworks</div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {artworks.map((aw: any) => (
                  <div key={aw.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#FAF7F3", borderRadius: 10, border: "1px solid #E8E0D0" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{aw.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{aw.medium || "—"}{aw.price ? ` · €${Number(aw.price).toLocaleString()}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initiator signature status */}
          <div style={{ padding: "12px 16px", background: contract.initiator_signed_at ? "#F0FDF4" : "#FEF9C3", border: `2px solid ${contract.initiator_signed_at ? "#86EFAC" : "#FDE047"}`, borderRadius: 13, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, animation: "fadeUp .4s .18s ease both" }}>
            {contract.initiator_signed_at
              ? <CheckCircle2 size={16} color="#16A34A" />
              : <AlertCircle size={16} color="#CA8A04" />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: contract.initiator_signed_at ? "#166534" : "#713F12" }}>
                {contract.initiator_signed_at
                  ? `${contract.initiator_name} has already signed this contract`
                  : `Waiting for ${contract.initiator_name} to sign first`}
              </div>
              {contract.initiator_signed_at && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#15803D", marginTop: 2, fontFamily: "Georgia, serif", fontStyle: "italic" }}>"{contract.initiator_signature}"</div>
              )}
            </div>
          </div>

          {/* Signing block */}
          {alreadySigned ? (
            <div style={{ padding: "20px", background: "#DCFCE7", border: "2px solid #86EFAC", borderRadius: 18, textAlign: "center", animation: "fadeUp .4s .2s ease both" }}>
              <CheckCircle2 size={28} color="#16A34A" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 15, fontWeight: 900, color: "#166534" }}>You already signed this contract</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#15803D", marginTop: 4, fontFamily: "Georgia, serif", fontStyle: "italic" }}>"{contract.counterparty_signature}"</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 18, overflow: "hidden", boxShadow: "4px 5px 0 #111110", animation: "fadeUp .4s .22s ease both" }}>
              <div style={{ height: 4, background: "linear-gradient(135deg,#FFD400,#FF6B6B)" }} />
              <div style={{ padding: "20px" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#111110", marginBottom: 4 }}>Your signature</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A", marginBottom: 16 }}>Type your full legal name below to sign this agreement</div>

                <div style={{ marginBottom: 14 }}>
                  <input value={sigName} onChange={e => setSigName(e.target.value)}
                    placeholder="Your full name…"
                    style={{ width: "100%", padding: "13px 15px", background: "#FFFBEA", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 18, fontFamily: "Georgia, serif", fontStyle: "italic", color: "#111110", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "#FFD400")}
                    onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }} onClick={() => setAgreed(p => !p)}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${agreed ? "#FFD400" : "#E8E0D0"}`, background: agreed ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all .15s" }}>
                    {agreed && <Check size={12} strokeWidth={3} color="#111110" />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#5C5346", lineHeight: 1.6 }}>
                    I have read and agree to all the terms in this contract. I understand that my typed name constitutes a legally binding digital signature on behalf of myself or the entity I represent.
                  </span>
                </div>

                <button onClick={handleSign} disabled={!sigName.trim() || !agreed || signing}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px", border: "2.5px solid #111110", borderRadius: 13, background: sigName.trim() && agreed && !signing ? "#FFD400" : "#F5F0E8", fontSize: 15, fontWeight: 800, cursor: sigName.trim() && agreed && !signing ? "pointer" : "not-allowed", fontFamily: "inherit", color: "#111110", boxShadow: sigName.trim() && agreed && !signing ? "4px 4px 0 #111110" : "none", transition: "all .15s" }}>
                  {signing ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #111110", borderTopColor: "transparent", animation: "spin .6s linear infinite" }} /> Signing…</> : <><Check size={15} /> Sign this contract</>}
                </button>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <Shield size={11} color="#9B8F7A" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>Secured by Artomango · Timestamp recorded on signing</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 32, textAlign: "center", fontSize: 11, fontWeight: 600, color: "#C0B8A8" }}>
            Powered by <a href="/" style={{ color: "#FFD400", fontWeight: 800, textDecoration: "none" }}>Artomango</a> · The platform for artists and venues
          </div>
        </div>
      </div>
    </>
  );
}
