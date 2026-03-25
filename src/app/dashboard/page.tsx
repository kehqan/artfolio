import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Image,
  FolderOpen,
  Globe,
  PlusCircle,
  ArrowRight,
  Palette,
  Building2,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get counts
  const { count: artworkCount } = await supabase
    .from("artworks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: collectionCount } = await supabase
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || "there";
  const role = profile?.role || user.user_metadata?.role || "artist";

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          {role === "gallery" ? (
            <Building2
              size={20}
              className="text-accent-500"
              strokeWidth={1.5}
            />
          ) : (
            <Palette
              size={20}
              className="text-accent-500"
              strokeWidth={1.5}
            />
          )}
          <span className="section-label">
            {role === "gallery" ? "Gallery" : "Artist"} Dashboard
          </span>
        </div>
        <h1 className="heading-lg">
          Welcome back,{" "}
          <span className="text-accent-400">{displayName}</span>
        </h1>
        <p className="text-canvas-500 mt-2">
          Here&apos;s an overview of your Artfolio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-canvas-800/30 mb-10">
        <div className="bg-canvas-950 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Image size={18} className="text-accent-500" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500">
              Artworks
            </span>
          </div>
          <p className="font-display text-3xl text-canvas-50">
            {artworkCount || 0}
          </p>
        </div>
        <div className="bg-canvas-950 p-6">
          <div className="flex items-center gap-3 mb-3">
            <FolderOpen
              size={18}
              className="text-accent-500"
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500">
              Collections
            </span>
          </div>
          <p className="font-display text-3xl text-canvas-50">
            {collectionCount || 0}
          </p>
        </div>
        <div className="bg-canvas-950 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Globe size={18} className="text-accent-500" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-canvas-500">
              Portfolio
            </span>
          </div>
          <p className="text-sm text-canvas-400 mt-1">
            {profile?.username ? (
              <span className="text-accent-400">
                /portfolio/{profile.username}
              </span>
            ) : (
              <span className="text-canvas-600">Not set up yet</span>
            )}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-400 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/artworks/new"
            className="group p-5 border border-canvas-800/40 hover:border-accent-500/30 bg-canvas-900/20 hover:bg-canvas-900/40 transition-all duration-300"
          >
            <PlusCircle
              size={20}
              className="text-accent-500 mb-3"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-lg text-canvas-50 group-hover:text-accent-400 transition-colors">
              Add Artwork
            </h3>
            <p className="text-sm text-canvas-500 mt-1">
              Upload and catalog a new piece.
            </p>
            <ArrowRight
              size={14}
              className="text-canvas-600 group-hover:text-accent-500 mt-3 transition-colors"
            />
          </Link>

          <Link
            href="/dashboard/collections"
            className="group p-5 border border-canvas-800/40 hover:border-accent-500/30 bg-canvas-900/20 hover:bg-canvas-900/40 transition-all duration-300"
          >
            <FolderOpen
              size={20}
              className="text-accent-500 mb-3"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-lg text-canvas-50 group-hover:text-accent-400 transition-colors">
              Create Collection
            </h3>
            <p className="text-sm text-canvas-500 mt-1">
              Organize artworks into groups.
            </p>
            <ArrowRight
              size={14}
              className="text-canvas-600 group-hover:text-accent-500 mt-3 transition-colors"
            />
          </Link>

          <Link
            href="/dashboard/settings"
            className="group p-5 border border-canvas-800/40 hover:border-accent-500/30 bg-canvas-900/20 hover:bg-canvas-900/40 transition-all duration-300"
          >
            <Globe
              size={20}
              className="text-accent-500 mb-3"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-lg text-canvas-50 group-hover:text-accent-400 transition-colors">
              Edit Profile
            </h3>
            <p className="text-sm text-canvas-500 mt-1">
              Update your bio and portfolio settings.
            </p>
            <ArrowRight
              size={14}
              className="text-canvas-600 group-hover:text-accent-500 mt-3 transition-colors"
            />
          </Link>
        </div>
      </div>

      {/* Getting Started Guide (shown when no artworks) */}
      {(artworkCount || 0) === 0 && (
        <div className="border border-canvas-800/40 bg-canvas-900/20 p-8">
          <h2 className="heading-md mb-2">Getting Started</h2>
          <p className="text-canvas-500 mb-6">
            Welcome to Artfolio! Here&apos;s how to set up your account:
          </p>
          <div className="flex flex-col gap-4">
            {[
              {
                step: "1",
                title: "Complete your profile",
                desc: "Add your bio, website, and profile picture in Profile Settings.",
                done: !!profile?.bio,
              },
              {
                step: "2",
                title: "Add your first artwork",
                desc: "Upload an image and add details like title, medium, and dimensions.",
                done: (artworkCount || 0) > 0,
              },
              {
                step: "3",
                title: "Create a collection",
                desc: "Group your artworks into collections for exhibitions or series.",
                done: (collectionCount || 0) > 0,
              },
              {
                step: "4",
                title: "Share your portfolio",
                desc: "Your public portfolio is ready — share the link with the world!",
                done: false,
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`flex items-start gap-4 p-4 ${
                  item.done ? "opacity-50" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 flex items-center justify-center text-xs font-semibold shrink-0 ${
                    item.done
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-accent-500/10 text-accent-500 border border-accent-500/30"
                  }`}
                >
                  {item.done ? "✓" : item.step}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-canvas-200">
                    {item.title}
                  </h3>
                  <p className="text-xs text-canvas-500 mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
