"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ImageUpload from "./ImageUpload";

interface ArtworkData {
  id?: string;
  title: string;
  description: string;
  year: string;
  medium: string;
  width_cm: string;
  height_cm: string;
  depth_cm: string;
  price: string;
  currency: string;
  status: string;
  location: string;
  notes: string;
  images: string[];
}

const defaultData: ArtworkData = {
  title: "",
  description: "",
  year: "",
  medium: "",
  width_cm: "",
  height_cm: "",
  depth_cm: "",
  price: "",
  currency: "USD",
  status: "available",
  location: "",
  notes: "",
  images: [],
};

const currencies = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"];
const statuses = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "not_for_sale", label: "Not for Sale" },
  { value: "reserved", label: "Reserved" },
];
const commonMedia = [
  "Oil on Canvas",
  "Acrylic on Canvas",
  "Watercolor",
  "Mixed Media",
  "Photography",
  "Digital Art",
  "Sculpture",
  "Print",
  "Ink on Paper",
  "Charcoal",
  "Pastel",
  "Ceramic",
  "Bronze",
  "Wood",
  "Installation",
];

interface ArtworkFormProps {
  artwork?: ArtworkData;
  isEditing?: boolean;
}

export default function ArtworkForm({ artwork, isEditing }: ArtworkFormProps) {
  const [data, setData] = useState<ArtworkData>(artwork || defaultData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function updateField(field: keyof ArtworkData, value: any) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!data.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      title: data.title.trim(),
      description: data.description.trim() || null,
      year: data.year ? parseInt(data.year) : null,
      medium: data.medium.trim() || null,
      width_cm: data.width_cm ? parseFloat(data.width_cm) : null,
      height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
      depth_cm: data.depth_cm ? parseFloat(data.depth_cm) : null,
      price: data.price ? parseFloat(data.price) : null,
      currency: data.currency,
      status: data.status,
      location: data.location.trim() || null,
      notes: data.notes.trim() || null,
      images: data.images,
      updated_at: new Date().toISOString(),
    };

    if (isEditing && data.id) {
      const { error: updateError } = await supabase
        .from("artworks")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError("Failed to update artwork. Please try again.");
        console.error(updateError);
        setSaving(false);
        return;
      }

      router.push(`/dashboard/artworks/${data.id}`);
    } else {
      const { data: newArtwork, error: insertError } = await supabase
        .from("artworks")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        setError("Failed to save artwork. Please try again.");
        console.error(insertError);
        setSaving(false);
        return;
      }

      router.push(`/dashboard/artworks/${newArtwork.id}`);
    }

    router.refresh();
  }

  const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all";
  const labelClass =
    "block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2";

  return (
    <div>
      <Link
        href="/dashboard/artworks"
        className="inline-flex items-center gap-2 text-sm text-slate-9000 hover:text-slate-600 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Artworks
      </Link>

      <div className="mb-8">
        <span className="section-label">{isEditing ? "Edit" : "New"}</span>
        <h1 className="heading-md mt-2">
          {isEditing ? "Edit Artwork" : "Add Artwork"}
        </h1>
        <p className="text-slate-9000 mt-1 text-sm">
          {isEditing
            ? "Update the details of your artwork."
            : "Fill in the details to add a new artwork to your inventory."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Images ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-150">
            Images
          </h2>
          <ImageUpload
            images={data.images}
            onChange={(imgs) => updateField("images", imgs)}
          />
        </section>

        {/* ── Basic Info ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-150">
            Basic Information
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={data.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Artwork title"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={data.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                placeholder="Describe this artwork..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  value={data.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  placeholder="2024"
                  min="1000"
                  max="2099"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Medium</label>
                <input
                  type="text"
                  value={data.medium}
                  onChange={(e) => updateField("medium", e.target.value)}
                  placeholder="e.g. Oil on Canvas"
                  list="media-suggestions"
                  className={inputClass}
                />
                <datalist id="media-suggestions">
                  {commonMedia.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dimensions ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-150">
            Dimensions (cm)
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Width</label>
              <input
                type="number"
                value={data.width_cm}
                onChange={(e) => updateField("width_cm", e.target.value)}
                placeholder="0"
                step="0.1"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Height</label>
              <input
                type="number"
                value={data.height_cm}
                onChange={(e) => updateField("height_cm", e.target.value)}
                placeholder="0"
                step="0.1"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Depth</label>
              <input
                type="number"
                value={data.depth_cm}
                onChange={(e) => updateField("depth_cm", e.target.value)}
                placeholder="0"
                step="0.1"
                min="0"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ── Pricing & Status ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-150">
            Pricing & Status
          </h2>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Price</label>
                <div className="flex">
                  <select
                    value={data.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-200 text-slate-500 text-sm focus:outline-none"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={data.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`${inputClass} flex-1`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateField("status", s.value)}
                      className={`px-3 py-2.5 border text-sm transition-all duration-200 ${
                        data.status === s.value
                          ? "border-brand-500 bg-brand-50 text-brand-600"
                          : "border-slate-200 text-slate-9000 hover:border-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Location & Notes ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4 pb-2 border-b border-slate-150">
            Location & Notes
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g. Studio, Gallery XYZ, Storage"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Private Notes</label>
              <textarea
                value={data.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                placeholder="Personal notes (not visible to others)..."
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-slate-400 mt-1">
                Only visible to you. Use for reminders, history, or context.
              </p>
            </div>
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="pt-6 border-t border-slate-150 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? "Update Artwork" : "Save Artwork"}
              </>
            )}
          </button>
          <Link
            href="/dashboard/artworks"
            className="text-sm text-slate-9000 hover:text-slate-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
