"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CreatePost({ userId }: { userId: string }) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const router = useRouter();

  async function handleImageUpload(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 4 - images.length)) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const data = await res.json(); urls.push(data.url); }
    }
    setImages([...images, ...urls]); setUploading(false);
  }

  async function handleSubmit() {
    if (!content.trim() && images.length === 0) return;
    setPosting(true);
    const supabase = createClient();
    const { error } = await supabase.from("posts").insert({ user_id: userId, content: content.trim() || null, images });
    if (!error) { setContent(""); setImages([]); router.refresh(); }
    setPosting(false);
  }

  return (
    <div className="card p-5">
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share an update..." rows={3}
        className="w-full bg-transparent text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none resize-none" />
      {images.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-md bg-slate-100 border border-slate-150 overflow-hidden">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 cursor-pointer border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Photo
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) handleImageUpload(e.target.files); e.target.value = ""; }} />
        </label>
        <button onClick={handleSubmit} disabled={posting || (!content.trim() && images.length === 0)} className="btn-primary !py-2 !px-4 text-xs disabled:opacity-30">
          {posting ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Post</>}
        </button>
      </div>
    </div>
  );
}
