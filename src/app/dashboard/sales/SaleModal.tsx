"use client";
// Record a sale, or open one to change or delete it.
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Chip, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";
import { type Sale, CURRENCIES, PAYMENT_METHODS, SALE_STATUSES } from "./money";

type Artwork = { id: string; title: string; price?: number | null; currency?: string | null; status?: string | null };
type Client = { id: string; name: string; email?: string | null };

type Props = {
  open: boolean; sale: Sale | null; userId: string; defaultCurrency: string;
  artworks: Artwork[]; clients: Client[];
  onClose: () => void; onSaved: () => void;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function SaleModal({ open, sale, userId, defaultCurrency, artworks, clients, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    artwork_id: "", buyer_name: "", buyer_email: "", price: "", currency: defaultCurrency, commission: "0",
    date: today(), payment: "Bank transfer", status: "Completed", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(""); setConfirming(false);
    setF(sale ? {
      artwork_id: sale.artwork_id || "", buyer_name: sale.buyer_name || "", buyer_email: sale.buyer_email || "",
      price: sale.sale_price != null ? String(sale.sale_price) : "", currency: (sale.currency || defaultCurrency).toUpperCase(),
      commission: String(sale.commission_percentage ?? 0), date: sale.sale_date || "", payment: sale.payment_method || "Bank transfer",
      status: SALE_STATUSES.find(s => s.toLowerCase() === (sale.status || "").toLowerCase()) || "Completed", notes: sale.notes || "",
    } : {
      artwork_id: "", buyer_name: "", buyer_email: "", price: "", currency: defaultCurrency, commission: "0",
      date: today(), payment: "Bank transfer", status: "Completed", notes: "",
    });
  }, [open, sale, defaultCurrency]);

  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }));

  const price = parseFloat(f.price) || 0;
  const cut = price * ((parseFloat(f.commission) || 0) / 100);

  function pickArtwork(id: string) {
    const aw = artworks.find(a => a.id === id);
    setF(x => ({
      ...x, artwork_id: id,
      price: x.price || (aw?.price != null ? String(aw.price) : ""),
      currency: aw?.currency ? aw.currency.toUpperCase() : x.currency,
    }));
  }

  function pickBuyer(name: string) {
    const c = clients.find(x => x.name.toLowerCase() === name.trim().toLowerCase());
    setF(x => ({ ...x, buyer_name: name, buyer_email: x.buyer_email || c?.email || "" }));
  }

  async function save() {
    if (!(parseFloat(f.price) >= 0) || f.price === "") { setError("Add the price it sold for."); return; }
    setSaving(true); setError("");
    const sb = createClient();
    const row = {
      artwork_id: f.artwork_id || null, buyer_name: f.buyer_name.trim() || null, buyer_email: f.buyer_email.trim() || null,
      sale_price: parseFloat(f.price), currency: f.currency, commission_percentage: parseFloat(f.commission) || 0,
      sale_date: f.date || null, payment_method: f.payment, status: f.status, notes: f.notes.trim() || null,
    };
    const res = sale
      ? await sb.from("sales").update(row).eq("id", sale.id).eq("user_id", userId)
      : await sb.from("sales").insert({ ...row, user_id: userId });
    if (res.error) { setSaving(false); setError("That didn't save. Please try again."); return; }
    // A completed sale marks the work as sold.
    if (f.status === "Completed" && f.artwork_id) {
      await sb.from("artworks").update({ status: "sold" }).eq("id", f.artwork_id).eq("user_id", userId);
    }
    setSaving(false); onSaved(); onClose();
  }

  async function remove() {
    if (!sale) return;
    setSaving(true);
    const { error: err } = await createClient().from("sales").delete().eq("id", sale.id).eq("user_id", userId);
    setSaving(false);
    if (err) { setError("That didn't delete. Please try again."); return; }
    onSaved(); onClose();
  }

  const footer = confirming ? (
    <>
      <span className="mr-auto font-ui text-body-sm text-fg-2">Delete this sale for good?</span>
      <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
      <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>
    </>
  ) : (
    <>
      {sale && <Button variant="ghost" className="mr-auto" onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden /> Delete</Button>}
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : sale ? "Save" : "Record sale"}</Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} size="md" title={sale ? "Sale" : "Record a sale"} footer={footer}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Work" hint="Optional. A completed sale marks the work as sold.">
          {p => (
            <Select {...p} value={f.artwork_id} onChange={e => pickArtwork(e.target.value)}>
              <option value="">No work linked</option>
              {artworks.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Buyer">
            {p => (
              <>
                <Input {...p} list="sale-buyers" value={f.buyer_name} placeholder="Name" onChange={e => pickBuyer(e.target.value)} />
                <datalist id="sale-buyers">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="Buyer email" hint="Optional">
            {p => <Input {...p} type="email" value={f.buyer_email} onChange={e => set("buyer_email", e.target.value)} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_7rem_7rem]">
          <Field label="Sold for">
            {p => <Input {...p} type="number" min={0} inputMode="decimal" value={f.price} onChange={e => set("price", e.target.value)} />}
          </Field>
          <Field label="Currency">
            {p => (
              <Select {...p} value={f.currency} onChange={e => set("currency", e.target.value)}>
                {Array.from(new Set([f.currency, ...CURRENCIES])).map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Commission %">
            {p => <Input {...p} type="number" min={0} max={100} value={f.commission} onChange={e => set("commission", e.target.value)} />}
          </Field>
        </div>
        {price > 0 && (
          <p className="font-ui text-body-sm text-fg-2">
            You keep <span className="font-semibold tabular-nums text-fg">{formatPrice(price - cut, f.currency)}</span>
            {cut > 0 && <> after {formatPrice(cut, f.currency)} commission</>}.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">{p => <Input {...p} type="date" value={f.date} onChange={e => set("date", e.target.value)} />}</Field>
          <Field label="Paid by">
            {p => (
              <Select {...p} value={f.payment} onChange={e => set("payment", e.target.value)}>
                {Array.from(new Set([f.payment, ...PAYMENT_METHODS])).map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-label font-semibold text-fg">Status</span>
          <div className="flex gap-2" role="group" aria-label="Status">
            {SALE_STATUSES.map(s => <Chip key={s} selected={f.status === s} onClick={() => set("status", s)}>{s}</Chip>)}
          </div>
        </div>
        <Field label="Notes" hint="Optional">
          {p => <Textarea {...p} rows={3} value={f.notes} onChange={e => set("notes", e.target.value)} />}
        </Field>
      </div>
    </Modal>
  );
}
