"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Upload, X, Save, ImageIcon, Plus, Check,
  Monitor, Frame, Layers, Palette, Link2, ExternalLink,
  Hash, Globe, Eye, EyeOff,
} from "lucide-react";
import PlacesAutocomplete, { PlaceResult } from "@/components/PlacesAutocomplete";

// ── Types ──────────────────────────────────────────────────────────
type ArtType = "physical" | "digital" | "print" | "mixed";

type Moodboard = {
  id: string; title: string; provider: string;
  thumbnail_url?: string; og_image?: string; url: string;
};

// ── Config ─────────────────────────────────────────────────────────
const ART_TYPES: { key: ArtType; label: string; emoji: string; desc: string; color: string; bg: string; grad: string }[] = [
  { key: "physical", label: "Physical",      emoji: "🖼️", desc: "Painting, sculpture, drawing, mixed media",  color: "#7C3AED", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED" },
  { key: "digital",  label: "Digital",       emoji: "💻", desc: "Digital painting, AI art, photography, NFT", color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9" },
  { key: "print",    label: "Print / Edition",emoji: "🖨️", desc: "Lithograph, screen print, numbered edition",  color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04" },
  { key: "mixed",    label: "Mixed Media",   emoji: "🎨", desc: "Combines physical and digital elements",      color: "#EC4899", bg: "#FCE7F3", grad: "135deg,#9D174D,#EC4899" },
];

const STAGES = [
  { key: "concept",     label: "Concept",     color: "#9B8F7A" },
  { key: "in_progress", label: "In Progress", color: "#7C3AED" },
  { key: "complete",    label: "Complete",    color: "#0EA5E9" },
  { key: "available",   label: "Available",   color: "#16A34A" },
  { key: "reserved",    label: "Reserved",    color: "#CA8A04" },
  { key: "sold",        label: "Sold",        color: "#111110" },
];

const SALE_METHODS = [
  { key: "direct",           label: "Direct purchase",  emoji: "🛒" },
  { key: "inquiry",          label: "Inquiry only",     emoji: "✉️" },
  { key: "price_on_request", label: "Price on request", emoji: "💬" },
  { key: "auction",          label: "Auction",          emoji: "🔨" },
  { key: "not_for_sale",     label: "Not for sale",     emoji: "🚫" },
];

const AUTH_TYPES = [
  { key: "original",        label: "Original Work",   desc: "One-of-a-kind piece",               emoji: "✦", color: "#16A34A", bg: "#DCFCE7" },
  { key: "limited_edition", label: "Limited Edition", desc: "Part of a numbered limited series",  emoji: "◈", color: "#CA8A04", bg: "#FEF9C3" },
  { key: "reproduction",    label: "Reproduction",    desc: "Copy or print of an original",       emoji: "◇", color: "#9B8F7A", bg: "#F5F0E8" },
];

const FILE_FORMATS = ["PNG", "JPG", "SVG", "GIF", "MP4", "WEBP", "TIFF", "PDF", "PSD", "AI", "GLB", "Other"];

const PROV_EMOJI: Record<string, string> = { milanote:"🟤", pinterest:"📌", figma:"🎨", miro:"🟡", notion:"📓", other:"🔗" };

// ── Shared form primitives ─────────────────────────────────────────
const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", background: "#fff",
  border: "2px solid #E8E0D0", borderRadius: 11, fontSize: 13,
  fontFamily: "inherit", fontWeight: 600, color: "#111110",
  outline: "none", boxSizing: "border-box", transition: "border-color .15s",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 6,
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <div style={LBL}>{children}{required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}</div>;
}

function SectionCard({ title, emoji, children, accent = "#FFD400" }: { title: string; emoji?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8" }}>
      <div style={{ padding: "13px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", gap: 9 }}>
        {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
        <span style={{ fontSize: 13, fontWeight: 900, color: "#111110", letterSpacing: "-.2px" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function FocusInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input style={{ ...INP, ...style }} {...props}
      onFocus={e => (e.target.style.borderColor = "#FFD400")}
      onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
  );
}
function FocusTextarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea style={{ ...INP, resize: "vertical", ...style }} {...props}
      onFocus={e => (e.target.style.borderColor = "#FFD400")}
      onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
  );
}
function FocusSelect({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select style={{ ...INP, cursor: "pointer", ...style }} {...props}
      onFocus={e => (e.target.style.borderColor = "#FFD400")}
      onBlur={e => (e.target.style.borderColor = "#E8E0D0")} />
  );
}

// ── Generate edition code ──────────────────────────────────────────
function genEditionCode(editionNum: string, total: string, prefix = "AM") {
  const n = String(editionNum).padStart(3, "0");
  const t = String(total).padStart(3, "0");
  return `${prefix}-${n}/${t}`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function NewArtworkPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Art type (step 1) ──
  const [artType, setArtType] = useState<ArtType | null>(null);

  // ── Core form ──
  const [form, setForm] = useState({
    title: "", year: "", medium: "", description: "", notes: "",
    // Physical
    width_cm: "", height_cm: "", depth_cm: "", framed: false,
    // Digital
    file_format: "", resolution: "", digital_file_url: "",
    // Print / Edition
    edition_total: "", edition_number: "", edition_code: "",
    // Auth
    authentication_status: "original",
    // Sales
    price: "", currency: "EUR", status: "concept", sale_method: "",
    // Location
    location: "", venue_location: "", location_name: "",
    // Business
    materials_cost: "", time_spent: "",
  });

  const [venueCoords,   setVenueCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [moodboards,    setMoodboards]    = useState<Moodboard[]>([]);
  const [linkedMb,      setLinkedMb]      = useState<string[]>([]);
  const [collections,   setCollections]   = useState<{ id: string; name: string }[]>([]);
  const [collectionId,  setCollectionId]  = useState("");
  const [saving,        setSaving]        = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-generate edition code when numbers change
  useEffect(() => {
    if (form.edition_number && form.edition_total) {
      setForm(p => ({ ...p, edition_code: genEditionCode(p.edition_number, p.edition_total) }));
    }
  }, [form.edition_number, form.edition_total]);

  // Load moodboards + collections
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: mb }, { data: cols }] = await Promise.all([
        sb.from("moodboards").select("id,title,provider,thumbnail_url,og_image,url").eq("user_id", user.id).order("created_at", { ascending: false }),
        sb.from("collections").select("id,name").eq("user_id", user.id),
      ]);
      setMoodboards(mb || []);
      setCollections(cols || []);
    });
  }, []);

  // Image handling
  function handleImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8 - imageFiles.length);
    const newPreviews = arr.map(f => URL.createObjectURL(f));
    setImageFiles(p => [...p, ...arr]);
    setImagePreviews(p => [...p, ...newPreviews]);
  }

  function removeImage(i: number) {
    setImageFiles(p => p.filter((_, idx) => idx !== i));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  }

  function toggleMoodboard(id: string) {
    setLinkedMb(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Upload images
    const uploadedUrls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const ext = file.name.split(".").pop();
      const path = `artworks/${user.id}/${Date.now()}-${i}.${ext}`;
      const { data } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
      if (data) {
        const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
      setUploadPct(Math.round(((i + 1) / imageFiles.length) * 80));
    }

    const numOrNull = (v: string) => v === "" || isNaN(Number(v)) ? null : Number(v);

    const { data, error } = await sb.from("artworks").insert({
      user_id:               user.id,
      art_type:              artType,
      title:                 form.title,
      year:                  numOrNull(form.year),
      medium:                form.medium            || null,
      description:           form.description       || null,
      notes:                 form.notes             || null,
      // Physical
      width_cm:              numOrNull(form.width_cm),
      height_cm:             numOrNull(form.height_cm),
      depth_cm:              numOrNull(form.depth_cm),
      framed:                form.framed,
      // Digital
      file_format:           form.file_format       || null,
      resolution:            form.resolution        || null,
      digital_file_url:      form.digital_file_url  || null,
      // Print
      edition_total:         numOrNull(form.edition_total),
      edition_number:        numOrNull(form.edition_number),
      edition_code:          form.edition_code      || null,
      // Auth
      authentication_status: form.authentication_status || "original",
      // Sales
      price:                 numOrNull(form.price),
      currency:              form.currency,
      status:                form.status,
      sale_method:           form.sale_method        || null,
      // Location
      venue_location:        form.venue_location     || form.location_name || null,
      location_name:         form.location_name      || form.venue_location || null,
      location_lat:          venueCoords?.lat        || null,
      location_lng:          venueCoords?.lng        || null,
      // Business
      materials_cost:        numOrNull(form.materials_cost),
      time_spent:            numOrNull(form.time_spent),
      // Linked moodboards
      linked_moodboard_ids:  linkedMb.length > 0 ? linkedMb : null,
      // Images
      images:                uploadedUrls,
      collection_id:         collectionId || null,
    }).select().single();

    if (!error && data) {
      if (collectionId) {
        try { await sb.from("collection_artworks").insert({ collection_id: collectionId, artwork_id: data.id }); } catch { /* ignore */ }
      }
      setUploadPct(100);
      router.push(`/dashboard/artworks/${data.id}`);
    } else {
      console.error(error);
      setSaving(false);
      setUploadPct(0);
    }
  }

  const atCfg = artType ? ART_TYPES.find(t => t.key === artType) : null;

  // ── STEP 1: Art type selector ─────────────────────────────────
  if (!artType) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <Link href="/dashboard/artworks" style={{ textDecoration: "none" }}>
              <button style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ArrowLeft size={16} color="#9B8F7A" />
              </button>
            </Link>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111110", margin: 0, letterSpacing: "-.5px" }}>Add New Artwork</h1>
              <p style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, margin: 0 }}>First, what kind of artwork is this?</p>
            </div>
          </div>

          {/* Type cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            {ART_TYPES.map(t => (
              <button key={t.key} onClick={() => setArtType(t.key)}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "20px 18px", background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 20, cursor: "pointer", transition: "all .2s cubic-bezier(.16,1,.3,1)", fontFamily: "inherit", textAlign: "left", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor="#111110"; el.style.boxShadow="4px 5px 0 #111110"; el.style.transform="translate(-2px,-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor="#E8E0D0"; el.style.boxShadow="none"; el.style.transform="none"; }}>
                {/* Gradient accent top bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(${t.grad})` }} />
                <div style={{ width: 48, height: 48, borderRadius: 14, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `2px solid ${t.color}30` }}>
                  {t.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: 12, color: "#C0B8A8", fontWeight: 600 }}>
            You can change the type later in the edit page
          </div>
        </div>
      </>
    );
  }

  // ── STEP 2: Full form ─────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <form onSubmit={handleSubmit}>

        {/* ── Header ── */}
        <div className="aw-new-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={() => setArtType(null)} style={{ width: 36, height: 36, borderRadius: 11, border: "2px solid #E8E0D0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ArrowLeft size={16} color="#9B8F7A" />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 20 }}>{atCfg?.emoji}</span>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: "#111110", margin: 0, letterSpacing: "-.4px" }}>New {atCfg?.label} Artwork</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: atCfg?.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>{atCfg?.label} · Fill in the details below</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard/artworks" style={{ textDecoration: "none" }}>
              <button type="button" style={{ padding: "9px 16px", border: "2px solid #E8E0D0", borderRadius: 11, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>Cancel</button>
            </Link>
            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", border: "2.5px solid #111110", borderRadius: 11, background: saving || !form.title.trim() ? "#F5F0E8" : "#FFD400", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving || !form.title.trim() ? "none" : "3px 3px 0 #111110", transition: "all .15s" }}>
              {saving ? (
                <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #111110", borderTopColor: "transparent", animation: "spin .6s linear infinite" }} /> Saving…</>
              ) : (
                <><Save size={13} /> Save Artwork</>
              )}
            </button>
          </div>
        </div>

        {/* Upload progress */}
        {saving && uploadPct > 0 && (
          <div style={{ marginBottom: 16, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, overflow: "hidden", height: 6 }}>
            <div style={{ height: "100%", background: "#FFD400", width: `${uploadPct}%`, transition: "width .3s ease" }} />
          </div>
        )}

        {/* ── TWO COLUMN LAYOUT ── */}
        <div className="aw-new-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Core details */}
            <SectionCard title="Core Details" emoji="📝">
              <div>
                <Label required>Title</Label>
                <FocusInput value={form.title} onChange={sf("title")} placeholder="Untitled Composition…" required />
              </div>
              <div className="aw-grid-2">
                <div>
                  <Label>Year</Label>
                  <FocusInput type="number" value={form.year} onChange={sf("year")} placeholder={String(new Date().getFullYear())} min="1000" max="2099" />
                </div>
                <div>
                  <Label>Medium</Label>
                  <FocusInput value={form.medium} onChange={sf("medium")} placeholder={artType === "digital" ? "Digital painting" : "Oil on canvas"} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <FocusTextarea rows={3} value={form.description} onChange={sf("description")} placeholder="Describe this work — its technique, inspiration, story…" />
              </div>
              <div>
                <Label>Internal Notes <span style={{ color: "#C0B8A8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(private)</span></Label>
                <FocusTextarea rows={2} value={form.notes} onChange={sf("notes")} placeholder="Storage location, provenance details, reminders…" />
              </div>
            </SectionCard>

            {/* ── PHYSICAL fields ── */}
            {(artType === "physical" || artType === "mixed") && (
              <SectionCard title="Physical Properties" emoji="📐">
                <div className="aw-grid-3">
                  <div>
                    <Label>Width (cm)</Label>
                    <FocusInput type="number" min="0" value={form.width_cm} onChange={sf("width_cm")} placeholder="80" />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <FocusInput type="number" min="0" value={form.height_cm} onChange={sf("height_cm")} placeholder="60" />
                  </div>
                  <div>
                    <Label>Depth (cm)</Label>
                    <FocusInput type="number" min="0" value={form.depth_cm} onChange={sf("depth_cm")} placeholder="2" />
                  </div>
                </div>
                {(form.width_cm || form.height_cm) && (
                  <div style={{ fontSize: 12, color: "#9B8F7A", fontFamily: "monospace", fontWeight: 700, padding: "6px 10px", background: "#F5F0E8", borderRadius: 8, display: "inline-block" }}>
                    {[form.width_cm, form.height_cm, form.depth_cm].filter(Boolean).join(" × ")} cm
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setForm(p => ({ ...p, framed: !p.framed }))}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.framed ? "#FFD400" : "#E8E0D0"}`, background: form.framed ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}>
                    {form.framed && <Check size={11} strokeWidth={3} color="#111110" />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>Artwork is framed</span>
                </div>
              </SectionCard>
            )}

            {/* ── DIGITAL fields ── */}
            {(artType === "digital" || artType === "mixed") && (
              <SectionCard title="Digital Properties" emoji="💻">
                <div className="aw-grid-2">
                  <div>
                    <Label>File Format</Label>
                    <FocusSelect value={form.file_format} onChange={sf("file_format")}>
                      <option value="">Select format…</option>
                      {FILE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </FocusSelect>
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <FocusInput value={form.resolution} onChange={sf("resolution")} placeholder="4000 × 3000 px" />
                  </div>
                </div>
                <div>
                  <Label>File URL <span style={{ color: "#C0B8A8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(optional — for delivery or display)</span></Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "2px solid #E8E0D0", borderRadius: 11, padding: "0 12px", transition: "border-color .15s" }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = "#FFD400")}
                    onBlurCapture={e => (e.currentTarget.style.borderColor = "#E8E0D0")}>
                    <Link2 size={13} color="#9B8F7A" style={{ flexShrink: 0 }} />
                    <input value={form.digital_file_url} onChange={sf("digital_file_url")} placeholder="https://drive.google.com/…" style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", fontWeight: 600, color: "#111110", background: "transparent", padding: "10px 0" }} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── PRINT / EDITION fields ── */}
            {(artType === "print") && (
              <SectionCard title="Edition Details" emoji="🖨️">
                <div style={{ padding: "10px 13px", background: "#FEF9C3", border: "1.5px solid #FDE047", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#713F12" }}>
                  💡 Each edition gets its own unique code for tracking. Set the total run and this edition's number.
                </div>
                <div className="aw-grid-2">
                  <div>
                    <Label>Edition Number <span style={{ color: "#C0B8A8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(this piece)</span></Label>
                    <FocusInput type="number" min="1" value={form.edition_number} onChange={sf("edition_number")} placeholder="e.g. 1" />
                  </div>
                  <div>
                    <Label>Total in Run</Label>
                    <FocusInput type="number" min="1" value={form.edition_total} onChange={sf("edition_total")} placeholder="e.g. 50" />
                  </div>
                </div>
                {form.edition_code && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#111110", borderRadius: 11, flex: 1 }}>
                      <Hash size={14} color="#FFD400" />
                      <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: "#FFD400", letterSpacing: ".05em" }}>{form.edition_code}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>Auto-generated<br />edition code</div>
                  </div>
                )}
                <div>
                  <Label>Custom Edition Code <span style={{ color: "#C0B8A8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(override auto-generated)</span></Label>
                  <FocusInput value={form.edition_code} onChange={sf("edition_code")} placeholder="AM-001/050" />
                </div>
              </SectionCard>
            )}

            {/* Authentication type */}
            <SectionCard title="Authentication Type" emoji="🔏">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {AUTH_TYPES.map(at => (
                  <button key={at.key} type="button" onClick={() => setForm(p => ({ ...p, authentication_status: at.key }))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: form.authentication_status === at.key ? at.bg : "#fff", border: `2px solid ${form.authentication_status === at.key ? at.color : "#E8E0D0"}`, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s", boxShadow: form.authentication_status === at.key ? "2px 2px 0 #111110" : "none" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{at.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{at.label}</div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{at.desc}</div>
                    </div>
                    {form.authentication_status === at.key && (
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: at.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Location */}
            <SectionCard title="Location" emoji="📍">
              <div>
                <Label>Current / exhibition location</Label>
                <PlacesAutocomplete
                  value={form.venue_location || form.location_name}
                  placeholder="Gallery, studio, museum…"
                  onChange={(result, raw) => {
                    setForm(p => ({ ...p, venue_location: raw, location_name: raw }));
                    if (result) setVenueCoords({ lat: result.lat, lng: result.lng });
                    else setVenueCoords(null);
                  }}
                />
                {venueCoords && (
                  <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 800, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <Check size={10} /> Location pinned — will appear on the art map
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Business */}
            <SectionCard title="Business" emoji="💼">
              <div className="aw-grid-2">
                <div>
                  <Label>Materials cost</Label>
                  <FocusInput type="number" min="0" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0" />
                </div>
                <div>
                  <Label>Time spent (hours)</Label>
                  <FocusInput type="number" min="0" value={form.time_spent} onChange={sf("time_spent")} placeholder="0" />
                </div>
              </div>
              {form.price && form.materials_cost && Number(form.price) > Number(form.materials_cost) && (
                <div style={{ padding: "10px 13px", background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>Estimated profit</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#166534", fontFamily: "monospace" }}>
                    {form.currency}{(Number(form.price) - Number(form.materials_cost)).toLocaleString()}
                  </span>
                </div>
              )}
              {collections.length > 0 && (
                <div>
                  <Label>Add to collection</Label>
                  <FocusSelect value={collectionId} onChange={e => setCollectionId(e.target.value)}>
                    <option value="">— No collection —</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </FocusSelect>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Image upload */}
            <SectionCard title="Images" emoji="📸">
              <div
                style={{ border: "2px dashed #D4C9A8", borderRadius: 14, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: "#FAF7F3", transition: "all .15s" }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor="#FFD400"; el.style.background="#FFFBEA"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor="#D4C9A8"; el.style.background="#FAF7F3"; }}
                onDrop={e => { e.preventDefault(); handleImages(e.dataTransfer.files); }}
                onDragOver={e => e.preventDefault()}>
                <Upload size={22} color="#C0B8A8" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A", marginBottom: 4 }}>Drop images or click to upload</div>
                <div style={{ fontSize: 11, color: "#C0B8A8", fontWeight: 600 }}>Up to 8 images · JPG, PNG, WEBP</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleImages(e.target.files)} />

              {imagePreviews.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #E8E0D0", aspectRatio: "1/1" }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={() => removeImage(i)}
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 7, background: "rgba(17,17,16,.75)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <X size={10} color="#fff" />
                      </button>
                      {i === 0 && (
                        <div style={{ position: "absolute", bottom: 4, left: 4, padding: "2px 7px", borderRadius: 6, background: "#FFD400", fontSize: 8, fontWeight: 900, color: "#111110" }}>MAIN</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Sales & Status */}
            <SectionCard title="Sales & Status" emoji="💰">
              <div>
                <Label>Stage</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {STAGES.map(s => (
                    <button key={s.key} type="button" onClick={() => setForm(p => ({ ...p, status: s.key }))}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `2px solid ${form.status === s.key ? "#111110" : "#E8E0D0"}`, borderRadius: 10, background: form.status === s.key ? "#111110" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: form.status === s.key ? "#FFD400" : "#111110" }}>{s.label}</span>
                      {form.status === s.key && <Check size={11} color="#FFD400" style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="aw-grid-2">
                <div>
                  <Label>Price</Label>
                  <FocusInput type="number" min="0" value={form.price} onChange={sf("price")} placeholder="0" />
                </div>
                <div>
                  <Label>Currency</Label>
                  <FocusSelect value={form.currency} onChange={sf("currency")}>
                    {["EUR","USD","GBP","CZK","CHF","JPY","CAD"].map(c => <option key={c}>{c}</option>)}
                  </FocusSelect>
                </div>
              </div>
              <div>
                <Label>Sale method</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {SALE_METHODS.map(m => (
                    <button key={m.key} type="button" onClick={() => setForm(p => ({ ...p, sale_method: p.sale_method === m.key ? "" : m.key }))}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `2px solid ${form.sale_method === m.key ? "#FFD400" : "#E8E0D0"}`, borderRadius: 10, background: form.sale_method === m.key ? "#FFFBEA" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .12s", boxShadow: form.sale_method === m.key ? "2px 2px 0 #111110" : "none" }}>
                      <span style={{ fontSize: 14 }}>{m.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111110" }}>{m.label}</span>
                      {form.sale_method === m.key && <Check size={11} color="#CA8A04" style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* Moodboard linker */}
            {moodboards.length > 0 && (
              <SectionCard title="Connected Moodboards" emoji="🗂️">
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", marginTop: -6 }}>
                  Link visual boards as the story behind this work
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {moodboards.map(mb => {
                    const on = linkedMb.includes(mb.id);
                    const thumb = mb.thumbnail_url || mb.og_image;
                    return (
                      <button key={mb.id} type="button" onClick={() => toggleMoodboard(mb.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: `2px solid ${on ? "#EC4899" : "#E8E0D0"}`, borderRadius: 12, background: on ? "#FDF2F8" : "#fff", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", boxShadow: on ? "2px 2px 0 #111110" : "none" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, overflow: "hidden", border: "1.5px solid #E8E0D0", flexShrink: 0, background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : PROV_EMOJI[mb.provider] || "🔗"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mb.title}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#9B8F7A" }}>{mb.provider}</div>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? "#EC4899" : "#E8E0D0"}`, background: on ? "#EC4899" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                          {on && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {linkedMb.length > 0 && (
                  <div style={{ padding: "7px 11px", background: "#FDF2F8", border: "1.5px solid #FBCFE8", borderRadius: 9, fontSize: 11, fontWeight: 700, color: "#9D174D" }}>
                    ✓ {linkedMb.length} board{linkedMb.length > 1 ? "s" : ""} connected
                  </div>
                )}
                <a href="/dashboard/moodboard" target="_blank" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
                  <Layers size={11} /> Manage moodboards <ExternalLink size={10} />
                </a>
              </SectionCard>
            )}

            {moodboards.length === 0 && (
              <SectionCard title="Connected Moodboards" emoji="🗂️">
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A", marginBottom: 10 }}>No moodboards yet</div>
                  <a href="/dashboard/moodboard" target="_blank" style={{ textDecoration: "none" }}>
                    <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#9B8F7A" }}>
                      <Layers size={11} /> Create a moodboard first
                    </button>
                  </a>
                </div>
              </SectionCard>
            )}

            {/* Save button repeat for mobile convenience */}
            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", border: "2.5px solid #111110", borderRadius: 14, background: saving || !form.title.trim() ? "#F5F0E8" : "#FFD400", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", color: "#111110", boxShadow: saving || !form.title.trim() ? "none" : "3px 3px 0 #111110", transition: "all .15s" }}>
              {saving ? "Saving…" : <><Save size={14} /> Save Artwork</>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

// ── CSS ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .aw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .aw-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  @media (max-width: 820px) {
    .aw-new-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .aw-new-header { flex-direction: column !important; align-items: flex-start !important; }
    .aw-new-header > div:last-child { width: 100%; display: flex; gap: 8px; }
    .aw-new-header > div:last-child a,
    .aw-new-header > div:last-child button { flex: 1; justify-content: center !important; }
    .aw-grid-2 { grid-template-columns: 1fr !important; }
    .aw-grid-3 { grid-template-columns: 1fr 1fr !important; }
  }
`;
