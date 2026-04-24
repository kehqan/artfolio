"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, ArrowRight, ImageIcon, DollarSign, Users,
  TrendingUp, FileText, Mail, Bell, Layers,
  CalendarDays, CheckSquare, Edit2, Eye, Share2,
  X, Handshake, MapPin,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   HERO CARDS — 6 action cards shown as default view
   2 large (top) + 4 smaller (bottom)
───────────────────────────────────────────────────────────────── */
const HERO_CARDS_LARGE = [
  {
    key: "inventory",
    q: "Your entire body of work, organised.",
    cta: "Manage my works",
    href: "/dashboard/artworks/new",
    bg: "#111110",
    accent: "#FFD400",
    textLight: true,
    steps: [
      { n: "1", label: "Upload",       sub: "Photo + metadata" },
      { n: "2", label: "Track status", sub: "Concept → Sold" },
      { n: "3", label: "Share",        sub: "Clients & galleries" },
    ],
  },
];

const HERO_COLLABS_CARD = {
  key: "collabs",
  q: "Looking for a collaborator?",
  cta: "Browse collabs",
  href: "/dashboard/pool",
  bg: "#FAF7F3",
  accent: "#CA8A04",
};

const HERO_CARDS_SMALL = [
  { q: "Ready to sell something?",      cta: "Go to my store",  href: "/dashboard/mystore",    accent: "#111110",  icon: "🛍️", desc: "Curate your live storefront." },
  { q: "Planning a show or workshop?",  cta: "Create an event", href: "/dashboard/exhibitions", accent: "#EC4899", icon: "🎪", desc: "Schedule shows & openings." },
  { q: "Collecting references today?",  cta: "Open moodboard",  href: "/dashboard/moodboard",  accent: "#EC4899",  icon: "🗂️", desc: "Visual boards & inspiration." },
  { q: "Want to learn something new?",  cta: "Education hub",   href: "/dashboard/education",  accent: "#0EA5E9",  icon: "📚", desc: "Guides, videos & resources." },
];

/* ─────────────────────────────────────────────────────────────────
   GUIDED ACTIONS — contextual question prompts shown at top
   Each maps to an href so clicking takes the user there directly.
───────────────────────────────────────────────────────────────── */
const GUIDED_ACTIONS = [
  { q: "Got a new piece to document?",    cta: "Add a work",       href: "/dashboard/artworks/new",    color: "#FFD400", icon: "🖼️" },
  { q: "Planning a show or workshop?",    cta: "Create an event",  href: "/dashboard/exhibitions",     color: "#4ECDC4", icon: "🎪" },
  { q: "Looking for a collaborator?",     cta: "Browse collabs",   href: "/dashboard/pool",            color: "#FF6B6B", icon: "🤝" },
  { q: "Ready to sell something?",        cta: "Go to my store",   href: "/dashboard/mystore",         color: "#8B5CF6", icon: "🛍️" },
  { q: "Collecting references today?",    cta: "Open moodboard",   href: "/dashboard/moodboard",       color: "#EC4899", icon: "🗂️" },
];

