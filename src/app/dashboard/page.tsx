import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Image, FolderOpen, LayoutGrid, BarChart3, Users,
  Plus, ArrowRight, MessageSquare, Compass, Handshake,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { count: artworkCount },
    { count: collectionCount },
    { count: exhibitionCount },
    { count: followerCount },
    { data: recentArtworks },
  ] = await Promise.all([
    supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("exhibitions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("artworks").select("id, title, images, status, price").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
  ]);

  const stats = [
    { label: "Artworks", value: artworkCount ?? 0, icon: Image, href: "/dashboard/artworks", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Collections", value: collectionCount ?? 0, icon: FolderOpen, href: "/dashboard/collections", color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Exhibitions", value: exhibitionCount ?? 0, icon: LayoutGrid, href: "/dashboard/exhibitions", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Followers", value: followerCount ?? 0, icon: Users, href: "/dashboard/discover", color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const quickActions = [
    { label: "Add Artwork", icon: Plus, href: "/dashboard/artworks/new", accent: true },
    { label: "New Collection", icon: FolderOpen, href: "/dashboard/collections/new" },
    { label: "Post to Feed", icon: MessageSquare, href: "/dashboard/feed" },
    { label: "Discover Artists", icon: Compass, href: "/dashboard/discover" },
    { label: "New Exhibition", icon: LayoutGrid, href: "/dashboard/exhibitions/new" },
    { label: "Record Sale", icon: BarChart3, href: "/dashboard/sales" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back — here's what's happening with your work.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card-hover p-5 flex items-center gap-4 group">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-stone-900">{stat.value}</p>
              <p className="text-xs text-stone-500">{stat.label}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-300 ml-auto group-hover:text-stone-500 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="heading-sm mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  action.accent
                    ? "bg-stone-900 text-white hover:bg-stone-800"
                    : "bg-stone-50 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <action.icon className="w-4 h-4 shrink-0" />
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Artworks */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-sm">Recent Artworks</h2>
            <Link href="/dashboard/artworks" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentArtworks && recentArtworks.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {recentArtworks.map((artwork) => {
                const image = artwork.images?.[0];
                const statusColors: Record<string, string> = {
                  available: "badge-available",
                  sold: "badge-sold",
                  reserved: "badge-reserved",
                  "not for sale": "badge-nfs",
                };
                return (
                  <Link key={artwork.id} href={`/dashboard/artworks/${artwork.id}`} className="group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 mb-2">
                      {image ? (
                        <img src={image} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-stone-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-stone-900 truncate">{artwork.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={statusColors[artwork.status?.toLowerCase()] || "badge-nfs"}>{artwork.status}</span>
                      {artwork.price && <span className="text-xs text-stone-500 font-mono">${artwork.price.toLocaleString()}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
                <Image className="w-7 h-7 text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-900 mb-1">No artworks yet</p>
              <p className="text-xs text-stone-500 mb-4">Start building your inventory</p>
              <Link href="/dashboard/artworks/new" className="btn-primary text-xs px-4 py-2">
                <Plus className="w-3.5 h-3.5" /> Add Artwork
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
