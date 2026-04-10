"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Slide = {
  id: string;
  image_url: string;
  order: number;
  active: boolean;
  text_x: number;
  text_y: number;
  text_content: string;
  text_color: string;
  text_size: number;
  quote_open_x: number;
  quote_open_y: number;
  quote_close_x: number;
  quote_close_y: number;
  quote_color: string;
  quote_size: number;
};

type DragTarget = "text" | "open" | "close" | null;

// ── Colour presets ────────────────────────────────────────────────
const TEXT_COLORS  = ["#ffffff","#111110","#FFD400","#4ECDC4","#FF6B6B","#000000"];
const QUOTE_COLORS = ["#FFD400","#ffffff","#4ECDC4","#FF6B6B","#111110","#000000"];

// ── Slide editor ──────────────────────────────────────────────────
function SlideEditor({ slide, onSave }: { slide: Slide; onSave: (s: Slide) => void }) {
  const [p, setP] = useState({
    text_x:        slide.text_x,
    text_y:        slide.text_y,
    text_content:  slide.text_content  || "Art while you",
    text_color:    slide.text_color    || "#ffffff",
    text_size:     slide.text_size     || 72,
    quote_open_x:  slide.quote_open_x,
    quote_open_y:  slide.quote_open_y,
    quote_close_x: slide.quote_close_x,
    quote_close_y: slide.quote_close_y,
    quote_color:   slide.quote_color   || "#FFD400",
    quote_size:    slide.quote_size    || 120,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const dragRef  = useRef<DragTarget>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── drag helpers ─────────────────────────────────────────────
  function getPct(e: MouseEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(98, Math.max(0, ((e.clientX - r.left) / r.width)  * 100)),
      y: Math.min(98, Math.max(0, ((e.clientY - r.top)  / r.height) * 100)),
    };
  }
  function startDrag(target: DragTarget, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = target;
    setDragging(target);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current || !canvasRef.current) return;
      const { x, y } = getPct(e);
      const t = dragRef.current;
      setP(prev => ({
        ...prev,
        ...(t === "text"  ? { text_x: x,        text_y: y }        : {}),
        ...(t === "open"  ? { quote_open_x: x,   quote_open_y: y }  : {}),
        ...(t === "close" ? { quote_close_x: x,  quote_close_y: y } : {}),
      }));
    }
    function onUp() { dragRef.current = null; setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── save ──────────────────────────────────────────────────────
  async function save() {
    setSaving(true);
    const sb = createClient();
    await sb.from("campaign_slides").update(p).eq("id", slide.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2200);
    onSave({ ...slide, ...p });
  }

  // ── preview scale for font sizes ─────────────────────────────
  // Canvas is ~16/9 at whatever CSS width. We scale displayed sizes
  // proportionally so what you see matches the full-page render.
  const CANVAS_REF_W = 1280; // assume full-page width
  const [canvasW, setCanvasW] = useState(640);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([e]) => setCanvasW(e.contentRect.width));
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);
  const scale = canvasW / CANVAS_REF_W;

  return (
    <div style={{ fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>

      {/* ── Controls panel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>

        {/* Text block */}
        <div style={{ background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 12 }}>
            Text — "Art while you"
          </div>

          {/* Edit text */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "block", marginBottom: 4 }}>Content</label>
            <input
              value={p.text_content}
              onChange={e => setP(v => ({ ...v, text_content: e.target.value }))}
              style={{ width: "100%", padding: "7px 10px", border: "2px solid #E8E0D0", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", outline: "none", color: "#111110", background: "#fff" }}
              onFocus={e => e.target.style.borderColor = "#FFD400"}
              onBlur={e  => e.target.style.borderColor = "#E8E0D0"}
            />
          </div>

          {/* Font size */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              Size <strong style={{ color: "#111110" }}>{p.text_size}px</strong>
            </label>
            <input type="range" min={24} max={140} value={p.text_size}
              onChange={e => setP(v => ({ ...v, text_size: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: "#FFD400" }} />
          </div>

          {/* Color swatches */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "block", marginBottom: 6 }}>Color</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {TEXT_COLORS.map(c => (
                <div key={c} onClick={() => setP(v => ({ ...v, text_color: c }))}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: p.text_color === c ? "3px solid #111110" : "2px solid #E8E0D0", cursor: "pointer", flexShrink: 0, transition: "transform .15s", transform: p.text_color === c ? "scale(1.2)" : "scale(1)" }} />
              ))}
              {/* Custom color */}
              <label style={{ position: "relative", width: 24, height: 24, borderRadius: "50%", border: "2px dashed #C0B8A8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#9B8F7A", overflow: "hidden" }}
                title="Custom color">
                +
                <input type="color" value={p.text_color} onChange={e => setP(v => ({ ...v, text_color: e.target.value }))}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </label>
            </div>
          </div>
        </div>

        {/* Quote marks block */}
        <div style={{ background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 12 }}>
            ❝ ❞ Quote marks
          </div>

          {/* Quote size */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              Size <strong style={{ color: "#111110" }}>{p.quote_size}px</strong>
            </label>
            <input type="range" min={40} max={260} value={p.quote_size}
              onChange={e => setP(v => ({ ...v, quote_size: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: "#FFD400" }} />
          </div>

          {/* Quote color */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "block", marginBottom: 6 }}>Color</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {QUOTE_COLORS.map(c => (
                <div key={c} onClick={() => setP(v => ({ ...v, quote_color: c }))}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: p.quote_color === c ? "3px solid #111110" : "2px solid #E8E0D0", cursor: "pointer", flexShrink: 0, transition: "transform .15s", transform: p.quote_color === c ? "scale(1.2)" : "scale(1)" }} />
              ))}
              <label style={{ position: "relative", width: 24, height: 24, borderRadius: "50%", border: "2px dashed #C0B8A8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#9B8F7A", overflow: "hidden" }}
                title="Custom color">
                +
                <input type="color" value={p.quote_color} onChange={e => setP(v => ({ ...v, quote_color: e.target.value }))}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </label>
            </div>
          </div>

          {/* Hint */}
          <div style={{ marginTop: 14, padding: "8px 12px", background: "#fff", borderRadius: 8, border: "1.5px solid #E8E0D0", fontSize: 11, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.5 }}>
            Both ❝ and ❞ share the same size & color.<br/>Drag each one independently on the canvas.
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
        Drag each element to position it on the image ↓
      </div>
      <div
        ref={canvasRef}
        style={{
          position: "relative", width: "100%", aspectRatio: "16/9",
          borderRadius: 12, overflow: "hidden",
          border: "2px solid #E8E0D0", background: "#0a0a0a",
          cursor: dragging ? "grabbing" : "default",
          userSelect: "none",
        }}
      >
        <img
          src={slide.image_url} alt="" draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block", pointerEvents: "none" }}
        />
        {/* overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,.12) 0%,rgba(0,0,0,.05) 50%,rgba(0,0,0,.28) 100%)", pointerEvents: "none" }} />

        {/* ── Text handle ── */}
        <div
          onMouseDown={e => startDrag("text", e)}
          style={{
            position: "absolute",
            left: `${p.text_x}%`, top: `${p.text_y}%`,
            transform: "translateY(-50%)",
            fontSize: `${p.text_size * scale}px`,
            fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1,
            color: p.text_color,
            textShadow: "0 2px 16px rgba(0,0,0,.6)",
            whiteSpace: "nowrap",
            cursor: "grab",
            outline: dragging === "text" ? `2px solid ${p.text_color === "#ffffff" ? "#FFD400" : "#fff"}` : "2px dashed rgba(255,255,255,.45)",
            outlineOffset: 5, borderRadius: 4, padding: "1px 3px",
            fontFamily: "'Darker Grotesque', system-ui, sans-serif",
          }}
        >
          {p.text_content}
        </div>

        {/* ── Open quote handle ── */}
        <div
          onMouseDown={e => startDrag("open", e)}
          style={{
            position: "absolute",
            left: `${p.quote_open_x}%`, top: `${p.quote_open_y}%`,
            fontSize: `${p.quote_size * scale}px`,
            fontWeight: 900, lineHeight: 0.75,
            color: p.quote_color,
            textShadow: "0 2px 12px rgba(0,0,0,.4)",
            cursor: "grab",
            outline: dragging === "open" ? "2px solid #fff" : `2px dashed ${p.quote_color}88`,
            outlineOffset: 4, borderRadius: 4, padding: "1px 3px",
            fontFamily: "'Darker Grotesque', system-ui, sans-serif",
          }}
        >
          &ldquo;
        </div>

        {/* ── Close quote handle ── */}
        <div
          onMouseDown={e => startDrag("close", e)}
          style={{
            position: "absolute",
            left: `${p.quote_close_x}%`, top: `${p.quote_close_y}%`,
            fontSize: `${p.quote_size * scale}px`,
            fontWeight: 900, lineHeight: 0.75,
            color: p.quote_color,
            textShadow: "0 2px 12px rgba(0,0,0,.4)",
            cursor: "grab",
            outline: dragging === "close" ? "2px solid #fff" : `2px dashed ${p.quote_color}88`,
            outlineOffset: 4, borderRadius: 4, padding: "1px 3px",
            fontFamily: "'Darker Grotesque', system-ui, sans-serif",
          }}
        >
          &rdquo;
        </div>
      </div>

      {/* ── Save ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button
          onClick={save} disabled={saving}
          style={{
            padding: "10px 24px",
            background: saved ? "#16A34A" : "#111110",
            color: saved ? "#fff" : "#FFD400",
            border: "2px solid #111110", borderRadius: 10,
            fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", transition: "all .2s",
            boxShadow: "2px 2px 0 #D4C9A8",
            display: "flex", alignItems: "center", gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save all changes"}
        </button>
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────
export default function CampaignAdminPage() {
  const sb = createClient();
  const [slides,     setSlides]     = useState<Slide[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const { data } = await sb.from("campaign_slides").select("*").order("order", { ascending: true });
    setSlides(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) { showToast("Images only", false); return; }
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `slide-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("campaign").upload(path, file, { upsert: true });
    if (upErr) { showToast("Upload failed: " + upErr.message, false); setUploading(false); return; }
    const { data: urlData } = sb.storage.from("campaign").getPublicUrl(path);
    const nextOrder = slides.length > 0 ? Math.max(...slides.map(s => s.order)) + 1 : 0;
    const { data: inserted, error: insErr } = await sb.from("campaign_slides").insert({
      image_url:     urlData.publicUrl,
      order:         nextOrder,
      active:        true,
      text_x:        5,   text_y:        52,
      text_content:  "Art while you",
      text_color:    "#ffffff",
      text_size:     72,
      quote_open_x:  42,  quote_open_y:  28,
      quote_close_x: 65,  quote_close_y: 28,
      quote_color:   "#FFD400",
      quote_size:    120,
    }).select().single();
    if (insErr) { showToast("DB error: " + insErr.message, false); }
    else {
      showToast("Photo added — adjust positions & style below ↓");
      await load();
      setExpanded(inserted.id);
    }
    setUploading(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  async function toggleActive(id: string, cur: boolean) {
    await sb.from("campaign_slides").update({ active: !cur }).eq("id", id);
    setSlides(s => s.map(x => x.id === id ? { ...x, active: !cur } : x));
  }

  async function deleteSlide(id: string, imageUrl: string) {
    if (!confirm("Delete this slide?")) return;
    const path = imageUrl.split("/campaign/")[1];
    if (path) await sb.storage.from("campaign").remove([path]);
    await sb.from("campaign_slides").delete().eq("id", id);
    setSlides(s => s.filter(x => x.id !== id));
    if (expanded === id) setExpanded(null);
    showToast("Deleted");
  }

  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = slides.find(s => s.id === fromId)!;
    const to   = slides.find(s => s.id === toId)!;
    const reordered = slides
      .map(s => s.id === fromId ? { ...s, order: to.order } : s.id === toId ? { ...s, order: from.order } : s)
      .sort((a, b) => a.order - b.order);
    setSlides(reordered);
    await Promise.all([
      sb.from("campaign_slides").update({ order: to.order }).eq("id", fromId),
      sb.from("campaign_slides").update({ order: from.order }).eq("id", toId),
    ]);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Darker Grotesque',system-ui,sans-serif;background:#F5F0E8;color:#111110}

        .adm-header{background:#111110;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;position:sticky;top:0;z-index:50}
        .adm-logo{font-size:15px;font-weight:900;color:#FFD400;text-decoration:none}
        .adm-badge{background:#222;color:#666;font-size:10px;font-weight:800;padding:2px 10px;border-radius:9999px;letter-spacing:.12em;text-transform:uppercase;border:1px solid #333}
        .adm-body{max-width:960px;margin:0 auto;padding:44px 24px}
        .adm-title{font-size:32px;font-weight:900;letter-spacing:-1px;margin-bottom:4px}
        .adm-sub{font-size:14px;font-weight:600;color:#9B8F7A;margin-bottom:32px}

        .upload-zone{border:2.5px dashed #C0B8A8;border-radius:14px;background:#fff;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:all .2s;margin-bottom:28px;text-align:center}
        .upload-zone:hover,.upload-zone.dz{border-color:#FFD400;background:#FFFBEA;box-shadow:0 0 0 4px rgba(255,212,0,.1)}
        .btn-add{padding:9px 20px;background:#FFD400;border:2px solid #111110;border-radius:10px;font-size:13px;font-weight:800;color:#111110;cursor:pointer;font-family:inherit;box-shadow:2px 2px 0 #111110;transition:all .2s}
        .btn-add:hover{box-shadow:4px 4px 0 #111110;transform:translate(-1px,-1px)}
        .btn-add:disabled{opacity:.5;transform:none;pointer-events:none}

        .slides-label{font-size:10px;font-weight:800;color:#9B8F7A;letter-spacing:.18em;text-transform:uppercase;margin-bottom:12px}

        .slide-card{background:#fff;border:2px solid #E8E0D0;border-radius:14px;box-shadow:2px 3px 0 #D4C9A8;margin-bottom:10px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
        .slide-card.open{border-color:#FFD400;box-shadow:3px 4px 0 #e6bc00}
        .slide-header{display:grid;grid-template-columns:28px 140px 1fr auto;align-items:center;gap:12px;padding:12px 16px;cursor:pointer}
        .slide-header:hover{background:#FAF7F3}
        .drag-handle{color:#C0B8A8;display:flex;align-items:center;cursor:grab;padding:4px;border-radius:6px}
        .drag-handle:hover{color:#111110}
        .s-thumb{width:140px;height:79px;border-radius:8px;overflow:hidden;background:#F5F0E8;border:1.5px solid #E8E0D0;flex-shrink:0}
        .s-thumb img{width:100%;height:100%;object-fit:cover}
        .s-actions{display:flex;gap:6px;align-items:center}
        .btn-icon{width:32px;height:32px;border-radius:8px;border:1.5px solid #E8E0D0;background:#fff;color:#9B8F7A;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .15s;flex-shrink:0}
        .btn-icon:hover{border-color:#111110;color:#111110}
        .btn-icon.eye-on{border-color:#16A34A;color:#16A34A;background:#DCFCE7}
        .btn-icon.del:hover{border-color:#ef4444;color:#ef4444;background:#fff5f5}
        .btn-edit{padding:6px 14px;background:#111110;color:#FFD400;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s}
        .btn-edit.is-open{background:#FFD400;color:#111110}
        .slide-body{padding:20px;border-top:1px solid #F0EBE3}

        .empty-state{text-align:center;padding:60px 24px;background:#fff;border:2px dashed #D4C9A8;border-radius:14px;color:#9B8F7A}

        .toast{position:fixed;bottom:28px;right:28px;background:#111110;color:#fff;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:700;z-index:999;display:flex;align-items:center;gap:8px;box-shadow:4px 4px 0 rgba(0,0,0,.2);animation:tin .3s cubic-bezier(.16,1,.3,1)}
        .toast.ok{border-left:3px solid #FFD400}
        .toast.err{border-left:3px solid #ef4444}
        @keyframes tin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .spin{width:14px;height:14px;border:2px solid #FFD400;border-top-color:transparent;border-radius:50%;animation:sp .7s linear infinite}
        @keyframes sp{to{transform:rotate(360deg)}}
      `}</style>

      <header className="adm-header">
        <a href="/admin" className="adm-logo">🥭 artomango</a>
        <span className="adm-badge">Campaign Admin</span>
        <a href="/" style={{ fontSize: 12, fontWeight: 700, color: "#555", textDecoration: "none" }}>← Back to site</a>
      </header>

      <div className="adm-body">
        <h1 className="adm-title">Campaign slides</h1>
        <p className="adm-sub">
          Upload a photo, then position &amp; style <strong>"Art while you"</strong> and the <strong style={{ color: "#856a00" }}>❝ ❞</strong> marks — drag to place, slider for size, swatches for color.
        </p>

        {/* Upload zone */}
        <div
          className={`upload-zone${dragOver ? " dz" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <div style={{ fontSize: 36 }}>{uploading ? <div className="spin" /> : "📸"}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 2 }}>
              {uploading ? "Uploading…" : "Drop your campaign photo here"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>
              JPG, PNG, WebP · After upload, edit positions, sizes &amp; colors below
            </div>
          </div>
          <button className="btn-add" disabled={uploading} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
            + Add photo
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />

        <p className="slides-label">{slides.length} slide{slides.length !== 1 ? "s" : ""}</p>

        {loading ? (
          <div className="empty-state"><div className="spin" style={{ margin: "0 auto" }} /></div>
        ) : slides.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <p style={{ fontSize: 15, fontWeight: 700 }}>No slides yet. Upload your first photo above.</p>
          </div>
        ) : (
          slides.map((slide, idx) => {
            const isOpen = expanded === slide.id;
            return (
              <div
                key={slide.id}
                className={`slide-card${isOpen ? " open" : ""}`}
                draggable
                onDragStart={() => setDraggingId(slide.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (draggingId && draggingId !== slide.id) reorder(draggingId, slide.id); }}
              >
                <div className="slide-header" onClick={() => setExpanded(isOpen ? null : slide.id)}>
                  <div className="drag-handle">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <circle cx="4" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.2"/><circle cx="4" cy="11" r="1.2"/>
                      <circle cx="10" cy="3" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
                    </svg>
                  </div>
                  <div className="s-thumb"><img src={slide.image_url} alt="" loading="lazy" /></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#C0B8A8", letterSpacing: ".1em" }}>#{idx + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>
                      {isOpen ? "Close editor ↑" : "Click to edit positions, sizes & colors ↓"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#C0B8A8" }}>
                      Text: "{slide.text_content || "Art while you"}"
                    </span>
                  </div>
                  <div className="s-actions" onClick={e => e.stopPropagation()}>
                    <div className={`btn-icon${slide.active ? " eye-on" : ""}`} onClick={() => toggleActive(slide.id, slide.active)} title={slide.active ? "Visible" : "Hidden"}>
                      {slide.active ? "👁" : "🙈"}
                    </div>
                    <div className="btn-icon del" onClick={() => deleteSlide(slide.id, slide.image_url)} title="Delete">✕</div>
                    <button className={`btn-edit${isOpen ? " is-open" : ""}`} onClick={() => setExpanded(isOpen ? null : slide.id)}>
                      {isOpen ? "Done" : "Edit"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="slide-body">
                    <SlideEditor
                      slide={slide}
                      onSave={updated => setSlides(s => s.map(x => x.id === updated.id ? updated : x))}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* SQL migration */}
        <details style={{ marginTop: 48 }}>
          <summary style={{ fontSize: 12, fontWeight: 800, color: "#9B8F7A", cursor: "pointer" }}>⚙️ SQL migration — run this if upgrading from a previous version</summary>
          <pre style={{ marginTop: 10, background: "#111110", color: "#FFD400", padding: "16px 20px", borderRadius: 12, fontSize: 12, lineHeight: 1.7, overflow: "auto", border: "2px solid #333" }}>{`alter table campaign_slides
  add column if not exists text_x        float   default 5,
  add column if not exists text_y        float   default 52,
  add column if not exists text_content  text    default 'Art while you',
  add column if not exists text_color    text    default '#ffffff',
  add column if not exists text_size     int     default 72,
  add column if not exists quote_open_x  float   default 42,
  add column if not exists quote_open_y  float   default 28,
  add column if not exists quote_close_x float   default 65,
  add column if not exists quote_close_y float   default 28,
  add column if not exists quote_color   text    default '#FFD400',
  add column if not exists quote_size    int     default 120;

alter table campaign_slides drop column if exists phrase;`}
          </pre>
        </details>
      </div>

      {toast && (
        <div className={`toast ${toast.ok ? "ok" : "err"}`}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </>
  );
}
