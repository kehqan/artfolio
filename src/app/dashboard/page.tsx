"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ImageIcon, Globe, BarChart3, CalendarDays,
  FolderOpen, Handshake, Users, TrendingUp,
  CheckSquare, Plus, ArrowRight, ExternalLink,
  Eye, DollarSign, Clock, Bell, Check,
  Megaphone, MapPin, Package, Tag, Sparkles,
  Calendar, X, Trash2, BellOff, ChevronRight,
  Palette, Building2, Zap,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
type Stats = {
  artworks: number; available: number; sold: number;
  exhibitions: number; collabs: number;
  sales_total: number; tasks_pending: number;
  followers: number;
};
type Notification = {
  id: string; type: string; title: string; body?: string;
  read: boolean; data?: any; created_at: string;
};
type RecentArtwork = {
  id: string; title: string; status: string; images?: string[];
  price?: number; medium?: string; created_at: string;
};
type UpcomingEvent = {
  id: string; title: string; start_date?: string; venue?: string;
  status: string;
};
type PendingTask = {
  id: string; title: string; status: string; priority: string;
  due_date?: string; progress: number;
};
type RecentSale = {
  id: string; sale_price: number; sale_date?: string;
  status: string; artwork_title?: string;
};

/* ── Animated counter ──────────────────────────────────────────── */
function AnimNum({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) { setVal(target); return; }
    started.current = true;
    const dur = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ── Time ago helper ───────────────────────────────────────────── */
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Notification icon/color config ────────────────────────────── */
const NOTIF_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  follow:  { icon: Users,      color: "#4ECDC4", bg: "#F0FDF4" },
  sale:    { icon: DollarSign,  color: "#16A34A", bg: "#DCFCE7" },
  collab:  { icon: Handshake,   color: "#CA8A04", bg: "#FEF9C3" },
  system:  { icon: Sparkles,    color: "#8B5CF6", bg: "#EDE9FE" },
  artwork: { icon: ImageIcon,   color: "#FF6B6B", bg: "#FFE4E6" },
};

/* ── Status colors ─────────────────────────────────────────────── */
const STATUS_DOT: Record<string, string> = {
  available: "#16A34A", sold: "#111110", reserved: "#D97706",
  "in progress": "#8B5CF6", "in_progress": "#8B5CF6",
  concept: "#9B8F7A", complete: "#0EA5E9",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "#4ECDC4", medium: "#FFD400", high: "#FF6B6B",
};

