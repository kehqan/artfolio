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
  BellOff, MessageSquare, Plus, Layers, FileText, BookOpen,
} from "lucide-react";
import { cn, Eyebrow } from "@/components/ui";

// Icon tile colors for nav items: a category tint on a soft well
const TONE = {
  violet: "bg-tag-violet-well text-tag-violet",
  sky: "bg-tag-sky-well text-tag-sky",
  pink: "bg-tag-pink-well text-tag-pink",
  mango: "bg-mango-soft text-warn",
  teal: "bg-tag-teal-well text-tag-teal",
  coral: "bg-tag-coral-well text-tag-coral",
} as const;
type Tone = keyof typeof TONE;

// ── Nav structure ──────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    key: "studio",
    label: "My Studio",
   
    icon: ImageIcon,
    items: [
      { href: "/dashboard/artworks", label: "My Works",  icon: ImageIcon,   desc: "All your works in one place", tone: "violet" },
      { href: "/dashboard/mystore",  label: "My Front Door",   icon: ShoppingBag, desc: "Your public storefront",        tone: "sky" },
      { href: "/dashboard/moodboard",label: "Moodboard", icon: Layers,      desc: "Visual boards & references",   tone: "pink" },
    ],
  },
  {
    key: "scene",
    label: "The Scene",
   
    icon: CalendarRange,
    items: [
      { href: "/dashboard/scene",     label: "Collabs & Events", icon: Handshake,     desc: "Community feed of events & collabs", tone: "mango" },
      { href: "/dashboard/exhibitions", label: "Exhibitions",    icon: CalendarRange, desc: "Plan and publish your shows",        tone: "violet" },
      { href: "/dashboard/pool",      label: "The Pool",         icon: Globe,         desc: "Open calls from artists & venues",   tone: "teal" },
      { href: "/dashboard/education", label: "Education Hub",    icon: BookOpen,      desc: "Resources, videos & guides",         tone: "sky" },
      { href: "/dashboard/map",       label: "Art Scene Map",    icon: MapPin,        desc: "Prague art scene map",               tone: "coral" },
    ],
  },
  {
    key: "business",
    label: "Deals & Money",
   
    icon: BarChart3,
    items: [
      { href: "/dashboard/sales",     label: "My Sales",     icon: BarChart3,  desc: "Money you've made",  tone: "teal" },
      { href: "/dashboard/clients",   label: "My Collectors",   icon: Users,      desc: "People who love your work",   tone: "violet" },
      { href: "/dashboard/contracts", label: "My Papers", icon: FileText,   desc: "Agreements & Deals",     tone: "mango" },
      { href: "/dashboard/analytics", label: "My Reach", icon: TrendingUp, desc: "See how you're doing",      tone: "sky" },
    ],
  },
  {
    key: "planner",
    label: "Planning",
   
    icon: CalendarDays,
    items: [
      { href: "/dashboard/tasks",    label: "My To-Dos",    icon: CheckSquare,  desc: "Tasks & to-do list", tone: "teal" },
      { href: "/dashboard/calendar", label: "My Schedule", icon: CalendarDays, desc: "Schedule & deadlines",    tone: "violet" },
    ],
  },
];

