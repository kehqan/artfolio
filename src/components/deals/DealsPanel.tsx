"use client";
// Deals: every offer and request in one list, sorted by what needs you.
// Each deal shows the works, a 4-step tracker and only the buttons that
// make sense right now.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, FileSignature, ImageOff, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Badge, Button, ButtonLink, Chip, EmptyState, Skeleton, cn } from "@/components/ui";
import { useJourney } from "@/components/journey/JourneyProvider";
import { Hint } from "@/components/journey/Hint";
import { AgreementSheet } from "./AgreementSheet";
import { type DealView, STEPS, headline, isClosed, loadDeals, needsMe, nextLine, setStatus, stepIndex } from "@/lib/deals";
import { workLine } from "@/lib/places";

type Filter = "needs" | "waiting" | "done";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return m <= 1 ? "just now" : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function DealsPanel({ onOpenChat, onCount }: { onOpenChat: (conversationId: string) => void; onCount?: (n: number) => void }) {
  const [me, setMe] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealView[] | null>(null);
  const [signedByMe, setSignedByMe] = useState<Record<string, boolean>>({});
  const [cancelled, setCancelled] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>("needs");
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [setupMissing, setSetupMissing] = useState(false);
  const [agreeing, setAgreeing] = useState<DealView | null>(null);
  const [filled, setFilled] = useState<Record<string, boolean>>({});
  const focused = useRef<HTMLLIElement | null>(null);
  const { toast, later } = useJourney();

  const reload = useCallback(async (uid: string) => {
    const sb = createClient();
    const list = await loadDeals(sb, uid);
    if (list === null) { setSetupMissing(true); setDeals([]); return; }
    setDeals(list);
    // Which agreements still need my signature?
    const contracts = list.filter(d => d.status === "agreement_sent" && d.contract_id).map(d => d.contract_id!) as string[];
    if (contracts.length) {
      const { data } = await sb.from("contracts").select("id, status, initiator_id, initiator_signed_at, counterparty_signed_at, executed_at").in("id", contracts);
      const mine: Record<string, boolean> = {};
      const off: Record<string, boolean> = {};
      (data || []).forEach((c: any) => {
        mine[c.id] = c.initiator_id === uid ? !!c.initiator_signed_at : !!c.counterparty_signed_at;
        if (c.status === "cancelled") off[c.id] = true;
        // Signed by both but the deal didn't catch up yet: close the loop.
        const d = list.find(x => x.contract_id === c.id);
        if (c.executed_at && d && d.status === "agreement_sent") {
          sb.from("deals").update({ status: "signed" }).eq("id", d.id).then(() => setDeals(p => p && p.map(x => x.id === d.id ? { ...x, status: "signed" } : x)));
        }
      });
      setSignedByMe(mine);
      setCancelled(off);
    }
  }, []);

  // After a signed deal, the venue can close its wall post in one tap.
  async function fillPost(d: DealView) {
    if (!d.pool_request_id) return;
    const { error } = await createClient().from("pool_requests").update({ status: "matched" }).eq("id", d.pool_request_id);
    if (!error) setFilled(p => ({ ...p, [d.pool_request_id!]: true }));
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const want = q.get("deal");
    if (want) setFocus(want);
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMe(user.id);
      const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
      setRole(prof?.role || null);
      reload(user.id);
    });
  }, [reload]);

  const mineToDo = useCallback((d: DealView) => {
    if (!me || isClosed(d)) return false;
    if (d.status === "agreement_sent") {
      // A cancelled agreement: the venue sends a new one.
      if (d.contract_id && cancelled[d.contract_id]) return d.venue_id === me;
      return d.contract_id ? !signedByMe[d.contract_id] : false;
    }
    return needsMe(d, me);
  }, [me, signedByMe, cancelled]);

  const groups = useMemo(() => {
    const list = deals || [];
    return {
      needs: list.filter(d => mineToDo(d)),
      waiting: list.filter(d => !mineToDo(d) && !isClosed(d) && d.status !== "signed"),
      done: list.filter(d => d.status === "signed"),
      closed: list.filter(isClosed),
    };
  }, [deals, mineToDo]);

  useEffect(() => { onCount?.(groups.needs.length); }, [groups.needs.length, onCount]);

  // Land on the group that holds the deal we were sent to.
  useEffect(() => {
    if (!focus || !deals) return;
    const d = deals.find(x => x.id === focus);
    if (!d) return;
    if (isClosed(d)) setShowClosed(true);
    setFilter(groups.needs.includes(d) ? "needs" : d.status === "signed" ? "done" : "waiting");
    setTimeout(() => focused.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  }, [focus, deals]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (deals && !focus && groups.needs.length === 0 && groups.waiting.length > 0) setFilter("waiting");
  }, [deals]); // eslint-disable-line react-hooks/exhaustive-deps

  function lineFor(d: DealView, status: "interested" | "declined" | "withdrawn") {
    const iAmVenue = d.venue_id === me;
    return status === "interested"
      ? (iAmVenue ? "We're interested! Let's make it happen. We'll send you an agreement to sign." : "I'm in! Happy to show these with you. Send the agreement when you're ready.")
      : status === "declined"
        ? (iAmVenue ? "Thank you for the offer. It's not the right fit for us this time." : "Thank you for thinking of me, but I'll pass this time.")
        : "I've withdrawn this. Thanks for your time.";
  }

  const patch = (id: string, status: DealView["status"]) => setDeals(p => p && p.map(x => x.id === id ? { ...x, status } : x));

  // Interested: straight away, then say what happens next.
  async function interested(d: DealView) {
    if (!me) return;
    setBusy(d.id); setError("");
    const ok = await setStatus(createClient(), d, me, "interested", lineFor(d, "interested"));
    setBusy(null);
    if (!ok) { setError("That didn't go through. Please try again."); return; }
    patch(d.id, "interested");
    const who = d.other?.full_name || (d.venue_id === me ? "The artist" : "The venue");
    if (d.venue_id === me) {
      // The venue's next move is the agreement: offer it right here.
      toast({ title: `${who} knows you're interested`, body: "Next: send a simple agreement. It's filled in from your post.", action: { label: "Send it now", onClick: () => setAgreeing({ ...d, status: "interested" }) } });
    } else {
      toast({ title: `${who} knows you're in`, body: "They'll send an agreement to sign. We'll tell you the moment it arrives." });
    }
  }

  // Passing or withdrawing happens now, with a few seconds to undo.
  function close(d: DealView, status: "declined" | "withdrawn") {
    if (!me) return;
    const before = d.status;
    patch(d.id, status);
    const who = d.other?.full_name || "They";
    later({
      title: status === "declined" ? "You passed" : "Withdrawn",
      body: status === "declined" ? `We'll let ${who} know kindly. You can still message each other.` : `${who} will see that you withdrew it.`,
      tone: "plain",
      commit: async () => {
        const ok = await setStatus(createClient(), d, me, status, lineFor(d, status));
        if (!ok) { patch(d.id, before); setError("That didn't go through. Please try again."); }
      },
      undo: () => patch(d.id, before),
    });
  }

  if (deals === null) return <div className="flex w-full max-w-3xl flex-col gap-3">{[0, 1].map(i => <Skeleton key={i} className="h-56 rounded-card" />)}</div>;

  const venue = role === "venue" || role === "gallery";
  if (setupMissing || deals.length === 0) {
    return (
      <div className="w-full max-w-3xl">
        <EmptyState
          title="No deals yet"
          description={venue
            ? "When you request works from an artist, or an artist offers you works, it shows up here with every step until it's signed."
            : "When you offer works to a place looking for art, or a venue asks for your works, it shows up here with every step until it's signed."}
          action={<ButtonLink variant="secondary" href="/dashboard/looking">{venue ? "Find artists" : "See who's looking for art"}</ButtonLink>}
        />
      </div>
    );
  }

  const shown = groups[filter];
  const tabs: { key: Filter; label: string; n: number }[] = [
    { key: "needs", label: "Needs you", n: groups.needs.length },
    { key: "waiting", label: "Waiting", n: groups.waiting.length },
    { key: "done", label: "Done", n: groups.done.length },
  ];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <Hint id="deals" title="Every deal in one place.">Each card shows the works, where it stands, and the one thing to do next. Your turn is marked in yellow.</Hint>
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
        {tabs.map(t => (
          <Chip key={t.key} selected={filter === t.key} onClick={() => setFilter(t.key)} className="shrink-0">
            {t.label}{t.n > 0 && <span className="tabular-nums opacity-70"> {t.n}</span>}
          </Chip>
        ))}
      </div>
      <div>
        {error && <Alert tone="bad" className="mb-3">{error}</Alert>}
        {shown.length === 0 ? (
          <p className="py-10 text-center font-ui text-body-sm text-fg-3">
            {filter === "needs" ? "Nothing needs you right now." : filter === "waiting" ? "Nothing waiting on others." : "No finished deals yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shown.map(d => (
              <DealCard key={d.id} d={d} me={me!} busy={busy === d.id} yourTurn={mineToDo(d)} focused={focus === d.id} liRef={focus === d.id ? focused : undefined}
                signed={d.contract_id ? !!signedByMe[d.contract_id] : false}
                agreementCancelled={!!(d.contract_id && cancelled[d.contract_id])}
                onMove={s => (s === "interested" ? interested(d) : close(d, s))}
                onAgree={() => setAgreeing(d)} filled={!!(d.pool_request_id && filled[d.pool_request_id])} onFill={() => fillPost(d)}
                onChat={() => d.conversation_id && onOpenChat(d.conversation_id)} />
            ))}
          </ul>
        )}
        {groups.closed.length > 0 && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowClosed(v => !v)} className="font-ui text-body-sm font-semibold text-fg-2 underline underline-offset-4">
              {showClosed ? "Hide" : "Show"} {groups.closed.length} closed
            </button>
            {showClosed && (
              <ul className="mt-3 flex flex-col gap-3 opacity-80">
                {groups.closed.map(d => (
                  <DealCard key={d.id} d={d} me={me!} busy={false} focused={focus === d.id} liRef={focus === d.id ? focused : undefined} signed={false}
                    onMove={() => {}} onChat={() => d.conversation_id && onOpenChat(d.conversation_id)} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {me && <AgreementSheet deal={agreeing} me={me} onClose={() => setAgreeing(null)} onSent={() => { reload(me); setFilter("waiting"); }} />}
    </div>
  );
}

function DealCard({ d, me, busy, focused, liRef, signed, agreementCancelled, onMove, onChat, onAgree, filled, onFill, yourTurn }: {
  d: DealView; me: string; busy: boolean; yourTurn?: boolean; focused: boolean; liRef?: React.Ref<HTMLLIElement>; signed: boolean; agreementCancelled?: boolean;
  onMove: (s: "interested" | "declined" | "withdrawn") => void; onChat: () => void;
  onAgree?: () => void; filled?: boolean; onFill?: () => void;
}) {
  const step = stepIndex(d.status);
  const iStarted = d.started_by === me;
  const iAmVenue = d.venue_id === me;
  const name = d.other?.full_name || (iAmVenue ? "Artist" : "Venue");
  const terms = d.terms || {};
  const termLine = [terms.wall, terms.duration, terms.sells === true ? "Sells work" : terms.sells === false ? "Display only" : null,
    terms.sells && terms.commission != null ? `${terms.commission}% commission` : null].filter(Boolean).join(" · ");

  let actions: React.ReactNode = null;
  if (d.status === "sent" && !iStarted) {
    actions = <>
      <Button variant="primary" size="sm" disabled={busy} onClick={() => onMove("interested")}><Check size={14} aria-hidden /> Interested</Button>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => onMove("declined")}>No thanks</Button>
    </>;
  } else if (d.status === "sent" || (d.status === "interested" && iStarted)) {
    actions = <Button variant="ghost" size="sm" disabled={busy} onClick={() => onMove("withdrawn")}>Withdraw</Button>;
  }
  if (d.status === "interested" && iAmVenue) {
    actions = <>
      <Button variant="primary" size="sm" onClick={onAgree}><FileSignature size={14} aria-hidden /> Send agreement</Button>
      {iStarted && <Button variant="ghost" size="sm" disabled={busy} onClick={() => onMove("withdrawn")}>Withdraw</Button>}
    </>;
  }
  if (d.status === "agreement_sent" && agreementCancelled) {
    actions = iAmVenue && onAgree
      ? <Button variant="primary" size="sm" onClick={onAgree}><FileSignature size={14} aria-hidden /> Send a new agreement</Button>
      : null;
  } else if ((d.status === "agreement_sent" || d.status === "signed") && d.contract_id) {
    actions = <>
      {d.status === "signed" && !iAmVenue && d.works[0] && (
        <ButtonLink variant="secondary" size="sm" href={`/dashboard/sales?work=${d.works.find(w => (w.status || "").toLowerCase() !== "sold")?.id || d.works[0].id}`}>A work sold? Record it</ButtonLink>
      )}
      {d.status === "signed" && iAmVenue && d.post && d.post.status === "open" && !filled && onFill && (
        <Button variant="secondary" size="sm" onClick={onFill}><Check size={14} aria-hidden /> Mark the wall as filled</Button>
      )}
      <ButtonLink variant={d.status === "agreement_sent" && !signed ? "primary" : "secondary"} size="sm" href={`/dashboard/contracts/${d.contract_id}`}>
      <FileSignature size={14} aria-hidden /> {d.status === "signed" ? "See the agreement" : signed ? "See the agreement" : "Review and sign"}
    </ButtonLink>
    </>;
  }

  return (
    <li ref={liRef} className={cn("flex flex-col gap-4 rounded-card border-hair bg-surface p-4 transition sm:p-5", focused ? "border-ink shadow-hard-2" : "border-line")}>
      <div className="flex items-start gap-3">
        <Avatar name={name} src={d.other?.avatar_url} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-ui text-body font-semibold text-fg">{headline(d, me)}</span>
          <span className="truncate font-ui text-caption text-fg-3">
            {d.post ? <>For &ldquo;{d.post.title}&rdquo; · </> : null}{ago(d.updated_at)}
          </span>
        </div>
        {d.status === "signed" ? <Badge tone="ok" className="shrink-0">Done</Badge>
          : isClosed(d) ? null
          : yourTurn ? <Badge tone="mango" className="shrink-0">Your turn</Badge>
          : <Badge className="shrink-0">Their turn</Badge>}
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-1">
        {d.works.map(w => (
          <li key={w.id} className="w-32 shrink-0">
            <Link href={`/artwork/${w.id}/passport`} target="_blank" className="group flex flex-col gap-1.5">
              <span className="relative block aspect-square overflow-hidden rounded-control border-hair border-line bg-sunken group-hover:border-ink">
                {w.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={w.images[0]} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" />
                  : <ImageOff size={18} aria-hidden className="absolute inset-0 m-auto text-fg-3" />}
              </span>
              <span className="truncate font-ui text-caption font-semibold text-fg">{w.title}</span>
              <span className="-mt-1 truncate font-ui text-caption text-fg-3">{workLine(w)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {d.note && <p className="line-clamp-3 border-l-2 border-line pl-3 font-ui text-body-sm text-fg-2">{d.note}</p>}
      {termLine && <p className="font-ui text-caption text-fg-3">{termLine}</p>}

      {step >= 0 ? (
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
              <span className={cn("h-1.5 rounded-pill", i <= step ? (i === 3 ? "bg-ok" : "bg-ink") : "bg-line")} />
              <span className={cn("font-ui text-caption", i <= step ? "font-semibold text-fg" : "text-fg-3")}>{s}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex flex-col gap-3 border-t-hair border-line pt-3 sm:flex-row sm:items-center">
        <p className="flex-1 font-ui text-body-sm text-fg-2">
          {agreementCancelled && d.status === "agreement_sent"
            ? (iAmVenue ? "You cancelled the agreement. Send a new one when you're ready." : `${name} cancelled the agreement. They can send a new one.`)
            : d.status === "agreement_sent" && d.contract_id
              ? (signed ? `You've signed. Waiting for ${name} to sign, then it's a deal.` : "Your signature is all that's left.")
              : nextLine(d, me)}
        </p>
        <div className="flex flex-wrap gap-2">
          {actions}
          {d.conversation_id && <Button variant="ghost" size="sm" onClick={onChat}><MessageSquare size={14} aria-hidden /> Message</Button>}
        </div>
      </div>
    </li>
  );
}
