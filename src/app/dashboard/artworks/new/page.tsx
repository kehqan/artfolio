import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export default function NewArtworkPage() {
  return (
    <div>
      <Link
        href="/dashboard/artworks"
        className="inline-flex items-center gap-2 text-sm text-canvas-500 hover:text-canvas-300 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Artworks
      </Link>

      <div className="mb-8">
        <span className="section-label">New</span>
        <h1 className="heading-md mt-2">Add Artwork</h1>
      </div>

      <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center">
        <Construction
          size={40}
          className="text-accent-500 mx-auto mb-4"
          strokeWidth={1}
        />
        <h2 className="font-display text-xl text-canvas-300">
          Coming in Phase 4
        </h2>
        <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
          The artwork inventory system will let you upload images, add details,
          track status, and more.
        </p>
      </div>
    </div>
  );
}
