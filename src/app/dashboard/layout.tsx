// src/app/dashboard/layout.tsx
// App shell: the left rail is the main navigation (one entry per area),
// the top bar holds the secondary navigation (the pages inside the
// current area) plus search, notifications and the account menu.
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, Handshake, Wallet, CalendarDays,
  MessageSquare, Bell, BellOff, Search, X, Menu, LogOut,
  UserRound, ExternalLink, ChevronDown, type LucideIcon,
} from "lucide-react";
import { cn, Avatar } from "@/components/ui";
import { Wordmark as BrandWordmark } from "@/components/brand/Wordmark";

// ── Navigation model ───────────────────────────────────────────────
type Page = { href: string; label: string; venueLabel?: string };
type Area = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;          // where the rail entry goes
  pages: Page[];         // shown as tabs in the top bar
  match?: string[];      // extra paths that belong to this area
};

const AREAS: Area[] = [
  { key: "atelier", label: "Home", icon: LayoutDashboard, href: "/dashboard", pages: [] },
  {
    key: "studio", label: "Studio", icon: ImageIcon, href: "/dashboard/artworks",
    pages: [
      { href: "/dashboard/artworks", label: "Works" },
      { href: "/dashboard/site", label: "Your site" },
      { href: "/dashboard/mystore", label: "For sale" },
    ],
    match: ["/dashboard/moodboard"],
  },
  {
    key: "scene", label: "Scene", icon: Handshake, href: "/dashboard/looking",
    pages: [
      { href: "/dashboard/looking", label: "Looking for art", venueLabel: "Find artists" },
      { href: "/dashboard/scene", label: "Feed" },
      { href: "/dashboard/discover", label: "People" },
      { href: "/dashboard/education", label: "Learn" },
    ],
    match: ["/dashboard/exhibitions", "/dashboard/pool", "/dashboard/map"],
  },
  {
    key: "business", label: "Money", icon: Wallet, href: "/dashboard/sales",
    pages: [
      { href: "/dashboard/sales", label: "Sales" },
      { href: "/dashboard/clients", label: "Collectors" },
      { href: "/dashboard/contracts", label: "Papers" },
    ],
    match: ["/dashboard/analytics"],
  },
  {
    key: "planning", label: "Planner", icon: CalendarDays, href: "/dashboard/tasks",
    pages: [],
    match: ["/dashboard/calendar"],
  },
];

// Messages lives in the top bar, not the rail.
const MESSAGES: Area = { key: "messages", label: "Messages", icon: MessageSquare, href: "/dashboard/messages", pages: [] };

const ACCOUNT: Area = {
  key: "account", label: "Your profile", icon: UserRound, href: "/dashboard/profile",
  pages: [], match: ["/dashboard/design-system"],
};

// Everything the page search can jump to
const SEARCHABLE: (Page & { area: string })[] = [
  ...AREAS.flatMap(a =>
    a.pages.length
      ? a.pages.map(p => ({ ...p, area: a.label }))
      : [{ href: a.href, label: a.label, area: "" }],
  ),
  { href: "/dashboard/messages", label: "Messages", area: "" },
  { href: "/dashboard/profile", label: "Your profile", area: "" },
  { href: "/dashboard/mystore?tab=moodboards", label: "Moodboards", area: "Studio" },
  { href: "/dashboard/tasks?view=month", label: "Calendar", area: "Planner" },
  { href: "/dashboard/scene?show=show", label: "Shows and events", area: "Scene" },
  { href: "/dashboard/scene?show=opportunity", label: "Open calls and opportunities", area: "Scene" },
  { href: "/dashboard/scene?view=map", label: "Scene map", area: "Scene" },
];

const startsWith = (path: string, href: string) => path === href || path.startsWith(href + "/");

function areaFor(path: string): Area | null {
  if (path === "/dashboard") return AREAS[0];
  for (const a of [...AREAS, MESSAGES, ACCOUNT]) {
    if (a.key === "atelier") continue;
    const hrefs = [a.href, ...a.pages.map(p => p.href), ...(a.match ?? [])];
    if (hrefs.some(h => startsWith(path, h))) return a;
  }
  return null;
}

type Notification = {
  id: string; type: string; title: string; body?: string;
  read: boolean; data?: any; created_at: string;
};

type Profile = { full_name?: string; role?: string; avatar_url?: string; username?: string };

// Shared class recipes (all values come from design tokens)
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const floating = "rounded-card border-outline border-ink bg-surface shadow-hard-3 overflow-hidden animate-drop-in";
const iconBtn = (on: boolean) => cn(
  "relative grid h-9 w-9 shrink-0 place-items-center rounded-pill transition-colors duration-fast ease-out", focusRing,
  on ? "bg-inverse text-on-inverse" : "text-fg-2 hover:bg-sunken hover:text-fg",
);

// ── Pieces ─────────────────────────────────────────────────────────
function Wordmark() {
  return <BrandWordmark href="/dashboard" />;
}

