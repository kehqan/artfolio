"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Image, Users, DollarSign, BarChart3, Settings, LogOut, Menu, X, PlusCircle, Search, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Artworks", href: "/dashboard/artworks", icon: Image },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Sales", href: "/dashboard/sales", icon: DollarSign },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
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
      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <Link href="/" className="block">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Artfolio</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Art Inventory</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-[13.5px] rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-slate-900 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}>
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100 mt-auto">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-[13.5px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all w-full">
          <LogOut size={18} strokeWidth={1.5} /><span>Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-[200px] flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-100 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 z-50 flex items-center justify-between px-4">
        <Link href="/" className="font-bold text-slate-900">Artfolio</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500">{sidebarOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-[200px] bg-white border-r border-slate-100 z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Top Bar + Content */}
      <div className="flex-1 lg:ml-[200px] min-h-screen pt-14 lg:pt-0">
        {/* Top bar */}
        <header className="hidden lg:flex h-14 items-center justify-between px-8 bg-white border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search artworks, clients, sales..." className="pl-10 pr-4 py-2 w-[360px] bg-slate-50 border-none rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 transition-colors"><Bell size={18} strokeWidth={1.5} /></button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-600">JD</div>
              <span className="text-sm text-slate-700 font-medium">John Doe</span>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8 max-w-[1400px]">{children}</div>
      </div>
    </div>
  );
}
