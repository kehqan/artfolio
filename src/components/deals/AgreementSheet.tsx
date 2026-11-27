"use client";
// Send an agreement from a deal in one sheet. Everything is filled in
// from the deal and the wall post; the venue checks the dates and sends.
// It becomes a normal exhibition agreement that both sides sign.
import { useEffect, useRef, useState } from "react";
import { FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Field, Input, Modal, Textarea } from "@/components/ui";
import { type DealView, chatLine } from "@/lib/deals";
import { track } from "@/lib/analytics";
import { asDate, localDay } from "@/lib/dates";
import { insertOnce, newId } from "@/lib/once";

// Days in the person's own time zone (lib/dates).
const iso = localDay;

/** "3 months" → the end date that many months after the start. */
function endFrom(start: string, duration?: string | null) {
  const m = /^(\d+)\s*month/.exec(duration || "");
  const months = m ? Number(m[1]) : 1;
  const d = asDate(start);
  d.setMonth(d.getMonth() + months);
  return iso(d);
}

type Props = { deal: DealView | null; me: string; onClose: () => void; onSent: () => void };

export function AgreementSheet({ deal, me, onClose, onSent }: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [commission, setCommission] = useState("");
  const [address, setAddress] = useState("");
  const [extra, setExtra] = useState("");
  const [venue, setVenue] = useState<{ name: string; email: string; role: string; location: string }>({ name: "", email: "", role: "venue", location: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  // One agreement per sheet: tapping Send again after a dropped connection
  // finds the agreement that already went through instead of making a second.
  const contractId = useRef(newId());

  useEffect(() => {
    if (!deal) return;
    setError(""); setSent(null); setSending(false); setExtra("");
    contractId.current = newId();
    const s = new Date(); s.setDate(s.getDate() + 7);
    // A project's own dates come first (lib/projects).
    const st = deal.project?.starts_on || iso(s);
    setStart(st);
    setEnd(deal.project?.ends_on && deal.project.ends_on >= st ? deal.project.ends_on : endFrom(st, deal.terms?.duration));
    setCommission(deal.terms?.sells && deal.terms?.commission != null ? String(deal.terms.commission) : "");
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      const { data: p } = await sb.from("profiles").select("full_name,venue_name,role,location").eq("id", me).single();
      const v = { name: p?.venue_name || p?.full_name || "", email: user?.email || "", role: p?.role || "venue", location: p?.location || "" };
      setVenue(v);
      setAddress(deal.project ? (deal.project.place || (deal.project.online ? "Online" : "")) : deal.post?.location || v.location);
    });
  }, [deal, me]);

  if (!deal) return null;
  const artist = deal.other?.full_name || "the artist";
  const sells = !!deal.terms?.sells;
  const works = deal.works.map(w => w.title).join(", ");

  async function send() {
    if (!deal || sending) return;
    if (!start || !end) { setError("Add when it starts and ends."); return; }
    if (end < start) { setError("The end date is before the start."); return; }
    setSending(true); setError("");
    const sb = createClient();
    const where = venue.name || "our space";
    const project = deal.project;
    const title = project
      ? `${deal.works.length === 1 ? deal.works[0].title : `${deal.works.length} works`} for ${project.title}`
      : `${deal.works.length === 1 ? deal.works[0].title : `${deal.works.length} works`} at ${where}`;
    const shows = project
      ? `${artist} shows ${works} in ${project.title}${address.trim() ? `, at ${address.trim()}` : ""}, curated by ${venue.name || "the curator"}.`
      : `${artist} shows ${works} at ${where}${deal.terms?.wall ? ` (${deal.terms.wall})` : ""}.`;
    const { data: contract, error: err } = await insertOnce<{ id: string }>(sb, "contracts", {
      id: contractId.current,
      contract_type: "exhibition",
      status: "sent",
      title,
      initiator_id: me, initiator_role: venue.role, initiator_name: venue.name, initiator_email: venue.email || null,
      counterparty_id: deal.artist_id, counterparty_role: "artist", counterparty_name: deal.other?.full_name || "Artist", counterparty_email: null,
      pool_request_id: deal.pool_request_id,
      venue_name: (project ? project.place || project.title : venue.name) || null,
      venue_address: address.trim() || null,
      start_date: start, end_date: end,
      installation_date: start,
      deinstallation_date: end,
      description: `${shows} ${sells ? "The works are for sale during the show." : "The works are on display only, not for sale."}`,
      commission_pct: sells && commission.trim() ? Number(commission) : null,
      transport_by: "artist",
      special_conditions: extra.trim() || null,
    }, "id");
    if (err || !contract) { setSending(false); setError("That didn't send. Please try again."); return; }

    if (deal.artwork_ids.length) {
      await sb.from("contract_artworks").upsert(deal.artwork_ids.map(id => ({ contract_id: contract.id, artwork_id: id })), { onConflict: "contract_id,artwork_id", ignoreDuplicates: true });
    }
    await sb.from("deals").update({ status: "agreement_sent", contract_id: contract.id }).eq("id", deal.id);
    await chatLine(sb, deal, me, `I've sent you an agreement for ${works}. Have a look and sign it here: ${window.location.origin}/dashboard/contracts/${contract.id}`);
    setSending(false);
    track("agreement_sent");
    setSent(contract.id);
    onSent();
  }

  if (sent) {
    return (
      <Modal open onClose={onClose} size="sm" title="Agreement sent"
        footer={<>
          <Button variant="secondary" onClick={onClose}>Later</Button>
          <ButtonLink variant="primary" href={`/dashboard/contracts/${sent}`}><FileSignature size={15} aria-hidden /> Sign it now</ButtonLink>
        </>}>
        <p className="font-ui text-body text-fg-2">
          {artist} gets an email and can sign it now. Add your signature too: once you&rsquo;ve both signed, it&rsquo;s a deal and the dates go into both your planners.
        </p>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="md" title={`Agreement with ${artist}`}
      description={<span className="font-ui text-body-sm text-fg-3">{deal.project ? `We filled it in from ${deal.project.title}. Check the dates and send.` : "We filled it in from the offer. Check the dates and send."}</span>}
      footer={<>
        <ButtonLink variant="ghost" href="/dashboard/contracts/new?type=exhibition" className="mr-auto hidden sm:inline-flex">Write it yourself</ButtonLink>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send to sign"}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border-hair border-line bg-sunken p-4 font-ui text-body-sm">
          <dt className="text-fg-3">Works</dt><dd className="text-fg">{works}</dd>
          {deal.project && <><dt className="text-fg-3">Project</dt><dd className="text-fg">{deal.project.title}</dd></>}
          <dt className="text-fg-3">Between</dt><dd className="text-fg">{venue.name || "You"} and {artist}</dd>
          {deal.terms?.wall && <><dt className="text-fg-3">Wall</dt><dd className="text-fg">{deal.terms.wall}</dd></>}
          <dt className="text-fg-3">Selling</dt><dd className="text-fg">{sells ? "Yes, the works can be bought" : "No, display only"}</dd>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">{p => <Input {...p} type="date" value={start} onChange={e => { setStart(e.target.value); if (e.target.value) setEnd(endFrom(e.target.value, deal.terms?.duration)); }} />}</Field>
          <Field label="Ends" hint={deal.project?.ends_on ? "The project's dates" : deal.terms?.duration && deal.terms.duration !== "Ongoing" ? `${deal.terms.duration}, as in your post` : undefined}>
            {p => <Input {...p} type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} />}
          </Field>
        </div>
        {sells && (
          <Field label="Your commission on sales" hint="Percent of the price, if a work sells.">
            {p => <Input {...p} type="number" inputMode="numeric" min={0} max={100} value={commission} onChange={e => setCommission(e.target.value)} />}
          </Field>
        )}
        <Field label="Address">{p => <Input {...p} value={address} onChange={e => setAddress(e.target.value)} />}</Field>
        <Field label="Anything else" hint="Optional. Hanging, insurance, an opening night…">
          {p => <Textarea {...p} rows={2} value={extra} onChange={e => setExtra(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  );
}