const ALL_NAV_ITEMS = [
  { href: "/dashboard",          label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/messages", label: "Messages",  icon: MessageSquare   },
  { href: "/dashboard/moodboard",label: "Moodboard", icon: Layers          },
  { href: "/dashboard/contracts",label: "Contracts", icon: FileText         },
  { href: "/dashboard/education",  label: "Education Hub", icon: BookOpen        },
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

  // Shared class recipes for the nav (all values come from design tokens)
  const pillBtn = (on: boolean, open = false) =>
    cn(
      "relative flex h-9 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 font-ui text-label font-semibold",
      "transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      open ? "bg-inverse text-on-inverse" : on ? "bg-mango text-on-mango" : "text-fg-2 hover:bg-sunken hover:text-fg",
    );
  const iconBtn = (on: boolean) =>
    cn(
      "relative grid h-9 w-9 place-items-center rounded-pill transition-colors duration-fast ease-out",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      on ? "bg-inverse text-on-inverse" : "text-fg-2 hover:bg-sunken hover:text-fg",
    );
  const floating = "rounded-card border-outline border-ink bg-surface shadow-hard-3 overflow-hidden animate-drop-in";
  const divider = <div aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />;

  return (
    <>
      {/* ── STICKY NAV ── */}
      <div className="pointer-events-none sticky top-3 z-nav px-4">
        <div ref={navRef} className="pointer-events-auto mx-auto max-w-[1000px]">
          <nav
            aria-label="Main"
            className="relative flex items-center gap-1 rounded-pill border-outline border-ink bg-surface py-1 pl-2.5 pr-1.5 shadow-hard-1"
          >
            {/* Logo */}
            <Link href="/dashboard" aria-label="Artomango home" className="flex shrink-0 items-center px-0.5 text-h2 leading-none">
              🥭
            </Link>
            {divider}

            {/* The Atelier */}
            <Link href="/dashboard" aria-label="The Atelier" className={pillBtn(isActive("/dashboard"))} aria-current={isActive("/dashboard") ? "page" : undefined}>
              <LayoutDashboard size={16} aria-hidden /> <span className="hidden min-[420px]:inline">The Atelier</span>
            </Link>
            {divider}

            {/* Section dropdowns */}
            <div className="hidden flex-1 items-center gap-0.5 lg:flex">
              {NAV_SECTIONS.map(section => {
                const active = isSectionActive(section);
                const isOpen = openMenu === section.key;
                const SIcon = section.icon;
                return (
                  <div key={section.key} className="relative">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className={pillBtn(active, isOpen)}
                      onClick={() => setOpenMenu(isOpen ? null : section.key)}
                    >
                      <SIcon size={16} aria-hidden />
                      {section.label}
                      <ChevronDown size={14} aria-hidden className={cn("transition-transform duration-base ease-out", isOpen && "rotate-180")} />
                    </button>

                    {isOpen && (
                      <div className="absolute left-1/2 top-[calc(100%+12px)] z-dropdown -translate-x-1/2">
                        <div className={cn(floating, "min-w-[280px] p-1.5")}>
                          <div className="px-3 pb-1.5 pt-2">
                            <Eyebrow>{section.label}</Eyebrow>
                          </div>
                          {section.items.map(item => {
                            const itemActive = isActive(item.href);
                            const IIcon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                aria-current={itemActive ? "page" : undefined}
                                className={cn(
                                  "group flex items-center gap-3 rounded-control px-2.5 py-2 transition-colors duration-fast",
                                  itemActive ? "bg-mango-soft" : "hover:bg-sunken",
                                )}
                              >
                                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-control", itemActive ? "bg-ink text-mango" : TONE[item.tone as Tone])}>
                                  <IIcon size={17} aria-hidden />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                  <span className="font-ui text-label font-semibold text-fg">{item.label}</span>
                                  <span className="font-ui text-caption text-fg-3">{item.desc}</span>
                                </span>
                                {itemActive && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Right side ── */}
            <div className="ml-auto flex items-center gap-0.5">

              {/* Mobile menu */}
              <button type="button" aria-label="Open menu" className={cn(iconBtn(mobileOpen), "lg:hidden")} onClick={() => setMobileOpen(p => !p)}>
                <Menu size={17} aria-hidden />
              </button>

              {/* Search */}
              <div className="relative">
                <button
                  type="button"
                  aria-label={searchOpen ? "Close search" : "Search"}
                  className={iconBtn(searchOpen)}
                  onClick={() => { setSearchOpen(p => !p); setBellOpen(false); setOpenMenu(null); }}
                >
                  {searchOpen ? <X size={17} aria-hidden /> : <Search size={17} aria-hidden />}
                </button>
                {searchOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-dropdown sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
                    <div className={cn(floating, "w-[min(320px,calc(100vw-32px))]")}>
                      <div className="flex items-center gap-2 border-b-hair border-line px-3.5 py-2.5">
                        <Search size={16} aria-hidden className="text-fg-3" />
                        <input
                          ref={searchRef}
                          aria-label="Search pages"
                          className="flex-1 bg-transparent font-ui text-control text-fg outline-none placeholder:text-fg-3"
                          placeholder="Search pages…"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      {searchResults.length > 0 && (
                        <div className="p-1.5">
                          {searchResults.map(item => {
                            const IIcon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-2.5 rounded-control px-2.5 py-2 font-ui text-label font-semibold text-fg hover:bg-sunken"
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                              >
                                <IIcon size={16} aria-hidden className="text-fg-3" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <Link
                href="/dashboard/messages"
                title="Messages"
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                className={iconBtn(pathname.startsWith("/dashboard/messages"))}
              >
                <MessageSquare size={17} aria-hidden />
                {unreadMessages > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-pill border-outline border-ink bg-mango px-1 font-ui text-caption font-bold leading-none text-on-mango">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Bell */}
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : "Notifications"}
                  aria-expanded={bellOpen}
                  className={iconBtn(bellOpen)}
                  onClick={() => { setBellOpen(p => !p); setSearchOpen(false); setOpenMenu(null); }}
                >
                  {unreadNotifs > 0 ? <Bell size={17} aria-hidden /> : <BellOff size={17} aria-hidden className="opacity-50" />}
                  {unreadNotifs > 0 && !bellOpen && (
                    <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-outline border-ink bg-mango" />
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-dropdown">
                    <div className={cn(floating, "w-[min(340px,calc(100vw-32px))]")}>
                      <div className="flex items-center justify-between border-b-hair border-line px-4 py-3">
                        <span className="font-display text-h3">
                          Notifications{unreadNotifs > 0 && <span className="ml-1.5 font-ui text-label font-semibold text-fg-3">{unreadNotifs} new</span>}
                        </span>
                        {unreadNotifs > 0 && (
                          <button type="button" className="font-ui text-caption font-semibold text-fg-3 hover:text-fg" onClick={markAllNotifRead}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[340px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                            <BellOff size={22} aria-hidden className="text-fg-3" />
                            <span className="font-ui text-label font-semibold text-fg-2">You're all caught up</span>
                            <span className="font-ui text-caption text-fg-3">New messages, sales and invites show up here.</span>
                          </div>
                        ) : notifications.map(n => (
                          <button
                            type="button"
                            key={n.id}
                            className={cn(
                              "flex w-full items-start gap-2.5 border-b-hair border-line px-4 py-2.5 text-left transition-colors duration-fast last:border-b-0 hover:bg-sunken",
                              !n.read && "bg-mango-soft",
                            )}
                            onClick={() => {
                              markNotifRead(n.id);
                              if (n.type === "message" && n.data?.conversation_id) {
                                router.push("/dashboard/messages");
                                setBellOpen(false);
                              }
                            }}
                          >
                            <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-n-300" : "border-outline border-ink bg-mango")} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="font-ui text-label font-semibold text-fg">{n.title}</span>
                              {n.body && <span className="truncate font-ui text-caption text-fg-3">{n.body}</span>}
                            </span>
                            <span className="shrink-0 font-ui text-caption tabular-nums text-fg-3">
                              {new Date(n.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar → profile */}
              <Link
                href="/dashboard/profile"
                aria-label="Your profile"
                className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-outline border-ink bg-mango font-ui text-caption font-bold text-on-mango transition-shadow duration-fast hover:shadow-hard-1"
              >
                {profile?.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials
                }
              </Link>

            </div>
          </nav>
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-modal flex flex-col">
          <div aria-hidden className="absolute inset-0 bg-scrim" onClick={() => setMobileOpen(false)} />
          <div className="relative z-[1] max-h-[85vh] overflow-y-auto rounded-b-card border-x-outline border-b-outline border-ink bg-surface px-4 pb-5 pt-3 shadow-hard-3">
            {[
              { href: "/dashboard", label: "The Atelier", Icon: LayoutDashboard, badge: 0 },
              { href: "/dashboard/messages", label: "Messages", Icon: MessageSquare, badge: unreadMessages },
            ].map(({ href, label, Icon, badge }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-2.5 rounded-control px-3 py-2.5 font-ui text-body font-semibold text-fg",
                  isActive(href) ? "bg-mango" : "hover:bg-sunken",
                )}
              >
                <Icon size={18} aria-hidden />
                {label}
                {badge > 0 && (
                  <span className="ml-auto rounded-pill border-outline border-ink bg-mango px-2 font-ui text-caption font-bold">{badge}</span>
                )}
              </Link>
            ))}

            {NAV_SECTIONS.map(section => (
              <div key={section.key} className="mb-2">
                <div className="px-3 pb-1 pt-3">
                  <Eyebrow>{section.label}</Eyebrow>
                </div>
                {section.items.map(item => {
                  const active = isActive(item.href);
                  const IIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-control px-3 py-2 font-ui text-body-sm text-fg",
                        active ? "bg-mango-soft font-semibold" : "font-medium hover:bg-sunken",
                      )}
                    >
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-chip", active ? "bg-ink text-mango" : TONE[item.tone as Tone])}>
                        <IIcon size={16} aria-hidden />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="mt-2 border-t-hair border-line pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 font-ui text-body-sm font-semibold text-fg-2 hover:bg-sunken hover:text-fg"
              >
                <LogOut size={16} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <main className="min-h-screen bg-page">
        <div className="mx-auto max-w-[1280px] px-5 py-7">
          {children}
        </div>
      </main>
    </>
  );
}
