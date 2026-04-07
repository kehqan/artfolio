"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, Globe, Users, BarChart3,
  CalendarDays, LogOut, Bell, Search, Plus, X,
  ChevronDown, Handshake, TrendingUp, CheckSquare,
  MapPin, CalendarRange, Palette, Menu,
} from "lucide-react";

// ── Nav structure ──────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    key: "studio",
    label: "Studio",
    icon: Palette,
    items: [
      { href: "/dashboard/artworks",   label: "Artworks",  icon: ImageIcon,    desc: "Manage your artwork inventory" },
      { href: "/dashboard/portfolio",  label: "Portfolio", icon: Globe,        desc: "Your public portfolio page"    },
    ],
  },
  {
    key: "scene",
    label: "Scene",
    icon: CalendarRange,
    items: [
      { href: "/dashboard/exhibitions", label: "Events",  icon: CalendarRange, desc: "Shows & exhibitions"      },
      { href: "/dashboard/pool",        label: "Collabs", icon: Handshake,     desc: "Collaboration requests"   },
      { href: "/dashboard/map",         label: "Map",     icon: MapPin,        desc: "Prague art scene map"     },
    ],
  },
  {
    key: "business",
    label: "Business",
    icon: BarChart3,
    items: [
      { href: "/dashboard/sales",     label: "Sales",     icon: BarChart3,  desc: "Track your sales"         },
      { href: "/dashboard/clients",   label: "Clients",   icon: Users,      desc: "Collector relationships"  },
      { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp, desc: "Performance insights"     },
    ],
  },
  {
    key: "planner",
    label: "Planner",
    icon: CalendarDays,
    items: [
      { href: "/dashboard/tasks",    label: "Tasks",    icon: CheckSquare, desc: "To-do & task management"  },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, desc: "Schedule & deadlines"    },
    ],
  },
];

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ...NAV_SECTIONS.flatMap(s => s.items),
];

