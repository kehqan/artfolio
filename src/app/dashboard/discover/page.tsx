"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, UserCheck, UserPlus, MapPin, ArrowRight, Palette, Building2 } from "lucide-react";

type Profile = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; follower_count?: number; is_following?: boolean;
};

export default function DiscoverPage() {
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "artist" | "gallery">("all");
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); loadProfiles(user.id); }
    });
  }, []);

  async function loadProfiles(currentUserId: string) {
    const supabase = createClient();
    const { data: profilesData } = await supabase
      .from("profiles").select("id, full_name, username, role, bio, location, avatar_url")
      .neq("id", currentUserId).limit(50);
    if (!profilesData) { setLoading(false); return; }
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId);
    const followingIds = new Set(follows?.map(f => f.following_id) || []);
    const enriched = await Promise.all(profilesData.map(async p => {
      const [{ count: artwork_count }, { count: follower_count }] = await Promise.all([
        supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
      ]);
      return { ...p, artwork_count: artwork_count || 0, follower_count: follower_count || 0, is_following: followingIds.has(p.id) };
    }));
    setProfiles(enriched);
    setLoading(false);
  }

  async function toggleFollow(targetId: string) {
    if (!userId) return;
    setFollowLoading(targetId);
    const supabase = createClient();
    const profile = profiles.find(p => p.id === targetId);
    if (profile?.is_following) {
      await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
    }
    setProfiles(prev => prev.map(p => p.id === targetId ? {
      ...p, is_following: !p.is_following,
      follower_count: (p.follower_count || 0) + (p.is_following ? -1 : 1)
    } : p));
    setFollowLoading(null);
  }

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.username?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.role?.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Discover</h1>
        <p className="page-subtitle">Find and connect with artists and galleries</p>
      </div>

      {/* Directory CTAs */}
      <div className="grid grid-cols-2 gap-0 mb-6 border-2 border-black" style={{ boxShadow: "3px 3px 0 #111110" }}>
        <Link href="/directory/artists"
          className="flex items-center justify-between px-5 py-4 bg-black text-[#FFD400] border-r-2 border-black hover:bg-stone-900 transition-colors group">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FFD400]/40 mb-0.5">Browse all</p>
              <p className="font-black text-sm">Artists Directory</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/directory/venues"
          className="flex items-center justify-between px-5 py-4 bg-[#FFD400] hover:bg-yellow-300 transition-colors group">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-black" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">Browse all</p>
              <p className="font-black text-sm text-black">Venues Directory</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="input pl-9" />
        </div>
        <div className="flex rounded-xl border border-stone-200 overflow-hidden">
          {(["all","artist","gallery"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${filter === f ? "bg-stone-900 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center"><p className="text-stone-400">No artists found</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card-hover p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                {p.avatar_url
                  ? <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-lg shrink-0">{p.full_name?.[0] || "A"}</div>}
                <div className="min-w-0">
                  <Link href={p.username ? `/profile/${p.username}` : "#"} className="font-semibold text-stone-900 hover:underline text-sm truncate block">
                    {p.full_name}
                  </Link>
                  <span className={`badge capitalize mt-0.5 ${p.role === "gallery" ? "badge-storage" : "badge-available"}`}>
                    {p.role || "artist"}
                  </span>
                </div>
              </div>
              {p.location && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
                  <MapPin className="w-3 h-3" /> {p.location}
                </div>
              )}
              {p.bio && <p className="text-xs text-stone-600 line-clamp-2 mb-3 flex-1">{p.bio}</p>}
              <div className="flex items-center justify-between text-xs text-stone-500 mb-4 mt-auto">
                <span>{p.artwork_count} works</span>
                <span>{p.follower_count} followers</span>
              </div>
              <button onClick={() => toggleFollow(p.id)} disabled={followLoading === p.id}
                className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${p.is_following ? "bg-stone-100 text-stone-700 hover:bg-rose-50 hover:text-rose-600" : "bg-stone-900 text-white hover:bg-stone-800"}`}>
                {followLoading === p.id ? "…" : p.is_following
                  ? <span className="flex items-center justify-center gap-2"><UserCheck className="w-4 h-4" /> Following</span>
                  : <span className="flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Follow</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
