import { FolderOpen, Construction } from "lucide-react";

export default function CollectionsPage() {
  return (
    <div>
      <div className="mb-8">
        <span className="section-label">Organize</span>
        <h1 className="heading-md mt-2">My Collections</h1>
      </div>

      <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center">
        <Construction
          size={40}
          className="text-accent-500 mx-auto mb-4"
          strokeWidth={1}
        />
        <h2 className="font-display text-xl text-canvas-300">
          Coming in Phase 5
        </h2>
        <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
          Collections will let you group artworks for exhibitions, portfolios,
          and series.
        </p>
      </div>
    </div>
  );
}
