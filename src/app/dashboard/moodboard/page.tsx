"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ExternalLink, Copy, Check, Trash2,
  Link2, Search, Tag, Maximize2, Upload,
  Layers, Eye, EyeOff, Globe, Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type Provider = "milanote" | "pinterest" | "figma" | "miro" | "notion" | "other";

type Moodboard = {
  id: string;
  user_id: string;
  provider: Provider;
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  og_image?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
};

// ── Provider config ────────────────────────────────────────────────
const PROVIDERS: Record<Provider, { label: string; emoji: string; color: string; bg: string; border: string; grad: string; domains: string[] }> = {
  milanote: {
    label: "Milanote", emoji: "🟤", color: "#5C3D2E", bg: "#FDF0E8", border: "#E8C4A0",
    grad: "135deg, #3D2010 0%, #8B4513 50%, #D2691E 100%",
    domains: ["milanote.com"],
  },
  pinterest: {
    label: "Pinterest", emoji: "📌", color: "#E60023", bg: "#FEE2E2", border: "#FCA5A5",
    grad: "135deg, #7F1D1D 0%, #E60023 55%, #FF4757 100%",
    domains: ["pinterest.com", "pin.it"],
  },
  figma: {
    label: "Figma", emoji: "🎨", color: "#7C3AED", bg: "#EDE9FE", border: "#C4B5FD",
    grad: "135deg, #4C1D95 0%, #7C3AED 55%, #A78BFA 100%",
    domains: ["figma.com"],
  },
  miro: {
    label: "Miro", emoji: "🟡", color: "#CA8A04", bg: "#FEF9C3", border: "#FDE047",
    grad: "135deg, #713F12 0%, #CA8A04 55%, #FBBF24 100%",
    domains: ["miro.com"],
  },
  notion: {
    label: "Notion", emoji: "📓", color: "#374151", bg: "#F3F4F6", border: "#9CA3AF",
    grad: "135deg, #111827 0%, #374151 55%, #6B7280 100%",
    domains: ["notion.so", "notion.com"],
  },
  other: {
    label: "External Board", emoji: "🔗", color: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC",
    grad: "135deg, #075985 0%, #0EA5E9 55%, #38BDF8 100%",
    domains: [],
  },
};

function detectProvider(url: string): Provider {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    for (const [key, cfg] of Object.entries(PROVIDERS)) {
      if (cfg.domains.some(d => hostname.includes(d))) return key as Provider;
    }
  } catch {}
  return "other";
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.toString();
  } catch { return url; }
}

// ── Tag colors ─────────────────────────────────────────────────────
const TAG_COLORS = ["#FFD400","#FF6B6B","#4ECDC4","#8B5CF6","#16A34A","#0EA5E9","#F97316","#EC4899"];
function tagColor(tag: string) {
  let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[h];
}

