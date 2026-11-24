"use client";
// Collectors: the people who own your work. Each card shows what they
// own, so you remember them by the art. Totals come from your recorded
// sales, so they always match the Sales page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Mail, Pencil, Phone, Plus, Star, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Avatar, Badge, Button, ButtonLink, Card, Chip, EmptyState, Field, Input, Modal, PageHeader,
  SearchField, Select, Skeleton, Textarea, cn,
} from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { type Sale, fmtDay, isCompleted, mainCurrency } from "../sales/money";

type Status = "active" | "vip" | "inactive";
type Client = {
  id: string; name: string; email?: string | null; phone?: string | null; status: Status;
  notes?: string | null; total_spent?: number | null; purchases?: number | null; last_purchase?: string | null; created_at?: string;
};
type Sort = "spent" | "recent" | "name";

const STATUS_LABEL: Record<Status, string> = { vip: "VIP", active: "Active", inactive: "Inactive" };

const matches = (c: { id?: string; name: string; email?: string | null }, s: Sale) =>
  (!!c.id && s.client_id === c.id) ||
  (!s.client_id && (
    (!!s.buyer_email && !!c.email && s.buyer_email.toLowerCase() === c.email.toLowerCase()) ||
    (!!s.buyer_name && s.buyer_name.trim().toLowerCase() === c.name.trim().toLowerCase())));

