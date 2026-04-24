// src/app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Plus } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   INTENT CONFIG — the 4 pills + which cells they spotlight
═══════════════════════════════════════════════════════════════════ */
type IntentKey = "make" | "manage" | "connect" | "learn";

const INTENTS: { key: IntentKey; num: string; label: string }[] = [
  { key: "make",    num: "01", label: "Make something" },
  { key: "manage",  num: "02", label: "Manage my work" },
  { key: "connect", num: "03", label: "Connect & collab" },
  { key: "learn",   num: "04", label: "Learn & explore" },
];

type CellKey = "studio" | "scene" | "planning" | "activity" | "money" | "inbox";

const SPOTLIGHT: Record<IntentKey, CellKey[]> = {
  make:    ["studio", "planning"],
  manage:  ["studio", "money", "activity"],
  connect: ["scene", "inbox"],
  learn:   ["scene", "studio"],
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function fmtDate(d?: string) {
  if (!d) return { day: "—", month: "—" };
  const dt = new Date(d);
  return {
    day: dt.getDate(),
    month: dt.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
}

function daysUntil(d?: string) {
  if (!d) return null;
  const dt = new Date(d).getTime();
  const now = Date.now();
  const diff = Math.ceil((dt - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `${diff} days to go`;
}

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relDate(d?: string) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* Deterministic pastel gradient per artwork for the swatch tiles */
function gradientFor(id: string) {
  const palettes: [string, string][] = [
    ["#FFD400", "#E8A400"],
    ["#9EE3DC", "#0EA5A5"],
    ["#FF8A3D", "#D93A26"],
    ["#FFC9DE", "#EC4899"],
    ["#C9B6E4", "#7C3AED"],
    ["#FFE08A", "#CA8A04"],
    ["#B5D99C", "#1E8E3E"],
    ["#F5E6A8", "#A88B00"],
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════ */
export default function DashboardHome() {
  const router = useRouter();

  /* ── Data ───────────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, in_progress: 0, sold: 0, sales_month: 0, sales_total: 0, sales_prev_month: 0, followers: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [monthlyBars, setMonthlyBars] = useState<number[]>([]);
  const [contractsOut, setContractsOut] = useState({ out: 0, awaiting: 0 });
  const [loaded, setLoaded] = useState(false);

  /* ── UI state ───────────────────────────────────────── */
  const [intent, setIntent] = useState<IntentKey | null>(null);
  const [listToggle, setListToggle] = useState<"sales" | "clients">("sales");

  /* ── Load intent from localStorage ──────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("artomango_intent");
      if (saved === "make" || saved === "manage" || saved === "connect" || saved === "learn") {
        setIntent(saved);
      }
    } catch {}
  }, []);

  /* ── Save intent to localStorage ────────────────────── */
  useEffect(() => {
    try {
      if (intent) localStorage.setItem("artomango_intent", intent);
      else localStorage.removeItem("artomango_intent");
    } catch {}
  }, [intent]);

  /* ── Fetch all data ─────────────────────────────────── */
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

        const [
          { data: prof },
          { data: awAll },
          { data: awRecent },
          { data: mb },
          { data: tk },
          { data: evNext },
          { data: salesAll },
          { data: salesMonth },
          { data: salesPrevMonth },
          { data: msgs },
          { data: notifs },
          { count: followerCount },
          { data: rSales },
          { data: rClients },
          { data: collabData },
          { data: contracts },
        ] = await Promise.all([
          supabase.from("profiles").select("full_name,username,avatar_url").eq("id", user.id).single(),
          supabase.from("artworks").select("id,status").eq("user_id", user.id),
          supabase.from("artworks").select("id,title,images,status,price,medium").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
          supabase.from("moodboards").select("id,title,thumbnail_url,url,provider").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
          supabase.from("tasks").select("id,title,priority,status,due_date").eq("user_id", user.id).neq("status", "done").order("created_at", { ascending: false }).limit(4),
          supabase.from("events").select("id,title,start_date,venue,event_type").eq("user_id", user.id).gte("start_date", now.toISOString()).order("start_date", { ascending: true }).limit(1),
          supabase.from("sales").select("amount,sale_date").eq("user_id", user.id),
          supabase.from("sales").select("amount").eq("user_id", user.id).gte("sale_date", monthStart),
          supabase.from("sales").select("amount").eq("user_id", user.id).gte("sale_date", prevMonthStart).lte("sale_date", prevMonthEnd),
          supabase.from("messages").select("id,read_by_b").eq("participant_b", user.id).eq("read_by_b", false).limit(99),
          supabase.from("notifications").select("*").eq("user_id", user.id).eq("read", false).order("created_at", { ascending: false }).limit(12),
          supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
          supabase.from("sales").select("id, buyer_name, amount, sale_date, artwork:artworks(title)").eq("user_id", user.id).order("sale_date", { ascending: false }).limit(4),
          supabase.from("clients").select("id, full_name, email, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
          supabase.from("collaborations").select("id, title, type, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
          supabase.from("contracts").select("id, status").eq("user_id", user.id),
        ]);

        setProfile(prof);
        setArtworks(awRecent || []);
        setMoodboards(mb || []);
        setTasks(tk || []);
        setNextEvent((evNext || [])[0] || null);
        setNotifications(notifs || []);
        setUnreadMessages((msgs || []).length);
        setRecentSales(rSales || []);
        setRecentClients(rClients || []);
        setCollabs(collabData || []);

        // Stats
        if (awAll) {
          const total = awAll.length;
          const available = awAll.filter((a: any) => a.status === "available").length;
          const in_progress = awAll.filter((a: any) => ["in_progress", "concept"].includes(a.status)).length;
          const sold = awAll.filter((a: any) => a.status === "sold").length;
          const sales_total = (salesAll || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
          const sales_month = (salesMonth || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
          const sales_prev_month = (salesPrevMonth || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
          setStats({ total, available, in_progress, sold, sales_total, sales_month, sales_prev_month, followers: followerCount || 0 });
        }

        // Monthly bar sparkline — last 8 months
        const bars: number[] = [];
        for (let i = 7; i >= 0; i--) {
          const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
          const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
          const sum = (salesAll || []).reduce((s: number, r: any) => {
            if (!r.sale_date) return s;
            const t = new Date(r.sale_date).getTime();
            return (t >= mStart && t < mEnd) ? s + (r.amount || 0) : s;
          }, 0);
          bars.push(sum);
        }
        setMonthlyBars(bars);

        // Contracts
        if (contracts) {
          const out = contracts.filter((c: any) => ["sent", "active", "executed"].includes(c.status)).length;
          const awaiting = contracts.filter((c: any) => c.status === "sent" || c.status === "awaiting_signature").length;
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

  const monthDelta = stats.sales_prev_month > 0
    ? Math.round(((stats.sales_month - stats.sales_prev_month) / stats.sales_prev_month) * 100)
    : null;
  const maxBar = Math.max(...monthlyBars, 1);
  const todayFmt = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  // Contextual observation string for the greeting sub
  const observations: string[] = [];
  if (collabs.length > 0) observations.push(`${collabs.length} collab request${collabs.length > 1 ? "s" : ""} waiting`);
  if (nextEvent) {
    const d = daysUntil(nextEvent.start_date);
    if (d) observations.push(`${nextEvent.title} ${d}`);
  }
  if (tasks.length > 0) observations.push(`${tasks.length} open task${tasks.length > 1 ? "s" : ""}`);
  if (unreadMessages > 0) observations.push(`${unreadMessages} new message${unreadMessages > 1 ? "s" : ""}`);
  const greetSub = observations.length > 0
    ? observations.slice(0, 2).join(", ") + "."
    : "The studio is yours. Quiet day — good time to make things.";

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,600&display=swap');

        :root {
          --black:#111110;
          --yellow:#FFD400;
          --cream:#FFFBEA;
          --paper:#FAF7F3;
          --border:#E8E0D0;
          --muted:#9B8F7A;
          --ink:#5C5346;
          --green:#1E8E3E;
          --red:#D93A26;
          --pink:#EC4899;
          --teal:#0EA5A5;
          --violet:#7C3AED;
          --radius:20px;
        }

        .db-root { padding-bottom: 60px; }
        .serif { font-family: 'Fraunces', serif; }
        .serif-i { font-family: 'Fraunces', serif; font-style: italic; font-weight: 600; }

        /* ─── GREETING BAND ─── */
        .greet {
          background: var(--black);
          color: #fff;
          border: 2.5px solid var(--black);
          border-radius: var(--radius);
          padding: 28px 32px 26px;
          margin-bottom: 18px;
          box-shadow: 5px 6px 0 var(--yellow);
          position: relative;
          overflow: hidden;
        }
        .greet::after {
          content: "";
          position: absolute; inset: 0;
          opacity: 0.06; pointer-events: none;
          background-image: radial-gradient(rgba(255,212,0,0.8) 1px, transparent 1px);
          background-size: 4px 4px;
        }
        .greet-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          position: relative;
          z-index: 2;
        }
        .greet-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 11px; font-weight: 800;
          color: var(--yellow);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .greet-eyebrow .line { width: 28px; height: 2px; background: var(--yellow); }
        .greet-headline {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: clamp(34px, 4.2vw, 54px);
          line-height: 1.02;
          letter-spacing: -1.8px;
          margin: 0;
        }
        .greet-headline em {
          font-style: italic;
          color: var(--yellow);
          font-weight: 600;
        }
        .greet-sub {
          font-size: 15px;
          font-weight: 600;
          color: rgba(255,255,255,0.72);
          margin-top: 14px;
          max-width: 580px;
          line-height: 1.4;
        }
        .greet-stats { display: flex; gap: 22px; align-items: flex-end; }
        .gstat { text-align: right; }
        .gstat-n {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 32px;
          letter-spacing: -1.2px;
          line-height: 1;
        }
        .gstat-l {
          font-size: 10.5px;
          font-weight: 800;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .gstat.accent .gstat-n { color: var(--yellow); }

        /* ─── INTENT BAR ─── */
        .intent-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: center;
          margin-bottom: 22px;
        }
        .intent-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 600;
          font-size: 22px;
          color: var(--ink);
          letter-spacing: -0.5px;
          white-space: nowrap;
          padding-right: 6px;
        }
        .intent-pills { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 13px 20px;
          border: 2.5px solid var(--black);
          border-radius: 99px;
          background: #fff;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 800;
          color: var(--black);
          box-shadow: 3px 3px 0 var(--black);
          transition: transform .15s, box-shadow .15s, background .15s;
        }
        .pill:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--black); }
        .pill .num {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: var(--black);
          color: var(--yellow);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900;
          font-family: 'Fraunces', serif;
          font-style: italic;
        }
        .pill.active { background: var(--yellow); }
        .pill.active .num { background: #fff; color: var(--black); }
        .reset-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 800;
          color: var(--muted);
          background: none; border: none; cursor: pointer;
          font-family: inherit;
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 3px;
          white-space: nowrap;
        }
        .reset-btn:hover { color: var(--black); }

        /* ─── BENTO ─── */
        .bento {
          display: grid;
          grid-template-columns: 1.45fr 1fr 0.85fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }
        .cell {
          background: #fff;
          border: 2.5px solid var(--black);
          border-radius: var(--radius);
          padding: 22px;
          box-shadow: 3px 4px 0 var(--black);
          position: relative;
          overflow: hidden;
          transition: opacity .3s, transform .3s, box-shadow .3s, filter .3s;
        }
        .cell.dim { opacity: 0.32; filter: saturate(0.5); }
        .cell.spotlight {
          box-shadow: 5px 6px 0 var(--yellow), 0 0 0 4px var(--yellow) inset;
          transform: translate(-1px, -1px);
        }
        .cell.spotlight .cell-label-tag { background: var(--yellow); }

        .cell-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 10px;
        }
        .cell-label { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cell-label-tag {
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 4px 10px;
          background: var(--cream);
          border: 2px solid var(--black);
          border-radius: 99px;
          transition: background .3s;
        }
        .cell-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 22px;
          letter-spacing: -0.7px;
          margin: 0;
          line-height: 1;
        }
        .cell-link {
          font-size: 12px;
          font-weight: 800;
          color: var(--ink);
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 3px;
          cursor: pointer;
          white-space: nowrap;
        }
        .cell-link:hover { color: var(--black); }

        /* ── STUDIO cell ── */
        .c-studio { grid-column: 1; grid-row: 1; }
        .studio-numbers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-bottom: 18px;
          border: 2.5px solid var(--black);
          border-radius: 14px;
          overflow: hidden;
        }
        .snum {
          padding: 14px 16px;
          border-right: 2px solid var(--black);
          background: var(--cream);
        }
        .snum:last-child { border-right: none; background: var(--yellow); }
        .snum-l {
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 4px;
        }
        .snum-v {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 28px;
          letter-spacing: -1px;
          line-height: 1;
        }
        .works-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .work {
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          border: 2px solid var(--black);
          overflow: hidden;
          cursor: pointer;
          background: var(--cream);
          box-shadow: 2px 2px 0 var(--black);
          text-decoration: none;
          display: block;
          transition: transform .15s;
        }
        .work:hover { transform: translate(-1px, -1px); }
        .work-bg {
          position: absolute; inset: 0;
        }
        .work-bg.image {
          background-size: cover;
          background-position: center;
        }
        .work-title {
          position: absolute;
          left: 6px; bottom: 5px; right: 6px;
          font-size: 9px;
          font-weight: 900;
          color: var(--black);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.1;
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .work-new {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: var(--black);
          color: var(--yellow);
          border-radius: 12px;
          border: 2px dashed var(--yellow);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          aspect-ratio: 1;
          text-decoration: none;
          transition: transform .15s;
        }
        .work-new:hover { transform: translate(-1px, -1px); }
        .work-new .plus {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 600;
          line-height: 1;
        }
        .studio-moodrow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: var(--cream);
          border: 2px solid var(--black);
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: transform .15s, box-shadow .15s;
        }
        .studio-moodrow:hover {
          transform: translate(-1px, -1px);
          box-shadow: 2px 2px 0 var(--black);
        }
        .mood-strip { display: flex; gap: 4px; flex-shrink: 0; }
        .mood-swatch {
          width: 22px; height: 22px;
          border-radius: 5px;
          border: 1.5px solid var(--black);
          background-size: cover;
          background-position: center;
        }
        .moodtxt { flex: 1; font-size: 12px; font-weight: 700; color: var(--ink); min-width: 0; }
        .moodtxt b { color: var(--black); font-weight: 900; }

        /* ── SCENE cell ── */
        .c-scene { grid-column: 2; grid-row: 1; }
        .next-event {
          background: var(--black);
          color: #fff;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 14px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: center;
          text-decoration: none;
          transition: transform .15s;
        }
        .next-event:hover { transform: translate(-1px, -1px); }
        .date-block {
          text-align: center;
          padding: 8px 10px;
          background: var(--yellow);
          color: var(--black);
          border-radius: 10px;
          min-width: 62px;
        }
        .date-m { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
        .date-d {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -1px;
        }
        .next-t {
          font-size: 11px; font-weight: 800;
          color: var(--yellow);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .next-title { font-size: 15px; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
        .next-meta { font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.65); }

        .collab-list { display: flex; flex-direction: column; gap: 8px; }
        .collab {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 9px 12px;
          border: 2px solid var(--black);
          border-radius: 11px;
          background: #fff;
          box-shadow: 2px 2px 0 var(--black);
          text-decoration: none;
          color: inherit;
          transition: transform .15s;
        }
        .collab:hover { transform: translate(-1px, -1px); }
        .collab-av {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2px solid var(--black);
          background: var(--yellow);
          font-size: 11px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
        }
        .collab-t { font-size: 13px; font-weight: 800; line-height: 1.2; }
        .collab-s { font-size: 10.5px; font-weight: 700; color: var(--muted); margin-top: 2px; }
        .tag {
          font-size: 9.5px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 99px;
          border: 1.5px solid var(--black);
          background: var(--cream);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tag.hot { background: var(--yellow); }
        .scene-empty {
          padding: 24px 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
        }

        /* ── PLANNING cell ── */
        .c-plan { grid-column: 3; grid-row: 1; }
        .task {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border: 2px solid var(--black);
          border-radius: 11px;
          background: var(--cream);
          margin-bottom: 8px;
          box-shadow: 2px 2px 0 var(--black);
          text-decoration: none;
          color: inherit;
          transition: transform .15s;
        }
        .task:hover { transform: translate(-1px, -1px); }
        .task .check {
          width: 18px; height: 18px;
          border: 2px solid var(--black);
          border-radius: 5px;
          background: #fff;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .task-t { font-size: 13px; font-weight: 800; line-height: 1.25; }
        .task-meta {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          margin-top: 3px;
          display: flex;
          gap: 8px;
        }
        .task-meta .priority { font-weight: 900; color: var(--red); }
        .task-meta .priority.mid { color: var(--ink); }
        .task-meta .priority.low { color: var(--green); }
        .plan-add {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 11px 14px;
          background: var(--black);
          color: var(--yellow);
          border-radius: 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          transition: transform .15s;
        }
        .plan-add:hover { transform: translate(-1px, -1px); }
        .plan-add .arrow {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 18px;
        }
        .task-empty {
          padding: 20px 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          background: var(--cream);
          border: 2px dashed var(--border);
          border-radius: 11px;
          margin-bottom: 8px;
        }

        /* ── ACTIVITY cell ── */
        .c-activity { grid-column: 1; grid-row: 2; }
        .act-toggle {
          display: flex;
          gap: 4px;
          padding: 3px;
          background: var(--cream);
          border: 2px solid var(--black);
          border-radius: 99px;
          width: fit-content;
        }
        .act-toggle .tg {
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 11.5px;
          font-weight: 900;
          cursor: pointer;
          border: none;
          background: none;
          font-family: inherit;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .act-toggle .tg.on {
          background: var(--black);
          color: var(--yellow);
        }
        .sales-list { display: flex; flex-direction: column; gap: 8px; }
        .sale {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 12px;
          align-items: center;
          padding: 11px 14px;
          border: 2px solid var(--black);
          border-radius: 12px;
          background: #fff;
          box-shadow: 2px 2px 0 var(--black);
          text-decoration: none;
          color: inherit;
          transition: transform .15s;
        }
        .sale:hover { transform: translate(-1px, -1px); }
        .sale-av {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 2px solid var(--black);
          font-size: 11px;
          font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          background: var(--yellow);
        }
        .sale-buyer { font-size: 13px; font-weight: 800; }
        .sale-work {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--muted);
          margin-top: 2px;
          font-style: italic;
          font-family: 'Fraunces', serif;
        }
        .sale-price {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: -0.5px;
        }
        .sale-date { font-size: 10.5px; font-weight: 800; color: var(--muted); }
        .sale-empty {
          padding: 28px 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          background: var(--cream);
          border: 2px dashed var(--border);
          border-radius: 12px;
        }

        /* ── MONEY cell ── */
        .c-money { grid-column: 2; grid-row: 2; }
        .money-big {
          background: var(--yellow);
          border: 2.5px solid var(--black);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 3px 3px 0 var(--black);
        }
        .money-label {
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--black);
          margin-bottom: 4px;
        }
        .money-v {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 38px;
          letter-spacing: -1.5px;
          line-height: 1;
        }
        .money-delta {
          font-size: 12px;
          font-weight: 800;
          color: var(--green);
          margin-top: 4px;
        }
        .money-delta.down { color: var(--red); }
        .money-small { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .money-small .ms {
          padding: 12px;
          border: 2px solid var(--black);
          border-radius: 10px;
          background: var(--cream);
        }
        .money-small .ms-l {
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 2px;
        }
        .money-small .ms-v {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 20px;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .bar-spark {
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 36px;
          margin-top: 12px;
          padding: 0 4px;
        }
        .bar-spark .bar {
          flex: 1;
          background: var(--black);
          border-radius: 2px 2px 0 0;
          min-height: 4px;
        }
        .bar-spark .bar.hl {
          background: var(--yellow);
          border: 1.5px solid var(--black);
        }

        /* ── INBOX cell ── */
        .c-inbox { grid-column: 3; grid-row: 2; }
        .inbox-item {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          border: 2px solid var(--black);
          border-radius: 11px;
          background: #fff;
          margin-bottom: 8px;
          box-shadow: 2px 2px 0 var(--black);
          text-decoration: none;
          color: inherit;
          transition: transform .15s;
        }
        .inbox-item:hover { transform: translate(-1px, -1px); }
        .inbox-item.new { background: var(--yellow); }
        .ibx-av {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2px solid var(--black);
          font-size: 10px;
          font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: #fff;
        }
        .ibx-t { font-size: 12px; font-weight: 800; line-height: 1.2; }
        .ibx-p {
          font-size: 11px;
          font-weight: 700;
          color: var(--ink);
          margin-top: 3px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .inbox-empty {
          padding: 24px 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          background: var(--cream);
          border: 2px dashed var(--border);
          border-radius: 11px;
        }

        /* ── SCENE STRIP (bottom) ── */
        .scene-strip {
          margin-top: 18px;
          background: var(--black);
          color: #fff;
          border: 2.5px solid var(--black);
          border-radius: var(--radius);
          padding: 24px 28px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: center;
          box-shadow: 3px 4px 0 var(--black);
          position: relative;
          overflow: hidden;
          text-decoration: none;
          transition: transform .15s, box-shadow .15s;
        }
        .scene-strip:hover { transform: translate(-1px, -1px); box-shadow: 4px 5px 0 var(--black); }
        .scene-strip-t {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 600;
          font-size: 28px;
          letter-spacing: -1px;
          line-height: 1.05;
          margin: 0;
          color: #fff;
        }
        .scene-strip-t em { color: var(--yellow); font-weight: 600; }
        .scene-strip-s {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          margin-top: 8px;
          max-width: 440px;
        }
        .scene-strip-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 22px;
          background: var(--yellow);
          color: var(--black);
          border: 2.5px solid var(--yellow);
          border-radius: 14px;
          font-weight: 900;
          font-size: 14px;
          box-shadow: 3px 3px 0 rgba(255,255,255,0.15);
          font-family: inherit;
          white-space: nowrap;
        }
        .scene-strip::after {
          content: "";
          position: absolute;
          right: -120px; top: -60px;
          width: 340px; height: 340px;
          background: radial-gradient(circle, rgba(255,212,0,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1100px) {
          .bento { grid-template-columns: 1fr 1fr; }
          .c-studio   { grid-column: 1 / 3; grid-row: 1; }
          .c-scene    { grid-column: 1; grid-row: 2; }
          .c-plan     { grid-column: 2; grid-row: 2; }
          .c-activity { grid-column: 1 / 3; grid-row: 3; }
          .c-money    { grid-column: 1; grid-row: 4; }
          .c-inbox    { grid-column: 2; grid-row: 4; }
          .greet-headline { font-size: 38px; }
        }
        @media (max-width: 700px) {
          .bento { grid-template-columns: 1fr; }
          .c-studio,.c-scene,.c-plan,.c-activity,.c-money,.c-inbox {
            grid-column: 1; grid-row: auto;
          }
          .works-grid { grid-template-columns: repeat(3, 1fr); }
          .greet { padding: 24px 22px 22px; }
          .greet-grid { grid-template-columns: 1fr; align-items: flex-start; }
          .greet-stats { align-self: flex-start; }
          .greet-headline { font-size: 32px; letter-spacing: -1.2px; }
          .intent-row { grid-template-columns: 1fr; }
          .intent-label { padding-right: 0; }
          .intent-pills { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
          .pill { white-space: nowrap; }
          .scene-strip { grid-template-columns: 1fr; text-align: left; }
          .studio-numbers { grid-template-columns: 1fr 1fr; }
          .snum:nth-child(2) { border-right: none; }
          .snum:nth-child(1), .snum:nth-child(2) { border-bottom: 2px solid var(--black); }
        }
      `}</style>

      <div className="db-root">

        {/* ═════════════ GREETING BAND ═════════════ */}
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
              <div className="gstat accent">
                <div className="gstat-n">{loaded ? stats.total : "—"}</div>
                <div className="gstat-l">works</div>
              </div>
              <div className="gstat">
                <div className="gstat-n">{loaded ? stats.available : "—"}</div>
                <div className="gstat-l">for sale</div>
              </div>
              <div className="gstat">
                <div className="gstat-n">€{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}</div>
                <div className="gstat-l">this month</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════ INTENT BAR ═════════════ */}
        <div className="intent-row">
          <div className="intent-label">What are you here to do?</div>
          <div className="intent-pills">
            {INTENTS.map(opt => (
              <button
                key={opt.key}
                className={`pill${intent === opt.key ? " active" : ""}`}
                onClick={() => setIntent(intent === opt.key ? null : opt.key)}
              >
                <span className="num">{opt.num}</span>
                {opt.label}
              </button>
            ))}
          </div>
          {intent && (
            <button className="reset-btn" onClick={() => setIntent(null)}>
              Show everything
            </button>
          )}
          {!intent && <div />}
        </div>

        {/* ═════════════ BENTO ═════════════ */}
        <div className="bento">

          {/* ── STUDIO ── */}
          <section className={`cell c-studio${isLit("studio") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">My Studio</span>
                <h2 className="cell-title">Recent works &amp; the board</h2>
              </div>
              <Link href="/dashboard/artworks" className="cell-link">All works →</Link>
            </div>

            <div className="studio-numbers">
              <div className="snum">
                <div className="snum-l">Total</div>
                <div className="snum-v">{loaded ? stats.total : "—"}</div>
              </div>
              <div className="snum">
                <div className="snum-l">Available</div>
                <div className="snum-v">{loaded ? stats.available : "—"}</div>
              </div>
              <div className="snum">
                <div className="snum-l">In progress</div>
                <div className="snum-v">{loaded ? stats.in_progress : "—"}</div>
              </div>
              <div className="snum">
                <div className="snum-l">Sold</div>
                <div className="snum-v">{loaded ? stats.sold : "—"}</div>
              </div>
            </div>

            <div className="works-grid">
              {artworks.slice(0, 8).map((aw) => {
                const [c1, c2] = gradientFor(aw.id);
                const img = aw.images && aw.images[0];
                return (
                  <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="work">
                    <div
                      className={`work-bg${img ? " image" : ""}`}
                      style={img
                        ? { backgroundImage: `url(${img})` }
                        : { background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }
                      }
                    />
                    <div className="work-title">{aw.title}</div>
                  </Link>
                );
              })}
              {artworks.length < 8 && (
                <Link href="/dashboard/artworks/new" className="work-new">
                  <span className="plus">+</span>
                  New work
                </Link>
              )}
            </div>

            <Link href="/dashboard/moodboard" className="studio-moodrow">
              <div className="mood-strip">
                {moodboards.length > 0 ? (
                  moodboards.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id}
                      className="mood-swatch"
                      style={m.thumbnail_url
                        ? { backgroundImage: `url(${m.thumbnail_url})` }
                        : { background: ["#E8C9A8", "#5C4A3A", "#FFD400", "#1A1A1A", "#D4A574"][i % 5] }
                      }
                    />
                  ))
                ) : (
                  [0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="mood-swatch" style={{ background: ["#E8C9A8", "#5C4A3A", "#FFD400", "#1A1A1A", "#D4A574"][i] }} />
                  ))
                )}
              </div>
              <div className="moodtxt">
                <b>Your moodboard</b> — {moodboards.length > 0 ? `${moodboards.length} pins, last added ${relDate(moodboards[0]?.created_at || moodboards[0]?.updated_at)}` : "start collecting references"}
              </div>
              <span className="cell-link">Open →</span>
            </Link>
          </section>

          {/* ── SCENE ── */}
          <section className={`cell c-scene${isLit("scene") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">The Scene</span>
                <h2 className="cell-title">What's coming up</h2>
              </div>
              <Link href="/dashboard/exhibitions" className="cell-link">Events →</Link>
            </div>

            {nextEvent ? (
              <Link href="/dashboard/calendar" className="next-event">
                <div className="date-block">
                  <div className="date-m">{fmtDate(nextEvent.start_date).month}</div>
                  <div className="date-d">{fmtDate(nextEvent.start_date).day}</div>
                </div>
                <div>
                  <div className="next-t">{nextEvent.event_type || "Upcoming"}</div>
                  <div className="next-title">{nextEvent.title}</div>
                  <div className="next-meta">
                    {nextEvent.venue ? `${nextEvent.venue} · ` : ""}
                    {daysUntil(nextEvent.start_date) || "soon"}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="scene-empty" style={{ background: "var(--cream)", border: "2px dashed var(--border)", borderRadius: 12, marginBottom: 14 }}>
                No upcoming events. <Link href="/dashboard/exhibitions" style={{ color: "var(--black)", fontWeight: 900, textDecoration: "underline" }}>Add one →</Link>
              </div>
            )}

            <div className="collab-list">
              {collabs.length > 0 ? (
                collabs.slice(0, 3).map((c) => (
                  <Link key={c.id} href="/dashboard/pool" className="collab">
                    <div className="collab-av">{initials(c.title)}</div>
                    <div>
                      <div className="collab-t">{c.title}</div>
                      <div className="collab-s">{c.type || "Collaboration"} · {relDate(c.created_at)}</div>
                    </div>
                    <div className={`tag${c.status === "new" || c.status === "pending" ? " hot" : ""}`}>
                      {c.status === "new" || c.status === "pending" ? "New" : c.status || "Active"}
                    </div>
                  </Link>
                ))
              ) : (
                <Link href="/dashboard/pool" className="collab" style={{ justifyContent: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
                    Browse collab pool <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
                  </div>
                </Link>
              )}
            </div>
          </section>

          {/* ── PLANNING ── */}
          <section className={`cell c-plan${isLit("planning") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Today</span>
                <h2 className="cell-title">To-do</h2>
              </div>
            </div>

            {tasks.length > 0 ? (
              tasks.slice(0, 3).map((t) => {
                const pClass = t.priority === "high" || t.priority === "urgent" ? "" : t.priority === "low" ? " low" : " mid";
                const pLabel = t.priority === "high" || t.priority === "urgent" ? "High" : t.priority === "low" ? "Low" : "Med";
                return (
                  <Link key={t.id} href="/dashboard/tasks" className="task">
                    <div className="check" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="task-t" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                      <div className="task-meta">
                        <span className={`priority${pClass}`}>{pLabel}</span>
                        {t.due_date && <span>· {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="task-empty">All clear — nothing urgent!</div>
            )}

            <Link href="/dashboard/tasks" className="plan-add">
              <span>Add a task</span>
              <span className="arrow">→</span>
            </Link>
          </section>

          {/* ── ACTIVITY ── */}
          <section className={`cell c-activity${isLit("activity") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Recent activity</span>
                <h2 className="cell-title">Sales &amp; collectors</h2>
              </div>
              <div className="act-toggle">
                <button className={`tg${listToggle === "sales" ? " on" : ""}`} onClick={() => setListToggle("sales")}>Sales</button>
                <button className={`tg${listToggle === "clients" ? " on" : ""}`} onClick={() => setListToggle("clients")}>Collectors</button>
              </div>
            </div>

            <div className="sales-list">
              {listToggle === "sales" ? (
                recentSales.length > 0 ? (
                  recentSales.slice(0, 3).map((s) => (
                    <Link key={s.id} href="/dashboard/sales" className="sale">
                      <div className="sale-av" style={{ background: gradientFor(s.id)[0] }}>{initials(s.buyer_name)}</div>
                      <div>
                        <div className="sale-buyer">{s.buyer_name || "Unknown buyer"}</div>
                        <div className="sale-work">{s.artwork?.title || "Artwork"}</div>
                      </div>
                      <div className="sale-price">€{(s.amount || 0).toLocaleString()}</div>
                      <div className="sale-date">{relDate(s.sale_date)}</div>
                    </Link>
                  ))
                ) : (
                  <div className="sale-empty">No sales recorded yet. <Link href="/dashboard/sales" style={{ color: "var(--black)", fontWeight: 900, textDecoration: "underline" }}>Record one →</Link></div>
                )
              ) : (
                recentClients.length > 0 ? (
                  recentClients.slice(0, 3).map((c) => (
                    <Link key={c.id} href="/dashboard/clients" className="sale">
                      <div className="sale-av" style={{ background: gradientFor(c.id)[0] }}>{initials(c.full_name)}</div>
                      <div>
                        <div className="sale-buyer">{c.full_name || "Collector"}</div>
                        <div className="sale-work">{c.email || "—"}</div>
                      </div>
                      <div />
                      <div className="sale-date">{relDate(c.created_at)}</div>
                    </Link>
                  ))
                ) : (
                  <div className="sale-empty">No collectors yet. <Link href="/dashboard/clients" style={{ color: "var(--black)", fontWeight: 900, textDecoration: "underline" }}>Add one →</Link></div>
                )
              )}
            </div>
          </section>

          {/* ── MONEY ── */}
          <section className={`cell c-money${isLit("money") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Deals &amp; money</span>
                <h2 className="cell-title">This month</h2>
              </div>
              <Link href="/dashboard/analytics" className="cell-link">Analytics →</Link>
            </div>

            <div className="money-big">
              <div className="money-label">Net revenue · {new Date().toLocaleString("en-US", { month: "long" })}</div>
              <div className="money-v">€{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}</div>
              {monthDelta !== null && (
                <div className={`money-delta${monthDelta < 0 ? " down" : ""}`}>
                  {monthDelta >= 0 ? "↗" : "↘"} {monthDelta >= 0 ? "+" : ""}{monthDelta}% vs last month
                </div>
              )}
            </div>

            <div className="money-small">
              <div className="ms">
                <div className="ms-l">Papers out</div>
                <div className="ms-v">{contractsOut.out}</div>
              </div>
              <div className="ms">
                <div className="ms-l">Awaiting sig</div>
                <div className="ms-v">{contractsOut.awaiting}</div>
              </div>
            </div>

            {monthlyBars.some(b => b > 0) && (
              <div className="bar-spark">
                {monthlyBars.map((v, i) => (
                  <div
                    key={i}
                    className={`bar${i === monthlyBars.length - 1 ? " hl" : ""}`}
                    style={{ height: `${Math.max(8, (v / maxBar) * 100)}%` }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── INBOX ── */}
          <section className={`cell c-inbox${isLit("inbox") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Inbox</span>
                <h2 className="cell-title">{notifications.length > 0 ? `${notifications.length} new` : "All clear"}</h2>
              </div>
            </div>

            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((n, i) => (
                <Link key={n.id} href="/dashboard/messages" className={`inbox-item${i < 2 ? " new" : ""}`}>
                  <div className="ibx-av">{initials(n.title)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ibx-t">{n.title}</div>
                    {n.body && <div className="ibx-p">{n.body}</div>}
                  </div>
                </Link>
              ))
            ) : (
              <div className="inbox-empty">Nothing new — you're caught up ✓</div>
            )}
          </section>

        </div>

        {/* ═════════════ SCENE STRIP ═════════════ */}
        <Link href="/dashboard/map" className="scene-strip">
          <div>
            <h3 className="scene-strip-t">The Prague scene is <em>right outside your door.</em></h3>
            <div className="scene-strip-s">Events, open calls, and artists within walking distance of your studio — all on the map.</div>
          </div>
          <div className="scene-strip-btn">Open the map →</div>
        </Link>

      </div>
    </>
  );
}