/* ── Section quick-nav data ────────────────────────────────────── */
const QUICK_NAV = [
  { href: "/dashboard/artworks",    label: "Artworks",    icon: ImageIcon,    color: "#FFD400", desc: "Manage inventory" },
  { href: "/dashboard/exhibitions", label: "Events",      icon: CalendarDays, color: "#4ECDC4", desc: "Shows & exhibitions" },
  { href: "/dashboard/pool",        label: "Collabs",     icon: Handshake,    color: "#FF6B6B", desc: "Discovery pool" },
  { href: "/dashboard/sales",       label: "Sales",       icon: BarChart3,    color: "#8B5CF6", desc: "Track revenue" },
  { href: "/dashboard/tasks",       label: "Tasks",       icon: CheckSquare,  color: "#95E1D3", desc: "To-dos & planning" },
  { href: "/dashboard/map",         label: "Map",         icon: MapPin,       color: "#FF6B6B", desc: "Art scene map" },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [profile, setProfile]           = useState<{ full_name?: string; role?: string; username?: string; avatar_url?: string } | null>(null);
  const [stats, setStats]               = useState<Stats>({ artworks:0, available:0, sold:0, exhibitions:0, collabs:0, sales_total:0, tasks_pending:0, followers:0 });
  const [artworks, setArtworks]         = useState<RecentArtwork[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents]             = useState<UpcomingEvent[]>([]);
  const [tasks, setTasks]               = useState<PendingTask[]>([]);
  const [recentSales, setRecentSales]   = useState<RecentSale[]>([]);
  const [greeting, setGreeting]         = useState("Good morning");
  const [greetEmoji, setGreetEmoji]     = useState("☀️");
  const [loaded, setLoaded]             = useState(false);
  const [notifTab, setNotifTab]         = useState<"all"|"unread">("all");
  const today = new Date();

  useEffect(() => {
    const h = today.getHours();
    if (h >= 5  && h < 12) { setGreeting("Good morning"); setGreetEmoji("☀️"); }
    else if (h >= 12 && h < 17) { setGreeting("Good afternoon"); setGreetEmoji("🌤"); }
    else { setGreeting("Good evening"); setGreetEmoji("🌙"); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const [
        { data: prof },
        { data: aw },
        { data: ex },
        { data: co },
        { data: tk },
        { data: notifData },
        { data: salesData },
        { data: eventsData },
        { count: followerCount },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name,role,username,avatar_url").eq("id", user.id).single(),
        supabase.from("artworks").select("id,title,status,images,price,medium,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tasks").select("id,title,status,priority,due_date,progress").eq("user_id", user.id).in("status", ["pending", "in_progress"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("sales").select("id,sale_price,sale_date,status,artwork_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("exhibitions").select("id,title,start_date,venue,status").eq("user_id", user.id).in("status", ["planning","upcoming","current","Planning","Upcoming","Current"]).order("start_date", { ascending: true }).limit(4),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      ]);

      setProfile(prof);
      setArtworks(aw || []);
      setTasks((tk || []).map(t => ({ ...t, progress: t.progress || 0 })));
      setNotifications(notifData || []);
      setEvents(eventsData || []);

      // Enrich sales with artwork titles
      if (salesData?.length) {
        const artIds = salesData.map(s => s.artwork_id).filter(Boolean);
        const { data: saleArtworks } = await supabase.from("artworks").select("id,title").in("id", artIds);
        const am: Record<string, string> = {};
        saleArtworks?.forEach(a => { am[a.id] = a.title; });
        setRecentSales(salesData.map(s => ({ ...s, artwork_title: am[s.artwork_id] })));
      }

      const awList = aw || [];
      const completedSales = (salesData || []).filter(s => s.status?.toLowerCase() === "completed");
      const totalRev = completedSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);

      setStats({
        artworks:      awList.length,
        available:     awList.filter((a: any) => String(a.status).toLowerCase() === "available").length,
        sold:          awList.filter((a: any) => String(a.status).toLowerCase() === "sold").length,
        exhibitions:   (ex as any)?.count || 0,
        collabs:       (co as any)?.count || 0,
        sales_total:   totalRev,
        tasks_pending: (tk || []).length,
        followers:     followerCount || 0,
      });

      setLoaded(true);
    });
  }, []);

  /* ── Notification actions ────────────────────────────────────── */
  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(p => p.map(n => ({ ...n, read: true })));
  }

  async function deleteNotification(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(p => p.filter(n => n.id !== id));
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  }

  const fname = profile?.full_name?.split(" ")[0] || "Artist";
  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifs = notifTab === "unread" ? notifications.filter(n => !n.read) : notifications;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : "A";

  return (
    <>
      <style>{`
        /* Ripe × Neo-brutalism fusion */
        .ripe-card {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 20px;
          box-shadow: 4px 5px 0 #D4C9A8;
          overflow: hidden;
          transition: box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .ripe-card:hover {
          box-shadow: 6px 7px 0 #111110;
          transform: translate(-1px, -2px);
        }
        .ripe-card-static {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 20px;
          box-shadow: 4px 5px 0 #D4C9A8;
          overflow: hidden;
        }

        /* Stat card */
        .stat-card {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 18px;
          padding: 20px 22px;
          box-shadow: 3px 4px 0 #D4C9A8;
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .stat-card:hover {
          box-shadow: 5px 6px 0 #111110;
          transform: translate(-1px, -1px);
        }
        .stat-accent {
          position: absolute;
          bottom: -8px;
          right: -8px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          opacity: 0.12;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .stat-card:hover .stat-accent {
          transform: scale(1.3);
        }

        /* Quick nav */
        .qnav-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: #fff;
          border: 2px solid #E8E0D0;
          border-radius: 16px;
          text-decoration: none;
          color: #111110;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
        }
        .qnav-card:hover {
          border-color: #111110;
          box-shadow: 3px 4px 0 #111110;
          transform: translate(-1px, -1px);
          background: #FFFBEA;
        }
        .qnav-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 2px solid #111110;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .qnav-card:hover .qnav-icon {
          transform: scale(1.08) rotate(-3deg);
        }

        /* Notification item */
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #F5F0E8;
          transition: background 0.15s;
          cursor: pointer;
          position: relative;
        }
        .notif-item:hover {
          background: #FFFBEA;
        }
        .notif-item:last-child {
          border-bottom: none;
        }
        .notif-dot {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .notif-item:hover .notif-dot {
          transform: scale(1.08);
        }
        .notif-del {
          position: absolute;
          top: 14px;
          right: 14px;
          opacity: 0;
          transition: opacity 0.15s;
          background: none;
          border: none;
          cursor: pointer;
          color: #C0B8A8;
          padding: 2px;
        }
        .notif-item:hover .notif-del {
          opacity: 1;
        }
        .notif-del:hover {
          color: #FF6B6B;
        }

        /* Artwork mini card */
        .aw-mini {
          border-radius: 16px;
          border: 2px solid #E8E0D0;
          overflow: hidden;
          background: #fff;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .aw-mini:hover {
          border-color: #111110;
          box-shadow: 4px 5px 0 #111110;
          transform: translate(-2px, -2px);
        }
        .aw-mini:hover img {
          transform: scale(1.06);
        }
        .aw-mini img {
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }

        /* Event row */
        .event-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #F5F0E8;
          transition: background 0.15s;
        }
        .event-row:last-child { border-bottom: none; }

        /* Task row */
        .task-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #F5F0E8;
        }
        .task-row:last-child { border-bottom: none; }

        /* Section header */
        .sec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 2px solid #111110;
          background: #FAF7F3;
          border-radius: 20px 20px 0 0;
        }

        /* Stagger entry */
        @keyframes ripeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .ripe-in {
          animation: ripeIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }

        /* Tab button */
        .notif-tab {
          padding: 6px 14px;
          border-radius: 9999px;
          border: 2px solid #E8E0D0;
          background: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: #9B8F7A;
          cursor: pointer;
          transition: all 0.15s;
        }
        .notif-tab.active {
          background: #111110;
          border-color: #111110;
          color: #FFD400;
        }
        .notif-tab:not(.active):hover {
          border-color: #111110;
          color: #111110;
        }
      `}</style>

      <div>

        {/* ═══════════════════════════════════════════════════════
            HEADER — Greeting + Quick Actions
            ═══════════════════════════════════════════════════════ */}
        <div className="ripe-in" style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Avatar */}
            <div style={{ width: 56, height: 56, borderRadius: 18, border: "2.5px solid #111110", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#111110", overflow: "hidden", boxShadow: "3px 3px 0 #111110", flexShrink: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>
                {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1 }}>
                {greetEmoji} {greeting}, {fname}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {profile?.username && (
              <Link href={`/${profile.username}`} style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit", color: "#111110" }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "#111110"; el.style.boxShadow = "2px 2px 0 #111110"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.boxShadow = "none"; }}>
                  <ExternalLink size={13} /> Portfolio
                </button>
              </Link>
            )}
            <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110", transition: "all 0.15s cubic-bezier(0.16,1,0.3,1)", fontFamily: "inherit", color: "#111110" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.transform = "translate(-1px,-1px)"; el.style.boxShadow = "4px 4px 0 #111110"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ""; el.style.boxShadow = "3px 3px 0 #111110"; }}>
                <Plus size={14} strokeWidth={3} /> Add Artwork
              </button>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            STAT CARDS
            ═══════════════════════════════════════════════════════ */}
        <div className="ripe-in" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24, animationDelay: "0.08s" }}>
          {[
            { label: "Total Works",  value: stats.artworks,      icon: Package,    color: "#FFD400" },
            { label: "Available",    value: stats.available,     icon: Eye,        color: "#4ECDC4" },
            { label: "Followers",    value: stats.followers,     icon: Users,      color: "#FF6B6B" },
            { label: "Active Tasks", value: stats.tasks_pending, icon: CheckSquare, color: "#8B5CF6" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: stat.color, border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color="#111110" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em" }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#111110", lineHeight: 1, letterSpacing: "-1px" }}>
                  {loaded ? <AnimNum target={stat.value} /> : "—"}
                </div>
                <div className="stat-accent" style={{ background: stat.color }} />
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════
            MAIN GRID — Content + Sidebar
            ═══════════════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28, alignItems: "start" }}>

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Recent Artworks */}
            <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.15s" }}>
              <div className="sec-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#FFD400", border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Recent Artworks</span>
                </div>
                <Link href="/dashboard/artworks" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#9B8F7A", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#111110")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9B8F7A")}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {artworks.length > 0 ? (
                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {artworks.slice(0, 8).map((aw) => {
                    const img = Array.isArray(aw.images) ? aw.images[0] : null;
                    const sc = STATUS_DOT[String(aw.status).toLowerCase()] || "#9B8F7A";
                    return (
                      <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="aw-mini">
                        <div style={{ aspectRatio: "1/1", background: "#FAF7F3", position: "relative", overflow: "hidden" }}>
                          {img
                            ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <ImageIcon size={20} color="#D4C9A8" />
                              </div>
                          }
                          <div style={{ position: "absolute", bottom: 6, left: 6, width: 10, height: 10, borderRadius: "50%", background: sc, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                          <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600, marginTop: 2 }}>
                            {aw.medium || "—"}
                            {aw.price ? <span style={{ fontFamily: "monospace", marginLeft: 6 }}>${Number(aw.price).toLocaleString()}</span> : ""}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 4 }}>No artworks yet</div>
                  <div style={{ fontSize: 12, color: "#9B8F7A", marginBottom: 16 }}>Add your first piece to start building your inventory</div>
                  <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                    <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#FFD400", border: "2px solid #111110", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "2px 2px 0 #111110", fontFamily: "inherit" }}>
                      <Plus size={13} strokeWidth={3} /> Add Artwork
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div className="ripe-in" style={{ animationDelay: "0.2s" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, paddingLeft: 4 }}>Quick Access</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {QUICK_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                      <div className="qnav-card">
                        <div className="qnav-icon" style={{ background: item.color }}>
                          <Icon size={18} color="#111110" />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", letterSpacing: "-0.2px" }}>{item.label}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>{item.desc}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Recent Sales */}
            {recentSales.length > 0 && (
              <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.25s" }}>
                <div className="sec-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 3, background: "#16A34A", border: "1.5px solid #111110" }} />
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Recent Sales</span>
                  </div>
                  <Link href="/dashboard/sales" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>
                    All sales <ArrowRight size={12} />
                  </Link>
                </div>
                <div style={{ padding: "8px 18px" }}>
                  {recentSales.map((sale) => (
                    <div key={sale.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F5F0E8" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{sale.artwork_title || "Artwork"}</div>
                        <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                          {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>${sale.sale_price?.toLocaleString()}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 8, background: sale.status?.toLowerCase() === "completed" ? "#DCFCE7" : "#FEF9C3", color: sale.status?.toLowerCase() === "completed" ? "#16A34A" : "#CA8A04", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{sale.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (Sidebar) ──────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── NOTIFICATION CENTER ──────────────────────────── */}
            <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.12s" }}>
              <div className="sec-header" style={{ background: unreadCount > 0 ? "#FFFBEA" : "#FAF7F3" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ position: "relative" }}>
                    <Bell size={16} color="#111110" />
                    {unreadCount > 0 && (
                      <div style={{ position: "absolute", top: -5, right: -6, width: 16, height: 16, borderRadius: "50%", background: "#FF6B6B", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#fff" }}>
                        {unreadCount}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Notifications</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#111110")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9B8F7A")}>
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, padding: "12px 18px", borderBottom: "1px solid #F5F0E8" }}>
                <button className={`notif-tab${notifTab === "all" ? " active" : ""}`} onClick={() => setNotifTab("all")}>
                  All {notifications.length > 0 && `(${notifications.length})`}
                </button>
                <button className={`notif-tab${notifTab === "unread" ? " active" : ""}`} onClick={() => setNotifTab("unread")}>
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
                {notifications.length > 0 && (
                  <button onClick={clearAll} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#C0B8A8", padding: 0, display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, fontFamily: "inherit", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#FF6B6B")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#C0B8A8")}>
                    Clear all
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {filteredNotifs.length === 0 ? (
                  <div style={{ padding: "36px 20px", textAlign: "center" }}>
                    <BellOff size={28} color="#D4C9A8" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>
                      {notifTab === "unread" ? "All caught up!" : "No notifications yet"}
                    </div>
                    <div style={{ fontSize: 11, color: "#C0B8A8", marginTop: 4 }}>
                      {notifTab === "unread" ? "You've read everything" : "Activity will show up here"}
                    </div>
                  </div>
                ) : (
                  filteredNotifs.map((notif) => {
                    const cfg = NOTIF_CFG[notif.type] || NOTIF_CFG.system;
                    const Icon = cfg.icon;
                    return (
                      <div key={notif.id} className="notif-item"
                        onClick={() => !notif.read && markRead(notif.id)}
                        style={{ background: notif.read ? "transparent" : "#FFFEF5" }}>
                        <div className="notif-dot" style={{ background: cfg.bg }}>
                          <Icon size={16} color={cfg.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: notif.read ? 600 : 800, color: "#111110" }}>{notif.title}</span>
                            {!notif.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B", flexShrink: 0 }} />}
                          </div>
                          {notif.body && (
                            <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.body}</div>
                          )}
                          <div style={{ fontSize: 10, color: "#C0B8A8", fontWeight: 600, marginTop: 4 }}>{timeAgo(notif.created_at)}</div>
                        </div>
                        <button className="notif-del" onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}>
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── UPCOMING EVENTS ──────────────────────────────── */}
            <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.18s" }}>
              <div className="sec-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#4ECDC4", border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Upcoming Events</span>
                </div>
                <Link href="/dashboard/exhibitions" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>
                  All <ArrowRight size={12} />
                </Link>
              </div>
              <div style={{ padding: "4px 18px 12px" }}>
                {events.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center" }}>
                    <Calendar size={22} color="#D4C9A8" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>No upcoming events</div>
                    <Link href="/dashboard/exhibitions" style={{ fontSize: 11, fontWeight: 700, color: "#4ECDC4", textDecoration: "none" }}>
                      + Create an event
                    </Link>
                  </div>
                ) : (
                  events.map((ev) => {
                    const statusColors: Record<string, string> = { planning: "#9B8F7A", upcoming: "#8B5CF6", current: "#16A34A" };
                    const sc = statusColors[ev.status.toLowerCase()] || "#9B8F7A";
                    return (
                      <div key={ev.id} className="event-row">
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: sc + "18", border: `1.5px solid ${sc}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Calendar size={16} color={sc} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                            {ev.venue ? `${ev.venue} · ` : ""}
                            {ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}
                          </div>
                        </div>
                        <div style={{ padding: "2px 8px", borderRadius: 8, background: sc + "18", color: sc, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{ev.status}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── TASKS PROGRESS ───────────────────────────────── */}
            <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.22s" }}>
              <div className="sec-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: "#8B5CF6", border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Active Tasks</span>
                </div>
                <Link href="/dashboard/tasks" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>
                  All <ArrowRight size={12} />
                </Link>
              </div>
              <div style={{ padding: "4px 18px 12px" }}>
                {tasks.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center" }}>
                    <CheckSquare size={22} color="#D4C9A8" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>No active tasks</div>
                    <Link href="/dashboard/tasks" style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6", textDecoration: "none" }}>
                      + Add a task
                    </Link>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const pc = PRIORITY_COLOR[task.priority] || "#FFD400";
                    return (
                      <div key={task.id} className="task-row">
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: pc, border: "1.5px solid #111110", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{task.title}</div>
                          <div style={{ height: 4, background: "#E8E0D0", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", background: pc, borderRadius: 2, width: `${task.progress}%`, transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", flexShrink: 0, fontFamily: "monospace" }}>{task.progress}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
