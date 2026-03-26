"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewSalePage() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [artworkId, setArtworkId] = useState("");
  const [buyerName, setBuyerName] = useState(""); const [buyerEmail, setBuyerEmail] = useState("");
  const [salePrice, setSalePrice] = useState(""); const [currency, setCurrency] = useState("USD");
  const [commissionPercent, setCommissionPercent] = useState(""); const [saleDate, setSaleDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(""); const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("artworks").select("id, title, images, price, currency").eq("user_id", user.id).order("title");
      setArtworks(data || []);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artworkId) { setError("Select an artwork."); return; }
    if (!salePrice) { setError("Enter sale price."); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error: err } = await supabase.from("sales").insert({
      artwork_id: artworkId, seller_id: user.id, buyer_name: buyerName || null, buyer_email: buyerEmail || null,
      sale_price: parseFloat(salePrice), currency, commission_percent: commissionPercent ? parseFloat(commissionPercent) : null,
      sale_date: saleDate || null, payment_method: paymentMethod || null, notes: notes || null, status,
    });
    if (err) { setError("Failed to record sale."); setSaving(false); return; }
    // Update artwork status to sold
    await supabase.from("artworks").update({ status: "sold" }).eq("id", artworkId);
    router.push("/dashboard/sales"); router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/sales" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="heading-md mb-6">Record Sale</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Artwork *</label>
          <select value={artworkId} onChange={(e) => setArtworkId(e.target.value)} className="input-field">
            <option value="">Select artwork...</option>
            {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Buyer Name</label>
            <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Buyer Email</label>
            <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="input-field" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Sale Price *</label>
            <input type="number" required value={salePrice} onChange={(e) => setSalePrice(e.target.value)} step="0.01" min="0" className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field">
              {["USD","EUR","GBP","CHF","JPY","CAD"].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Commission %</label>
            <input type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} step="0.1" min="0" max="100" placeholder="e.g. 50" className="input-field" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Sale Date</label>
            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="input-field" /></div>
          <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
              <option value="">Select...</option><option value="bank_transfer">Bank Transfer</option><option value="credit_card">Credit Card</option><option value="cash">Cash</option><option value="check">Check</option><option value="other">Other</option>
            </select></div>
        </div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status</label>
          <div className="flex gap-2">{["completed","pending","cancelled"].map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={`px-3 py-2 text-xs font-medium rounded-md border capitalize transition-all ${status === s ? "bg-slate-900 text-white border-slate-900" : "text-slate-500 border-slate-200"}`}>{s}</button>
          ))}</div></div>
        <div><label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field resize-none" /></div>
        <div className="pt-4 border-t border-slate-150">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Recording...</> : <><Save size={16} /> Record Sale</>}
          </button>
        </div>
      </form>
    </div>
  );
}
