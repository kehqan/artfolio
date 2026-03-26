import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await supabase.from("posts").select("*, profiles(full_name, username, avatar_url, role)").order("created_at", { ascending: false }).limit(50);

  return (
    <div className="max-w-2xl">
      <h1 className="heading-md mb-6">Feed</h1>
      <CreatePost userId={user.id} />
      <div className="mt-6 space-y-4">
        {(!posts || posts.length === 0) ? (
          <div className="card p-12 text-center"><p className="text-slate-400">No posts yet. Be the first to share something!</p></div>
        ) : posts.map((post: any) => <PostCard key={post.id} post={post} currentUserId={user.id} />)}
      </div>
    </div>
  );
}