// ── Preview Modal ──────────────────────────────────────────────────
function PreviewModal({ board, onClose }: { board: Moodboard; onClose: () => void }) {
  const [iframeOk, setIframeOk] = useState<boolean | null>(null);
  const cfg = PROVIDERS[board.provider];
  const thumb = board.thumbnail_url || board.og_image;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(17,17,16,0.85)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:820, maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"2px solid #E8E0D0", background:"#111110", borderRadius:"22px 22px 0 0", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ fontSize:20, lineHeight:1 }}>{cfg.emoji}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:900, color:"#FFD400", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{board.title}</div>
            <div style={{ fontSize:11, color:"rgba(255,212,0,0.5)", fontWeight:600 }}>{cfg.label}</div>
          </div>
          <a href={board.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
            <button style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", background:"#FFD400", border:"2px solid #FFD400", borderRadius:9, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110" }}>
              <ExternalLink size={12} /> Open
            </button>
          </a>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={14} color="#FFD400" />
          </button>
        </div>

        {/* Preview area */}
        <div style={{ flex:1, position:"relative", minHeight:400, background:"#1A1A18" }}>
          {/* Try iframe */}
          {iframeOk !== false && (
            <iframe
              src={board.url}
              style={{ width:"100%", height:"100%", border:"none", display: iframeOk === false ? "none" : "block" }}
              onLoad={() => setIframeOk(true)}
              onError={() => setIframeOk(false)}
              sandbox="allow-scripts allow-same-origin allow-forms"
              title={board.title}
            />
          )}

          {/* Fallback: thumbnail or rich card */}
          {iframeOk === false && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:20 }}>
              {thumb ? (
                <>
                  <img src={thumb} alt={board.title} style={{ maxWidth:"100%", maxHeight:300, objectFit:"contain", borderRadius:12, border:"2px solid rgba(255,255,255,0.1)" }} />
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontWeight:600, textAlign:"center" }}>
                    Embed not available — preview image shown
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:56 }}>{cfg.emoji}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:"#fff", textAlign:"center" }}>{board.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textAlign:"center", maxWidth:380 }}>
                    {cfg.label} boards cannot be embedded directly. Open the board in its original platform to view the full content.
                  </div>
                  <a href={board.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                    <button style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 24px", background:"#FFD400", border:"2.5px solid #FFD400", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"4px 4px 0 rgba(255,212,0,0.3)" }}>
                      <ExternalLink size={14} /> Open in {cfg.label}
                    </button>
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ───────────────────────────────────────────────
function MoodboardFormModal({ existing, onClose, onSaved }: {
  existing?: Moodboard; onClose: () => void; onSaved: () => void;
}) {
  const sb = createClient();
  const isEdit = !!existing;
  const fileRef = useRef<HTMLInputElement>(null);

  const [url, setUrl]           = useState(existing?.url || "");
  const [title, setTitle]       = useState(existing?.title || "");
  const [description, setDesc]  = useState(existing?.description || "");
  const [tags, setTags]         = useState<string[]>(existing?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setPublic]   = useState(existing?.is_public ?? true);
  const [thumbnail, setThumb]   = useState(existing?.thumbnail_url || "");
  const [provider, setProv]     = useState<Provider>(existing?.provider || "other");
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [urlError, setUrlError] = useState("");

  // Auto-detect provider when URL changes
  function handleUrlChange(val: string) {
    setUrl(val); setUrlError("");
    if (val.trim()) setProv(detectProvider(val));
  }

  // Fetch OG metadata via our API route
  async function fetchMeta() {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const clean = cleanUrl(url);
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !title) setTitle(data.title);
        if (data.image && !thumbnail) setThumb(data.image);
        if (data.description && !description) setDesc(data.description);
      }
    } catch {}
    setFetching(false);
  }

  // Upload custom thumbnail
  async function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const { data: { user } } = await sb.auth.getUser(); if (!user) { setUploading(false); return; }
    const ext = file.name.split(".").pop();
    const path = `moodboard-thumbs/${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (data && !error) {
      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      setThumb(pub.publicUrl);
    }
    setUploading(false);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 8) { setTags(p => [...p, t]); setTagInput(""); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { setUrlError("Please enter a valid URL"); return; }
    try { new URL(cleanUrl(url)); } catch { setUrlError("Please enter a valid URL"); return; }
    setSaving(true);
    const { data: { user } } = await sb.auth.getUser(); if (!user) { setSaving(false); return; }
    const payload = {
      user_id: user.id,
      provider,
      url: cleanUrl(url),
      title: title.trim() || `${PROVIDERS[provider].label} Board`,
      description: description.trim() || null,
      tags,
      is_public: isPublic,
      thumbnail_url: thumbnail || null,
    };
    if (isEdit && existing) {
      await sb.from("moodboards").update(payload).eq("id", existing.id);
    } else {
      await sb.from("moodboards").insert(payload);
    }
    setSaving(false); onSaved(); onClose();
  }

  const cfg = PROVIDERS[provider];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(17,17,16,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:520, maxHeight:"94vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ padding:"17px 22px 13px", borderBottom:"2px solid #E8E0D0", background: isEdit ? "#FFD400" : "#111110", borderRadius:"22px 22px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <span style={{ fontSize:18, lineHeight:1 }}>{cfg.emoji}</span>
            <h2 style={{ fontSize:17, fontWeight:900, color: isEdit ? "#111110" : "#FFD400", margin:0 }}>
              {isEdit ? "Edit Moodboard" : "Add Moodboard"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background: isEdit?"rgba(17,17,16,0.15)":"rgba(255,255,255,0.1)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={14} color={isEdit?"#111110":"#FFD400"} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding:"18px 22px 22px" }}>

          {/* URL input */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Board URL *</label>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"#fff", border:`2px solid ${urlError ? "#EF4444" : "#E8E0D0"}`, borderRadius:12, padding:"0 12px", transition:"border-color .15s" }}
                onFocus={() => {}} >
                <Link2 size={14} color="#9B8F7A" style={{ flexShrink:0 }} />
                <input
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  onBlur={() => { if (url) fetchMeta(); }}
                  placeholder="https://milanote.com/board/..."
                  style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"transparent", padding:"11px 0" }}
                  onFocus={e => (e.target.parentElement!.style.borderColor="#FFD400")}
                />
                {url && <button type="button" onClick={() => { setUrl(""); setProv("other"); setUrlError(""); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", display:"flex", padding:0 }}><X size={12}/></button>}
              </div>
              <button type="button" onClick={fetchMeta} disabled={!url.trim() || fetching}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"0 14px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:12, fontWeight:700, cursor: url.trim() ? "pointer" : "not-allowed", fontFamily:"inherit", color:"#111110", opacity: url.trim() ? 1 : 0.5, whiteSpace:"nowrap", transition:"all .12s" }}
                onMouseEnter={e => url.trim() && ((e.currentTarget as HTMLElement).style.borderColor="#111110")}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"}>
                <Sparkles size={12} color="#FFD400" /> {fetching ? "Fetching…" : "Auto-fill"}
              </button>
            </div>
            {urlError && <div style={{ fontSize:11, color:"#EF4444", fontWeight:700, marginTop:5 }}>{urlError}</div>}

            {/* Provider badge */}
            {url.trim() && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:8, padding:"4px 10px", borderRadius:99, background:cfg.bg, border:`1.5px solid ${cfg.border}`, fontSize:11, fontWeight:800, color:cfg.color }}>
                <span>{cfg.emoji}</span> Detected: {cfg.label}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom:12 }}>
            <label style={LBL}>Title</label>
            <input style={INP} value={title} onChange={e => setTitle(e.target.value)} placeholder={`My ${cfg.label} board…`}
              onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")} />
          </div>

          {/* Description */}
          <div style={{ marginBottom:12 }}>
            <label style={LBL}>Description <span style={{ color:"#C0B8A8", fontWeight:500 }}>(optional)</span></label>
            <textarea rows={2} style={{ ...INP, resize:"vertical", minHeight:60 }} value={description} onChange={e => setDesc(e.target.value)} placeholder="What's this board about?"
              onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")} />
          </div>

          {/* Tags */}
          <div style={{ marginBottom:12 }}>
            <label style={LBL}>Tags <span style={{ color:"#C0B8A8", fontWeight:500 }}>(max 8)</span></label>
            <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
              {tags.map(t => (
                <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px 3px 9px", borderRadius:99, background:tagColor(t)+"22", border:`1.5px solid ${tagColor(t)}`, fontSize:11, fontWeight:800, color:tagColor(t) }}>
                  {t}
                  <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} style={{ background:"none", border:"none", cursor:"pointer", color:tagColor(t), display:"flex", padding:0, marginLeft:2 }}><X size={10}/></button>
                </span>
              ))}
            </div>
            {tags.length < 8 && (
              <div style={{ display:"flex", gap:7 }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag, press Enter…"
                  style={{ ...INP, flex:1 }} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")} />
                <button type="button" onClick={addTag} disabled={!tagInput.trim()} style={{ padding:"0 14px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#111110", transition:"all .12s" }}
                  onMouseEnter={e => tagInput.trim() && ((e.currentTarget as HTMLElement).style.borderColor="#111110")}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"}>
                  <Tag size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div style={{ marginBottom:14, padding:"12px 14px", background:"#F5F0E8", border:"1.5px solid #E8E0D0", borderRadius:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <label style={{ ...LBL, margin:0 }}>Preview Thumbnail</label>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleThumbUpload} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 11px", background:"#fff", border:"1.5px solid #E8E0D0", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A", transition:"all .12s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor="#111110"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"}>
                <Upload size={11} /> {uploading ? "Uploading…" : "Upload image"}
              </button>
            </div>
            {thumbnail ? (
              <div style={{ position:"relative", borderRadius:10, overflow:"hidden", border:"1.5px solid #E8E0D0" }}>
                <img src={thumbnail} alt="Thumbnail" style={{ width:"100%", height:120, objectFit:"cover", display:"block" }} />
                <button type="button" onClick={() => setThumb("")} style={{ position:"absolute", top:6, right:6, width:24, height:24, borderRadius:7, background:"rgba(17,17,16,0.7)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  <X size={11} color="#fff" />
                </button>
              </div>
            ) : (
              <div style={{ height:80, borderRadius:10, border:"2px dashed #D4C9A8", background:"#FAF7F3", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:5 }}>
                <Upload size={16} color="#C0B8A8" />
                <span style={{ fontSize:11, fontWeight:600, color:"#C0B8A8" }}>Upload a preview image or auto-fill from URL</span>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div style={{ marginBottom:20 }}>
            <label style={LBL}>Visibility</label>
            <div style={{ display:"flex", gap:8 }}>
              {[{ key:true, label:"Public", icon:Eye, desc:"Visible on your profile" }, { key:false, label:"Private", icon:EyeOff, desc:"Only you can see it" }].map(opt => (
                <button key={String(opt.key)} type="button" onClick={() => setPublic(opt.key)}
                  style={{ flex:1, padding:"10px 12px", border:`2px solid ${isPublic===opt.key ? "#111110" : "#E8E0D0"}`, borderRadius:12, background: isPublic===opt.key ? "#FFD400" : "#fff", cursor:"pointer", fontFamily:"inherit", textAlign:"left", boxShadow: isPublic===opt.key ? "2px 2px 0 #111110" : "none", transition:"all .14s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <opt.icon size={13} color={isPublic===opt.key ? "#111110" : "#9B8F7A"} />
                    <span style={{ fontSize:13, fontWeight:800, color:"#111110" }}>{opt.label}</span>
                  </div>
                  <div style={{ fontSize:10, fontWeight:600, color:"#9B8F7A" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:9 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"12px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A" }}>Cancel</button>
            <button type="submit" disabled={saving || !url.trim()} style={{ flex:2, padding:"12px", border:"2.5px solid #111110", borderRadius:12, background: saving||!url.trim() ? "#F5F0E8" : "#FFD400", fontSize:14, fontWeight:800, cursor: saving||!url.trim() ? "not-allowed":"pointer", fontFamily:"inherit", color:"#111110", boxShadow: saving||!url.trim() ? "none" : "3px 3px 0 #111110" }}>
              {saving ? "Saving…" : isEdit ? "Save Changes ✓" : "Add Moodboard ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Moodboard Card ─────────────────────────────────────────────────
function MoodboardCard({ board, onEdit, onDelete, onPreview }: {
  board: Moodboard; onEdit: () => void; onDelete: () => void; onPreview: () => void;
}) {
  const [hov, setHov]     = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = PROVIDERS[board.provider];
  const thumb = board.thumbnail_url || board.og_image;

  function copyLink() {
    navigator.clipboard.writeText(board.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background:"#fff", border:`2.5px solid ${hov?"#111110":"#E8E0D0"}`, borderRadius:20, overflow:"hidden", position:"relative", boxShadow: hov ? "5px 6px 0 #111110" : "3px 4px 0 #D4C9A8", transform: hov ? "translate(-2px,-3px)" : "none", transition:"all .25s cubic-bezier(.16,1,.3,1)" }}>

      {/* ── Hero (200px) ── */}
      <div style={{ height:200, position:"relative", overflow:"hidden", flexShrink:0, cursor:"pointer" }} onClick={onPreview}>
        {thumb ? (
          <img src={thumb} alt={board.title} style={{ width:"100%", height:"100%", objectFit:"cover", transform: hov?"scale(1.04)":"scale(1)", transition:"transform .5s cubic-bezier(.16,1,.3,1)" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", background:`linear-gradient(${cfg.grad})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:8, opacity:.7 }}>{cfg.emoji}</div>
              <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:".12em" }}>{cfg.label}</div>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)" }} />

        {/* Liquid glass provider badge — top left */}
        <div style={{ position:"absolute", top:10, left:10, display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", fontSize:9, fontWeight:800, color:"#fff", textTransform:"uppercase", letterSpacing:".1em" }}>
          {cfg.emoji} {cfg.label}
        </div>

        {/* Visibility badge — top right */}
        <div style={{ position:"absolute", top:10, right:10, display:"inline-flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:99, background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", fontSize:9, fontWeight:800, color:"#fff" }}>
          {board.is_public ? <><Eye size={9}/> Public</> : <><EyeOff size={9}/> Private</>}
        </div>

        {/* Preview button — center on hover */}
        {hov && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 18px", borderRadius:12, background:"rgba(255,255,255,0.18)", border:"1.5px solid rgba(255,255,255,0.35)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", fontSize:12, fontWeight:800, color:"#fff" }}>
              <Maximize2 size={13} /> Preview
            </div>
          </div>
        )}

        {/* Title overlay */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 12px 11px" }}>
          <div style={{ fontSize:14, fontWeight:900, color:"#fff", textShadow:"0 1px 6px rgba(0,0,0,0.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{board.title}</div>
          {board.description && (
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:600, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{board.description}</div>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding:"11px 13px 13px" }}>

        {/* Tags */}
        {board.tags.length > 0 && (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:11 }}>
            {board.tags.map(t => (
              <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:99, background:tagColor(t)+"18", border:`1.5px solid ${tagColor(t)}40`, fontSize:10, fontWeight:800, color:tagColor(t) }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:"flex", gap:6 }}>
          <a href={board.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, textDecoration:"none" }}>
            <button style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", background:"#111110", border:"2px solid #111110", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#FFD400", transition:"all .12s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#000"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="#111110"; }}>
              <ExternalLink size={12} /> Open Board
            </button>
          </a>
          <button onClick={copyLink} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 12px", background: copied?"#DCFCE7":"#fff", border:`2px solid ${copied?"#86EFAC":"#E8E0D0"}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color: copied?"#16A34A":"#9B8F7A", transition:"all .15s" }}>
            {copied ? <><Check size={12}/> Copied!</> : <Copy size={12}/>}
          </button>
          <button onClick={onEdit} style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"8px 10px", background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A", transition:"all .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.color="#111110"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.color="#9B8F7A"; }}>
            <Layers size={12}/>
          </button>
          <button onClick={() => { if (confirm("Remove this moodboard?")) onDelete(); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"8px 10px", background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, cursor:"pointer", transition:"all .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#EF4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; }}>
            <Trash2 size={12} color="#EF4444"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function MoodboardPage() {
  const sb = createClient();
  const [boards, setBoards]         = useState<Moodboard[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editBoard, setEditBoard]   = useState<Moodboard | undefined>(undefined);
  const [previewBoard, setPreview]  = useState<Moodboard | null>(null);
  const [search, setSearch]         = useState("");
  const [filterProv, setFilterProv] = useState<Provider | "all">("all");
  const [filterVis, setFilterVis]   = useState<"all" | "public" | "private">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser(); if (!user) { setLoading(false); return; }
    const { data } = await sb.from("moodboards").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setBoards((data || []).map(b => ({ ...b, tags: b.tags || [] })));
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await sb.from("moodboards").delete().eq("id", id);
    setBoards(p => p.filter(b => b.id !== id));
  }

  // Stats
  const publicCount  = boards.filter(b => b.is_public).length;
  const providers    = [...new Set(boards.map(b => b.provider))];

  // Filtered
  const filtered = boards.filter(b => {
    if (filterProv !== "all" && b.provider !== filterProv) return false;
    if (filterVis === "public" && !b.is_public) return false;
    if (filterVis === "private" && b.is_public) return false;
    if (search) { const q = search.toLowerCase(); return b.title.toLowerCase().includes(q) || b.tags.some(t => t.includes(q)) || b.description?.toLowerCase().includes(q); }
    return true;
  });

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div className="mb-header" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:14 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:3 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:"#FFD400", border:"2.5px solid #111110", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"2px 2px 0 #111110" }}>
              <Layers size={16} color="#111110"/>
            </div>
            <h1 style={{ fontSize:24, fontWeight:900, color:"#111110", letterSpacing:"-.6px", margin:0 }}>Moodboards</h1>
          </div>
          <p style={{ fontSize:13, fontWeight:600, color:"#9B8F7A", margin:0 }}>
            {boards.length} boards · {publicCount} public · {providers.length > 0 ? providers.map(p => PROVIDERS[p].label).join(", ") : "no providers yet"}
          </p>
        </div>
        <button onClick={() => { setEditBoard(undefined); setShowForm(true); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110", transition:"all .15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
          <Plus size={14} strokeWidth={3}/> Add Moodboard
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="mb-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Boards",  value:boards.length,          color:"#8B5CF6", bg:"#EDE9FE", grad:"135deg,#4C1D95,#7C3AED", icon:"🗂️" },
          { label:"Public",        value:publicCount,             color:"#16A34A", bg:"#DCFCE7", grad:"135deg,#14532D,#16A34A", icon:"🌐" },
          { label:"Private",       value:boards.length-publicCount, color:"#9B8F7A", bg:"#F5F0E8", grad:"135deg,#57534E,#9B8F7A", icon:"🔒" },
          { label:"Providers",     value:providers.length,        color:"#0EA5E9", bg:"#E0F2FE", grad:"135deg,#075985,#0EA5E9", icon:"🔗" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden", boxShadow:"2px 3px 0 #E0D8CA" }}>
            <div style={{ height:4, background:`linear-gradient(${s.grad})` }}/>
            <div style={{ padding:"13px 15px", display:"flex", alignItems:"center", gap:11 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:"#111110", fontFamily:"monospace", letterSpacing:"-.4px", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", marginTop:2 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="mb-toolbar" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {/* Search */}
        <div className="mb-search">
          <Search size={13} color="#9B8F7A"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search boards, tags…" className="mb-search-input"/>
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", display:"flex", padding:0 }}><X size={12}/></button>}
        </div>

        {/* Provider filters */}
        <button onClick={() => setFilterProv("all")} className={`mb-filter-btn${filterProv==="all"?" active":""}`}>All providers</button>
        {providers.map(p => {
          const cfg = PROVIDERS[p];
          return (
            <button key={p} onClick={() => setFilterProv(filterProv===p?"all":p)} className={`mb-filter-btn${filterProv===p?" active":""}`}>
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}

        {/* Visibility filter */}
        <div style={{ marginLeft:"auto", display:"flex", border:"2px solid #111110", borderRadius:11, overflow:"hidden" }}>
          {(["all","public","private"] as const).map(v => (
            <button key={v} onClick={() => setFilterVis(v)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 11px", border:"none", borderRight: v!=="private" ? "1px solid #E8E0D0" : "none", background: filterVis===v?"#111110":"#fff", color: filterVis===v?"#FFD400":"#9B8F7A", fontFamily:"inherit", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all .12s", whiteSpace:"nowrap" }}>
              {v === "all" ? <Globe size={11}/> : v === "public" ? <Eye size={11}/> : <EyeOff size={11}/>}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── PROVIDER INFO BANNER (first time) ── */}
      {boards.length === 0 && !loading && (
        <div style={{ marginBottom:20, padding:"16px 20px", background:"linear-gradient(135deg,#111110 0%,#2D2B29 100%)", border:"2.5px solid #111110", borderRadius:18, boxShadow:"4px 5px 0 #111110", display:"flex", alignItems:"flex-start", gap:16 }}>
          <div style={{ fontSize:32, flexShrink:0, marginTop:2 }}>🎨</div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:"#FFD400", marginBottom:5 }}>Connect your visual workspace</div>
            <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.6)", lineHeight:1.6, maxWidth:520 }}>
              Attach Milanote boards, Pinterest collections, Figma files or any visual reference from the web. Artomango stores only the link — your boards live in their native platforms.
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              {(["milanote","pinterest","figma","miro","notion"] as Provider[]).map(p => {
                const cfg = PROVIDERS[p];
                return (
                  <div key={p} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.12)", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>
                    {cfg.emoji} {cfg.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING SKELETONS ── */}
      {loading && (
        <div className="mb-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ borderRadius:20, background:"#F5F0E8", border:"2px solid #E8E0D0", overflow:"hidden", height:310, animationDelay:`${i*.05}s` }} className="mb-skeleton">
              <div style={{ height:200, background:"linear-gradient(135deg,#E8E0D0,#F5F0E8)" }}/>
              <div style={{ padding:"12px 13px" }}>
                <div style={{ height:11, borderRadius:6, background:"#E8E0D0", width:"60%", marginBottom:8 }}/>
                <div style={{ display:"flex", gap:6 }}>
                  <div style={{ height:22, borderRadius:99, background:"#E8E0D0", width:60 }}/>
                  <div style={{ height:22, borderRadius:99, background:"#F0EAE0", width:50 }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"80px 40px", background:"#fff", borderRadius:20, border:"2px solid #E8E0D0", boxShadow:"3px 4px 0 #E0D8CA" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🗂️</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#111110", letterSpacing:"-.5px", marginBottom:8 }}>
            {search || filterProv !== "all" || filterVis !== "all" ? "No boards match your filters" : "No moodboards yet"}
          </div>
          <div style={{ fontSize:14, color:"#9B8F7A", fontWeight:600, marginBottom:28 }}>
            {search || filterProv !== "all" || filterVis !== "all" ? "Try clearing your filters." : "Paste a Milanote, Pinterest, or Figma URL to get started."}
          </div>
          {!search && filterProv === "all" && filterVis === "all" && (
            <button onClick={() => { setEditBoard(undefined); setShowForm(true); }} style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"12px 24px", background:"#FFD400", border:"2px solid #111110", borderRadius:12, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110" }}>
              <Plus size={16} strokeWidth={3}/> Add first moodboard
            </button>
          )}
        </div>
      )}

      {/* ── GRID ── */}
      {!loading && filtered.length > 0 && (
        <div className="mb-grid">
          {filtered.map((board, i) => (
            <div key={board.id} style={{ animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${Math.min(i*.04,.3)}s both` }}>
              <MoodboardCard
                board={board}
                onEdit={() => { setEditBoard(board); setShowForm(true); }}
                onDelete={() => handleDelete(board.id)}
                onPreview={() => setPreview(board)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      {showForm && (
        <MoodboardFormModal
          existing={editBoard}
          onClose={() => { setShowForm(false); setEditBoard(undefined); }}
          onSaved={load}
        />
      )}
      {previewBoard && <PreviewModal board={previewBoard} onClose={() => setPreview(null)} />}
    </>
  );
}

// ── Shared styles ──────────────────────────────────────────────────
const LBL: React.CSSProperties = { display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:6 };
const INP: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"2px solid #E8E0D0", borderRadius:12, fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"#fff", outline:"none", transition:"border-color .15s", boxSizing:"border-box" };

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *{box-sizing:border-box} body{font-family:'Darker Grotesque',system-ui,sans-serif}

  .mb-search{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:11px;padding:0 12px;height:38px;flex:1;min-width:180px;max-width:280px;transition:border-color .15s}
  .mb-search:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.14)}
  .mb-search-input{flex:1;border:none;outline:none;font-family:inherit;font-size:13px;font-weight:600;color:#111110;background:transparent}
  .mb-search-input::placeholder{color:#C0B8A8}

  .mb-filter-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:99px;border:2px solid #E8E0D0;background:#fff;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:inherit}
  .mb-filter-btn:hover{border-color:#111110;color:#111110}
  .mb-filter-btn.active{background:#111110;border-color:#111110;color:#FFD400}

  .mb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}

  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  .mb-skeleton{background:linear-gradient(90deg,#F5F0E8 25%,#EDE8E0 50%,#F5F0E8 75%);background-size:800px 100%;animation:shimmer 1.4s ease-in-out infinite}

  @media(max-width:640px){
    .mb-header{flex-direction:column!important;align-items:flex-start!important}
    .mb-stats{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}
    .mb-toolbar{flex-wrap:wrap!important;gap:8px!important}
    .mb-search{max-width:100%!important;flex:1 1 100%!important}
    .mb-grid{grid-template-columns:1fr!important}
  }
`;
