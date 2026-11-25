"use client";
// Papers: the agreements you make with venues, artists and buyers.
// The list puts what needs your signature first.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Copy, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, ButtonLink, Card, Chip, EmptyState, PageHeader, SearchField, Skeleton } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

type Contract = {
  id: string; contract_type: string; status: string; title: string; reference_number?: string | null;
  initiator_id: string; initiator_name: string; initiator_role: string;
  counterparty_id?: string | null; counterparty_name: string; counterparty_role: string;
  counterparty_token?: string | null; counterparty_email?: string | null;
  start_date?: string | null; end_date?: string | null; venue_name?: string | null;
  initiator_signed_at?: string | null; counterparty_signed_at?: string | null; executed_at?: string | null; created_at: string;
};

type Filter = "all" | "todo" | "waiting" | "signed" | "draft" | "closed";

const TYPE_LABEL: Record<string, string> = { exhibition: "Exhibition", collaboration: "Collaboration", commission: "Commission", general: "Partnership" };
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Waiting for signature", tone: "warn" },
  partially_signed: { label: "Partly signed", tone: "info" },
  signed: { label: "Signed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

function needsMe(c: Contract, me: string) {
  if (c.status === "draft" || c.status === "cancelled" || c.status === "expired" || c.executed_at) return false;
  return c.initiator_id === me ? !c.initiator_signed_at : !c.counterparty_signed_at;
}

function Row({ c, me }: { c: Contract; me: string }) {
  const [copied, setCopied] = useState(false);
  const mine = c.initiator_id === me;
  const them = mine ? c.counterparty_name : c.initiator_name;
  const st = STATUS[c.status] || STATUS.draft;
  const todo = needsMe(c, me);
  const canShare = mine && !c.executed_at && c.status !== "cancelled" && c.status !== "draft" && !c.counterparty_signed_at;
  const when = c.start_date ? (c.end_date ? `${fmt(c.start_date)} – ${fmt(c.end_date)}` : fmt(c.start_date)) : `Created ${fmt(c.created_at)}`;

  function copyLink() {
    const url = `${window.location.origin}/contracts/sign/${c.id}${c.counterparty_token ? `?t=${encodeURIComponent(c.counterparty_token)}` : ""}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <li className="flex items-center gap-2 pr-2 hover:bg-sunken">
      <Link href={`/dashboard/contracts/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-ui text-body font-semibold text-fg">{c.title}</span>
            {todo ? <Badge tone="mango">Your signature</Badge> : <Badge tone={st.tone}>{st.label}</Badge>}
          </span>
          <span className="truncate font-ui text-body-sm text-fg-3">
            {[TYPE_LABEL[c.contract_type] || "Agreement", `${mine ? "with" : "from"} ${them || "someone"}`, c.venue_name, when].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-fg-3" />
      </Link>
      {canShare && (
        <button type="button" onClick={copyLink} aria-live="polite"
          className="inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5 font-ui text-caption font-semibold text-fg-2 hover:bg-surface hover:text-fg">
          {copied ? <><Check size={13} aria-hidden /> Copied</> : <><Copy size={13} aria-hidden /> Signing link</>}
        </button>
      )}
    </li>
  );
}

export default function PapersPage() {
  const [me, setMe] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setMe(user.id);
      const { data, error: err } = await sb.from("contracts").select("*")
        .or(`initiator_id.eq.${user.id},counterparty_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (err) setError("Your papers didn't load. Please refresh the page.");
      setContracts((data || []) as Contract[]);
      setLoading(false);
    });
  }, []);

  const count = (f: Filter) => contracts.filter(c => inFilter(c, f)).length;
  function inFilter(c: Contract, f: Filter) {
    switch (f) {
      case "todo": return needsMe(c, me);
      case "waiting": return !needsMe(c, me) && (c.status === "sent" || c.status === "partially_signed");
      case "signed": return c.status === "signed" || !!c.executed_at;
      case "draft": return c.status === "draft";
      case "closed": return c.status === "cancelled" || c.status === "expired";
      default: return true;
    }
  }

  const q = search.toLowerCase().trim();
  const list = contracts
    .filter(c => inFilter(c, filter))
    .filter(c => !q || [c.title, c.counterparty_name, c.initiator_name, c.venue_name, c.reference_number].some(v => (v || "").toLowerCase().includes(q)))
    .sort((a, b) => Number(needsMe(b, me)) - Number(needsMe(a, me)));

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "todo", label: "To sign" }, { key: "waiting", label: "Waiting on them" },
    { key: "signed", label: "Signed" }, { key: "draft", label: "Drafts" }, { key: "closed", label: "Closed" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Papers"
        description="Agreements with venues, artists and buyers. Write one, send a signing link, and keep the signed copy here."
        actions={<ButtonLink href="/dashboard/contracts/new" variant="primary"><Plus size={16} aria-hidden /> New agreement</ButtonLink>}
      />

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Show">
          {FILTERS.filter(f => f.key === "all" || count(f.key) > 0 || filter === f.key).map(f => (
            <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)} className="shrink-0">
              {f.label}{f.key !== "all" && <span className="tabular-nums opacity-70"> {count(f.key)}</span>}
            </Chip>
          ))}
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Search titles, names, venues" className="lg:w-80" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          title={contracts.length === 0 ? "No agreements yet" : "Nothing here"}
          description={contracts.length === 0
            ? "When a place says yes to your work in Deals, the agreement is made for you there. For anything else, a commission or a collab, write one here."
            : "Try another filter or search."}
          action={contracts.length === 0 ? (
            <span className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/dashboard/messages?tab=deals" variant="primary">See your deals</ButtonLink>
              <ButtonLink href="/dashboard/contracts/new" variant="secondary"><Plus size={15} aria-hidden /> New agreement</ButtonLink>
            </span>
          ) : undefined}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">{list.map(c => <Row key={c.id} c={c} me={me} />)}</ul>
        </Card>
      )}
    </div>
  );
}
