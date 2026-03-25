import { MessageSquare, Construction } from "lucide-react";

export default function FeedPage() {
  return (
    <div>
      <div className="mb-8">
        <span className="section-label">Community</span>
        <h1 className="heading-md mt-2">Feed</h1>
      </div>

      <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center">
        <Construction
          size={40}
          className="text-accent-500 mx-auto mb-4"
          strokeWidth={1}
        />
        <h2 className="font-display text-xl text-canvas-300">
          Coming in Phase 7
        </h2>
        <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
          The social feed will let you share updates, post images, and connect
          with other artists and galleries.
        </p>
      </div>
    </div>
  );
}
