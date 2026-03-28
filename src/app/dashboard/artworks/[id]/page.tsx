"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Edit2, Trash2, Image as ImageIcon } from "lucide-react";

type Artwork = {
  id: string; title: string; year?: number; medium?: string; dimensions?: string;
  price?: number; status: string; description?: string; location?: string;
  notes?: string; images?: string[]; created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  Available: "badge-available", available: "badge-available",
  Sold: "badge-sold", sold: "badge-sold",
  Reserved: "badge-reserved", reserved: "badge-reserved",
  "Not for Sale": "badge-nfs", "not for sale": "badge-nfs",
  "In Storage": "badge-storage", "in storage": "badge-storage",
};

export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("artworks").select("*").eq("id", id).single().then(({ data }) => {
      setArtwork(data);
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this artwork permanently?")) return;
    const supabase = createClient();
    await supabase.from("artworks").delete().eq("id", id);
    router.push("/dashboard/artworks");
  }

  if (loading) return <div className="card p-12 text-center text-stone-400">Loading...</div>;
  if (!artwork) return <div className="card p-12 text-center text-stone-400">Artwork not found</div>;

  const details = [
    { label: "Year", value: artwork.year },
    { label: "Medium", value: artwork.medium },
    { label: "Dimensions", value: artwork.dimensions },
    { label: "Price", value: artwork.price ? `$${artwork.price.toLocaleString()}` : null },
    { label: "Location", value: artwork.location },
  ].filter(d => d.value);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/artworks" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="page-title">{artwork.title}</h1>
          <span className={STATUS_BADGE[artwork.status] || "badge-nfs"}>{artwork.status}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/artworks/${id}/edit`} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 mb-3">
            {artwork.images && artwork.images.length > 0 ? (
              <img src={artwork.images[activeImg]} alt={artwork.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-stone-300" />
              </div>
            )}
          </div>
          {artwork.images && artwork.images.length > 1 && (
            <div className="flex gap-2">
              {artwork.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${activeImg === i ? "border-stone-900" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="heading-sm mb-4">Details</h2>
            <dl className="space-y-3">
              {details.map(d => (
                <div key={d.label} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                  <dt className="text-sm text-stone-500">{d.label}</dt>
                  <dd className="text-sm font-medium text-stone-900 font-mono">{String(d.value)}</dd>
                </div>
              ))}
              <div className="flex justify-between py-2">
                <dt className="text-sm text-stone-500">Status</dt>
                <dd><span className={STATUS_BADGE[artwork.status] || "badge-nfs"}>{artwork.status}</span></dd>
              </div>
            </dl>
          </div>

          {artwork.description && (
            <div className="card p-5">
              <h2 className="heading-sm mb-3">Description</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{artwork.description}</p>
            </div>
          )}

          {artwork.notes && (
            <div className="card p-5">
              <h2 className="heading-sm mb-3">Notes</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{artwork.notes}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Link href={`/dashboard/artworks/${id}/edit`} className="btn-primary flex-1 justify-center">
              <Edit2 className="w-4 h-4" /> Edit Artwork
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
