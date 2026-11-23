// src/app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ═══════════════════════════════════════════════════════════════════
   INTENT CONFIG — verb-labelled, route to the same cells via spotlight
═══════════════════════════════════════════════════════════════════ */
type IntentKey = "make" | "manage" | "connect" | "learn";

const INTENTS: { key: IntentKey; label: string }[] = [
  { key: "make",    label: "Make something" },
  { key: "manage",  label: "Sort the week" },
  { key: "connect", label: "See who's around" },
  { key: "learn",   label: "Check on sales" },
];

type CellKey = "studio" | "scene" | "planning" | "calendar" | "money" | "inbox";

const SPOTLIGHT: Record<IntentKey, CellKey[]> = {
  make:    ["studio", "planning"],
  manage:  ["planning", "calendar"],
  connect: ["scene", "inbox"],
  learn:   ["money", "calendar"],
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE POST TYPE CONFIG — mirrors /dashboard/scene
═══════════════════════════════════════════════════════════════════ */
type ScenePostType = "event" | "exhibition" | "collab" | "opencall" | "commission";

const SCENE_POST_CFG: Record<ScenePostType, { label: string; emoji: string; gradient: string }> = {
  event:      { label: "Event",      emoji: "🗓",  gradient: "linear-gradient(135deg, #E0F2FE 0%, #7DD3FC 100%)" },
  exhibition: { label: "Exhibition", emoji: "🖼",  gradient: "linear-gradient(135deg, #FEF9C3 0%, #FFD400 100%)" },
  collab:     { label: "Collab",     emoji: "🤝", gradient: "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)" },
  opencall:   { label: "Open call",  emoji: "🔍", gradient: "linear-gradient(135deg, #DCFCE7 0%, #86EFAC 100%)" },
  commission: { label: "Commission", emoji: "🎨", gradient: "linear-gradient(135deg, #FFE4E6 0%, #FCA5A5 100%)" },
};

/* ═══════════════════════════════════════════════════════════════════
   CALENDAR TYPE CONFIG — mirrors /dashboard/calendar TYPE_CFG
═══════════════════════════════════════════════════════════════════ */
const CAL_TYPE_COLOR: Record<string, string> = {
  exhibition: "#CA8A04",
  deadline:   "#D93A26",
  collab:     "#0EA5A5",
  meeting:    "#7C3AED",
  personal:   "#111110",
  sale:       "#EC4899",
  artwork:    "#FFD400",
  task:       "#FAFAF8",
  scene:      "#FFD400",
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function daysUntil(d?: string) {
  if (!d) return null;
  const dt = new Date(d).getTime();
  const now = Date.now();
  const diff = Math.ceil((dt - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relDate(d?: string) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return `${Math.floor(diff / (30 * day))}mo ago`;
}

function fmtAgendaDate(d: string): { rel: string; num: number } {
  const dt = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dt);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  let rel: string;
  if (diff === 0) rel = "today";
  else if (diff === 1) rel = "tomorrow";
  else rel = dt.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  return { rel, num: dt.getDate() };
}

function fmtTime(t?: string | null) {
  if (!t) return null;
  return t.slice(0, 5);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function paletteFor(seed: string): [string, string, string] {
  const palettes: [string, string, string][] = [
    ["#C73E1D", "#E89C5A", "#F5E5C0"],
    ["#2D3142", "#4F5D75", "#BFC0C0"],
    ["#2D6A4F", "#74C69D", "#D8F3DC"],
    ["#6B2D5C", "#C73E1D", "#FFD400"],
    ["#1F2421", "#3C5045", "#7A9E7E"],
    ["#8B4513", "#D2691E", "#F4A460"],
    ["#2C3E50", "#E74C3C", "#ECF0F1"],
    ["#5A189A", "#9D4EDD", "#E0AAFF"],
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % palettes.length;
  return palettes[h];
}

/* ═══════════════════════════════════════════════════════════════════
   AGENDA ITEM SHAPE
═══════════════════════════════════════════════════════════════════ */
type AgendaItem = {
  id: string;
  title: string;
  type: string;
  source: "private" | "task" | "public";
  date: string;
  time?: string | null;
  where?: string | null;
  href: string;
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  /* ── Data state ─────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0, available: 0, in_progress: 0, sold: 0,
    sales_month: 0, sales_total: 0, sales_prev_month: 0,
    followers: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [scenePosts, setScenePosts] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [publicEvents, setPublicEvents] = useState<any[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [contractsOut, setContractsOut] = useState({ out: 0, awaiting: 0 });
  const [loaded, setLoaded] = useState(false);
  const [latestNote, setLatestNote] = useState<{ text: string; when: string } | null>(null);

  /* ── UI state ───────────────────────────────────────── */
  const [intent, setIntent] = useState<IntentKey | null>(null);
  const [calToggle, setCalToggle] = useState<"yours" | "around">("yours");

  /* ── Load intent from localStorage ──────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("artomango_intent");
      if (saved === "make" || saved === "manage" || saved === "connect" || saved === "learn") {
        setIntent(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (intent) localStorage.setItem("artomango_intent", intent);
      else localStorage.removeItem("artomango_intent");
    } catch {}
  }, [intent]);

  /* ── Load unread messages from /api/conversations ─── */
  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) return;
        const data = await res.json();
        const total = (data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unread_count || 0),
          0
        );
        setUnreadMessages(total);
      } catch {}
    };
    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── Fetch all dashboard data ───────────────────────── */
  useEffect(() => {
    const supabase = createClient();

    const loadAll = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        const todayIso = isoDate(now);
        const weekAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const weekAheadIso = isoDate(weekAhead);

        const [
          { data: prof },
          { data: awAll },
          { data: awRecent },
          { data: tk },
          { data: salesAll },
          { data: salesMonth },
          { data: salesPrevMonth },
          { data: notifs },
          { count: followerCount },
          { data: contracts },
          { data: sceneRows },
          { data: calEvents },
          { data: pubEvents },
          { data: calTasks },
        ] = await Promise.all([
          // Profile
          supabase.from("profiles").select("full_name,username,avatar_url").eq("id", user.id).single(),
          // Artworks aggregate counts
          supabase.from("artworks").select("id,status").eq("user_id", user.id),
          // Recent artworks for the wall — favor available work that's been photographed
          supabase
            .from("artworks")
            .select("id,title,images,status,price,medium,created_at,updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(12),
          // Tasks for the to-do cell and the wall-note
          supabase
            .from("tasks")
            .select("id,title,priority,due_date,description,status,created_at")
            .eq("user_id", user.id)
            .neq("status", "done")
            .order("created_at", { ascending: false })
            .limit(10),
          // Sales — FIXED: use sale_price column, filter status=completed
          supabase
            .from("sales")
            .select("sale_price,sale_date,status")
            .eq("user_id", user.id)
            .ilike("status", "completed"),
          supabase
            .from("sales")
            .select("sale_price,status")
            .eq("user_id", user.id)
            .ilike("status", "completed")
            .gte("sale_date", monthStart),
          supabase
            .from("sales")
            .select("sale_price,status")
            .eq("user_id", user.id)
            .ilike("status", "completed")
            .gte("sale_date", prevMonthStart)
            .lte("sale_date", prevMonthEnd),
          // Notifications
          supabase
            .from("notifications")
            .select("id,title,body,type,created_at,read")
            .eq("user_id", user.id)
            .eq("read", false)
            .order("created_at", { ascending: false })
            .limit(6),
          // Followers
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
          // Contracts
          supabase.from("contracts").select("status").eq("user_id", user.id),
          // Scene posts — FIXED: read from scene_posts, public+active feed
          supabase
            .from("scene_posts")
            .select("id,user_id,post_type,title,description,cover_image,images,location,is_online,start_date,end_date,deadline,price_from,commission_scope,created_at")
            .eq("is_public", true)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(6),
          // Calendar — your private events for the next ~2 weeks
          supabase
            .from("calendar_events")
            .select("id,title,type,start_date,end_date,start_time,end_time,all_day,location,source,origin_id")
            .eq("user_id", user.id)
            .gte("start_date", todayIso)
            .lte("start_date", weekAheadIso)
            .order("start_date", { ascending: true })
            .limit(20),
          // Public events for the "Around" toggle
          supabase
            .from("public_events")
            .select("id,title,type,start_date,end_date,start_time,venue,city,closes_at,cover_url")
            .gte("start_date", todayIso)
            .lte("start_date", weekAheadIso)
            .order("start_date", { ascending: true })
            .limit(20),
          // Tasks with due dates for calendar agenda
          supabase
            .from("tasks")
            .select("id,title,due_date,priority,status")
            .eq("user_id", user.id)
            .neq("status", "done")
            .not("due_date", "is", null)
            .gte("due_date", todayIso)
            .lte("due_date", weekAheadIso)
            .order("due_date", { ascending: true })
            .limit(20),
        ]);

        setProfile(prof || null);
        setArtworks(awRecent || []);
        setTasks(tk || []);
        setNotifications(notifs || []);
        setScenePosts(sceneRows || []);
        setCalendarEvents(calEvents || []);
        setPublicEvents(pubEvents || []);
        setCalendarTasks(calTasks || []);

        // Resolve scene posters in a second round
        const sceneList = sceneRows || [];
        if (sceneList.length > 0) {
          const posterIds = Array.from(new Set(sceneList.map((r: any) => r.user_id)));
          const { data: posters } = await supabase
            .from("profiles")
            .select("id,full_name,username,avatar_url")
            .in("id", posterIds);
          const profMap: Record<string, any> = {};
          (posters || []).forEach((p: any) => { profMap[p.id] = p; });
          setScenePosts(
            sceneList.map((r: any) => ({ ...r, poster: profMap[r.user_id] || null }))
          );
        }

        // Pull the most recent task description as the wall note (until a real
        // sketchbook entity exists).
        const tkWithDescription = (tk || []).find(
          (t: any) => t.description && t.description.trim().length > 0
        );
        if (tkWithDescription) {
          setLatestNote({
            text: tkWithDescription.description.slice(0, 80),
            when: tkWithDescription.created_at,
          });
        }

        if (awAll) {
          const total = awAll.length;
          const available = awAll.filter((a: any) => a.status === "available").length;
          const in_progress = awAll.filter((a: any) =>
            ["in_progress", "concept"].includes(a.status)
          ).length;
          const sold = awAll.filter((a: any) => a.status === "sold").length;
          // FIXED: read sale_price, not amount
          const sales_total = (salesAll || []).reduce(
            (s: number, r: any) => s + (Number(r.sale_price) || 0),
            0
          );
          const sales_month = (salesMonth || []).reduce(
            (s: number, r: any) => s + (Number(r.sale_price) || 0),
            0
          );
          const sales_prev_month = (salesPrevMonth || []).reduce(
            (s: number, r: any) => s + (Number(r.sale_price) || 0),
            0
          );
          setStats({
            total,
            available,
            in_progress,
            sold,
            sales_total,
            sales_month,
            sales_prev_month,
            followers: followerCount || 0,
          });
        }

        if (contracts) {
          const out = contracts.filter((c: any) =>
            ["sent", "active", "executed"].includes(c.status)
          ).length;
          const awaiting = contracts.filter((c: any) =>
            c.status === "sent" || c.status === "awaiting_signature"
          ).length;
          setContractsOut({ out, awaiting });
        }

        setLoaded(true);
      } catch (err) {
        console.error("[dashboard] load error:", err);
        setLoaded(true);
      }
    };

    loadAll();
  }, []);

  /* ── Derived ────────────────────────────────────────── */
  const fname = (profile?.full_name || "").split(" ")[0] || "there";
  const hour = new Date().getHours();
  const timeWord = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const activeSpotlight: CellKey[] = intent ? SPOTLIGHT[intent] : [];
  const isLit = (key: CellKey) => !intent || activeSpotlight.includes(key);

  const todayFmt = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Greeting subtitle — observational
  const observations: string[] = [];
  if (unreadMessages > 0) observations.push(`${unreadMessages} new message${unreadMessages > 1 ? "s" : ""}`);
  const nextPrivateEv = calendarEvents[0];
  if (nextPrivateEv) {
    const d = daysUntil(nextPrivateEv.start_date);
    if (d) observations.push(`${nextPrivateEv.title} ${d}`);
  }
  if (tasks.length > 0) {
    observations.push(`${tasks.length} open task${tasks.length > 1 ? "s" : ""}`);
  }
  const greetSub =
    observations.length > 0
      ? observations.slice(0, 2).join(" · ") + "."
      : "A quiet week so far. The work doesn't mind quiet.";

  const pillCount = (key: IntentKey): number => {
    if (key === "manage") return tasks.length;
    if (key === "connect") return unreadMessages;
    return 0;
  };

  // Wall composition — anchor prefers an available work with an image
  const wallEligible = artworks.filter(
    (a) => a.images && a.images[0]
  );
  const anchorPick =
    wallEligible.find((a) => a.status === "available") ||
    wallEligible[0] ||
    artworks[0];
  const restOfWall = artworks
    .filter((a) => a.id !== (anchorPick && anchorPick.id))
    .slice(0, 3);

  // Sales note — copy that responds to state
  const salesNote = (() => {
    if (stats.sales_month > 0 && stats.sales_total === stats.sales_month) {
      return "First sale of the month. There may be more.";
    }
    if (stats.sales_month > 0) return "Real money in the door.";
    if (stats.sales_prev_month > 0) return "Last month landed. This one's still open.";
    return "A quiet month. The work goes on.";
  })();

  const reachNote =
    stats.followers > 0
      ? "People paying attention to your front door."
      : "Your audience will gather here.";

  // ─── AGENDA — build for the calendar cell ────────────
  const agendaYours: AgendaItem[] = [
    ...calendarEvents.map((e: any): AgendaItem => ({
      id: `ev-${e.id}`,
      title: e.title,
      type: e.type || "personal",
      source: "private",
      date: e.start_date,
      time: e.all_day ? null : fmtTime(e.start_time),
      where: e.location,
      href: "/dashboard/calendar",
    })),
    ...calendarTasks.map((t: any): AgendaItem => ({
      id: `tk-${t.id}`,
      title: t.title,
      type: "task",
      source: "task",
      date: t.due_date,
      time: null,
      where: "task",
      href: "/dashboard/tasks",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const agendaAround: AgendaItem[] = publicEvents
    .map((p: any): AgendaItem => ({
      id: `pub-${p.id}`,
      title: p.title,
      type: p.type === "open_call" || p.type === "residency" ? "scene" : "exhibition",
      source: "public",
      date: p.start_date,
      time: fmtTime(p.start_time),
      where: p.venue ? `${p.venue}${p.city ? `, ${p.city}` : ""}` : p.city || null,
      href: "/dashboard/calendar",
    }))
    .slice(0, 5);

  const agenda = calToggle === "yours" ? agendaYours : agendaAround;

  // Scene post meta builder — short contextual line per post type
  const sceneMeta = (p: any): string => {
    const parts: string[] = [];
    if (p.is_online) parts.push("Online");
    else if (p.location) parts.push(p.location);
    if (p.start_date) {
      const dt = new Date(p.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const d = daysUntil(p.start_date);
      parts.push(d === "today" || d === "tomorrow" ? `opens ${d}` : `${dt}`);
    } else if (p.deadline) {
      const dt = new Date(p.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      parts.push(`closes ${dt}`);
    }
    if (p.price_from) parts.push(`from ${p.price_from}`);
    if (parts.length === 0 && p.description) {
      return p.description.slice(0, 60);
    }
    return parts.join(" · ");
  };

  return (
    <>
      <style>{`
        :root {
          --cream: #FFFBEA;
          --cream-deep: #F5EFD6;
          --ink: #111110;
          --black: #111110;
          --yellow: #FFD400;
          --muted: #8A7F66;
          --muted-soft: #B5A98A;
          --line: #D4C9A8;
          --border: #D4C9A8;
          --red: #C73E1D;
          --green: #2D6A4F;
          --radius: 20px;
          --shadow: 3px 4px 0 var(--line);
          --shadow-hard: 3px 4px 0 var(--black);

          /* Emil-correct easing tokens */
          --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          --ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
          --dur-micro: 150ms;
          --dur-base: 180ms;
          --dur-large: 220ms;
        }
        * { box-sizing: border-box; }
        .db-root {
          font-family: 'Darker Grotesque', sans-serif;
          background: var(--cream);
          color: var(--ink);
          font-weight: 500;
          padding: 0 28px 80px;
          max-width: 1320px;
          margin: 0 auto;
          min-height: 100vh;
        }

        /* ─── GREETING + FOCUS ─── */
        .greet {
          padding: 24px 4px 28px;
          margin-bottom: 26px;
          border-bottom: 1.5px solid var(--line);
        }
        .greet-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 32px;
          margin-bottom: 26px;
        }
        .greet-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .greet-eyebrow .line { width: 28px; height: 1.5px; background: var(--muted); }
        .greet-headline {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 46px;
          letter-spacing: -1.6px;
          line-height: 1;
          color: var(--ink);
          margin: 0;
        }
        .greet-headline em { font-style: italic; font-weight: 400; color: var(--muted); }
        .greet-sub {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 17px;
          color: var(--muted);
          margin-top: 14px;
          font-weight: 400;
          max-width: 580px;
          line-height: 1.4;
        }
        .greet-stats { display: flex; align-items: stretch; }
        .gstat { padding: 14px 22px; border-left: 1.5px solid var(--line); }
        .gstat:first-child { border-left: none; padding-left: 0; }
        .gstat-n {
          font-family: 'Fraunces', serif;
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -1.2px;
          line-height: 1;
        }
        .gstat-l {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 6px;
        }

        .focus {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: center;
        }
        .focus-q {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 19px;
          color: var(--ink);
          letter-spacing: -0.3px;
          white-space: nowrap;
        }
        .focus-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          border: 2px solid var(--ink);
          background: transparent;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          color: var(--ink);
          transition: background var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out);
        }
        .pill:hover { background: var(--ink); color: var(--cream); }
        .pill:hover .pill-count {
          background: var(--yellow);
          color: var(--ink);
          border-color: var(--yellow);
        }
        .pill.active { background: var(--ink); color: var(--cream); }
        .pill.active .pill-count {
          background: var(--yellow);
          color: var(--ink);
          border-color: var(--yellow);
        }
        .pill-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 99px;
          background: var(--yellow);
          border: 1.5px solid var(--ink);
          font-size: 10px;
          font-weight: 900;
        }
        .focus-reset {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--muted);
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
          white-space: nowrap;
        }

        /* ─── BENTO ─── */
        .bento {
          display: grid;
          grid-template-columns: 1.45fr 1fr 0.85fr;
          grid-template-rows: auto auto;
          gap: 18px;
        }
        .cell {
          background: var(--cream);
          border: 2.5px solid var(--ink);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: opacity var(--dur-large) var(--ease-out), filter var(--dur-large) var(--ease-out);
        }
        .cell.dim { opacity: 0.32; filter: saturate(0.5); }
        .cell.spotlight {
          box-shadow: 5px 6px 0 var(--yellow), 0 0 0 4px var(--yellow) inset;
        }
        .cell-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 10px;
        }
        .cell-label { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .cell-label-tag {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 4px 10px;
          background: var(--cream-deep);
          border: 2px solid var(--ink);
          border-radius: 99px;
        }
        .cell-title {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: -0.6px;
          line-height: 1;
          margin: 0;
        }
        .cell-link {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink);
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 4px;
          white-space: nowrap;
        }

        /* ─── STUDIO — THE WALL ─── */
        .c-studio { grid-column: 1; grid-row: 1; }
        .studio-numbers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-bottom: 22px;
          border-top: 1.5px solid var(--line);
          border-bottom: 1.5px solid var(--line);
        }
        .snum { padding: 14px 18px; border-right: 1.5px solid var(--line); }
        .snum:last-child { border-right: none; }
        .snum-l {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .snum-v {
          font-family: 'Fraunces', serif;
          font-size: 26px;
          font-weight: 500;
          letter-spacing: -0.8px;
          line-height: 1;
        }
        .snum-sub {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          margin-top: 4px;
        }

        .wall {
          position: relative;
          width: 100%;
          height: 380px;
          background: linear-gradient(to bottom, var(--cream) 0%, var(--cream) 78%, var(--cream-deep) 100%);
          border-radius: 14px;
          overflow: visible;
          padding: 18px 10px 14px;
        }
        .wall::after {
          content: "";
          position: absolute;
          left: 6%; right: 6%; top: 6px;
          height: 1px;
          background: var(--line);
          opacity: 0.6;
        }
        .piece {
          position: absolute;
          background: #fff;
          border: 2px solid var(--ink);
          box-shadow: 3px 4px 0 var(--ink);
          overflow: hidden;
          cursor: pointer;
          transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
          text-decoration: none;
          color: var(--ink);
        }
        .piece:hover {
          transform: translate(-2px, -2px) rotate(0deg) !important;
          box-shadow: 5px 6px 0 var(--ink);
          z-index: 10;
        }
        .piece-img {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }
        .piece.anchor {
          left: 3%;
          top: 16px;
          width: 35%;
          height: 270px;
          transform: rotate(-0.5deg);
          z-index: 3;
        }
        .piece.anchor::before {
          content: "";
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) rotate(-3deg);
          width: 56px;
          height: 18px;
          background: rgba(255, 212, 0, 0.65);
          border: 1px solid rgba(17,17,16,0.15);
          z-index: 5;
        }
        .piece.p2 { left: 41%; top: 22px;  width: 22%; height: 158px; transform: rotate(1.2deg);  z-index: 2; }
        .piece.p3 { left: 65%; top: 12px;  width: 23%; height: 175px; transform: rotate(-1.5deg); z-index: 2; }
        .piece.p4 { left: 41%; top: 198px; width: 16%; height: 108px; transform: rotate(-0.8deg); z-index: 2; }

        .piece.empty-frame {
          left: 60%; top: 196px;
          width: 28%; height: 112px;
          transform: rotate(2deg);
          background: repeating-linear-gradient(
            45deg,
            var(--cream) 0,
            var(--cream) 6px,
            var(--cream-deep) 6px,
            var(--cream-deep) 7px
          );
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .piece.empty-frame:hover { background: var(--yellow); }
        .piece.empty-frame::before {
          content: "";
          position: absolute;
          inset: 8px;
          border: 1.5px dashed var(--muted-soft);
          border-radius: 2px;
        }
        .piece.empty-frame:hover::before { border-color: var(--ink); }
        .empty-frame-text {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 0 14px;
        }
        .ef-mark {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 400;
          line-height: 1;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .piece.empty-frame:hover .ef-mark { color: var(--ink); }
        .ef-line {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13.5px;
          color: var(--ink);
          line-height: 1.2;
        }

        .piece-pin {
          position: absolute;
          bottom: 6px; left: 6px; right: 6px;
          background: rgba(255, 251, 234, 0.95);
          border: 1px solid var(--ink);
          padding: 4px 8px;
          font-family: 'Fraunces', serif;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: -0.1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .anchor .piece-pin { font-size: 13px; padding: 6px 10px; }

        .wall-note {
          margin-top: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-top: 1.5px dashed var(--line);
          border-bottom: 1.5px dashed var(--line);
        }
        .wall-note-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
          padding-right: 14px;
          border-right: 1px solid var(--line);
        }
        .wall-note-content {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--ink);
          line-height: 1.3;
          flex: 1;
          min-width: 0;
        }
        .wall-note-foot {
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        /* ─── SCENE — reads scene_posts ─── */
        .c-scene { grid-column: 2; grid-row: 1; }
        .scene-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .scene-post {
          display: block;
          padding: 0;
          border: 2px solid var(--ink);
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          text-decoration: none;
          color: var(--ink);
          box-shadow: 2px 3px 0 var(--ink);
          transition: transform var(--dur-base) var(--ease-out);
          overflow: hidden;
          position: relative;
        }
        .scene-post:hover { transform: translate(-1px, -1px); }
        .scene-post-row {
          display: flex;
          align-items: stretch;
        }
        .scene-post-cover {
          width: 78px;
          flex-shrink: 0;
          position: relative;
          background-size: cover;
          background-position: center;
          border-right: 1.5px solid var(--ink);
        }
        .scene-post-tag {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 7px;
          background: var(--ink);
          color: var(--yellow);
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 99px;
          white-space: nowrap;
        }
        .scene-post-body {
          flex: 1;
          padding: 12px 14px;
          min-width: 0;
        }
        .scene-post-title {
          font-family: 'Fraunces', serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.2px;
          line-height: 1.2;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .scene-post-meta {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.3;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .scene-post-foot {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          min-width: 0;
        }
        .scene-post-poster {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
        }
        .scene-post-av {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 1.5px solid var(--ink);
          background: var(--yellow);
          font-size: 8.5px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .scene-post-poster-name {
          font-weight: 800;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .scene-post-time {
          color: var(--muted);
          flex-shrink: 0;
        }
        .scene-post-time::before { content: "·"; padding: 0 4px; }

        .scene-empty {
          padding: 28px 16px;
          text-align: center;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--muted);
          line-height: 1.4;
        }

        .scene-ctas {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin-top: 14px;
          padding-top: 16px;
          border-top: 1.5px solid var(--line);
        }
        .scene-cta {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 16px;
          border: 2px solid var(--ink);
          border-radius: 12px;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
        }
        .scene-cta.primary {
          background: var(--ink);
          color: var(--yellow);
          box-shadow: 2px 3px 0 var(--line);
        }
        .scene-cta.primary:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 4px 0 var(--line);
        }
        .scene-cta.primary .cta-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 15px;
        }
        .scene-cta.ghost {
          background: transparent;
          padding: 13px 18px;
        }
        .scene-cta.ghost:hover { background: var(--cream-deep); }
        .scene-cta.ghost .cta-icon {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 18px;
          font-weight: 400;
          color: var(--ink);
          line-height: 1;
        }
        .cta-arrow {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          line-height: 1;
          font-weight: 400;
        }

        /* ─── PLAN ─── */
        .c-plan { grid-column: 3; grid-row: 1; }
        .task {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 2px solid var(--ink);
          border-radius: 11px;
          background: #fff;
          margin-bottom: 8px;
          box-shadow: 2px 2px 0 var(--ink);
          text-decoration: none;
          color: inherit;
          transition: transform var(--dur-base) var(--ease-out);
        }
        .task:hover { transform: translate(-1px, -1px); }
        .task .check {
          width: 18px; height: 18px;
          border: 2px solid var(--ink);
          border-radius: 5px;
          background: var(--cream);
          flex-shrink: 0;
          margin-top: 1px;
        }
        .task-t { font-size: 14px; font-weight: 700; line-height: 1.25; }
        .task-meta {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          margin-top: 4px;
          display: flex;
          gap: 8px;
        }
        .task-meta .priority { font-weight: 900; color: var(--red); }
        .task-meta .priority.mid { color: var(--ink); }
        .task-meta .priority.low { color: var(--green); }
        .task-empty {
          padding: 20px 12px;
          text-align: center;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--muted);
          background: var(--cream);
          border: 2px dashed var(--border);
          border-radius: 11px;
          margin-bottom: 8px;
        }
        .plan-add {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: var(--ink);
          color: var(--yellow);
          border-radius: 11px;
          font-size: 12.5px;
          font-weight: 800;
          margin-top: auto;
          text-decoration: none;
          transition: transform var(--dur-base) var(--ease-out);
        }
        .plan-add:hover { transform: translate(-1px, -1px); }

        /* ─── CALENDAR CELL ─── */
        .c-calendar { grid-column: 1; grid-row: 2; }
        .cal-head-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cal-toggle {
          display: inline-flex;
          border: 2px solid var(--ink);
          border-radius: 99px;
          overflow: hidden;
          padding: 2px;
          background: var(--cream-deep);
        }
        .cal-toggle button {
          padding: 6px 14px;
          border: none;
          background: none;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 99px;
          color: var(--ink);
          transition: background var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out);
        }
        .cal-toggle button.on {
          background: var(--ink);
          color: var(--yellow);
        }
        .agenda-list { display: flex; flex-direction: column; }
        .agenda-row {
          display: grid;
          grid-template-columns: 64px auto 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 12px 4px;
          border-bottom: 1px solid var(--line);
          text-decoration: none;
          color: inherit;
          transition: background var(--dur-base) var(--ease-out);
        }
        .agenda-row:last-child { border-bottom: none; }
        .agenda-row:hover { background: rgba(255, 212, 0, 0.06); }
        .agenda-date {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.2;
        }
        .agenda-date b {
          font-style: normal;
          font-weight: 500;
          font-size: 20px;
          letter-spacing: -0.6px;
          color: var(--ink);
          display: block;
        }
        .agenda-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid var(--ink);
        }
        .agenda-dot.public {
          background: var(--cream);
          border-style: dashed;
        }
        .agenda-body { min-width: 0; }
        .agenda-title {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .agenda-where {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .agenda-time {
          font-family: 'Fraunces', serif;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          white-space: nowrap;
        }
        .agenda-empty {
          padding: 32px 16px;
          text-align: center;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* ─── MONEY ─── */
        .c-money { grid-column: 2; grid-row: 2; }
        .money-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .money-tile {
          padding: 18px 16px;
          border: 2px solid var(--ink);
          border-radius: 14px;
          background: var(--cream);
          box-shadow: 2px 2px 0 var(--ink);
          text-decoration: none;
          color: inherit;
          transition: transform var(--dur-base) var(--ease-out);
        }
        .money-tile:hover { transform: translate(-1px, -1px); }
        .money-tile.live { background: #fff; }
        .money-label {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .money-value {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -1px;
          line-height: 1;
        }
        .money-value.link {
          font-size: 18px;
          color: var(--muted);
        }
        .money-note {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          margin-top: 8px;
          line-height: 1.3;
        }
        .money-sub {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          margin-top: 6px;
        }

        /* ─── INBOX ─── */
        .c-inbox { grid-column: 3; grid-row: 2; }
        .inbox-empty-headline {
          font-family: 'Fraunces', serif;
          font-size: 17px;
          font-weight: 500;
          letter-spacing: -0.3px;
          line-height: 1.25;
        }
        .inbox-empty-sub {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 8px;
          line-height: 1.4;
        }
        .inbox-item {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          border: 2px solid var(--ink);
          border-radius: 11px;
          background: #fff;
          margin-bottom: 8px;
          box-shadow: 2px 2px 0 var(--ink);
          text-decoration: none;
          color: inherit;
          transition: transform var(--dur-base) var(--ease-out);
        }
        .inbox-item:hover { transform: translate(-1px, -1px); }
        .ibx-av {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--yellow);
          border: 2px solid var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          flex-shrink: 0;
        }
        .ibx-t {
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ibx-p {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 3px;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1100px) {
          .bento { grid-template-columns: 1fr 1fr; }
          .c-studio   { grid-column: 1 / 3; grid-row: 1; }
          .c-scene    { grid-column: 1; grid-row: 2; }
          .c-plan     { grid-column: 2; grid-row: 2; }
          .c-calendar { grid-column: 1 / 3; grid-row: 3; }
          .c-money    { grid-column: 1; grid-row: 4; }
          .c-inbox    { grid-column: 2; grid-row: 4; }
          .greet-headline { font-size: 38px; }
          .focus { grid-template-columns: 1fr; }
          .focus-q { padding-bottom: 8px; }
        }
        @media (max-width: 700px) {
          .db-root { padding: 0 16px 60px; }
          .bento { grid-template-columns: 1fr; }
          .c-studio,.c-scene,.c-plan,.c-calendar,.c-money,.c-inbox {
            grid-column: 1; grid-row: auto;
          }
          .greet { padding: 18px 0 22px; }
          .greet-grid { grid-template-columns: 1fr; align-items: flex-start; gap: 18px; }
          .greet-headline { font-size: 32px; letter-spacing: -1.2px; }
          .greet-stats { align-self: flex-start; }
          .gstat { padding: 10px 14px; }
          .gstat-n { font-size: 24px; }
          .focus-pills { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
          .pill { white-space: nowrap; flex-shrink: 0; }
          .wall { height: 320px; }
          .piece.anchor { width: 42%; height: 230px; }
          .piece.p2 { width: 26%; height: 130px; left: 48%; }
          .piece.p3 { width: 26%; height: 145px; left: 75%; top: 6px; }
          .piece.p4 { width: 22%; height: 90px; left: 48%; top: 168px; }
          .piece.empty-frame {
            width: 28%; height: 95px;
            left: 71%; top: 175px;
            transform: rotate(0deg); /* edit #3: no rotation on mobile */
          }
          .studio-numbers { grid-template-columns: 1fr 1fr; }
          .snum:nth-child(2) { border-right: none; }
          .snum:nth-child(1), .snum:nth-child(2) { border-bottom: 1.5px solid var(--line); }
          .cal-head-right { flex-direction: column; align-items: flex-end; gap: 6px; }
        }

        /* prefers-reduced-motion — edit #1 */
        @media (prefers-reduced-motion: reduce) {
          .piece, .scene-post, .task, .pill, .scene-cta, .money-tile,
          .agenda-row, .cal-toggle button, .plan-add, .inbox-item, .cell {
            transition: none;
          }
        }
      `}</style>

      <div className="db-root">

        {/* ═════════════ GREETING + FOCUS ═════════════ */}
        <div className="greet">

          <div className="greet-grid">
            <div>
              <div className="greet-eyebrow">
                <span className="line" />
                {todayFmt} · Prague
              </div>
              <h1 className="greet-headline">
                {timeWord}, {fname} — <em>the studio is yours.</em>
              </h1>
              <div className="greet-sub">{greetSub}</div>
            </div>
            <div className="greet-stats">
              <div className="gstat">
                <div className="gstat-n">{loaded ? stats.total : "—"}</div>
                <div className="gstat-l">works</div>
              </div>
              <div className="gstat">
                <div className="gstat-n">{loaded ? stats.available : "—"}</div>
                <div className="gstat-l">for sale</div>
              </div>
              <div className="gstat">
                <div className="gstat-n">
                  €{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}
                </div>
                <div className="gstat-l">this month</div>
              </div>
            </div>
          </div>

          <div className="focus">
            <div className="focus-q">What are you here to do?</div>
            <div className="focus-pills">
              {INTENTS.map((opt) => {
                const c = pillCount(opt.key);
                return (
                  <button
                    key={opt.key}
                    className={`pill${intent === opt.key ? " active" : ""}`}
                    onClick={() => setIntent(intent === opt.key ? null : opt.key)}
                  >
                    {opt.label}
                    {c > 0 && <span className="pill-count">{c}</span>}
                  </button>
                );
              })}
            </div>
            {intent ? (
              <button className="focus-reset" onClick={() => setIntent(null)}>
                Show everything
              </button>
            ) : <div />}
          </div>

        </div>

        {/* ═════════════ BENTO ═════════════ */}
        <div className="bento">

          {/* ── STUDIO ── */}
          <section className={`cell c-studio${isLit("studio") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">My Studio</span>
                <h2 className="cell-title">The wall</h2>
              </div>
              <Link href="/dashboard/artworks" className="cell-link">All works →</Link>
            </div>

            <div className="studio-numbers">
              <div className="snum">
                <div className="snum-l">Total</div>
                <div className="snum-v">{loaded ? stats.total : "—"}</div>
              </div>
              <div className="snum">
                <div className="snum-l">For sale</div>
                <div className="snum-v">{loaded ? stats.available : "—"}</div>
              </div>
              <div className="snum">
                <div className="snum-l">In progress</div>
                <div className="snum-v">{loaded ? stats.in_progress : "—"}</div>
                {loaded && stats.in_progress > 0 && (
                  <div className="snum-sub">on the bench</div>
                )}
              </div>
              <div className="snum">
                <div className="snum-l">Sold</div>
                <div className="snum-v">{loaded ? stats.sold : "—"}</div>
              </div>
            </div>

            <div className="wall">
              {anchorPick ? (
                <Link
                  href={`/dashboard/artworks/${anchorPick.id}`}
                  className="piece anchor"
                >
                  {anchorPick.images && anchorPick.images[0] ? (
                    <div
                      className="piece-img"
                      style={{ backgroundImage: `url(${anchorPick.images[0]})` }}
                    />
                  ) : (
                    <div
                      className="piece-img"
                      style={{
                        background: `linear-gradient(135deg, ${paletteFor(anchorPick.id)[0]} 0%, ${paletteFor(anchorPick.id)[1]} 100%)`,
                      }}
                    />
                  )}
                  <div className="piece-pin">
                    {anchorPick.title || "Untitled"}
                  </div>
                </Link>
              ) : (
                <Link
                  href="/dashboard/artworks/new"
                  className="piece empty-frame"
                  style={{ left: "3%", top: "16px", width: "35%", height: "270px", transform: "rotate(-0.5deg)" }}
                >
                  <div className="empty-frame-text">
                    <div className="ef-mark">+</div>
                    <div className="ef-line">Hang the first piece</div>
                  </div>
                </Link>
              )}

              {restOfWall.map((aw, i) => {
                const slot = ["p2", "p3", "p4"][i];
                if (!slot) return null;
                return (
                  <Link
                    key={aw.id}
                    href={`/dashboard/artworks/${aw.id}`}
                    className={`piece ${slot}`}
                  >
                    {aw.images && aw.images[0] ? (
                      <div
                        className="piece-img"
                        style={{ backgroundImage: `url(${aw.images[0]})` }}
                      />
                    ) : (
                      <div
                        className="piece-img"
                        style={{
                          background: `linear-gradient(135deg, ${paletteFor(aw.id)[0]} 0%, ${paletteFor(aw.id)[1]} 100%)`,
                        }}
                      />
                    )}
                    <div className="piece-pin">{aw.title || "Untitled"}</div>
                  </Link>
                );
              })}

              {anchorPick && (
                <Link href="/dashboard/artworks/new" className="piece empty-frame">
                  <div className="empty-frame-text">
                    <div className="ef-mark">+</div>
                    <div className="ef-line">Hang something new</div>
                  </div>
                </Link>
              )}
            </div>

            {latestNote && (
              <div className="wall-note">
                <div className="wall-note-label">Note · {relDate(latestNote.when)}</div>
                <div className="wall-note-content">&ldquo;{latestNote.text}&rdquo;</div>
                <div className="wall-note-foot">From the notebook</div>
              </div>
            )}
          </section>

          {/* ── SCENE — reads scene_posts ── */}
          <section className={`cell c-scene${isLit("scene") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">The Scene</span>
                <h2 className="cell-title">Live now</h2>
              </div>
            </div>

            <div className="scene-list">
              {scenePosts.length > 0 ? (
                scenePosts.slice(0, 3).map((p) => {
                  const cfg = SCENE_POST_CFG[p.post_type as ScenePostType] || SCENE_POST_CFG.event;
                  const cover = p.cover_image || (p.images && p.images[0]);
                  return (
                    <Link key={p.id} href="/dashboard/scene" className="scene-post">
                      <div className="scene-post-row">
                        <div
                          className="scene-post-cover"
                          style={{
                            background: cover ? `url(${cover})` : cfg.gradient,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        >
                          <div className="scene-post-tag">{cfg.emoji} {cfg.label}</div>
                        </div>
                        <div className="scene-post-body">
                          <div className="scene-post-title">{p.title}</div>
                          <div className="scene-post-meta">{sceneMeta(p)}</div>
                          <div className="scene-post-foot">
                            <div className="scene-post-poster">
                              <div className="scene-post-av">
                                {p.poster?.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.poster.avatar_url}
                                    alt=""
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  initials(p.poster?.full_name)
                                )}
                              </div>
                              <span className="scene-post-poster-name">
                                {p.poster?.full_name || "Anonymous"}
                              </span>
                            </div>
                            <span className="scene-post-time">{relDate(p.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="scene-empty">
                  Nothing live in the scene yet. <br />
                  Post something or wander.
                </div>
              )}
            </div>

            <div className="scene-ctas">
              <Link href="/dashboard/scene" className="scene-cta primary">
                <span className="cta-label">See who&apos;s around</span>
                <span className="cta-arrow">→</span>
              </Link>
              <Link href="/dashboard/scene?compose=1" className="scene-cta ghost">
                <span className="cta-icon">+</span>
                <span>Post to the scene</span>
              </Link>
            </div>
          </section>

          {/* ── PLAN ── */}
          <section className={`cell c-plan${isLit("planning") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Today</span>
                <h2 className="cell-title">To-do</h2>
              </div>
            </div>

            {tasks.length > 0 ? (
              tasks.slice(0, 3).map((t) => {
                const pClass =
                  t.priority === "high" || t.priority === "urgent"
                    ? ""
                    : t.priority === "low"
                      ? " low"
                      : " mid";
                const pLabel =
                  t.priority === "high" || t.priority === "urgent"
                    ? "High"
                    : t.priority === "low"
                      ? "Low"
                      : "Med";
                return (
                  <Link key={t.id} href="/dashboard/tasks" className="task">
                    <div className="check" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="task-t"
                        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {t.title}
                      </div>
                      <div className="task-meta">
                        <span className={`priority${pClass}`}>{pLabel}</span>
                        {t.due_date && (
                          <span>
                            ·{" "}
                            {new Date(t.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="task-empty">Nothing pressing.</div>
            )}

            <Link href="/dashboard/tasks" className="plan-add">
              <span>Add a task</span>
              <span>→</span>
            </Link>
          </section>

          {/* ── CALENDAR — replaces Activity ── */}
          <section className={`cell c-calendar${isLit("calendar") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">This week</span>
                <h2 className="cell-title">Calendar</h2>
              </div>
              <div className="cal-head-right">
                <div className="cal-toggle">
                  <button
                    className={calToggle === "yours" ? "on" : ""}
                    onClick={() => setCalToggle("yours")}
                  >
                    Yours
                  </button>
                  <button
                    className={calToggle === "around" ? "on" : ""}
                    onClick={() => setCalToggle("around")}
                  >
                    Around
                  </button>
                </div>
                <Link href="/dashboard/calendar" className="cell-link">Open →</Link>
              </div>
            </div>

            <div className="agenda-list">
              {agenda.length > 0 ? (
                agenda.map((item) => {
                  const { rel, num } = fmtAgendaDate(item.date);
                  const dotColor = CAL_TYPE_COLOR[item.type] || "#FAFAF8";
                  return (
                    <Link key={item.id} href={item.href} className="agenda-row">
                      <div className="agenda-date">
                        {rel}<b>{num}</b>
                      </div>
                      <div
                        className={`agenda-dot${item.source === "public" ? " public" : ""}`}
                        style={item.source === "public" ? undefined : { background: dotColor }}
                      />
                      <div className="agenda-body">
                        <div className="agenda-title">{item.title}</div>
                        {item.where && (
                          <div className="agenda-where">{item.where}</div>
                        )}
                      </div>
                      <div className="agenda-time">
                        {item.time || (item.source === "task" ? "due" : "all day")}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="agenda-empty">
                  {calToggle === "yours"
                    ? "The week is open. Make of it what you will."
                    : "Quiet around town this week."}
                </div>
              )}
            </div>
          </section>

          {/* ── MONEY — sales fixed ── */}
          <section className={`cell c-money${isLit("money") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Sales &amp; money</span>
                <h2 className="cell-title">This month</h2>
              </div>
              <Link href="/dashboard/analytics" className="cell-link">Analytics →</Link>
            </div>

            <div className="money-grid">
              <Link href="/dashboard/sales" className="money-tile live">
                <div className="money-label">Sales</div>
                <div className="money-value">
                  €{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}
                </div>
                <div className="money-note">{salesNote}</div>
              </Link>
              <Link href="/dashboard/discover" className="money-tile live">
                <div className="money-label">Reach</div>
                <div className="money-value">
                  {loaded ? stats.followers.toLocaleString() : "—"}
                </div>
                <div className="money-note">{reachNote}</div>
              </Link>
              <Link href="/dashboard/contracts" className="money-tile">
                <div className="money-label">My Papers</div>
                <div className="money-value link">{contractsOut.out} out →</div>
                {contractsOut.awaiting > 0 && (
                  <div className="money-sub">{contractsOut.awaiting} awaiting signature</div>
                )}
              </Link>
              <Link href="/dashboard/mystore" className="money-tile">
                <div className="money-label">Front Door</div>
                <div className="money-value link">Open →</div>
              </Link>
            </div>
          </section>

          {/* ── INBOX ── */}
          <section className={`cell c-inbox${isLit("inbox") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Inbox</span>
                <h2 className="cell-title">
                  {notifications.length > 0 ? `${notifications.length} new` : "Quiet"}
                </h2>
              </div>
            </div>

            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((n) => (
                <Link key={n.id} href="/dashboard/messages" className="inbox-item">
                  <div className="ibx-av">{initials(n.title)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ibx-t">{n.title}</div>
                    {n.body && <div className="ibx-p">{n.body}</div>}
                  </div>
                </Link>
              ))
            ) : (
              <div>
                <div className="inbox-empty-headline">Nothing new today.</div>
                <div className="inbox-empty-sub">
                  When someone reaches out — a collector, a curator, a fellow artist — it will land here. Not before.
                </div>
              </div>
            )}
          </section>

        </div>

      </div>
    </>
  );
}
