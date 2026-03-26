import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, MapPin, ExternalLink, Mail, FolderOpen, Image as ImageIcon, Palette, Building2 } from "lucide-react";
import type { Metadata } from "next";

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, bio, role").eq("username", params.username).single();
  if (!profile) return { title: "Not Found" };
  return {
    title: `${profile.full_name} — Artfolio`,
    description: profile.bio || `${profile.role === "gallery" ? "Gallery" : "Artist"} portfolio on Artfolio`,
  };
}

export default async function PortfolioPage({ params }: Props) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("username", params.username).single();
  if (!profile) notFound();

  // Get artworks
  const { data: artworks } = await supabase
    .from("artworks").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });

  // Get public collections with artwork previews
  const { data: collections } = await supabase
    .from("collections").select("*").eq("user_id", profile.id).eq("is_public", true).order("created_at", { ascending: false });

  const enrichedCollections = await Promise.all(
    (collections || []).map(async (col) => {
      const { data: links } = await supabase
        .from("collection_artworks")
        .select("artworks(images)")
        .eq("collection_id", col.id)
        .limit(4);
      const count = links?.length || 0;
      const previews = (links || []).map((l: any) => l.artworks?.images?.[0]).filter(Boolean);
      return { ...col, count, previews };
    })
  );

  const items = artworks || [];
  const statusColors: Record<string, string> = {
    available: "bg-emerald-50 text-emerald-600 border-emerald-200",
    sold: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <nav className="border-b border-slate-150 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-slate-900 flex items-center justify-center">
              <span className="font-display text-white text-sm leading-none">A</span>
            </div>
            <span className="font-display text-base text-slate-900 group-hover:text-brand-600 transition-colors">Artfolio</span>
          </Link>
          <Link href="/register" className="btn-primary !py-2 !px-4 text-xs">Join Artfolio</Link>
        </div>
      </nav>

      {/* Profile Header */}
      <header className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : profile.role === "gallery" ? (
              <Building2 size={32} className="text-slate-400" strokeWidth={1} />
            ) : (
              <Palette size={32} className="text-slate-400" strokeWidth={1} />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                {profile.role === "gallery" ? "Gallery" : "Artist"}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-slate-900">{profile.full_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-9000">
              {profile.location && <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.location}</span>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand-600 transition-colors">
                  <Globe size={14} />{profile.website.replace(/^https?:\/\//, "")}<ExternalLink size={10} />
                </a>
              )}
            </div>
            {profile.bio && <p className="text-slate-500 mt-4 max-w-xl leading-relaxed">{profile.bio}</p>}
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <div><p className="font-display text-2xl text-slate-900">{items.length}</p><p className="text-xs text-slate-9000">Artworks</p></div>
            <div><p className="font-display text-2xl text-slate-900">{enrichedCollections.length}</p><p className="text-xs text-slate-9000">Collections</p></div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* Collections */}
        {enrichedCollections.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-6 pb-3 border-b border-slate-150 flex items-center gap-2">
              <FolderOpen size={14} /> Collections
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedCollections.map((col) => (
                <div key={col.id} className="border border-slate-150 bg-slate-50">
                  <div className="aspect-[3/2] bg-slate-50 overflow-hidden">
                    {col.previews.length > 0 ? (
                      <div className="grid grid-cols-2 h-full gap-px bg-slate-100">
                        {col.previews.slice(0, 4).map((img: string, i: number) => (
                          <div key={i} className="bg-slate-50 overflow-hidden">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {col.previews.length < 4 && [...Array(4 - col.previews.length)].map((_, i) => (
                          <div key={`e-${i}`} className="bg-slate-50" />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FolderOpen size={28} className="text-slate-300" strokeWidth={1} /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base text-slate-800">{col.title}</h3>
                    <p className="text-xs text-slate-9000 mt-1">{col.count} artwork{col.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Artworks */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-6 pb-3 border-b border-slate-150 flex items-center gap-2">
            <ImageIcon size={14} /> Artworks
          </h2>
          {items.length === 0 ? (
            <div className="border border-slate-150 bg-slate-50 p-16 text-center">
              <p className="text-slate-9000">No artworks to show yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((artwork: any) => (
                <div key={artwork.id} className="group border border-slate-150 bg-slate-50">
                  <div className="aspect-square bg-slate-50 overflow-hidden relative">
                    {artwork.images?.[0] ? (
                      <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" strokeWidth={1} /></div>
                    )}
                    {artwork.status === "sold" && (
                      <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 border bg-red-50 text-red-600 border-red-200">Sold</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-display text-sm text-slate-800 truncate">{artwork.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-9000">
                      {artwork.medium && <span className="truncate">{artwork.medium}</span>}
                      {artwork.year && <span>{artwork.year}</span>}
                    </div>
                    {artwork.price != null && artwork.status === "available" && (
                      <p className="text-xs text-slate-500 mt-1">{artwork.currency} {parseFloat(artwork.price).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-150 py-8 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-500 transition-colors">
          Powered by Artfolio
        </Link>
      </footer>
    </div>
  );
}
