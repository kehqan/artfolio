"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Upload, X, Save, ImageIcon, Check,
  Hash, Link2, ExternalLink, Layers, Shield,
} from "lucide-react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";

// ── Config (mirrors new page) ──────────────────────────────────────
type ArtType = "physical" | "digital" | "print" | "mixed";

const ART_TYPES: { key: ArtType; label: string; emoji: string; color: string; bg: string }[] = [
  { key: "physical", label: "Physical",       emoji: "🖼️", color: "#7C3AED", bg: "#EDE9FE" },
  { key: "digital",  label: "Digital",        emoji: "💻", color: "#0EA5E9", bg: "#E0F2FE" },
  { key: "print",    label: "Print / Edition", emoji: "🖨️", color: "#CA8A04", bg: "#FEF9C3" },
  { key: "mixed",    label: "Mixed Media",    emoji: "🎨", color: "#EC4899", bg: "#FCE7F3" },
];

const STAGES = [
  { key: "concept",     label: "Concept",      color: "#9B8F7A" },
  { key: "in_progress", label: "In Progress",  color: "#7C3AED" },
  { key: "complete",    label: "Complete",     color: "#0EA5E9" },
  { key: "available",   label: "Available",    color: "#16A34A" },
  { key: "reserved",    label: "Reserved",     color: "#CA8A04" },
  { key: "sold",        label: "Sold",         color: "#111110" },
];

const SALE_METHODS = [
  { key: "direct",           label: "Direct purchase",  emoji: "🛒" },
  { key: "inquiry",          label: "Inquiry only",     emoji: "✉️" },
  { key: "price_on_request", label: "Price on request", emoji: "💬" },
  { key: "auction",          label: "Auction",          emoji: "🔨" },
  { key: "not_for_sale",     label: "Not for sale",     emoji: "🚫" },
];

const AUTH_TYPES = [
  { key: "original",        label: "Original Work",   desc: "One-of-a-kind piece",              emoji: "✦", color: "#16A34A", bg: "#DCFCE7" },
  { key: "limited_edition", label: "Limited Edition", desc: "Part of a numbered limited series", emoji: "◈", color: "#CA8A04", bg: "#FEF9C3" },
  { key: "reproduction",    label: "Reproduction",    desc: "Copy or print of an original",      emoji: "◇", color: "#9B8F7A", bg: "#F5F0E8" },
];

const FILE_FORMATS = ["PNG","JPG","SVG","GIF","MP4","WEBP","TIFF","PDF","PSD","AI","GLB","Other"];

const PROV_EMOJI: Record<string, string> = { milanote:"🟤", pinterest:"📌", figma:"🎨", miro:"🟡", notion:"📓", other:"🔗" };

// ── Shared primitives (identical to new page) ──────────────────────
const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", background: "#fff",
  border: "2px solid #E8E0D0", borderRadius: 11, fontSize: 13,
  fontFamily: "inherit", fontWeight: 600, color: "#111110",
  outline: "none", boxSizing: "border-box", transition: "border-color .15s",
};

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".13em", marginBottom: 6 }}>
      {children}
      {hint && <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#C0B8A8", marginLeft: 4 }}>{hint}</span>}
    </div>
  );
}

