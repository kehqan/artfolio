import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Globe, Instagram, Mail, Image as ImageIcon } from "lucide-react";

export default async function ArtistProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: artist } = await supabase.from("artists").select("*").eq("username", params.username).single();
  if (!artist) notFound();

  const { data: artworks } = await supabase.from("artworks").select("*").eq("artist_id", artist.id).order("created_at", { ascending: false });
  const { count: followerCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("target_type", "artist").eq("target_id", artist.id);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-semibold text-stone-900 text-lg">Artfolio</Link>
        <Link href="/register" className="btn-primary text-sm py-2">Join Artfolio</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-16">
          {artist.avatar_url
            ? <img src={artist.avatar_url} alt="" className="w-28 h-28 rounded-2xl object-cover border border-stone-200 shrink-0" />
            : <div className="w-28 h-28 rounded-2xl bg-stone-200 flex items-center justify-center text-5xl font-bold text-stone-400 shrink-0">{artist.name?.[0]}</div>}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold text-stone-900 mb-2">{artist.name}</h1>
            <div className="flex items-center gap-4 flex-wrap text-sm text-stone-500 mb-3">
              {artist.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{artist.city}, {artist.country}</span>}
              {artist.medium && <span className="text-stone-400">·</span>}
              {artist.medium && <span>{artist.medium}</span>}
              <span className="text-stone-400">·</span>
              <span>{followerCount || 0} followers</span>
            </div>
            {artist.bio && <p className="text-stone-600 max-w-xl leading-relaxed mb-4">{artist.bio}</p>}
            <div className="flex items-center gap-3">
              {artist.website && <a href={artist.website} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2"><Globe className="w-3.5 h-3.5" /> Website</a>}
              {artist.instagram && <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
              {artist.contact_email && <a href={`mailto:${artist.contact_email}`} className="btn-secondary text-sm py-2"><Mail className="w-3.5 h-3.5" /> Contact</a>}
            </div>
          </div>
        </div>

        {/* Artworks */}
        <h2 className="font-display text-2xl font-semibold mb-6">Works</h2>
        {artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((a) => (
              <div key={a.id} className="card-hover overflow-hidden group">
                <div className="aspect-square bg-stone-100">
                  {a.images?.[0]
                    ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`badge text-[10px] ${a.status?.toLowerCase() === "available" ? "badge-available" : "badge-nfs"}`}>{a.status}</span>
                    {a.price && a.status?.toLowerCase() === "available" && <span className="text-xs font-mono text-stone-500">${Number(a.price).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-stone-400">No artworks yet</div>
        )}
      </div>
    </div>
  );
}
