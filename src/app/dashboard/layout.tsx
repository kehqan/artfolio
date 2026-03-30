"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, FolderOpen, Globe, MessageSquare,
  Compass, LayoutGrid, BarChart3, Users, Settings, LogOut,
  Palette, Handshake, ShieldCheck, Menu, TrendingUp, ChevronRight,
  Bell, Search, Plus,
} from "lucide-react";

const NAV = [
  { section: "OVERVIEW",   items: [{ href: "/dashboard",               label: "Dashboard",      icon: LayoutDashboard }] },
  { section: "INVENTORY",  items: [{ href: "/dashboard/artworks",      label: "Artworks",       icon: ImageIcon       },
                                    { href: "/dashboard/collections",    label: "Collections",    icon: FolderOpen      }] },
  { section: "PRESENCE",   items: [{ href: "/dashboard/portfolio",     label: "Portfolio",      icon: Globe           },
                                    { href: "/dashboard/exhibitions",    label: "Exhibitions",    icon: LayoutGrid      }] },
  { section: "COMMUNITY",  items: [{ href: "/dashboard/feed",          label: "Feed",           icon: MessageSquare   },
                                    { href: "/dashboard/discover",       label: "Discover",       icon: Compass         },
                                    { href: "/dashboard/collaborations", label: "Collaborations", icon: Handshake       },
                                    { href: "/explore",                  label: "Explore Art",    icon: Compass         },
                                    { href: "/dashboard/pool",           label: "Discovery Pool", icon: Handshake       }] },
  { section: "BUSINESS",   items: [{ href: "/dashboard/sales",         label: "Sales",          icon: BarChart3       },
                                    { href: "/dashboard/clients",        label: "Clients",        icon: Users           },
                                    { href: "/dashboard/analytics",      label: "Analytics",      icon: TrendingUp      }] },
  { section: "ACCOUNT",    items: [{ href: "/dashboard/profile",       label: "Settings",       icon: Settings        },
                                    { href: "/dashboard/admin",          label: "Admin",          icon: ShieldCheck     }] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
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
    <aside className="flex flex-col h-full w-60 shrink-0 bg-black overflow-hidden">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-[#FFD400] flex items-center justify-center shrink-0">
          <Palette className="w-4 h-4 text-black" />
        </div>
        <span className="font-black text-white text-lg tracking-tight">Artfolio</span>
        <div className="ml-auto w-5 h-5 bg-[#FFD400] flex items-center justify-center rounded-full shrink-0">
          <span className="text-[8px] font-black text-black">✦</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" style={{ scrollbarWidth: "none" }}>
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-2 mb-2 text-[9px] font-black tracking-[0.25em] text-white/25 uppercase">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all rounded-none ${
                      active
                        ? "bg-[#FFD400] text-black"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" strokeWidth={3} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile + logout */}
      <div className="border-t border-white/10 p-3">
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-8 h-8 object-cover border-2 border-white/20 shrink-0" />
              : <div className="w-8 h-8 bg-[#FFD400] flex items-center justify-center text-black font-black text-sm shrink-0">{profile.full_name?.[0] || "A"}</div>}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile.full_name || "Artist"}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider capitalize">{profile.role || "artist"}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all w-full">
          <LogOut className="w-4 h-4 shrink-0" />Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#FFFBEA]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex"><Sidebar /></div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex h-full"><Sidebar /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b-4 border-black shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-stone-100 rounded">
              <Menu className="w-5 h-5" />
            </button>
            {/* Page title injected via CSS trick — just show Artfolio on mobile */}
            <h2 className="font-black text-xl text-black tracking-tight hidden md:block">Dashboard</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#FFFBEA] border-2 border-black text-sm font-bold text-black/50 hover:text-black transition-colors w-48">
              <Search className="w-4 h-4 shrink-0" />
              <span>Search...</span>
            </button>
            {/* Notifications */}
            <button className="relative w-10 h-10 border-2 border-black bg-white flex items-center justify-center hover:bg-[#FFD400] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFD400] border-2 border-black flex items-center justify-center text-[8px] font-black text-black">3</span>
            </button>
            {/* New artwork CTA */}
            <Link href="/dashboard/artworks/new"
              className="flex items-center gap-2 px-4 py-2 bg-black text-[#FFD400] border-2 border-black font-black text-sm hover:bg-stone-900 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">New Artwork</span>
            </Link>
            {/* Avatar */}
            {profile && (
              <Link href="/dashboard/profile">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-10 h-10 object-cover border-2 border-black" />
                  : <div className="w-10 h-10 bg-[#FFD400] border-2 border-black flex items-center justify-center font-black text-black">{profile.full_name?.[0] || "A"}</div>}
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t-2 border-black bg-white flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4 text-[10px] font-bold text-black/40 uppercase tracking-wider">
            <span>Artfolio</span>
            <Link href="#" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-black transition-colors">Support</Link>
          </div>
          <span className="text-[10px] font-bold text-black/30">© 2026</span>
        </footer>
      </div>
    </div>
  );
}
