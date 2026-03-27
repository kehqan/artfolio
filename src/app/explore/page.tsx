"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowRight, MapPin, Palette, Sparkles, Building2 } from "lucide-react";

interface Artwork {
  id: string;
  title: string;
  images: string[] | null;
  price: number | null;
  currency: string | null;
  status: string;
  is_one_of_a_kind: boolean | null;
  medium: string | null;
  artist_id: string | null;
  artists?: { name: string; username: string; avatar_url: string | null } | null;
}

interface Artist {
  id: string;
  name: string;
  username: string;
  city: string;
  country: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  medium: string | null;
  style_tags: string[] | null;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
}

interface Exhibition {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  venue: string | null;
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-gray-500 hover:text-black flex items-center gap-1 transition-colors font-medium">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-2"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {children}
    </div>
  );
}

export default function ExplorePage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [artworksRes, artistsRes, venuesRes, exhibitionsRes] = await Promise.all([
        supabase
          .from("artworks")
          .select("id, title, images, price, currency, status, is_one_of_a_kind, medium, artist_id, artists(name, username, avatar_url)")
          .eq("status", "Available")
          .order("created_at", { ascending: false })
          .limit(14),
        supabase
          .from("artists")
          .select("id, name, username, city, country, avatar_url, cover_image_url, medium, style_tags")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("venues")
          .select("id, name, type, city, country, logo_url, cover_image_url, description")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("exhibitions")
          .select("id, title, start_date, end_date, cover_image, venue")
          .eq("is_public", true)
          .order("start_date", { ascending: false })
          .limit(6),
      ]);
      if (artworksRes.data) setArtworks(artworksRes.data as Artwork[]);
      if (artistsRes.data) setArtists(artistsRes.data as Artist[]);
      if (venuesRes.data) setVenues(venuesRes.data as Venue[]);
      if (exhibitionsRes.data) setExhibitions(exhibitionsRes.data as Exhibition[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">Artfolio</Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-black transition-colors">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm px-4 py-2">Join free</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 opacity-90" />
        <div className="relative px-6 py-20 text-center max-w-3xl mx-auto">
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mb-5">Welcome to Artfolio</p>
          <h1 className="text-5xl sm:text-6xl font-bold mb-5 leading-tight">
            Discover Art.<br />Find Your Space.
          </h1>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Explore original artworks, connect with artists, and find the venues that bring art to life.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/register?type=artist"
              className="bg-white text-black px-6 py-3 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
              <Palette className="w-4 h-4" /> Join as Artist
            </Link>
            <Link href="/register?type=venue"
              className="border border-white/30 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
              <Building2 className="w-4 h-4" /> List Your Venue
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-14 space-y-16">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Available Artworks */}
            {artworks.length > 0 && (
              <section>
                <SectionHeader title="Available Artworks" href="/discover" />
                <HScroll>
                  {artworks.map(a => (
                    <div key={a.id} className="flex-none w-52 group cursor-pointer">
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
                        {a.images?.[0] ? (
                          <img
                            src={a.images[0]}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Palette className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                        {a.is_one_of_a_kind && (
                          <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Unique
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                      {a.artists && (
                        <p className="text-xs text-gray-400 truncate">by {a.artists.name}</p>
                      )}
                      {a.price != null && (
                        <p className="text-sm font-semibold mt-1">
                          {a.currency || "EUR"} {a.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </HScroll>
              </section>
            )}

            {/* Artists to Follow */}
            {artists.length > 0 && (
              <section>
                <SectionHeader title="Artists to Follow" href="/discover" />
                <HScroll>
                  {artists.map(artist => (
                    <Link
                      key={artist.id}
                      href={`/artists/${artist.username}`}
                      className="flex-none w-40 group text-center"
                    >
                      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-100 mb-3 ring-2 ring-transparent group-hover:ring-black transition-all duration-200">
                        {artist.avatar_url ? (
                          <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-2xl font-bold text-gray-400">{artist.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm truncate">{artist.name}</p>
                      <p className="text-xs text-gray-400 truncate">{artist.city}, {artist.country}</p>
                      {artist.medium && (
                        <p className="text-xs text-gray-300 truncate mt-0.5">{artist.medium}</p>
                      )}
                    </Link>
                  ))}
                </HScroll>
              </section>
            )}

            {/* Venues */}
            {venues.length > 0 && (
              <section>
                <SectionHeader title="Venues & Spaces" href="/discover" />
                <HScroll>
                  {venues.map(venue => (
                    <Link
                      key={venue.id}
                      href={`/venues/${venue.id}`}
                      className="flex-none w-72 group"
                    >
                      <div className="relative h-44 rounded-2xl overflow-hidden bg-gray-100 mb-3">
                        {venue.cover_image_url ? (
                          <img
                            src={venue.cover_image_url}
                            alt={venue.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <span className="text-5xl font-bold text-white/50">{venue.name[0]}</span>
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                          {venue.type}
                        </span>
                      </div>
                      <h3 className="font-semibold">{venue.name}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {venue.city}, {venue.country}
                      </p>
                    </Link>
                  ))}
                </HScroll>
              </section>
            )}

            {/* Exhibitions */}
            {exhibitions.length > 0 && (
              <section>
                <SectionHeader title="Exhibitions" />
                <HScroll>
                  {exhibitions.map(ex => (
                    <div key={ex.id} className="flex-none w-72 group">
                      <div className="relative h-44 rounded-2xl overflow-hidden bg-gray-100 mb-3">
                        {ex.cover_image ? (
                          <img
                            src={ex.cover_image}
                            alt={ex.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <span className="text-white/20 text-5xl font-bold">{ex.title[0]}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{ex.title}</h3>
                      {ex.venue && <p className="text-xs text-gray-400 mt-0.5">{ex.venue}</p>}
                      {ex.start_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ex.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {ex.end_date && ` – ${new Date(ex.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </p>
                      )}
                    </div>
                  ))}
                </HScroll>
              </section>
            )}

            {/* CTA */}
            <section className="bg-gray-50 rounded-3xl px-8 py-16 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to be part of this?</h2>
              <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg">
                Whether you create, collect, or curate — Artfolio has a place for you.
              </p>
   (          <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/register?type=artist"
                  className="btn-primary px-7 py-3 flex items-center gap-2 text-base">
                  <Palette className="w-4 h-4" /> I&apos;m an Artist
                </Link>
                <Link href="/register?type=venue"
                  className="border border-gray-300 text-gray-700 px-7 py-3 rounded-xl font-medium text-base hover:border-black hover:text-black transition-colors flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> I have a venue
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
