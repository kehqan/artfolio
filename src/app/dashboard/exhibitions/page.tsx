import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Calendar, MapPin, Image as ImageIcon } from "lucide-react";

const statusStyle: Record<string, string> = {
  current: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upcoming: "bg-blue-50 text-blue-600 border-blue-200",
  past: "bg-slate-75 text-slate-500 border-slate-200",
  planning: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function ExhibitionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: exhibitions } = await supabase
    .from("exhibitions").select("*, exhibition_artworks(count)").eq("user_id", user.id).order("start_date", { ascending: false });
  const items = exhibitions || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="heading-md">Exhibitions</h1><p className="text-sm text-slate-500 mt-1">Manage your shows and exhibitions</p></div>
        <Link href="/dashboard/exhibitions/new" className="btn-primary"><PlusCircle size={16} /> New Exhibition</Link>
      </div>
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <Calendar size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">No exhibitions yet</h2>
          <p className="text-sm text-slate-400 mt-2">Plan and manage your exhibitions and shows.</p>
          <Link href="/dashboard/exhibitions/new" className="btn-primary mt-6 inline-flex"><PlusCircle size={16} /> Create Exhibition</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((ex: any) => {
            const artworkCount = ex.exhibition_artworks?.[0]?.count || 0;
            const status = ex.status || "planning";
            return (
              <Link key={ex.id} href={`/dashboard/exhibitions/${ex.id}`} className="card-hover overflow-hidden group">
                <div className="aspect-[2/1] bg-slate-75 overflow-hidden relative">
                  {ex.cover_image ? (
                    <img src={ex.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Calendar size={28} className="text-slate-300" strokeWidth={1} /></div>
                  )}
                  <span className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusStyle[status]}`}>{status}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{ex.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    {ex.venue && <span className="flex items-center gap-1"><MapPin size={11} />{ex.venue}</span>}
                    {ex.start_date && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(ex.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{artworkCount} artwork{artworkCount !== 1 ? "s" : ""}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
