import Link from "next/link";
import { Image, PlusCircle } from "lucide-react";

export default function ArtworksPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="section-label">Inventory</span>
          <h1 className="heading-md mt-2">My Artworks</h1>
        </div>
        <Link href="/dashboard/artworks/new" className="btn-primary">
          <PlusCircle size={16} />
          Add Artwork
        </Link>
      </div>

      <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center">
        <Image
          size={40}
          className="text-canvas-700 mx-auto mb-4"
          strokeWidth={1}
        />
        <h2 className="font-display text-xl text-canvas-300">
          No artworks yet
        </h2>
        <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
          Start building your inventory by adding your first artwork.
        </p>
        <Link
          href="/dashboard/artworks/new"
          className="btn-primary mt-6 inline-flex"
        >
          <PlusCircle size={16} />
          Add Your First Artwork
        </Link>
      </div>
    </div>
  );
}
