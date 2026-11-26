"use client";
// One agreement: the terms on the left, who signed and the key dates on
// the right. Signing itself is recorded by the database.
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, CheckCircle2, ChevronRight, Clock, Copy, ImageIcon, Send, Shield, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Badge, Button, ButtonLink, Card, EmptyState, Input, Modal, Skeleton, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";
import { useJourney } from "@/components/journey/JourneyProvider";

const TYPE_LABEL: Record<string, string> = {
  exhibition: "Exhibition agreement", collaboration: "Collaboration agreement", commission: "Commission agreement", general: "General agreement",
};
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Waiting for signature", tone: "warn" },
  partially_signed: { label: "Partly signed", tone: "info" },
  signed: { label: "Signed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};
const TRANSPORT: Record<string, string> = { artist: "The artist", venue: "The venue", shared: "Shared, cost split" };
const IP: Record<string, string> = { "50/50": "Both, equally", initiator: "The person who wrote it", counterparty: "The other side", custom: "See extra terms" };
const DELIVERY: Record<string, string> = { pickup: "Picked up in person", shipping: "Shipped by the artist", digital: "Digital", venue: "Collected by the venue" };

const day = (d?: string | null) => d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
const stamp = (d?: string | null) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const roleWord = (r?: string | null) => r === "gallery" ? "venue" : r || "";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <h2 className="mb-3 font-display text-h3 text-fg">{title}</h2>
      {children}
    </Card>
  );
}

