"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, FileText, Search, X, Filter, Clock,
  CheckCircle2, AlertCircle, XCircle, Send,
  ChevronRight, Handshake, ImageIcon, Palette,
  Globe, ArrowRight, Copy, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Contract = {
  id: string;
  contract_type: "exhibition" | "collaboration" | "commission" | "general";
  status: "draft" | "sent" | "partially_signed" | "signed" | "cancelled" | "expired";
  title: string;
  reference_number?: string;
  initiator_id: string;
  initiator_name: string;
  initiator_role: string;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_role: string;
  counterparty_email?: string;
  start_date?: string;
  end_date?: string;
  venue_name?: string;
  initiator_signed_at?: string;
  counterparty_signed_at?: string;
  executed_at?: string;
  created_at: string;
};

// ── Config ─────────────────────────────────────────────────────────
const CONTRACT_TYPES = {
  exhibition:    { label: "Exhibition",    emoji: "🖼️", color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED" },
  collaboration: { label: "Collaboration", emoji: "🤝", color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9" },
  commission:    { label: "Commission",    emoji: "🎨", color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04" },
  general:       { label: "Partnership",   emoji: "📋", color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A" },
};

const STATUS_CFG = {
  draft:            { label: "Draft",           emoji: "✏️",  color: "#9B8F7A", bg: "#F5F0E8", icon: FileText    },
  sent:             { label: "Awaiting Signature", emoji: "📨", color: "#CA8A04", bg: "#FEF9C3", icon: Send        },
  partially_signed: { label: "Partially Signed",emoji: "✍️",  color: "#0EA5E9", bg: "#E0F2FE", icon: Clock       },
  signed:           { label: "Fully Signed",    emoji: "✅",  color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2 },
  cancelled:        { label: "Cancelled",       emoji: "❌",  color: "#EF4444", bg: "#FEF2F2", icon: XCircle     },
  expired:          { label: "Expired",         emoji: "⏰",  color: "#9B8F7A", bg: "#F5F0E8", icon: AlertCircle  },
};

// ── Helper ─────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Status badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: cfg.bg, border: `1.5px solid ${cfg.color}30`, fontSize: 10, fontWeight: 800, color: cfg.color, whiteSpace: "nowrap" }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── Signing progress ───────────────────────────────────────────────
function SignProgress({ contract, myId }: { contract: Contract; myId: string }) {
  const iAm = contract.initiator_id === myId ? "initiator" : "counterparty";
  const iSigned     = !!contract.initiator_signed_at;
  const theySigned  = !!contract.counterparty_signed_at;

  const myName    = iAm === "initiator" ? contract.initiator_name    : contract.counterparty_name;
  const theirName = iAm === "initiator" ? contract.counterparty_name : contract.initiator_name;
  const iSigned2  = iAm === "initiator" ? iSigned    : theySigned;
  const iSigned3  = iAm === "initiator" ? theySigned : iSigned;

  const dot = (signed: boolean) => (
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: signed ? "#16A34A" : "#E8E0D0", border: `2px solid ${signed ? "#16A34A" : "#D4C9A8"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {signed && <Check size={9} color="#fff" strokeWidth={3} />}
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>
      {dot(iSigned2)}
      <span style={{ color: iSigned2 ? "#16A34A" : "#9B8F7A" }}>You</span>
      <div style={{ flex: 1, height: 1, background: iSigned && theySigned ? "#16A34A" : "#E8E0D0" }} />
      <span style={{ color: iSigned3 ? "#16A34A" : "#9B8F7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{theirName.split(" ")[0]}</span>
      {dot(iSigned3)}
    </div>
  );
}

// ── Contract card ──────────────────────────────────────────────────
function ContractCard({ contract, myId, onCopyLink }: { contract: Contract; myId: string; onCopyLink: (id: string) => void }) {
  const [hov, setHov]     = useState(false);
  const [copied, setCopied] = useState(false);
  const router             = useRouter();

  const typeCfg   = CONTRACT_TYPES[contract.contract_type] || CONTRACT_TYPES.general;
  const statusCfg = STATUS_CFG[contract.status] || STATUS_CFG.draft;
  const isInitiator = contract.initiator_id === myId;
  const myRole = isInitiator ? contract.initiator_role : contract.counterparty_role;
  const theirName = isInitiator ? contract.counterparty_name : contract.initiator_name;
  const theirRole = isInitiator ? contract.counterparty_role : contract.initiator_role;
  const needsMySign = (isInitiator && !contract.initiator_signed_at) || (!isInitiator && !contract.counterparty_signed_at);
  const isFullySigned = !!contract.executed_at;

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/contracts/sign/${contract.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyLink(contract.id);
  }

  return (
    <div
      onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden", cursor: "pointer",
        border: `2.5px solid ${hov ? "#111110" : needsMySign && !isFullySigned ? "#CA8A04" : "#E8E0D0"}`,
        boxShadow: hov ? "5px 6px 0 #111110" : needsMySign && !isFullySigned ? "3px 4px 0 #CA8A04" : "3px 4px 0 #D4C9A8",
        transform: hov ? "translate(-2px,-3px)" : "none",
        transition: "all .25s cubic-bezier(.16,1,.3,1)",
        position: "relative",
      }}
    >
      {/* Type gradient top bar */}
      <div style={{ height: 4, background: `linear-gradient(${typeCfg.grad})` }} />

      {/* Needs action indicator */}
      {needsMySign && !isFullySigned && contract.status !== "draft" && (
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, background: "#FEF9C3", border: "1.5px solid #CA8A04", fontSize: 9, fontWeight: 800, color: "#713F12" }}>
          ✍️ Your signature needed
        </div>
      )}

      <div style={{ padding: "14px 16px" }}>
        {/* Top row: type + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: typeCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, border: `1.5px solid ${typeCfg.color}20` }}>
            {typeCfg.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: typeCfg.color, textTransform: "uppercase", letterSpacing: ".1em" }}>{typeCfg.label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-.2px" }}>{contract.title}</div>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        {/* Parties */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 10px", background: "#FAF7F3", borderRadius: 11 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>You ({myRole})</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#111110" }}>{isInitiator ? contract.initiator_name : contract.counterparty_name}</div>
          </div>
          <Handshake size={14} color="#D4C9A8" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>{theirRole}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#111110" }}>{theirName}</div>
          </div>
        </div>

        {/* Dates */}
        {(contract.start_date || contract.end_date || contract.venue_name) && (
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            {contract.venue_name && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>📍 {contract.venue_name}</div>
            )}
            {contract.start_date && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>
                📅 {fmtDate(contract.start_date)}{contract.end_date ? ` → ${fmtDate(contract.end_date)}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Sign progress */}
        {contract.status !== "draft" && contract.status !== "cancelled" && (
          <SignProgress contract={contract} myId={myId} />
        )}

        {/* Bottom: ref + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8", fontFamily: "monospace" }}>
            {contract.reference_number || `Draft · ${fmtDate(contract.created_at)}`}
          </div>
          <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
            {/* Copy signing link — only when sent */}
            {contract.status === "sent" && !contract.counterparty_id && (
              <button onClick={copyLink}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", border: "1.5px solid #E8E0D0", borderRadius: 8, background: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: copied ? "#16A34A" : "#9B8F7A", transition: "all .15s" }}>
                {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy link</>}
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
              View <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [myId,      setMyId]      = useState<string>("");
  const [myName,    setMyName]    = useState<string>("");
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab,       setTab]       = useState<"all" | "mine" | "incoming">("all");

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);

      const { data: prof } = await sb.from("profiles").select("full_name").eq("id", user.id).single();
      setMyName(prof?.full_name || "");

      const { data } = await sb.from("contracts")
        .select("*")
        .or(`initiator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      setContracts(data || []);
      setLoading(false);
    });
  }, []);

  // ── Stats ──────────────────────────────────────────────────────
  const signed      = contracts.filter(c => c.status === "signed").length;
  const pending     = contracts.filter(c => c.status === "sent" || c.status === "partially_signed").length;
  const drafts      = contracts.filter(c => c.status === "draft").length;
  const needsMySign = contracts.filter(c => {
    const iAm = c.initiator_id === myId ? "initiator" : "counterparty";
    return (iAm === "initiator" ? !c.initiator_signed_at : !c.counterparty_signed_at)
      && c.status !== "draft" && c.status !== "cancelled";
  }).length;

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = contracts.filter(c => {
    if (tab === "mine"     && c.initiator_id !== myId) return false;
    if (tab === "incoming" && c.counterparty_id !== myId) return false;
    if (typeFilter !== "all"   && c.contract_type !== typeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) ||
        c.counterparty_name.toLowerCase().includes(q) ||
        c.initiator_name.toLowerCase().includes(q) ||
        c.venue_name?.toLowerCase().includes(q) ||
        c.reference_number?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div className="ct-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 3 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FFD400", border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
              <FileText size={16} color="#111110" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-.6px", margin: 0 }}>Contracts</h1>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", margin: 0 }}>
            Agreements between you and venues or fellow artists — all in one place
          </p>
        </div>
        <Link href="/dashboard/contracts/new" style={{ textDecoration: "none" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="none"; (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; }}>
            <Plus size={14} strokeWidth={3} /> New Contract
          </button>
        </Link>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="ct-stats">
        {[
          { label: "Total",          value: contracts.length, color: "#9B8F7A", bg: "#F5F0E8", grad: "135deg,#57534E,#9B8F7A", icon: FileText },
          { label: "Need Your Sign", value: needsMySign,      color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04", icon: AlertCircle, urgent: needsMySign > 0 },
          { label: "In Progress",    value: pending,          color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9", icon: Clock },
          { label: "Fully Signed",   value: signed,           color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A", icon: CheckCircle2 },
          { label: "Drafts",         value: drafts,           color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED", icon: FileText },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: `2px solid ${(s as any).urgent ? "#CA8A04" : "#E8E0D0"}`, borderRadius: 16, overflow: "hidden", boxShadow: (s as any).urgent ? "2px 3px 0 #CA8A04" : "2px 3px 0 #E0D8CA" }}>
            <div style={{ height: 3, background: `linear-gradient(${s.grad})` }} />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <s.icon size={15} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-.4px", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── "NEEDS SIGNATURE" ALERT ── */}
      {needsMySign > 0 && (
        <div style={{ marginBottom: 18, padding: "12px 16px", background: "#FEF9C3", border: "2px solid #CA8A04", borderRadius: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: "2px 2px 0 #CA8A04" }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>✍️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#713F12" }}>
              {needsMySign} contract{needsMySign > 1 ? "s" : ""} waiting for your signature
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#92400E" }}>
              Open the contract and sign to move forward
            </div>
          </div>
          <button onClick={() => setStatusFilter("partially_signed")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#111110", border: "none", borderRadius: 9, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#FFD400" }}>
            View <ArrowRight size={11} />
          </button>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "2px solid #E8E0D0", paddingBottom: 0 }}>
        {([
          { key: "all",      label: "All contracts", count: contracts.length },
          { key: "mine",     label: "Created by me",  count: contracts.filter(c => c.initiator_id === myId).length },
          { key: "incoming", label: "Received",       count: contracts.filter(c => c.counterparty_id === myId).length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", background: "none", fontFamily: "inherit", fontSize: 13, fontWeight: tab === t.key ? 800 : 600, color: tab === t.key ? "#111110" : "#9B8F7A", cursor: "pointer", borderBottom: `3px solid ${tab === t.key ? "#FFD400" : "transparent"}`, marginBottom: -2, transition: "all .15s" }}>
            {t.label}
            <span style={{ padding: "1px 7px", borderRadius: 99, background: tab === t.key ? "#111110" : "#F5F0E8", color: tab === t.key ? "#FFD400" : "#9B8F7A", fontSize: 10, fontWeight: 800 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="ct-filters">
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, padding: "0 12px", height: 38, flex: 1, minWidth: 180, maxWidth: 300, transition: "border-color .15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#FFD400")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "#E8E0D0")}>
          <Search size={13} color="#9B8F7A" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#111110", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: 0, display: "flex" }}><X size={12} /></button>}
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ height: 38, padding: "0 12px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 12, fontWeight: 700, color: typeFilter === "all" ? "#9B8F7A" : "#111110", cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
          <option value="all">All types</option>
          {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 38, padding: "0 12px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 12, fontWeight: 700, color: statusFilter === "all" ? "#9B8F7A" : "#111110", cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>

        {/* Clear */}
        {(search || typeFilter !== "all" || statusFilter !== "all") && (
          <button onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="ct-grid">
          {[1,2,3].map(i => (
            <div key={i} style={{ background: "#F5F0E8", borderRadius: 20, height: 200, animation: "fadeUp .3s ease both", animationDelay: `${i*.08}s` }} />
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "72px 32px", background: "#fff", borderRadius: 20, border: "2px solid #E8E0D0", boxShadow: "3px 4px 0 #E0D8CA" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", letterSpacing: "-.4px", marginBottom: 8 }}>
            {contracts.length === 0 ? "No contracts yet" : "No contracts match your filters"}
          </div>
          <div style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
            {contracts.length === 0
              ? "Create your first agreement with a venue or fellow artist. No lawyers needed — just clear, honest terms."
              : "Try clearing your filters to see all contracts."}
          </div>
          {contracts.length === 0 && (
            <Link href="/dashboard/contracts/new" style={{ textDecoration: "none" }}>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 24px", background: "#FFD400", border: "2px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110" }}>
                <Plus size={16} strokeWidth={3} /> Create first contract
              </button>
            </Link>
          )}
        </div>
      )}

      {/* ── CONTRACT GRID ── */}
      {!loading && filtered.length > 0 && (
        <div className="ct-grid">
          {filtered.map((c, i) => (
            <div key={c.id} style={{ animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) ${Math.min(i * .04, .3)}s both` }}>
              <ContractCard contract={c} myId={myId} onCopyLink={() => {}} />
            </div>
          ))}
        </div>
      )}

      {/* ── POOL CTA ── */}
      {!loading && (
        <div style={{ marginTop: 28, padding: "18px 20px", background: "#111110", borderRadius: 18, border: "2.5px solid #111110", boxShadow: "4px 4px 0 #D4C9A8", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🤝</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD400", marginBottom: 3 }}>Found your match in The Pool?</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>
              Turn a pool connection into a real contract. Open The Pool, pick a request, and create the agreement directly.
            </div>
          </div>
          <Link href="/dashboard/pool" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#FFD400", border: "2px solid #FFD400", borderRadius: 11, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
              Open The Pool <ArrowRight size={12} />
            </button>
          </Link>
        </div>
      )}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

  .ct-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .ct-stats {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  .ct-filters {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 18px; flex-wrap: wrap;
  }
  .ct-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 8px;
  }

  @media (max-width: 900px) {
    .ct-stats { grid-template-columns: repeat(3, 1fr) !important; }
  }
  @media (max-width: 640px) {
    .ct-header { flex-direction: column; align-items: flex-start; }
    .ct-header > a { width: 100%; }
    .ct-header > a > button { width: 100%; justify-content: center !important; }
    .ct-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .ct-filters { gap: 6px !important; }
    .ct-grid { grid-template-columns: 1fr !important; }
  }
`;
