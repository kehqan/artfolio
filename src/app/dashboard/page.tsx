"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ImageIcon, Bell, X, ArrowRight, Plus, ExternalLink,
  Package, Eye, Users, CheckSquare, DollarSign, Handshake,
  BarChart3, CalendarDays, MapPin, Sparkles, ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   THE ATELIER — Focus Mode by default, classic dashboard beneath
   Ripe design system · 60/30/10 (cream/ink/mango) with a lightened
   nearly-white Focus canvas
   ══════════════════════════════════════════════════════════════════ */

/* ── Helpers (shared across modes) ─────────────────────────────── */
function AnimNum({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const dur = 900;
        const step = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <div ref={ref}>{val}</div>;
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Config ────────────────────────────────────────────────────── */
const NOTIF_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  follow:  { icon: Users,      color: "#4ECDC4", bg: "#F0FDF4" },
  sale:    { icon: DollarSign, color: "#16A34A", bg: "#DCFCE7" },
  collab:  { icon: Handshake,  color: "#CA8A04", bg: "#FEF9C3" },
  system:  { icon: Sparkles,   color: "#8B5CF6", bg: "#EDE9FE" },
  artwork: { icon: ImageIcon,  color: "#FF6B6B", bg: "#FFE4E6" },
};
const STATUS_DOT: Record<string, string> = {
  available: "#16A34A", sold: "#111110", reserved: "#D97706",
  "in progress": "#8B5CF6", "in_progress": "#8B5CF6",
  concept: "#9B8F7A", complete: "#0EA5E9",
};
const PRIORITY_COLOR: Record<string, string> = {
  low: "#4ECDC4", medium: "#FFD400", high: "#FF6B6B",
};
const QUICK_NAV = [
  { href: "/dashboard/artworks",    label: "Artworks",  icon: ImageIcon,    color: "#FFD400", desc: "Manage inventory" },
  { href: "/dashboard/exhibitions", label: "Events",    icon: CalendarDays, color: "#4ECDC4", desc: "Shows & exhibitions" },
  { href: "/dashboard/pool",        label: "Collabs",   icon: Handshake,    color: "#FF6B6B", desc: "Discovery pool" },
  { href: "/dashboard/sales",       label: "Sales",     icon: BarChart3,    color: "#8B5CF6", desc: "Track revenue" },
  { href: "/dashboard/tasks",       label: "Tasks",     icon: CheckSquare,  color: "#95E1D3", desc: "To-dos & planning" },
  { href: "/dashboard/map",         label: "Map",       icon: MapPin,       color: "#FF6B6B", desc: "Art scene map" },
];

/* ══════════════════════════════════════════════════════════════════
   FOCUS MODE: Palette + sub-menu chips
   ══════════════════════════════════════════════════════════════════ */

type WellKey = "studio" | "scene" | "money" | "planning" | "messages";

type SubItem = { label: string; q: string; href: string };
type Well = {
  key: WellKey;
  emoji: string;
  label: string;
  answer: string;          // casual answer inside the hole
  color: string;           // ripe-system section color (hover state)
  href?: string;           // direct nav if no sub-menu
  subs?: SubItem[];
};

const WELLS: Well[] = [
  {
    key: "studio",
    emoji: "🎨",
    label: "My Studio",
    answer: "I'm here to organize my art.",
    color: "#FFD400",
    subs: [
      { label: "My Works",      q: "The living record of every piece created.",       href: "/dashboard/artworks"  },
      { label: "My Front Door", q: "Show my shop. The one strangers can see from.",   href: "/dashboard/mystore"   },
      { label: "Moodboard",     q: "Visual notes and creative daydreams.",            href: "/dashboard/moodboard" },
    ],
  },
  {
    key: "scene",
    emoji: "🗺️",
    label: "The Scene",
    answer: "I want to see what's happening out there.",
    color: "#4ECDC4",
    subs: [
      { label: "Events & Education", q: "What's on? Shows, workshops, deadlines.",                    href: "/dashboard/exhibitions" },
      { label: "Collabs",            q: "Open requests from artists and venues — find your next collab.", href: "/dashboard/pool"        },
      { label: "Map",                q: "Show me the Prague art scene on a map.",                      href: "/dashboard/map"         },
    ],
  },
  {
    key: "money",
    emoji: "💰",
    label: "Deals & Money",
    answer: "Let's talk numbers.",
    color: "#8B5CF6",
    subs: [
      { label: "My Sales",      q: "Track what I've sold.",                      href: "/dashboard/sales"     },
      { label: "My Collectors", q: "Who follow my work?",                        href: "/dashboard/clients"   },
      { label: "My Papers",     q: "Agreements & deals — easy paperwork.",       href: "/dashboard/contracts" },
      { label: "My Reach",      q: "How am I actually doing?",                   href: "/dashboard/analytics" },
    ],
  },
  {
    key: "planning",
    emoji: "📅",
    label: "Planning",
    answer: "I need to get organized.",
    color: "#FF6B6B",
    subs: [
      { label: "Tasks",       q: "My to-do list.",                  href: "/dashboard/tasks"    },
      { label: "My Schedule", q: "Everything on a calendar.",       href: "/dashboard/calendar" },
    ],
  },
  {
    key: "messages",
    emoji: "💬",
    label: "Messages",
    answer: "Anyone write to me?",
    color: "#95E1D3",
    href: "/dashboard/messages", // direct, no sub-menu
  },
];

/* ── Custom palette SVG positions (percent of viewBox 720×520) ── */
/* Designed organically: big well top-center (My Studio), 4 smaller
   wells scattered, thumbhole on the right. */
const WELL_POSITIONS: Record<WellKey, { cx: number; cy: number; r: number }> = {
  studio:   { cx: 320, cy: 170, r: 74 },  // biggest, slightly left-center
  scene:    { cx: 150, cy: 240, r: 48 },  // left
  money:    { cx: 470, cy: 280, r: 52 },  // right-center
  planning: { cx: 240, cy: 370, r: 46 },  // bottom-left
  messages: { cx: 430, cy: 410, r: 44 },  // bottom-right (smallest)
};

function PaletteSVG({
  hoverKey,
  onHover,
  onLeave,
  onPick,
}: {
  hoverKey: WellKey | null;
  onHover: (k: WellKey) => void;
  onLeave: () => void;
  onPick: (k: WellKey) => void;
}) {
  return (
    <svg viewBox="0 0 720 520" xmlns="http://www.w3.org/2000/svg"
         style={{ width: "100%", height: "auto", maxWidth: 620, display: "block", margin: "0 auto" }}>
      <defs>
        {/* Palette body shadow */}
        <filter id="pal-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="6" dy="8" stdDeviation="0" floodColor="#111110" floodOpacity="1" />
        </filter>
        {/* Each well gets a subtle highlight */}
        <radialGradient id="well-gloss" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Palette body — organic kidney shape with thumbhole ── */}
      <g filter="url(#pal-shadow)">
        <path
          d="
            M 140 110
            C 200 70, 330 55, 420 70
            C 540 90, 620 150, 630 240
            C 638 300, 610 350, 580 360
            C 560 365, 555 380, 560 400
            C 568 430, 560 450, 530 455
            C 510 458, 500 445, 500 425
            C 500 405, 490 395, 470 398
            C 430 405, 380 440, 320 450
            C 220 465, 120 430, 80 350
            C 40 260, 70 160, 140 110
            Z
          "
          fill="#FFFBEF"
          stroke="#111110"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      {/* ── 5 paint wells ── */}
      {WELLS.map(well => {
        const pos = WELL_POSITIONS[well.key];
        const isHover = hoverKey === well.key;
        const fillColor = isHover ? well.color : "#FAF5E8";

        return (
          <g
            key={well.key}
            onClick={() => onPick(well.key)}
            onMouseEnter={() => onHover(well.key)}
            onMouseLeave={onLeave}
            onFocus={() => onHover(well.key)}
            onBlur={onLeave}
            tabIndex={0}
            role="button"
            aria-label={`${well.label} — ${well.answer}`}
            style={{
              cursor: "pointer",
              outline: "none",
              transformOrigin: `${pos.cx}px ${pos.cy}px`,
              transform: isHover ? "translateY(-4px) scale(1.05)" : "none",
              transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Well inner shadow ring */}
            <circle cx={pos.cx} cy={pos.cy + 2} r={pos.r} fill="rgba(17,17,16,0.15)" />
            {/* Paint fill */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r}
              fill={fillColor}
              stroke="#111110"
              strokeWidth="2.5"
              style={{ transition: "fill 0.3s ease" }}
            />
            {/* Gloss */}
            <circle cx={pos.cx} cy={pos.cy} r={pos.r - 2} fill="url(#well-gloss)" pointerEvents="none" />

            {/* Emoji — big, centered */}
            <text
              x={pos.cx}
              y={pos.cy + pos.r * 0.18}
              textAnchor="middle"
              fontSize={pos.r * 0.95}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {well.emoji}
            </text>

            {/* Invisible hit pad for easier tapping */}
            <circle cx={pos.cx} cy={pos.cy} r={pos.r + 6} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CLASSIC DASHBOARD (original, unchanged visually — just extracted)
   ══════════════════════════════════════════════════════════════════ */
function ClassicDashboard({
  profile, artworks, stats, tasks, events, recentSales, notifications,
  loaded, notifTab, setNotifTab,
  markRead, markAllRead, deleteNotification, clearAll,
  fname, unreadCount, filteredNotifs, initials, today, greeting, greetEmoji,
}: any) {
  return (
    <div>
      {/* HEADER */}
      <div className="ripe-in dash-header" style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="dash-avatar" style={{ width: 56, height: 56, borderRadius: 18, border: "2.5px solid #111110", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#111110", overflow: "hidden", boxShadow: "3px 3px 0 #111110", flexShrink: 0 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>
              {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 34px)", fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1 }}>
              {greetEmoji} {greeting}, {fname}
            </h1>
          </div>
        </div>
        <div className="dash-header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

      {/* STATS */}
      <div className="ripe-in dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24, animationDelay: "0.08s" }}>
        {[
          { label: "Total Works",  value: stats.artworks,      icon: Package,     color: "#FFD400" },
          { label: "Available",    value: stats.available,     icon: Eye,         color: "#4ECDC4" },
          { label: "Followers",    value: stats.followers,     icon: Users,       color: "#FF6B6B" },
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

      {/* MAIN GRID */}
      <div className="dash-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28, alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Recent Artworks */}
          <div className="ripe-card-static ripe-in" style={{ animationDelay: "0.15s" }}>
            <div className="sec-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 3, background: "#FFD400", border: "1.5px solid #111110" }} />
                <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Recent Artworks</span>
              </div>
              <Link href="/dashboard/artworks" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#9B8F7A", transition: "color 0.15s" }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {artworks.length > 0 ? (
              <div className="dash-artworks-grid" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {artworks.slice(0, 8).map((aw: any) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  const sc = STATUS_DOT[String(aw.status).toLowerCase()] || "#9B8F7A";
                  return (
                    <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="aw-mini">
                      <div style={{ aspectRatio: "1/1", background: "#FAF7F3", position: "relative", overflow: "hidden" }}>
                        {img
                          ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={24} color="#D4C9A8" /></div>}
                        <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: sc, border: "1.5px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                      <div style={{ padding: "7px 9px 9px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                        {aw.price && <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>${aw.price.toLocaleString()}</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A", marginBottom: 12 }}>No artworks yet</div>
                <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                  <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#FFD400", border: "2px solid #111110", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", boxShadow: "2px 2px 0 #111110" }}>
                    <Plus size={13} strokeWidth={3} /> Add your first artwork
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Nav */}
          <div className="ripe-in" style={{ animationDelay: "0.2s" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, paddingLeft: 4 }}>Quick Access</div>
            <div className="dash-quick-nav" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
                {recentSales.map((sale: any) => (
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

        {/* RIGHT */}
        <div className="dash-sidebar" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Notifications */}
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
                  <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark all read</button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 700, color: "#C0B8A8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "12px 18px", borderBottom: "1px solid #F5F0E8" }}>
              <button className={`notif-tab${notifTab === "all" ? " active" : ""}`} onClick={() => setNotifTab("all")}>All</button>
              <button className={`notif-tab${notifTab === "unread" ? " active" : ""}`} onClick={() => setNotifTab("unread")}>
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {filteredNotifs.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>{notifTab === "unread" ? "All caught up!" : "No notifications yet"}</div>
                </div>
              ) : (
                filteredNotifs.map((notif: any) => {
                  const cfg = NOTIF_CFG[notif.type] || NOTIF_CFG.system;
                  const Icon = cfg.icon;
                  return (
                    <div key={notif.id} className="notif-item" onClick={() => markRead(notif.id)}
                      style={{ background: notif.read ? "transparent" : "#FFFEF5" }}>
                      <div className="notif-dot" style={{ background: cfg.bg }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: notif.read ? 600 : 800, color: "#111110" }}>{notif.title}</span>
                          {!notif.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B", flexShrink: 0 }} />}
                        </div>
                        {notif.body && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.body}</div>}
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

          {/* Events */}
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
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>No upcoming events</div>
                </div>
              ) : (
                events.map((ev: any) => {
                  const sc = ev.status === "Active" ? "#16A34A" : ev.status === "Planning" ? "#CA8A04" : "#9B8F7A";
                  return (
                    <div key={ev.id} className="event-row">
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F5F0E8", border: "1.5px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CalendarDays size={16} color="#9B8F7A" />
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

          {/* Tasks */}
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
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>No active tasks</div>
                </div>
              ) : (
                tasks.map((task: any) => {
                  const pc = PRIORITY_COLOR[task.priority] || "#9B8F7A";
                  return (
                    <div key={task.id} className="task-row">
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: pc, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                        {task.due_date && <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600, marginTop: 2 }}>Due {fmtDate(task.due_date)}</div>}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: pc, background: pc + "20", padding: "2px 8px", borderRadius: 6, flexShrink: 0, textTransform: "uppercase" }}>{task.priority}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();

  /* Data */
  const [profile, setProfile] = useState<any>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [stats, setStats] = useState({ artworks: 0, available: 0, sold: 0, exhibitions: 0, collabs: 0, sales_total: 0, tasks_pending: 0, followers: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "unread">("all");

  /* Focus Mode */
  const [focusDefault, setFocusDefault] = useState(true); // per-user preference
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [hoverWell, setHoverWell] = useState<WellKey | null>(null);
  const [pickedWell, setPickedWell] = useState<WellKey | null>(null);
  const [expandedClassic, setExpandedClassic] = useState(false);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetEmoji = hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";

  /* Load everything */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) return;

      const [
        { data: prof },
        { data: aw },
        { data: tk },
        { data: eventsData },
        { data: salesData },
        { count: ex },
        { count: co },
        { count: followerCount },
        { data: notifs },
      ] = await Promise.all([
        // Request focus_mode_default too — will be undefined if column doesn't exist yet
        supabase.from("profiles").select("full_name,role,username,avatar_url,focus_mode_default").eq("id", user.id).single(),
        supabase.from("artworks").select("id,title,images,status,price").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").order("due_date", { ascending: true }).limit(5),
        supabase.from("exhibitions").select("*").eq("user_id", user.id).gte("end_date", new Date().toISOString().split("T")[0]).order("start_date").limit(3),
        supabase.from("sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      setProfile(prof);

      // Focus Mode default: column may not exist yet → treat undefined as true
      // TODO: add `focus_mode_default BOOLEAN DEFAULT true` column to `profiles` table,
      //       and expose a toggle in /dashboard/profile.
      const pref = prof?.focus_mode_default;
      setFocusDefault(pref === false ? false : true);
      setPreferenceLoaded(true);

      setArtworks(aw || []);
      setTasks(tk || []);
      setEvents(eventsData || []);
      setNotifications(notifs || []);

      if (salesData?.length) {
        const artIds = salesData.map((s: any) => s.artwork_id).filter(Boolean);
        const { data: saleArtworks } = await supabase.from("artworks").select("id,title").in("id", artIds);
        const am: Record<string, string> = {};
        saleArtworks?.forEach((a: any) => { am[a.id] = a.title; });
        setRecentSales(salesData.map((s: any) => ({ ...s, artwork_title: am[s.artwork_id] })));
      }

      const awList = aw || [];
      const completedSales = (salesData || []).filter((s: any) => s.status?.toLowerCase() === "completed");
      const totalRev = completedSales.reduce((sum: number, s: any) => sum + (s.sale_price || 0), 0);

      setStats({
        artworks: awList.length,
        available: awList.filter((a: any) => String(a.status).toLowerCase() === "available").length,
        sold: awList.filter((a: any) => String(a.status).toLowerCase() === "sold").length,
        exhibitions: (ex as any) || 0,
        collabs: (co as any) || 0,
        sales_total: totalRev,
        tasks_pending: (tk || []).length,
        followers: followerCount || 0,
      });

      setLoaded(true);
    });
  }, []);

  /* Session-scoped classic expansion memory */
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("atelier_expanded_classic");
      if (stored === "1") setExpandedClassic(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("atelier_expanded_classic", expandedClassic ? "1" : "0"); } catch {}
  }, [expandedClassic]);

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
    ? profile.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  /* ── Classic-only path (user's preference) ─────────────────── */
  if (preferenceLoaded && !focusDefault) {
    return (
      <>
        <ClassicStyles />
        <ClassicDashboard
          profile={profile} artworks={artworks} stats={stats} tasks={tasks}
          events={events} recentSales={recentSales} notifications={notifications}
          loaded={loaded} notifTab={notifTab} setNotifTab={setNotifTab}
          markRead={markRead} markAllRead={markAllRead}
          deleteNotification={deleteNotification} clearAll={clearAll}
          fname={fname} unreadCount={unreadCount} filteredNotifs={filteredNotifs}
          initials={initials} today={today} greeting={greeting} greetEmoji={greetEmoji}
        />
      </>
    );
  }

  /* Well handling */
  function pickWell(k: WellKey) {
    const well = WELLS.find(w => w.key === k);
    if (!well) return;
    // Direct navigation (Messages)
    if (well.href) {
      router.push(well.href);
      return;
    }
    setPickedWell(k);
  }
  const picked = pickedWell ? WELLS.find(w => w.key === pickedWell) : null;

  /* ══════════════════════════════════════════════════════════════════
     FOCUS MODE RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <FocusStyles />
      <ClassicStyles />

      <div className="focus-root">
        {/* ═══ GREETING + QUESTION + EXPLAINER ═══ */}
        <div className="focus-hero">
          <div className="focus-greet">
            {greeting}, <span className="focus-name">{fname}</span>.
          </div>
          <div className="focus-question">
            What brings you to the studio today?
          </div>
          <div className="focus-explainer">
            Your atelier is resting in <strong>Focus Mode</strong> — one question, five choices, nothing else pulling at you.
            <br />
            <span className="focus-explainer-sub">The full dashboard is folded away below, waiting only if you need it.</span>
          </div>
        </div>

        {/* ═══ PALETTE or SUB-MENU ═══ */}
        {!picked ? (
          <div className="focus-palette-wrap">
            <PaletteSVG
              hoverKey={hoverWell}
              onHover={setHoverWell}
              onLeave={() => setHoverWell(null)}
              onPick={pickWell}
            />
            <div className="focus-palette-hint">
              {hoverWell
                ? <span className="focus-palette-hint-active">&ldquo;{WELLS.find(w => w.key === hoverWell)?.answer}&rdquo;</span>
                : <>Tap a color to begin.</>}
            </div>
          </div>
        ) : (
          <div className="focus-submenu">
            <button className="focus-back" onClick={() => setPickedWell(null)}>
              ← Back to palette
            </button>
            <div className="focus-submenu-title">
              <span className="focus-submenu-emoji">{picked.emoji}</span>
              {picked.label}
            </div>
            <div className="focus-submenu-sub">&ldquo;{picked.answer}&rdquo;</div>

            <div className="focus-chips">
              {picked.subs?.map(sub => (
                <Link key={sub.href} href={sub.href} className="focus-chip"
                  style={{ ["--chip-color" as any]: picked.color }}>
                  <div className="focus-chip-label">{sub.label}</div>
                  <div className="focus-chip-q">&ldquo;{sub.q}&rdquo;</div>
                  <ArrowRight size={14} className="focus-chip-arrow" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXPAND DASHBOARD LINK ═══ */}
        <div className="focus-expand-zone">
          {!expandedClassic ? (
            <>
              <div className="focus-expand-preamble">Been here a while? Skip the calm.</div>
              <button className="focus-expand-link" onClick={() => setExpandedClassic(true)}>
                Or show me everything <ChevronDown size={14} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <button className="focus-expand-link" onClick={() => setExpandedClassic(false)}>
              Fold it back up <ChevronUp size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* ═══ CLASSIC DASHBOARD — INLINE EXPANSION ═══ */}
        {expandedClassic && (
          <div className="focus-classic-wrap">
            <ClassicDashboard
              profile={profile} artworks={artworks} stats={stats} tasks={tasks}
              events={events} recentSales={recentSales} notifications={notifications}
              loaded={loaded} notifTab={notifTab} setNotifTab={setNotifTab}
              markRead={markRead} markAllRead={markAllRead}
              deleteNotification={deleteNotification} clearAll={clearAll}
              fname={fname} unreadCount={unreadCount} filteredNotifs={filteredNotifs}
              initials={initials} today={today} greeting={greeting} greetEmoji={greetEmoji}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES — separated so they can be loaded conditionally
   ══════════════════════════════════════════════════════════════════ */

function FocusStyles() {
  return (
    <style>{`
      /* Focus canvas — near-white, replaces the FFFBEA of the nav shell */
      .focus-root {
        background: #FDFCFA;
        margin: -28px -20px 0; /* bleed to edges of am-content padding */
        padding: 40px 20px 32px;
        min-height: calc(100vh - 60px);
      }

      .focus-hero {
        max-width: 640px;
        margin: 0 auto 28px;
        text-align: center;
        animation: focusIn 0.6s cubic-bezier(0.16,1,0.3,1) both;
      }
      .focus-greet {
        font-size: clamp(26px, 4vw, 38px);
        font-weight: 900;
        color: #111110;
        letter-spacing: -1px;
        line-height: 1.05;
        margin-bottom: 14px;
      }
      .focus-name {
        background: #FFD400;
        padding: 0 8px;
        border-radius: 6px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
      .focus-question {
        font-size: clamp(16px, 2.2vw, 20px);
        font-weight: 600;
        color: #5C5346;
        font-style: italic;
        margin-bottom: 14px;
        line-height: 1.4;
      }
      .focus-explainer {
        font-size: 12.5px;
        font-weight: 500;
        color: #9B8F7A;
        line-height: 1.55;
        max-width: 480px;
        margin: 0 auto;
      }
      .focus-explainer strong {
        color: #111110;
        font-weight: 800;
      }
      .focus-explainer-sub {
        color: #B8AE9C;
        font-size: 11.5px;
      }

      .focus-palette-wrap {
        max-width: 620px;
        margin: 0 auto 28px;
        animation: focusIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both;
      }
      .focus-palette-hint {
        text-align: center;
        margin-top: 18px;
        font-size: 13px;
        font-weight: 600;
        color: #9B8F7A;
        font-style: italic;
        min-height: 22px;
        transition: color 0.2s;
      }
      .focus-palette-hint-active {
        color: #111110;
        font-weight: 700;
      }

      /* Sub-menu */
      .focus-submenu {
        max-width: 720px;
        margin: 0 auto 28px;
        animation: focusIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
      }
      .focus-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: transparent;
        border: 2px solid #E8E0D0;
        border-radius: 9999px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        color: #5C5346;
        cursor: pointer;
        margin-bottom: 20px;
        transition: all 0.15s;
      }
      .focus-back:hover {
        border-color: #111110;
        color: #111110;
        background: #fff;
      }
      .focus-submenu-title {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        font-size: clamp(22px, 3vw, 30px);
        font-weight: 900;
        color: #111110;
        letter-spacing: -0.6px;
        line-height: 1;
      }
      .focus-submenu-emoji {
        font-size: 0.85em;
      }
      .focus-submenu-sub {
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        color: #9B8F7A;
        font-style: italic;
        margin: 8px 0 26px;
      }
      .focus-chips {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      .focus-chip {
        --chip-color: #FFD400;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        background: #fff;
        border: 2px solid #E8E0D0;
        border-radius: 14px;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        position: relative;
      }
      .focus-chip::before {
        content: "";
        position: absolute;
        left: -2px; top: -2px; bottom: -2px;
        width: 5px;
        background: var(--chip-color);
        border-radius: 14px 0 0 14px;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .focus-chip:hover {
        border-color: #111110;
        transform: translate(-1px, -2px);
        box-shadow: 3px 4px 0 #111110;
      }
      .focus-chip:hover::before {
        opacity: 1;
      }
      .focus-chip-label {
        font-size: 14px;
        font-weight: 900;
        color: #111110;
        letter-spacing: -0.2px;
        margin-bottom: 3px;
      }
      .focus-chip-q {
        font-size: 12px;
        font-weight: 500;
        color: #9B8F7A;
        font-style: italic;
        line-height: 1.35;
      }
      .focus-chip-arrow {
        color: #C0B8A8;
        margin-left: auto;
        flex-shrink: 0;
        transition: transform 0.2s, color 0.15s;
      }
      .focus-chip:hover .focus-chip-arrow {
        color: #111110;
        transform: translateX(3px);
      }
      .focus-chip > div:first-of-type {
        flex: 1;
        min-width: 0;
      }

      /* Expand zone */
      .focus-expand-zone {
        max-width: 640px;
        margin: 16px auto 0;
        text-align: center;
        padding-top: 22px;
        border-top: 1px dashed #E8E0D0;
        animation: focusIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both;
      }
      .focus-expand-preamble {
        font-size: 12px;
        font-weight: 500;
        color: #B8AE9C;
        font-style: italic;
        margin-bottom: 10px;
      }
      .focus-expand-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 18px;
        background: transparent;
        border: 2px dashed #D4C9A8;
        border-radius: 9999px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        color: #5C5346;
        cursor: pointer;
        transition: all 0.18s;
      }
      .focus-expand-link:hover {
        border-color: #111110;
        border-style: solid;
        color: #111110;
        background: #FFFBEA;
      }

      /* Classic expansion — add breathing room */
      .focus-classic-wrap {
        margin-top: 40px;
        padding-top: 32px;
        border-top: 2px solid #111110;
        animation: focusIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
      }

      @keyframes focusIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: none; }
      }

      @media (max-width: 640px) {
        .focus-root {
          margin: -28px -20px 0;
          padding: 28px 16px 24px;
        }
        .focus-chips {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}

function ClassicStyles() {
  return (
    <style>{`
      /* ── Base cards ── */
      .ripe-card {
        background: #fff; border: 2.5px solid #111110; border-radius: 20px;
        box-shadow: 4px 5px 0 #D4C9A8; overflow: hidden;
        transition: box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      .ripe-card:hover { box-shadow: 6px 7px 0 #111110; transform: translate(-1px,-2px); }
      .ripe-card-static {
        background: #fff; border: 2.5px solid #111110; border-radius: 20px;
        box-shadow: 4px 5px 0 #D4C9A8; overflow: hidden;
      }

      .stat-card {
        background: #fff; border: 2.5px solid #111110; border-radius: 18px;
        padding: 20px 22px; box-shadow: 3px 4px 0 #D4C9A8;
        position: relative; overflow: hidden;
        transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      .stat-card:hover { box-shadow: 5px 6px 0 #111110; transform: translate(-1px,-1px); }
      .stat-accent {
        position: absolute; bottom: -8px; right: -8px;
        width: 56px; height: 56px; border-radius: 50%;
        opacity: 0.12; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      .stat-card:hover .stat-accent { transform: scale(1.3); }

      .qnav-card {
        display: flex; align-items: center; gap: 14px; padding: 14px 18px;
        background: #fff; border: 2px solid #E8E0D0; border-radius: 16px;
        text-decoration: none; color: #111110;
        transition: all 0.2s cubic-bezier(0.16,1,0.3,1); cursor: pointer;
      }
      .qnav-card:hover { border-color: #111110; box-shadow: 3px 4px 0 #111110; transform: translate(-1px,-1px); background: #FFFBEA; }
      .qnav-icon {
        width: 40px; height: 40px; border-radius: 12px; border: 2px solid #111110;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      .qnav-card:hover .qnav-icon { transform: scale(1.08) rotate(-3deg); }

      .notif-item {
        display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px;
        border-bottom: 1px solid #F5F0E8; transition: background 0.15s;
        cursor: pointer; position: relative;
      }
      .notif-item:hover { background: #FFFBEA; }
      .notif-item:last-child { border-bottom: none; }
      .notif-dot {
        width: 36px; height: 36px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: transform 0.2s;
      }
      .notif-item:hover .notif-dot { transform: scale(1.08); }
      .notif-del {
        position: absolute; top: 14px; right: 14px; opacity: 0;
        transition: opacity 0.15s; background: none; border: none;
        cursor: pointer; color: #C0B8A8; padding: 2px;
      }
      .notif-item:hover .notif-del { opacity: 1; }
      .notif-del:hover { color: #FF6B6B; }

      .aw-mini {
        border-radius: 16px; border: 2px solid #E8E0D0; overflow: hidden;
        background: #fff; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        cursor: pointer; text-decoration: none; display: block; color: inherit;
      }
      .aw-mini:hover { border-color: #111110; box-shadow: 4px 5px 0 #111110; transform: translate(-2px,-2px); }
      .aw-mini:hover img { transform: scale(1.06); }
      .aw-mini img { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }

      .event-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F5F0E8; transition: background 0.15s; }
      .event-row:last-child { border-bottom: none; }
      .task-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F5F0E8; }
      .task-row:last-child { border-bottom: none; }

      .sec-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 2px solid #111110;
        background: #FAF7F3; border-radius: 20px 20px 0 0;
      }

      .notif-tab {
        padding: 6px 14px; border-radius: 9999px; border: 2px solid #E8E0D0;
        background: #fff; font-family: inherit; font-size: 12px; font-weight: 700;
        color: #9B8F7A; cursor: pointer; transition: all 0.15s;
      }
      .notif-tab.active { background: #111110; border-color: #111110; color: #FFD400; }
      .notif-tab:not(.active):hover { border-color: #111110; color: #111110; }

      @keyframes ripeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      .ripe-in { animation: ripeIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }

      @media (max-width: 900px) {
        .dash-main-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; margin-bottom: 20px !important; }
        .dash-header-actions { width: 100%; display: flex !important; flex-wrap: wrap; gap: 8px; }
        .dash-header-actions a, .dash-header-actions button { flex: 1; min-width: 130px; justify-content: center !important; }
        .dash-avatar { width: 44px !important; height: 44px !important; border-radius: 14px !important; font-size: 16px !important; }
        .dash-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; margin-bottom: 18px !important; }
        .stat-card { padding: 14px 16px !important; }
        .stat-card div[style*="font-size: 32"] { font-size: 24px !important; }
        .dash-artworks-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; padding: 10px !important; }
        .dash-quick-nav { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
        .qnav-card { padding: 11px 13px !important; gap: 10px !important; }
        .qnav-icon { width: 34px !important; height: 34px !important; }
        .ripe-card-static, .ripe-card { border-radius: 16px !important; }
        .sec-header { padding: 12px 14px !important; border-radius: 14px 14px 0 0 !important; }
        .notif-item { padding: 10px 14px !important; gap: 9px !important; }
        .notif-dot { width: 30px !important; height: 30px !important; border-radius: 9px !important; }
        .notif-del { top: 10px !important; right: 10px !important; }
        .event-row { padding: 10px 0 !important; gap: 9px !important; }
        .task-row  { padding: 8px 0 !important; gap: 8px !important; }
      }
    `}</style>
  );
}
