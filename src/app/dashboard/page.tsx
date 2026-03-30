import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ImageIcon, FolderOpen, LayoutGrid, Users,
  Plus, ArrowRight, TrendingUp, BarChart3,
  MessageSquare, Handshake, Eye, Zap, ArrowUpRight,
} from "lucide-react";

// Mini inline sparkline bars (pure CSS/SVG, no library needed)
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {values.map((v, i) => (
        <div key={i} className={`w-1.5 rounded-none transition-all ${color}`}
          style={{ height: `${Math.max(4, (v / max) * 40)}px`, opacity: i === values.length - 1 ? 1 : 0.4 + (i / values.length) * 0.5 }} />
      ))}
    </div>
  );
}

// Quick action card
function QuickAction({ href, icon: Icon, label, sub, accent }: { href: string; icon: React.ElementType; label: string; sub: string; accent?: boolean }) {
  return (
    <Link href={href}
      className={`flex items-center gap-4 px-4 py-3 border-b-2 border-black transition-all group hover:bg-[#FFD400] ${accent ? "bg-[#FFD400]" : "bg-white"}`}>
      <div className={`w-9 h-9 border-2 border-black flex items-center justify-center shrink-0 ${accent ? "bg-black" : "bg-[#FFFBEA] group-hover:bg-black"} transition-colors`}>
        <Icon className={`w-4 h-4 ${accent ? "text-[#FFD400]" : "text-black group-hover:text-[#FFD400]"} transition-colors`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-black">{label}</p>
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-wider">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-black/30 group-hover:text-black shrink-0 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { count: artworkCount },
    { count: collectionCount },
    { count: exhibitionCount },
    { count: followerCount },
    { count: saleCount },
    { data: recentArtworks },
    { data: recentSales },
  ] = await Promise.all([
    supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("exhibitions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("sales").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("artworks").select("id, title, images, status, price, medium").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("sales").select("id, title, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  // Fake sparkline data (would come from real analytics in prod)
  const stats = [
    { label: "Artworks",     value: artworkCount    ?? 0, icon: ImageIcon,   href: "/dashboard/artworks",    spark: [3,5,4,6,5,8,7,9,8,artworkCount??0],    color: "bg-[#FFD400]" },
    { label: "Collections",  value: collectionCount ?? 0, icon: FolderOpen,  href: "/dashboard/collections",  spark: [1,2,1,3,2,4,3,5,4,collectionCount??0],  color: "bg-[#FF6B6B]" },
    { label: "Exhibitions",  value: exhibitionCount ?? 0, icon: LayoutGrid,  href: "/dashboard/exhibitions",  spark: [0,1,0,2,1,2,1,3,2,exhibitionCount??0],  color: "bg-[#4ECDC4]" },
    { label: "Followers",    value: followerCount   ?? 0, icon: Users,       href: "/dashboard/discover",     spark: [2,4,3,5,6,5,7,8,9,followerCount??0],    color: "bg-black"     },
  ];

  const statusStyle: Record<string, string> = {
    available: "bg-[#FFD400] text-black border border-black",
    sold:      "bg-black text-[#FFD400] border border-black",
    reserved:  "bg-[#4ECDC4] text-black border border-black",
    "not for sale": "bg-stone-200 text-black border border-black",
  };

  const saleStatusStyle: Record<string, string> = {
    completed: "bg-[#FFD400] text-black border border-black",
    paid:      "bg-[#FFD400] text-black border border-black",
    pending:   "bg-[#4ECDC4] text-black border border-black",
    cancelled: "bg-[#FF6B6B] text-black border border-black",
  };

  return (
    <div>
      {/* ── PAGE HEADER ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-[#FFD400] fill-[#FFD400]" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase text-black/40">Overview</span>
          </div>
          <h1 className="font-black text-3xl text-black tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics"
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-sm font-black hover:bg-[#FFD400] transition-colors">
            <BarChart3 className="w-4 h-4" /> Analytics
          </Link>
          <Link href="/dashboard/artworks/new"
            className="flex items-center gap-2 px-4 py-2 bg-black text-[#FFD400] border-2 border-black text-sm font-black hover:bg-stone-900 transition-colors">
            <Plus className="w-4 h-4" /> Add Artwork
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8 border-2 border-black">
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href}
            className={`p-5 flex flex-col justify-between min-h-[120px] group hover:bg-[#FFD400] transition-colors ${i < 3 ? "border-r-2 border-black" : ""} ${i >= 2 ? "border-t-2 lg:border-t-0 border-black" : ""} bg-white`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-black/40 mb-1">{s.label}</p>
                <p className="text-3xl font-black text-black">{s.value}</p>
              </div>
              <Sparkline values={s.spark} color={s.color} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-black/40 group-hover:text-black transition-colors">
              <TrendingUp className="w-3 h-3" />
              <span>View all</span>
              <ArrowUpRight className="w-3 h-3 ml-auto" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── MAIN GRID ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col: recent artworks + sales */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Artworks */}
          <div className="bg-white border-2 border-black">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
              <div>
                <h2 className="font-black text-base text-black">Recent Artworks</h2>
                <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider mt-0.5">Latest additions to your inventory</p>
              </div>
              <Link href="/dashboard/artworks" className="flex items-center gap-1 text-xs font-black text-black border-2 border-black px-3 py-1.5 hover:bg-[#FFD400] transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentArtworks && recentArtworks.length > 0 ? (
              <div>
                {recentArtworks.map((aw, i) => (
                  <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`}
                    className={`flex items-center gap-4 px-5 py-3 hover:bg-[#FFFBEA] transition-colors group ${i < recentArtworks.length - 1 ? "border-b border-black/10" : ""}`}>
                    {/* Thumbnail */}
                    <div className="w-12 h-12 border-2 border-black overflow-hidden shrink-0 bg-stone-100">
                      {aw.images?.[0]
                        ? <img src={aw.images[0]} alt={aw.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-stone-300" /></div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-black truncate">{aw.title}</p>
                      {aw.medium && <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider truncate">{aw.medium}</p>}
                    </div>
                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                      {aw.price && <span className="text-sm font-black font-mono text-black">${aw.price.toLocaleString()}</span>}
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${statusStyle[aw.status?.toLowerCase()] || "bg-stone-100 text-black border border-black"}`}>
                        {aw.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-16 h-16 border-4 border-black bg-[#FFD400] flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-black" />
                </div>
                <p className="font-black text-black mb-1">No artworks yet</p>
                <p className="text-sm font-bold text-black/50 mb-4">Start building your portfolio</p>
                <Link href="/dashboard/artworks/new" className="flex items-center gap-2 px-5 py-2.5 bg-black text-[#FFD400] border-2 border-black font-black text-sm hover:bg-stone-900 transition-colors">
                  <Plus className="w-4 h-4" /> Add Artwork
                </Link>
              </div>
            )}
          </div>

          {/* Recent Sales */}
          {recentSales && recentSales.length > 0 && (
            <div className="bg-white border-2 border-black">
              <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
                <div>
                  <h2 className="font-black text-base text-black">Latest Sales</h2>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider mt-0.5">{saleCount ?? 0} total transactions</p>
                </div>
                <Link href="/dashboard/sales" className="flex items-center gap-1 text-xs font-black text-black border-2 border-black px-3 py-1.5 hover:bg-[#FFD400] transition-colors">
                  See all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black bg-[#FFFBEA]">
                    <th className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black/50">Artwork</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-black/50">Date</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black/50">Amount</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-black/50">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale, i) => (
                    <tr key={sale.id} className={`hover:bg-[#FFFBEA] transition-colors ${i < recentSales.length - 1 ? "border-b border-black/10" : ""}`}>
                      <td className="px-5 py-3 font-bold text-black truncate max-w-[160px]">{sale.title || "—"}</td>
                      <td className="px-3 py-3 text-[11px] font-bold text-black/40">
                        {sale.created_at ? new Date(sale.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-black text-black font-mono">{sale.amount ? `$${Number(sale.amount).toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${saleStatusStyle[sale.status?.toLowerCase()] || "bg-stone-100 text-black border border-black"}`}>
                          {sale.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right col: quick actions */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="bg-white border-2 border-black">
            <div className="px-5 py-4 border-b-2 border-black">
              <h2 className="font-black text-base text-black">Quick Actions</h2>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider mt-0.5">Jump to common tasks</p>
            </div>
            <div>
              <QuickAction href="/dashboard/artworks/new"  icon={Plus}         label="Add Artwork"       sub="Upload new work"         accent />
              <QuickAction href="/dashboard/collections/new" icon={FolderOpen}  label="New Collection"    sub="Organise your portfolio" />
              <QuickAction href="/dashboard/exhibitions/new" icon={LayoutGrid}  label="New Exhibition"    sub="Plan a show"             />
              <QuickAction href="/dashboard/feed"           icon={MessageSquare} label="Post to Feed"     sub="Share with community"    />
              <QuickAction href="/dashboard/pool"           icon={Handshake}    label="Discovery Pool"    sub="Find venues & artists"   />
              <QuickAction href="/dashboard/sales"          icon={BarChart3}    label="Record a Sale"     sub="Track revenue"           />
              <QuickAction href="/explore"                  icon={Eye}          label="Browse Explore"    sub="See what's happening"    />
            </div>
          </div>

          {/* Community Snapshot */}
          <div className="bg-black border-2 border-black">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="font-black text-base text-[#FFD400]">Community</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mt-0.5">Your reach &amp; connections</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: "Followers",      value: followerCount  ?? 0, icon: Users       },
                { label: "Exhibitions",    value: exhibitionCount ?? 0, icon: LayoutGrid  },
                { label: "Collaborations", value: 0,                    icon: Handshake   },
                { label: "Sales Made",     value: saleCount      ?? 0, icon: BarChart3   },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <div className="w-8 h-8 bg-[#FFD400] border border-[#FFD400] flex items-center justify-center mb-1">
                    <s.icon className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-2xl font-black text-white">{s.value}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <Link href="/dashboard/discover"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FFD400] border-2 border-[#FFD400] text-black font-black text-sm hover:bg-white transition-colors">
                Discover Artists <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