/** A label and value; rows with nothing in them aren't shown. */
function Terms({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return <p className="font-ui text-body-sm text-fg-3">Nothing filled in.</p>;
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
const Prose = ({ children }: { children: React.ReactNode }) => <p className="whitespace-pre-wrap font-ui text-body leading-relaxed text-fg-2">{children}</p>;

function SignBlock({ name, role, signed, signedAt, signature, canSign, sigName, onSigChange, onSign, signing }: {
  name: string; role: string; signed: boolean; signedAt?: string | null; signature?: string | null; canSign: boolean;
  sigName: string; onSigChange: (v: string) => void; onSign: () => void; signing: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className={cn("flex flex-col gap-3 rounded-control border-hair p-4", signed ? "border-ok bg-ok-well" : "border-line bg-surface")}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-ui text-label font-semibold text-fg">{name}</span>
          <span className="font-ui text-caption capitalize text-fg-3">{roleWord(role)}</span>
        </span>
        {signed
          ? <Badge tone="ok"><CheckCircle2 size={12} aria-hidden /> Signed</Badge>
          : <Badge tone="neutral"><Clock size={12} aria-hidden /> Not yet</Badge>}
      </div>
      {signed ? (
        <div>
          <p className="font-serif text-h3 italic text-fg">{signature}</p>
          <p className="font-ui text-caption text-fg-3">{stamp(signedAt)}</p>
        </div>
      ) : canSign ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-label font-semibold text-fg">Type your full name to sign</span>
            <Input value={sigName} onChange={e => onSigChange(e.target.value)} placeholder="Your full name" className="font-serif italic" />
          </label>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-ink" />
            <span className="font-ui text-body-sm text-fg-2">
              I&apos;ve read all the terms and agree to them. I understand my typed name is a legally binding digital signature.
            </span>
          </label>
          <Button variant="primary" onClick={onSign} disabled={!sigName.trim() || !agreed || signing}>
            <Check size={15} aria-hidden /> {signing ? "Signing…" : "Sign"}
          </Button>
        </>
      ) : (
        <p className="font-ui text-body-sm text-fg-3">Waiting for them to sign.</p>
      )}
    </div>
  );
}

function SigningRecord({ signatures, termsHash }: { signatures: any[]; termsHash: string }) {
  if (!termsHash && signatures.length === 0) return null;
  const mismatch = signatures.some(s => termsHash && s.terms_hash !== termsHash);
  return (
    <details className="rounded-control border-hair border-line bg-sunken px-3 py-2.5">
      <summary className="cursor-pointer font-ui text-label font-semibold text-fg">Signing record</summary>
      <div className="mt-2 flex flex-col gap-1.5 font-ui text-caption text-fg-2">
        {signatures.map(sig => (
          <p key={sig.party}>
            <span className="font-semibold text-fg">{sig.signer_name}</span>
            {sig.signer_email ? ` (${sig.signer_email})` : ""} signed {stamp(sig.signed_at)}, {sig.signed_via === "account" ? "from their Artomango account" : "with the signing link"}
            {sig.ip_address ? `, IP ${sig.ip_address}` : ""}.
          </p>
        ))}
        {termsHash && <p className="break-all">Terms fingerprint (SHA-256): <code>{termsHash}</code></p>}
        {mismatch && <p className="font-semibold text-bad">The terms no longer match what was signed.</p>}
      </div>
    </details>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contract,  setContract]  = useState<any>(null);
  const [artworks,  setArtworks]  = useState<any[]>([]);
  const [myId,      setMyId]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);
  const [signing,   setSigning]   = useState(false);
  const [mySig,     setMySig]     = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [signError, setSignError] = useState("");
  const { toast, celebrate } = useJourney();
  const [signatures, setSignatures] = useState<any[]>([]);
  const [termsHash, setTermsHash] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return null; }
    setMyId(user.id);

    const { data: c } = await sb.from("contracts").select("*").eq("id", id).single();
    setContract(c);
    // Signed by both: the deal it came from is done.
    if (c?.executed_at) sb.from("deals").update({ status: "signed" }).eq("contract_id", id).eq("status", "agreement_sent").then(() => {});

    const [{ data: sigs }, { data: hash }] = await Promise.all([
      sb.from("contract_signatures").select("party, signer_name, signer_email, signed_via, ip_address, signed_at, terms_hash").eq("contract_id", id).order("signed_at"),
      sb.rpc("contract_terms_hash", { p_contract_id: id }),
    ]);
    setSignatures(sigs || []);
    setTermsHash(typeof hash === "string" ? hash : "");

    if (c) {
      const { data: ca } = await sb.from("contract_artworks")
        .select("artwork_id, notes, artworks(id,title,images,medium,price,status)")
        .eq("contract_id", id);
      setArtworks((ca || []).map((r: any) => ({ ...r.artworks, notes: r.notes })));
    }
    setLoading(false);
    return c;
  }

  // The database records the signature (time, IP, terms fingerprint), sets the
  // status, and on full execution writes provenance and calendar dates for
  // both parties.
  async function handleSign() {
    if (!mySig.trim()) return;
    setSigning(true);
    setSignError("");
    const sb = createClient();
    const isInitiator = contract.initiator_id === myId;
    const now = new Date().toISOString();
    const update = isInitiator
      ? { initiator_signed_at: now, initiator_signature: mySig.trim() }
      : { counterparty_signed_at: now, counterparty_signature: mySig.trim() };

    const { data, error } = await sb.from("contracts").update(update).eq("id", id).select("id");
    setSigning(false);
    if (error || !data?.length) {
      setSignError("Your signature couldn't be saved. Please reload and try again.");
      return;
    }
    const after = await load();
    const { count: signedBefore } = await sb.from("contracts").select("id", { count: "exact", head: true })
      .or(`initiator_id.eq.${myId},counterparty_id.eq.${myId}`).not("executed_at", "is", null);
    const other = isInitiator ? contract.counterparty_name : contract.initiator_name;
    if (after?.executed_at || after?.status === "signed") {
      // Next step after a deal: print the wall labels (lib/labels).
      const { data: deal } = await sb.from("deals").select("id").eq("contract_id", id).maybeSingle();
      const labels = deal ? { label: "Print the wall labels", href: `/dashboard/labels/make?deal=${(deal as { id: string }).id}` } : null;
      const planner = { label: "See your Planner", href: "/dashboard/tasks?view=month" };
      const shown = await celebrate("first_signed", {
        title: "It's a deal",
        body: labels
          ? "You've both signed. Next, print a label for each work: its QR code opens the piece's page, and you'll see every scan. The dates are in your Planner."
          : "You've both signed. The hanging and taking-down dates are in your Planner, and the works' passports show the show.",
        image: artworks[0]?.images?.[0] || null,
        primary: labels || planner,
        secondary: labels ? planner : undefined,
      }, (signedBefore ?? 0) <= 1);
      if (!shown) toast({ title: "Signed by both. It's a deal.", body: labels ? "Next: print the wall labels, so people can scan and find the work." : "The key dates are in your Planner.", action: labels || { label: "Open Planner", href: "/dashboard/tasks?view=month" } });
    } else {
      toast({ title: "Signed", body: `Waiting for ${other || "the other side"} to sign. We'll tell you the moment it's done.` });
    }
  }

  async function handleCancel() {
    setCancelling(true);
    const sb = createClient();
    await sb.from("contracts").update({ status: "cancelled" }).eq("id", id);
    setCancelling(false);
    setConfirmCancel(false);
    load();
  }

  function copySigningLink() {
    const url = `${window.location.origin}/contracts/sign/${id}${contract?.counterparty_token ? `?t=${encodeURIComponent(contract.counterparty_token)}` : ""}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function sendDraft() {
    setSendingDraft(true);
    await createClient().from("contracts").update({ status: "sent" }).eq("id", id);
    setSendingDraft(false);
    load();
  }

  if (loading) return (
    <div className="flex flex-col gap-4"><Skeleton className="h-10 w-1/2 rounded-control" /><Skeleton className="h-64 rounded-card" /></div>
  );

  if (!contract) return (
    <EmptyState title="Agreement not found" description="It may have been removed, or it isn't shared with you."
      action={<ButtonLink href="/dashboard/contracts" variant="secondary"><ArrowLeft size={15} aria-hidden /> Back to papers</ButtonLink>} />
  );

  const c = contract;
  const st = STATUS[c.status] || STATUS.draft;
  const isInitiator = c.initiator_id === myId;
  const iSigned = !!c.initiator_signed_at;
  const theySigned = !!c.counterparty_signed_at;
  const executed = c.status === "signed";
  const isExternal = !c.counterparty_id;
  const isDraft = c.status === "draft";
  const isCancelled = c.status === "cancelled";
  const needsMe = !isDraft && !isCancelled && !executed && (isInitiator ? !iSigned : !theySigned);
  const eur = (v: any) => v != null && v !== "" ? formatPrice(Number(v), "EUR") : null;

  const dates = ([
    ["Starts", c.start_date], ["Hanging", c.installation_date], ["Opening", c.opening_event_date],
    ["Deposit due", c.deposit_due_date], ["Rest due", c.final_payment_date], ["Ends", c.end_date],
    ["Taking down", c.deinstallation_date], ["Unsold works back by", c.unsold_return_by],
  ] as [string, string | null][]).filter(([, d]) => d).sort((a, b) => (a[1] || "").localeCompare(b[1] || ""));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ButtonLink href="/dashboard/contracts" variant="ghost" size="sm" aria-label="Back to papers" className="mt-1"><ArrowLeft size={16} aria-hidden /></ButtonLink>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="font-ui text-caption text-fg-3">{TYPE_LABEL[c.contract_type] || "Agreement"}</span>
              {c.reference_number && <span className="font-mono text-caption text-fg-3">{c.reference_number}</span>}
            </div>
            <h1 className="mt-1 font-display text-h2 text-fg">{c.title}</h1>
          </div>
        </div>
        {!executed && !isCancelled && isInitiator && (
          <Button variant="ghost" onClick={() => setConfirmCancel(true)} className="shrink-0"><XCircle size={15} aria-hidden /> Cancel agreement</Button>
        )}
      </div>

      {executed && (
        <Alert tone="ok">Signed by both of you on {day(c.executed_at)}. The key dates are in your planner.</Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Section title="The basics">
            {c.description && <div className="mb-3"><Prose>{c.description}</Prose></div>}
            <Terms rows={[["Starts", day(c.start_date)], ["Ends", day(c.end_date)], ["Venue or place", c.venue_name], ["Address", c.venue_address]]} />
          </Section>

          {c.contract_type === "exhibition" && (
            <Section title="The show">
              <Terms rows={[
                ["Venue's commission", c.commission_pct != null ? `${c.commission_pct}%` : null],
                ["Transport", TRANSPORT[c.transport_by] || c.transport_by],
                ["Insurance", c.artwork_insurance ? `The venue insures the works${c.insurance_value ? `, ${eur(c.insurance_value)}` : ""}` : "Not included"],
                ["Hanging", day(c.installation_date)], ["Opening", day(c.opening_event_date)],
                ["Taking down", day(c.deinstallation_date)], ["Unsold works back by", day(c.unsold_return_by)],
              ]} />
            </Section>
          )}

          {c.contract_type === "collaboration" && (
            <Section title="Working together">
              <Terms rows={[["Who owns the work", IP[c.ip_split] || c.ip_split], ["How money is split", c.revenue_split], ["Credit line", c.credit_line]]} />
              {c.deliverables && <div className="mt-3 border-t-hair border-line pt-3"><p className="mb-1 font-ui text-label font-semibold text-fg">Who delivers what</p><Prose>{c.deliverables}</Prose></div>}
            </Section>
          )}

          {c.contract_type === "commission" && (
            <Section title="The commission">
              <Terms rows={[
                ["Fee", eur(c.commission_fee)],
                ["Deposit", c.deposit_pct != null ? `${c.deposit_pct}%${c.commission_fee ? `, ${eur(Math.round(c.commission_fee * c.deposit_pct / 100))}` : ""}` : null],
                ["Deposit due", day(c.deposit_due_date)], ["Rest due", day(c.final_payment_date)],
                ["Rounds of changes", c.revision_rounds], ["Delivery", DELIVERY[c.delivery_method] || c.delivery_method],
              ]} />
              {c.artwork_specs && <div className="mt-3 border-t-hair border-line pt-3"><p className="mb-1 font-ui text-label font-semibold text-fg">The work</p><Prose>{c.artwork_specs}</Prose></div>}
            </Section>
          )}

          {c.contract_type === "general" && c.agreed_terms && <Section title="What you agreed"><Prose>{c.agreed_terms}</Prose></Section>}
          {c.special_conditions && <Section title="Extra terms"><Prose>{c.special_conditions}</Prose></Section>}

          {artworks.length > 0 && (
            <Section title={`Works (${artworks.length})`}>
              <ul className="flex flex-col gap-2">
                {artworks.map((aw: any) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  return (
                    <li key={aw.id}>
                      <Link href={`/dashboard/artworks/${aw.id}`} className="flex items-center gap-3 rounded-control border-hair border-line px-2.5 py-2 hover:border-ink">
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-chip bg-sunken">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img loading="lazy" decoding="async" src={img} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={15} aria-hidden className="text-fg-3" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-ui text-label font-semibold text-fg">{aw.title}</span>
                          <span className="truncate font-ui text-caption text-fg-3">{[aw.medium, aw.price ? formatPrice(Number(aw.price), "EUR") : null].filter(Boolean).join(" · ") || "No details"}</span>
                        </span>
                        {executed && <Badge tone="ok"><Shield size={11} aria-hidden /> In passport</Badge>}
                        <ChevronRight size={15} aria-hidden className="shrink-0 text-fg-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>

        {/* On a phone, put signing first when it's waiting on you. */}
        <div className={cn("flex flex-col gap-6", needsMe && "order-first lg:order-none")}>
          <Section title="Between">
            <ul className="flex flex-col gap-2">
              {[
                { name: c.initiator_name, role: c.initiator_role, done: iSigned, you: isInitiator, ext: false },
                { name: c.counterparty_name, role: c.counterparty_role, done: theySigned, you: !isInitiator, ext: isExternal },
              ].map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-control border-hair border-line px-3 py-2.5">
                  <Avatar name={p.name || "?"} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-ui text-label font-semibold text-fg">{p.name}{p.you ? " (you)" : ""}</span>
                    <span className="truncate font-ui text-caption capitalize text-fg-3">{roleWord(p.role)}{p.ext ? " · not on Artomango" : ""}</span>
                  </span>
                  {p.done && <CheckCircle2 size={17} aria-label="Signed" className="shrink-0 text-ok" />}
                </li>
              ))}
            </ul>
            {isExternal && isInitiator && !executed && !isCancelled && !isDraft && (
              <div className="mt-3 flex flex-col gap-2 rounded-control bg-sunken p-3">
                <p className="font-ui text-body-sm text-fg-2">{c.counterparty_email ? <>We emailed the signing link to {c.counterparty_email}. You can also send it yourself.</> : <>{c.counterparty_name} isn&apos;t on Artomango. Send them this link to read and sign.</>}</p>
                <Button variant="secondary" size="sm" onClick={copySigningLink} aria-live="polite">
                  {copied ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy signing link</>}
                </Button>
              </div>
            )}
          </Section>

          {isDraft && isInitiator && (
            <Card padding="lg">
              <p className="mb-3 font-ui text-body-sm text-fg-2">This is a draft. When it&apos;s ready, send it to {c.counterparty_name} to sign.</p>
              <Button variant="primary" onClick={sendDraft} disabled={sendingDraft} className="w-full">
                <Send size={15} aria-hidden /> {sendingDraft ? "Sending…" : "Send for signature"}
              </Button>
            </Card>
          )}

          {!isCancelled && !isDraft && (
            <Section title="Signatures">
              <div className="flex flex-col gap-3">
                <SignBlock name={c.initiator_name} role={c.initiator_role} signed={iSigned} signedAt={c.initiator_signed_at}
                  signature={c.initiator_signature} canSign={isInitiator && !iSigned}
                  sigName={mySig} onSigChange={setMySig} onSign={handleSign} signing={signing} />
                <SignBlock name={c.counterparty_name} role={c.counterparty_role} signed={theySigned} signedAt={c.counterparty_signed_at}
                  signature={c.counterparty_signature} canSign={!isInitiator && !theySigned && !!myId}
                  sigName={mySig} onSigChange={setMySig} onSign={handleSign} signing={signing} />
                {signError && <Alert tone="bad">{signError}</Alert>}
                <SigningRecord signatures={signatures} termsHash={termsHash} />
              </div>
            </Section>
          )}

          <Section title="Key dates">
            {dates.length === 0 ? <p className="font-ui text-body-sm text-fg-3">No dates set.</p> : (
              <ul className="divide-y divide-line">
                {dates.map(([label, d]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex items-center gap-2 font-ui text-body-sm text-fg-2"><Calendar size={14} aria-hidden className="text-fg-3" /> {label}</span>
                    <span className="font-ui text-body-sm font-semibold tabular-nums text-fg">{day(d)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} size="sm" title="Cancel this agreement?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Button>
          <Button variant="danger" onClick={handleCancel} disabled={cancelling}>{cancelling ? "Cancelling…" : "Cancel agreement"}</Button>
        </>}>
        <p className="font-ui text-body text-fg-2">It stays in your papers marked as cancelled, and no one can sign it any more.</p>
      </Modal>
    </div>
  );
}
