"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Image, FolderOpen, Globe, MessageSquare,
  Compass, LayoutGrid, BarChart3, Users, Settings, LogOut,
  ChevronRight, Palette, Handshake, ShieldCheck, Menu, X, TrendingUp,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/dashboard/artworks", label: "My Artworks", icon: Image },
      { href: "/dashboard/collections", label: "Collections", icon: FolderOpen },
    ],
  },
  {
    label: "Presence",
    items: [
      { href: "/dashboard/portfolio", label: "My Portfolio", icon: Globe },
      { href: "/dashboard/exhibitions", label: "Exhibitions", icon: LayoutGrid },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/dashboard/feed", label: "Feed", icon: MessageSquare },
      { href: "/dashboard/discover", label: "Discover", icon: Compass },
      { href: "/dashboard/collaborations", label: "Collaborations", icon: Handshake },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/dashboard/sales", label: "Sales Tracking", icon: BarChart3 },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
      { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/dashboard/explore", label: "Explore", icon: Compass },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/profile", label: "Profile Settings", icon: Settings },
      { href: "/dashboard/admin", label: "Admin Panel", icon: ShieldCheck },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name?: string; role?: string; avatar_url?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name, role, avatar_url").eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-stone-200 w-64 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-stone-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-stone-900 text-lg">Artfolio</span>
        </Link>
      </div>

      {/* Profile snippet */}
      {profile && (
        <div className="px-4 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-stone-200" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-sm">
                {profile.full_name?.[0] || "A"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{profile.full_name || "Artist"}</p>
              <p className="text-xs text-stone-500 capitalize">{profile.role || "artist"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest uppercase text-stone-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={active ? "nav-item-active" : "nav-item"}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-stone-100 pt-3">
        <button onClick={handleLogout} className="nav-item text-rose-500 hover:text-rose-700 hover:bg-rose-50 w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-stone-100">
            <Menu className="w-5 h-5 text-stone-600" />
          </button>
          <span className="font-display font-semibold text-stone-900">Artfolio</span>
          <div className="w-9" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