/* ─────────────────────────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: "Available",   color: "#16A34A", bg: "#DCFCE7" },
  sold:        { label: "Sold",        color: "#9B8F7A", bg: "#F5F0E8" },
  reserved:    { label: "Reserved",    color: "#CA8A04", bg: "#FEF9C3" },
  not_for_sale:{ label: "NFS",         color: "#6B7280", bg: "#F3F4F6" },
  in_progress: { label: "In Progress", color: "#7C3AED", bg: "#EDE9FE" },
  concept:     { label: "Concept",     color: "#9B8F7A", bg: "#F5F0E8" },
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
function dateMonth(d?: string) {
  if (!d) return { day: "—", month: "—" };
  const dt = new Date(d);
  return {
    day: dt.getDate(),
    month: dt.toLocaleString("en-US", { month: "short" }),
  };
}

/* ═══════════════════════════════════════════════════════════════ */
export default function DashboardHome() {
  const router = useRouter();
  const bellRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  /* ── Data ────────────────────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, in_progress: 0, sold: 0, sales_month: 0, sales_total: 0, followers: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  /* ── UI State ────────────────────────────────────────────────── */
  const [bellOpen, setBellOpen] = useState(false);
  const [hoveredArtwork, setHoveredArtwork] = useState<string | null>(null);
  const [listToggle, setListToggle] = useState<"sales" | "clients">("sales");
  const [focusMode, setFocusMode] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusSections, setFocusSections] = useState<Record<string, boolean>>({
    studio: false,
    scene: false,
    lists: false,
    deals: false,
    planning: false,
    inbox: false,
  });
  // Which guided action is "dismissed" for this session
  const [dismissedActions, setDismissedActions] = useState<Set<number>>(new Set());
  // Quick view — hero cards shown by default, full bento hidden below
  const [quickView, setQuickView] = useState(true);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* ── Load ────────────────────────────────────────────────────── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) return;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { data: prof },
        { data: awAll },
        { data: awRecent },
        { data: mb },
        { data: tk },
        { data: evAll },
        { data: evNext },
        { data: salesAll },
        { data: salesMonth },
        { data: msgs },
        { data: notifs },
        { count: followerCount },
        { data: store },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name,username,avatar_url").eq("id", user.id).single(),
        supabase.from("artworks").select("id,status").eq("user_id", user.id),
        supabase.from("artworks").select("id,title,images,status,price,medium").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("moodboards").select("id,title,thumbnail_url,url,provider").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("tasks").select("id,title,priority,status").eq("user_id", user.id).neq("status", "done").order("created_at", { ascending: false }).limit(5),
        supabase.from("events").select("id,title,start_date,venue,event_type").eq("user_id", user.id).order("start_date", { ascending: true }),
        supabase.from("events").select("id,title,start_date,venue").eq("user_id", user.id).gte("start_date", now.toISOString()).order("start_date", { ascending: true }).limit(1),
        supabase.from("sales").select("amount").eq("user_id", user.id),
        supabase.from("sales").select("amount").eq("user_id", user.id).gte("sale_date", monthStart),
        supabase.from("messages").select("id,read_by_b").eq("participant_b", user.id).eq("read_by_b", false).limit(99),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("store_settings").select("is_active").eq("user_id", user.id).single(),
      ]);

      setProfile(prof);
      setArtworks(awRecent || []);
      setMoodboards(mb || []);
      setTasks(tk || []);
      setNextEvent((evNext || [])[0] || null);
      setEvents(evAll || []);
      setNotifications(notifs || []);
      setUnreadMessages((msgs || []).length);
      setStoreUrl(prof?.username ? `/${prof.username}` : null);

      // Extra: recent sales list + recent clients (matching actual DB schema)
      const [{ data: rSales }, { data: rClients }] = await Promise.all([
        supabase
          .from("sales")
          .select("id, buyer_name, amount, sale_date, artwork:artworks(title)")
          .eq("user_id", user.id)
          .order("sale_date", { ascending: false })
          .limit(5),
        supabase
          .from("clients")
          .select("id, full_name, email, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setRecentSales(rSales || []);
      setRecentClients(rClients || []);

      if (awAll) {
        const total = awAll.length;
        const available = awAll.filter((a: any) => a.status === "available").length;
        const in_progress = awAll.filter((a: any) => ["in_progress", "concept"].includes(a.status)).length;
        const sold = awAll.filter((a: any) => a.status === "sold").length;
        const sales_total = (salesAll || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
        const sales_month = (salesMonth || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
        setStats({ total, available, in_progress, sold, sales_total, sales_month, followers: followerCount || 0 });
      }
      setLoaded(true);
    });
  }, []);

  /* ── Bell: close on outside click ──────────────────────────────── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* ── Focus panel: close on outside click ──────────────────────── */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (focusRef.current && !focusRef.current.contains(e.target as Node)) setFocusOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* ── Focus Mode: load from localStorage ────────────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("artomango_focus");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.focusMode === "boolean") setFocusMode(parsed.focusMode);
        if (parsed.focusSections) setFocusSections(parsed.focusSections);
      }
    } catch {}
  }, []);

  /* ── Focus Mode: save to localStorage ──────────────────────────── */
  useEffect(() => {
    try {
      localStorage.setItem("artomango_focus", JSON.stringify({ focusMode, focusSections }));
    } catch {}
  }, [focusMode, focusSections]);

  /* ── Derived ─────────────────────────────────────────────────── */
  const fname = (profile?.full_name || "").split(" ")[0] || "Artist";
  const initials = (profile?.full_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const unreadNotifs = notifications.filter((n: any) => !n.read).length;
  const priorityTasks = tasks.filter((t: any) => t.priority === "high" || t.priority === "urgent");
  const visibleActions = GUIDED_ACTIONS.filter((_, i) => !dismissedActions.has(i));

  const toggleFocusSection = (key: string) => {
    setFocusSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  // A cell is "lit" (visible) if focus mode is OFF, or if focus mode is ON and that section is toggled ON
  const isLit = (key: string) => !focusMode || focusSections[key];

  return (
    <>
      <style>{`
        /* ── Design tokens ── */
        :root {
          --cream: #FAF7F3;
          --warm-bg: #F5F0E8;
          --border: #E8E0D0;
          --border-dark: #111110;
          --text: #111110;
          --muted: #9B8F7A;
          --yellow: #FFD400;
          --radius-card: 20px;
          --shadow-card: 4px 5px 0 #111110;
          --shadow-hover: 6px 7px 0 #111110;
          --font: 'Darker Grotesque', sans-serif;
        }

        /* ── Layout ── */
        .db-wrap { padding: 0 0 60px; }

        /* ── Header ── */
        .db-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; gap: 12px;
        }
        .db-hello { display: flex; align-items: center; gap: 14px; }
        .db-avatar {
          width: 46px; height: 46px; border-radius: 50%;
          background: var(--yellow); border: 2.5px solid var(--border-dark);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 900; color: var(--border-dark);
          overflow: hidden; flex-shrink: 0;
        }
        .db-date { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 0.08em; margin-bottom: 2px; }
        .db-h1 { font-size: 26px; font-weight: 900; color: var(--text); letter-spacing: -0.7px; margin: 0; line-height: 1; }
        .db-header-right { display: flex; align-items: center; gap: 8px; }
        .db-add-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 18px;
          background: var(--yellow); border: 2.5px solid var(--border-dark);
          border-radius: 12px; font-size: 13px; font-weight: 800;
          box-shadow: 3px 3px 0 var(--border-dark);
          cursor: pointer; font-family: inherit; color: var(--border-dark);
          text-decoration: none; transition: transform 0.15s, box-shadow 0.15s;
        }
        .db-add-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--border-dark); }

        .db-icon-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2px solid var(--border); background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; position: relative; transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .db-icon-btn:hover { border-color: var(--border-dark); background: var(--cream); }
        .db-icon-btn.active { background: var(--border-dark); border-color: var(--border-dark); color: var(--yellow); }
        .db-badge {
          position: absolute; top: -2px; right: -2px;
          background: #FF6B6B; color: #fff; font-size: 8px; font-weight: 900;
          min-width: 15px; height: 15px; border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff; font-family: inherit;
        }

        /* ────────────────────────────────────────────────────────
           GUIDED ACTIONS BAR
        ──────────────────────────────────────────────────────── */
        .guided-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .guided-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px 10px 12px;
          background: #fff; border: 2px solid var(--border);
          border-radius: 99px;
          cursor: pointer; text-decoration: none;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
          position: relative; flex-shrink: 0;
        }
        .guided-pill:hover {
          border-color: var(--border-dark);
          box-shadow: 3px 3px 0 var(--border-dark);
          transform: translate(-1px, -1px);
        }
        .guided-pill-emoji {
          font-size: 16px; line-height: 1;
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; background: var(--warm-bg);
          flex-shrink: 0;
        }
        .guided-pill-text { min-width: 0; }
        .guided-pill-q {
          font-size: 12px; font-weight: 700; color: var(--muted);
          line-height: 1.2; white-space: nowrap;
        }
        .guided-pill-cta {
          font-size: 13px; font-weight: 900; color: var(--text);
          white-space: nowrap;
        }
        .guided-pill-arrow {
          font-size: 13px; color: var(--muted); flex-shrink: 0;
          transition: transform 0.15s;
        }
        .guided-pill:hover .guided-pill-arrow { transform: translateX(2px); color: var(--text); }
        .guided-pill-dismiss {
          position: absolute; top: -5px; right: -5px;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--border-dark); border: none; cursor: pointer;
          display: none; align-items: center; justify-content: center;
          color: #fff; font-family: inherit;
        }
        .guided-pill:hover .guided-pill-dismiss { display: flex; }

        /* ────────────────────────────────────────────────────────
           BENTO
        ──────────────────────────────────────────────────────── */
        .bento {
          display: grid;
          grid-template-columns: 1.4fr 0.9fr 0.7fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }

        /* ── Shared cell ── */
        .cell {
          background: #fff;
          border: 2.5px solid var(--border-dark);
          border-radius: var(--radius-card);
          padding: 20px;
          box-shadow: var(--shadow-card);
        }
        .cell-title {
          font-size: 13px; font-weight: 900; color: var(--text);
          text-transform: uppercase; letter-spacing: 0.1em;
          display: flex; align-items: center; gap: 7px;
          margin: 0 0 4px;
        }
        .cell-title::before {
          content: ""; width: 8px; height: 8px; border-radius: 50%;
          background: var(--dot, var(--yellow)); flex-shrink: 0;
        }
        .cell-meta {
          font-size: 11px; font-weight: 600; color: var(--muted);
          margin-bottom: 16px;
        }

        /* ── Stats strip ── */
        .studio-stats {
          display: flex; gap: 0;
          background: #FFFBEA;
          border: 2px solid var(--border-dark);
          border-radius: 14px;
          margin-bottom: 18px;
          overflow: hidden;
        }
        .studio-stat {
          flex: 1; padding: 12px 14px;
          border-right: 1.5px solid var(--border);
          display: flex; flex-direction: column;
        }
        .studio-stat:last-child { border-right: none; }
        .studio-stat-label { font-size: 9.5px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 3px; }
        .studio-stat-value { font-size: 22px; font-weight: 900; color: var(--text); letter-spacing: -0.8px; line-height: 1; }

        /* ── Section subheader ── */
        .section-sub {
          font-size: 10.5px; font-weight: 800; color: #5C5346;
          text-transform: uppercase; letter-spacing: 0.12em;
          display: flex; align-items: center; justify-content: space-between;
          margin: 0 0 10px;
        }
        .view-all {
          font-size: 10.5px; color: var(--muted); font-weight: 700;
          letter-spacing: 0.06em; text-transform: none;
          display: inline-flex; align-items: center; gap: 3px;
          text-decoration: none; transition: color 0.15s;
        }
        .view-all:hover { color: var(--text); }

        /* ────────────────────────────────────────────────────────
           ARTWORK TILES — hover reveals quick actions
        ──────────────────────────────────────────────────────── */
        .works-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .work-tile {
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          background: var(--warm-bg);
          border: 2px solid var(--border);
          position: relative;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          text-decoration: none; display: block;
        }
        .work-tile img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.3s ease;
        }
        .work-tile:hover { border-color: var(--border-dark); box-shadow: 3px 3px 0 var(--border-dark); transform: translate(-1px, -1px); }
        .work-tile:hover img { transform: scale(1.06); }

        /* Hover overlay with quick actions */
        .work-tile-overlay {
          position: absolute; inset: 0;
          background: rgba(17,17,16,0.72);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px;
          opacity: 0; transition: opacity 0.2s;
          backdrop-filter: blur(3px);
          padding: 8px;
        }
        .work-tile:hover .work-tile-overlay { opacity: 1; }
        .work-tile-title-overlay {
          font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.9);
          text-align: center; line-height: 1.2;
          max-width: 100%; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; padding: 0 4px;
        }
        .work-tile-status {
          font-size: 9px; font-weight: 800;
          padding: 2px 8px; border-radius: 99px;
        }
        .work-tile-actions {
          display: flex; gap: 5px; margin-top: 2px;
        }
        .work-tile-action {
          width: 28px; height: 28px; border-radius: 9px;
          background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer; text-decoration: none;
          transition: background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .work-tile-action:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
        .work-tile-action.yellow { background: var(--yellow); border-color: var(--yellow); color: var(--text); }
        .work-tile-action.yellow:hover { background: #ffe033; }

        /* Empty / add tile */
        .work-tile-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%; gap: 6px; color: var(--border);
        }
        .work-tile-add {
          border: 2px dashed var(--border);
          background: transparent;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 4px; text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .work-tile-add:hover { border-color: var(--text); background: var(--warm-bg); transform: none; box-shadow: none; }
        .work-tile-add-plus { font-size: 22px; font-weight: 900; color: var(--muted); line-height: 1; }
        .work-tile-add-lbl { font-size: 9px; font-weight: 700; color: var(--muted); text-align: center; }

        /* ── Studio bottom row ── */
        .studio-bottom {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          border-top: 1.5px dashed var(--border);
          padding-top: 16px; margin-top: 4px;
        }
        .studio-subcell-title { font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
        .front-door-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .front-door-btn {
          font-size: 11.5px; font-weight: 800; padding: 7px 14px;
          background: var(--border-dark); color: var(--yellow);
          border: 2px solid var(--border-dark); border-radius: 9px;
          cursor: pointer; text-decoration: none; font-family: inherit;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .front-door-btn:hover { box-shadow: 2px 2px 0 var(--yellow); transform: translate(-1px, -1px); }
        .front-door-link {
          font-size: 11px; font-weight: 700; color: var(--muted);
          text-decoration: none; display: flex; align-items: center; gap: 3px;
        }
        .front-door-link:hover { color: var(--text); }
        .mini-mb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .mini-mb-card {
          border-radius: 10px; overflow: hidden;
          border: 2px solid var(--border);
          aspect-ratio: 16/9; background: var(--warm-bg);
          position: relative; cursor: pointer; text-decoration: none;
          display: block; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .mini-mb-card:hover { border-color: var(--border-dark); box-shadow: 2px 2px 0 var(--border-dark); }
        .mini-mb-card img { width: 100%; height: 100%; object-fit: cover; }
        .mini-mb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--border); font-size: 18px; }
        .mini-mb-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(17,17,16,0.7));
          padding: 10px 6px 4px;
          font-size: 9px; font-weight: 800; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Scene cell ── */
        .c-scene { grid-column: 2; grid-row: 1; --dot: #4ECDC4; }
        .scene-inner { display: flex; flex-direction: column; gap: 14px; }
        .schedule-block {
          background: var(--border-dark); border-radius: 14px;
          padding: 16px; display: flex; flex-direction: column; gap: 8px;
        }
        .schedule-date-month { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; }
        .schedule-date { font-size: 36px; font-weight: 900; color: var(--yellow); letter-spacing: -2px; line-height: 1; }
        .schedule-next { font-size: 13px; font-weight: 800; color: #fff; line-height: 1.3; }
        .schedule-btn {
          align-self: flex-start; padding: 6px 14px;
          background: var(--yellow); color: var(--text);
          border: 2px solid var(--yellow); border-radius: 9px;
          font-size: 11px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          box-shadow: 2px 2px 0 rgba(255,255,255,0.2);
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .schedule-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 rgba(255,255,255,0.3); }

        /* Collabs mini */
        .collabs-mini { display: flex; flex-direction: column; gap: 8px; }
        .collab-row {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 11px; border-radius: 12px;
          background: var(--cream); border: 1.5px solid var(--border);
          transition: border-color 0.15s, background 0.15s;
          text-decoration: none; cursor: pointer;
        }
        .collab-row:hover { border-color: var(--border-dark); background: var(--warm-bg); }
        .collab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .collab-title { font-size: 12px; font-weight: 800; color: var(--text); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .collab-tag { font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 99px; }

        /* ── Planning cell ── */
        .c-planning { grid-column: 3; grid-row: 1; --dot: #8B5CF6; }
        .task-list { display: flex; flex-direction: column; gap: 6px; }
        .task-row {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 8px 10px; border-radius: 11px;
          border: 1.5px solid var(--border);
          background: var(--cream);
          transition: border-color 0.15s; cursor: pointer;
        }
        .task-row:hover { border-color: var(--border-dark); }
        .task-priority {
          width: 6px; flex-shrink: 0; border-radius: 99px;
          background: var(--muted); margin-top: 3px; height: 10px;
        }
        .task-priority.high { background: #FF6B6B; }
        .task-priority.medium { background: var(--yellow); }
        .task-title { font-size: 12px; font-weight: 700; color: var(--text); line-height: 1.3; flex: 1; }
        .task-empty { font-size: 12px; color: var(--muted); font-weight: 600; text-align: center; padding: 12px 0; }

        /* ── Lists cell (Sales / Clients toggle) ── */
        .c-lists { grid-column: 1; grid-row: 2; --dot: #FFD400; }
        .lists-toggle {
          display: flex; gap: 3px;
          background: var(--warm-bg); border: 2px solid var(--border);
          border-radius: 10px; padding: 3px;
          margin-bottom: 14px;
        }
        .lists-toggle-btn {
          flex: 1; padding: 6px 10px;
          border-radius: 7px; border: none;
          font-size: 12px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          color: var(--muted); background: transparent;
          transition: all 0.15s;
        }
        .lists-toggle-btn.active {
          background: #fff; color: var(--text);
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .list-rows { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .list-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 11px; border-radius: 11px;
          background: var(--cream); border: 1.5px solid var(--border);
          transition: border-color 0.15s;
        }
        .list-row:hover { border-color: var(--border-dark); }
        .list-row-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--yellow); border: 2px solid var(--border-dark);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900; color: var(--text);
          flex-shrink: 0;
        }
        .list-row-body { flex: 1; min-width: 0; }
        .list-row-name { font-size: 12px; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .list-row-sub { font-size: 10px; font-weight: 600; color: var(--muted); margin-top: 1px; }
        .list-row-amount { font-size: 12px; font-weight: 900; color: var(--text); font-family: monospace; flex-shrink: 0; }
        .list-empty { font-size: 12px; color: var(--muted); font-weight: 600; text-align: center; padding: 16px 0; }
        .list-cta {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          width: 100%; padding: 9px 14px; margin-top: 10px;
          background: var(--border-dark); color: var(--yellow);
          border: 2px solid var(--border-dark); border-radius: 11px;
          font-size: 12px; font-weight: 800; cursor: pointer;
          font-family: inherit; text-decoration: none;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .list-cta:hover { box-shadow: 2px 2px 0 var(--yellow); transform: translate(-1px, -1px); }

        /* ── Money cell ── */
        .c-money { grid-column: 2; grid-row: 2; --dot: #16A34A; }
        .money-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .money-tile {
          background: var(--cream); border: 2px solid var(--border);
          border-radius: 14px; padding: 13px 14px;
          cursor: pointer; transition: all 0.2s;
          text-decoration: none; color: inherit; display: block;
        }
        .money-tile:hover { border-color: var(--border-dark); box-shadow: 2px 2px 0 var(--border-dark); transform: translate(-1px, -1px); }
        .money-tile-icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: #fff; border: 2px solid var(--border-dark);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 9px;
        }
        .money-tile.sales .money-tile-icon { background: var(--yellow); }
        .money-tile.collectors .money-tile-icon { background: #4ECDC4; }
        .money-tile.papers .money-tile-icon { background: #FFE4E6; }
        .money-tile.reach .money-tile-icon { background: #EDE9FE; }
        .money-tile-name { font-size: 13px; font-weight: 900; color: var(--text); letter-spacing: -0.2px; margin-bottom: 2px; }
        .money-tile-desc { font-size: 10.5px; color: var(--muted); font-weight: 600; line-height: 1.3; }
        .money-tile-num { font-size: 15px; font-weight: 900; color: var(--text); letter-spacing: -0.4px; font-family: monospace; margin-top: 4px; }

        /* ── Inbox cell ── */
        .c-msgs { grid-column: 3; grid-row: 2; --dot: #FF6B6B; }
        .msgs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .msg-btn {
          position: relative; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          padding: 18px 12px; border-radius: 14px;
          background: var(--cream); border: 2px solid var(--border);
          cursor: pointer; text-decoration: none; color: var(--text);
          transition: all 0.2s; font-family: inherit;
        }
        .msg-btn:hover { border-color: var(--border-dark); box-shadow: 2px 2px 0 var(--border-dark); transform: translate(-1px, -1px); background: #fff; }
        .msg-btn-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: #fff; border: 2px solid var(--border-dark);
          display: flex; align-items: center; justify-content: center;
        }
        .msg-btn-label { font-size: 11.5px; font-weight: 800; color: var(--text); }
        .msg-btn-badge {
          position: absolute; top: 6px; right: 6px;
          background: #FF6B6B; color: #fff; font-size: 9px; font-weight: 900;
          min-width: 18px; height: 18px; border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff; font-family: inherit;
        }

        /* ── Bell dropdown ── */
        .bell-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 2.5px solid var(--border-dark); border-radius: 16px;
          box-shadow: 6px 6px 0 var(--border-dark); width: 300px;
          overflow: hidden; z-index: 200;
          animation: dropDown 0.18s ease;
        }
        @keyframes dropDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .bell-drop-head {
          padding: 12px 16px; border-bottom: 2px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--cream);
        }
        .bell-drop-title { font-size: 13px; font-weight: 900; color: var(--text); }
        .bell-drop-list { max-height: 280px; overflow-y: auto; }
        .bell-notif-item {
          display: flex; gap: 10px; padding: 10px 14px;
          border-bottom: 1px solid var(--warm-bg); cursor: pointer;
          transition: background 0.15s;
        }
        .bell-notif-item:hover { background: #FFFBEA; }
        .bell-notif-title { font-size: 12px; font-weight: 800; color: var(--text); }
        .bell-notif-sub { font-size: 10.5px; color: var(--muted); font-weight: 600; margin-top: 1px; }
        .bell-empty { padding: 32px 20px; text-align: center; color: var(--muted); font-size: 13px; font-weight: 700; }

        /* ────────────────────────────────────────────────────────
           MOODBOARD SECTION (below bento)
        ──────────────────────────────────────────────────────── */
        .mb-section {
          margin-top: 20px;
          background: #fff;
          border: 2.5px solid var(--border-dark);
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .mb-section-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1.5px solid var(--border);
          background: var(--cream);
        }
        .mb-section-title {
          display: flex; align-items: center; gap: 9px;
          font-size: 13px; font-weight: 900; color: var(--text);
          text-transform: uppercase; letter-spacing: 0.1em;
        }
        .mb-section-title-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #EC4899; flex-shrink: 0;
        }
        .mb-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .mb-card {
          position: relative; aspect-ratio: 4/3;
          background: var(--warm-bg);
          border-right: 1.5px solid var(--border);
          overflow: hidden; cursor: pointer; text-decoration: none;
          display: block;
          transition: background 0.2s;
        }
        .mb-card:last-child { border-right: none; }
        .mb-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .mb-card:hover img { transform: scale(1.04); }
        .mb-card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(transparent 40%, rgba(17,17,16,0.75));
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 12px; opacity: 0; transition: opacity 0.2s;
        }
        .mb-card:hover .mb-card-overlay { opacity: 1; }
        .mb-card-title { font-size: 11px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mb-card-provider { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.6); margin-top: 1px; }
        .mb-card-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 100%; gap: 8px;
          color: var(--border);
          font-size: 11px; font-weight: 700; color: var(--muted);
        }
        .mb-add-card {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          text-decoration: none; color: var(--muted);
          background: var(--cream); transition: background 0.15s;
          cursor: pointer;
          border-right: none;
        }
        .mb-add-card:hover { background: var(--warm-bg); color: var(--text); }
        .mb-add-plus { font-size: 24px; font-weight: 900; line-height: 1; }
        .mb-add-lbl { font-size: 10px; font-weight: 700; text-align: center; }

        /* ────────────────────────────────────────────────────────
           FOCUS MODE
        ──────────────────────────────────────────────────────── */
        .focus-wrap { position: relative; }

        /* The toggle pill */
        .focus-toggle {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 12px;
          border-radius: 99px;
          border: 2px solid var(--border);
          background: #fff;
          cursor: pointer; font-family: inherit;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          white-space: nowrap;
        }
        .focus-toggle:hover { border-color: var(--border-dark); }
        .focus-toggle.focus-on {
          background: var(--border-dark); border-color: var(--border-dark);
          box-shadow: 3px 3px 0 var(--yellow);
        }
        .focus-toggle-label {
          font-size: 12px; font-weight: 800;
          color: var(--muted);
          transition: color 0.15s;
        }
        .focus-toggle.focus-on .focus-toggle-label { color: var(--yellow); }

        /* The switch track */
        .focus-switch {
          width: 28px; height: 16px; border-radius: 99px;
          background: var(--border); position: relative;
          transition: background 0.2s; flex-shrink: 0;
        }
        .focus-toggle.focus-on .focus-switch { background: var(--yellow); }
        .focus-switch-knob {
          position: absolute; top: 2px; left: 2px;
          width: 12px; height: 12px; border-radius: 50%;
          background: #fff; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .focus-toggle.focus-on .focus-switch-knob { transform: translateX(12px); }

        /* Floating panel */
        .focus-panel {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #fff; border: 2.5px solid var(--border-dark);
          border-radius: 18px; box-shadow: 6px 6px 0 var(--border-dark);
          width: 240px; overflow: hidden; z-index: 300;
          animation: dropDown 0.18s ease;
        }
        .focus-panel-head {
          padding: 12px 16px;
          border-bottom: 1.5px solid var(--border);
          background: var(--border-dark);
        }
        .focus-panel-title {
          font-size: 11px; font-weight: 900; color: var(--yellow);
          text-transform: uppercase; letter-spacing: 0.12em;
        }
        .focus-panel-sub {
          font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4);
          margin-top: 2px;
        }
        .focus-panel-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .focus-section-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; border-radius: 11px;
          cursor: pointer; transition: background 0.15s;
          border: 1.5px solid transparent;
          font-family: inherit; background: transparent; width: 100%; text-align: left;
        }
        .focus-section-row:hover { background: var(--warm-bg); }
        .focus-section-row.lit { background: #FFFBEA; border-color: var(--yellow); }
        .focus-section-icon { font-size: 14px; flex-shrink: 0; }
        .focus-section-label { font-size: 12px; font-weight: 800; color: var(--text); flex: 1; padding: 0 10px; }
        .focus-mini-switch {
          width: 24px; height: 14px; border-radius: 99px;
          background: var(--border); position: relative;
          transition: background 0.2s; flex-shrink: 0;
        }
        .focus-section-row.lit .focus-mini-switch { background: #FFD400; }
        .focus-mini-knob {
          position: absolute; top: 2px; left: 2px;
          width: 10px; height: 10px; border-radius: 50%;
          background: #fff; transition: transform 0.2s;
        }
        .focus-section-row.lit .focus-mini-knob { transform: translateX(10px); }

        /* Cell dim overlay — applied to cells that are "off" in focus mode */
        .cell-dim-overlay {
          position: absolute; inset: 0;
          background: #1a1a18;
          border-radius: calc(var(--radius-card) - 2px);
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.35s ease;
        }
        .cell { position: relative; overflow: hidden; }

        /* ────────────────────────────────────────────────────────
           QUICK / HERO VIEW
        ──────────────────────────────────────────────────────── */
        .hero-view {
          margin: 0 -32px;
          padding: 0;
          display: flex; flex-direction: column;
        }

        /* Row 1 — full width inventory card */
        .hero-top {
          display: block;
          border-bottom: 2.5px solid var(--border-dark);
        }

        /* Row 2 — full width collabs card (shorter) */
        .hero-collabs {
          display: block;
          border-bottom: 2.5px solid var(--border-dark);
        }

        /* Row 3 — 4 small cards */
        .hero-bottom {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border-bottom: 2.5px solid var(--border-dark);
        }

        /* ── Inventory card (full width row 1) ── */
        .hero-card-large {
          display: flex; flex-direction: row;
          min-height: 340px;
          position: relative; overflow: hidden;
          text-decoration: none;
          transition: filter 0.2s;
          border-right: none;
        }
        .hero-card-large:hover { filter: brightness(0.97); }

        /* ── Collabs card (full width row 2, shorter) ── */
        .hero-card-collabs {
          display: flex; flex-direction: row;
          min-height: 200px;
          position: relative; overflow: hidden;
          text-decoration: none;
          transition: filter 0.2s;
        }
        .hero-card-collabs:hover { filter: brightness(0.97); }

        .hc-large-top { display: flex; flex-direction: column; gap: 0; }
        .hc-icon-lg { font-size: 44px; line-height: 1; margin-bottom: 18px; display: block; }
        .hc-q-lg {
          font-size: 13px; font-weight: 800; letter-spacing: 0.04em;
          margin-bottom: 6px;
          /* colour set inline per card */
        }
        .hc-cta-lg {
          font-size: 36px; font-weight: 900; letter-spacing: -1.4px; line-height: 1.0;
          margin-bottom: 8px;
          /* colour set inline per card */
        }
        .hc-desc-lg {
          font-size: 14px; font-weight: 700; line-height: 1.55;
          /* colour set inline per card — never gray-on-dark */
        }

        /* Journey steps */
        .hc-steps {
          display: flex; align-items: flex-start; gap: 0;
          margin-top: 32px;
          border-radius: 14px; overflow: hidden;
        }
        .hc-step {
          display: flex; flex-direction: column; align-items: flex-start;
          gap: 6px; flex: 1; padding: 14px 16px;
          position: relative;
          border-right: 1.5px solid rgba(255,255,255,0.1);
        }
        /* cream card steps get a dark border */
        .hc-step.cream-border { border-right-color: rgba(0,0,0,0.1); }
        .hc-step:last-child { border-right: none; }
        .hc-step-num {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 900;
          /* bg + color set inline */
        }
        .hc-step-label {
          font-size: 13px; font-weight: 900; line-height: 1.2;
          /* colour set inline */
        }
        .hc-step-sub {
          font-size: 11px; font-weight: 700; line-height: 1.3;
          /* colour set inline — no opacity hacks */
        }

        /* CTA button */
        .hc-large-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 12px;
          font-size: 15px; font-weight: 900; border: 2.5px solid;
          cursor: pointer; font-family: inherit; text-decoration: none;
          margin-top: 28px; align-self: flex-start;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .hc-large-btn:hover { transform: translate(-2px, -2px); }

        /* ── Small card ── */
        .hero-card-small {
          padding: 24px 26px 22px;
          display: flex; flex-direction: column;
          text-decoration: none; position: relative;
          border-right: 2.5px solid var(--border-dark);
          background: #fff;
          transition: background 0.2s;
          min-height: 170px;
        }
        .hero-card-small:last-child { border-right: none; }
        .hero-card-small:hover { background: #FFFBEA; }

        .hc-small-stripe {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
        }
        .hc-icon-sm { font-size: 26px; margin-bottom: 12px; display: block; }
        .hc-q-sm {
          font-size: 11px; font-weight: 800; color: #6B6052;
          letter-spacing: 0.06em; margin-bottom: 4px; text-transform: uppercase;
        }
        .hc-cta-sm {
          font-size: 19px; font-weight: 900; letter-spacing: -0.5px;
          line-height: 1.15; margin-bottom: 6px;
          /* colour set inline */
        }
        .hc-desc-sm {
          font-size: 12px; font-weight: 700; color: #5C5346;
          line-height: 1.55; flex: 1;
        }
        .hc-arrow-sm {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 900; margin-top: 14px;
          transition: transform 0.15s;
        }
        .hero-card-small:hover .hc-arrow-sm { transform: translateX(4px); }

        /* ── Inline pill bar ── */
        .hero-pill-bar {
          display: flex; align-items: center; justify-content: center;
          padding: 20px 32px; gap: 16px;
          background: #fff;
          border-top: 2.5px solid var(--border-dark);
        }
        .hero-pill-hint {
          font-size: 13px; font-weight: 800; color: #5C5346;
          display: flex; align-items: center; gap: 8px;
        }
        .hero-pill-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--yellow); border: 2px solid var(--border-dark);
          flex-shrink: 0;
        }
        .hero-pill-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; border-radius: 99px;
          background: var(--border-dark); color: var(--yellow);
          border: 2.5px solid var(--border-dark);
          font-size: 14px; font-weight: 900; cursor: pointer;
          font-family: inherit;
          box-shadow: 3px 3px 0 var(--yellow);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .hero-pill-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--yellow); }

        /* back-to-top pill shown in full dashboard view */
        .back-to-hero-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 99px;
          background: var(--border-dark); color: var(--yellow);
          border: 2px solid var(--border-dark);
          font-size: 12px; font-weight: 800; cursor: pointer;
          font-family: inherit; margin-bottom: 20px;
          box-shadow: 2px 2px 0 var(--yellow);
          transition: transform 0.15s, box-shadow 0.15s;
          width: fit-content;
        }
        .back-to-hero-pill:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--yellow); }

        /* ── Journey SVG animations ── */
        @keyframes artFloat1 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(-1deg); }
        }
        @keyframes artFloat2 {
          0%, 100% { transform: translateY(0px) rotate(1.5deg); }
          50% { transform: translateY(-9px) rotate(1.5deg); }
        }
        @keyframes artFloat3 {
          0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
          50% { transform: translateY(-6px) rotate(-0.5deg); }
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; r: 3; }
          50% { opacity: 0.4; r: 5; }
        }
        @keyframes badgePop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .art-float-1 { animation: artFloat1 4s ease-in-out infinite; }
        .art-float-2 { animation: artFloat2 5s ease-in-out infinite 0.6s; }
        .art-float-3 { animation: artFloat3 4.5s ease-in-out infinite 1.2s; }
        .flow-dash { stroke-dasharray: 8 5; animation: flowDash 2s linear infinite; }
        .badge-pop { animation: badgePop 0.5s ease-out both; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .bento { grid-template-columns: 1fr 1fr; }
          .c-studio { grid-column: 1 / 3; grid-row: 1; }
          .c-scene   { grid-column: 1; grid-row: 2; }
          .c-planning{ grid-column: 2; grid-row: 2; }
          .c-lists   { grid-column: 1; grid-row: 3; }
          .c-money   { grid-column: 2; grid-row: 3; }
          .c-msgs    { grid-column: 1 / 3; grid-row: 4; }
          .works-grid { grid-template-columns: repeat(5, 1fr); }
          .mb-grid { grid-template-columns: repeat(2, 1fr); }
          .mb-card:nth-child(2) { border-right: none; }
          .mb-card:nth-child(3) { border-right: 1.5px solid var(--border); }
          .hero-bottom { grid-template-columns: repeat(2, 1fr); }
          .hero-bottom .hero-card-small:nth-child(2) { border-right: none; }
          .hero-bottom .hero-card-small:nth-child(3) { border-right: 2.5px solid var(--border-dark); border-top: 2.5px solid var(--border-dark); }
          .hero-bottom .hero-card-small:nth-child(4) { border-right: none; border-top: 2.5px solid var(--border-dark); }
        }
        @media (max-width: 700px) {
          .bento { grid-template-columns: 1fr; }
          .c-studio,.c-scene,.c-planning,.c-lists,.c-money,.c-msgs { grid-column: 1; grid-row: auto; }
          .works-grid { grid-template-columns: repeat(3, 1fr); }
          .studio-bottom { grid-template-columns: 1fr; }
          .guided-bar { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; }
          .mb-grid { grid-template-columns: 1fr 1fr; }
          .db-h1 { font-size: 20px; }
          .hero-top { grid-template-columns: 1fr; }
          .hero-card-large { min-height: 240px; padding: 28px 24px; border-right: none; border-bottom: 2.5px solid var(--border-dark); }
          .hc-cta-lg { font-size: 26px; }
          .hc-steps { flex-direction: column; align-items: flex-start; gap: 10px; }
          .hc-step-arrow { display: none; }
          .hero-bottom { grid-template-columns: 1fr 1fr; }
          .hero-view { margin: 0 -20px; }
        }
      `}</style>

      <div className="db-wrap">

        {/* ════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════ */}
        <div className="db-header">
          <div className="db-hello">
            <div className="db-avatar">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <div className="db-date">
                {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h1 className="db-h1">{greeting}, {fname}</h1>
            </div>
          </div>

          <div className="db-header-right">
            {/* Bell */}
            <div ref={bellRef} style={{ position: "relative" }}>
              <button className={`db-icon-btn${bellOpen ? " active" : ""}`} onClick={() => setBellOpen(o => !o)}>
                <Bell size={16} />
                {unreadNotifs > 0 && <div className="db-badge">{unreadNotifs}</div>}
              </button>
              {bellOpen && (
                <div className="bell-dropdown">
                  <div className="bell-drop-head">
                    <div className="bell-drop-title">Notifications</div>
                    <button onClick={() => setBellOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={14} /></button>
                  </div>
                  <div className="bell-drop-list">
                    {notifications.length === 0 ? (
                      <div className="bell-empty">All clear ✓</div>
                    ) : notifications.slice(0, 8).map((n: any) => (
                      <div key={n.id} className="bell-notif-item">
                        <div>
                          <div className="bell-notif-title">{n.title}</div>
                          {n.body && <div className="bell-notif-sub">{n.body}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <Link href="/dashboard/messages" className="db-icon-btn" style={{ textDecoration: "none", color: "inherit" }}>
              <Mail size={16} />
              {unreadMessages > 0 && <div className="db-badge">{unreadMessages}</div>}
            </Link>

            {/* Focus Mode toggle */}
            <div ref={focusRef} className="focus-wrap">
              <button
                className={`focus-toggle${focusMode ? " focus-on" : ""}`}
                onClick={() => {
                  if (!focusMode) {
                    setFocusMode(true);
                    setFocusOpen(true);
                  } else {
                    setFocusMode(false);
                    setFocusOpen(false);
                  }
                }}
              >
                <span className="focus-toggle-label">Focus</span>
                <div className="focus-switch"><div className="focus-switch-knob" /></div>
              </button>

              {/* Floating panel — shown when focus is ON */}
              {focusMode && focusOpen && (
                <div className="focus-panel">
                  <div className="focus-panel-head">
                    <div className="focus-panel-title">Focus Mode</div>
                    <div className="focus-panel-sub">Turn on what you need</div>
                  </div>
                  <div className="focus-panel-list">
                    {[
                      { key: "studio",   icon: "🎨", label: "My Studio"          },
                      { key: "scene",    icon: "🗺️", label: "The Scene"          },
                      { key: "lists",    icon: "💰", label: "Recent Activity"    },
                      { key: "deals",    icon: "📊", label: "Deals & Money"      },
                      { key: "planning", icon: "✅", label: "Planning"           },
                      { key: "inbox",    icon: "📬", label: "Messages & Alerts"  },
                    ].map(s => (
                      <button
                        key={s.key}
                        className={`focus-section-row${focusSections[s.key] ? " lit" : ""}`}
                        onClick={() => toggleFocusSection(s.key)}
                      >
                        <span className="focus-section-icon">{s.icon}</span>
                        <span className="focus-section-label">{s.label}</span>
                        <div className="focus-mini-switch"><div className="focus-mini-knob" /></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            QUICK VIEW — Hero layout (default)
        ════════════════════════════════════════════ */}
        {quickView && (
          <div className="hero-view">

            {/* ── ROW 1: Inventory — full width ── */}
            <div className="hero-top">
              {HERO_CARDS_LARGE.map((card, i) => {
                const isDark = card.bg === "#111110";
                const qColor         = "#FFD400";
                const stepBg         = "rgba(255,212,0,0.1)";
                const stepNumBg      = "#FFD400";
                const stepNumColor   = "#111110";
                const stepLabelColor = "#fff";
                const stepSubColor   = "rgba(255,255,255,0.6)";
                const stepDivider    = "rgba(255,255,255,0.1)";
                const btnBg          = "#FFD400";
                const btnColor       = "#111110";
                const btnShadow      = "3px 3px 0 rgba(255,255,255,0.15)";

                return (
                  <Link key={i} href={card.href} className="hero-card-large" style={{ background: card.bg }}>
                    {/* LEFT: text + steps + CTA — narrower since SVG is the star */}
                    <div style={{
                      flex: "0 0 32%", padding: "36px 32px 32px",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      borderRight: "1.5px solid rgba(255,255,255,0.08)",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: qColor, marginBottom: 8, letterSpacing: "0.04em" }}>{card.q}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: card.accent, letterSpacing: "-1.2px", lineHeight: 1.05, marginBottom: 8 }}>{card.cta}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0, background: stepBg, borderRadius: 14, overflow: "hidden", margin: "20px 0" }}>
                        {card.steps.map((step, si) => (
                          <div key={si} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "11px 16px",
                            borderBottom: si < card.steps.length - 1 ? `1px solid ${stepDivider}` : "none",
                          }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: stepNumBg, color: stepNumColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{step.n}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 900, color: stepLabelColor, lineHeight: 1.2 }}>{step.label}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: stepSubColor, marginTop: 1 }}>{step.sub}</div>
                            </div>
                            {si < card.steps.length - 1 && <div style={{ fontSize: 14, color: card.accent, fontWeight: 900 }}>→</div>}
                          </div>
                        ))}
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 24px", borderRadius: 12,
                        fontSize: 14, fontWeight: 900,
                        background: btnBg, color: btnColor,
                        border: `2.5px solid ${btnBg}`,
                        boxShadow: btnShadow, alignSelf: "flex-start",
                      }}>
                        {card.cta} →
                      </span>
                    </div>

                    {/* RIGHT: full journey SVG — wider, more room */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 32px", overflow: "hidden" }}>
                      <svg viewBox="0 0 680 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 680, height: "auto" }}>

                        {/* ── SECTION LABELS ── */}
                        <text x="80" y="16" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#FFD400" fontWeight="900" textAnchor="middle" letterSpacing="3">STUDIO</text>
                        <text x="340" y="16" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#FFD400" fontWeight="900" textAnchor="middle" letterSpacing="3">ARTOMANGO</text>
                        <text x="590" y="16" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#FFD400" fontWeight="900" textAnchor="middle" letterSpacing="3">THE WORLD</text>
                        <line x1="186" y1="22" x2="186" y2="268" stroke="rgba(255,212,0,0.12)" strokeWidth="1" strokeDasharray="4 4"/>
                        <line x1="494" y1="22" x2="494" y2="268" stroke="rgba(255,212,0,0.12)" strokeWidth="1" strokeDasharray="4 4"/>

                        {/* ── LEFT: 3 floating artworks ── */}
                        <g className="art-float-1">
                          <rect x="16" y="30" width="90" height="68" rx="6" fill="#1C1C1A" stroke="#FFD400" strokeWidth="1.5"/>
                          <rect x="23" y="37" width="76" height="44" rx="4" fill="url(#g1)"/>
                          <rect x="23" y="86" width="44" height="5" rx="2.5" fill="#FFD400" opacity="0.9"/>
                          <rect x="70" y="84" width="28" height="10" rx="5" fill="#16A34A"/>
                          <text x="84" y="91" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="900" textAnchor="middle">Available</text>
                        </g>
                        <g className="art-float-2">
                          <rect x="10" y="116" width="84" height="64" rx="6" fill="#1C1C1A" stroke="#FFD400" strokeWidth="1.5"/>
                          <rect x="17" y="123" width="70" height="40" rx="4" fill="url(#g2)"/>
                          <rect x="17" y="168" width="38" height="5" rx="2.5" fill="#FFD400" opacity="0.8"/>
                          <rect x="58" y="166" width="30" height="10" rx="5" fill="#7C3AED"/>
                          <text x="73" y="173" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="900" textAnchor="middle">In Prog.</text>
                        </g>
                        <g className="art-float-3">
                          <rect x="88" y="196" width="88" height="62" rx="6" fill="#1C1C1A" stroke="#FFD400" strokeWidth="1.5"/>
                          <rect x="95" y="203" width="74" height="38" rx="4" fill="url(#g3)"/>
                          <rect x="95" y="246" width="42" height="5" rx="2.5" fill="#FFD400" opacity="0.8"/>
                          <rect x="140" y="244" width="30" height="10" rx="5" fill="#CA8A04"/>
                          <text x="155" y="251" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="900" textAnchor="middle">Reserved</text>
                        </g>

                        {/* ── FLOW LINES: Studio → Artomango ── */}
                        <defs>
                          <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#FFD400" opacity="0.8"/>
                          </marker>
                        </defs>
                        <path d="M 116 65 Q 170 65 200 100" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)"/>
                        <path d="M 102 148 Q 170 148 200 148" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)" style={{animationDelay:"0.4s"}}/>
                        <path d="M 120 227 Q 170 227 200 190" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)" style={{animationDelay:"0.8s"}}/>

                        {/* ── CENTRE: Artomango platform UI ── */}
                        <rect x="194" y="28" width="208" height="222" rx="12" fill="#1C1C1A" stroke="#FFD400" strokeWidth="2"/>
                        <rect x="194" y="28" width="208" height="32" rx="12" fill="#111110"/>
                        <rect x="194" y="48" width="208" height="12" fill="#111110"/>
                        <circle cx="211" cy="44" r="5" fill="#FFD400"/>
                        <circle cx="225" cy="44" r="5" fill="rgba(255,212,0,0.35)"/>
                        <circle cx="239" cy="44" r="5" fill="rgba(255,212,0,0.15)"/>
                        <text x="298" y="48" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#FFD400" fontWeight="800" textAnchor="middle">artomango.com</text>

                        <text x="210" y="78" fontFamily="Darker Grotesque, sans-serif" fontSize="10" fill="#FFD400" fontWeight="900">MY INVENTORY</text>

                        {/* row 1 */}
                        <rect x="208" y="88" width="38" height="28" rx="4" fill="url(#g1)"/>
                        <rect x="252" y="90" width="96" height="6" rx="3" fill="rgba(255,255,255,0.75)"/>
                        <rect x="252" y="102" width="52" height="8" rx="4" fill="#16A34A"/>
                        <text x="278" y="109" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="800" textAnchor="middle">Available · €1,200</text>
                        <rect x="252" y="114" width="38" height="3" rx="1.5" fill="rgba(255,255,255,0.18)"/>
                        <line x1="208" y1="122" x2="390" y2="122" stroke="rgba(255,212,0,0.1)" strokeWidth="1"/>

                        {/* row 2 */}
                        <rect x="208" y="128" width="38" height="28" rx="4" fill="url(#g2)"/>
                        <rect x="252" y="130" width="84" height="6" rx="3" fill="rgba(255,255,255,0.75)"/>
                        <rect x="252" y="142" width="58" height="8" rx="4" fill="#7C3AED"/>
                        <text x="281" y="149" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="800" textAnchor="middle">In Progress · NFS</text>
                        <rect x="252" y="154" width="46" height="3" rx="1.5" fill="rgba(255,255,255,0.18)"/>
                        <line x1="208" y1="162" x2="390" y2="162" stroke="rgba(255,212,0,0.1)" strokeWidth="1"/>

                        {/* row 3 */}
                        <rect x="208" y="168" width="38" height="28" rx="4" fill="url(#g3)"/>
                        <rect x="252" y="170" width="78" height="6" rx="3" fill="rgba(255,255,255,0.75)"/>
                        <rect x="252" y="182" width="46" height="8" rx="4" fill="#CA8A04"/>
                        <text x="275" y="189" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="white" fontWeight="800" textAnchor="middle">Reserved · €800</text>
                        <rect x="252" y="194" width="34" height="3" rx="1.5" fill="rgba(255,255,255,0.18)"/>

                        {/* stats strip */}
                        <line x1="208" y1="206" x2="390" y2="206" stroke="rgba(255,212,0,0.15)" strokeWidth="1"/>
                        <rect x="208" y="212" width="76" height="24" rx="5" fill="rgba(255,212,0,0.1)" stroke="rgba(255,212,0,0.2)" strokeWidth="1"/>
                        <text x="246" y="228" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#FFD400" fontWeight="800" textAnchor="middle">3 artworks</text>
                        <rect x="292" y="212" width="76" height="24" rx="5" fill="rgba(255,212,0,0.1)" stroke="rgba(255,212,0,0.2)" strokeWidth="1"/>
                        <text x="330" y="228" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#FFD400" fontWeight="800" textAnchor="middle">€2,000 total</text>

                        {/* ── FLOW LINES: Artomango → World ── */}
                        <path d="M 402 100 Q 460 90 504 120" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)" style={{animationDelay:"0.3s"}}/>
                        <path d="M 402 160 Q 460 160 504 175" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)" style={{animationDelay:"0.7s"}}/>
                        <path d="M 402 220 Q 460 220 504 225" stroke="#FFD400" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.7" markerEnd="url(#arr)" style={{animationDelay:"1.1s"}}/>

                        {/* ── RIGHT: 3 destination cards ── */}
                        {/* Gallery */}
                        <rect x="500" y="28" width="162" height="68" rx="8" fill="#1C1C1A" stroke="#FFD400" strokeWidth="1.5"/>
                        <text x="521" y="52" fontFamily="Darker Grotesque, sans-serif" fontSize="22" textAnchor="middle">🏛️</text>
                        <text x="521" y="68" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#FFD400" fontWeight="800" textAnchor="middle">Gallery</text>
                        <rect x="540" y="36" width="116" height="52" rx="6" fill="#1A1A18"/>
                        <text x="598" y="56" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#fff" fontWeight="800" textAnchor="middle">Exhibition Booked</text>
                        <rect x="548" y="64" width="100" height="14" rx="7" fill="#16A34A"/>
                        <text x="598" y="74" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="white" fontWeight="900" textAnchor="middle">Artwork exhibited ✓</text>

                        {/* Collaboration */}
                        <rect x="500" y="108" width="162" height="68" rx="8" fill="#1C1C1A" stroke="#FFD400" strokeWidth="1.5"/>
                        <text x="521" y="132" fontFamily="Darker Grotesque, sans-serif" fontSize="22" textAnchor="middle">🤝</text>
                        <text x="521" y="148" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#FFD400" fontWeight="800" textAnchor="middle">Collab</text>
                        <rect x="540" y="116" width="116" height="52" rx="6" fill="#1A1A18"/>
                        <text x="598" y="136" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#fff" fontWeight="800" textAnchor="middle">New Project</text>
                        <rect x="548" y="144" width="100" height="14" rx="7" fill="#7C3AED"/>
                        <text x="598" y="154" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="white" fontWeight="900" textAnchor="middle">Collab confirmed ✓</text>

                        {/* Sold */}
                        <rect x="500" y="188" width="162" height="68" rx="8" fill="#FFD400" stroke="#111110" strokeWidth="2"/>
                        <text x="521" y="212" fontFamily="Darker Grotesque, sans-serif" fontSize="22" textAnchor="middle">💰</text>
                        <text x="521" y="228" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#111110" fontWeight="900" textAnchor="middle">Sold</text>
                        <rect x="540" y="196" width="116" height="52" rx="6" fill="rgba(0,0,0,0.08)"/>
                        <text x="598" y="218" fontFamily="Darker Grotesque, sans-serif" fontSize="11" fill="#111110" fontWeight="900" textAnchor="middle">€1,200 earned</text>
                        <text x="598" y="232" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="rgba(0,0,0,0.6)" textAnchor="middle">via Artomango</text>
                        <rect x="548" y="238" width="100" height="8" rx="4" fill="rgba(0,0,0,0.12)"/>
                        <text x="598" y="245" fontFamily="Darker Grotesque, sans-serif" fontSize="6" fill="rgba(0,0,0,0.5)" textAnchor="middle">Collector notified</text>

                        {/* Sparkles */}
                        <path className="sparkle" d="M 186 22 L 188 27 L 193 29 L 188 31 L 186 36 L 184 31 L 179 29 L 184 27 Z" fill="#FFD400" style={{animationDelay:"0s"}}/>
                        <path className="sparkle" d="M 494 22 L 496 27 L 501 29 L 496 31 L 494 36 L 492 31 L 487 29 L 492 27 Z" fill="#FFD400" style={{animationDelay:"0.9s"}}/>

                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.9"/><stop offset="100%" stopColor="#FF9F43" stopOpacity="0.9"/></linearGradient>
                          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.9"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9"/></linearGradient>
                          <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9"/><stop offset="100%" stopColor="#EC4899" stopOpacity="0.9"/></linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ── ROW 2: Browse Collabs — full width, shorter ── */}
            <div className="hero-collabs">
              <Link href={HERO_COLLABS_CARD.href} className="hero-card-collabs" style={{ background: HERO_COLLABS_CARD.bg }}>

                {/* LEFT: text */}
                <div style={{
                  flex: "0 0 30%", padding: "28px 32px",
                  display: "flex", flexDirection: "column", justifyContent: "center", gap: 10,
                  borderRight: "1.5px solid rgba(0,0,0,0.08)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#6B5E3E", letterSpacing: "0.06em", textTransform: "uppercase" }}>Looking for a collaborator?</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: HERO_COLLABS_CARD.accent, letterSpacing: "-0.8px", lineHeight: 1.1 }}>Browse collabs</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3D3325", lineHeight: 1.5 }}>Live requests from galleries, curators & venues. Filter by style, budget, and location.</div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 10,
                    fontSize: 13, fontWeight: 900,
                    background: "#111110", color: "#FFD400",
                    border: "2.5px solid #111110",
                    boxShadow: "3px 3px 0 rgba(202,138,4,0.4)",
                    alignSelf: "flex-start", marginTop: 4,
                  }}>
                    Browse the pool →
                  </span>
                </div>

                {/* RIGHT: collabs feed SVG */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 32px 16px 20px", overflow: "hidden" }}>
                  <svg viewBox="0 0 560 168" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 560, height: "auto" }}>

                    {/* Card 1 — Gallery */}
                    <rect x="0" y="4" width="268" height="76" rx="10" fill="#1C1C1A" stroke="#CA8A04" strokeWidth="1.5"/>
                    <rect x="0" y="4" width="268" height="30" rx="10" fill="#111110"/>
                    <rect x="0" y="24" width="268" height="10" fill="#111110"/>
                    {/* avatar */}
                    <circle cx="18" cy="19" r="9" fill="#CA8A04" opacity="0.8"/>
                    <text x="18" y="23" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="#111110" textAnchor="middle" fontWeight="900">G</text>
                    {/* info */}
                    <text x="34" y="16" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#CA8A04" fontWeight="800">Moderne Gallery</text>
                    <text x="34" y="26" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.4)">Contemporary Art · Prague</text>
                    {/* badge */}
                    <rect x="212" y="10" width="46" height="16" rx="8" fill="#CA8A04"/>
                    <text x="235" y="21" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="#111110" textAnchor="middle" fontWeight="900">URGENT</text>
                    {/* content */}
                    <text x="14" y="52" fontFamily="Darker Grotesque, sans-serif" fontSize="10" fill="#ffffff" fontWeight="800">Seeking Abstract Expressionist</text>
                    <text x="14" y="65" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Spring Exhibition · Budget: €2,500–€5,000</text>
                    <text x="14" y="76" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.3)">2 days ago · 24 artists viewed</text>
                    {/* action */}
                    <circle cx="250" cy="54" r="12" fill="#CA8A04" opacity="0.2"/>
                    <circle cx="250" cy="54" r="9" fill="#CA8A04"/>
                    <text x="250" y="58" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#111110" textAnchor="middle">💬</text>

                    {/* Card 2 — Collective */}
                    <rect x="0" y="92" width="268" height="76" rx="10" fill="#1C1C1A" stroke="#7C3AED" strokeWidth="1.5"/>
                    <rect x="0" y="92" width="268" height="30" rx="10" fill="#111110"/>
                    <rect x="0" y="112" width="268" height="10" fill="#111110"/>
                    <circle cx="18" cy="107" r="9" fill="#7C3AED" opacity="0.8"/>
                    <text x="18" y="111" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="white" textAnchor="middle" fontWeight="900">C</text>
                    <text x="34" y="104" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#a78bfa" fontWeight="800">Artists' Collective</text>
                    <text x="34" y="114" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.4)">Curatorial Services · Berlin</text>
                    <rect x="208" y="98" width="50" height="16" rx="8" fill="#7C3AED"/>
                    <text x="233" y="109" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="white" textAnchor="middle" fontWeight="900">POPULAR</text>
                    <text x="14" y="140" fontFamily="Darker Grotesque, sans-serif" fontSize="10" fill="#ffffff" fontWeight="800">Digital Media Artists Wanted</text>
                    <text x="14" y="153" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Virtual Exhibition · All artists welcome</text>
                    <text x="14" y="164" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.3)">5 days ago · 156 artists viewed</text>
                    <circle cx="250" cy="142" r="12" fill="#7C3AED" opacity="0.2"/>
                    <circle cx="250" cy="142" r="9" fill="#7C3AED"/>
                    <text x="250" y="146" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="white" textAnchor="middle">📤</text>

                    {/* Card 3 — Venue (right column) */}
                    <rect x="280" y="4" width="268" height="76" rx="10" fill="#1C1C1A" stroke="#16A34A" strokeWidth="1.5"/>
                    <rect x="280" y="4" width="268" height="30" rx="10" fill="#111110"/>
                    <rect x="280" y="24" width="268" height="10" fill="#111110"/>
                    <circle cx="298" cy="19" r="9" fill="#16A34A" opacity="0.8"/>
                    <text x="298" y="23" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="white" textAnchor="middle" fontWeight="900">V</text>
                    <text x="314" y="16" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="#4ade80" fontWeight="800">Urban Spaces Venue</text>
                    <text x="314" y="26" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.4)">Community Events · Los Angeles</text>
                    <rect x="490" y="10" width="50" height="16" rx="8" fill="#16A34A"/>
                    <text x="515" y="21" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="white" textAnchor="middle" fontWeight="900">FEATURED</text>
                    <text x="294" y="52" fontFamily="Darker Grotesque, sans-serif" fontSize="10" fill="#ffffff" fontWeight="800">Local Artists for Monthly Showcase</text>
                    <text x="294" y="65" fontFamily="Darker Grotesque, sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Networking Event · Ongoing</text>
                    <text x="294" y="76" fontFamily="Darker Grotesque, sans-serif" fontSize="7" fill="rgba(255,255,255,0.3)">1 week ago · 89 artists viewed</text>
                    <circle cx="530" cy="54" r="12" fill="#16A34A" opacity="0.2"/>
                    <circle cx="530" cy="54" r="9" fill="#16A34A"/>
                    <text x="530" y="58" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="white" textAnchor="middle">🤝</text>

                    {/* Stats card (right col, bottom) */}
                    <rect x="280" y="92" width="268" height="76" rx="10" fill="#CA8A04" stroke="#111110" strokeWidth="1.5"/>
                    <text x="300" y="116" fontFamily="Darker Grotesque, sans-serif" fontSize="22" textAnchor="middle">✨</text>
                    <text x="348" y="116" fontFamily="Darker Grotesque, sans-serif" fontSize="14" fill="#111110" fontWeight="900">2,400+ Artists</text>
                    <text x="348" y="132" fontFamily="Darker Grotesque, sans-serif" fontSize="10" fill="rgba(0,0,0,0.65)" fontWeight="700">Connected &amp; Exhibiting</text>
                    <text x="348" y="146" fontFamily="Darker Grotesque, sans-serif" fontSize="9" fill="rgba(0,0,0,0.5)" fontWeight="600">Real-time collaborations</text>
                    <circle cx="516" cy="108" r="18" fill="rgba(0,0,0,0.1)"/>
                    <text x="516" y="114" fontFamily="Darker Grotesque, sans-serif" fontSize="18" textAnchor="middle">→</text>
                  </svg>
                </div>
              </Link>
            </div>

            {/* ── ROW 3: 4 small cards ── */}
            <div className="hero-bottom">
              {HERO_CARDS_SMALL.map((card, i) => (
                <Link key={i} href={card.href} className="hero-card-small">
                  <div className="hc-small-stripe" style={{ background: card.accent }} />
                  <span className="hc-icon-sm">{card.icon}</span>
                  <div className="hc-q-sm">{card.q}</div>
                  <div className="hc-cta-sm" style={{ color: card.accent }}>{card.cta}</div>
                  <div className="hc-desc-sm">{card.desc}</div>
                  <div className="hc-arrow-sm" style={{ color: card.accent }}>
                    {card.cta} <ArrowRight size={13} />
                  </div>
                </Link>
              ))}
            </div>

            {/* ── ROW 4: Inline pill bar ── */}
            <div className="hero-pill-bar">
              <div className="hero-pill-hint">
                <div className="hero-pill-dot" />
                This is your quick view — jump straight to what matters.
              </div>
              <button className="hero-pill-btn" onClick={() => setQuickView(false)}>
                View full dashboard ↓
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            FULL DASHBOARD — bento + guided actions
        ════════════════════════════════════════════ */}
        {!quickView && (
          <>
            {/* Back to focus view pill */}
            <button className="back-to-hero-pill" onClick={() => setQuickView(true)}>
              ↑ Back to Focus view
            </button>

            {/* Guided action prompts */}
            {visibleActions.length > 0 && (
              <div className="guided-bar">
                {GUIDED_ACTIONS.map((action, i) => {
                  if (dismissedActions.has(i)) return null;
                  return (
                    <Link key={i} href={action.href} className="guided-pill" style={{ "--pill-color": action.color } as any}>
                      <div className="guided-pill-emoji">{action.icon}</div>
                      <div className="guided-pill-text">
                        <div className="guided-pill-q">{action.q}</div>
                        <div className="guided-pill-cta">{action.cta} →</div>
                      </div>
                      <button
                        className="guided-pill-dismiss"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDismissedActions(prev => { const next = new Set(Array.from(prev)); next.add(i); return next; });
                        }}
                        title="Dismiss"
                      >
                        <X size={8} />
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════
            BENTO GRID (only shown in full view)
        ════════════════════════════════════════════ */}
        {!quickView && (<>
        <div className="bento">

          {/* ━━━━ MY STUDIO ━━━━ */}
          <section className="cell c-studio" style={{ "--dot": "#FFD400" } as any}>
            {!isLit("studio") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">My Studio</h2>
            <div className="cell-meta">Your works, storefront & references</div>

            {/* Stats */}
            <div className="studio-stats">
              {[
                { label: "Total works", value: loaded ? stats.total : "—" },
                { label: "Available",   value: loaded ? stats.available : "—" },
                { label: "In progress", value: loaded ? stats.in_progress : "—" },
                { label: "Sold",        value: loaded ? stats.sold : "—" },
                { label: "This month",  value: loaded ? `$${stats.sales_month.toLocaleString()}` : "—" },
              ].map(s => (
                <div key={s.label} className="studio-stat">
                  <div className="studio-stat-label">{s.label}</div>
                  <div className="studio-stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent artworks */}
            <div className="section-sub">
              <span>Recent Works</span>
              <Link href="/dashboard/artworks" className="view-all">View all <ArrowRight size={11} /></Link>
            </div>

            <div className="works-grid">
              {artworks.map((aw: any) => {
                const img = Array.isArray(aw.images) ? aw.images[0] : null;
                const sc = STATUS_CFG[aw.status] || STATUS_CFG["concept"];
                return (
                  <div key={aw.id} className="work-tile" style={{ cursor: "pointer" }}>
                    {img ? <img src={img} alt={aw.title} /> : <div className="work-tile-empty"><ImageIcon size={24} /></div>}
                    <div className="work-tile-overlay">
                      <div className="work-tile-title-overlay">{aw.title || "Untitled"}</div>
                      <div className="work-tile-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</div>
                      <div className="work-tile-actions">
                        <Link href={`/dashboard/artworks/${aw.id}/edit`} className="work-tile-action yellow" title="Edit" onClick={e => e.stopPropagation()}>
                          <Edit2 size={11} />
                        </Link>
                        <Link href={`/dashboard/artworks/${aw.id}`} className="work-tile-action" title="View" onClick={e => e.stopPropagation()}>
                          <Eye size={11} />
                        </Link>
                        {aw.status === "available" && (
                          <button className="work-tile-action" title="Share" onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/dashboard/artworks/${aw.id}`); }}>
                            <Share2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Placeholder tiles if fewer than 4 artworks */}
              {Array.from({ length: Math.max(0, 4 - artworks.length) }).map((_, i) => (
                <div key={`ph-${i}`} className="work-tile" style={{ opacity: 0.4, boxShadow: "none" }}>
                  <div className="work-tile-empty"><ImageIcon size={20} /></div>
                </div>
              ))}

              {/* Add tile */}
              <Link href="/dashboard/artworks/new" className="work-tile work-tile-add">
                <div className="work-tile-add-plus">+</div>
                <div className="work-tile-add-lbl">New work</div>
              </Link>
            </div>

            {/* Bottom row: Front Door + Mini moodboard preview */}
            <div className="studio-bottom">
              <div>
                <div className="studio-subcell-title">My Front Door</div>
                <div className="front-door-row">
                  <Link href="/dashboard/mystore" className="front-door-btn">Edit store</Link>
                  {storeUrl && (
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="front-door-link">
                      <Eye size={11} /> View live <ArrowRight size={10} />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <div className="studio-subcell-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  Moodboard
                  <Link href="/dashboard/moodboard" style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.06em" }}>Open →</Link>
                </div>
                <div className="mini-mb-grid">
                  {moodboards.slice(0, 2).map((mb: any) => (
                    <Link key={mb.id} href="/dashboard/moodboard" className="mini-mb-card">
                      {mb.thumbnail_url
                        ? <img src={mb.thumbnail_url} alt={mb.title} />
                        : <div className="mini-mb-empty">🗂️</div>}
                      <div className="mini-mb-label">{mb.title || "Untitled"}</div>
                    </Link>
                  ))}
                  {Array.from({ length: Math.max(0, 2 - moodboards.length) }).map((_, i) => (
                    <Link key={`mbph-${i}`} href="/dashboard/moodboard" className="mini-mb-card">
                      <div className="mini-mb-empty">+</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ━━━━ THE SCENE ━━━━ */}
          <section className="cell c-scene" style={{ "--dot": "#4ECDC4" } as any}>
            {!isLit("scene") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">The Scene</h2>
            <div className="cell-meta">Events & collaborations</div>

            <div className="scene-inner">
              {/* Next event */}
              <div className="schedule-block">
                {nextEvent ? (
                  <>
                    <div>
                      <div className="schedule-date-month">{dateMonth(nextEvent.start_date).month} · Next event</div>
                      <div className="schedule-date">{dateMonth(nextEvent.start_date).day}</div>
                    </div>
                    <div className="schedule-next">
                      {nextEvent.title}<br />
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{nextEvent.venue || "No venue"}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="schedule-date-month">Nothing upcoming</div>
                      <div className="schedule-date" style={{ color: "rgba(255,255,255,0.3)" }}>—</div>
                    </div>
                    <div className="schedule-next" style={{ color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>Your calendar is clear</div>
                  </>
                )}
                <Link href="/dashboard/calendar" className="schedule-btn">View calendar</Link>
              </div>

              {/* Mini collab list */}
              <div>
                <div className="section-sub" style={{ marginBottom: 8 }}>
                  <span>Collabs</span>
                  <Link href="/dashboard/pool" className="view-all">Browse <ArrowRight size={11} /></Link>
                </div>
                <div className="collabs-mini">
                  <Link href="/dashboard/pool" className="collab-row" style={{ textDecoration: "none" }}>
                    <div className="collab-dot" style={{ background: "#CA8A04" }} />
                    <div className="collab-title">Find collaborators</div>
                    <div className="collab-tag" style={{ background: "#FEF9C3", color: "#CA8A04" }}>Open pool</div>
                  </Link>
                  <Link href="/dashboard/exhibitions" className="collab-row" style={{ textDecoration: "none" }}>
                    <div className="collab-dot" style={{ background: "#EC4899" }} />
                    <div className="collab-title">Shows & Education</div>
                    <div className="collab-tag" style={{ background: "#FCE7F3", color: "#EC4899" }}>Explore</div>
                  </Link>
                  <Link href="/dashboard/map" className="collab-row" style={{ textDecoration: "none" }}>
                    <div className="collab-dot" style={{ background: "#EF4444" }} />
                    <div className="collab-title">Art Scene Map</div>
                    <div className="collab-tag" style={{ background: "#FEE2E2", color: "#EF4444" }}>Prague</div>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ━━━━ PLANNING ━━━━ */}
          <section className="cell c-planning" style={{ "--dot": "#8B5CF6" } as any}>
            {!isLit("planning") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">Planning</h2>
            <div className="cell-meta">Urgent to-dos</div>

            <div className="task-list">
              {tasks.length === 0 ? (
                <div className="task-empty">All clear — nothing urgent!</div>
              ) : tasks.slice(0, 5).map((t: any) => (
                <Link key={t.id} href="/dashboard/tasks" className="task-row" style={{ textDecoration: "none" }}>
                  <div className={`task-priority ${t.priority === "high" || t.priority === "urgent" ? "high" : t.priority === "medium" ? "medium" : ""}`} />
                  <div className="task-title">{t.title}</div>
                </Link>
              ))}
            </div>

            <Link href="/dashboard/tasks" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 11, fontWeight: 700, color: "var(--muted)", textDecoration: "none" }}>
              <CheckSquare size={12} /> All to-dos <ArrowRight size={10} />
            </Link>
          </section>

          {/* ━━━━ SALES & CLIENTS LIST ━━━━ */}
          <section className="cell c-lists" style={{ "--dot": "#FFD400", display: "flex", flexDirection: "column" } as any}>
            {!isLit("lists") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">Recent Activity</h2>
            <div className="cell-meta">Sales &amp; collectors at a glance</div>

            {/* Toggle */}
            <div className="lists-toggle">
              <button className={`lists-toggle-btn${listToggle === "sales" ? " active" : ""}`} onClick={() => setListToggle("sales")}>
                💰 Sales
              </button>
              <button className={`lists-toggle-btn${listToggle === "clients" ? " active" : ""}`} onClick={() => setListToggle("clients")}>
                👥 Collectors
              </button>
            </div>

            {/* List */}
            <div className="list-rows">
              {listToggle === "sales" ? (
                recentSales.length === 0 ? (
                  <div className="list-empty">No sales recorded yet</div>
                ) : recentSales.map((s: any) => {
                  const initials2 = (s.buyer_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const dateStr = s.sale_date ? new Date(s.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
                  const artworkTitle = s.artwork?.title || "Artwork";
                  return (
                    <div key={s.id} className="list-row">
                      <div className="list-row-avatar">{initials2}</div>
                      <div className="list-row-body">
                        <div className="list-row-name">{s.buyer_name || "Unknown buyer"}</div>
                        <div className="list-row-sub">{artworkTitle} · {dateStr}</div>
                      </div>
                      <div className="list-row-amount">${(s.amount || 0).toLocaleString()}</div>
                    </div>
                  );
                })
              ) : (
                recentClients.length === 0 ? (
                  <div className="list-empty">No collectors added yet</div>
                ) : recentClients.map((c: any) => {
                  const initials2 = (c.full_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
                  return (
                    <div key={c.id} className="list-row">
                      <div className="list-row-avatar" style={{ background: "#4ECDC4" }}>{initials2}</div>
                      <div className="list-row-body">
                        <div className="list-row-name">{c.full_name || "Unnamed"}</div>
                        <div className="list-row-sub">{c.email || "No email"} · Added {dateStr}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* CTA */}
            <Link
              href={listToggle === "sales" ? "/dashboard/sales" : "/dashboard/clients"}
              className="list-cta"
            >
              <Plus size={13} strokeWidth={3} />
              {listToggle === "sales" ? "Log a sale" : "Add a collector"}
            </Link>
          </section>

          {/* ━━━━ DEALS & MONEY ━━━━ */}
          <section className="cell c-money" style={{ "--dot": "#16A34A" } as any}>
            {!isLit("deals") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">Deals &amp; Money</h2>
            <div className="cell-meta">Sales, collectors, papers, reach</div>

            <div className="money-grid">
              <Link href="/dashboard/sales" className="money-tile sales">
                <div className="money-tile-icon"><DollarSign size={15} color="#111110" strokeWidth={2.5} /></div>
                <div className="money-tile-name">My Sales</div>
                <div className="money-tile-desc">Track what I've sold</div>
                <div className="money-tile-num">${loaded ? stats.sales_total.toLocaleString() : "—"}</div>
              </Link>

              <Link href="/dashboard/clients" className="money-tile collectors">
                <div className="money-tile-icon"><Users size={15} color="#111110" strokeWidth={2.4} /></div>
                <div className="money-tile-name">My Collectors</div>
                <div className="money-tile-desc">People who love your work</div>
              </Link>

              <Link href="/dashboard/contracts" className="money-tile papers">
                <div className="money-tile-icon"><FileText size={14} color="#111110" strokeWidth={2.4} /></div>
                <div className="money-tile-name">My Papers</div>
                <div className="money-tile-desc">Agreements &amp; deals</div>
              </Link>

              <Link href="/dashboard/analytics" className="money-tile reach">
                <div className="money-tile-icon"><TrendingUp size={15} color="#111110" strokeWidth={2.4} /></div>
                <div className="money-tile-name">My Reach</div>
                <div className="money-tile-desc">How am I doing?</div>
                <div className="money-tile-num">{loaded ? stats.followers : "—"}</div>
              </Link>
            </div>
          </section>

          {/* ━━━━ INBOX ━━━━ */}
          <section className="cell c-msgs" style={{ "--dot": "#FF6B6B" } as any}>
            {!isLit("inbox") && <div className="cell-dim-overlay" />}
            <h2 className="cell-title">Inbox</h2>
            <div className="cell-meta">Messages &amp; alerts</div>

            <div className="msgs-row">
              <Link href="/dashboard/messages" className="msg-btn" style={{ textDecoration: "none" }}>
                {unreadMessages > 0 && <div className="msg-btn-badge">{unreadMessages}</div>}
                <div className="msg-btn-icon"><Mail size={20} color="#111110" strokeWidth={2.2} /></div>
                <div className="msg-btn-label">Messages</div>
              </Link>

              <button className="msg-btn" onClick={() => setBellOpen(o => !o)}>
                {unreadNotifs > 0 && <div className="msg-btn-badge">{unreadNotifs}</div>}
                <div className="msg-btn-icon"><Bell size={20} color="#111110" strokeWidth={2.2} /></div>
                <div className="msg-btn-label">Alerts</div>
              </button>
            </div>
          </section>

        </div> {/* end .bento */}

        {/* ════════════════════════════════════════════
            MOODBOARD SECTION (below bento)
        ════════════════════════════════════════════ */}
        <div className="mb-section">
          <div className="mb-section-head">
            <div className="mb-section-title">
              <div className="mb-section-title-dot" />
              Moodboard
            </div>
            <Link href="/dashboard/moodboard" className="view-all">
              Open full board <ArrowRight size={11} />
            </Link>
          </div>

          <div className="mb-grid">
            {moodboards.slice(0, 3).map((mb: any) => (
              <Link key={mb.id} href="/dashboard/moodboard" className="mb-card">
                {mb.thumbnail_url
                  ? <img src={mb.thumbnail_url} alt={mb.title} />
                  : <div className="mb-card-empty">🗂️<span style={{ fontSize: 10 }}>No preview</span></div>}
                <div className="mb-card-overlay">
                  <div className="mb-card-title">{mb.title || "Untitled"}</div>
                  <div className="mb-card-provider">{mb.provider || "Board"}</div>
                </div>
              </Link>
            ))}

            {/* Fill remaining slots */}
            {Array.from({ length: Math.max(0, 3 - moodboards.length) }).map((_, i) => (
              <div key={`mbfill-${i}`} className="mb-card">
                <div className="mb-card-empty">
                  <Layers size={22} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: 10, fontWeight: 600 }}>No board yet</span>
                </div>
              </div>
            ))}

            {/* Add new */}
            <Link href="/dashboard/moodboard" className="mb-card mb-add-card">
              <div className="mb-add-plus">+</div>
              <div className="mb-add-lbl">Add moodboard</div>
            </Link>
          </div>
        </div>

        </>)} {/* end !quickView */}

      </div>
    </>
  );
}
