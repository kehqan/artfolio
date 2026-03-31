"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Edit2, Trash2, ImageIcon,
  X, Upload, Share2, ExternalLink, MoreHorizontal,
} from "lucide-react";

type Artwork = {
  id: string; title: string; year?: number; medium?: string;
  dimensions?: string; price?: number; status: string;
  description?: string; location?: string; notes?: string;
  images?: string[]; created_at: string; user_id: string;
  sale_method?: string;
};

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  available:      { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  Available:      { label: "Available",    bg: "#DCFCE7", color: "#166534" },
  sold:           { label: "Sold",         bg: "#111110", color: "#FFD400" },
  Sold:           { label: "Sold",         bg: "#111110", color: "#FFD400" },
  reserved:       { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  Reserved:       { label: "Reserved",     bg: "#FEF9C3", color: "#854D0E" },
  "not for sale": { label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "Not for Sale": { label: "NFS",          bg: "#F3F4F6", color: "#374151" },
  "in storage":   { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
  "In Storage":   { label: "In Storage",   bg: "#E0F2FE", color: "#0C4A6E" },
};

const SALE_METHODS = [
  { value: "",                  label: "— Not specified —",  icon: "" },
  { value: "direct",           label: "Direct Purchase",    icon: "🛒" },
  { value: "inquiry",          label: "Inquiry Only",       icon: "✉️" },
  { value: "price_on_request", label: "Price on Request",   icon: "💬" },
  { value: "auction",          label: "Auction",            icon: "🔨" },
  { value: "not_for_sale",     label: "Not for Sale",       icon: "🚫" },
];

const TABS = ["General Information", "Provenance", "Exhibition History", "Notes"];

export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [artwork, setArtwork]   = useState<Artwork | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("General Information");
  const [activeImg, setActiveImg] = useState(0);
  const [editing, setEditing]   = useState(false);

  const [form, setForm] = useState({
    title: "", year: "", medium: "", dimensions: "", price: "",
    status: "Available", description: "", location: "", notes: "",
    sale_method: "",
  });
  const [saving, setSaving]         = useState(false);
  const [newFiles, setNewFiles]     = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setArtwork(data as Artwork);
        setForm({
          title: data.title || "",
          year: data.year ? String(data.year) : "",
          medium: data.medium || "",
          dimensions: data.dimensions || "",
          price: data.price ? String(data.price) : "",
          status: data.status || "Available",
          description: data.description || "",
          location: data.location || "",
          notes: data.notes || "",
          sale_method: data.sale_method || "",
        });
        setExistingImages(data.images || []);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this artwork permanently?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    router.push("/dashboard/artworks");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const res = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, contentType: file.type }),
      });
      const { signedUrl } = await res.json();
      if (signedUrl) {
        await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        const { data: { publicUrl } } = supabase.storage.from("artwork-images").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }

    const updated = {
      title: form.title,
      year: form.year ? parseInt(form.year) : null,
      medium: form.medium || null,
      dimensions: form.dimensions || null,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      description: form.description || null,
      location: form.location || null,
      notes: form.notes || null,
      sale_method: form.sale_method || null,
      images: [...existingImages, ...uploadedUrls],
    };

    const { data } = await supabase.from("artworks").update(updated).eq("id", id).select().single();
    if (data) { setArtwork(data as Artwork); setExistingImages(data.images || []); }
    setNewFiles([]); setNewPreviews([]);
    setSaving(false); setEditing(false);
  }

  function handleNewImages(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).slice(0, 5 - existingImages.length - newFiles.length);
    setNewFiles(p => [...p, ...list]);
    list.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setNewPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  if (loading) return <div style={{ padding: 80, textAlign: "center", color: "#9B8F7A", fontSize: 14 }}>Loading…</div>;
  if (!artwork) return <div style={{ padding: 40, textAlign: "center", color: "#9B8F7A" }}>Artwork not found</div>;

  const statusCfg = STATUS_CFG[artwork.status] ?? { label: artwork.status, bg: "#F5F0E8", color: "#5C5346" };
  const currentSaleMethod = SALE_METHODS.find(m => m.value === (artwork.sale_method || ""));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "2px solid #111110", borderRadius: 6,
    fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.1s, box-shadow 0.1s",
  };
  const readStyle = {
    padding: "10px 12px", border: "2px solid #E0D8CA", borderRadius: 6,
    fontSize: 14, minHeight: 42, display: "flex", alignItems: "center",
  };
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 }}>
      {children}
    </label>
  );

  return (
    <>
      <style>{`
        .ad-tab:hover { background: #F5F0E8 !important; }
        .ad-input:focus { border-color: #FFD400 !important; box-shadow: 0 0 0 3px rgba(255,212,0,0.15) !important; }
        .ad-action:hover { background: #F5F0E8 !important; }
        .ad-imgth:hover { border-color: #FFD400 !important; }
      `}</style>

      <div>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Link href="/dashboard/artworks">
            <button style={{ width: 36, height: 36, border: "2px solid #111110", borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
              <ArrowLeft size={15} />
            </button>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", flex: 1 }}>{artwork.title}</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditing(!editing)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "2px solid #111110", borderRadius: 6, background: editing ? "#FFD400" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
              <Edit2 size={13} /> {editing ? "Cancel" : "Edit"}
            </button>
            <button onClick={handleDelete} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "2px solid #cc0000", borderRadius: 6, background: "#fff", color: "#cc0000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

          {/* LEFT PANEL */}
          <div>
            {/* Image gallery */}
            <div style={{ border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "4px 4px 0 #111110", marginBottom: 16, background: "#F5F0E8" }}>
              <div style={{ position: "relative", aspectRatio: "1/1" }}>
                {(artwork.images?.[activeImg] ?? null) ? (
                  <img src={artwork.images![activeImg]} alt={artwork.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <ImageIcon size={40} color="#9B8F7A" />
                    <span style={{ fontSize: 12, color: "#9B8F7A" }}>No image</span>
                  </div>
                )}
              </div>
              {(artwork.images?.length ?? 0) > 1 && (
                <div style={{ display: "flex", gap: 6, padding: "10px", borderTop: "2px solid #111110" }}>
                  {artwork.images!.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} className="ad-imgth" style={{ width: 44, height: 44, border: `2px solid ${activeImg === i ? "#FFD400" : "#d4cfc4"}`, borderRadius: 4, overflow: "hidden", padding: 0, cursor: "pointer", background: "none", transition: "border-color 0.1s" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info card */}
            <div style={{ border: "2px solid #111110", borderRadius: 8, boxShadow: "4px 4px 0 #111110", background: "#fff", overflow: "hidden" }}>
              {/* Identity */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E0D8CA" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 2 }}>{artwork.title}</div>
                {artwork.year && <div style={{ fontSize: 11, color: "#9B8F7A" }}>{artwork.year}</div>}
                {artwork.medium && (
                  <span style={{ marginTop: 6, display: "inline-block", padding: "2px 9px", border: "1.5px solid #d4cfc4", borderRadius: 20, fontSize: 10, fontWeight: 600, color: "#5C5346", background: "#F5F0E8" }}>{artwork.medium}</span>
                )}
              </div>

              {/* Detail rows */}
              {[
                { label: "Price",      value: artwork.price ? `$${artwork.price.toLocaleString()}` : "—", mono: true },
                { label: "Dimensions", value: artwork.dimensions || "—", mono: false },
                { label: "Location",   value: artwork.location || "—", mono: false },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid #E0D8CA" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", fontFamily: row.mono ? "monospace" : "inherit" }}>{row.value}</span>
                </div>
              ))}

              {/* Status row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid #E0D8CA" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</span>
                <span style={{ background: statusCfg.bg, color: statusCfg.color, border: "2px solid #111110", padding: "2px 9px", borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{statusCfg.label}</span>
              </div>

              {/* Sale method row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid #E0D8CA" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sale Method</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5C5346" }}>
                  {currentSaleMethod?.value ? `${currentSaleMethod.icon} ${currentSaleMethod.label}` : "—"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ padding: "10px 12px", display: "flex", gap: 6 }}>
                <button className="ad-action" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", border: "1.5px solid #d4cfc4", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#5C5346", background: "#fff", cursor: "pointer", transition: "background 0.1s" }}>
                  <Share2 size={11} /> Share
                </button>
                <button className="ad-action" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", border: "1.5px solid #d4cfc4", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#5C5346", background: "#fff", cursor: "pointer", transition: "background 0.1s" }}>
                  <ExternalLink size={11} /> Portfolio
                </button>
                <button className="ad-action" style={{ width: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", border: "1.5px solid #d4cfc4", borderRadius: 6, color: "#5C5346", background: "#fff", cursor: "pointer", transition: "background 0.1s" }}>
                  <MoreHorizontal size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #111110" }}>
              {TABS.map(t => (
                <button key={t} className="ad-tab" onClick={() => setActiveTab(t)} style={{ padding: "11px 18px", border: "none", borderBottom: activeTab === t ? "3px solid #FFD400" : "none", background: activeTab === t ? "#FFD400" : "transparent", fontSize: 12, fontWeight: 700, color: "#111110", cursor: "pointer", marginBottom: activeTab === t ? -2 : 0, transition: "background 0.1s" }}>
                  {t}
                </button>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                  <MoreHorizontal size={13} /> Actions
                </button>
              </div>
            </div>

            {/* Tab body */}
            <div style={{ border: "2px solid #111110", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "4px 4px 0 #111110", background: "#fff", padding: "24px" }}>

              {activeTab === "General Information" && (
                <form onSubmit={handleSave}>

                  {/* Images */}
                  <div style={{ marginBottom: 22 }}>
                    <Label>Images</Label>
                    <div style={{ border: "2px dashed #d4cfc4", borderRadius: 8, padding: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {existingImages.map((src, i) => (
                        <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                          <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: "2px solid #111110", borderRadius: 4 }} />
                          {editing && (
                            <button type="button" onClick={() => setExistingImages(p => p.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#111110", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {newPreviews.map((src, i) => (
                        <div key={`new-${i}`} style={{ position: "relative", width: 80, height: 80 }}>
                          <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: "2px solid #4ECDC4", borderRadius: 4 }} />
                          <button type="button" onClick={() => { setNewPreviews(p => p.filter((_, idx) => idx !== i)); setNewFiles(p => p.filter((_, idx) => idx !== i)); }} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#111110", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {editing && existingImages.length + newFiles.length < 5 && (
                        <label style={{ width: 80, height: 80, border: "2px dashed #9B8F7A", borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 4 }}>
                          <Upload size={16} color="#9B8F7A" />
                          <span style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>Add</span>
                          <input type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => handleNewImages(e.target.files)} />
                        </label>
                      )}
                      {!editing && existingImages.length === 0 && <div style={{ color: "#9B8F7A", fontSize: 13 }}>No images uploaded</div>}
                    </div>
                  </div>

                  {/* Title + Status */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <Label>Title *</Label>
                      {editing
                        ? <input required className="ad-input" value={form.title} onChange={set("title")} style={inputStyle} />
                        : <div style={{ ...readStyle, fontWeight: 600, color: "#111110" }}>{artwork.title}</div>
                      }
                    </div>
                    <div>
                      <Label>Status</Label>
                      {editing
                        ? <select className="ad-input" value={form.status} onChange={set("status")} style={{ ...inputStyle, background: "#fff", cursor: "pointer" }}>
                            <option>Available</option><option>Sold</option><option>Reserved</option>
                            <option>Not for Sale</option><option>In Storage</option>
                          </select>
                        : <div style={readStyle}>
                            <span style={{ background: statusCfg.bg, color: statusCfg.color, border: "2px solid #111110", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{statusCfg.label}</span>
                          </div>
                      }
                    </div>
                  </div>

                  {/* Medium + Year */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <Label>Medium</Label>
                      {editing
                        ? <input className="ad-input" value={form.medium} onChange={set("medium")} placeholder="Oil on canvas" style={inputStyle} />
                        : <div style={{ ...readStyle, color: artwork.medium ? "#111110" : "#9B8F7A" }}>{artwork.medium || "—"}</div>
                      }
                    </div>
                    <div>
                      <Label>Year</Label>
                      {editing
                        ? <input className="ad-input" type="number" value={form.year} onChange={set("year")} placeholder="2024" style={inputStyle} />
                        : <div style={{ ...readStyle, color: artwork.year ? "#111110" : "#9B8F7A" }}>{artwork.year || "—"}</div>
                      }
                    </div>
                  </div>

                  {/* Dimensions + Price */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <Label>Dimensions</Label>
                      {editing
                        ? <input className="ad-input" value={form.dimensions} onChange={set("dimensions")} placeholder='24" × 36"' style={inputStyle} />
                        : <div style={{ ...readStyle, color: artwork.dimensions ? "#111110" : "#9B8F7A" }}>{artwork.dimensions || "—"}</div>
                      }
                    </div>
                    <div>
                      <Label>Price (USD)</Label>
                      {editing
                        ? <input className="ad-input" type="number" value={form.price} onChange={set("price")} placeholder="0.00" style={{ ...inputStyle, fontFamily: "monospace" }} />
                        : <div style={{ ...readStyle, fontFamily: "monospace", fontWeight: 700, color: artwork.price ? "#111110" : "#9B8F7A" }}>{artwork.price ? `$${artwork.price.toLocaleString()}` : "—"}</div>
                      }
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ marginBottom: 16 }}>
                    <Label>Location</Label>
                    {editing
                      ? <input className="ad-input" value={form.location} onChange={set("location")} placeholder="Studio / Gallery name / Storage…" style={inputStyle} />
                      : <div style={{ ...readStyle, color: artwork.location ? "#111110" : "#9B8F7A" }}>{artwork.location || "—"}</div>
                    }
                  </div>

                  {/* ── SALE METHOD ── */}
                  <div style={{ marginBottom: 16 }}>
                    <Label>Sale Method</Label>
                    {editing ? (
                      <select className="ad-input" value={form.sale_method} onChange={set("sale_method")} style={{ ...inputStyle, background: "#fff", cursor: "pointer" }}>
                        {SALE_METHODS.map(m => (
                          <option key={m.value} value={m.value}>{m.icon ? `${m.icon} ` : ""}{m.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={readStyle}>
                        {currentSaleMethod?.value ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{currentSaleMethod.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#111110" }}>{currentSaleMethod.label}</span>
                          </span>
                        ) : (
                          <span style={{ color: "#9B8F7A" }}>Not specified</span>
                        )}
                      </div>
                    )}
                    {!editing && (
                      <p style={{ fontSize: 11, color: "#9B8F7A", marginTop: 6 }}>
                        This appears on your public portfolio so collectors know how to acquire the work.
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: editing ? 24 : 0 }}>
                    <Label>Description</Label>
                    {editing
                      ? <textarea className="ad-input" rows={4} value={form.description} onChange={set("description")} placeholder="Describe this work…" style={{ ...inputStyle, resize: "vertical" }} />
                      : <div style={{ ...readStyle, alignItems: "flex-start", lineHeight: 1.6, minHeight: 80, color: artwork.description ? "#111110" : "#9B8F7A" }}>{artwork.description || "No description added."}</div>
                    }
                  </div>

                  {editing && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
                      <button type="button" onClick={() => setEditing(false)} style={{ padding: "11px 24px", border: "2px solid #111110", borderRadius: 6, background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        Reset Changes
                      </button>
                      <button type="submit" disabled={saving} style={{ padding: "11px 28px", border: "2px solid #111110", borderRadius: 6, background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", boxShadow: "3px 3px 0 #111110" }}>
                        {saving ? "Saving…" : "Update Artwork"}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {activeTab === "Notes" && (
                <div>
                  <Label>Internal Notes</Label>
                  <div style={{ padding: "16px", border: "2px solid #E0D8CA", borderRadius: 8, fontSize: 14, color: artwork.notes ? "#111110" : "#9B8F7A", lineHeight: 1.7, background: "#FAFAF8", minHeight: 120 }}>
                    {artwork.notes || "No notes yet. Switch to edit mode to add notes."}
                  </div>
                </div>
              )}

              {(activeTab === "Provenance" || activeTab === "Exhibition History") && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "#9B8F7A" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 6 }}>{activeTab}</div>
                  <div style={{ fontSize: 13 }}>This section is coming soon.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
