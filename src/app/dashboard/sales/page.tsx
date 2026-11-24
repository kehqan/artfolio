"use client";
// Sales: one calm number for the year, what's still waiting for payment,
// and every sale with what you keep after commission. Recording a sale is
// a short step-by-step flow; tapping a sale opens the full editor.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, PageHeader, SearchField, Skeleton, Tabs, cn } from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { type Sale, channelLabel, fmtDay, isCompleted, isWaiting, mainCurrency, net, statusKey } from "./money";
import { SaleModal } from "./SaleModal";
import { type FlowClient, type FlowWork, SaleFlow } from "./SaleFlow";

type View = "year" | "all" | "waiting";
const PAGE = 25;
const yearOf = (d?: string | null) => (d || "").slice(0, 4);

export default function SalesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [works, setWorks] = useState<FlowWork[]>([]);
  const [clients, setClients] = useState<FlowClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("year");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [edit, setEdit] = useState<Sale | null>(null);
  const [flow, setFlow] = useState<{ work?: string | null; client?: string | null } | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async (me: string) => {
    const sb = createClient();
    const [s, a, c] = await Promise.all([
      sb.from("sales").select("*, artworks(id,title,images)").eq("user_id", me).order("sale_date", { ascending: false, nullsFirst: false }),
      sb.from("artworks").select("id,title,images,price,currency,status").eq("user_id", me).order("created_at", { ascending: false }),
      sb.from("clients").select("id,name,email").eq("user_id", me).order("name"),
    ]);
    if (s.error) setError("Your sales didn't load. Please refresh the page.");
    setSales((s.data || []) as Sale[]); setWorks((a.data || []) as FlowWork[]); setClients((c.data || []) as FlowClient[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id); load(user.id);
      const p = new URLSearchParams(window.location.search);
      if (p.get("new") === "1" || p.get("work") || p.get("client")) setFlow({ work: p.get("work"), client: p.get("client") });
    });
    const again = () => setFlow({});
    window.addEventListener("sale-flow-again", again);
    return () => window.removeEventListener("sale-flow-again", again);
  }, [load]);

  const currency = useMemo(() => mainCurrency([...sales, ...works]), [sales, works]);
  const thisYear = String(new Date().getFullYear());

  const year = useMemo(() => {
    const done = sales.filter(s => isCompleted(s) && yearOf(s.sale_date) === thisYear && (s.currency || currency).toUpperCase() === currency);
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${thisYear}-${String(i + 1).padStart(2, "0")}`;
      const value = done.filter(s => (s.sale_date || "").startsWith(key)).reduce((t, s) => t + (Number(s.sale_price) || 0), 0);
      return { key, label: new Date(Number(thisYear), i, 1).toLocaleDateString("en-GB", { month: "short" }), value, future: i > now.getMonth() };
    });
    return {
      total: done.reduce((t, s) => t + (Number(s.sale_price) || 0), 0),
      kept: done.reduce((t, s) => t + net(s), 0),
      count: done.length,
      months, max: Math.max(1, ...months.map(m => m.value)),
      other: sales.filter(s => isCompleted(s) && yearOf(s.sale_date) === thisYear).length - done.length,
    };
  }, [sales, currency, thisYear]);

  const waiting = sales.filter(isWaiting);
  const waitingTotal = waiting.filter(s => (s.currency || currency).toUpperCase() === currency).reduce((t, s) => t + (Number(s.sale_price) || 0), 0);
  const buyerOf = (s: Sale) => (s.client_id && clients.find(c => c.id === s.client_id)?.name) || s.buyer_name || "";

  const q = search.toLowerCase().trim();
  const rows = sales.filter(s => {
    if (view === "year" && yearOf(s.sale_date) !== thisYear) return false;
    if (view === "waiting" && !isWaiting(s)) return false;
    if (view !== "waiting" && isWaiting(s) && !q) return false; // already shown above
    if (!q) return true;
    return [s.artworks?.title, buyerOf(s), s.buyer_email, s.notes].some(v => (v || "").toLowerCase().includes(q));
  });

  async function markPaid(s: Sale) {
    if (!userId) return;
    setPaying(s.id);
    const sb = createClient();
    const { error: e } = await sb.from("sales").update({ status: "Completed" }).eq("id", s.id).eq("user_id", userId);
    if (!e && s.artwork_id) await sb.from("artworks").update({ status: "sold" }).eq("id", s.artwork_id).eq("user_id", userId);
    setPaying(null);
    if (e) { setError("That didn't save. Please try again."); return; }
    setSales(list => list.map(x => (x.id === s.id ? { ...x, status: "Completed" } : x)));
  }

  const record = () => setFlow({});

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Sales"
        description="What you've sold, and what's still to be paid."
        actions={<Button variant="primary" onClick={record}><Plus size={16} aria-hidden /> Record a sale</Button>}
      />

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-4"><Skeleton className="h-48 rounded-card" /><Skeleton className="h-64 rounded-card" /></div>
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="When a work sells, record it here in a few taps. We mark the work as sold, save the buyer as a collector and keep your totals right."
          action={<Button variant="primary" onClick={record}><Plus size={15} aria-hidden /> Record your first sale</Button>}
        />
      ) : (
        <>
          {/* The year, in one line and one small chart. */}
          <Card padding="none" className="grid overflow-hidden md:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col justify-center gap-2 p-6 sm:p-8">
              <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">{thisYear} so far</span>
              <span className="font-display text-[56px] font-extrabold leading-none tabular-nums text-fg sm:text-[68px]">{formatPrice(year.total, currency)}</span>
              <span className="font-ui text-body text-fg-2">
                {year.count === 0 ? "No paid sales yet this year." : <>from {year.count} {year.count === 1 ? "work" : "works"}{year.kept < year.total - 0.5 && <>, and you kept <strong className="tabular-nums text-fg">{formatPrice(Math.round(year.kept), currency)}</strong> after commission</>}.</>}
              </span>
              {year.other > 0 && <span className="font-ui text-caption text-fg-3">{year.other} {year.other === 1 ? "sale" : "sales"} in another currency not counted.</span>}
            </div>
            <div className="flex h-48 items-end gap-1.5 border-t-hair border-line bg-sunken px-5 pb-4 pt-6 md:h-auto md:border-l-hair md:border-t-0"
              role="img" aria-label={`Paid sales per month in ${thisYear}: ${year.months.filter(m => !m.future).map(m => `${m.label} ${formatPrice(m.value, currency)}`).join(", ")}`}>
              {year.months.map((m, i) => (
                <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div title={`${m.label}: ${formatPrice(m.value, currency)}`}
                    className={cn("w-full rounded-t-[4px]", i === new Date().getMonth() ? "border-outline border-ink bg-mango" : m.value ? "bg-ink" : m.future ? "bg-transparent" : "bg-line")}
                    style={{ height: m.value ? `${Math.max(5, (m.value / year.max) * 100)}%` : "3px" }} />
                  <span className={cn("font-ui text-caption", m.future ? "text-fg-disabled" : "text-fg-3")}>{m.label.slice(0, 1)}<span className="hidden lg:inline">{m.label.slice(1)}</span></span>
                </div>
              ))}
            </div>
          </Card>

          {/* Money that's on its way. */}
          {waiting.length > 0 && view !== "waiting" && (
            <section className="flex flex-col gap-3" aria-labelledby="waiting-h">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="waiting-h" className="font-display text-h3 text-fg">Waiting for payment</h2>
                {waitingTotal > 0 && <span className="font-ui text-body-sm tabular-nums text-fg-3">{formatPrice(waitingTotal, currency)} to come</span>}
              </div>
              <Card padding="none" className="overflow-hidden border-ink bg-mango-soft">
                <ul className="divide-y divide-line">
                  {waiting.map(s => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => setEdit(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <Mat src={s.artworks?.images?.[0]} alt={s.artworks?.title || "Sale"} className="h-12 w-12 shrink-0 rounded-control" pad="p-1" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-ui text-body font-semibold text-fg">{s.artworks?.title || "A work not in Artomango"}</span>
                          <span className="truncate font-ui text-body-sm text-fg-2">{[buyerOf(s) || "Buyer not added", fmtDay(s.sale_date)].filter(Boolean).join(" · ")}</span>
                        </span>
                      </button>
                      <span className="hidden font-ui text-body tabular-nums text-fg sm:block">{formatPrice(Number(s.sale_price) || 0, s.currency || currency)}</span>
                      <Button size="sm" variant="secondary" disabled={paying === s.id} onClick={() => markPaid(s)}>
                        <Check size={14} aria-hidden /> {paying === s.id ? "Saving…" : "Mark as paid"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <section className="flex flex-col gap-4" aria-label="Your sales">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs label="Show" value={view} onChange={v => { setView(v); setShown(PAGE); }}
                items={[{ value: "year", label: "This year" }, { value: "all", label: "All" }, { value: "waiting", label: "Waiting", count: waiting.length || undefined }]} />
              {sales.length > 10 && <SearchField value={search} onChange={v => { setSearch(v); setShown(PAGE); }} placeholder="Search works or buyers" className="sm:w-72" />}
            </div>

            {rows.length === 0 ? (
              <p className="rounded-card bg-sunken px-4 py-6 text-center font-ui text-body-sm text-fg-2">
                {q ? "Nothing matches that." : view === "waiting" ? "Nothing is waiting for payment." : view === "year" ? "No paid sales this year yet. Older ones are under All." : "Every sale is waiting for payment, above."}
              </p>
            ) : (
              <Card padding="none" className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {rows.slice(0, shown).map(s => {
                    const cur = s.currency || currency;
                    const fee = Number(s.commission_percentage) || 0;
                    const cancelled = statusKey(s.status) === "cancelled";
                    return (
                      <li key={s.id}>
                        <button type="button" onClick={() => setEdit(s)} className={cn("flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-sunken", cancelled && "opacity-60")}>
                          <Mat src={s.artworks?.images?.[0]} alt={s.artworks?.title || "Sale"} className="h-14 w-14 shrink-0 rounded-control" pad="p-1" />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate font-ui text-body font-semibold text-fg">{s.artworks?.title || "A work not in Artomango"}</span>
                            <span className="truncate font-ui text-body-sm text-fg-3">
                              {[buyerOf(s) || "Buyer not added", channelLabel(s.channel), fmtDay(s.sale_date)].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className={cn("font-ui text-body font-semibold tabular-nums text-fg", cancelled && "line-through")}>{formatPrice(Number(s.sale_price) || 0, cur)}</span>
                            {cancelled ? <span className="font-ui text-caption text-fg-3">Cancelled</span>
                              : isWaiting(s) ? <span className="font-ui text-caption text-warn">Waiting</span>
                              : fee > 0 ? <span className="font-ui text-caption tabular-nums text-fg-3">You keep {formatPrice(Math.round(net(s)), cur)}</span> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {rows.length > shown && (
                  <div className="border-t-hair border-line px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setShown(n => n + PAGE)}>Show more ({rows.length - shown})</Button>
                  </div>
                )}
              </Card>
            )}
          </section>
        </>
      )}

      {userId && (
        <>
          <SaleFlow open={!!flow} userId={userId} defaultCurrency={currency} works={works} clients={clients}
            startWork={flow?.work} startClient={flow?.client} onClose={() => setFlow(null)} onSaved={() => load(userId)} />
          <SaleModal open={!!edit} sale={edit} userId={userId} defaultCurrency={currency}
            artworks={works} clients={clients} onClose={() => setEdit(null)} onSaved={() => load(userId)} />
        </>
      )}
    </div>
  );
}
