"use client";
// Sales: what you've sold, what's pending, and how the year is going.
// The numbers that used to live on a separate "My Reach" page sit at
// the top: four quiet totals, the last twelve months and top buyers.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Chip, EmptyState, PageHeader, SearchField, Skeleton, StatTile, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { type Sale, fmtDay, isCompleted, mainCurrency, net, statusKey } from "./money";
import { SaleModal } from "./SaleModal";

type Filter = "all" | "completed" | "pending" | "cancelled";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" }, { key: "completed", label: "Completed" }, { key: "pending", label: "Pending" }, { key: "cancelled", label: "Cancelled" },
];
const TONE: Record<string, BadgeTone> = { completed: "ok", pending: "warn", cancelled: "neutral" };
const PAGE = 25;

export default function SalesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<{ id: string; title: string; price?: number | null; currency?: string | null; status?: string | null }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; email?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [modal, setModal] = useState<{ sale: Sale | null } | null>(null);

  const load = useCallback(async (me: string) => {
    const sb = createClient();
    const [s, a, c] = await Promise.all([
      sb.from("sales").select("*, artworks(id,title,images)").eq("user_id", me).order("sale_date", { ascending: false, nullsFirst: false }),
      sb.from("artworks").select("id,title,price,currency,status").eq("user_id", me).order("created_at", { ascending: false }),
      sb.from("clients").select("id,name,email").eq("user_id", me).order("name"),
    ]);
    if (s.error) setError("Your sales didn't load. Please refresh the page.");
    setSales((s.data || []) as Sale[]); setArtworks(a.data || []); setClients(c.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id); load(user.id);
      if (new URLSearchParams(window.location.search).get("new") === "1") setModal({ sale: null });
    });
  }, [load]);

  const currency = useMemo(() => mainCurrency([...sales, ...artworks]), [sales, artworks]);

  const stats = useMemo(() => {
    const done = sales.filter(isCompleted).filter(s => (s.currency || currency).toUpperCase() === currency);
    const now = new Date();
    const ym = (d?: string | null) => (d || "").slice(0, 7);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const year = String(now.getFullYear());
    const sum = (rows: Sale[]) => rows.reduce((t, s) => t + (Number(s.sale_price) || 0), 0);
    const month = sum(done.filter(s => ym(s.sale_date) === thisMonth));
    const before = sum(done.filter(s => ym(s.sale_date) === prevMonth));
    const yearRows = done.filter(s => (s.sale_date || "").startsWith(year));
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: d.toLocaleDateString("en-GB", { month: "short" }), value: sum(done.filter(s => ym(s.sale_date) === key)) };
    });
    const buyers = new Map<string, { name: string; total: number; count: number }>();
    done.forEach(s => {
      const name = (s.buyer_name || "").trim();
      if (!name) return;
      const k = name.toLowerCase();
      const b = buyers.get(k) || { name, total: 0, count: 0 };
      b.total += Number(s.sale_price) || 0; b.count += 1;
      buyers.set(k, b);
    });
    const sold = artworks.filter(a => statusKey(a.status || "") === "sold").length;
    return {
      month, before, year: sum(yearRows), yearCount: yearRows.length,
      avg: done.length ? sum(done) / done.length : 0,
      sold, sellThrough: artworks.length ? Math.round((sold / artworks.length) * 100) : 0,
      kept: done.reduce((t, s) => t + net(s), 0), months, max: Math.max(1, ...months.map(m => m.value)),
      buyers: Array.from(buyers.values()).sort((a, b) => b.total - a.total).slice(0, 5),
      pending: sales.filter(s => statusKey(s.status) === "pending").length,
      other: sales.filter(isCompleted).length - done.length,
    };
  }, [sales, artworks, currency]);

  const q = search.toLowerCase().trim();
  const rows = sales.filter(s => {
    if (filter !== "all" && statusKey(s.status) !== filter) return false;
    if (!q) return true;
    return [s.artworks?.title, s.buyer_name, s.buyer_email, s.notes].some(v => (v || "").toLowerCase().includes(q));
  });

  const monthName = new Date().toLocaleDateString("en-GB", { month: "long" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sales"
        description="What you've sold, what's still open, and how the year is going."
        actions={<Button variant="primary" onClick={() => setModal({ sale: null })}><Plus size={16} aria-hidden /> Record a sale</Button>}
      />

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-card" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label={`Sold in ${monthName}`} value={formatPrice(stats.month, currency)}
              delta={stats.before > 0 || stats.month > 0 ? `${formatPrice(stats.before, currency)} the month before` : undefined} />
            <StatTile label={`This year`} value={formatPrice(stats.year, currency)} delta={`${stats.yearCount} ${stats.yearCount === 1 ? "sale" : "sales"}`} />
            <StatTile label="Average sale" value={formatPrice(Math.round(stats.avg), currency)} delta={stats.kept > 0 ? `${formatPrice(Math.round(stats.kept), currency)} kept after commission, all time` : undefined} />
            <StatTile label="Works sold" value={stats.sold} delta={artworks.length ? `${stats.sellThrough}% of your works` : undefined} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card padding="md" className="flex flex-col gap-4 lg:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-ui text-label font-semibold text-fg">The last 12 months</h2>
                <span className="font-ui text-caption text-fg-3">Completed sales in {currency}</span>
              </div>
              <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Sales per month: ${stats.months.map(m => `${m.label} ${formatPrice(m.value, currency)}`).join(", ")}`}>
                {stats.months.map((m, i) => (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <div title={`${m.label}: ${formatPrice(m.value, currency)}`}
                      className={cn("w-full rounded-t-[4px]", i === 11 ? "bg-mango border-outline border-ink" : m.value ? "bg-ink" : "bg-n-100")}
                      style={{ height: m.value ? `${Math.max(4, (m.value / stats.max) * 100)}%` : "3px" }} />
                    <span className="font-ui text-caption text-fg-3">{m.label.slice(0, 1)}<span className="hidden sm:inline">{m.label.slice(1)}</span></span>
                  </div>
                ))}
              </div>
              {stats.other > 0 && (
                <p className="font-ui text-caption text-fg-3">{stats.other} {stats.other === 1 ? "sale is" : "sales are"} in another currency and not counted in these totals.</p>
              )}
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="border-b-hair border-line px-4 py-3">
                <h2 className="font-ui text-label font-semibold text-fg">Top buyers</h2>
              </div>
              {stats.buyers.length === 0 ? (
                <p className="px-4 py-4 font-ui text-body-sm text-fg-3">Buyers you add to sales show up here.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {stats.buyers.map((b, i) => (
                    <li key={b.name} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-4 font-ui text-caption tabular-nums text-fg-3">{i + 1}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{b.name}</span>
                        <span className="font-ui text-caption text-fg-3">{b.count} {b.count === 1 ? "work" : "works"}</span>
                      </span>
                      <span className="font-ui text-body-sm tabular-nums text-fg">{formatPrice(b.total, currency)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
              {FILTERS.map(x => (
                <Chip key={x.key} selected={filter === x.key} onClick={() => { setFilter(x.key); setShown(PAGE); }}>
                  {x.label}{x.key === "pending" && stats.pending > 0 && <span className="tabular-nums opacity-70"> {stats.pending}</span>}
                </Chip>
              ))}
            </div>
            <SearchField value={search} onChange={v => { setSearch(v); setShown(PAGE); }} placeholder="Search works, buyers, notes" className="lg:w-80" />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title={sales.length === 0 ? "No sales yet" : "Nothing matches that"}
              description={sales.length === 0 ? "When a work sells, record it here. It marks the work as sold and keeps your totals right." : "Try another word or filter."}
              action={sales.length === 0 ? <Button variant="secondary" onClick={() => setModal({ sale: null })}><Plus size={15} aria-hidden /> Record a sale</Button> : undefined}
            />
          ) : (
            <Card padding="none" className="overflow-hidden">
              <ul className="divide-y divide-line">
                {rows.slice(0, shown).map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setModal({ sale: s })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
                      <Mat src={s.artworks?.images?.[0]} alt={s.artworks?.title || "Sale"} className="h-12 w-12 shrink-0 rounded-control" pad="p-1" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-ui text-body font-semibold text-fg">{s.artworks?.title || "No work linked"}</span>
                        <span className="truncate font-ui text-body-sm text-fg-3">
                          {[s.buyer_name || "No buyer added", fmtDay(s.sale_date)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Badge tone={TONE[statusKey(s.status)] || "neutral"} className="hidden sm:inline-flex">{s.status}</Badge>
                      <span className="w-24 shrink-0 text-right font-ui text-body tabular-nums text-fg">{formatPrice(Number(s.sale_price) || 0, s.currency || currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {rows.length > shown && (
                <div className="border-t-hair border-line px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={() => setShown(n => n + PAGE)}>Show more ({rows.length - shown})</Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {userId && (
        <SaleModal open={!!modal} sale={modal?.sale || null} userId={userId} defaultCurrency={currency}
          artworks={artworks} clients={clients} onClose={() => setModal(null)} onSaved={() => load(userId)} />
      )}
    </div>
  );
}
