"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Loader2, Palette, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PostCard({ post, currentUserId }: { post: any; currentUserId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const router = useRouter();
  const isOwn = post.user_id === currentUserId;
  const p = post.profiles;
  const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "now"; const m = Math.floor(s / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; const days = Math.floor(h / 24); return days < 7 ? `${days}d` : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  async function handleDelete() { setDeleting(true); const sb = createClient(); await sb.from("posts").delete().eq("id", post.id); router.refresh(); }

  return (
    <>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-150 flex items-center justify-center shrink-0 overflow-hidden">
              {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p?.role === "gallery" ? <Building2 size={14} className="text-slate-400" /> : <Palette size={14} className="text-slate-400" />}
            </div>
            <div>
              <Link href={p?.username ? `/portfolio/${p.username}` : "#"} className="text-sm font-medium text-slate-800 hover:text-brand-600 transition-colors">{p?.full_name}</Link>
              <p className="text-xs text-slate-400"><span className="capitalize">{p?.role}</span> · {timeAgo(post.created_at)}</p>
            </div>
          </div>
          {isOwn && (confirm ? (
            <div className="flex gap-1.5"><button onClick={handleDelete} disabled={deleting} className="px-2 py-1 bg-red-600 text-white text-[10px] rounded-md">{deleting ? <Loader2 size={10} className="animate-spin" /> : "Delete"}</button>
              <button onClick={() => setConfirm(false)} className="px-2 py-1 border border-slate-200 text-[10px] rounded-md text-slate-500">Cancel</button></div>
          ) : <button onClick={() => setConfirm(true)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>)}
        </div>
        {post.content && <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>}
        {post.images?.length > 0 && (
          <div className={`mt-3 gap-2 ${post.images.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2"}`}>
            {post.images.map((img: string, i: number) => (
              <div key={i} className={`bg-slate-100 rounded-md border border-slate-150 overflow-hidden cursor-pointer ${post.images.length === 1 ? "aspect-[16/10]" : "aspect-square"}`} onClick={() => setLightbox(img)}>
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightbox(null)}><img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" /></div>}
    </>
  );
}
