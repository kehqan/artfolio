"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, FolderOpen, Globe, MessageSquare,
  Compass, LayoutGrid, BarChart3, Users, Settings, LogOut,
  Palette, Handshake, ShieldCheck, Menu, TrendingUp, ChevronRight,
  Bell, Search, Plus, X, User,
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
                                    { href: "/dashboard/pool",           label: "Discovery Pool", icon: Handshake       }] },
  { section: "BUSINESS",   items: [{ href: "/dashboard/sales",         label: "Sales",          icon: BarChart3       },
                                    { href: "/dashboard/clients",        label: "Clients",        icon: Users           },
                                    { href: "/dashboard/analytics",      label: "Analytics",      icon: TrendingUp      }] },
  { section: "ACCOUNT",    items: [{ href: "/dashboard/profile",       label: "Profile",        icon: User            },
                                    { href: "/dashboard/admin",          label: "Admin",          icon: ShieldCheck     }] },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "New follower: Aria Tehrani", time: "2m ago", read: false, dot: "#4ECDC4" },
  { id: 2, text: "Your artwork 'Untitled No.3' was saved to a wishlist", time: "1h ago", read: false, dot: "#FFD400" },
  { id: 3, text: "New collaboration request from Tehran Gallery", time: "3h ago", read: true, dot: "#FF6B6B" },
  { id: 4, text: "Exhibition application approved", time: "1d ago", read: true, dot: "#95E1D3" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const [profile, setProfile]         = useState<{ full_name?: string; role?: string; avatar_url?: string; username?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bellOpen, setBellOpen]       = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const searchRef  = useRef<HTMLInputElement>(null);
  const bellRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name, role, avatar_url, username").eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  // Close bell on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Search nav items
  const allNavItems = NAV.flatMap(g => g.items);
  const searchResults = searchQuery.length > 0
    ? allNavItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const Sidebar = () => (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      width: 220, flexShrink: 0, background: "#111110", overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "18px 16px 14px",
        borderBottom: "1px solid #2a2a2a",
      }}>
        <div style={{
          width: 30, height: 30, background: "#FFD400",
          border: "2px solid #333", borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Palette size={14} color="#111110" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>
          Artfolio<sup style={{ fontSize: 7, opacity: 0.4 }}>✦</sup>
        </span>
      </div>

      {/* User snippet */}
      {profile && (
        <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid #1e1e1e",
            cursor: "pointer",
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #333", flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFD400", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#111110", flexShrink: 0 }}>
                  {profile.full_name?.[0]?.toUpperCase() || "A"}
                </div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.full_name || "Artist"}</div>
              <div style={{ fontSize: 10, color: "#666", textTransform: "capitalize" }}>{profile.role || "artist"}</div>
            </div>
          </div>
        </Link>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px 10px" }}>
        {NAV.map((group) => (
          <div key={group.section} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.2px", color: "#444", textTransform: "uppercase", padding: "0 8px 4px" }}>
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 6,
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    color: active ? "#111110" : "#888",
                    background: active ? "#FFD400" : "transparent",
                    border: active ? "2px solid #111110" : "2px solid transparent",
                    boxShadow: active ? "2px 2px 0 #111110" : "none",
                    marginBottom: 1, cursor: "pointer",
                    transition: "background 0.1s, color 0.1s",
                  }}>
                    <item.icon size={13} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <ChevronRight size={11} strokeWidth={3} />}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e1e" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "8px 10px", borderRadius: 6,
            fontSize: 12, fontWeight: 600, color: "#f44", background: "none",
            border: "none", cursor: "pointer",
          }}
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        .db-nav-item:hover { background: #1e1e1e !important; color: #fff !important; }
        .db-notif-item:hover { background: #F5F0E8 !important; }
        .db-search-result:hover { background: #F5F0E8 !important; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#FFFBEA" }}>

        {/* Desktop sidebar */}
        <div style={{ display: "none" }} className="md-sidebar">
          <Sidebar />
        </div>
        <div className="desktop-sidebar" style={{ display: "flex", flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: "relative", zIndex: 10, display: "flex", height: "100%" }}>
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── TOP BAR ── */}
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", height: 58,
            background: "#fff",
            borderBottom: "2px solid #111110",
            position: "relative", zIndex: 20, flexShrink: 0,
          }}>
            {/* Left: mobile menu + page title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSidebarOpen(true)} style={{
                width: 34, height: 34, border: "2px solid #111110", borderRadius: 6,
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "2px 2px 0 #111110",
              }}>
                <Menu size={15} />
              </button>
              {/* Page title from pathname */}
              <span style={{ fontSize: 15, fontWeight: 900, color: "#111110", letterSpacing: "-0.2px" }}>
                {allNavItems.find(i => isActive(i.href))?.label || "Dashboard"}
              </span>
            </div>

            {/* Right: search + bell + avatar + CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              {/* ── SEARCH ── */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setSearchOpen(p => !p)}
                  style={{
                    width: 34, height: 34, border: "2px solid #111110", borderRadius: 6,
                    background: searchOpen ? "#FFD400" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "2px 2px 0 #111110",
                  }}
                >
                  {searchOpen ? <X size={14} /> : <Search size={14} />}
                </button>

                {searchOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 300, background: "#fff",
                    border: "2px solid #111110", borderRadius: 8,
                    boxShadow: "4px 4px 0 #111110", zIndex: 50,
                    overflow: "hidden",
                  }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #E0D8CA", display: "flex", alignItems: "center", gap: 8 }}>
                      <Search size={13} color="#9B8F7A" />
                      <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search pages, artworks…"
                        style={{
                          flex: 1, border: "none", outline: "none",
                          fontSize: 13, fontFamily: "inherit", background: "transparent",
                          color: "#111110",
                        }}
                        onKeyDown={e => {
                          if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                          if (e.key === "Enter" && searchResults.length > 0) {
                            router.push(searchResults[0].href);
                            setSearchOpen(false); setSearchQuery("");
                          }
                        }}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A" }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {searchQuery.length > 0 ? (
                      searchResults.length === 0 ? (
                        <div style={{ padding: "20px 16px", textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>
                          No pages found for &quot;{searchQuery}&quot;
                        </div>
                      ) : (
                        <div>
                          {searchResults.map(item => (
                            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                              <div className="db-search-result" style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 14px", cursor: "pointer",
                                borderBottom: "1px solid #F5F0E8",
                                transition: "background 0.1s",
                              }}>
                                <item.icon size={14} color="#9B8F7A" />
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{item.label}</span>
                                <ChevronRight size={12} color="#9B8F7A" style={{ marginLeft: "auto" }} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      )
                    ) : (
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Quick Navigation</div>
                        {allNavItems.slice(0, 5).map(item => (
                          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => { setSearchOpen(false); }}>
                            <div className="db-search-result" style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 4px", cursor: "pointer",
                              transition: "background 0.1s", borderRadius: 4,
                            }}>
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

              {/* ── BELL ── */}
              <div ref={bellRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setBellOpen(p => !p)}
                  style={{
                    width: 34, height: 34, border: "2px solid #111110", borderRadius: 6,
                    background: bellOpen ? "#FFD400" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "2px 2px 0 #111110",
                    position: "relative",
                  }}
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -6, right: -6,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#FFD400", border: "2px solid #111110",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 900, color: "#111110",
                    }}>{unreadCount}</span>
                  )}
                </button>

                {bellOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 320, background: "#fff",
                    border: "2px solid #111110", borderRadius: 8,
                    boxShadow: "4px 4px 0 #111110", zIndex: 50,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderBottom: "2px solid #111110",
                      background: "#F5F0E8",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>Notifications</span>
                      <button
                        onClick={() => setNotifications(p => p.map(n => ({ ...n, read: true })))}
                        style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Mark all read
                      </button>
                    </div>
                    {notifications.map((n, i) => (
                      <div
                        key={n.id}
                        className="db-notif-item"
                        onClick={() => setNotifications(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "12px 16px",
                          borderBottom: i < notifications.length - 1 ? "1px solid #F5F0E8" : "none",
                          background: n.read ? "#fff" : "#FFFBEA",
                          cursor: "pointer", transition: "background 0.1s",
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: n.read ? "#d4cfc4" : n.dot,
                          flexShrink: 0, marginTop: 4,
                          border: n.read ? "none" : "1.5px solid #111110",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: "#111110", lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 3 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div style={{ padding: "24px 16px", textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>No notifications</div>
                    )}
                  </div>
                )}
              </div>

              {/* Avatar */}
              {profile && (
                <Link href="/dashboard/profile">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #111110", cursor: "pointer" }} />
                    : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#111110", cursor: "pointer" }}>
                        {profile.full_name?.[0]?.toUpperCase() || "A"}
                      </div>
                  }
                </Link>
              )}

              {/* CTA */}
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", border: "2px solid #111110", borderRadius: 6,
                  background: "#111110", color: "#FFD400",
                  fontWeight: 800, fontSize: 12, cursor: "pointer",
                  boxShadow: "2px 2px 0 #FFD400",
                }}>
                  <Plus size={13} strokeWidth={3} /> New Artwork
                </button>
              </Link>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px" }}>
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer style={{
            flexShrink: 0, borderTop: "2px solid #111110",
            background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              <span>Artfolio</span>
              <Link href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
              <Link href="#" style={{ color: "inherit", textDecoration: "none" }}>Support</Link>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#d4cfc4" }}>© 2026</span>
          </footer>
        </div>
      </div>
    </>
  );
}
