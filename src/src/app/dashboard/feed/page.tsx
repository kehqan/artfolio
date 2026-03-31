"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Image as ImageIcon, Send, Trash2, X } from "lucide-react";

type Post = {
  id: string; content: string; images?: string[]; created_at: string;
  profiles: { full_name: string; avatar_url?: string; username?: string; role?: string };
};

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    loadPosts();
  }, []);

  async function loadPosts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(full_name, avatar_url, username, role)")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as Post[]) || []);
  }

  function handleImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 4 - imageFiles.length);
    setImageFiles((p) => [...p, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((p) => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  async function handlePost() {
    if (!content.trim() && imageFiles.length === 0) return;
    setPosting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPosting(false); return; }

    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop();
      const path = `posts/${user.id}/${Date.now()}.${ext}`;
      const { data: upload } = await supabase.storage.from("post-images").upload(path, file);
      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }

    await supabase.from("posts").insert({ user_id: user.id, content, images: uploadedUrls });
    setContent(""); setImageFiles([]); setImagePreviews([]);
    setPosting(false);
    loadPosts();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", id);
    setPosts((p) => p.filter((post) => post.id !== id));
  }

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Feed</h1>
        <p className="page-subtitle">Share updates with the Artfolio community</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Compose */}
        <div className="card p-5">
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, studio shot, or work in progress..."
            rows={3} className="textarea mb-3"
          />
          {imagePreviews.length > 0 && (
            <div className={`grid gap-2 mb-3 ${imagePreviews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-stone-100">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => {
                    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
                    setImageFiles((p) => p.filter((_, idx) => idx !== i));
                  }} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imageFiles.length >= 4}
              className="btn-ghost text-stone-500 disabled:opacity-40"
            >
              <ImageIcon className="w-4 h-4" />
              {imageFiles.length > 0 ? `${imageFiles.length}/4 photos` : "Add photos"}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImages(e.target.files)} />
            <button onClick={handlePost} disabled={posting || (!content.trim() && imageFiles.length === 0)} className="btn-primary disabled:opacity-50">
              <Send className="w-4 h-4" /> {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* Posts */}
        {posts.map((post) => (
          <div key={post.id} className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold shrink-0">
                  {post.profiles?.full_name?.[0] || "A"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={post.profiles?.username ? `/portfolio/${post.profiles.username}` : "#"} className="font-semibold text-stone-900 hover:underline text-sm">
                    {post.profiles?.full_name || "Artist"}
                  </Link>
                  {post.profiles?.role && (
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full capitalize">{post.profiles.role}</span>
                  )}
                  <span className="text-xs text-stone-400">{timeAgo(post.created_at)}</span>
                </div>
              </div>
              {userId && post.profiles && (
                <button onClick={() => deletePost(post.id)} className="btn-danger p-1.5 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {post.content && (
              <p className="text-sm text-stone-700 whitespace-pre-wrap mb-3 leading-relaxed">{post.content}</p>
            )}
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 rounded-xl overflow-hidden ${
                post.images.length === 1 ? "grid-cols-1" :
                post.images.length === 2 ? "grid-cols-2" :
                post.images.length === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}>
                {post.images.map((img, i) => (
                  <img key={i} src={img} alt="" onClick={() => setLightbox(img)}
                    className={`w-full object-cover cursor-zoom-in hover:opacity-95 transition-opacity ${
                      post.images!.length === 1 ? "aspect-video" : "aspect-square"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {posts.length === 0 && (
          <div className="card p-16 text-center">
            <p className="text-stone-400 mb-2">No posts yet</p>
            <p className="text-sm text-stone-500">Be the first to share something!</p>
          </div>
        )}
      </div>
    </div>
  );
}
