"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({ profileId, currentUserId, isFollowing: initial }: { profileId: string; currentUserId: string; isFollowing: boolean }) {
  const [following, setFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    if (following) {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setFollowing(false);
    } else {
      await supabase.from("followers").insert({ follower_id: currentUserId, following_id: profileId });
      setFollowing(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
        following ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600" : "bg-slate-900 text-white hover:bg-slate-800"
      }`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
    </button>
  );
}
