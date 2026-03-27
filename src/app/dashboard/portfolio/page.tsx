import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Globe, ExternalLink, Copy } from "lucide-react";

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("username, full_name, bio, avatar_url").eq("id", user.id).single();
  const { count: artworkCount } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: collectionCount } = await supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_public", true);

  const portfolioUrl = profile?.username ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://artfolio-tawny.vercel.app"}/portfolio/${profile.username}` : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Portfolio</h1>
        <p className="page-subtitle">Your public-facing gallery page</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="heading-sm">Portfolio URL</h2>
              <p className="text-xs text-stone-500">Share this with the world</p>
            </div>
          </div>
          {portfolioUrl ? (
            <div>
              <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 mb-4">
                <span className="text-sm text-stone-600 flex-1 truncate font-mono">{portfolioUrl}</span>
              </div>
              <div className="flex gap-2">
                <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center">
                  <ExternalLink className="w-4 h-4" /> View Live
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-700 mb-3">Set a username to get your portfolio URL</p>
              <Link href="/dashboard/profile" className="btn-accent text-xs py-2">Set Username →</Link>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="heading-sm mb-4">Portfolio Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-sm text-stone-600">Artworks shown</span>
              <span className="font-semibold text-stone-900">{artworkCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <span className="text-sm text-stone-600">Public collections</span>
              <span className="font-semibold text-stone-900">{collectionCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-stone-600">Bio status</span>
              <span className={`badge ${profile?.bio ? "badge-available" : "badge-nfs"}`}>
                {profile?.bio ? "Complete" : "Missing"}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="heading-sm mb-3">Portfolio Tips</h2>
          <ul className="space-y-2 text-sm text-stone-600">
            {[
              "Add a professional bio in Profile Settings",
              "Upload a clear, professional profile photo",
              "Keep your best artworks marked as 'Available'",
              "Create public collections to showcase series",
              "Set your location to help galleries find you",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link href="/dashboard/profile" className="btn-secondary text-sm">Edit Profile Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
