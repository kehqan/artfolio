"use client";
// Collectors: the people who buy your work. Totals come straight from
// your recorded sales, so they always match the Sales page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, Chip, EmptyState, Field, Input, Modal, PageHeader,
  SearchField, Select, Skeleton, Textarea,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { type Sale, fmtDay, isCompleted, mainCurrency } from "../sales/money";

type Status = "active" | "vip" | "inactive";
type Client = {
  id: string; name: string; email?: string | null; phone?: string | null; status: Status;
  notes?: string | null; total_spent?: number | null; purchases?: number | null; last_purchase?: string | null; created_at?: string;
};
type Filter = "all" | Status;
type Sort = "spent" | "recent" | "name";

const STATUS_LABEL: Record<Status, string> = { vip: "VIP", active: "Active", inactive: "Inactive" };
const STATUS_TONE: Record<Status, BadgeTone> = { vip: "mango", active: "neutral", inactive: "neutral" };

const matches = (c: { name: string; email?: string | null }, s: Sale) =>
  (!!s.buyer_email && !!c.email && s.buyer_email.toLowerCase() === c.email.toLowerCase()) ||
  (!!s.buyer_name && s.buyer_name.trim().toLowerCase() === c.name.trim().toLowerCase());

export default function CollectorsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("spent");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Client | null>(null);
  const [form, setForm] = useState<{ client: Client | null } | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async (me: string) => {
    const sb = createClient();
    const [c, s] = await Promise.all([
      sb.from("clients").select("*").eq("user_id", me).order("created_at", { ascending: false }),
      sb.from("sales").select("*, artworks(id,title,images)").eq("user_id", me).order("sale_date", { ascending: false, nullsFirst: false }),
    ]);
    if (c.error) setError("Your collectors didn't load. Please refresh the page.");
    setClients((c.data || []) as Client[]); setSales((s.data || []) as Sale[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id); load(user.id);
    });
  }, [load]);

  const currency = useMemo(() => mainCurrency(sales), [sales]);
  const done = useMemo(() => sales.filter(isCompleted), [sales]);

  const enriched = useMemo(() => clients.map(c => {
    const bought = done.filter(s => matches(c, s));
    const spent = bought.length ? bought.reduce((t, s) => t + (Number(s.sale_price) || 0), 0) : Number(c.total_spent) || 0;
    const status: Status = c.status in STATUS_LABEL ? c.status : "active";
    return { ...c, status, bought, spent, count: bought.length || Number(c.purchases) || 0, last: bought[0]?.sale_date || c.last_purchase || null };
  }), [clients, done]);

  // Buyers in your sales who aren't saved as collectors yet
  const unsaved = useMemo(() => {
    const m = new Map<string, { name: string; email: string }>();
    done.forEach(s => {
      const name = (s.buyer_name || "").trim();
      if (!name || clients.some(c => matches(c, s))) return;
      const k = (s.buyer_email || name).toLowerCase();
      if (!m.has(k)) m.set(k, { name, email: s.buyer_email || "" });
    });
    return Array.from(m.values());
  }, [done, clients]);

  async function importAll() {
    if (!userId || !unsaved.length) return;
    setImporting(true);
    const rows = unsaved.map(b => {
      const bs = done.filter(s => matches(b, s));
      return {
        user_id: userId, name: b.name, email: b.email || null, status: "active",
        total_spent: bs.reduce((t, s) => t + (Number(s.sale_price) || 0), 0), purchases: bs.length, last_purchase: bs[0]?.sale_date || null,
      };
    });
    const { error: err } = await createClient().from("clients").insert(rows);
    setImporting(false);
    if (err) { setError("Couldn't add them. Please try again."); return; }
    load(userId);
  }

  const q = search.toLowerCase().trim();
  const list = enriched
    .filter(c => (filter === "all" || c.status === filter) && (!q || [c.name, c.email, c.phone].some(v => (v || "").toLowerCase().includes(q))))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? (b.last || "").localeCompare(a.last || "") : b.spent - a.spent);

  const openRow = open ? enriched.find(c => c.id === open.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Collectors"
        description="The people who buy your work, and what they've bought."
        actions={<Button variant="primary" onClick={() => setForm({ client: null })}><Plus size={16} aria-hidden /> Add a collector</Button>}
      />

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {!loading && unsaved.length > 0 && (
        <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-ui text-body font-semibold text-fg">
              {unsaved.length} {unsaved.length === 1 ? "buyer" : "buyers"} from your sales {unsaved.length === 1 ? "isn't" : "aren't"} saved yet
            </span>
            <span className="font-ui text-body-sm text-fg-3">{unsaved.slice(0, 4).map(b => b.name).join(", ")}{unsaved.length > 4 ? ` and ${unsaved.length - 4} more` : ""}</span>
          </div>
          <Button variant="secondary" onClick={importAll} disabled={importing}><UserPlus size={15} aria-hidden /> {importing ? "Adding…" : unsaved.length === 1 ? "Add them" : "Add them all"}</Button>
        </Card>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {(["all", "vip", "active", "inactive"] as Filter[]).map(k => (
            <Chip key={k} selected={filter === k} onClick={() => setFilter(k)}>{k === "all" ? "All" : STATUS_LABEL[k]}</Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <SearchField value={search} onChange={setSearch} placeholder="Search names, emails" className="flex-1 lg:w-72" />
          <Select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as Sort)} className="w-40">
            <option value="spent">Most spent</option>
            <option value="recent">Bought recently</option>
            <option value="name">Name</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? "No collectors yet" : "No one matches that"}
          description={clients.length === 0 ? "Add the people who buy your work, or record a sale with a buyer and add them from there." : "Try another name or filter."}
          action={clients.length === 0 ? <Button variant="secondary" onClick={() => setForm({ client: null })}><Plus size={15} aria-hidden /> Add a collector</Button> : undefined}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">
            {list.map(c => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
                  <Avatar name={c.name} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-ui text-body font-semibold text-fg">{c.name}</span>
                      {c.status !== "active" && <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>}
                    </span>
                    <span className="truncate font-ui text-body-sm text-fg-3">
                      {[c.count ? `${c.count} ${c.count === 1 ? "work" : "works"}` : "No purchases yet", c.last ? `last ${fmtDay(c.last)}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-ui text-body tabular-nums text-fg">{c.spent ? formatPrice(c.spent, currency) : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {openRow && (
        <Modal open onClose={() => setOpen(null)} size="md" title={openRow.name}
          description={<Badge tone={STATUS_TONE[openRow.status]}>{STATUS_LABEL[openRow.status]}</Badge>}
          footer={
            <>
              <Button variant="ghost" className="mr-auto" onClick={() => { setForm({ client: openRow }); setOpen(null); }}><Pencil size={15} aria-hidden /> Edit</Button>
              <ButtonLink href="/dashboard/sales?new=1" variant="primary"><Plus size={15} aria-hidden /> Record a sale</ButtonLink>
            </>
          }>
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-control bg-sunken p-3">
                <div className="font-ui text-caption text-fg-3">Spent</div>
                <div className="font-display text-h2 tabular-nums text-fg">{formatPrice(openRow.spent, currency)}</div>
              </div>
              <div className="rounded-control bg-sunken p-3">
                <div className="font-ui text-caption text-fg-3">Works bought</div>
                <div className="font-display text-h2 tabular-nums text-fg">{openRow.count}</div>
              </div>
            </div>
            {(openRow.email || openRow.phone) && (
              <div className="flex flex-col gap-2 font-ui text-body-sm">
                {openRow.email && <a href={`mailto:${openRow.email}`} className="inline-flex items-center gap-2 text-fg underline-offset-4 hover:underline"><Mail size={14} aria-hidden /> {openRow.email}</a>}
                {openRow.phone && <a href={`tel:${openRow.phone}`} className="inline-flex items-center gap-2 text-fg underline-offset-4 hover:underline"><Phone size={14} aria-hidden /> {openRow.phone}</a>}
              </div>
            )}
            {openRow.notes && <p className="whitespace-pre-line rounded-control border-hair border-line p-3 font-ui text-body-sm text-fg-2">{openRow.notes}</p>}
            <div className="flex flex-col gap-2">
              <span className="font-ui text-label font-semibold text-fg">What they bought</span>
              {openRow.bought.length === 0 ? (
                <p className="font-ui text-body-sm text-fg-3">No sales recorded with this name or email yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded-control border-hair border-line">
                  {openRow.bought.map(s => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                      <Mat src={s.artworks?.images?.[0]} alt={s.artworks?.title || "Work"} className="h-10 w-10 shrink-0 rounded-chip" pad="p-0.5" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{s.artworks?.title || "No work linked"}</span>
                        <span className="font-ui text-caption text-fg-3">{fmtDay(s.sale_date)}</span>
                      </span>
                      <span className="font-ui text-body-sm tabular-nums text-fg">{formatPrice(Number(s.sale_price) || 0, s.currency || currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}

      {userId && (
        <CollectorForm state={form} userId={userId} onClose={() => setForm(null)} onSaved={() => load(userId)} />
      )}
    </div>
  );
}

function CollectorForm({ state, userId, onClose, onSaved }: { state: { client: Client | null } | null; userId: string; onClose: () => void; onSaved: () => void }) {
  const c = state?.client || null;
  const [f, setF] = useState({ name: "", email: "", phone: "", status: "active" as Status, notes: "" });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state) return;
    setError(""); setConfirming(false);
    setF({ name: c?.name || "", email: c?.email || "", phone: c?.phone || "", status: c?.status || "active", notes: c?.notes || "" });
  }, [state, c]);

  if (!state) return null;

  async function save() {
    if (!f.name.trim()) { setError("Add their name."); return; }
    setSaving(true); setError("");
    const row = { name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null, status: f.status, notes: f.notes.trim() || null, updated_at: new Date().toISOString() };
    const sb = createClient();
    const res = c ? await sb.from("clients").update(row).eq("id", c.id).eq("user_id", userId) : await sb.from("clients").insert({ ...row, user_id: userId });
    setSaving(false);
    if (res.error) { setError("That didn't save. Please try again."); return; }
    onSaved(); onClose();
  }

  async function remove() {
    if (!c) return;
    setSaving(true);
    const { error: err } = await createClient().from("clients").delete().eq("id", c.id).eq("user_id", userId);
    setSaving(false);
    if (err) { setError("That didn't delete. Please try again."); return; }
    onSaved(); onClose();
  }

  return (
    <Modal open onClose={onClose} size="sm" title={c ? "Edit collector" : "Add a collector"}
      footer={confirming ? (
        <>
          <span className="mr-auto font-ui text-body-sm text-fg-2">Delete {c?.name}? Their sales stay.</span>
          <Button variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
          <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>
        </>
      ) : (
        <>
          {c && <Button variant="ghost" className="mr-auto" onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden /> Delete</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : c ? "Save" : "Add"}</Button>
        </>
      )}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Name">{p => <Input {...p} autoFocus value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" hint="Optional">{p => <Input {...p} type="email" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} />}</Field>
          <Field label="Phone" hint="Optional">{p => <Input {...p} type="tel" value={f.phone} onChange={e => setF(x => ({ ...x, phone: e.target.value }))} />}</Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-label font-semibold text-fg">Status</span>
          <div className="flex gap-2" role="group" aria-label="Status">
            {(["active", "vip", "inactive"] as Status[]).map(s => <Chip key={s} selected={f.status === s} onClick={() => setF(x => ({ ...x, status: s }))}>{STATUS_LABEL[s]}</Chip>)}
          </div>
        </div>
        <Field label="Notes" hint="What they like, how you met, sizes they collect">
          {p => <Textarea {...p} rows={3} value={f.notes} onChange={e => setF(x => ({ ...x, notes: e.target.value }))} />}
        </Field>
      </div>
    </Modal>
  );
}
