"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, ImageIcon, X, Trash2 } from "lucide-react";

type Post = {
  id: string;
  content: string;
  images?: string[];
  created_at: string;
  user_id: string;
  profiles: { full_name: string; avatar_url?: string; username?: string; role?: string } | null;
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function FeedPage() {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [content, setContent]       = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [userId, setUserId]         = useState<string | null>(null);
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const [myProfile, setMyProfile]   = useState<{ full_name: string; avatar_url?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
          .then(({ data }) => { if (data) setMyProfile(data); });
      }
    });
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    const supabase = createClient();
    // Join profiles to get poster info — the key fix: use user_id to join profiles
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, content, images, created_at, user_id,
        profiles ( full_name, avatar_url, username, role )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) console.error("Feed error:", error);
    setPosts((data as unknown as Post[]) || []);
    setLoading(false);
  }

  function handleImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 4 - imageFiles.length);
    setImageFiles(p => [...p, ...newFiles]);
    newFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setImagePreviews(p => [...p, e.target?.result as string]);
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
    setPosts(p => p.filter(post => post.id !== id));
  }

  const myInitial = myProfile?.full_name?.[0]?.toUpperCase() || "A";

  return (
    <>
      <style>{`
        .feed-post-card { transition: box-shadow 0.1s; }
        .feed-post-card:hover { box-shadow: 4px 4px 0 #111110 !important; }
        .feed-send-btn:hover { background: #FFD400 !important; transform: translate(-1px,-1px); }
        .feed-img:hover { opacity: 0.9; cursor: zoom-in; }
      `}</style>

      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setLightbox(null)}>
          <button style={{ position: "absolute", top: 16, right: 16, background: "#fff", border: "2px solid #111110", borderRadius: 6, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setLightbox(null)}>
            <X size={14} />
          </button>
          <img src={lightbox} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", border: "2px solid #111110", borderRadius: 8 }} />
        </div>
      )}

      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 2 }}>Feed</h1>
          <p style={{ fontSize: 13, color: "#9B8F7A" }}>Share updates with the Artfolio community</p>
        </div>

        <div style={{ maxWidth: 640 }}>
          {/* Compose */}
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: imagePreviews.length > 0 ? "1px solid #E0D8CA" : "none" }}>
              {/* Avatar */}
              {myProfile?.avatar_url
                ? <img src={myProfile.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #111110", flexShrink: 0, marginTop: 2 }} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#111110", flexShrink: 0, marginTop: 2 }}>{myInitial}</div>
              }
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
                placeholder="Share an update, studio shot, or work in progress…"
                rows={3}
                style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 14, fontFamily: "inherit", color: "#111110", background: "transparent", lineHeight: 1.5 }}
              />
            </div>

            {imagePreviews.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: imagePreviews.length === 1 ? "1fr" : "1fr 1fr", gap: 6, padding: "10px 14px" }}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1.5px solid #111110" }}>
                    <img src={src} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                    <button onClick={() => { setImagePreviews(p => p.filter((_, idx) => idx !== i)); setImageFiles(p => p.filter((_, idx) => idx !== i)); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #E0D8CA" }}>
              <button onClick={() => fileRef.current?.click()} disabled={imageFiles.length >= 4} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1.5px solid #d4cfc4", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#9B8F7A", background: "#fff", cursor: "pointer", opacity: imageFiles.length >= 4 ? 0.4 : 1 }}>
                <ImageIcon size={13} /> {imageFiles.length > 0 ? `${imageFiles.length}/4 photos` : "Add photos"}
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => handleImages(e.target.files)} />
              <button className="feed-send-btn" onClick={handlePost} disabled={posting || (!content.trim() && imageFiles.length === 0)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", border: "2px solid #111110", borderRadius: 6,
                background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 13,
                cursor: "pointer", boxShadow: "2px 2px 0 #111110",
                opacity: posting || (!content.trim() && imageFiles.length === 0) ? 0.5 : 1,
                transition: "background 0.1s, transform 0.1s",
              }}>
                <Send size={12} /> {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {/* Posts */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>Loading feed…</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", background: "#fff", border: "2px solid #111110", borderRadius: 8 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📮</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 6 }}>No posts yet</div>
              <div style={{ fontSize: 13, color: "#9B8F7A" }}>Be the first to share something!</div>
            </div>
          ) : posts.map((post) => {
            const poster = post.profiles;
            const posterName = poster?.full_name || "Artist";
            const posterInitial = posterName[0]?.toUpperCase() || "A";
            const isOwn = post.user_id === userId;

            return (
              <div key={post.id} className="feed-post-card" style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 16px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {poster?.avatar_url
                      ? <img src={poster.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #111110", flexShrink: 0 }} />
                      : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#111110", flexShrink: 0 }}>{posterInitial}</div>
                    }
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{posterName}</span>
                        {poster?.role && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", border: "1.5px solid #111110", borderRadius: 20, color: "#5C5346", background: "#F5F0E8", textTransform: "capitalize" }}>{poster.role}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 1 }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </div>
                  {isOwn && (
                    <button onClick={() => deletePost(post.id)} style={{ width: 28, height: 28, border: "1.5px solid #E0D8CA", borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9B8F7A" }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Content */}
                {post.content && (
                  <div style={{ padding: "0 16px 12px", fontSize: 14, color: "#111110", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content}</div>
                )}

                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: post.images.length === 1 ? "1fr" : post.images.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
                    gap: 2, margin: "0 0 12px",
                  }}>
                    {post.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="feed-img" onClick={() => setLightbox(img)} style={{
                        width: "100%",
                        aspectRatio: post.images!.length === 1 ? "16/9" : "1/1",
                        objectFit: "cover", display: "block",
                        border: "1px solid #E0D8CA",
                        transition: "opacity 0.1s",
                      }} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderTop: "1px solid #E0D8CA" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>
                    💬 <span>0</span>
                  </button>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>
                    ♡ <span>0</span>
                  </button>
                  <button style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>
                    ↗ Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
