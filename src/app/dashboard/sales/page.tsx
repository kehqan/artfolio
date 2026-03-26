import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, DollarSign, Image as ImageIcon } from "lucide-react";

export default async function SalesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch sales without join first, then enrich with artwork data
  const { data: sales, error: salesErr } = await supabase
    .from("sales")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (salesErr) console.error("Sales fetch error:", salesErr.message);
  const items = sales || [];

  // Fetch artwork details separately for each sale
  const artworkIds = items.map((s: any) => s.artwork_id).filter(Boolean);
  let artworkMap: Record<string, any> = {};
  if (artworkIds.length > 0) {
    const { data: artworks } = await supabase
      .from("artworks")
      .select("id, title, images, medium")
      .in("id", artworkIds);
    (artworks || []).forEach((a: any) => { artworkMap[a.id] = a; });
  }

  const totalRevenue = items.filter((s: any) => s.status !== "cancelled").reduce((sum: number, s: any) => sum + (parseFloat(s.sale_price) || 0), 0);
  const totalCommission = items.filter((s: any) => s.status !== "cancelled").reduce((sum: number, s: any) => sum + ((parseFloat(s.sale_price) || 0) * (parseFloat(s.commission_percent) || 0) / 100), 0);
  const completedCount = items.filter((s: any) => s.status === "completed").length;
  const pendingCount = items.filter((s: any) => s.status === "pending").length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="heading-md">Sales</h1><p className="text-sm text-slate-500 mt-1">Track revenue, commissions, and sale history</p></div>
        <Link href="/dashboard/sales/new" className="btn-primary"><PlusCircle size={16} /> Record Sale</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-slate-800">${totalRevenue.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Commission</p>
          <p className="text-2xl font-semibold text-slate-800">${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
        <div className="card p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Completed</p>
          <p className="text-2xl font-semibold text-emerald-600">{completedCount}</p></div>
        <div className="card p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-semibold text-amber-600">{pendingCount}</p></div>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <DollarSign size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">No sales recorded</h2>
          <p className="text-sm text-slate-400 mt-2">Start tracking your artwork sales and revenue.</p>
          <Link href="/dashboard/sales/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Record First Sale</Link>
        </div>
      ) : (
        <div className="table-container overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="table-header">
              <tr><th>Artwork</th><th>Buyer</th><th>Price</th><th>Commission</th><th>Net</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {items.map((sale: any) => {
                const artwork = artworkMap[sale.artwork_id];
                const price = parseFloat(sale.sale_price) || 0;
                const commission = price * (parseFloat(sale.commission_percent) || 0) / 100;
                const net = price - commission;
                const statusStyle: Record<string, string> = { completed: "badge-available", pending: "bg-amber-50 text-amber-700 border border-amber-200", cancelled: "badge-not-for-sale" };
                return (
                  <tr key={sale.id} className="table-row">
                    <td><div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-100 border border-slate-150 shrink-0 overflow-hidden flex items-center justify-center">
                        {artwork?.images?.[0] ? <img src={artwork.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={12} className="text-slate-300" />}
                      </div>
                      <span className="font-medium text-slate-800">{artwork?.title || "Unknown"}</span>
                    </div></td>
                    <td className="text-slate-600">{sale.buyer_name || "—"}</td>
                    <td className="font-medium">{sale.currency || "USD"} {price.toLocaleString()}</td>
                    <td className="text-slate-500">{sale.commission_percent ? `${sale.commission_percent}%` : "—"}</td>
                    <td className="font-medium text-emerald-600">${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="text-slate-500">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    <td><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle[sale.status] || "badge-available"}`}>{sale.status || "completed"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