export default function CollectorsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("spent");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Client | null>(null);
  const [form, setForm] = useState<{ client: Client | null } | null>(null);
  const [adding, setAdding] = useState(false);
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
      if (new URLSearchParams(window.location.search).get("new") === "1") setAdding(true);
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
      if (!name || s.client_id || clients.some(c => matches(c, s))) return;
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
    .filter(c => !q || [c.name, c.email, c.phone, c.notes].some(v => (v || "").toLowerCase().includes(q)))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? (b.last || "").localeCompare(a.last || "") : b.spent - a.spent);

  const openRow = open ? enriched.find(c => c.id === open.id) : null;
  const add = () => setAdding(true);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Collectors"
        description="The people who own your work."
        actions={<Button variant="primary" onClick={add}><Plus size={16} aria-hidden /> Add a collector</Button>}
      />

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {!loading && unsaved.length > 0 && (
        <Card padding="md" className="flex flex-col gap-3 border-ink bg-mango-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-ui text-body font-semibold text-fg">
              {unsaved.length} {unsaved.length === 1 ? "buyer" : "buyers"} from your sales {unsaved.length === 1 ? "isn't" : "aren't"} saved yet
            </span>
            <span className="font-ui text-body-sm text-fg-2">{unsaved.slice(0, 4).map(b => b.name).join(", ")}{unsaved.length > 4 ? ` and ${unsaved.length - 4} more` : ""}</span>
          </div>
          <Button variant="secondary" onClick={importAll} disabled={importing}><UserPlus size={15} aria-hidden /> {importing ? "Adding…" : unsaved.length === 1 ? "Save them" : "Save them all"}</Button>
        </Card>
      )}

      {!loading && clients.length > 6 && (
        <div className="flex gap-2">
          <SearchField value={search} onChange={setSearch} placeholder="Search names or notes" className="flex-1 sm:max-w-80" />
          <Select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as Sort)} className="!w-40">
            <option value="spent">Most spent</option>
            <option value="recent">Bought recently</option>
            <option value="name">Name</option>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-56 rounded-card" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? "No collectors yet" : "No one matches that"}
          description={clients.length === 0 ? "Everyone who buys your work lands here when you record a sale. You can also add someone yourself, like a person who's interested." : "Try another name."}
          action={clients.length === 0 ? <Button variant="primary" onClick={add}><Plus size={15} aria-hidden /> Add a collector</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(c => {
            const imgs = c.bought.map(s => s.artworks?.images?.[0]).filter(Boolean) as string[];
            return (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c)}
                  className="flex h-full w-full flex-col gap-4 rounded-card border-hair border-line bg-surface p-4 text-left transition hover:border-ink hover:shadow-hard-2">
                  <span className="flex items-center gap-3">
                    <Avatar name={c.name} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-ui text-body font-semibold text-fg">{c.name}</span>
                        {c.status === "vip" && <Star size={14} aria-label="VIP" className="shrink-0 fill-mango text-ink" />}
                      </span>
                      <span className="truncate font-ui text-caption text-fg-3">
                        {c.count ? `${c.count} ${c.count === 1 ? "work" : "works"}${c.last ? `, last ${fmtDay(c.last)}` : ""}` : "Hasn't bought yet"}
                      </span>
                    </span>
                    {c.spent > 0 && <span className="shrink-0 font-ui text-body font-semibold tabular-nums text-fg">{formatPrice(c.spent, currency)}</span>}
                  </span>
                  {imgs.length > 0 ? (
                    <span className="grid grid-cols-4 gap-2">
                      {imgs.slice(0, 4).map((src, i) => (
                        <span key={i} className="relative">
                          <Mat src={src} alt="" className="aspect-square w-full rounded-control" pad="p-1" />
                          {i === 3 && imgs.length > 4 && <span className="absolute inset-0 grid place-items-center rounded-control bg-[rgba(20,20,20,0.6)] font-ui text-label font-semibold text-white">+{imgs.length - 3}</span>}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="line-clamp-2 min-h-[2.5rem] rounded-control bg-sunken px-3 py-2 font-ui text-body-sm text-fg-3">{c.notes || "No works yet."}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openRow && (
        <Modal open onClose={() => setOpen(null)} size="md" title=""
          footer={
            <>
              <Button variant="ghost" className="mr-auto" onClick={() => { setForm({ client: openRow }); setOpen(null); }}><Pencil size={15} aria-hidden /> Edit</Button>
              {openRow.email && <ButtonLink href={`mailto:${openRow.email}`} variant="secondary"><Mail size={15} aria-hidden /> Email</ButtonLink>}
              <ButtonLink href={`/dashboard/sales?client=${openRow.id}`} variant="primary"><Plus size={15} aria-hidden /> Record a sale</ButtonLink>
            </>
          }>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar name={openRow.name} size="lg" />
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="flex items-center gap-2 font-display text-h2 leading-tight text-fg">
                  <span className="truncate">{openRow.name}</span>
                  {openRow.status === "vip" && <Badge tone="mango">VIP</Badge>}
                </h2>
                <span className="font-ui text-body-sm text-fg-2">
                  {openRow.count ? <>Owns {openRow.count} {openRow.count === 1 ? "work" : "works"}{openRow.spent > 0 && <>, <span className="tabular-nums">{formatPrice(openRow.spent, currency)}</span> in all</>}</> : "Hasn't bought yet"}
                </span>
              </div>
            </div>

            {(openRow.email || openRow.phone) && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 font-ui text-body-sm">
                {openRow.email && <a href={`mailto:${openRow.email}`} className="inline-flex items-center gap-2 text-fg underline-offset-4 hover:underline"><Mail size={14} aria-hidden /> {openRow.email}</a>}
                {openRow.phone && <a href={`tel:${openRow.phone}`} className="inline-flex items-center gap-2 text-fg underline-offset-4 hover:underline"><Phone size={14} aria-hidden /> {openRow.phone}</a>}
              </div>
            )}

            {openRow.notes && (
              <div className="flex flex-col gap-1.5">
                <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">What they like</span>
                <p className="whitespace-pre-line font-ui text-body text-fg">{openRow.notes}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="font-ui text-caption font-semibold uppercase tracking-[0.12em] text-fg-3">Their collection</span>
              {openRow.bought.length === 0 ? (
                <p className="rounded-control bg-sunken p-3 font-ui text-body-sm text-fg-3">Nothing yet. When you record a sale to them, the work shows up here.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {openRow.bought.map(s => (
                    <li key={s.id} className="flex flex-col gap-1.5">
                      <Mat src={s.artworks?.images?.[0]} alt={s.artworks?.title || "Work"} className="aspect-square w-full rounded-control" pad="p-2" />
                      <span className="truncate font-ui text-body-sm font-semibold text-fg">{s.artworks?.title || "A work not in Artomango"}</span>
                      <span className="font-ui text-caption tabular-nums text-fg-3">{[fmtDay(s.sale_date), formatPrice(Number(s.sale_price) || 0, s.currency || currency)].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}

      {userId && (
        <>
          <AddCollector open={adding} userId={userId} onClose={() => setAdding(false)} onSaved={() => load(userId)} />
          <CollectorForm state={form} userId={userId} onClose={() => setForm(null)} onSaved={() => load(userId)} />
        </>
      )}
    </div>
  );
}

// Add someone in three small questions. Only the name is needed.
const LIKES = ["Paintings", "Drawings", "Prints", "Photography", "Sculpture", "Small works", "Large works", "Abstract", "Figurative", "Landscapes"];

function AddCollector({ open, userId, onClose, onSaved }: { open: boolean; userId: string; onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0); setName(""); setEmail(""); setPhone(""); setLikes([]); setNote(""); setError(""); setSaving(false); setSaved(false);
  }, [open]);

  async function save() {
    setSaving(true); setError("");
    const notes = [likes.length ? `Likes: ${likes.join(", ")}` : "", note.trim()].filter(Boolean).join("\n") || null;
    const { error: e } = await createClient().from("clients").insert({ user_id: userId, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, notes, status: "active" });
    setSaving(false);
    if (e) { setError("That didn't save. Please try again."); return; }
    setSaved(true); onSaved();
  }

  const titles = ["What's their name?", "How can you reach them?", "What do they like?"];
  const hints = ["", "Optional. Handy when a new work is ready.", "Optional. Pick any, or write a line."];
  const back = <Button variant="ghost" className="mr-auto" onClick={() => setStep(s => s - 1)} disabled={step === 0}><ArrowLeft size={15} aria-hidden /> Back</Button>;

  const footer = saved ? <Button variant="primary" onClick={onClose}>Done</Button>
    : step === 0 ? <>{back}<Button variant="primary" disabled={!name.trim()} onClick={() => setStep(1)}>Continue <ArrowRight size={15} aria-hidden /></Button></>
    : step === 1 ? <>{back}<Button variant="ghost" onClick={() => { setEmail(""); setPhone(""); setStep(2); }}>Skip</Button><Button variant="primary" onClick={() => setStep(2)}>Continue <ArrowRight size={15} aria-hidden /></Button></>
    : <>{back}<Button variant="ghost" disabled={saving} onClick={() => { setLikes([]); setNote(""); save(); }}>Skip</Button><Button variant="primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Add collector"}</Button></>;

  return (
    <Modal open={open} onClose={onClose} size="sm" title={saved ? "" : "Add a collector"} footer={footer}>
      <div className="flex flex-col gap-5">
        {!saved && <div className="flex gap-1" aria-hidden>{[0, 1, 2].map(i => <span key={i} className={cn("h-1 flex-1 rounded-pill", i < step ? "bg-ink" : i === step ? "bg-mango" : "bg-line")} />)}</div>}
        {error && <Alert tone="bad">{error}</Alert>}
        {saved ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango shadow-hard-2"><Check size={28} strokeWidth={3} aria-hidden /></span>
            <h2 className="font-display text-h2 text-fg">{name.trim()} is saved</h2>
            <p className="max-w-[36ch] font-ui text-body text-fg-2">When they buy a work, pick them in Record a sale and it joins their collection.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <h2 className="font-display text-h2 leading-tight text-fg">{titles[step]}</h2>
              {hints[step] && <p className="font-ui text-body-sm text-fg-2">{hints[step]}</p>}
            </div>
            <div key={step} className="flex flex-col gap-3 animate-drop-in">
              {step === 0 && <Input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(1); }} placeholder="Their full name" aria-label="Name" className="!h-14 !text-h3" />}
              {step === 1 && <>
                <Input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email" />
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" />
              </>}
              {step === 2 && <>
                <div className="flex flex-wrap gap-2" role="group" aria-label="What they like">
                  {LIKES.map(l => <Chip key={l} selected={likes.includes(l)} onClick={() => setLikes(x => x.includes(l) ? x.filter(y => y !== l) : [...x, l])}>{l}</Chip>)}
                </div>
                <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="How you met, sizes they collect, anything to remember" aria-label="Note" />
              </>}
            </div>
          </>
        )}
      </div>
    </Modal>
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
