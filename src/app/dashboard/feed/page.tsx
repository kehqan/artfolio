import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all posts with profile info
  const { data: posts } = await supabase
    .from("posts")
    .select("*, profiles(full_name, username, avatar_url, role)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <span className="section-label">Community</span>
        <h1 className="heading-md mt-2">Feed</h1>
        <p className="text-sm text-canvas-500 mt-1">Share updates and see what others are posting.</p>
      </div>

      {/* Create Post */}
      <CreatePost userId={user.id} />

      {/* Posts */}
      <div className="mt-8 space-y-4">
        {(!posts || posts.length === 0) ? (
          <div className="border border-canvas-800/40 bg-canvas-900/20 p-12 text-center">
            <p className="text-canvas-500">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post: any) => (
            <PostCard key={post.id} post={post} currentUserId={user.id} />
          ))
        )}
      </div>
    </div>
  );
}
