"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Image as ImageIcon, Building2, MessageSquare,
  LayoutGrid, Handshake, ChevronLeft, ChevronRight, MapPin, Palette
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Artwork = { id: string; title: string; images?: string[]; price?: number; status: string; artist_name?: string; artist_username?: string };
type Venue = { id: string; name: string; type: string; city?: string; logo_url?: string; cover_image_url?: string };
type Post = { id: string; content?: string; images?: string[]; profile_name?: string; profile_avatar?: string };
type Exhibition = { id: string; title: string; venue?: string; start_date?: string; cover_image?: string; status: string };
type Collab = { id: string; title: string; type?: string; partner_name?: string; status: string };

function Carousel({ title, icon: Icon, children, linkHref, linkLabel }: {
  title: string; icon: React.ElementType;
  children: React.ReactNode; linkHref?: string; linkLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => {
    ref.current?.scrollBy({ left: dir === "l" ? -320 : 320, behavior: "smooth" });
  };
  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-5 px-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-display text-xl font-semibold text-stone-900">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll("l")} className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors shadow-sm">
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
          <button onClick={() => scroll("r")} className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors shadow-sm">
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
          {linkHref && (
            <Link href={linkHref} className="ml-2 text-sm text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              {linkLabel || "See all"} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </section>
  );
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <div className="shrink-0 w-52 group">
      <div className="w-52 h-52 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        {artwork.images?.[0]
          ? <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-stone-300" /></div>}
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{artwork.title}</p>
      {artwork.artist_name && (
        <p className="text-xs text-stone-500 truncate">{artwork.artist_name}</p>
      )}
      {artwork.price && (
        <p className="text-xs font-mono text-emerald-600 mt-0.5">${artwork.price.toLocaleString()}</p>
      )}
    </div>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link href={`/venue/${venue.id}`} className="shrink-0 w-64 group block">
      <div className="w-64 h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow relative">
        {venue.cover_image_url
          ? <img src={venue.cover_image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-10 h-10 text-stone-300" /></div>}
        {venue.logo_url && (
          <img src={venue.logo_url} alt="" className="absolute bottom-3 left-3 w-10 h-10 rounded-xl object-cover border-2 border-white shadow" />
        )}
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{venue.name}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-xs text-stone-400 capitalize">{venue.type}</span>
        {venue.city && <>
          <span className="text-stone-300">·</span>
          <span className="text-xs text-stone-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{venue.city}</span>
        </>}
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <div className="shrink-0 w-60 group">
      <div className="w-60 h-40 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        {post.images?.[0]
          ? <img src={post.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 p-4">
              <p className="text-xs text-stone-500 line-clamp-4">{post.content}</p>
            </div>}
      </div>
      {post.profile_name && (
        <div className="flex items-center gap-2">
          {post.profile_avatar
            ? <img src={post.profile_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">{post.profile_name[0]}</div>}
          <p className="text-xs font-medium text-stone-700 truncate">{post.profile_name}</p>
        </div>
      )}
    </div>
  );
}

function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <div className="shrink-0 w-56 group">
      <div className="w-56 h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow relative">
        {exhibition.cover_image
          ? <img src={exhibition.cover_image} alt={exhibition.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><LayoutGrid className="w-10 h-10 text-stone-300" /></div>}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          exhibition.status === "Current" || exhibition.status === "current" ? "bg-emerald-500 text-white" :
          exhibition.status === "Upcoming" || exhibition.status === "upcoming" ? "bg-sky-500 text-white" : "bg-stone-300 text-stone-700"
        }`}>{exhibition.status}</span>
      </div>
      <p className="font-semibold text-stone-900 text-sm truncate">{exhibition.title}</p>
      {exhibition.venue && <p className="text-xs text-stone-500 truncate">{exhibition.venue}</p>}
      {exhibition.start_date && (
        <p className="text-xs text-stone-400 mt-0.5">{new Date(exhibition.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      )}
    </div>
  );
}

function CollabCard({ collab }: { collab: Collab }) {
  return (
    <div className="shrink-0 w-56 group">
      <div className="w-56 h-28 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 mb-3 shadow-sm group-hover:shadow-md transition-shadow flex flex-col items-start justify-end p-4">
        {collab.type && <span className="text-[10px] font-bold uppercase text-stone-400 mb-1">{collab.type}</span>}
        <p className="font-semibold text-white text-sm line-clamp-2">{collab.title}</p>
      </div>
      {collab.partner_name && <p className="text-xs text-stone-500">With: {collab.partner_name}</p>}
      <span className={`badge text-[10px] mt-1 ${collab.status === "Open" ? "badge-available" : "badge-nfs"}`}>{collab.status}</span>
    </div>
  );
}

export default function ExploreLandingPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [
        { data: rawArtworks },
        { data: rawArtists },
        { data: rawVenues },
        { data: rawPosts },
        { data: rawProfiles },
        { data: rawExhibitions },
        { data: rawCollabs },
      ] = await Promise.all([
        supabase.from("artworks").select("id, title, images, price, status, artist_id").eq("status", "Available").limit(20),
        supabase.from("artists").select("id, name, username").limit(100),
        supabase.from("venues").select("id, name, type, city, logo_url, cover_image_url").limit(12),
        supabase.from("posts").select("id, content, images, user_id").order("created_at", { ascending: false }).limit(12),
        supabase.from("profiles").select("id, full_name, avatar_url").limit(200),
        supabase.from("exhibitions").select("id, title, venue, start_date, cover_image, status").in("status", ["Current", "Upcoming", "current", "upcoming"]).limit(12),
        supabase.from("collaborations").select("id, title, type, partner_name, status").eq("status", "Open").limit(12),
      ]);

      const artistMap: Record<string, { name: string; username: string }> = {};
      for (const a of rawArtists || []) artistMap[a.id] = { name: a.name, username: a.username };

      const profileMap: Record<string, { name: string; avatar?: string }> = {};
      for (const p of rawProfiles || []) profileMap[p.id] = { name: p.full_name, avatar: p.avatar_url };

      setArtworks((rawArtworks || []).map((a) => ({
        id: a.id, title: a.title, images: a.images, price: a.price, status: a.status,
        artist_name: a.artist_id ? artistMap[a.artist_id]?.name : undefined,
        artist_username: a.artist_id ? artistMap[a.artist_id]?.username : undefined,
      })));

      setVenues((rawVenues || []).map((v) => ({ id: v.id, name: v.name, type: v.type, city: v.city, logo_url: v.logo_url, cover_image_url: v.cover_image_url })));

      setPosts((rawPosts || []).map((p) => ({
        id: p.id, content: p.content, images: p.images,
        profile_name: profileMap[p.user_id]?.name,
        profile_avatar: profileMap[p.user_id]?.avatar,
      })));

      setExhibitions((rawExhibitions || []).map((e) => ({ id: e.id, title: e.title, venue: e.venue, start_date: e.start_date, cover_image: e.cover_image, status: e.status })));
      setCollabs((rawCollabs || []).map((c) => ({ id: c.id, title: c.title, type: c.type, partner_name: c.partner_name, status: c.status })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-stone-900 text-lg">Artfolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm py-2">Join free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-stone-900 text-white px-4 md:px-8 py-20 mb-12">
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-6 gap-1 h-full">
            {artworks.slice(0, 12).map((a) => a.images?.[0] && (
              <div key={a.id} className="overflow-hidden">
                <img src={a.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="relative max-w-xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
            Where art finds its audience
          </h1>
          <p className="text-stone-300 text-lg mb-8">
            Discover works by emerging artists, explore venues across Iran, and connect with the art community.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/register" className="btn-accent px-6 py-3 text-base">
              Join as Artist or Venue <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-stone-400 text-sm">No account needed to explore ↓</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-stone-400">Loading...</div>
        </div>
      ) : (
        <div className="py-4">
          {/* Top Artworks */}
          {artworks.length > 0 && (
            <Carousel title="Top Picks" icon={ImageIcon} linkHref="/dashboard/explore" linkLabel="See all artworks">
              {artworks.map((a) => <ArtworkCard key={a.id} artwork={a} />)}
            </Carousel>
          )}

          {/* Popular Venues */}
          {venues.length > 0 && (
            <Carousel title="Popular Venues" icon={Building2} linkHref="/dashboard/explore" linkLabel="All venues">
              {venues.map((v) => <VenueCard key={v.id} venue={v} />)}
            </Carousel>
          )}

          {/* Community Feed */}
          {posts.length > 0 && (
            <Carousel title="From the Community" icon={MessageSquare}>
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </Carousel>
          )}

          {/* Exhibitions */}
          {exhibitions.length > 0 && (
            <Carousel title="Upcoming & Current Exhibitions" icon={LayoutGrid}>
              {exhibitions.map((e) => <ExhibitionCard key={e.id} exhibition={e} />)}
            </Carousel>
          )}

          {/* Collaborations */}
          {collabs.length > 0 && (
            <Carousel title="Open Collaborations" icon={Handshake}>
              {collabs.map((c) => <CollabCard key={c.id} collab={c} />)}
            </Carousel>
          )}

          {/* Empty state */}
          {artworks.length === 0 && venues.length === 0 && (
            <div className="text-center py-20 px-4">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <Palette className="w-10 h-10 text-stone-300" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-stone-900 mb-2">Be the first</h2>
              <p className="text-stone-500 mb-8">No content yet — join as an artist or venue to get started.</p>
              <Link href="/register" className="btn-primary px-8 py-3">Join Artfolio</Link>
            </div>
          )}

          {/* CTA footer */}
          <div className="mx-4 md:mx-8 mt-8 mb-12 rounded-3xl bg-stone-900 text-white px-8 py-12 text-center">
            <h2 className="font-display text-3xl font-bold mb-3">Ready to share your work?</h2>
            <p className="text-stone-400 mb-6 max-w-md mx-auto">Join artists and venues already using Artfolio to connect and grow.</p>
            <Link href="/register" className="btn-accent px-8 py-3 text-base inline-flex items-center gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
