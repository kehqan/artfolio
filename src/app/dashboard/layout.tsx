"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Image,
  PlusCircle,
  FolderOpen,
  Globe,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Artworks", href: "/dashboard/artworks", icon: Image },
  { label: "Add Artwork", href: "/dashboard/artworks/new", icon: PlusCircle },
  { label: "My Collections", href: "/dashboard/collections", icon: FolderOpen },
  { label: "My Portfolio", href: "/dashboard/portfolio", icon: Globe },
  { label: "Feed", href: "/dashboard/feed", icon: MessageSquare },
  { label: "Profile Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-canvas-950">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col fixed inset-y-0 left-0 bg-canvas-950 border-r border-canvas-800/40 z-40">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-canvas-800/40">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-accent-500 flex items-center justify-center">
              <span className="font-display text-canvas-950 text-base leading-none">
                A
              </span>
            </div>
            <span className="font-display text-lg text-canvas-50 group-hover:text-accent-400 transition-colors">
              Artfolio
            </span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-accent-500/10 text-accent-400 border-l-2 border-accent-500 -ml-px"
                    : "text-canvas-400 hover:text-canvas-200 hover:bg-canvas-900/40"
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="ml-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-canvas-800/40">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-canvas-500 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-canvas-950/95 backdrop-blur-xl border-b border-canvas-800/40 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent-500 flex items-center justify-center">
            <span className="font-display text-canvas-950 text-sm leading-none">
              A
            </span>
          </div>
          <span className="font-display text-base text-canvas-50">
            Artfolio
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-canvas-400 hover:text-canvas-200"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-canvas-950 border-r border-canvas-800/40 z-50 flex flex-col pt-14">
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-accent-500/10 text-accent-400 border-l-2 border-accent-500 -ml-px"
                        : "text-canvas-400 hover:text-canvas-200 hover:bg-canvas-900/40"
                    }`}
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-canvas-800/40">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-canvas-500 hover:text-red-400 transition-colors w-full"
              >
                <LogOut size={18} strokeWidth={1.5} />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
