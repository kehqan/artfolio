import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Palette, Building2, MapPin, UserPlus } from "lucide-react";
import FollowButton from "./FollowButton";

export default async function DiscoverPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all profiles except current user
  const { data: profiles } = await supabase.from("profiles").select("*").neq("id", user.id).order("created_at", { ascending: false });

  // Get who I follow
  const { data: following } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
  const followingIds = new Set((following || []).map((f: any) => f.following_id));

  // Get follower counts
  const { data: followerCounts } = await supabase.from("followers").select("following_id");
  const countMap: Record<string, number> = {};
  (followerCounts || []).forEach((f: any) => { countMap[f.following_id] = (countMap[f.following_id] || 0) + 1; });

  // Get artwork counts
  const { data: artworkCounts } = await supabase.from("artworks").select("user_id");
  const artworkMap: Record<string, number> = {};
  (artworkCounts || []).forEach((a: any) => { artworkMap[a.user_id] = (artworkMap[a.user_id] || 0) + 1; });

  // Get my followers count & following count
  const { count: myFollowers } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id);
  const { count: myFollowing } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="heading-md">Discover</h1><p className="text-sm text-slate-500 mt-1">Find and follow artists and galleries</p></div>
        <div className="flex gap-4 text-center">
          <div className="card px-4 py-2"><p className="text-lg font-semibold text-slate-800">{myFollowers || 0}</p><p className="text-[10px] text-slate-400 uppercase tracking-wide">Followers</p></div>
          <div className="card px-4 py-2"><p className="text-lg font-semibold text-slate-800">{myFollowing || 0}</p><p className="text-[10px] text-slate-400 uppercase tracking-wide">Following</p></div>
        </div>
      </div>

      {(!profiles || profiles.length === 0) ? (
        <div className="card p-16 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-slate-600">No one to discover yet</h2>
          <p className="text-sm text-slate-400 mt-2">You&apos;re the first one here! More artists and galleries will join soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile: any) => (
            <div key={profile.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-150 flex items-center justify-center shrink-0 overflow-hidden">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> :
                    profile.role === "gallery" ? <Building2 size={18} className="text-slate-400" /> : <Palette size={18} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={profile.username ? `/portfolio/${profile.username}` : "#"} className="font-medium text-slate-800 hover:text-brand-600 transition-colors truncate">
                      {profile.full_name || "Unnamed"}
                    </Link>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{profile.role}</span>
                  </div>
                  {profile.location && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{profile.location}</p>}
                  {profile.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{profile.bio}</p>}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>{artworkMap[profile.id] || 0} artworks</span>
                    <span>{countMap[profile.id] || 0} followers</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <FollowButton profileId={profile.id} currentUserId={user.id} isFollowing={followingIds.has(profile.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