function SectionCard({ title, emoji, children }: { title: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8" }}>
      <div style={{ padding: "13px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", gap: 9 }}>
        {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
        <span style={{ fontSize: 13, fontWeight: 900, color: "#111110", letterSpacing: "-.2px" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function FI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={INP} {...props}
    onFocus={e => (e.target.style.borderColor="#FFD400")}
    onBlur={e => (e.target.style.borderColor="#E8E0D0")} />;
}
function FTA(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea style={{ ...INP, resize:"vertical" }} {...props}
    onFocus={e => (e.target.style.borderColor="#FFD400")}
    onBlur={e => (e.target.style.borderColor="#E8E0D0")} />;
}
function FSel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select style={{ ...INP, cursor:"pointer" }} {...props}
    onFocus={e => (e.target.style.borderColor="#FFD400")}
    onBlur={e => (e.target.style.borderColor="#E8E0D0")} />;
}

function genEditionCode(num: string, total: string) {
  return `AM-${String(num).padStart(3,"0")}/${String(total).padStart(3,"0")}`;
}

// ══════════════════════════════════════════════════════════════════
export default function EditArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [artType, setArtType] = useState<ArtType>("physical");

  const [form, setForm] = useState({
    title: "", year: "", medium: "", description: "", notes: "",
    width_cm: "", height_cm: "", depth_cm: "", framed: false,
    file_format: "", resolution: "", digital_file_url: "",
    edition_total: "", edition_number: "", edition_code: "",
    authentication_status: "original",
    price: "", currency: "EUR", status: "concept", sale_method: "",
    venue_location: "", location_name: "",
    materials_cost: "", time_spent: "",
  });

  const [venueCoords,    setVenueCoords]    = useState<{ lat: number; lng: number } | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles,       setNewFiles]       = useState<File[]>([]);
  const [newPreviews,    setNewPreviews]     = useState<string[]>([]);
  const [moodboards,     setMoodboards]     = useState<any[]>([]);
  const [linkedMb,       setLinkedMb]       = useState<string[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [uploadPct,      setUploadPct]      = useState(0);

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-generate edition code
  useEffect(() => {
    if (form.edition_number && form.edition_total) {
      setForm(p => ({ ...p, edition_code: genEditionCode(p.edition_number, p.edition_total) }));
    }
  }, [form.edition_number, form.edition_total]);

  // Load artwork + moodboards
  useEffect(() => {
    if (!id) return;
    const sb = createClient();

    sb.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) { setLoading(false); return; }

      setArtType((data.art_type as ArtType) || "physical");
      setForm({
        title:                 data.title                || "",
        year:                  data.year                 ? String(data.year)                 : "",
        medium:                data.medium               || "",
        description:           data.description          || "",
        notes:                 data.notes                || "",
        width_cm:              data.width_cm             ? String(data.width_cm)             : "",
        height_cm:             data.height_cm            ? String(data.height_cm)            : "",
        depth_cm:              data.depth_cm             ? String(data.depth_cm)             : "",
        framed:                data.framed               || false,
        file_format:           data.file_format          || "",
        resolution:            data.resolution           || "",
        digital_file_url:      data.digital_file_url     || "",
        edition_total:         data.edition_total        ? String(data.edition_total)        : "",
        edition_number:        data.edition_number       ? String(data.edition_number)       : "",
        edition_code:          data.edition_code         || "",
        authentication_status: data.authentication_status || "original",
        price:                 data.price                ? String(data.price)                : "",
        currency:              data.currency             || "EUR",
        status:                data.status               || "concept",
        sale_method:           data.sale_method          || "",
        venue_location:        data.venue_location       || "",
        location_name:         data.location_name        || data.venue_location || "",
        materials_cost:        data.materials_cost       ? String(data.materials_cost)       : "",
        time_spent:            data.time_spent           ? String(data.time_spent)           : "",
      });

      if (data.location_lat && data.location_lng) {
        setVenueCoords({ lat: data.location_lat, lng: data.location_lng });
      }
      setExistingImages(Array.isArray(data.images) ? data.images.filter(Boolean) : []);
      if (Array.isArray(data.linked_moodboard_ids)) setLinkedMb(data.linked_moodboard_ids);
      setLoading(false);
    });

    // Load user's moodboards
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: mb } = await sb.from("moodboards").select("id,title,provider,thumbnail_url,og_image,url").eq("user_id", user.id).order("created_at", { ascending: false });
      setMoodboards(mb || []);
    });
  }, [id]);

  // Image helpers
  function addImages(files: FileList | null) {
    if (!files) return;
    const max = 8 - existingImages.length - newFiles.length;
    const list = Array.from(files).slice(0, max);
    setNewFiles(p => [...p, ...list]);
    list.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setNewPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }
  function removeExisting(i: number) { setExistingImages(p => p.filter((_: string, idx: number) => idx !== i)); }
  function removeNew(i: number) { setNewFiles(p => p.filter((_: File, idx: number) => idx !== i)); setNewPreviews(p => p.filter((_: string, idx: number) => idx !== i)); }
  function toggleMb(mbId: string) { setLinkedMb(p => p.includes(mbId) ? p.filter(x => x !== mbId) : [...p, mbId]); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Upload new images using the avatars bucket (same as new page)
    const uploadedUrls: string[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext  = file.name.split(".").pop();
      const path = `artworks/${user.id}/${Date.now()}-${i}.${ext}`;
      const { data } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
      if (data) {
        const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
      setUploadPct(Math.round(((i + 1) / newFiles.length) * 80));
    }

    const numOrNull = (v: string) => v.trim() === "" || isNaN(Number(v)) ? null : Number(v);

    await sb.from("artworks").update({
      art_type:              artType,
      title:                 form.title,
      year:                  numOrNull(form.year),
      medium:                form.medium               || null,
      description:           form.description          || null,
      notes:                 form.notes                || null,
      width_cm:              numOrNull(form.width_cm),
      height_cm:             numOrNull(form.height_cm),
      depth_cm:              numOrNull(form.depth_cm),
      framed:                form.framed,
      file_format:           form.file_format          || null,
      resolution:            form.resolution           || null,
      digital_file_url:      form.digital_file_url     || null,
      edition_total:         numOrNull(form.edition_total),
      edition_number:        numOrNull(form.edition_number),
      edition_code:          form.edition_code         || null,
      authentication_status: form.authentication_status || "original",
      price:                 numOrNull(form.price),
      currency:              form.currency,
      status:                form.status,
      sale_method:           form.sale_method          || null,
      venue_location:        form.venue_location       || form.location_name || null,
      location_name:         form.location_name        || form.venue_location || null,
      location_lat:          venueCoords?.lat          ?? null,
      location_lng:          venueCoords?.lng          ?? null,
      materials_cost:        numOrNull(form.materials_cost),
      time_spent:            numOrNull(form.time_spent),
      linked_moodboard_ids:  linkedMb.length > 0 ? linkedMb : null,
      images:                [...existingImages, ...uploadedUrls],
      updated_at:            new Date().toISOString(),
    }).eq("id", id);

    setUploadPct(100);
    setSaving(false);
    router.push(`/dashboard/artworks/${id}`);
  }

  const atCfg    = ART_TYPES.find(t => t.key === artType) || ART_TYPES[0];
  const isDigital = artType === "digital" || artType === "mixed";
  const isPrint   = artType === "print";
  const totalImgs = existingImages.length + newFiles.length;

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #FFD400", borderTopColor:"transparent", animation:"spin .7s linear infinite" }} />
        <div style={{ fontSize:13, fontWeight:700, color:"#9B8F7A" }}>Loading…</div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <form onSubmit={handleSave}>

        {/* ── HEADER ── */}
        <div className="aw-edit-header">
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
            <Link href={`/dashboard/artworks/${id}`} style={{ textDecoration:"none" }}>
              <button type="button" style={{ width:36, height:36, borderRadius:11, border:"2px solid #E8E0D0", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                <ArrowLeft size={16} color="#9B8F7A" />
              </button>
            </Link>
            <div style={{ minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2, flexWrap:"wrap" }}>
                {/* Art type selector pills */}
                {ART_TYPES.map(t => (
                  <button key={t.key} type="button" onClick={() => setArtType(t.key)}
                    style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, border:`2px solid ${artType===t.key ? t.color : "#E8E0D0"}`, background:artType===t.key ? t.bg : "#fff", fontSize:10, fontWeight:800, color:artType===t.key ? t.color : "#9B8F7A", cursor:"pointer", fontFamily:"inherit", transition:"all .12s" }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <h1 style={{ fontSize:"clamp(16px,2.5vw,22px)", fontWeight:900, color:"#111110", margin:0, letterSpacing:"-.4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {form.title || "Edit Artwork"}
              </h1>
            </div>
          </div>

          <div className="aw-edit-actions">
            <Link href={`/dashboard/artworks/${id}`} style={{ textDecoration:"none" }}>
              <button type="button" style={{ padding:"9px 16px", border:"2px solid #E8E0D0", borderRadius:11, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A" }}>Cancel</button>
            </Link>
            <button type="submit" disabled={saving || !form.title.trim()}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 20px", border:"2.5px solid #111110", borderRadius:11, background:saving||!form.title.trim()?"#F5F0E8":"#FFD400", fontSize:13, fontWeight:800, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", color:"#111110", boxShadow:saving||!form.title.trim()?"none":"3px 3px 0 #111110", transition:"all .15s" }}>
              {saving ? (
                <><div style={{ width:13, height:13, borderRadius:"50%", border:"2px solid #111110", borderTopColor:"transparent", animation:"spin .6s linear infinite" }} /> {uploadPct > 0 ? `${uploadPct}%` : "Saving…"}</>
              ) : (
                <><Save size={13} /> Save Changes</>
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {saving && uploadPct > 0 && (
          <div style={{ marginBottom:16, background:"#fff", border:"2px solid #E8E0D0", borderRadius:99, overflow:"hidden", height:5 }}>
            <div style={{ height:"100%", background:"#FFD400", width:`${uploadPct}%`, transition:"width .3s ease" }} />
          </div>
        )}

        {/* ── TWO COLUMN LAYOUT ── */}
        <div className="aw-edit-grid">

          {/* ════ LEFT ════ */}
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

            {/* Core details */}
            <SectionCard title="Core Details" emoji="📝">
              <div>
                <Label>Title</Label>
                <FI value={form.title} onChange={sf("title")} placeholder="Untitled Composition…" required />
              </div>
              <div className="aw-grid-2">
                <div>
                  <Label>Year</Label>
                  <FI type="number" value={form.year} onChange={sf("year")} placeholder={String(new Date().getFullYear())} min="1000" max="2099" />
                </div>
                <div>
                  <Label>Medium</Label>
                  <FI value={form.medium} onChange={sf("medium")} placeholder={artType==="digital"?"Digital painting":"Oil on canvas"} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <FTA rows={3} value={form.description} onChange={sf("description")} placeholder="Describe this work — technique, inspiration, story…" />
              </div>
              <div>
                <Label hint="(private)">Internal Notes</Label>
                <FTA rows={2} value={form.notes} onChange={sf("notes")} placeholder="Storage location, provenance details, reminders…" />
              </div>
            </SectionCard>

            {/* Physical */}
            {(artType==="physical"||artType==="mixed") && (
              <SectionCard title="Physical Properties" emoji="📐">
                <div className="aw-grid-3">
                  <div><Label>Width (cm)</Label><FI type="number" min="0" value={form.width_cm} onChange={sf("width_cm")} placeholder="80" /></div>
                  <div><Label>Height (cm)</Label><FI type="number" min="0" value={form.height_cm} onChange={sf("height_cm")} placeholder="60" /></div>
                  <div><Label>Depth (cm)</Label><FI type="number" min="0" value={form.depth_cm} onChange={sf("depth_cm")} placeholder="2" /></div>
                </div>
                {(form.width_cm||form.height_cm) && (
                  <div style={{ fontSize:12, color:"#9B8F7A", fontFamily:"monospace", fontWeight:700, padding:"6px 10px", background:"#F5F0E8", borderRadius:8, display:"inline-block" }}>
                    {[form.width_cm,form.height_cm,form.depth_cm].filter(Boolean).join(" × ")} cm
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => setForm(p=>({...p,framed:!p.framed}))}>
                  <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${form.framed?"#FFD400":"#E8E0D0"}`, background:form.framed?"#FFD400":"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", flexShrink:0 }}>
                    {form.framed && <Check size={11} strokeWidth={3} color="#111110" />}
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:"#111110" }}>Artwork is framed</span>
                </div>
              </SectionCard>
            )}

            {/* Digital */}
            {isDigital && (
              <SectionCard title="Digital Properties" emoji="💻">
                <div className="aw-grid-2">
                  <div>
                    <Label>File Format</Label>
                    <FSel value={form.file_format} onChange={sf("file_format")}>
                      <option value="">Select format…</option>
                      {FILE_FORMATS.map(f=><option key={f}>{f}</option>)}
                    </FSel>
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <FI value={form.resolution} onChange={sf("resolution")} placeholder="4000 × 3000 px" />
                  </div>
                </div>
                <div>
                  <Label hint="(optional)">File URL</Label>
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:11, padding:"0 12px", transition:"border-color .15s" }}
                    onFocusCapture={e=>(e.currentTarget.style.borderColor="#FFD400")}
                    onBlurCapture={e=>(e.currentTarget.style.borderColor="#E8E0D0")}>
                    <Link2 size={13} color="#9B8F7A" style={{ flexShrink:0 }} />
                    <input value={form.digital_file_url} onChange={sf("digital_file_url")} placeholder="https://drive.google.com/…" style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"transparent", padding:"10px 0" }} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Print / Edition */}
            {isPrint && (
              <SectionCard title="Edition Details" emoji="🖨️">
                <div style={{ padding:"10px 13px", background:"#FEF9C3", border:"1.5px solid #FDE047", borderRadius:10, fontSize:12, fontWeight:600, color:"#713F12" }}>
                  💡 Update the edition number and total to regenerate the edition code.
                </div>
                <div className="aw-grid-2">
                  <div><Label hint="(this piece)">Edition Number</Label><FI type="number" min="1" value={form.edition_number} onChange={sf("edition_number")} placeholder="e.g. 1" /></div>
                  <div><Label>Total in Run</Label><FI type="number" min="1" value={form.edition_total} onChange={sf("edition_total")} placeholder="e.g. 50" /></div>
                </div>
                {form.edition_code && (
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#111110", borderRadius:11, flex:1 }}>
                      <Hash size={14} color="#FFD400" />
                      <span style={{ fontFamily:"monospace", fontSize:15, fontWeight:900, color:"#FFD400" }}>{form.edition_code}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>Edition code</div>
                  </div>
                )}
                <div>
                  <Label hint="(override)">Custom Edition Code</Label>
                  <FI value={form.edition_code} onChange={sf("edition_code")} placeholder="AM-001/050" />
                </div>
              </SectionCard>
            )}

            {/* Authentication */}
            <SectionCard title="Authentication Type" emoji="🔏">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {AUTH_TYPES.map(at => (
                  <button key={at.key} type="button" onClick={() => setForm(p=>({...p,authentication_status:at.key}))}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:form.authentication_status===at.key?at.bg:"#fff", border:`2px solid ${form.authentication_status===at.key?at.color:"#E8E0D0"}`, borderRadius:12, cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .15s", boxShadow:form.authentication_status===at.key?"2px 2px 0 #111110":"none" }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{at.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"#111110" }}>{at.label}</div>
                      <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>{at.desc}</div>
                    </div>
                    {form.authentication_status===at.key && (
                      <div style={{ width:20, height:20, borderRadius:"50%", background:at.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
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
                    setForm(p=>({...p, venue_location:raw, location_name:raw}));
                    if (result) setVenueCoords({lat:result.lat, lng:result.lng});
                    else setVenueCoords(null);
                  }}
                />
                {venueCoords && (
                  <div style={{ fontSize:10, color:"#16A34A", fontWeight:800, marginTop:6, display:"flex", alignItems:"center", gap:5 }}>
                    <Check size={10} /> Location pinned — visible on map
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Business */}
            <SectionCard title="Business" emoji="💼">
              <div className="aw-grid-2">
                <div><Label>Materials cost</Label><FI type="number" min="0" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0" /></div>
                <div><Label>Time spent (hours)</Label><FI type="number" min="0" value={form.time_spent} onChange={sf("time_spent")} placeholder="0" /></div>
              </div>
              {form.price && form.materials_cost && Number(form.price) > Number(form.materials_cost) && (
                <div style={{ padding:"10px 13px", background:"#DCFCE7", border:"1.5px solid #86EFAC", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>Estimated profit</span>
                  <span style={{ fontSize:16, fontWeight:900, color:"#166534", fontFamily:"monospace" }}>
                    {form.currency}{(Number(form.price)-Number(form.materials_cost)).toLocaleString()}
                  </span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ════ RIGHT ════ */}
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

            {/* Image manager */}
            <SectionCard title={`Images (${totalImgs}/8)`} emoji="📸">

              {/* Existing images */}
              {existingImages.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".12em", marginBottom:8 }}>Current images</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {existingImages.map((src, i) => (
                      <div key={i} style={{ position:"relative", borderRadius:10, overflow:"hidden", border:`2px solid ${i===0?"#FFD400":"#E8E0D0"}`, aspectRatio:"1/1" }}>
                        <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <button type="button" onClick={() => removeExisting(i)}
                          style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:7, background:"rgba(17,17,16,.75)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                          <X size={10} color="#fff" />
                        </button>
                        {i===0 && <div style={{ position:"absolute", bottom:4, left:4, padding:"2px 7px", borderRadius:6, background:"#FFD400", fontSize:8, fontWeight:900, color:"#111110" }}>MAIN</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New images */}
              {newPreviews.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:"#16A34A", textTransform:"uppercase", letterSpacing:".12em", marginBottom:8 }}>New — will be uploaded on save</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {newPreviews.map((src, i) => (
                      <div key={i} style={{ position:"relative", borderRadius:10, overflow:"hidden", border:"2px solid #86EFAC", aspectRatio:"1/1" }}>
                        <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <button type="button" onClick={() => removeNew(i)}
                          style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:7, background:"rgba(17,17,16,.75)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                          <X size={10} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload zone */}
              {totalImgs < 8 && (
                <div
                  style={{ border:"2px dashed #D4C9A8", borderRadius:14, padding:"20px 16px", textAlign:"center", cursor:"pointer", background:"#FAF7F3", transition:"all .15s" }}
                  onClick={() => fileRef.current?.click()}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor="#FFD400";el.style.background="#FFFBEA";}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor="#D4C9A8";el.style.background="#FAF7F3";}}
                  onDrop={e=>{e.preventDefault();addImages(e.dataTransfer.files);}}
                  onDragOver={e=>e.preventDefault()}>
                  <Upload size={20} color="#C0B8A8" style={{ marginBottom:6 }} />
                  <div style={{ fontSize:12, fontWeight:700, color:"#9B8F7A" }}>Add more images ({8-totalImgs} remaining)</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>addImages(e.target.files)} />

              {existingImages.length === 0 && newPreviews.length === 0 && (
                <div style={{ textAlign:"center", padding:"10px 0", fontSize:12, fontWeight:600, color:"#C0B8A8" }}>
                  No images yet — drop some above
                </div>
              )}
            </SectionCard>

            {/* Sales & Status */}
            <SectionCard title="Sales & Status" emoji="💰">
              <div>
                <Label>Stage</Label>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {STAGES.map(s => (
                    <button key={s.key} type="button" onClick={() => setForm(p=>({...p,status:s.key}))}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", border:`2px solid ${form.status===s.key?"#111110":"#E8E0D0"}`, borderRadius:10, background:form.status===s.key?"#111110":"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all .12s" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:700, color:form.status===s.key?"#FFD400":"#111110" }}>{s.label}</span>
                      {form.status===s.key && <Check size={11} color="#FFD400" style={{ marginLeft:"auto" }} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="aw-grid-2">
                <div><Label>Price</Label><FI type="number" min="0" value={form.price} onChange={sf("price")} placeholder="0" /></div>
                <div>
                  <Label>Currency</Label>
                  <FSel value={form.currency} onChange={sf("currency")}>
                    {["EUR","USD","GBP","CZK","CHF","JPY","CAD"].map(c=><option key={c}>{c}</option>)}
                  </FSel>
                </div>
              </div>
              <div>
                <Label>Sale method</Label>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {SALE_METHODS.map(m => (
                    <button key={m.key} type="button" onClick={() => setForm(p=>({...p,sale_method:p.sale_method===m.key?"":m.key}))}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`2px solid ${form.sale_method===m.key?"#FFD400":"#E8E0D0"}`, borderRadius:10, background:form.sale_method===m.key?"#FFFBEA":"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all .12s", boxShadow:form.sale_method===m.key?"2px 2px 0 #111110":"none" }}>
                      <span style={{ fontSize:14 }}>{m.emoji}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#111110" }}>{m.label}</span>
                      {form.sale_method===m.key && <Check size={11} color="#CA8A04" style={{ marginLeft:"auto" }} />}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* Moodboard linker */}
            <SectionCard title="Connected Moodboards" emoji="🗂️">
              <div style={{ fontSize:11, fontWeight:600, color:"#9B8F7A", marginTop:-6 }}>
                Link visual boards as the story behind this work
              </div>
              {moodboards.length === 0 ? (
                <div style={{ textAlign:"center", padding:"16px 0" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🗂️</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#9B8F7A", marginBottom:10 }}>No moodboards yet</div>
                  <a href="/dashboard/moodboard" target="_blank" style={{ textDecoration:"none" }}>
                    <button type="button" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A" }}>
                      <Layers size={11} /> Create a moodboard first
                    </button>
                  </a>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {moodboards.map(mb => {
                      const on = linkedMb.includes(mb.id);
                      const thumb = mb.thumbnail_url || mb.og_image;
                      return (
                        <button key={mb.id} type="button" onClick={() => toggleMb(mb.id)}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", border:`2px solid ${on?"#EC4899":"#E8E0D0"}`, borderRadius:12, background:on?"#FDF2F8":"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all .15s", boxShadow:on?"2px 2px 0 #111110":"none" }}>
                          <div style={{ width:38, height:38, borderRadius:9, overflow:"hidden", border:"1.5px solid #E8E0D0", flexShrink:0, background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                            {thumb ? <img src={thumb} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : PROV_EMOJI[mb.provider]||"🔗"}
                          </div>
                          <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                            <div style={{ fontSize:12, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mb.title}</div>
                            <div style={{ fontSize:10, fontWeight:600, color:"#9B8F7A" }}>{mb.provider}</div>
                          </div>
                          <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${on?"#EC4899":"#E8E0D0"}`, background:on?"#EC4899":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                            {on && <Check size={10} color="#fff" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {linkedMb.length > 0 && (
                    <div style={{ padding:"7px 11px", background:"#FDF2F8", border:"1.5px solid #FBCFE8", borderRadius:9, fontSize:11, fontWeight:700, color:"#9D174D" }}>
                      ✓ {linkedMb.length} board{linkedMb.length>1?"s":""} connected
                    </div>
                  )}
                </>
              )}
              <a href="/dashboard/moodboard" target="_blank" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:"#9B8F7A" }}>
                <Layers size={11} /> Manage moodboards <ExternalLink size={10} />
              </a>
            </SectionCard>

            {/* Passport shortcut */}
            <Link href={`/dashboard/artworks/${id}/passport`} style={{ textDecoration:"none" }}>
              <div style={{ background:"#111110", borderRadius:16, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", border:"2px solid #111110", boxShadow:"3px 3px 0 #D4C9A8", transition:"all .2s" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)";(e.currentTarget as HTMLElement).style.boxShadow="4px 4px 0 #111110";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none";(e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #D4C9A8";}}>
                <div style={{ width:34, height:34, borderRadius:10, background:"#FFD400", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Shield size={16} color="#111110" />
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:900, color:"#FFD400" }}>Digital Passport</div>
                  <div style={{ fontSize:10, color:"rgba(255,212,0,.5)", fontWeight:600 }}>Authentication, provenance & certificate</div>
                </div>
                <ExternalLink size={12} color="rgba(255,212,0,.4)" style={{ marginLeft:"auto", flexShrink:0 }} />
              </div>
            </Link>

            {/* Save repeat */}
            <button type="submit" disabled={saving||!form.title.trim()}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"13px", border:"2.5px solid #111110", borderRadius:14, background:saving||!form.title.trim()?"#F5F0E8":"#FFD400", fontSize:14, fontWeight:800, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", color:"#111110", boxShadow:saving||!form.title.trim()?"none":"3px 3px 0 #111110", transition:"all .15s" }}>
              {saving ? "Saving…" : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .aw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .aw-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  .aw-edit-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 22px; flex-wrap: wrap;
  }
  .aw-edit-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  .aw-edit-grid {
    display: grid; grid-template-columns: 1fr 360px;
    gap: 20px; align-items: start;
  }

  @media (max-width: 820px) {
    .aw-edit-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .aw-edit-header { flex-direction: column; align-items: flex-start; }
    .aw-edit-actions { width: 100%; }
    .aw-edit-actions a, .aw-edit-actions button { flex: 1; justify-content: center !important; }
    .aw-grid-2 { grid-template-columns: 1fr !important; }
    .aw-grid-3 { grid-template-columns: 1fr 1fr !important; }
  }
`;
