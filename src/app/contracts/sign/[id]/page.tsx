"use client";
// The page someone opens from a signing link. They may not have an account,
// so it stands on its own: what the agreement says, who wrote it, and a
// place to sign. Reading and signing go through token-checked database
// functions.
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MangoMark } from "@/components/brand/MangoMark";
import { AlertCircle, Check, CheckCircle2, Clock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/brand/Wordmark";
import { Alert, Badge, Button, Card, Input, Skeleton } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";
import { track } from "@/lib/analytics";

const TYPE_LABEL: Record<string, string> = {
  exhibition: "Exhibition agreement", collaboration: "Collaboration agreement", commission: "Commission agreement", general: "General agreement",
};
const TRANSPORT: Record<string, string> = { artist: "The artist", venue: "The venue", shared: "Shared, cost split" };
const IP: Record<string, string> = { "50/50": "Both, equally", initiator: "The person who wrote it", counterparty: "You", custom: "See extra terms" };
const DELIVERY: Record<string, string> = { pickup: "Picked up in person", shipping: "Shipped by the artist", digital: "Digital", venue: "Collected by the venue" };
const day = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
const roleWord = (r?: string | null) => r === "gallery" ? "venue" : r || "";
const eur = (v: any) => v != null && v !== "" ? formatPrice(Number(v), "EUR") : null;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b-hair border-line bg-surface">
        <div className="mx-auto flex h-header max-w-2xl items-center justify-between px-4">
          <Wordmark />
          <span className="inline-flex items-center gap-1.5 font-ui text-caption text-fg-3"><Shield size={13} aria-hidden /> Signing page</span>
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">{children}</main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card padding="lg"><h2 className="mb-3 font-display text-h3 text-fg">{title}</h2>{children}</Card>;
}
function Terms({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <dl className="divide-y divide-line">
      {shown.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="font-ui text-body-sm text-fg-2">{k}</dt>
          <dd className="text-right font-ui text-body-sm font-semibold text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
const Prose = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div className="mt-3 border-t-hair border-line pt-3">
    {label && <p className="mb-1 font-ui text-label font-semibold text-fg">{label}</p>}
    <p className="whitespace-pre-wrap font-ui text-body leading-relaxed text-fg-2">{children}</p>
  </div>
);

export default function ExternalSignPage() {
  const { id } = useParams<{ id: string }>();
  const token = useSearchParams().get("t");

  const [contract,  setContract]  = useState<any>(null);
  const [artworks,  setArtworks]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [sigName,   setSigName]   = useState("");
  const [agreed,    setAgreed]    = useState(false);
  const [signing,   setSigning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [signError, setSignError] = useState("");
  // People who sign through a link confirm their email with a 6-digit code first.
  const [codeTo,    setCodeTo]    = useState<string | null>(null);
  const [code,      setCode]      = useState("");
  const [resent,    setResent]    = useState(false);

  // Contracts are no longer readable directly by anonymous visitors. The
  // page goes through two database functions that check the signing token
  // from the link (or that the signed-in user is the counterparty).
  useEffect(() => {
    if (!id) return;
    const sb = createClient();
    sb.rpc("get_contract_for_signing", { p_contract_id: id, p_token: token }).then(({ data, error: err }) => {
      const c = data as any;
      if (err || !c) { setError("This link is wrong or no longer valid."); setLoading(false); return; }
      if (c.status === "signed") { setDone(true); setLoading(false); setContract(c); return; }
      if (c.status === "cancelled") { setError("This agreement was cancelled."); setLoading(false); return; }
      setContract(c);
      setArtworks(c.artworks || []);
      setLoading(false);
    });
  }, [id, token]);

  /** Email a code to the address on the agreement. Returns false when no code is needed. */
  async function sendCode(): Promise<boolean | null> {
    const { data, error: err } = await createClient().rpc("send_signing_code", { p_contract_id: id, p_token: token });
    // Not set up in the database yet: sign the old way.
    if (err?.code === "PGRST202") return false;
    if (err) { setSignError(err.hint === "rate_limited" ? err.message : "We couldn't send the code. Please try again in a minute."); return null; }
    const d = data as { needed: boolean; email?: string };
    if (!d?.needed) return false;
    setCodeTo(d.email || "your email");
    return true;
  }

  async function handleSign() {
    if (!sigName.trim() || !agreed || signing) return;
    setSigning(true);
    setSignError("");
    if (!codeTo) {
      const needed = await sendCode();
      if (needed !== false) { setSigning(false); return; }
    } else if (!/^\d{6}$/.test(code.trim())) {
      setSigning(false);
      setSignError("Enter the 6 numbers from the email.");
      return;
    }
    const sb = createClient();
    const { data, error: err } = await sb.rpc("sign_contract_as_counterparty", {
      p_contract_id: id, p_token: token, p_signature: sigName.trim(),
      ...(codeTo ? { p_code: code.trim() } : {}),
    });
    setSigning(false);
    if (err?.hint === "code_needed") { setSigning(true); await sendCode(); setSigning(false); return; }
    if ((data as any)?.error) { setSignError((data as any).error); return; }
    if (err || !data) {
      // Signed on an earlier tap whose answer got lost (bad signal)? Then it's done.
      if (err?.message?.includes("already signed") || err?.code === "23505") {
        const { data: now } = await sb.rpc("get_contract_for_signing", { p_contract_id: id, p_token: token });
        if (now) { setContract(now); setDone(true); return; }
      }
      setSignError(/fetch|network/i.test(err?.message || "")
        ? "No connection. Check your signal and tap Sign again. You won't sign twice."
        : "We couldn't record your signature. Please try again or ask the sender for a new link.");
      return;
    }
    setContract(data);
    setDone(true);
    track("agreement_signed", { via: "link", done: !!(data as { executed_at?: string | null })?.executed_at });
  }

  async function resendCode() {
    setSignError(""); setResent(false);
    if (await sendCode()) setResent(true);
  }

  if (loading) return <Shell><Skeleton className="h-10 w-2/3 rounded-control" /><Skeleton className="h-48 rounded-card" /><Skeleton className="h-64 rounded-card" /></Shell>;

  if (error) return (
    <Shell>
      <Card padding="lg" className="text-center">
        <AlertCircle size={28} aria-hidden className="mx-auto mb-3 text-fg-3" />
        <h1 className="font-display text-h2 text-fg">This link doesn&apos;t work</h1>
        <p className="mt-2 font-ui text-body text-fg-2">{error} Ask the person who sent it for a new one.</p>
      </Card>
    </Shell>
  );

  if (done) {
    const both = contract?.status === "signed";
    return (
      <Shell>
        <Card padding="lg" className="text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border-outline border-ink bg-mango text-on-mango"><Check size={26} strokeWidth={3} aria-hidden /></span>
          <h1 className="font-display text-h2 text-fg">{both ? "Signed by both of you" : "Your signature is in"}</h1>
          <p className="mx-auto mt-2 max-w-md font-ui text-body text-fg-2">
            {both
              ? "The agreement is complete. You can close this page."
              : `Now ${contract?.initiator_name || "the other side"} needs to sign too. You can close this page.`}
          </p>
          {contract?.terms_hash && (
            <p className="mt-4 break-all font-ui text-caption text-fg-3">
              {contract.reference_number ? `Reference ${contract.reference_number} · ` : ""}Terms fingerprint {contract.terms_hash}
            </p>
          )}
        </Card>
        <p className="text-center font-ui text-caption text-fg-3">Made with <a href="/" className="inline-flex items-center gap-1 align-middle font-semibold text-fg-2 hover:text-fg"><MangoMark size={14} />Artomango</a>, where artists keep their work, shows and papers.</p>
      </Shell>
    );
  }

  if (!contract) return null;
  const c = contract;
  const alreadySigned = !!c.counterparty_signed_at;
  const canSubmit = !!sigName.trim() && agreed && !signing;

  return (
    <Shell>
      <div>
        <p className="font-ui text-label font-semibold text-fg-3">{TYPE_LABEL[c.contract_type] || "Agreement"}</p>
        <h1 className="mt-1 font-display text-h1 text-fg">{c.title}</h1>
        <p className="mt-2 font-ui text-body text-fg-2">
          <span className="font-semibold text-fg">{c.initiator_name}</span> sent you this agreement to sign. Read it through, then sign at the bottom.
        </p>
      </div>

      <Section title="Between">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: c.initiator_name, role: c.initiator_role, email: c.initiator_email, signed: !!c.initiator_signed_at },
            { name: c.counterparty_name, role: c.counterparty_role, email: c.counterparty_email, signed: alreadySigned, you: true },
          ].map((p, i) => (
            <div key={i} className="flex flex-col gap-0.5 rounded-control border-hair border-line px-3 py-2.5">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-ui text-label font-semibold text-fg">{p.name}{p.you ? " (you)" : ""}</span>
                {p.signed ? <Badge tone="ok"><CheckCircle2 size={12} aria-hidden /> Signed</Badge> : <Badge tone="neutral"><Clock size={12} aria-hidden /> Not yet</Badge>}
              </span>
              <span className="font-ui text-caption capitalize text-fg-3">{roleWord(p.role)}</span>
              {p.email && <span className="truncate font-ui text-caption text-fg-3">{p.email}</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="The terms">
        {c.description && <p className="mb-2 whitespace-pre-wrap font-ui text-body leading-relaxed text-fg-2">{c.description}</p>}
        <Terms rows={[
          ["Starts", day(c.start_date)], ["Ends", day(c.end_date)], ["Venue or place", c.venue_name], ["Address", c.venue_address],
          ...(c.contract_type === "exhibition" ? [
            ["Venue's commission", c.commission_pct != null ? `${c.commission_pct}%` : null],
            ["Transport", TRANSPORT[c.transport_by] || c.transport_by],
            ["Insurance", c.artwork_insurance ? `The venue insures the works${c.insurance_value ? `, ${eur(c.insurance_value)}` : ""}` : "Not included"],
            ["Hanging", day(c.installation_date)], ["Opening", day(c.opening_event_date)],
            ["Taking down", day(c.deinstallation_date)], ["Unsold works back by", day(c.unsold_return_by)],
          ] as [string, React.ReactNode][] : []),
          ...(c.contract_type === "collaboration" ? [
            ["Who owns the work", IP[c.ip_split] || c.ip_split], ["How money is split", c.revenue_split], ["Credit line", c.credit_line],
          ] as [string, React.ReactNode][] : []),
          ...(c.contract_type === "commission" ? [
            ["Fee", eur(c.commission_fee)],
            ["Deposit", c.deposit_pct != null ? `${c.deposit_pct}%${c.commission_fee ? `, ${eur(Math.round(c.commission_fee * c.deposit_pct / 100))}` : ""}` : null],
            ["Deposit due", day(c.deposit_due_date)], ["Rest due", day(c.final_payment_date)],
            ["Rounds of changes", c.revision_rounds], ["Delivery", DELIVERY[c.delivery_method] || c.delivery_method],
          ] as [string, React.ReactNode][] : []),
        ]} />
        {c.contract_type === "collaboration" && c.deliverables && <Prose label="Who delivers what">{c.deliverables}</Prose>}
        {c.contract_type === "commission" && c.artwork_specs && <Prose label="The work">{c.artwork_specs}</Prose>}
        {c.contract_type === "general" && c.agreed_terms && <Prose label="What was agreed">{c.agreed_terms}</Prose>}
        {c.special_conditions && <Prose label="Extra terms">{c.special_conditions}</Prose>}
      </Section>

      {artworks.length > 0 && (
        <Section title={`Works (${artworks.length})`}>
          <ul className="divide-y divide-line">
            {artworks.map((aw: any) => (
              <li key={aw.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="font-ui text-body-sm font-semibold text-fg">{aw.title}</span>
                <span className="text-right font-ui text-caption text-fg-3">{[aw.medium, aw.price ? eur(aw.price) : null].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {alreadySigned ? (
        <Alert tone="ok">You already signed this as &ldquo;{c.counterparty_signature}&rdquo;.</Alert>
      ) : (
        <Card padding="lg" className="border-ink shadow-hard-2">
          <h2 className="font-display text-h3 text-fg">Sign</h2>
          {c.initiator_signed_at
            ? <p className="mt-1 font-ui text-body-sm text-fg-2">{c.initiator_name} signed as <span className="font-serif italic text-fg">{c.initiator_signature}</span>.</p>
            : <p className="mt-1 font-ui text-body-sm text-fg-2">{c.initiator_name} hasn&apos;t signed yet. You can sign first.</p>}
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">Type your full name</span>
              <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Your full name" className="font-serif text-lead italic" />
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-ink" />
              <span className="font-ui text-body-sm text-fg-2">
                I&apos;ve read all the terms and agree to them. I understand my typed name is a legally binding digital signature for me or the organisation I represent.
              </span>
            </label>
            {codeTo && (
              <div className="flex flex-col gap-2 rounded-control border-hair border-line bg-sunken p-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-ui text-label font-semibold text-fg">Enter the code we emailed you</span>
                  <span className="font-ui text-body-sm text-fg-2">We sent 6 numbers to <strong className="text-fg">{codeTo}</strong>. It can take a minute. This shows us it&apos;s really you.</span>
                  <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric" autoComplete="one-time-code" placeholder="123456" aria-label="Code from the email"
                    className="font-ui text-lead tracking-[0.3em] tabular-nums" />
                </label>
                <button type="button" onClick={resendCode} className="self-start font-ui text-caption font-semibold text-fg-2 underline underline-offset-4 hover:text-fg">
                  {resent ? "Sent again. Check spam too." : "Send a new code"}
                </button>
              </div>
            )}
            {signError && <Alert tone="bad">{signError}</Alert>}
            <Button variant="primary" onClick={handleSign} disabled={!canSubmit || (!!codeTo && code.length !== 6)} className="w-full">
              <Check size={16} aria-hidden /> {signing ? "One moment…" : "Sign this agreement"}
            </Button>
            <p className="flex items-start gap-1.5 font-ui text-caption text-fg-3">
              <Shield size={13} aria-hidden className="mt-0.5 shrink-0" />
              When you sign, the time, your IP address and a fingerprint of these exact terms are recorded.
            </p>
            {c.terms_hash && <p className="break-all font-ui text-caption text-fg-3">Terms fingerprint: {c.terms_hash}</p>}
          </div>
        </Card>
      )}

      <p className="text-center font-ui text-caption text-fg-3">Made with <a href="/" className="inline-flex items-center gap-1 align-middle font-semibold text-fg-2 hover:text-fg"><MangoMark size={14} />Artomango</a>, where artists keep their work, shows and papers.</p>
    </Shell>
  );
}
