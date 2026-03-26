"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Loader2, Palette, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PostProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    images: string[];
    created_at: string;
    profiles: {
      full_name: string;
      username: string;
      avatar_url: string | null;
      role: string;
    };
  };
  currentUserId: string;
}

export default function PostCard({ post, currentUserId }: PostProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const router = useRouter();
  const isOwn = post.user_id === currentUserId;
  const profile = post.profiles;

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", post.id);
    router.refresh();
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      <div className="border border-canvas-800/40 bg-canvas-900/20 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-canvas-900 border border-canvas-800/40 flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : profile.role === "gallery" ? (
                <Building2 size={16} className="text-canvas-600" />
              ) : (
                <Palette size={16} className="text-canvas-600" />
              )}
            </div>
            <div>
              <Link
                href={profile.username ? `/portfolio/${profile.username}` : "#"}
                className="text-sm font-medium text-canvas-100 hover:text-accent-400 transition-colors"
              >
                {profile.full_name}
              </Link>
              <div className="flex items-center gap-2 text-xs text-canvas-500">
                <span className="capitalize">{profile.role}</span>
                <span>·</span>
                <span>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          {isOwn && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 bg-red-600 text-white text-[10px] font-medium hover:bg-red-500 disabled:opacity-50">
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : "Delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 border border-canvas-700 text-canvas-400 text-[10px]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-canvas-600 hover:text-red-400 transition-colors p-1">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm text-canvas-300 leading-relaxed mt-4 whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className={`mt-4 gap-2 ${
            post.images.length === 1 ? "grid grid-cols-1" :
            post.images.length === 2 ? "grid grid-cols-2" :
            post.images.length === 3 ? "grid grid-cols-3" :
            "grid grid-cols-2"
          }`}>
            {post.images.map((img, i) => (
              <div key={i}
                className={`bg-canvas-900 border border-canvas-800/40 overflow-hidden cursor-pointer ${
                  post.images.length === 1 ? "aspect-[16/10]" : "aspect-square"
                }`}
                onClick={() => setLightbox(img)}>
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
