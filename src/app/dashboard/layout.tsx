"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, Globe, Users,
  BarChart3, CalendarDays, LogOut, Palette,
  Menu, Bell, Search, Plus, X,
  ChevronRight, Handshake,
} from "lucide-react";

// ── Consolidated nav ──────────────────────────────────────────────
const NAV = [
  {
    section: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Studio",
    items: [
      { href: "/dashboard/artworks",    label: "Artworks",    icon: ImageIcon    },
      { href: "/dashboard/collections", label: "Collections", icon: ImageIcon    },
      { href: "/dashboard/portfolio",   label: "Portfolio",   icon: Globe        },
    ],
  },
  {
    section: "Scene",
    items: [
      { href: "/dashboard/exhibitions", label: "Exhibitions", icon: Globe        },
      { href: "/dashboard/pool",        label: "Collabs",     icon: Handshake    },
      { href: "/",                      label: "Explore",     icon: Users        },
    ],
  },
  {
    section: "Business",
    items: [
      { href: "/dashboard/sales",       label: "Sales",       icon: BarChart3    },
      { href: "/dashboard/clients",     label: "Clients",     icon: Users        },
      { href: "/dashboard/analytics",   label: "Analytics",   icon: BarChart3    },
    ],
  },
  {
    section: "Planner",
    items: [
      { href: "/dashboard/tasks",       label: "Tasks",       icon: CalendarDays },
      { href: "/dashboard/calendar",    label: "Calendar",    icon: CalendarDays },
    ],
  },
];

