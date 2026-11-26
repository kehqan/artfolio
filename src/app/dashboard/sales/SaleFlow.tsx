"use client";
// Record a sale, one question at a time: which work, who bought it, how
// much, where it sold, and whether it's paid. Everything we already know
// (the work's price and currency, a venue's commission from a signed deal)
// is filled in, and anything else can wait with "I don't know yet".
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImageOff, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Button, ButtonLink, Input, Modal, Select, cn } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";
import { CHANNELS, type Channel, CURRENCIES } from "./money";
import { useJourney } from "@/components/journey/JourneyProvider";
import { Burst } from "@/components/journey/Burst";

export type FlowWork = { id: string; title: string; images?: string[] | null; price?: number | null; currency?: string | null; status?: string | null };
export type FlowClient = { id: string; name: string; email?: string | null };
type SignedDeal = { id: string; venue: string; commission: number | null; works: string[] };

type Step = "work" | "buyer" | "price" | "where" | "paid" | "done";
const STEPS: Step[] = ["work", "buyer", "price", "where", "paid"];

type Props = {
  open: boolean; userId: string; defaultCurrency: string;
  works: FlowWork[]; clients: FlowClient[];
  /** Start with this work or collector already picked. */
  startWork?: string | null; startClient?: string | null;
  onClose: () => void; onSaved: () => void;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function SaleFlow({ open, userId, defaultCurrency, works, clients, startWork, startClient, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>("work");
  const [workId, setWorkId] = useState<string | null>(null);   // null = not picked, "" = not in Artomango
  const [clientId, setClientId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [unknownBuyer, setUnknownBuyer] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);
  const [commission, setCommission] = useState("");
  const [paid, setPaid] = useState<boolean | null>(null);
  const [date, setDate] = useState(today());
  const [deals, setDeals] = useState<SignedDeal[]>([]);
  const [find, setFind] = useState("");
  const [findBuyer, setFindBuyer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [first, setFirst] = useState(false);
  const { win } = useJourney();

  // Reset each time it opens, and load signed deals (works on show at a venue).
  useEffect(() => {
    if (!open) return;
    setError(""); setSaving(false); setFind(""); setFindBuyer("");
    setWorkId(null); setClientId(startClient || null); setNewName(""); setNewEmail(""); setUnknownBuyer(false);
    setPrice(""); setCurrency(defaultCurrency); setChannel(null); setDealId(null); setCommission(""); setPaid(null); setDate(today());
    setStep("work");
    if (startWork && works.some(w => w.id === startWork)) pickWork(startWork, true);
    const sb = createClient();
    sb.from("deals").select("id, venue_id, artwork_ids, terms, contract_id").eq("artist_id", userId).eq("status", "signed").then(async ({ data, error: e }) => {
      if (e || !data?.length) { setDeals([]); return; }
      const venues = Array.from(new Set(data.map(d => d.venue_id)));
      const contracts = data.map(d => d.contract_id).filter(Boolean);
      const [{ data: ps }, { data: cs }] = await Promise.all([
        sb.from("profiles").select("id, full_name, venue_name").in("id", venues),
        contracts.length ? sb.from("contracts").select("id, venue_name, commission_pct").in("id", contracts) : Promise.resolve({ data: [] as { id: string; venue_name: string | null; commission_pct: number | null }[] }),
      ]);
      setDeals(data.map(d => {
        const p = (ps || []).find(x => x.id === d.venue_id);
        const c = (cs || []).find(x => x.id === d.contract_id);
        return {
          id: d.id, works: d.artwork_ids || [],
          venue: c?.venue_name || p?.venue_name || p?.full_name || "a venue",
          commission: c?.commission_pct ?? (d.terms as { commission?: number } | null)?.commission ?? null,
        };
      }));
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // A work picked before the deals loaded still gets its venue and commission.
  useEffect(() => {
    if (!workId || channel) return;
    const d = deals.find(x => x.works.includes(workId));
    if (d) { setChannel("venue"); setDealId(d.id); setCommission(d.commission != null ? String(d.commission) : ""); }
  }, [deals]); // eslint-disable-line react-hooks/exhaustive-deps

  const work = workId ? works.find(w => w.id === workId) || null : null;
  const dealFor = (id: string) => deals.find(d => d.works.includes(id));
  const client = clientId ? clients.find(c => c.id === clientId) || null : null;
  const buyerName = client?.name || newName.trim() || null;

  const available = useMemo(() => {
    const q = find.trim().toLowerCase();
    return works
      .filter(w => (w.status || "").toLowerCase() !== "sold")
      .filter(w => !q || w.title.toLowerCase().includes(q))
      .sort((a, b) => Number(!!dealFor(b.id)) - Number(!!dealFor(a.id)));
  }, [works, find, deals]); // eslint-disable-line react-hooks/exhaustive-deps

  const buyers = useMemo(() => {
    const q = findBuyer.trim().toLowerCase();
    return clients.filter(c => !q || c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)).slice(0, 6);
  }, [clients, findBuyer]);

  // Sold through a signed deal: we already know where, so skip that question.
  const flow = dealId ? STEPS.filter(x => x !== "where") : STEPS;
  function go(s: Step) { setError(""); setStep(s); }
  const order = () => (flow.includes(step) ? flow : STEPS);
  function next() { const o = order(), i = o.indexOf(step); if (i < o.length - 1) go(o[i + 1]); }
  function back() { const o = order(), i = o.indexOf(step); if (i > 0) go(o[i - 1]); }

  function pickWork(id: string, quiet = false) {
    const w = works.find(x => x.id === id);
    setWorkId(id);
    if (w?.price != null) setPrice(String(w.price));
    if (w?.currency) setCurrency(w.currency.toUpperCase());
    const d = deals.find(x => x.works.includes(id));
    if (d) { setChannel("venue"); setDealId(d.id); setCommission(d.commission != null ? String(d.commission) : ""); }
    if (!quiet) go("buyer"); else setStep("buyer");
  }

  async function save(isPaid: boolean) {
    setPaid(isPaid); setSaving(true); setError("");
    const sb = createClient();
    let cid = clientId;
    if (!cid && newName.trim()) {
      const { data: c, error: e } = await sb.from("clients").insert({ user_id: userId, name: newName.trim(), email: newEmail.trim() || null, status: "active" }).select("id").single();
      if (e || !c) { setSaving(false); setError("We couldn't save the collector. Please try again."); return; }
      cid = c.id;
    }
    const base = {
      user_id: userId, artwork_id: workId || null,
      buyer_name: buyerName, buyer_email: client?.email || newEmail.trim() || null,
      sale_price: parseFloat(price) || 0, currency, commission_percentage: parseFloat(commission) || 0,
      sale_date: date || today(), status: isPaid ? "Completed" : "Pending",
    };
    let res = await sb.from("sales").insert({ ...base, client_id: cid, channel, deal_id: dealId });
    // Before the new fields exist, save the sale without them.
    if (res.error && /client_id|channel|deal_id/.test(res.error.message || "")) res = await sb.from("sales").insert(base);
    if (res.error) { setSaving(false); setError("That didn't save. Please try again."); return; }
    if (isPaid && workId) await sb.from("artworks").update({ status: "sold" }).eq("id", workId).eq("user_id", userId);
    if (isPaid) {
      const { count } = await sb.from("sales").select("id", { count: "exact", head: true }).eq("user_id", userId).ilike("status", "completed");
      setFirst((await win("first_sale")) && (count ?? 0) <= 1);
    } else setFirst(false);
    setSaving(false);
    setStep("done");
    onSaved();
  }

  // ── Screens ──
  let title = "", hint = "", body: React.ReactNode = null, footer: React.ReactNode = null;
  const backBtn = <Button variant="ghost" className="mr-auto" onClick={back} disabled={step === "work"}><ArrowLeft size={15} aria-hidden /> Back</Button>;

  switch (step) {
    case "work":
      title = "Which work sold?"; hint = deals.length ? "Works on show through a signed deal come first." : "";
      body = (
        <div className="flex flex-col gap-3">
          {works.length > 6 && (
            <div className="relative">
              <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
              <Input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a work" className="pl-9" aria-label="Find a work" />
            </div>
          )}
          {available.length === 0 ? (
            <p className="rounded-card bg-sunken p-4 font-ui text-body-sm text-fg-2">{works.length ? "No unsold works match." : "You haven't added works yet."}</p>
          ) : (
            <ul className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
              {available.map(w => {
                const d = dealFor(w.id);
                return (
                  <li key={w.id}>
                    <button type="button" onClick={() => pickWork(w.id)}
                      className={cn("flex w-full flex-col overflow-hidden rounded-card border-hair bg-surface text-left transition hover:border-ink hover:shadow-hard-1", workId === w.id ? "border-ink" : "border-line")}>
                      <span className="relative block aspect-square bg-sunken">
                        {w.images?.[0]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img loading="lazy" decoding="async" src={w.images[0]} alt="" className="absolute inset-0 h-full w-full object-contain p-2" />
                          : <ImageOff size={20} aria-hidden className="absolute inset-0 m-auto text-fg-3" />}
                        {d && <span className="absolute left-1.5 top-1.5 rounded-pill border-hair border-ink bg-mango px-2 py-0.5 font-ui text-[11px] font-semibold text-on-mango">At {d.venue}</span>}
                      </span>
                      <span className="flex flex-col p-2.5">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
                        <span className="font-ui text-caption tabular-nums text-fg-3">{w.price != null ? formatPrice(w.price, w.currency) : "No price yet"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
      footer = <><span className="mr-auto" /><Button variant="ghost" onClick={() => { setWorkId(""); go("buyer"); }}>It&rsquo;s not in Artomango</Button></>;
      break;

    case "buyer":
      title = "Who bought it?"; hint = "They're saved as a collector, so you can see everything they own.";
      body = (
        <div className="flex flex-col gap-4">
          {clients.length > 0 && (
            <div className="flex flex-col gap-2">
              {clients.length > 6 && <Input value={findBuyer} onChange={e => setFindBuyer(e.target.value)} placeholder="Find a collector" aria-label="Find a collector" />}
              <ul className="flex flex-col gap-2">
                {buyers.map(c => (
                  <li key={c.id}>
                    <button type="button" aria-pressed={clientId === c.id} onClick={() => { setClientId(c.id); setNewName(""); setUnknownBuyer(false); go("price"); }}
                      className={cn("flex w-full items-center gap-3 rounded-card border-hair bg-surface px-3 py-2.5 text-left transition hover:border-ink", clientId === c.id ? "border-ink shadow-hard-1" : "border-line")}>
                      <Avatar name={c.name} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{c.name}</span>
                        {c.email && <span className="truncate font-ui text-caption text-fg-3">{c.email}</span>}
                      </span>
                      {clientId === c.id && <Check size={16} aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-card border-hair border-line p-3">
            <span className="font-ui text-label font-semibold text-fg">{clients.length ? "Someone new" : "Their name"}</span>
            <Input value={newName} onChange={e => { setNewName(e.target.value); setClientId(null); setUnknownBuyer(false); }} placeholder="Their full name" aria-label="New collector's name" />
            {newName.trim() && <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" />}
          </div>
        </div>
      );
      footer = <>{backBtn}
        <Button variant="ghost" onClick={() => { setClientId(null); setNewName(""); setUnknownBuyer(true); go("price"); }}>
          {work && dealFor(work.id) ? `A guest at ${dealFor(work.id)!.venue}` : <>I don&rsquo;t know yet</>}
        </Button>
        <Button variant="primary" disabled={!buyerName} onClick={next}>Continue <ArrowRight size={15} aria-hidden /></Button></>;
      break;

    case "price":
      title = "How much did it sell for?"; hint = work?.price != null ? "We filled in the price on the work. Change it if it sold for something else." : "";
      body = (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input autoFocus inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" aria-label="Price" className="!h-14 !font-display !text-h2 tabular-nums" />
          </div>
          <div className="w-28 shrink-0">
            <Select aria-label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} className="!h-14">
              {Array.from(new Set([currency, ...CURRENCIES])).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
      );
      footer = <>{backBtn}<Button variant="primary" disabled={price === "" || !(parseFloat(price) >= 0)} onClick={next}>Continue <ArrowRight size={15} aria-hidden /></Button></>;
      break;

    case "where": {
      const d = workId ? dealFor(workId) : null;
      title = "Where did it sell?"; hint = d ? `It's on show at ${d.venue}, so we picked that.` : "";
      const opt = (key: Channel, label: string, sub?: string, onPick?: () => void) => (
        <button key={key + label + (sub || "")} type="button" aria-pressed={channel === key && (!onPick || !!dealId)} onClick={onPick || (() => { setChannel(key); setDealId(null); setCommission(key === "venue" ? commission : ""); })}
          className={cn("flex items-center justify-between rounded-card border-hair px-4 py-3 text-left transition",
            channel === key && (key !== "venue" || !onPick === !dealId) ? "border-ink bg-mango-soft shadow-hard-1" : "border-line bg-surface hover:border-ink")}>
          <span className="flex flex-col">
            <span className="font-ui text-body font-semibold text-fg">{label}</span>
            {sub && <span className="font-ui text-caption text-fg-3">{sub}</span>}
          </span>
          <span aria-hidden className={cn("h-4 w-4 rounded-pill border-outline", channel === key && (key !== "venue" || !onPick === !dealId) ? "border-ink bg-ink" : "border-line-strong")} />
        </button>
      );
      body = (
        <div className="flex flex-col gap-2">
          {deals.filter(x => !workId || x.works.includes(workId) || !d).slice(0, 3).map(x => opt("venue", `At ${x.venue}`, x.commission != null ? `${x.commission}% commission, from your agreement` : "From your agreement",
            () => { setChannel("venue"); setDealId(x.id); setCommission(x.commission != null ? String(x.commission) : ""); }))}
          {CHANNELS.map(c => opt(c.key, c.label, c.hint))}
          {channel === "venue" && !dealId && (
            <label className="mt-1 flex items-center gap-3 rounded-card bg-sunken p-3">
              <span className="flex-1 font-ui text-body-sm text-fg">Their commission</span>
              <span className="w-20 shrink-0"><Input inputMode="decimal" value={commission} onChange={e => setCommission(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" className="text-right" aria-label="Commission percent" /></span>
              <span className="font-ui text-body-sm text-fg-3">%</span>
            </label>
          )}
          {channel === "venue" && parseFloat(commission) > 0 && parseFloat(price) > 0 && (
            <p className="font-ui text-body-sm text-fg-2">You keep {formatPrice(Math.round(parseFloat(price) * (1 - parseFloat(commission) / 100)), currency)}.</p>
          )}
        </div>
      );
      footer = <>{backBtn}
        <Button variant="ghost" onClick={() => { setChannel(null); setDealId(null); next(); }}>Skip</Button>
        <Button variant="primary" disabled={!channel} onClick={next}>Continue <ArrowRight size={15} aria-hidden /></Button></>;
      break;
    }

    case "paid":
      title = "Is it paid?"; hint = "Not paid yet? It waits under Waiting for payment until you mark it.";
      body = (
        <div className="flex flex-col gap-2">
          <button type="button" disabled={saving} onClick={() => save(true)} className="flex h-14 items-center justify-between rounded-card border-hair border-line bg-surface px-4 text-left font-ui text-body font-semibold text-fg transition hover:border-ink hover:shadow-hard-2">
            Yes, it&rsquo;s paid <ArrowRight size={16} aria-hidden className="text-fg-3" />
          </button>
          <button type="button" disabled={saving} onClick={() => save(false)} className="flex h-14 items-center justify-between rounded-card border-hair border-line bg-surface px-4 text-left font-ui text-body font-semibold text-fg transition hover:border-ink hover:shadow-hard-2">
            Not yet <ArrowRight size={16} aria-hidden className="text-fg-3" />
          </button>
          <label className="mt-2 flex items-center gap-3 rounded-card bg-sunken p-3">
            <span className="flex-1 whitespace-nowrap font-ui text-body-sm text-fg">Sold on</span>
            <span className="w-44 shrink-0"><Input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} aria-label="Date sold" /></span>
          </label>
          {dealId && (() => {
            const d = deals.find(x => x.id === dealId);
            const pct = parseFloat(commission) || 0;
            const keep = parseFloat(price) > 0 ? formatPrice(Math.round(parseFloat(price) * (1 - pct / 100)), currency) : null;
            return d ? (
              <p className="font-ui text-body-sm text-fg-2">
                Sold at {d.venue}{pct ? `, ${pct}% commission from your agreement` : ""}.{keep && pct ? ` You keep ${keep}.` : ""}{" "}
                <button type="button" onClick={() => go("where")} className="font-semibold text-fg underline underline-offset-2">Change</button>
              </p>
            ) : null;
          })()}
          {saving && <p className="font-ui text-body-sm text-fg-3">Saving…</p>}
        </div>
      );
      footer = <>{backBtn}</>;
      break;

    case "done":
      title = paid ? (first ? "Your first sale!" : "Sold!") : "Saved"; hint = "";
      body = (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="relative grid h-24 w-24 place-items-center">
            {first && <Burst />}
            <span className="relative grid h-16 w-16 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango shadow-hard-2 animate-pop"><Check size={28} strokeWidth={3} aria-hidden /></span>
          </span>
          <p className="max-w-[40ch] font-ui text-body text-fg-2">
            {work ? <><strong className="text-fg">{work.title}</strong> </> : "Your sale "}
            {buyerName ? <>to <strong className="text-fg">{buyerName}</strong> </> : null}
            for <strong className="tabular-nums text-fg">{formatPrice(parseFloat(price) || 0, currency)}</strong>.
            {paid ? (work ? " It's marked as sold." : "") : " It's waiting for payment."}
          </p>
          {unknownBuyer && <p className="font-ui text-caption text-fg-3">Add the buyer anytime by opening the sale.</p>}
          {first && <p className="max-w-[40ch] font-ui text-body-sm text-fg-2">The first of many. {buyerName ? "It’s in your Sales now, and the buyer is saved as a collector." : "It’s in your Sales now."}</p>}
        </div>
      );
      footer = <>
        {work && <ButtonLink variant="ghost" className="mr-auto" href={`/artwork/${work.id}/passport`}>See its passport</ButtonLink>}
        <Button variant="secondary" onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new Event("sale-flow-again")), 50); }}>Record another</Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </>;
      break;
  }

  const at = order().indexOf(step);
  return (
    <Modal open={open} onClose={onClose} size="md" title={step === "done" ? "" : "Record a sale"} footer={footer}>
      <div className="flex flex-col gap-5">
        {step !== "done" && (
          <div className="flex gap-1" aria-hidden>
            {order().map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-pill", i < at ? "bg-ink" : i === at ? "bg-mango" : "bg-line")} />)}
          </div>
        )}
        {error && <Alert tone="bad">{error}</Alert>}
        <div className={cn("flex flex-col gap-1.5", step === "done" && "items-center text-center")}>
          <h2 className="font-display text-h2 leading-tight text-fg">{title}</h2>
          {hint && <p className="font-ui text-body-sm text-fg-2">{hint}</p>}
        </div>
        <div key={step} className="flex flex-col gap-3 animate-drop-in">{body}</div>
        {step !== "done" && step !== "work" && (
          <p className="font-ui text-caption text-fg-3">
            {[work?.title || (workId === "" ? "A work not in Artomango" : null), buyerName, price && formatPrice(parseFloat(price) || 0, currency)].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Modal>
  );
}

