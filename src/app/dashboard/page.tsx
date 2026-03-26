import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Image, FolderOpen, Globe, PlusCircle, ArrowRight, Palette, Building2, Calendar, DollarSign, Users } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { count: artworkCount } = await supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: collectionCount } = await supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: exhibitionCount } = await supabase.from("exhibitions").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const { count: saleCount } = await supabase.from("sales").select("*", { count: "exact", head: true }).eq("seller_id", user.id);
  const { count: followerCount } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id);

  const displayName = profile?.full_name || user.user_metadata?.full_name || "there";
  const role = profile?.role || "artist";

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {role === "gallery" ? <Building2 size={16} className="text-brand-600" /> : <Palette size={16} className="text-brand-600" />}
          <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">{role} Dashboard</span>
        </div>
        <h1 className="heading-lg">Welcome back, {displayName}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Artworks", count: artworkCount || 0, icon: Image, href: "/dashboard/artworks" },
          { label: "Collections", count: collectionCount || 0, icon: FolderOpen, href: "/dashboard/collections" },
          { label: "Exhibitions", count: exhibitionCount || 0, icon: Calendar, href: "/dashboard/exhibitions" },
          { label: "Sales", count: saleCount || 0, icon: DollarSign, href: "/dashboard/sales" },
          { label: "Followers", count: followerCount || 0, icon: Users, href: "/dashboard/discover" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-4 hover:shadow-card-hover transition-shadow group">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="text-slate-400" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{stat.count}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { title: "Add Artwork", desc: "Upload and catalog a new piece", icon: PlusCircle, href: "/dashboard/artworks/new" },
          { title: "New Collection", desc: "Group artworks together", icon: FolderOpen, href: "/dashboard/collections/new" },
          { title: "Plan Exhibition", desc: "Create a new show", icon: Calendar, href: "/dashboard/exhibitions/new" },
          { title: "Record Sale", desc: "Track an artwork sale", icon: DollarSign, href: "/dashboard/sales/new" },
        ].map((action) => (
          <Link key={action.title} href={action.href} className="card p-4 hover:shadow-card-hover transition-all group">
            <action.icon size={18} className="text-brand-600 mb-2" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{action.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      {(artworkCount || 0) === 0 && (
        <div className="card p-6">
          <h2 className="font-display text-lg text-slate-800 mb-4">Getting Started</h2>
          {[
            { step: "1", title: "Complete your profile", done: !!profile?.bio },
            { step: "2", title: "Add your first artwork", done: (artworkCount || 0) > 0 },
            { step: "3", title: "Create a collection", done: (collectionCount || 0) > 0 },
            { step: "4", title: "Share your portfolio", done: false },
          ].map((item) => (
            <div key={item.step} className={`flex items-center gap-3 py-2 ${item.done ? "opacity-40" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-brand-50 text-brand-600"}`}>
                {item.done ? "✓" : item.step}
              </div>
              <span className="text-sm text-slate-700">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
