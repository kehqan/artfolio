"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function EditArtworkPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState({
    title: "", year: "", medium: "", dimensions: "", price: "",
    status: "Available", description: "", location: "", notes: "",
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setForm({
          title: data.title || "", year: data.year ? String(data.year) : "",
          medium: data.medium || "", dimensions: data.dimensions || "",
          price: data.price ? String(data.price) : "", status: data.status || "Available",
          description: data.description || "", location: data.location || "", notes: data.notes || "",
        });
        setExistingImages(data.images || []);
      }
      setLoading(false);
    });
  }, [id]);

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

    await supabase.from("artworks").update({
      title: form.title, year: form.year ? parseInt(form.year) : null,
      medium: form.medium || null, dimensions: form.dimensions || null,
      price: form.price ? parseFloat(form.price) : null, status: form.status,
      description: form.description || null, location: form.location || null,
      notes: form.notes || null, images: [...existingImages, ...uploadedUrls],
    }).eq("id", id);

    router.push(`/dashboard/artworks/${id}`);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/artworks/${id}`} className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">Edit Artwork</h1>
          <p className="page-subtitle">Update artwork details</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images */}
          <div className="card p-5">
            <h2 className="heading-sm mb-4">Images</h2>
            {existingImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {existingImages.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setExistingImages(p => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {newPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 mb-2">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => {
                  setNewPreviews(p => p.filter((_, idx) => idx !== i));
                  setNewFiles(p => p.filter((_, idx) => idx !== i));
                }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer hover:border-stone-400 transition-colors"
              onClick={() => document.getElementById("img-input")?.click()}>
              <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1" />
              <p className="text-xs text-stone-500">Add more images</p>
              <input id="img-input" type="file" multiple accept="image/*" className="hidden" onChange={e => handleNewImages(e.target.files)} />
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5 space-y-4">
              <h2 className="heading-sm">Artwork Details</h2>
              <div>
                <label className="label">Title *</label>
                <input required className="input" value={form.title} onChange={set("title")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Year</label><input type="number" className="input" value={form.year} onChange={set("year")} /></div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={set("status")}>
                    <option>Available</option><option>Sold</option><option>Reserved</option>
                    <option>Not for Sale</option><option>In Storage</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Medium</label><input className="input" value={form.medium} onChange={set("medium")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Dimensions</label><input className="input" value={form.dimensions} onChange={set("dimensions")} /></div>
                <div><label className="label">Price (USD)</label><input type="number" className="input" value={form.price} onChange={set("price")} /></div>
              </div>
              <div><label className="label">Description</label><textarea rows={3} className="textarea" value={form.description} onChange={set("description")} /></div>
              <div><label className="label">Location</label><input className="input" value={form.location} onChange={set("location")} /></div>
              <div><label className="label">Notes</label><textarea rows={2} className="textarea" value={form.notes} onChange={set("notes")} /></div>
            </div>
            <div className="flex gap-3 justify-end">
              <Link href={`/dashboard/artworks/${id}`} className="btn-secondary">Cancel</Link>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
