"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, Image as ImageIcon } from "lucide-react";

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  price?: number; status: string; images?: string[];
  artists?: { name: string; username: string; city?: string } | null;
};

type Artist = { id: string; name: string; username: string; city?: string; avatar_url?: string; medium?: string };
type Venue = { id: string; name: string; type: string; city?: string; logo_url?: string };

type Tab = "artworks" | "artists" | "venues";

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("artworks");
  const [search, setSearch] = useState("");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const [{ data: aw }, { data: ar }, { data: ve }] = await Promise.all([
      supabase.from("artworks").select("id, title, medium, year, price, status, images, artists(name, username, city)").eq("status", "Available").limit(50),
      supabase.from("artists").select("id, name, username, city, avatar_url, medium").limit(50),
      supabase.from("venues").select("id, name, type, city, logo_url").limit(50),
    ]);
    setArtworks((aw as unknown as Artwork[]) || []);
    setArtists(ar || []);
    setVenues(ve || []);
    setLoading(false);
  }

  const filteredArtworks = artworks.filter((a) =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.medium?.toLowerCase().includes(search.toLowerCase()) ||
    (a.artists as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredArtists = artists.filter((a) =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredVenues = venues.filter((v) =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Explore</h1>
        <p className="page-subtitle">Discover artworks, artists, and venues</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search artworks, artists, venues..." className="input pl-9" />
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-stone-200 overflow-hidden w-fit mb-6">
        {(["artworks", "artists", "venues"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "bg-stone-900 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">Loading...</div>
      ) : tab === "artworks" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredArtworks.map((a) => (
            <div key={a.id} className="card-hover overflow-hidden group">
              <div className="aspect-square bg-stone-100">
                {a.images?.[0]
                  ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                {(a.artists as any)?.name && (
                  <Link href={`/artist/${(a.artists as any).username}`} className="text-xs text-emerald-600 hover:underline">
                    {(a.artists as any).name}
                  </Link>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="badge badge-available text-[10px]">{a.status}</span>
                  {a.price && <span className="text-xs font-mono text-stone-500">${a.price.toLocaleString()}</span>}
                </div>
              </div>
            </div>
          ))}
          {filteredArtworks.length === 0 && <div className="col-span-full card p-12 text-center text-stone-400">No artworks found</div>}
        </div>
      ) : tab === "artists" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArtists.map((a) => (
            <Link key={a.id} href={`/artist/${a.username}`} className="card-hover p-5 flex items-center gap-4">
              {a.avatar_url
                ? <img src={a.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-lg shrink-0">{a.name?.[0]}</div>}
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 truncate">{a.name}</p>
                {a.city && <p className="text-xs text-stone-500">{a.city}</p>}
                {a.medium && <p className="text-xs text-stone-400 truncate">{a.medium}</p>}
              </div>
            </Link>
          ))}
          {filteredArtists.length === 0 && <div className="col-span-full card p-12 text-center text-stone-400">No artists found</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map((v) => (
            <Link key={v.id} href={`/venue/${v.id}`} className="card-hover p-5 flex items-center gap-4">
              {v.logo_url
                ? <img src={v.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-lg shrink-0">{v.name?.[0]}</div>}
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 truncate">{v.name}</p>
                <p className="text-xs text-stone-500 capitalize">{v.type}</p>
                {v.city && <p className="text-xs text-stone-400">{v.city}</p>}
              </div>
            </Link>
          ))}
          {filteredVenues.length === 0 && <div className="col-span-full card p-12 text-center text-stone-400">No venues found</div>}
        </div>
      )}
    </div>
  );
}
