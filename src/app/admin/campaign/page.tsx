"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GripVertical, Trash2, Eye, EyeOff, Plus, Upload,
  ImageIcon, Check, X, RefreshCw, Move,
} from "lucide-react";

// ─── SQL to run once in Supabase SQL editor ───────────────────────
// create table campaign_slides (
//   id uuid primary key default gen_random_uuid(),
//   image_url text not null,
//   phrase text not null default 'sleep',
//   "order" int not null default 0,
//   active boolean not null default true,
//   created_at timestamptz default now()
// );
// create storage bucket "campaign" (public: true);
// ─────────────────────────────────────────────────────────────────

type Slide = {
  id: string;
  image_url: string;
  phrase: string;
  order: number;
  active: boolean;
  _saving?: boolean;
  _editPhrase?: string;
};

const PHRASE_SUGGESTIONS = [
  "sleep", "travel", "create", "exhibit", "connect",
  "rest", "teach", "grow", "dream", "collaborate",
];

export default function CampaignAdminPage() {
  const sb = createClient();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const { data, error } = await sb
      .from("campaign_slides")
      .select("*")
      .order("order", { ascending: true });
    if (error) showToast("Failed to load slides", "err");
    else setSlides((data || []).map(s => ({ ...s, _editPhrase: s.phrase })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Upload image ───────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) { showToast("Images only", "err"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `slide-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("campaign").upload(path, file, { upsert: true });
    if (upErr) { showToast("Upload failed: " + upErr.message, "err"); setUploading(false); return; }

    const { data: urlData } = sb.storage.from("campaign").getPublicUrl(path);
    const nextOrder = slides.length > 0 ? Math.max(...slides.map(s => s.order)) + 1 : 0;

    const { error: insErr } = await sb.from("campaign_slides").insert({
      image_url: urlData.publicUrl,
      phrase: "sleep",
      order: nextOrder,
      active: true,
    });

    if (insErr) { showToast("DB insert failed", "err"); }
    else { showToast("Slide added ✓"); await load(); }
    setUploading(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  // ── Toggle active ──────────────────────────────────────────────
  async function toggleActive(id: string, current: boolean) {
    setSlides(s => s.map(x => x.id === id ? { ...x, _saving: true } : x));
    await sb.from("campaign_slides").update({ active: !current }).eq("id", id);
    setSlides(s => s.map(x => x.id === id ? { ...x, active: !current, _saving: false } : x));
  }

  // ── Save phrase ────────────────────────────────────────────────
  async function savePhrase(id: string, phrase: string) {
    if (!phrase.trim()) return;
    setSlides(s => s.map(x => x.id === id ? { ...x, _saving: true } : x));
    await sb.from("campaign_slides").update({ phrase: phrase.trim() }).eq("id", id);
    setSlides(s => s.map(x => x.id === id ? { ...x, phrase: phrase.trim(), _saving: false } : x));
    showToast("Saved ✓");
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function deleteSlide(id: string, imageUrl: string) {
    if (!confirm("Delete this slide?")) return;
    // Remove from storage too
    const path = imageUrl.split("/campaign/")[1];
    if (path) await sb.storage.from("campaign").remove([path]);
    await sb.from("campaign_slides").delete().eq("id", id);
    setSlides(s => s.filter(x => x.id !== id));
    showToast("Deleted");
  }

  // ── Reorder (drag-and-drop) ────────────────────────────────────
  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = slides.find(s => s.id === fromId)!;
    const to   = slides.find(s => s.id === toId)!;
    const reordered = slides.map(s => {
      if (s.id === fromId) return { ...s, order: to.order };
      if (s.id === toId)   return { ...s, order: from.order };
      return s;
    }).sort((a, b) => a.order - b.order);
    setSlides(reordered);
    await Promise.all([
      sb.from("campaign_slides").update({ order: to.order }).eq("id", fromId),
      sb.from("campaign_slides").update({ order: from.order }).eq("id", toId),
    ]);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Darker Grotesque', system-ui, sans-serif; background: #F5F0E8; color: #111110; }

        .adm-wrap { min-height: 100vh; background: #F5F0E8; }

        /* Header */
        .adm-header {
          background: #111110;
          border-bottom: 2px solid #333;
          padding: 0 40px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .adm-logo {
          font-size: 16px;
          font-weight: 900;
          color: #FFD400;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .adm-badge {
          background: #222;
          color: #555;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 10px;
          border-radius: 9999px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid #333;
        }
        .adm-body { max-width: 1000px; margin: 0 auto; padding: 48px 24px; }

        /* Page title */
        .adm-title { font-size: 36px; font-weight: 900; color: #111110; letter-spacing: -1.5px; margin-bottom: 4px; }
        .adm-sub { font-size: 15px; font-weight: 600; color: #9B8F7A; margin-bottom: 36px; }

        /* Upload zone */
        .upload-zone {
          border: 2.5px dashed #C0B8A8;
          border-radius: 16px;
          background: #fff;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          text-align: center;
          margin-bottom: 32px;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: #FFD400;
          background: #FFFBEA;
          box-shadow: 0 0 0 4px rgba(255,212,0,0.12);
        }
        .upload-zone-icon {
          width: 52px; height: 52px;
          border-radius: 12px;
          background: #FAF7F3;
          border: 2px solid #E8E0D0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-zone-title { font-size: 15px; font-weight: 800; color: #111110; }
        .upload-zone-sub   { font-size: 13px; font-weight: 600; color: #9B8F7A; }
        .btn-upload {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px;
          background: #FFD400;
          border: 2px solid #111110;
          border-radius: 10px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          color: #111110;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 2px 2px 0 #111110;
        }
        .btn-upload:hover { box-shadow: 4px 4px 0 #111110; transform: translate(-1px,-1px); }
        .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 2px 2px 0 #111110; }

        /* Slide cards */
        .slides-label {
          font-size: 11px; font-weight: 800; color: #9B8F7A;
          letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .slide-list { display: flex; flex-direction: column; gap: 12px; }
        .slide-card {
          background: #fff;
          border: 2px solid #E8E0D0;
          border-radius: 16px;
          display: grid;
          grid-template-columns: 32px 160px 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          box-shadow: 2px 3px 0 #D4C9A8;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .slide-card.inactive { opacity: 0.5; }
        .slide-card.is-dragging { opacity: 0.35; border-color: #FFD400; }
        .slide-card.drag-target { border-color: #FFD400; box-shadow: 0 0 0 3px rgba(255,212,0,0.3); }
        .drag-handle {
          color: #C0B8A8;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .drag-handle:hover { color: #111110; }
        .drag-handle:active { cursor: grabbing; }

        /* Thumbnail */
        .slide-thumb {
          width: 160px;
          height: 90px;
          border-radius: 10px;
          overflow: hidden;
          background: #FAF7F3;
          border: 1.5px solid #E8E0D0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slide-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Phrase editor */
        .phrase-editor { display: flex; flex-direction: column; gap: 8px; }
        .phrase-preview {
          font-size: 13px;
          font-weight: 700;
          color: #9B8F7A;
          margin-bottom: 4px;
        }
        .phrase-preview strong { color: #111110; }
        .phrase-input-row { display: flex; gap: 8px; align-items: center; }
        .phrase-input {
          flex: 1;
          max-width: 200px;
          padding: 8px 12px;
          border: 2px solid #E8E0D0;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          color: #111110;
          background: #FAF7F3;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .phrase-input:focus { border-color: #FFD400; box-shadow: 0 0 0 3px rgba(255,212,0,0.15); }
        .btn-save {
          padding: 8px 14px;
          background: #111110;
          color: #FFD400;
          border: none;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-save:hover { background: #1a1a1a; }
        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .suggestion-chip {
          padding: 3px 10px;
          border-radius: 9999px;
          background: #F5F0E8;
          border: 1.5px solid #E8E0D0;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          color: #9B8F7A;
          cursor: pointer;
          transition: all 0.15s;
        }
        .suggestion-chip:hover { background: #FFD400; border-color: #111110; color: #111110; }

        /* Action buttons */
        .slide-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .btn-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          border: 1.5px solid #E8E0D0;
          background: #fff;
          color: #9B8F7A;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .btn-icon:hover { border-color: #111110; color: #111110; background: #FAF7F3; }
        .btn-icon.danger:hover { border-color: #ef4444; color: #ef4444; background: #fff5f5; }
        .btn-icon.active-toggle { border-color: #16A34A; color: #16A34A; background: #DCFCE7; }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 60px 24px;
          background: #fff;
          border: 2px dashed #D4C9A8;
          border-radius: 16px;
          color: #9B8F7A;
        }
        .empty-state p { font-size: 15px; font-weight: 700; margin-top: 12px; }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 32px;
          right: 32px;
          background: #111110;
          color: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
          animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .toast.ok  { border-left: 3px solid #FFD400; }
        .toast.err { border-left: 3px solid #ef4444; }
        @keyframes toastIn { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }

        /* Saving spinner */
        .spin {
          width: 14px; height: 14px;
          border: 2px solid #FFD400;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 700px) {
          .slide-card { grid-template-columns: 28px 1fr; grid-template-rows: auto auto auto; }
          .slide-thumb { width: 100%; height: 160px; grid-column: 2; }
          .slide-actions { flex-direction: row; }
          .adm-body { padding: 24px 16px; }
        }
      `}</style>

      <div className="adm-wrap">

        {/* ── Header ── */}
        <header className="adm-header">
          <a href="/admin" className="adm-logo">🥭 artomango</a>
          <span className="adm-badge">Campaign Admin</span>
          <a href="/" style={{ color: "#555", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>← Back to site</a>
        </header>

        <div className="adm-body">
          <h1 className="adm-title">Campaign slides</h1>
          <p className="adm-sub">
            Manage the <strong>"Manage your art while you&nbsp;…"</strong> section. Each slide is a photo + one completing word.
          </p>

          {/* ── Preview link ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
            <a href="/#campaign" target="_blank" rel="noopener"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#FFFBEA", border: "2px solid #111110", borderRadius: 10, fontSize: 13, fontWeight: 800, color: "#111110", textDecoration: "none", boxShadow: "2px 2px 0 #111110", transition: "all 0.2s" }}>
              <Eye size={14} /> Preview on site
            </a>
            <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 13, fontWeight: 800, color: "#9B8F7A", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* ── Upload zone ── */}
          <div
            className={`upload-zone${dragOver ? " drag-over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          >
            <div className="upload-zone-icon">
              {uploading ? <div className="spin" /> : <Upload size={22} color="#9B8F7A" />}
            </div>
            <div>
              <p className="upload-zone-title">{uploading ? "Uploading…" : "Drop photos here"}</p>
              <p className="upload-zone-sub">JPG, PNG, WebP — any size, we'll handle it</p>
            </div>
            <button className="btn-upload" disabled={uploading} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
              <Plus size={14} /> Add photos
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />

          {/* ── Slide list ── */}
          <p className="slides-label">{slides.length} slide{slides.length !== 1 ? "s" : ""}</p>

          {loading ? (
            <div className="empty-state"><div className="spin" style={{ margin: "0 auto" }} /><p>Loading…</p></div>
          ) : slides.length === 0 ? (
            <div className="empty-state">
              <ImageIcon size={32} color="#C0B8A8" style={{ margin: "0 auto" }} />
              <p>No slides yet — upload your first campaign photo above.</p>
            </div>
          ) : (
            <div className="slide-list">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`slide-card${!slide.active ? " inactive" : ""}${dragging === slide.id ? " is-dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragging(slide.id)}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (dragging && dragging !== slide.id) reorder(dragging, slide.id); }}
                >
                  {/* Drag handle */}
                  <div className="drag-handle">
                    <GripVertical size={18} />
                  </div>

                  {/* Thumbnail */}
                  <div className="slide-thumb">
                    {slide.image_url
                      ? <img src={slide.image_url} alt="" loading="lazy" />
                      : <ImageIcon size={20} color="#C0B8A8" />
                    }
                  </div>

                  {/* Phrase editor */}
                  <div className="phrase-editor">
                    <p className="phrase-preview">
                      Manage your art while you&nbsp;
                      <strong>"{slide._editPhrase || slide.phrase}"</strong>
                    </p>
                    <div className="phrase-input-row">
                      <input
                        className="phrase-input"
                        value={slide._editPhrase ?? slide.phrase}
                        onChange={e => setSlides(s => s.map(x => x.id === slide.id ? { ...x, _editPhrase: e.target.value } : x))}
                        onKeyDown={e => { if (e.key === "Enter") savePhrase(slide.id, slide._editPhrase ?? slide.phrase); }}
                        placeholder="e.g. sleep"
                        maxLength={32}
                      />
                      <button className="btn-save" onClick={() => savePhrase(slide.id, slide._editPhrase ?? slide.phrase)}>
                        {slide._saving ? <div className="spin" /> : <><Check size={13} /> Save</>}
                      </button>
                    </div>
                    <div className="suggestions">
                      {PHRASE_SUGGESTIONS.map(p => (
                        <button key={p} className="suggestion-chip"
                          onClick={() => {
                            setSlides(s => s.map(x => x.id === slide.id ? { ...x, _editPhrase: p } : x));
                            savePhrase(slide.id, p);
                          }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="slide-actions">
                    <button
                      className={`btn-icon${slide.active ? " active-toggle" : ""}`}
                      title={slide.active ? "Active — click to hide" : "Hidden — click to show"}
                      onClick={() => toggleActive(slide.id, slide.active)}
                    >
                      {slide.active ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button className="btn-icon danger" title="Delete slide"
                      onClick={() => deleteSlide(slide.id, slide.image_url)}>
                      <Trash2 size={15} />
                    </button>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#C0B8A8", marginTop: 2, textAlign: "center" }}>
                      #{idx + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Setup note */}
          <details style={{ marginTop: 48 }}>
            <summary style={{ fontSize: 12, fontWeight: 800, color: "#9B8F7A", cursor: "pointer", letterSpacing: "0.05em" }}>
              ⚙️ First-time setup — Supabase SQL
            </summary>
            <pre style={{ marginTop: 12, background: "#111110", color: "#FFD400", padding: "16px 20px", borderRadius: 12, fontSize: 12, lineHeight: 1.7, overflow: "auto", border: "2px solid #333" }}>{`-- Run once in Supabase SQL editor
create table if not exists campaign_slides (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  phrase     text not null default 'sleep',
  "order"    int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz default now()
);

-- RLS: authenticated can manage, public can read
alter table campaign_slides enable row level security;
create policy "public read"   on campaign_slides for select using (true);
create policy "admin manage"  on campaign_slides for all
  using (auth.role() = 'authenticated');

-- Storage bucket (run in dashboard or SQL)
insert into storage.buckets (id, name, public)
values ('campaign', 'campaign', true)
on conflict do nothing;`}
            </pre>
          </details>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "ok" ? <Check size={14} color="#FFD400" /> : <X size={14} color="#ef4444" />}
          {toast.msg}
        </div>
      )}
    </>
  );
}
