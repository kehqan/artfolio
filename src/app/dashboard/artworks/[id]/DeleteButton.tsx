"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteArtworkButton({
  artworkId,
}: {
  artworkId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("artworks")
      .delete()
      .eq("id", artworkId);

    if (error) {
      alert("Failed to delete artwork. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/dashboard/artworks");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            "Yes"
          )}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 border border-canvas-700 text-canvas-400 text-xs hover:text-canvas-200 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 px-4 py-2 border border-canvas-800/60 text-canvas-500 text-xs uppercase tracking-wide hover:border-red-500/50 hover:text-red-400 transition-all"
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}
