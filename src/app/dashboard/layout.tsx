// src/app/dashboard/layout.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, Users, BarChart3,
  CalendarDays, LogOut, Bell, Search, X,
  ChevronDown, Handshake, TrendingUp, CheckSquare,
  MapPin, CalendarRange, Menu, Globe, ShoppingBag,
  BellOff, MessageSquare, Plus, Layers, FileText,
} from "lucide-react";

// ── Nav structure ──────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    key: "studio",
    label: "My Work",
    icon: ImageIcon,
    items: [
      { href: "/dashboard/artworks",   label: "My Works",      icon: ImageIcon,    desc: "All your works in one place"    },
      { href: "/dashboard/mystore",    label: "My Shop",       icon: ShoppingBag,  desc: "Where people buy your art"      },
      { href: "/dashboard/portfolio",  label: "My Front Door", icon: Globe,        desc: "How the world sees you"         },
    ],
  },
  {
    key: "scene",
    label: "The Scene",
    icon: CalendarRange,
    items: [
      { href: "/dashboard/exhibitions", label: "Shows & Events", icon: CalendarRange, desc: "Events, workshops & resources"   },
      { href: "/dashboard/pool",        label: "Find Collabs",   icon: Handshake,     desc: "Collaboration requests"         },
      { href: "/dashboard/map",         label: "Art Scene Map",  icon: MapPin,        desc: "What's happening around you"   },
    ],
  },
  {
    key: "business",
    label: "Money & Sales",
    icon: BarChart3,
    items: [
      { href: "/dashboard/sales",     label: "My Sales",        icon: BarChart3,  desc: "Money you've made"              },
      { href: "/dashboard/clients",   label: "My Collectors",   icon: Users,      desc: "People who love your work"      },
      { href: "/dashboard/analytics", label: "My Reach",        icon: TrendingUp, desc: "See how you're doing"           },
    ],
  },
  {
    key: "planner",
    label: "Planning",
    icon: CalendarDays,
    items: [
      { href: "/dashboard/tasks",    label: "My To-Dos",    icon: CheckSquare,  desc: "Tasks & to-do list"             },
      { href: "/dashboard/calendar", label: "My Schedule",  icon: CalendarDays, desc: "Schedule & deadlines"           },
    ],
  },
];

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "The Atelier", icon: LayoutDashboard },
  { href: "/dashboard/messages", label: "Messages",  icon: MessageSquare   },
  { href: "/dashboard/moodboard",label: "Moodboard", icon: Layers          },
  { href: "/dashboard/contracts",label: "Contracts", icon: FileText         },
  ...NAV_SECTIONS.flatMap(s => s.items),
];

