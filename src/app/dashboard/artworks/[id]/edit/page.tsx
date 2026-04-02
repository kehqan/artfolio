"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, X, Save, ImageIcon } from "lucide-react";
import PlacesAutocomplete, { PlaceResult } from "@/components/PlacesAutocomplete";

const STAGES = [
  { key: "concept",     label: "Concept"     },
  { key: "in_progress", label: "In Progress" },
  { key: "complete",    label: "Complete"    },
  { key: "available",   label: "Available"   },
  { key: "reserved",    label: "Reserved"    },
  { key: "sold",        label: "Sold"        },
];

const SALE_METHODS = [
  { key: "direct",           label: "Direct purchase"   },
  { key: "inquiry",          label: "Inquiry only"      },
  { key: "price_on_request", label: "Price on request"  },
  { key: "auction",          label: "Auction"           },
  { key: "not_for_sale",     label: "Not for sale"      },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "#fff", border: "2px solid #E0D8CA",
  fontSize: 13, fontFamily: "inherit", outline: "none",
  color: "#111110", boxSizing: "border-box",
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
    {children}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
    <div style={{ padding: "12px 18px", borderBottom: "2px solid #111110", background: "#F5F0E8" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#111110", textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</div>
    </div>
    <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {children}
    </div>
  </div>
);

export default function EditArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [form, setForm] = useState({
    title: "", year: "", medium: "", description: "",
    width_cm: "", height_cm: "", depth_cm: "",
    price: "", currency: "USD", status: "available",
    sale_method: "", location: "", venue_location: "", location_name: "",
    notes: "", framed: false, editions: "",
    materials_cost: "", time_spent: "",
  });
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [venueCoords, setVenueCoords]       = useState<{ lat: number; lng: number } | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles]             = useState<File[]>([]);
  const [newPreviews, setNewPreviews]       = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setForm({
          title:          data.title          || "",
          year:           data.year           ? String(data.year)           : "",
          medium:         data.medium         || "",
          description:    data.description    || "",
          width_cm:       data.width_cm       ? String(data.width_cm)       : "",
          height_cm:      data.height_cm      ? String(data.height_cm)      : "",
          depth_cm:       data.depth_cm       ? String(data.depth_cm)       : "",
          price:          data.price          ? String(data.price)          : "",
          currency:       data.currency       || "USD",
          status:         data.status         || "available",
          sale_method:    data.sale_method    || "",
          location:       data.location       || "",
          venue_location: data.venue_location || "",
          location_name:  data.location_name  || data.venue_location || "",
          notes:          data.notes          || "",
          framed:         data.framed         || false,
          editions:       data.editions       ? String(data.editions)       : "",
          materials_cost: data.materials_cost ? String(data.materials_cost) : "",
          time_spent:     data.time_spent     ? String(data.time_spent)     : "",
        });
        if (data.location_lat && data.location_lng) setVenueCoords({ lat: data.location_lat, lng: data.location_lng });
        setExistingImages(Array.isArray(data.images) ? data.images.filter(Boolean) : []);
      }
      setLoading(false);
    });
  }, [id]);

  function addImages(files: FileList | null) {
    if (!files) return;
    const maxNew = 8 - existingImages.length - newFiles.length;
    const list = Array.from(files).slice(0, maxNew);
    setNewFiles(p => [...p, ...list]);
    list.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setNewPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeExisting(i: number) {
    setExistingImages(p => p.filter((_, idx) => idx !== i));
  }

  function removeNew(i: number) {
    setNewFiles(p => p.filter((_, idx) => idx !== i));
    setNewPreviews(p => p.filter((_, idx) => idx !== i));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Upload new images
    const uploadedUrls: string[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      setUploadProgress(Math.round(((i) / newFiles.length) * 100));
      const ext  = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, contentType: file.type }),
        });
        const { signedUrl } = await res.json();
        if (signedUrl) {
          await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          const { data: { publicUrl } } = supabase.storage.from("artwork-images").getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      } catch {
        // skip failed uploads silently
      }
    }

    const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);

    await supabase.from("artworks").update({
      title:          form.title,
      year:           numOrNull(form.year),
      medium:         form.medium    || null,
      description:    form.description || null,
      width_cm:       numOrNull(form.width_cm),
      height_cm:      numOrNull(form.height_cm),
      depth_cm:       numOrNull(form.depth_cm),
      price:          numOrNull(form.price),
      currency:       form.currency,
      status:         form.status,
      sale_method:    form.sale_method    || null,
      location:       form.location       || null,
      venue_location: form.venue_location || form.location_name || null,
      location_name:  form.location_name  || form.venue_location || null,
      location_lat:   venueCoords?.lat    || null,
      location_lng:   venueCoords?.lng    || null,
      notes:          form.notes          || null,
      framed:         form.framed,
      editions:       numOrNull(form.editions),
      materials_cost: numOrNull(form.materials_cost),
      time_spent:     numOrNull(form.time_spent),
      images:         [...existingImages, ...uploadedUrls],
      updated_at:     new Date().toISOString(),
    }).eq("id", id);

    setSaving(false);
    router.push(`/dashboard/artworks/${id}`);
  }

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const focusStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "#FFD400"),
    onBlur:  (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = "#E0D8CA"),
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#9B8F7A", fontSize: 14, fontWeight: 700 }}>
      Loading…
    </div>
  );

  const totalImages = existingImages.length + newFiles.length;

  return (
    <>
      <style>{`*{box-sizing:border-box} input:focus,select:focus,textarea:focus{border-color:#FFD400!important;outline:none}`}</style>

      <div>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={`/dashboard/artworks/${id}`} style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <ArrowLeft size={13} /> Cancel
              </button>
            </Link>
            <span style={{ color: "#d4cfc4" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>Edit Artwork</span>
          </div>
          <button
            form="edit-form"
            type="submit"
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", border: "2px solid #111110", background: "#FFD400", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
            <Save size={14} /> {saving ? `Saving… ${uploadProgress > 0 ? `(${uploadProgress}%)` : ""}` : "Save Changes"}
          </button>
        </div>

        <form id="edit-form" onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>

            {/* ── LEFT: Images ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Section title={`Images (${totalImages}/8)`}>
                {/* Upload area */}
                <div
                  onClick={() => document.getElementById("img-input")?.click()}
                  style={{ border: "2px dashed #d4cfc4", padding: "20px 16px", textAlign: "center", cursor: "pointer", background: "#FAFAF8", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#FFD400")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#d4cfc4")}>
                  <Upload size={22} color="#9B8F7A" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>Click to upload</div>
                  <div style={{ fontSize: 10, color: "#d4cfc4", marginTop: 4 }}>PNG, JPG, WEBP · up to 8 images</div>
                  <input id="img-input" type="file" multiple accept="image/*" style={{ display: "none" }}
                    onChange={e => addImages(e.target.files)} />
                </div>

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {existingImages.map((src, i) => (
                      <div key={i} style={{ position: "relative", aspectRatio: "1/1", border: "2px solid #111110", overflow: "hidden" }}>
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeExisting(i)}
                          style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <X size={12} color="#FFD400" />
                        </button>
                        {i === 0 && (
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#FFD400", padding: "2px 6px", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", color: "#111110" }}>
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* New image previews */}
                {newPreviews.length > 0 && (
                  <>
                    {existingImages.length > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>New uploads</div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {newPreviews.map((src, i) => (
                        <div key={i} style={{ position: "relative", aspectRatio: "1/1", border: "2px solid #4ECDC4", overflow: "hidden" }}>
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button type="button" onClick={() => removeNew(i)}
                            style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <X size={12} color="#FFD400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {totalImages === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#d4cfc4", fontSize: 12, fontWeight: 600 }}>
                    <ImageIcon size={16} /> No images yet
                  </div>
                )}
              </Section>

              {/* Framed + Editions */}
              <Section title="Physical Details">
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F5F0E8", cursor: "pointer" }}
                  onClick={() => setForm(p => ({ ...p, framed: !p.framed }))}>
                  <div style={{ width: 20, height: 20, border: `2px solid ${form.framed ? "#FFD400" : "#E0D8CA"}`, background: form.framed ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {form.framed && <div style={{ width: 10, height: 10, background: "#111110" }} />}
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#111110", cursor: "pointer" }}>Artwork is framed</label>
                </div>
                <div>
                  <Label>Number of editions</Label>
                  <input type="number" min="1" value={form.editions} onChange={sf("editions")} placeholder="1 (unique)" style={inputStyle} {...focusStyle} />
                </div>
              </Section>

              {/* Business */}
              <Section title="Business">
                <div>
                  <Label>Materials cost ($)</Label>
                  <input type="number" min="0" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0" style={inputStyle} {...focusStyle} />
                </div>
                <div>
                  <Label>Time spent (hours)</Label>
                  <input type="number" min="0" value={form.time_spent} onChange={sf("time_spent")} placeholder="0" style={inputStyle} {...focusStyle} />
                </div>
                {form.price && form.materials_cost && (
                  <div style={{ background: "#DCFCE7", border: "2px solid #16A34A", padding: "10px 14px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Est. profit</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#166534", fontFamily: "monospace" }}>
                      ${(Number(form.price) - Number(form.materials_cost)).toLocaleString()}
                    </div>
                  </div>
                )}
              </Section>
            </div>

            {/* ── RIGHT: All details ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Core identity */}
              <Section title="Artwork Details">
                <div>
                  <Label>Title *</Label>
                  <input required value={form.title} onChange={sf("title")} placeholder="Untitled Composition" style={inputStyle} {...focusStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Label>Year</Label>
                    <input type="number" value={form.year} onChange={sf("year")} placeholder="2024" style={inputStyle} {...focusStyle} />
                  </div>
                  <div>
                    <Label>Medium</Label>
                    <input value={form.medium} onChange={sf("medium")} placeholder="Oil on canvas" style={inputStyle} {...focusStyle} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea rows={3} value={form.description} onChange={sf("description")} placeholder="Describe this work, technique, inspiration…"
                    style={{ ...inputStyle, resize: "vertical" }} {...focusStyle} />
                </div>
                <div>
                  <Label>Notes (internal)</Label>
                  <textarea rows={2} value={form.notes} onChange={sf("notes")} placeholder="Private notes, storage info, provenance…"
                    style={{ ...inputStyle, resize: "vertical" }} {...focusStyle} />
                </div>
              </Section>

              {/* Dimensions */}
              <Section title="Dimensions">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <Label>Width (cm)</Label>
                    <input type="number" min="0" value={form.width_cm} onChange={sf("width_cm")} placeholder="80" style={inputStyle} {...focusStyle} />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <input type="number" min="0" value={form.height_cm} onChange={sf("height_cm")} placeholder="60" style={inputStyle} {...focusStyle} />
                  </div>
                  <div>
                    <Label>Depth (cm)</Label>
                    <input type="number" min="0" value={form.depth_cm} onChange={sf("depth_cm")} placeholder="2" style={inputStyle} {...focusStyle} />
                  </div>
                </div>
                {(form.width_cm || form.height_cm) && (
                  <div style={{ fontSize: 12, color: "#9B8F7A", fontFamily: "monospace", fontWeight: 700 }}>
                    {[form.width_cm, form.height_cm, form.depth_cm].filter(Boolean).join(" × ")} cm
                  </div>
                )}
              </Section>

              {/* Lifecycle & Sales */}
              <Section title="Lifecycle & Sales">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Label>Stage</Label>
                    <select value={form.status} onChange={sf("status")} style={{ ...inputStyle, cursor: "pointer" }} {...focusStyle}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Sale method</Label>
                    <select value={form.sale_method} onChange={sf("sale_method")} style={{ ...inputStyle, cursor: "pointer" }} {...focusStyle}>
                      <option value="">— Select —</option>
                      {SALE_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12 }}>
                  <div>
                    <Label>Price</Label>
                    <input type="number" min="0" value={form.price} onChange={sf("price")} placeholder="0" style={inputStyle} {...focusStyle} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <select value={form.currency} onChange={sf("currency")} style={{ ...inputStyle, cursor: "pointer" }} {...focusStyle}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="IRR">IRR</option>
                    </select>
                  </div>
                </div>
              </Section>

              <Section title="Location & Visibility">
                <PlacesAutocomplete
                  label="Current location / studio"
                  value={form.location}
                  placeholder="Search address…"
                  onChange={(result, raw) => {
                    setForm(p => ({ ...p, location: raw }));
                    if (result) setLocationCoords({ lat: result.lat, lng: result.lng });
                  }}
                />
                <PlacesAutocomplete
                  label="Venue / exhibition location"
                  value={form.location_name || form.venue_location}
                  placeholder="Gallery, museum, café…"
                  onChange={(result, raw) => {
                    setForm(p => ({ ...p, location_name: raw, venue_location: raw }));
                    if (result) setVenueCoords({ lat: result.lat, lng: result.lng });
                    else setVenueCoords(null);
                  }}
                />
                {venueCoords && (
                  <div style={{ fontSize: 10, color: "#4ECDC4", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    ✓ Location saved — will appear on the map
                  </div>
                )}
              </Section>

              {/* Save button at bottom too */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 4 }}>
                <Link href={`/dashboard/artworks/${id}`} style={{ textDecoration: "none" }}>
                  <button type="button" style={{ padding: "11px 20px", border: "2px solid #111110", background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Cancel
                  </button>
                </Link>
                <button type="submit" disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 24px", border: "2px solid #111110", background: "#FFD400", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
                  <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
