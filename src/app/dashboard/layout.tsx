"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Image, PlusCircle, FolderOpen, Globe, MessageSquare, Settings, LogOut, Menu, X, Calendar, DollarSign, Users, Search, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navGroups = [
  { label: "Overview", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ]},
  { label: "Inventory", items: [
    { label: "Artworks", href: "/dashboard/artworks", icon: Image },
    { label: "Add Artwork", href: "/dashboard/artworks/new", icon: PlusCircle },
    { label: "Collections", href: "/dashboard/collections", icon: FolderOpen },
  ]},
  { label: "Business", items: [
    { label: "Exhibitions", href: "/dashboard/exhibitions", icon: Calendar },
    { label: "Sales", href: "/dashboard/sales", icon: DollarSign },
  ]},
  { label: "Community", items: [
    { label: "Feed", href: "/dashboard/feed", icon: MessageSquare },
    { label: "Discover", href: "/dashboard/discover", icon: Users },
  ]},
  { label: "Presence", items: [
    { label: "Portfolio", href: "/dashboard/portfolio", icon: Globe },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ]},
  { label: "Admin", items: [
    { label: "Admin Panel", href: "/dashboard/admin", icon: Settings },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-5 border-b border-slate-150">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="font-display text-white text-sm font-semibold leading-none">A</span>
          </div>
          <span className="font-display text-lg text-slate-900 font-medium">Artfolio</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-all ${
                      isActive ? "bg-slate-900 text-white font-medium shadow-sm" : "text-slate-600 hover:bg-slate-75 hover:text-slate-800"
                    }`}>
                    <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-150">
        <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all w-full">
          <LogOut size={16} strokeWidth={1.5} /><span>Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden lg:flex lg:w-[240px] flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-150 z-40">
        <SidebarContent />
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-150 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="font-display text-white text-xs font-semibold">A</span>
          </div>
          <span className="font-display text-base text-slate-900 font-medium">Artfolio</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-700">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-[240px] bg-white border-r border-slate-150 z-50 flex flex-col pt-14">
            <SidebarContent />
          </aside>
        </>
      )}
      <main className="flex-1 lg:ml-[240px] min-h-screen pt-14 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