function RailNav({ active, username, onNavigate }: {
  active: Area | null; username?: string; onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {AREAS.map(area => {
            const on = active?.key === area.key;
            const Icon = area.icon;
            return (
              <li key={area.key}>
                <Link
                  href={area.href}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-control border-outline px-3 font-ui text-label font-semibold",
                    "transition-colors duration-fast ease-out", focusRing,
                    on
                      ? "border-ink bg-mango text-on-mango shadow-hard-1"
                      : "border-transparent text-fg-2 hover:bg-sunken hover:text-fg",
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {area.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {username && (
        <div className="border-t-hair border-line px-3 py-3">
          <a
            href={`/${username}`}
            target="_blank"
            rel="noreferrer"
            onClick={onNavigate}
            className={cn("flex h-10 items-center gap-3 rounded-control px-3 font-ui text-label font-semibold text-fg-2 hover:bg-sunken hover:text-fg", focusRing)}
          >
            <ExternalLink size={16} aria-hidden />
            View your public page
          </a>
        </div>
      )}
    </div>
  );
}

function AreaTabs({ area, pathname, venue, className }: { area: Area | null; pathname: string; venue?: boolean; className?: string }) {
  if (!area || area.pages.length === 0) {
    return area ? <span className={cn("font-display text-h3 text-fg", className)}>{area.label}</span> : null;
  }
  return (
    <nav aria-label={area.label} className={cn("flex h-full items-stretch gap-1 overflow-x-auto", className)}>
      {area.pages.map(p => {
        const on = startsWith(pathname, p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 font-ui text-label font-semibold",
              "transition-colors duration-fast ease-out", focusRing,
              on ? "border-ink text-fg" : "border-transparent text-fg-3 hover:text-fg",
            )}
          >
            {venue && p.venueLabel ? p.venueLabel : p.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Layout ─────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const isVenue = profile?.role === "venue" || profile?.role === "gallery";
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [open, setOpen] = useState<null | "search" | "bell" | "account" | "drawer">(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toolsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from("profiles").select("full_name,role,avatar_url,username")
        .eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
      loadNotifications(user.id);
      loadUnreadMessages();
    });
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

  // Close floating layers on outside click and Escape
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (open && open !== "drawer" && toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setOpen(null); setSearchQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(null); setSearchQuery(""); }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => { setOpen(null); setSearchQuery(""); }, [pathname]);
  useEffect(() => { if (open === "search") setTimeout(() => searchRef.current?.focus(), 50); }, [open]);

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

  const toggle = (k: NonNullable<typeof open>) => setOpen(o => (o === k ? null : k));
  const area = areaFor(pathname);
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const searchResults = searchQuery
    ? SEARCHABLE.filter(i => (i.label + " " + i.area).toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const name = profile?.full_name || "Your account";

  return (
    <div className="min-h-screen bg-page">
      {/* ── RAIL (desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-nav hidden w-rail flex-col border-r-hair border-line bg-surface lg:flex">
        <div className="flex h-header shrink-0 items-center border-b-hair border-line px-6">
          <Wordmark />
        </div>
        <RailNav active={area} username={profile?.username} />
      </aside>

      {/* ── DRAWER (mobile) ── */}
      {open === "drawer" && (
        <div className="fixed inset-0 z-modal lg:hidden">
          <div aria-hidden className="absolute inset-0 bg-scrim" onClick={() => setOpen(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col border-r-outline border-ink bg-surface shadow-hard-3"
          >
            <div className="flex h-header shrink-0 items-center justify-between border-b-hair border-line px-4">
              <Wordmark />
              <button type="button" aria-label="Close menu" className={iconBtn(false)} onClick={() => setOpen(null)}>
                <X size={18} aria-hidden />
              </button>
            </div>
            <RailNav
              active={area}
              username={profile?.username}
              onNavigate={() => setOpen(null)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-rail">
        {/* ── TOP BAR: secondary navigation + tools ── */}
        <header className="sticky top-0 z-nav border-b-hair border-line bg-surface">
          <div className="flex h-header items-center gap-3 px-4 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              className={cn(iconBtn(false), "lg:hidden")}
              onClick={() => setOpen("drawer")}
            >
              <Menu size={18} aria-hidden />
            </button>
            <div className="lg:hidden"><Wordmark /></div>

            <AreaTabs area={area} pathname={pathname} venue={isVenue} className="hidden lg:flex" />

            <div ref={toolsRef} className="ml-auto flex items-center gap-1">
              {/* Search */}
              <div className="relative">
                <button
                  type="button"
                  aria-label={open === "search" ? "Close search" : "Search pages"}
                  aria-expanded={open === "search"}
                  className={iconBtn(open === "search")}
                  onClick={() => { toggle("search"); setSearchQuery(""); }}
                >
                  {open === "search" ? <X size={18} aria-hidden /> : <Search size={18} aria-hidden />}
                </button>
                {open === "search" && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-dropdown">
                    <div className={cn(floating, "w-[min(340px,calc(100vw-32px))]")}>
                      <div className="flex items-center gap-2 border-b-hair border-line px-3.5 py-2.5">
                        <Search size={16} aria-hidden className="text-fg-3" />
                        <input
                          ref={searchRef}
                          aria-label="Search pages"
                          className="flex-1 bg-transparent font-ui text-control text-fg outline-none placeholder:text-fg-3"
                          placeholder="Jump to a page"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && searchResults[0]) router.push(searchResults[0].href);
                          }}
                        />
                      </div>
                      {searchQuery && (
                        <div className="max-h-[320px] overflow-y-auto p-1.5">
                          {searchResults.length === 0 ? (
                            <p className="px-2.5 py-3 font-ui text-body-sm text-fg-3">No page called &ldquo;{searchQuery}&rdquo;.</p>
                          ) : searchResults.map(item => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-baseline justify-between gap-3 rounded-control px-2.5 py-2 hover:bg-sunken"
                            >
                              <span className="font-ui text-label font-semibold text-fg">{item.label}</span>
                              {item.area && <span className="font-ui text-caption text-fg-3">{item.area}</span>}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <Link
                href="/dashboard/messages"
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
                aria-current={area?.key === "messages" ? "page" : undefined}
                className={iconBtn(area?.key === "messages")}
              >
                <MessageSquare size={18} aria-hidden />
                {unreadMessages > 0 && (
                  <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-pill border-outline border-ink bg-mango px-1 font-ui text-[10px] font-bold leading-none text-on-mango">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : "Notifications"}
                  aria-expanded={open === "bell"}
                  className={iconBtn(open === "bell")}
                  onClick={() => toggle("bell")}
                >
                  <Bell size={18} aria-hidden />
                  {unreadNotifs > 0 && open !== "bell" && (
                    <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-outline border-ink bg-mango" />
                  )}
                </button>
                {open === "bell" && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-dropdown">
                    <div className={cn(floating, "w-[min(360px,calc(100vw-32px))]")}>
                      <div className="flex items-baseline justify-between border-b-hair border-line px-4 py-3">
                        <span className="font-display text-h3">
                          Notifications
                          {unreadNotifs > 0 && <span className="ml-2 font-ui text-label font-semibold text-fg-3">{unreadNotifs} new</span>}
                        </span>
                        {unreadNotifs > 0 && (
                          <button type="button" className="font-ui text-caption font-semibold text-fg-3 hover:text-fg" onClick={markAllNotifRead}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                            <BellOff size={22} aria-hidden className="text-fg-3" />
                            <span className="font-ui text-label font-semibold text-fg-2">You&rsquo;re all caught up</span>
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
                              if (n.type === "message" && n.data?.conversation_id) router.push("/dashboard/messages");
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

              <div aria-hidden className="mx-2 hidden h-7 w-px bg-line sm:block" />

              {/* Account */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Account menu"
                  aria-expanded={open === "account"}
                  onClick={() => toggle("account")}
                  className={cn("flex items-center gap-2.5 rounded-pill py-1 pl-1 pr-1 sm:pr-2.5 hover:bg-sunken", focusRing, open === "account" && "bg-sunken")}
                >
                  <Avatar src={profile?.avatar_url} name={profile?.full_name || "Artomango"} size="sm" />
                  <span className="hidden flex-col items-start text-left sm:flex">
                    <span className="max-w-[160px] truncate font-ui text-label font-semibold text-fg">{name}</span>
                    {profile?.role && <span className="font-ui text-caption capitalize text-fg-3">{profile.role}</span>}
                  </span>
                  <ChevronDown size={14} aria-hidden className="hidden text-fg-3 sm:block" />
                </button>
                {open === "account" && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-dropdown">
                    <div className={cn(floating, "w-[240px] p-1.5")}>
                      <Link href="/dashboard/profile" className="flex items-center gap-2.5 rounded-control px-2.5 py-2 font-ui text-label font-semibold text-fg hover:bg-sunken">
                        <UserRound size={16} aria-hidden className="text-fg-3" /> Edit your profile
                      </Link>
                      {profile?.username && (
                        <a href={`/${profile.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-control px-2.5 py-2 font-ui text-label font-semibold text-fg hover:bg-sunken">
                          <ExternalLink size={16} aria-hidden className="text-fg-3" /> View your public page
                        </a>
                      )}
                      <div aria-hidden className="my-1 h-px bg-line" />
                      <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 font-ui text-label font-semibold text-fg-2 hover:bg-sunken hover:text-fg">
                        <LogOut size={16} aria-hidden className="text-fg-3" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary navigation on small screens: its own scrolling row */}
          {area && area.pages.length > 0 && (
            <div className="h-11 border-t-hair border-line px-2 lg:hidden">
              <AreaTabs area={area} pathname={pathname} venue={isVenue} />
            </div>
          )}
        </header>

        {/* ── PAGE ── */}
        <main className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
