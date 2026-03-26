import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Ruler,
  MapPin,
  Tag,
  DollarSign,
  FileText,
  ImageIcon,
} from "lucide-react";
import DeleteArtworkButton from "./DeleteButton";

interface Props {
  params: { id: string };
}

const statusColors: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  sold: "bg-red-50 text-red-600 border-red-200",
  not_for_sale: "bg-slate-300/20 text-slate-500 border-slate-200",
  reserved: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  sold: "Sold",
  not_for_sale: "Not for Sale",
  reserved: "Reserved",
};

export default async function ArtworkDetailPage({ params }: Props) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: artwork } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!artwork) notFound();

  const dimensions = [
    artwork.width_cm && `${artwork.width_cm}`,
    artwork.height_cm && `${artwork.height_cm}`,
    artwork.depth_cm && `${artwork.depth_cm}`,
  ]
    .filter(Boolean)
    .join(" × ");

  return (
    <div>
      <Link
        href="/dashboard/artworks"
        className="inline-flex items-center gap-2 text-sm text-slate-9000 hover:text-slate-600 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Artworks
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="heading-md">{artwork.title}</h1>
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 border ${
                statusColors[artwork.status] || statusColors.available
              }`}
            >
              {statusLabels[artwork.status] || artwork.status}
            </span>
          </div>
          {artwork.year && (
            <p className="text-sm text-slate-9000">{artwork.year}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/artworks/${artwork.id}/edit`}
            className="btn-secondary !py-2 !px-4 text-xs"
          >
            <Pencil size={14} />
            Edit
          </Link>
          <DeleteArtworkButton artworkId={artwork.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Images */}
        <div className="lg:col-span-2">
          {artwork.images && artwork.images.length > 0 ? (
            <div className="space-y-3">
              {/* Main Image */}
              <div className="aspect-[4/3] bg-slate-50 border border-slate-150 overflow-hidden">
                <img
                  src={artwork.images[0]}
                  alt={artwork.title}
                  className="w-full h-full object-contain bg-slate-50"
                />
              </div>
              {/* Thumbnails */}
              {artwork.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {artwork.images.map((img: string, i: number) => (
                    <div
                      key={i}
                      className={`aspect-square bg-slate-50 border overflow-hidden ${
                        i === 0
                          ? "border-brand-500"
                          : "border-slate-150"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${artwork.title} ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[4/3] bg-white border border-slate-150 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon
                  size={40}
                  className="text-slate-300 mx-auto mb-3"
                  strokeWidth={1}
                />
                <p className="text-sm text-slate-400">No images uploaded</p>
                <Link
                  href={`/dashboard/artworks/${artwork.id}/edit`}
                  className="text-xs text-brand-600 hover:text-brand-600 mt-2 inline-block"
                >
                  Add images →
                </Link>
              </div>
            </div>
          )}

          {/* Description */}
          {artwork.description && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Description
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {artwork.description}
              </p>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="border border-slate-150 bg-slate-50">
            <div className="p-5 border-b border-slate-150">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Details
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {artwork.medium && (
                <div className="flex items-start gap-3">
                  <Tag size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-9000">Medium</p>
                    <p className="text-sm text-slate-700">{artwork.medium}</p>
                  </div>
                </div>
              )}
              {artwork.year && (
                <div className="flex items-start gap-3">
                  <Calendar
                    size={15}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-9000">Year</p>
                    <p className="text-sm text-slate-700">{artwork.year}</p>
                  </div>
                </div>
              )}
              {dimensions && (
                <div className="flex items-start gap-3">
                  <Ruler
                    size={15}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-9000">Dimensions</p>
                    <p className="text-sm text-slate-700">{dimensions} cm</p>
                  </div>
                </div>
              )}
              {artwork.price != null && (
                <div className="flex items-start gap-3">
                  <DollarSign
                    size={15}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-9000">Price</p>
                    <p className="text-sm text-slate-700">
                      {artwork.currency}{" "}
                      {parseFloat(artwork.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {artwork.location && (
                <div className="flex items-start gap-3">
                  <MapPin
                    size={15}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-9000">Location</p>
                    <p className="text-sm text-slate-700">
                      {artwork.location}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {artwork.notes && (
            <div className="border border-slate-150 bg-slate-50">
              <div className="p-5 border-b border-slate-150">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <FileText size={13} />
                  Private Notes
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500 whitespace-pre-wrap">
                  {artwork.notes}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-slate-400 space-y-1">
            <p>
              Added{" "}
              {new Date(artwork.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {artwork.updated_at !== artwork.created_at && (
              <p>
                Updated{" "}
                {new Date(artwork.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
