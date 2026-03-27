"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function NewArtworkPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "", year: "", medium: "", dimensions: "", price: "",
    status: "Available", description: "", location: "", notes: "", collection_id: "",
    is_one_of_a_kind: false,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("collections").select("id, name").eq("user_id", user.id).then(({ data }) => setCollections(data || []));
    });
  }, []);

  function handleImages(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
    setImageFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeImage(i: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
    }

    const { data, error } = await supabase.from("artworks").insert({
      user_id: user.id,
      title: form.title,
      year: form.year ? parseInt(form.year) : null,
      medium: form.medium || null,
      dimensions: form.dimensions || null,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      description: form.description || null,
      location: form.location || null,
      notes: form.notes || null,
      collection_id: form.collection_id || null,
      is_one_of_a_kind: form.is_one_of_a_kind,
      images: uploadedUrls,
    }).select().single();

    if (!error && data) {
      if (form.collection_id) {
        await supabase.from("collection_artworks").insert({ collection_id: form.collection_id, artwork_id: data.id });
      }
      router.push("/dashboard/artworks");
    }
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/artworks" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">Add Artwork</h1>
          <p className="page-subtitle">Add a new work to your inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images */}
          <div className="lg:col-span-1">
            <div className="card p-5">
              <h2 className="heading-sm mb-4">Images</h2>
              <div
                className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-stone-400 transition-colors"
                onClick={() => document.getElementById("image-input")?.click()}
              >
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-600">Click to upload images</p>
                <p className="text-xs text-stone-400 mt-1">Up to 5 images, PNG/JPG</p>
                <input id="image-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImages(e.target.files)} />
              </div>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5">
              <h2 className="heading-sm mb-4">Artwork Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input required className="input" value={form.title} onChange={set("title")} placeholder="Untitled Composition" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Year</label>
                    <input type="number" className="input" value={form.year} onChange={set("year")} placeholder="2024" />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="select" value={form.status} onChange={set("status")}>
                      <option>Available</option><option>Sold</option>
                      <option>Reserved</option><option>Not for Sale</option>
                      <option>In Storage</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Medium</label>
                  <input className="input" value={form.medium} onChange={set("medium")} placeholder="Oil on canvas" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Dimensions</label>
                    <input className="input" value={form.dimensions} onChange={set("dimensions")} placeholder='24" × 36"' />
                  </div>
                  <div>
                    <label className="label">Price (USD)</label>
                    <input type="number" className="input" value={form.price} onChange={set("price")} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea rows={3} className="textarea" value={form.description} onChange={set("description")} placeholder="Describe this work..." />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="heading-sm mb-4">Additional Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.location} onChange={set("location")} placeholder="Studio, Gallery name..." />
                </div>
                {collections.length > 0 && (
                  <div>
                    <label className="label">Add to Collection</label>
                    <select className="select" value={form.collection_id} onChange={set("collection_id")}>
                      <option value="">None</option>
                      {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Notes</label>
                  <textarea rows={2} className="textarea" value={form.notes} onChange={set("notes")} placeholder="Internal notes..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Link href="/dashboard/artworks" className="btn-secondary">Cancel</Link>
                            <label className="flex items-center gap-3 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={form.is_one_of_a_kind}
                  onChange={(e) => setForm(f => ({ ...f, is_one_of_a_kind: e.target.checked }))}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm font-medium">One of a Kind (unique work)</span>
              </label>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save Artwork"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