const MOCK_NOTIFS = [
  { id: 1, text: "New follower joined",       time: "2m ago", read: false, dot: "#4ECDC4" },
  { id: 2, text: "Your artwork was saved",    time: "1h ago", read: false, dot: "#FFD400" },
  { id: 3, text: "New collaboration request", time: "3h ago", read: true,  dot: "#FF6B6B" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [profile, setProfile]   = useState<{ full_name?: string; role?: string; avatar_url?: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs]     = useState(MOCK_NOTIFS);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navRef    = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name,role,avatar_url")
        .eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  // Sticky scroll detection
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setSearchOpen(false);
        setSearchQuery("");
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenMenu(null);
    setSearchOpen(false);
    setSearchQuery("");
    setMobileOpen(false);
  }, [pathname]);

  // Focus search on open
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href) && href !== "/";

  const isSectionActive = (section: typeof NAV_SECTIONS[0]) =>
    section.items.some(i => isActive(i.href));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const searchResults = searchQuery
    ? ALL_NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const unread = notifs.filter(n => !n.read).length;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : "A";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        /* ── Pill nav ── */
        .am-nav-pill {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 9999px;
          box-shadow: ${scrolled ? "4px 4px 0 #111110" : "4px 4px 0 #111110"};
          transition: box-shadow 0.2s, background 0.2s;
        }

        /* ── Dropdown panel ── */
        .am-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
          border: 2px solid #111110;
          border-radius: 16px;
          box-shadow: 6px 6px 0 #111110;
          min-width: 220px;
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.12s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }

        .am-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          cursor: pointer;
          transition: background 0.1s;
          text-decoration: none;
          border-bottom: 1px solid #F5F0E8;
        }
        .am-dropdown-item:last-child { border-bottom: none; }
        .am-dropdown-item:hover { background: #FFFBEA; }
        .am-dropdown-item.active { background: #FFD400; }

        /* ── Nav button ── */
        .am-nav-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 14px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          font-family: 'Darker Grotesque', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #111110;
          cursor: pointer;
          transition: background 0.12s;
          white-space: nowrap;
          position: relative;
        }
        .am-nav-btn:hover { background: #F5F0E8; }
        .am-nav-btn.active {
          background: #FFD400;
          box-shadow: 2px 2px 0 #111110;
        }
        .am-nav-btn.open { background: #F5F0E8; }

        /* Dashboard pill */
        .am-dashboard-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-family: 'Darker Grotesque', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.12s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .am-dashboard-btn.active {
          background: #FFD400;
          border: 2px solid #111110;
          color: #111110;
        }
        .am-dashboard-btn.inactive {
          background: transparent;
          border: 2px solid transparent;
          color: #111110;
        }
        .am-dashboard-btn.inactive:hover {
          background: #F5F0E8;
        }

        /* Icon buttons */
        .am-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          border: 2px solid #111110;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.1s, box-shadow 0.1s;
          flex-shrink: 0;
          position: relative;
        }
        .am-icon-btn:hover {
          background: #F5F0E8;
          box-shadow: 2px 2px 0 #111110;
        }
        .am-icon-btn.active {
          background: #FFD400;
          box-shadow: 2px 2px 0 #111110;
        }

        /* Avatar */
        .am-avatar {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          border: 2.5px solid #111110;
          background: #FFD400;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Darker Grotesque', sans-serif;
          font-size: 13px;
          font-weight: 900;
          color: #111110;
          cursor: pointer;
          flex-shrink: 0;
          text-decoration: none;
          transition: box-shadow 0.1s;
          overflow: hidden;
        }
        .am-avatar:hover { box-shadow: 2px 2px 0 #111110; }

        /* Divider in pill */
        .am-divider {
          width: 1px;
          height: 24px;
          background: #E0D8CA;
          flex-shrink: 0;
        }

        /* Search panel */
        .am-search-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 300px;
          background: #fff;
          border: 2px solid #111110;
          border-radius: 16px;
          box-shadow: 6px 6px 0 #111110;
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.12s ease;
        }

        /* Bell panel */
        .am-bell-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 300px;
          background: #fff;
          border: 2px solid #111110;
          border-radius: 16px;
          box-shadow: 6px 6px 0 #111110;
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.12s ease;
        }

        /* Mobile menu */
        .am-mobile-menu {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          flex-direction: column;
        }
        .am-mobile-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
        }
        .am-mobile-panel {
          position: relative;
          background: #fff;
          border: 2px solid #111110;
          border-radius: 0 0 20px 20px;
          padding: 12px 16px 20px;
          z-index: 1;
          max-height: 85vh;
          overflow-y: auto;
          border-top: none;
        }

        /* Content area */
        .am-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 28px 20px;
        }

        /* Hover row */
        .dbs-hover:hover { background: #F5F0E8 !important; }
        .dbn-hover:hover { background: #FFFBEA !important; }

        @media (max-width: 768px) {
          .am-nav-sections { display: none !important; }
          .am-mobile-toggle { display: flex !important; }
          .am-add-btn { display: none !important; }
        }
        @media (min-width: 769px) {
          .am-mobile-toggle { display: none !important; }
        }
      `}</style>

      {/* ── STICKY WRAPPER ── */}
      <div style={{ position: "sticky", top: 12, zIndex: 100, padding: "0 16px", pointerEvents: "none" }}>
        <div ref={navRef} style={{ pointerEvents: "auto", maxWidth: 1000, margin: "0 auto" }}>

          {/* ══ PILL NAV ══ */}
          <div className="am-nav-pill" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 6px 5px 8px", position: "relative" }}>

            {/* Dashboard button */}
            <Link href="/dashboard" className={`am-dashboard-btn ${isActive("/dashboard") ? "active" : "inactive"}`}>
              <LayoutDashboard size={15} />
              Dashboard
            </Link>

            <div className="am-divider" />

            {/* Section dropdowns — hidden on mobile */}
            <div className="am-nav-sections" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
              {NAV_SECTIONS.map(section => {
                const active = isSectionActive(section);
                const isOpen = openMenu === section.key;
                const SIcon  = section.icon;
                return (
                  <div key={section.key} style={{ position: "relative" }}>
                    <button
                      className={`am-nav-btn ${active ? "active" : ""} ${isOpen ? "open" : ""}`}
                      onClick={() => setOpenMenu(isOpen ? null : section.key)}
                    >
                      <SIcon size={14} />
                      {section.label}
                      <ChevronDown size={12} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                      <div className="am-dropdown">
                        {section.items.map(item => {
                          const itemActive = isActive(item.href);
                          const IIcon = item.icon;
                          return (
                            <Link key={item.href} href={item.href} className={`am-dropdown-item ${itemActive ? "active" : ""}`}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: itemActive ? "#111110" : "#F5F0E8", border: "1.5px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <IIcon size={14} color={itemActive ? "#FFD400" : "#5C5346"} />
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: itemActive ? "#111110" : "#111110" }}>{item.label}</div>
                                <div style={{ fontSize: 11, color: itemActive ? "#5C5346" : "#9B8F7A", fontWeight: 500 }}>{item.desc}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right side: search, bell, add, avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>

              {/* Mobile hamburger */}
              <button className="am-icon-btn am-mobile-toggle"
                style={{ display: "none" }}
                onClick={() => setMobileOpen(p => !p)}>
                <Menu size={15} />
              </button>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <button
                  className={`am-icon-btn ${searchOpen ? "active" : ""}`}
                  onClick={() => { setSearchOpen(p => !p); setBellOpen(false); }}>
                  {searchOpen ? <X size={14} /> : <Search size={14} />}
                </button>
                {searchOpen && (
                  <div className="am-search-panel">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #E0D8CA" }}>
                      <Search size={13} color="#9B8F7A" />
                      <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search pages…"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", color: "#111110" }}
                        onKeyDown={e => {
                          if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                          if (e.key === "Enter" && searchResults.length > 0) { router.push(searchResults[0].href); setSearchOpen(false); setSearchQuery(""); }
                        }}
                      />
                    </div>
                    {searchQuery ? (
                      searchResults.length === 0
                        ? <div style={{ padding: 16, textAlign: "center", color: "#9B8F7A", fontSize: 13 }}>No results</div>
                        : searchResults.map(item => (
                          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}
                            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                            <div className="dbs-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F5F0E8", cursor: "pointer" }}>
                              <item.icon size={14} color="#9B8F7A" />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{item.label}</span>
                            </div>
                          </Link>
                        ))
                    ) : (
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Quick nav</div>
                        {ALL_NAV_ITEMS.slice(0, 6).map(item => (
                          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => setSearchOpen(false)}>
                            <div className="dbs-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", cursor: "pointer", borderRadius: 6 }}>
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
                <button
                  className={`am-icon-btn ${bellOpen ? "active" : ""}`}
                  onClick={() => { setBellOpen(p => !p); setSearchOpen(false); }}>
                  <Bell size={14} />
                  {unread > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#FF6B6B", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#fff" }}>
                      {unread}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="am-bell-panel">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "2px solid #111110", background: "#F5F0E8" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>Notifications</span>
                      <button onClick={() => setNotifs(p => p.map(n => ({ ...n, read: true })))}
                        style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer" }}>
                        Mark all read
                      </button>
                    </div>
                    {notifs.map((n, i) => (
                      <div key={n.id} className="dbn-hover"
                        onClick={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", borderBottom: i < notifs.length - 1 ? "1px solid #F5F0E8" : "none", background: n.read ? "#fff" : "#FFFBEA", cursor: "pointer" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? "#d4cfc4" : n.dot, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: "#111110", lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 2 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: "8px 14px", borderTop: "1px solid #E0D8CA" }}>
                      <button onClick={handleLogout}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1.5px solid #E0D8CA", background: "#FAFAF8", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>
                        <LogOut size={13} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add artwork */}
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }} className="am-add-btn">
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#111110", color: "#FFD400", fontFamily: "'Darker Grotesque', sans-serif", fontSize: 13, fontWeight: 800, borderRadius: 9999, cursor: "pointer", whiteSpace: "nowrap", transition: "box-shadow 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 0 2px #FFD400")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <Plus size={13} strokeWidth={3} /> New
                </div>
              </Link>

              <div className="am-divider" />

              {/* Avatar */}
              <Link href="/dashboard/profile" className="am-avatar">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span>{initials}</span>
                }
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE FULL MENU ── */}
      {mobileOpen && (
        <div className="am-mobile-menu">
          <div className="am-mobile-overlay" onClick={() => setMobileOpen(false)} />
          <div className="am-mobile-panel" style={{ marginTop: 64 }}>
            {/* Dashboard */}
            <Link href="/dashboard" style={{ textDecoration: "none" }}
              onClick={() => setMobileOpen(false)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 10, background: isActive("/dashboard") ? "#FFD400" : "transparent", marginBottom: 4 }}>
                <LayoutDashboard size={16} />
                <span style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>Dashboard</span>
              </div>
            </Link>

            {NAV_SECTIONS.map(section => (
              <div key={section.key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", padding: "8px 12px 4px" }}>{section.label}</div>
                {section.items.map(item => {
                  const active = isActive(item.href);
                  const IIcon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}
                      onClick={() => setMobileOpen(false)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: active ? "#FFD400" : "transparent" }}>
                        <IIcon size={15} color={active ? "#111110" : "#5C5346"} />
                        <span style={{ fontSize: 14, fontWeight: active ? 800 : 600, color: "#111110" }}>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #E0D8CA" }}>
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#FFD400", borderRadius: 10, marginBottom: 8 }}>
                  <Plus size={15} strokeWidth={3} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>Add Artwork</span>
                </div>
              </Link>
              <button onClick={handleLogout}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", borderRadius: 10 }}>
                <LogOut size={15} color="#9B8F7A" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A", fontFamily: "inherit" }}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main style={{ minHeight: "100vh", background: "#FFFBEA" }}>
        <div className="am-content">
          {children}
        </div>
      </main>
    </>
  );
}