type Notification = {
  id: string; type: string; title: string; body?: string;
  read: boolean; data?: any; created_at: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [profile, setProfile]   = useState<{ full_name?: string; role?: string; avatar_url?: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [bellOpen, setBellOpen]           = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [userId, setUserId]               = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const navRef    = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from("profiles").select("full_name,role,avatar_url")
        .eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
      loadNotifications(user.id);
      loadUnreadMessages();
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(loadUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications(uid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications").select("*")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(15);
    setNotifications(data || []);
  }

  async function loadUnreadMessages() {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      const total = (data.conversations || []).reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
      setUnreadMessages(total);
    } catch {}
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null); setSearchOpen(false); setSearchQuery("");
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setOpenMenu(null); setSearchOpen(false); setSearchQuery(""); setMobileOpen(false);
  }, [pathname]);

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

  async function markNotifRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllNotifRead() {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications(p => p.map(n => ({ ...n, read: true })));
  }

  const searchResults = searchQuery
    ? ALL_NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        /* ── Pill nav ── */
        .am-nav-pill {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 2.5px solid #111110;
          border-radius: 9999px;
          box-shadow: 4px 4px 0 #111110;
          transition: box-shadow 0.2s, background 0.2s;
        }

        /* ── Dropdown panel ── */
        .am-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          background: #FFFBEA;
          border: 2.5px solid #111110;
          border-radius: 20px;
          box-shadow: 6px 6px 0 #111110;
          min-width: 260px;
          overflow: hidden;
          z-index: 200;
          animation: dropIn 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);   }
        }

        /* Dropdown header */
        .am-dropdown-header {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px 9px;
          border-bottom: 2px solid #E8E0D0;
          background: #fff;
        }
        .am-dropdown-header-emoji { font-size: 16px; line-height: 1; }
        .am-dropdown-header-label {
          font-size: 10px; font-weight: 900; color: #9B8F7A;
          text-transform: uppercase; letter-spacing: 0.14em;
          font-family: 'Darker Grotesque', sans-serif;
        }

        /* Dropdown items */
        .am-dropdown-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; cursor: pointer;
          transition: background 0.12s; text-decoration: none;
          border-bottom: 1px solid #E8E0D0; color: inherit;
        }
        .am-dropdown-item:last-child { border-bottom: none; }
        .am-dropdown-item:hover { background: #fff; }
        .am-dropdown-item.active { background: #FFD400; border-bottom-color: #D4C9A8; }
        .am-dropdown-item.active:hover { background: #FFD400; }

        /* Emoji tile */
        .am-dropdown-tile {
          width: 40px; height: 40px; border-radius: 12px;
          border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
          transition: transform 0.15s;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.08);
        }
        .am-dropdown-item:hover .am-dropdown-tile { transform: scale(1.08) rotate(-3deg); }
        .am-dropdown-item.active .am-dropdown-tile {
          background: #111110 !important;
          filter: grayscale(1) brightness(0) invert(1);
        }

        /* ── Nav button ── */
        .am-nav-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 13px; border-radius: 9999px; border: none;
          background: transparent; font-family: 'Darker Grotesque', sans-serif;
          font-size: 14px; font-weight: 700; color: #111110;
          cursor: pointer; transition: all 0.15s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap; position: relative;
        }
        .am-nav-btn:hover { background: rgba(0,0,0,0.05); }
        .am-nav-btn.active { background: #FFD400; font-weight: 800; box-shadow: 2px 2px 0 #111110; }
        .am-nav-btn.open { background: #111110; color: #FFD400; }

        /* The Atelier btn */
        .am-dashboard-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9999px;
          font-family: 'Darker Grotesque', sans-serif; font-size: 14px;
          font-weight: 700; text-decoration: none; color: #111110;
          transition: background 0.15s; white-space: nowrap;
        }
        .am-dashboard-btn:hover { background: rgba(0,0,0,0.05); }
        .am-dashboard-btn.active { background: #FFD400; font-weight: 800; box-shadow: 2px 2px 0 #111110; }

        /* Divider */
        .am-divider { width: 1px; height: 20px; background: #E0D8CA; margin: 0 2px; flex-shrink: 0; }

        /* Icon buttons */
        .am-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9999px; border: none;
          background: transparent; cursor: pointer; color: #111110;
          transition: background 0.15s; position: relative; font-family: inherit;
        }
        .am-icon-btn:hover { background: rgba(0,0,0,0.07); }
        .am-icon-btn.active { background: #111110; color: #FFD400; }

        /* Messages badge */
        .am-msg-badge {
          position: absolute; top: 1px; right: 1px;
          background: #FFD400; color: #111110;
          font-size: 9px; font-weight: 900;
          min-width: 16px; height: 16px; border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #111110; padding: 0 3px;
          font-family: 'Darker Grotesque', sans-serif;
        }

        /* Avatar */
        .am-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #FFD400; border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 900; color: #111110;
          cursor: pointer; overflow: hidden; flex-shrink: 0;
          transition: box-shadow .15s;
        }
        .am-avatar:hover { box-shadow: 2px 2px 0 #111110; }

        /* Bell panel */
        .am-bell-panel {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 2px solid #111110; border-radius: 16px;
          box-shadow: 6px 6px 0 #111110; width: 320px;
          overflow: hidden; z-index: 200;
          animation: dropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        .am-bell-hdr { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #F5F0E8; }
        .am-bell-title { font-size: 14px; font-weight: 900; color: #111110; }
        .am-bell-mark { font-size: 11px; font-weight: 700; color: #9B8F7A; cursor: pointer; background: none; border: none; font-family: inherit; }
        .am-bell-mark:hover { color: #111110; }
        .am-bell-list { max-height: 340px; overflow-y: auto; }
        .am-bell-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #F5F0E8; cursor: pointer; transition: background .1s; }
        .am-bell-item:last-child { border-bottom: none; }
        .am-bell-item:hover { background: #FFFBEA; }
        .am-bell-item.unread { background: #FFFBEA; }
        .am-bell-dot { width: 7px; height: 7px; border-radius: 50%; background: #FFD400; border: 1.5px solid #111110; flex-shrink: 0; margin-top: 5px; }
        .am-bell-dot.read { background: #E8E0D0; border-color: #C0B8A8; }
        .am-bell-body { flex: 1; min-width: 0; }
        .am-bell-t { font-size: 13px; font-weight: 800; color: #111110; margin-bottom: 1px; }
        .am-bell-b { font-size: 12px; font-weight: 600; color: #9B8F7A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .am-bell-time { font-size: 10px; font-weight: 700; color: #C0B8A8; flex-shrink: 0; }
        .am-bell-empty { padding: 32px 16px; text-align: center; }

        /* Search */
        .am-search-box {
          position: absolute; top: calc(100% + 10px); left: 50%;
          transform: translateX(-50%); background: #fff;
          border: 2px solid #111110; border-radius: 14px;
          box-shadow: 6px 6px 0 #111110; width: 320px; overflow: hidden;
          z-index: 200; animation: dropIn .15s cubic-bezier(.16,1,.3,1);
        }
        .am-search-input-wrap { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #F5F0E8; }
        .am-search-field { flex: 1; border: none; outline: none; font-family: inherit; font-size: 14px; font-weight: 600; color: #111110; background: transparent; }

        /* Mobile */
        .am-mobile-menu { position: fixed; inset: 0; z-index: 300; display: flex; flex-direction: column; }
        .am-mobile-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
        .am-mobile-panel {
          position: relative; background: #fff;
          border: 2px solid #111110; border-radius: 0 0 20px 20px;
          padding: 12px 16px 20px; z-index: 1;
          max-height: 85vh; overflow-y: auto; border-top: none;
        }
        .am-content { max-width: 1280px; margin: 0 auto; padding: 28px 20px; }
        .dbs-hover:hover { background: #F5F0E8 !important; }
        .dbn-hover:hover { background: #FFFBEA !important; }

        @media (max-width: 768px) {
          .am-nav-sections { display: none !important; }
          .am-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .am-mobile-toggle { display: none !important; }
        }
      `}</style>

      {/* ── STICKY NAV ── */}
      <div style={{ position: "sticky", top: 12, zIndex: 100, padding: "0 16px", pointerEvents: "none" }}>
        <div ref={navRef} style={{ pointerEvents: "auto", maxWidth: 1000, margin: "0 auto" }}>
          <div className="am-nav-pill" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 6px 5px 10px", position: "relative" }}>

            {/* Logo */}
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0, fontSize: 24, lineHeight: 1, padding: "2px 2px" }}>
              🥭
            </Link>
            <div className="am-divider" />

            {/* Dashboard */}
            <Link href="/dashboard" className={`am-dashboard-btn ${isActive("/dashboard") ? "active" : "inactive"}`}>
              <LayoutDashboard size={15} /> Dashboard
            </Link>
            <div className="am-divider" />

            {/* Section dropdowns */}
            <div className="am-nav-sections" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
              {NAV_SECTIONS.map(section => {
                const active = isSectionActive(section);
                const isOpen = openMenu === section.key;
                return (
                  <div key={section.key} style={{ position: "relative" }}>
                    <button
                      className={`am-nav-btn ${active ? "active" : ""} ${isOpen ? "open" : ""}`}
                      onClick={() => setOpenMenu(isOpen ? null : section.key)}
                    >
                      <span style={{ fontSize: 15, lineHeight: 1 }}>{section.emoji}</span>
                      {section.label}
                      <ChevronDown size={12} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)" }} />
                    </button>

                    {isOpen && (
                      <div className="am-dropdown">
                        {/* Header */}
                        <div className="am-dropdown-header">
                          <span className="am-dropdown-header-emoji">{section.emoji}</span>
                          <span className="am-dropdown-header-label">{section.label}</span>
                        </div>

                        {/* Items */}
                        {section.items.map(item => {
                          const itemActive = isActive(item.href);
                          const it = item as any;
                          return (
                            <Link key={item.href} href={item.href} className={`am-dropdown-item ${itemActive ? "active" : ""}`}>
                              {/* Colored emoji tile */}
                              <div className="am-dropdown-tile" style={{ background: itemActive ? "#111110" : it.bg }}>
                                <span style={{ fontSize: 20, lineHeight: 1 }}>{it.emoji}</span>
                              </div>
                              {/* Label + desc */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", marginBottom: 1 }}>{item.label}</div>
                                <div style={{ fontSize: 11, color: itemActive ? "#5C5346" : "#9B8F7A", fontWeight: 600, lineHeight: 1.3 }}>{item.desc}</div>
                              </div>
                              {/* Active dot */}
                              {itemActive && (
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#111110", flexShrink: 0 }} />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Right side ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>

              {/* Mobile hamburger */}
              <button className="am-icon-btn am-mobile-toggle" style={{ display: "none" }} onClick={() => setMobileOpen(p => !p)}>
                <Menu size={15} />
              </button>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <button className={`am-icon-btn ${searchOpen ? "active" : ""}`} onClick={() => { setSearchOpen(p => !p); setBellOpen(false); }}>
                  {searchOpen ? <X size={15} /> : <Search size={15} />}
                </button>
                {searchOpen && (
                  <div className="am-search-box">
                    <div className="am-search-input-wrap">
                      <Search size={14} color="#9B8F7A" />
                      <input
                        ref={searchRef}
                        className="am-search-field"
                        placeholder="Search…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {searchResults.map(item => {
                      const IIcon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} className="am-dropdown-item" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                          <IIcon size={14} color="#9B8F7A" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{ position: "relative" }}>
                <Link href="/dashboard/messages" style={{ textDecoration: "none" }}>
                  <button className={`am-icon-btn ${pathname.startsWith("/dashboard/messages") ? "active" : ""}`} title="Messages">
                    <MessageSquare size={15} />
                    {unreadMessages > 0 && (
                      <span className="am-msg-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                    )}
                  </button>
                </Link>
              </div>

              {/* Bell */}
              <div style={{ position: "relative" }} ref={bellRef}>
                <button
                  className={`am-icon-btn ${bellOpen ? "active" : ""}`}
                  onClick={() => { setBellOpen(p => !p); setSearchOpen(false); }}
                >
                  {unreadNotifs > 0
                    ? <Bell size={15} style={{ color: bellOpen ? "#FFD400" : "#111110" }} />
                    : <BellOff size={15} style={{ opacity: 0.4 }} />
                  }
                  {unreadNotifs > 0 && !bellOpen && (
                    <span style={{ position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: "50%", background: "#FFD400", border: "1.5px solid #111110" }} />
                  )}
                </button>
                {bellOpen && (
                  <div className="am-bell-panel">
                    <div className="am-bell-hdr">
                      <span className="am-bell-title">Notifications {unreadNotifs > 0 && `(${unreadNotifs})`}</span>
                      {unreadNotifs > 0 && <button className="am-bell-mark" onClick={markAllNotifRead}>Mark all read</button>}
                    </div>
                    <div className="am-bell-list">
                      {notifications.length === 0 ? (
                        <div className="am-bell-empty">
                          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>No notifications</div>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`am-bell-item ${!n.read ? "unread" : ""}`} onClick={() => {
                          markNotifRead(n.id);
                          if (n.type === "message" && n.data?.conversation_id) {
                            router.push("/dashboard/messages");
                            setBellOpen(false);
                          }
                        }}>
                          <div className={`am-bell-dot ${n.read ? "read" : ""}`} />
                          <div className="am-bell-body">
                            <div className="am-bell-t">{n.title}</div>
                            {n.body && <div className="am-bell-b">{n.body}</div>}
                          </div>
                          <span className="am-bell-time">
                            {new Date(n.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar → profile */}
              <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
                <div className="am-avatar">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials
                  }
                </div>
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="am-mobile-menu">
          <div className="am-mobile-overlay" onClick={() => setMobileOpen(false)} />
          <div className="am-mobile-panel">
            <Link href="/dashboard" style={{ textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: isActive("/dashboard") ? "#FFD400" : "transparent", marginBottom: 4 }}>
                <LayoutDashboard size={16} />
                <span style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>The Atelier</span>
              </div>
            </Link>
            <Link href="/dashboard/messages" style={{ textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: isActive("/dashboard/messages") ? "#FFD400" : "transparent", marginBottom: 4 }}>
                <MessageSquare size={16} />
                <span style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>Messages</span>
                {unreadMessages > 0 && (
                  <span style={{ background: "#FFD400", border: "2px solid #111110", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "0 6px", marginLeft: "auto" }}>
                    {unreadMessages}
                  </span>
                )}
              </div>
            </Link>

            {NAV_SECTIONS.map(section => (
              <div key={section.key} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", padding: "8px 12px 4px" }}>
                  <span>{section.emoji}</span>
                  {section.label}
                </div>
                {section.items.map(item => {
                  const active = isActive(item.href);
                  const it = item as any;
                  return (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: active ? "#FFD400" : "transparent" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? "#111110" : it.bg, border: "1.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                          {it.emoji}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: active ? 800 : 600, color: "#111110" }}>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #E0D8CA" }}>
              <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, fontFamily: "inherit" }}>
                <LogOut size={15} color="#9B8F7A" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A" }}>Log out</span>
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