const ALL_NAV_ITEMS = NAV.flatMap(g => g.items);

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "New follower joined",       time: "2m ago", read: false, dot: "#4ECDC4" },
  { id: 2, text: "Your artwork was saved",     time: "1h ago", read: false, dot: "#FFD400" },
  { id: 3, text: "New collaboration request",  time: "3h ago", read: true,  dot: "#FF6B6B" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [profile, setProfile]             = useState<{ full_name?: string; role?: string; avatar_url?: string; username?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [bellOpen, setBellOpen]           = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name, role, avatar_url, username")
        .eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const searchResults = searchQuery.length > 0
    ? ALL_NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const unreadCount = notifications.filter(n => !n.read).length;

  const SidebarContent = () => (
    <aside style={{ display: "flex", flexDirection: "column", height: "100%", width: 220, flexShrink: 0, background: "#111110" }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 14px", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ width: 30, height: 30, background: "#FFD400", border: "2px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Palette size={14} color="#111110" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
          Artfolio<sup style={{ fontSize: 7, opacity: 0.4 }}>✦</sup>
        </span>
        <button onClick={() => setSidebarOpen(false)}
          style={{ marginLeft: "auto", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#555" }}
          className="lg:hidden">
          <X size={14} />
        </button>
      </div>

      {/* Profile card */}
      {profile && (
        <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid #1e1e1e", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #2a2a2a", flexShrink: 0 }} />
              : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFD400", border: "2px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", flexShrink: 0 }}>
                  {profile.full_name?.[0]?.toUpperCase() || "A"}
                </div>
            }
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile.full_name || "Artist"}
              </div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "capitalize", fontWeight: 600 }}>
                {profile.role || "artist"}
              </div>
            </div>
            <ChevronRight size={11} color="#333" />
          </div>
        </Link>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0", scrollbarWidth: "none" }}>

        {/* Dashboard item (no section label) */}
        {NAV[0].items.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: active ? "#FFD400" : "transparent", transition: "background 0.1s", cursor: "pointer", marginBottom: 4 }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <item.icon size={15} color={active ? "#111110" : "#666"} />
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#111110" : "#aaa" }}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Sectioned groups */}
        {NAV.slice(1).map(group => {
          const sectionActive = group.items.some(i => isActive(i.href));
          return (
            <div key={group.section} style={{ marginBottom: 2 }}>
              {/* Section label */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 5px" }}>
                <div style={{ width: 2, height: 12, background: sectionActive ? "#FFD400" : "#2a2a2a", flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: sectionActive ? "#FFD400" : "#3a3a3a", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  {group.section}
                </span>
              </div>
              {/* Items */}
              {group.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 18px", background: active ? "#1c1c1c" : "transparent", borderLeft: `2px solid ${active ? "#FFD400" : "transparent"}`, transition: "all 0.1s", cursor: "pointer" }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#161616"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                      <item.icon size={13} color={active ? "#FFD400" : "#555"} />
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#888" }}>{item.label}</span>
                      {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#FFD400", flexShrink: 0 }} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Add artwork + sign out */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #1e1e1e" }}>
        <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFD400", marginBottom: 4, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "3px 3px 0 #555")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
            <Plus size={14} color="#111110" strokeWidth={3} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>Add Artwork</span>
          </div>
        </Link>
        <button onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <LogOut size={13} color="#444" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        nav::-webkit-scrollbar { display: none; }
        .db-search-result:hover { background: #F5F0E8 !important; }
        .db-notif-item:hover { background: #FFFBEA !important; }
        @media (max-width: 1023px) { .desktop-sidebar { display: none !important; } }
        @media (min-width: 1024px) { .mobile-menu-btn { display: none !important; } }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#FFFBEA", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ height: "100vh", flexShrink: 0, borderRight: "2px solid #1e1e1e" }}>
          <SidebarContent />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: "relative", zIndex: 41, height: "100%", borderRight: "2px solid #1e1e1e" }}>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Top bar */}
          <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 54, borderBottom: "2px solid #111110", background: "#fff", position: "relative", gap: 12 }}>

            {/* Left: hamburger + breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}
                style={{ width: 34, height: 34, border: "2px solid #111110", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Menu size={15} />
              </button>
              {(() => {
                const active = ALL_NAV_ITEMS.find(i => isActive(i.href));
                const section = NAV.find(g => g.items.some(i => isActive(i.href)));
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {section?.section && (
                      <>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{section.section}</span>
                        <ChevronRight size={11} color="#d4cfc4" />
                      </>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{active?.label || "Dashboard"}</span>
                  </div>
                );
              })()}
            </div>

            {/* Right: search + bell + avatar + new */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setSearchOpen(p => !p)} style={{ width: 34, height: 34, border: "2px solid #111110", background: searchOpen ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                  {searchOpen ? <X size={14} /> : <Search size={14} />}
                </button>
                {searchOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 280, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 50, overflow: "hidden" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #E0D8CA", display: "flex", alignItems: "center", gap: 8 }}>
                      <Search size={13} color="#9B8F7A" />
                      <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search pages…"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", color: "#111110" }}
                        onKeyDown={e => {
                          if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                          if (e.key === "Enter" && searchResults.length > 0) { router.push(searchResults[0].href); setSearchOpen(false); setSearchQuery(""); }
                        }} />
                    </div>
                    {searchQuery.length > 0 ? (
                      searchResults.length === 0
                        ? <div style={{ padding: 16, textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>No pages found</div>
                        : searchResults.map(item => (
                          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                            <div className="db-search-result" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F5F0E8" }}>
                              <item.icon size={14} color="#9B8F7A" />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{item.label}</span>
                            </div>
                          </Link>
                        ))
                    ) : (
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Quick Nav</div>
                        {ALL_NAV_ITEMS.slice(0, 6).map(item => (
                          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => setSearchOpen(false)}>
                            <div className="db-search-result" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer" }}>
                              <item.icon size={13} color="#9B8F7A" />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#5C5346" }}>{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bell */}
              <div ref={bellRef} style={{ position: "relative" }}>
                <button onClick={() => setBellOpen(p => !p)} style={{ width: 34, height: 34, border: "2px solid #111110", background: bellOpen ? "#FFD400" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #111110", position: "relative" }}>
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#111110" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 50, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "2px solid #111110", background: "#F5F0E8" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>Notifications</span>
                      <button onClick={() => setNotifications(p => p.map(n => ({ ...n, read: true })))}
                        style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
                    </div>
                    {notifications.map((n, i) => (
                      <div key={n.id} className="db-notif-item"
                        onClick={() => setNotifications(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", borderBottom: i < notifications.length - 1 ? "1px solid #F5F0E8" : "none", background: n.read ? "#fff" : "#FFFBEA", cursor: "pointer" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? "#d4cfc4" : n.dot, flexShrink: 0, marginTop: 4, border: n.read ? "none" : "1.5px solid #111110" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: "#111110", lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 2 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              {profile && (
                <Link href="/dashboard/profile">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #111110", cursor: "pointer" }} />
                    : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110", cursor: "pointer" }}>
                        {profile.full_name?.[0]?.toUpperCase() || "A"}
                      </div>
                  }
                </Link>
              )}

              {/* New CTA */}
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }} className="hidden sm:block">
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "2px solid #111110", background: "#111110", color: "#FFD400", fontWeight: 800, fontSize: 12, cursor: "pointer", boxShadow: "2px 2px 0 #FFD400" }}>
                  <Plus size={13} strokeWidth={3} /> New
                </button>
              </Link>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px" }}>
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer style={{ flexShrink: 0, borderTop: "2px solid #111110", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Artfolio ✦</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#d4cfc4" }}>© 2026</span>
          </footer>
        </div>
      </div>
    </>
  );
}
