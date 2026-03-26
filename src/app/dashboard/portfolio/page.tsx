import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, Settings, Copy } from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const username = profile?.username;

  const { count: artworkCount } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: collectionCount } = await supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_public", true);

  return (
    <div>
      <div className="mb-8">
        <span className="section-label">Showcase</span>
        <h1 className="heading-md mt-2">My Portfolio</h1>
        <p className="text-sm text-canvas-500 mt-1">Your public portfolio page that anyone can visit.</p>
      </div>

      {username ? (
        <div className="space-y-6">
          {/* Portfolio URL */}
          <div className="border border-canvas-800/40 bg-canvas-900/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-2">Your Portfolio URL</h2>
                <p className="text-accent-400 font-medium">/portfolio/{username}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyLinkButton username={username} />
                <Link href={`/portfolio/${username}`} target="_blank" className="btn-primary !py-2 !px-4 text-xs">
                  <ExternalLink size={14} /> View Live
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-canvas-800/30">
            <div className="bg-canvas-950 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500 mb-2">Artworks Shown</p>
              <p className="font-display text-2xl text-canvas-50">{artworkCount || 0}</p>
            </div>
            <div className="bg-canvas-950 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500 mb-2">Public Collections</p>
              <p className="font-display text-2xl text-canvas-50">{collectionCount || 0}</p>
            </div>
            <div className="bg-canvas-950 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500 mb-2">Profile</p>
              <p className="text-sm text-canvas-300">{profile?.bio ? "Bio added" : "No bio yet"}</p>
            </div>
          </div>

          {/* Tips */}
          <div className="border border-canvas-800/40 bg-canvas-900/20 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-4">Make Your Portfolio Stand Out</h2>
            <div className="space-y-3 text-sm text-canvas-400">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <span>Add a compelling bio in <Link href="/dashboard/settings" className="text-accent-500 hover:text-accent-400">Profile Settings</Link></span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <span>Upload high-quality images for each artwork</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <span>Create public collections to group your best work</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2 shrink-0" />
                <span>Fill in artwork details — medium, dimensions, and year</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-canvas-800/40 bg-canvas-900/20 p-16 text-center">
          <Globe size={40} className="text-canvas-700 mx-auto mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl text-canvas-300">Set Up Your Username First</h2>
          <p className="text-sm text-canvas-500 mt-2 max-w-sm mx-auto">
            You need a username to create your public portfolio page.
          </p>
          <Link href="/dashboard/settings" className="btn-primary mt-6 inline-flex">
            <Settings size={16} /> Go to Profile Settings
          </Link>
        </div>
      )}
    </div>
  );
}
