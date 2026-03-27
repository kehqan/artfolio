import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, MapPin, Image as ImageIcon } from "lucide-react";

export default async function PublicPortfolioPage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", params.username).single();
  if (!profile) notFound();

  const [{ data: artworks }, { data: collections }] = await Promise.all([
    supabase.from("artworks").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("collections").select("*, collection_artworks(artwork_id, artworks(images))").eq("user_id", profile.id).eq("is_public", true),
  ]);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-semibold text-stone-900 text-lg">Artfolio</Link>
        <Link href="/register" className="btn-primary text-sm py-2">Join Artfolio</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-16">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-stone-200 shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center text-4xl font-bold text-stone-400 shrink-0">
              {profile.full_name?.[0] || "A"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-3xl font-semibold text-stone-900">{profile.full_name}</h1>
              <span className="badge badge-available capitalize">{profile.role || "artist"}</span>
            </div>
            {profile.location && (
              <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-2">
                <MapPin className="w-4 h-4" /> {profile.location}
              </div>
            )}
            {profile.bio && <p className="text-stone-600 max-w-xl">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-600 text-sm mt-2 hover:underline">
                <Globe className="w-4 h-4" /> {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* Collections */}
        {collections && collections.length > 0 && (
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold mb-6">Collections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map((c: any) => {
                const imgs = c.collection_artworks?.flatMap((ca: any) => ca.artworks?.images?.slice(0, 1) || []) || [];
                return (
                  <div key={c.id} className="card overflow-hidden">
                    <div className={`h-28 bg-stone-100 grid ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {imgs.length > 0 ? imgs.slice(0, 4).map((img: string, i: number) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                      )) : <div className="flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-stone-900 text-sm">{c.name}</p>
                      {c.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{c.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Artworks */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-6">Works</h2>
          {artworks && artworks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artworks.map((a) => (
                <div key={a.id} className="card-hover overflow-hidden group">
                  <div className="aspect-square bg-stone-100">
                    {a.images?.[0] ? (
                      <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`badge text-[10px] ${a.status?.toLowerCase() === "available" ? "badge-available" : "badge-nfs"}`}>
                        {a.status}
                      </span>
                      {a.price && a.status?.toLowerCase() === "available" && (
                        <span className="text-xs font-mono text-stone-500">${a.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center text-stone-400">No artworks yet</div>
          )}
        </section>
      </div>
    </div>
  );
}
