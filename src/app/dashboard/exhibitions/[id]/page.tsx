import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Calendar, MapPin, Image as ImageIcon, PlusCircle, Trash2 } from "lucide-react";
import ExhibitionActions from "./ExhibitionActions";

interface Props { params: { id: string } }

export default async function ExhibitionDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: exhibition } = await supabase.from("exhibitions").select("*").eq("id", params.id).eq("user_id", user.id).single();
  if (!exhibition) notFound();

  const { data: links } = await supabase.from("exhibition_artworks").select("artwork_id, artworks(*)").eq("exhibition_id", params.id).order("sort_order");
  const artworks = (links || []).map((l: any) => l.artworks).filter(Boolean);

  const inIds = artworks.map((a: any) => a.id);
  let availQ = supabase.from("artworks").select("id, title, images, medium, year").eq("user_id", user.id).order("created_at", { ascending: false });
  if (inIds.length > 0) availQ = availQ.not("id", "in", `(${inIds.join(",")})`);
  const { data: available } = await availQ;

  const dateRange = [
    exhibition.start_date && new Date(exhibition.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    exhibition.end_date && new Date(exhibition.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  ].filter(Boolean).join(" — ");

  return (
    <div>
      <Link href="/dashboard/exhibitions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"><ArrowLeft size={14} /> Back to Exhibitions</Link>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="heading-md">{exhibition.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
            {exhibition.venue && <span className="flex items-center gap-1.5"><MapPin size={14} />{exhibition.venue}</span>}
            {dateRange && <span className="flex items-center gap-1.5"><Calendar size={14} />{dateRange}</span>}
          </div>
          {exhibition.description && <p className="text-slate-500 mt-3 max-w-xl">{exhibition.description}</p>}
        </div>
        <Link href={`/dashboard/exhibitions/${exhibition.id}/edit`} className="btn-secondary"><Pencil size={14} /> Edit</Link>
      </div>
      <ExhibitionActions exhibitionId={exhibition.id} available={available || []} />
      {artworks.length === 0 ? (
        <div className="card p-12 text-center mt-4"><ImageIcon size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1} /><p className="text-slate-500">No artworks added yet. Use the button above to add artworks.</p></div>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {artworks.map((a: any) => (
            <Link key={a.id} href={`/dashboard/artworks/${a.id}`} className="card-hover group overflow-hidden">
              <div className="aspect-square bg-slate-75 overflow-hidden">
                {a.images?.[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} className="text-slate-300" /></div>}
              </div>
              <div className="p-3"><h3 className="text-sm font-medium text-slate-800 truncate">{a.title}</h3><p className="text-xs text-slate-400 mt-0.5">{a.medium}</p></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
