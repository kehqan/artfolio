import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Globe, Instagram, Mail, Image as ImageIcon, Building2 } from "lucide-react";

export default async function VenueProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: venue } = await supabase.from("venues").select("*").eq("id", params.id).single();
  if (!venue) notFound();

  const { data: venueArtworks } = await supabase
    .from("venue_artworks")
    .select("artworks(*, artists(name, username))")
    .eq("venue_id", venue.id)
    .limit(20);

  const { data: discoveryRequests } = await supabase
    .from("discovery_requests")
    .select("*")
    .eq("venue_id", venue.id)
    .eq("status", "open")
    .limit(5);

  const artworks = (venueArtworks || []).map((va: any) => va.artworks).filter(Boolean);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-semibold text-stone-900 text-lg">Artfolio</Link>
        <Link href="/register" className="btn-primary text-sm py-2">Join Artfolio</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Venue header */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-12">
          {venue.cover_image_url && (
            <div className="w-full h-48 sm:hidden rounded-2xl overflow-hidden bg-stone-100 mb-4">
              <img src={venue.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {venue.logo_url
            ? <img src={venue.logo_url} alt="" className="w-24 h-24 rounded-2xl object-cover border border-stone-200 shrink-0" />
            : <div className="w-24 h-24 rounded-2xl bg-stone-200 flex items-center justify-center shrink-0"><Building2 className="w-10 h-10 text-stone-400" /></div>}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-3xl font-semibold text-stone-900">{venue.name}</h1>
              <span className="badge badge-storage capitalize">{venue.type}</span>
            </div>
            {(venue.city || venue.country) && (
              <div className="flex items-center gap-1.5 text-sm text-stone-500 mb-3">
                <MapPin className="w-3.5 h-3.5" />{[venue.city, venue.country].filter(Boolean).join(", ")}
              </div>
            )}
            {venue.description && <p className="text-stone-600 max-w-xl leading-relaxed mb-4">{venue.description}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2"><Globe className="w-3.5 h-3.5" /> Website</a>}
              {venue.instagram && <a href={`https://instagram.com/${venue.instagram}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
              {venue.contact_email && <a href={`mailto:${venue.contact_email}`} className="btn-secondary text-sm py-2"><Mail className="w-3.5 h-3.5" /> Contact</a>}
            </div>
          </div>
        </div>

        {/* Discovery Requests */}
        {discoveryRequests && discoveryRequests.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl font-semibold mb-4">Looking For</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {discoveryRequests.map((dr) => (
                <div key={dr.id} className="card p-5">
                  <h3 className="font-semibold text-stone-900 mb-1">{dr.title}</h3>
                  {dr.description && <p className="text-sm text-stone-600 mb-3">{dr.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {dr.budget_min && <span className="text-xs text-stone-500">Budget: ${dr.budget_min}–${dr.budget_max}</span>}
                    {dr.deadline && <span className="text-xs text-stone-400">Until: {new Date(dr.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Artworks on display */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-6">On Display</h2>
          {artworks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artworks.map((a: any) => (
                <div key={a.id} className="card-hover overflow-hidden group">
                  <div className="aspect-square bg-stone-100">
                    {a.images?.[0]
                      ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                    {a.artists?.name && (
                      <Link href={`/artist/${a.artists.username}`} className="text-xs text-emerald-600 hover:underline">{a.artists.name}</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center text-stone-400">No artworks on display</div>
          )}
        </section>
      </div>
    </div>
  );
}
