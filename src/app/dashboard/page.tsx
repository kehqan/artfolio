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

type CellKey = "studio" | "scene" | "planning" | "activity" | "money" | "inbox";

const SPOTLIGHT: Record<IntentKey, CellKey[]> = {
  make:    ["studio", "planning"],
  manage:  ["planning", "activity"],
  connect: ["scene", "inbox"],
  learn:   ["money", "activity"],
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

// Deterministic palette for collabs / artworks without imagery — used for the
// vertical color strip on collab cards and for sale avatars.
function paletteFor(seed: string): [string, string, string] {
  const palettes: [string, string, string][] = [
    ["#C73E1D", "#E89C5A", "#F5E5C0"], // warm earth
    ["#2D3142", "#4F5D75", "#BFC0C0"], // cool grey
    ["#2D6A4F", "#74C69D", "#D8F3DC"], // forest
    ["#6B2D5C", "#C73E1D", "#FFD400"], // jewel
    ["#1F2421", "#3C5045", "#7A9E7E"], // night
    ["#8B4513", "#D2691E", "#F4A460"], // umber
    ["#2C3E50", "#E74C3C", "#ECF0F1"], // editorial
    ["#5A189A", "#9D4EDD", "#E0AAFF"], // violet
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % palettes.length;
  return palettes[h];
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  /* ── State ──────────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, in_progress: 0, sold: 0, sales_month: 0, sales_total: 0, sales_prev_month: 0, followers: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [contractsOut, setContractsOut] = useState({ out: 0, awaiting: 0 });
  const [loaded, setLoaded] = useState(false);
  const [latestNote, setLatestNote] = useState<{ text: string; when: string } | null>(null);

  /* ── UI state ───────────────────────────────────────── */
  const [intent, setIntent] = useState<IntentKey | null>(null);

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
          supabase.from("artworks").select("id,title,images,status,price,medium,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
          supabase.from("tasks").select("id,title,priority,due_date,description,status,created_at").eq("user_id", user.id).neq("status", "done").order("created_at", { ascending: false }).limit(10),
          supabase.from("exhibitions").select("id,title,venue,start_date,event_type").eq("user_id", user.id).gte("start_date", new Date().toISOString().slice(0, 10)).order("start_date", { ascending: true }).limit(1),
          supabase.from("sales").select("amount,sale_date").eq("user_id", user.id),
          supabase.from("sales").select("amount").eq("user_id", user.id).gte("sale_date", monthStart),
          supabase.from("sales").select("amount").eq("user_id", user.id).gte("sale_date", prevMonthStart).lte("sale_date", prevMonthEnd),
          supabase.from("conversations").select("id").eq("user_id", user.id),
          supabase.from("notifications").select("id,title,body,type,created_at,read").eq("user_id", user.id).eq("read", false).order("created_at", { ascending: false }).limit(6),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
          supabase.from("sales").select("id,buyer_name,amount,sale_date,artwork_id").eq("user_id", user.id).order("sale_date", { ascending: false }).limit(4),
          supabase.from("clients").select("id,full_name,email,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
          supabase.from("collaborations").select("id,title,type,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
          supabase.from("contracts").select("status").eq("user_id", user.id),
        ]);

        setProfile(prof || null);
        setArtworks(awRecent || []);
        setTasks(tk || []);
        setNextEvent((evNext || [])[0] || null);
        setNotifications(notifs || []);
        setUnreadMessages((msgs || []).length);
        setRecentSales(rSales || []);
        setRecentClients(rClients || []);
        setCollabs(collabData || []);

        // Latest note — pull the most recent task description as a stand-in
        // "studio note" until we ship the proper sketchbook entity.
        const tkWithDescription = (tk || []).find((t: any) => t.description && t.description.trim().length > 0);
        if (tkWithDescription) {
          setLatestNote({
            text: tkWithDescription.description.slice(0, 80),
            when: tkWithDescription.created_at,
          });
        }

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

  const todayFmt = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  // Greeting subtitle — observational, never cheerleading
  const collabsLen = collabs.length;
  const tasksLen = tasks.length;
  const observations: string[] = [];
  if (unreadMessages > 0) observations.push(`${unreadMessages} new message${unreadMessages > 1 ? "s" : ""}`);
  if (collabsLen > 0) observations.push(`${collabsLen} collab thread${collabsLen > 1 ? "s" : ""}`);
  if (nextEvent) {
    const d = daysUntil(nextEvent.start_date);
    if (d) observations.push(`${nextEvent.title} ${d}`);
  }
  const greetSub = observations.length > 0
    ? observations.slice(0, 2).join(" · ") + "."
    : "A quiet week so far. The work doesn't mind quiet.";

  // Counts for the focus pills
  const pillCount = (key: IntentKey): number => {
    if (key === "manage") return tasksLen;
    if (key === "connect") return unreadMessages;
    return 0;
  };

  // Anchor + salon-hang slot assignment from real artworks
  const wallPieces = artworks.slice(0, 5);
  const anchor = wallPieces[0];
  const salonHang = wallPieces.slice(1, 5);

  // Humane Sales note based on state
  const salesNote = (() => {
    if (stats.sales_month > 0) return "Real money in the door.";
    if (stats.sales_prev_month > 0) return "Last month landed. This one's still open.";
    return "A quiet month. The work goes on.";
  })();

  // Humane Reach note
  const reachNote = stats.followers > 0
    ? "People paying attention to your front door."
    : "Your audience will gather here.";

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

        /* ─── GREETING + INTEGRATED FOCUS ─── */
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
        .greet-eyebrow .line {
          width: 28px; height: 1.5px; background: var(--muted);
        }
        .greet-headline {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 46px;
          letter-spacing: -1.6px;
          line-height: 1;
          color: var(--ink);
          margin: 0;
        }
        .greet-headline em {
          font-style: italic;
          font-weight: 400;
          color: var(--muted);
        }
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
        .greet-stats {
          display: flex;
          gap: 0;
          align-items: stretch;
        }
        .gstat {
          padding: 14px 22px;
          border-left: 1.5px solid var(--line);
          text-align: left;
        }
        .gstat:first-child { border-left: none; padding-left: 0; }
        .gstat-n {
          font-family: 'Fraunces', serif;
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -1.2px;
          line-height: 1;
          color: var(--ink);
        }
        .gstat-l {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 6px;
        }

        /* Focus question — integrated, no panel */
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
        .focus-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
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
          transition: all .15s;
        }
        .pill:hover {
          background: var(--ink);
          color: var(--cream);
        }
        .pill:hover .pill-count {
          background: var(--yellow);
          color: var(--ink);
          border-color: var(--yellow);
        }
        .pill.active {
          background: var(--ink);
          color: var(--cream);
        }
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
          line-height: 1;
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
          text-decoration-thickness: 1.5px;
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
          transition: opacity .3s, filter .3s;
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
          cursor: pointer;
          white-space: nowrap;
        }

        /* ─── STUDIO CELL — THE WALL ─── */
        .c-studio { grid-column: 1; grid-row: 1; }

        .studio-numbers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-bottom: 22px;
          border-top: 1.5px solid var(--line);
          border-bottom: 1.5px solid var(--line);
        }
        .snum {
          padding: 14px 18px;
          border-right: 1.5px solid var(--line);
        }
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
          left: 6%; right: 6%;
          top: 6px;
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
          transition: transform .2s ease, box-shadow .2s ease;
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
          display: block;
        }

        /* Anchor */
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

        /* Salon hang slots */
        .piece.p2 { left: 41%; top: 22px;  width: 22%; height: 158px; transform: rotate(1.2deg);  z-index: 2; }
        .piece.p3 { left: 65%; top: 12px;  width: 23%; height: 175px; transform: rotate(-1.5deg); z-index: 2; }
        .piece.p4 { left: 41%; top: 198px; width: 16%; height: 108px; transform: rotate(-0.8deg); z-index: 2; }

        /* The empty frame — promoted to a real focal slot */
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
        .piece.empty-frame:hover {
          background: var(--yellow);
        }
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

        /* Title pins on pieces */
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
        .anchor .piece-pin {
          font-size: 13px;
          padding: 6px 10px;
        }

        /* Sketch note — footer strip under the wall */
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

        /* ─── SCENE CELL ─── */
        .c-scene { grid-column: 2; grid-row: 1; }
        .scene-list { flex: 1; display: flex; flex-direction: column; gap: 10px; }

        .collab {
          display: block;
          padding: 14px;
          border: 2px solid var(--ink);
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          text-decoration: none;
          color: var(--ink);
          box-shadow: 2px 3px 0 var(--ink);
          transition: transform .15s;
          position: relative;
          overflow: hidden;
        }
        .collab:hover { transform: translate(-1px, -1px); }
        .collab-texture {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 6px;
        }
        .collab-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-left: 8px;
        }
        .collab-av {
          width: 42px; height: 42px;
          border-radius: 50%;
          border: 2px solid var(--ink);
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--yellow);
          color: var(--ink);
        }
        .collab-body { flex: 1; min-width: 0; }
        .collab-head-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .collab-name {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -0.3px;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .collab-disc {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
        }
        .collab-fragment {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13.5px;
          color: var(--ink);
          line-height: 1.35;
          margin-top: 6px;
          margin-bottom: 8px;
        }
        .collab-fragment-date {
          font-style: normal;
          font-weight: 700;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .collab-foot {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 9px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 99px;
          border: 1.5px solid var(--ink);
          background: var(--cream-deep);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .tag.hot { background: var(--yellow); }
        .tag.muted { border-color: var(--muted-soft); color: var(--muted); background: transparent; }
        .collab-palette {
          display: flex;
          gap: 3px;
          margin-left: auto;
        }
        .swatch {
          width: 14px; height: 14px;
          border: 1.5px solid var(--ink);
          border-radius: 3px;
        }

        .scene-empty {
          padding: 28px 16px;
          text-align: center;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--muted);
          line-height: 1.4;
        }

        /* Scene CTAs at the foot */
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
          transition: all .15s;
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
        .scene-cta.ghost:hover {
          background: var(--cream-deep);
        }
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
          transition: transform .15s;
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
          transition: transform .15s;
        }
        .plan-add:hover { transform: translate(-1px, -1px); }

        /* ─── ROW 2 ─── */
        .c-activity { grid-column: 1; grid-row: 2; }
        .c-money    { grid-column: 2; grid-row: 2; }
        .c-inbox    { grid-column: 3; grid-row: 2; }

        /* Activity */
        .activity-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          text-decoration: none;
          color: inherit;
        }
        .activity-row:last-child { border-bottom: none; }
        .activity-when {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          flex-shrink: 0;
          width: 80px;
        }
        .activity-what {
          font-size: 13.5px;
          font-weight: 600;
          flex: 1;
          min-width: 0;
        }
        .activity-what em {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-weight: 500;
          color: var(--ink);
        }
        .activity-amt {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: -0.4px;
          color: var(--ink);
          white-space: nowrap;
        }
        .activity-empty {
          padding: 28px 16px;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
        }

        /* Money */
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
          transition: transform .15s;
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

        /* Inbox */
        .inbox-empty {
          padding: 8px 0;
        }
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
          transition: transform .15s;
        }
        .inbox-item:hover { transform: translate(-1px, -1px); }
        .ibx-av {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--yellow);
          border: 2px solid var(--ink);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900;
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
          .c-activity { grid-column: 1 / 3; grid-row: 3; }
          .c-money    { grid-column: 1; grid-row: 4; }
          .c-inbox    { grid-column: 2; grid-row: 4; }
          .greet-headline { font-size: 38px; }
          .focus { grid-template-columns: 1fr; }
          .focus-q { padding-bottom: 8px; }
        }
        @media (max-width: 700px) {
          .db-root { padding: 0 16px 60px; }
          .bento { grid-template-columns: 1fr; }
          .c-studio,.c-scene,.c-plan,.c-activity,.c-money,.c-inbox {
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
          .piece.empty-frame { width: 28%; height: 95px; left: 71%; top: 175px; }
          .studio-numbers { grid-template-columns: 1fr 1fr; }
          .snum:nth-child(2) { border-right: none; }
          .snum:nth-child(1), .snum:nth-child(2) { border-bottom: 1.5px solid var(--line); }
        }
      `}</style>

      <div className="db-root">

        {/* ═════════════ GREETING + INTEGRATED FOCUS ═════════════ */}
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
                <div className="gstat-n">€{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}</div>
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

          {/* ── STUDIO — THE WALL ── */}
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

            {/* THE WALL */}
            <div className="wall">

              {anchor ? (
                <Link href={`/dashboard/artworks/${anchor.id}`} className="piece anchor">
                  {anchor.images && anchor.images[0] ? (
                    <div className="piece-img" style={{ backgroundImage: `url(${anchor.images[0]})` }} />
                  ) : (
                    <div
                      className="piece-img"
                      style={{
                        background: `linear-gradient(135deg, ${paletteFor(anchor.id)[0]} 0%, ${paletteFor(anchor.id)[1]} 100%)`,
                      }}
                    />
                  )}
                  <div className="piece-pin">{anchor.title || "Untitled"}</div>
                </Link>
              ) : (
                <Link href="/dashboard/artworks/new" className="piece empty-frame" style={{ left: "3%", top: "16px", width: "35%", height: "270px", transform: "rotate(-0.5deg)" }}>
                  <div className="empty-frame-text">
                    <div className="ef-mark">+</div>
                    <div className="ef-line">Hang the first piece</div>
                  </div>
                </Link>
              )}

              {salonHang.map((aw, i) => {
                const slot = ["p2", "p3", "p4"][i];
                if (!slot) return null;
                return (
                  <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className={`piece ${slot}`}>
                    {aw.images && aw.images[0] ? (
                      <div className="piece-img" style={{ backgroundImage: `url(${aw.images[0]})` }} />
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

              {/* The empty frame — always present as the CTA, unless wall is fully empty */}
              {anchor && (
                <Link href="/dashboard/artworks/new" className="piece empty-frame">
                  <div className="empty-frame-text">
                    <div className="ef-mark">+</div>
                    <div className="ef-line">Hang something new</div>
                  </div>
                </Link>
              )}

            </div>

            {/* Sketch note strip — uses real task description as a stand-in for sketchbook */}
            {latestNote && (
              <div className="wall-note">
                <div className="wall-note-label">Note · {relDate(latestNote.when)}</div>
                <div className="wall-note-content">&ldquo;{latestNote.text}&rdquo;</div>
                <div className="wall-note-foot">From the notebook</div>
              </div>
            )}
          </section>

          {/* ── SCENE — RICHER COLLAB CARDS ── */}
          <section className={`cell c-scene${isLit("scene") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">The Scene</span>
                <h2 className="cell-title">Live now</h2>
              </div>
            </div>

            <div className="scene-list">
              {nextEvent && (
                <Link href="/dashboard/calendar" className="collab">
                  <div className="collab-texture" style={{ background: "linear-gradient(180deg, #FFD400 0%, #C73E1D 100%)" }} />
                  <div className="collab-row">
                    <div className="collab-av" style={{ background: "#FFD400" }}>
                      {fmtDate(nextEvent.start_date).day}
                    </div>
                    <div className="collab-body">
                      <div className="collab-head-row">
                        <div className="collab-name">{nextEvent.title}</div>
                        <div className="collab-disc">{nextEvent.event_type || "Event"}</div>
                      </div>
                      <div className="collab-fragment">
                        <span className="collab-fragment-date">
                          {fmtDate(nextEvent.start_date).month} {fmtDate(nextEvent.start_date).day} —
                        </span>
                        {" "}
                        {nextEvent.venue || "venue tbc"}{daysUntil(nextEvent.start_date) ? `, ${daysUntil(nextEvent.start_date)}` : ""}.
                      </div>
                      <div className="collab-foot">
                        <span className="tag hot">Upcoming</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {collabs.length > 0 ? (
                collabs.slice(0, nextEvent ? 2 : 3).map((c) => {
                  const palette = paletteFor(c.id);
                  const isOpen = c.status === "new" || c.status === "pending" || c.status === "open";
                  return (
                    <Link key={c.id} href="/dashboard/pool" className="collab">
                      <div
                        className="collab-texture"
                        style={{ background: `linear-gradient(180deg, ${palette[0]} 0%, ${palette[1]} 100%)` }}
                      />
                      <div className="collab-row">
                        <div className="collab-av" style={{ background: palette[1], color: "#fff" }}>
                          {initials(c.title)}
                        </div>
                        <div className="collab-body">
                          <div className="collab-head-row">
                            <div className="collab-name">{c.title || "Untitled collab"}</div>
                            <div className="collab-disc">{c.type || "Collab"}</div>
                          </div>
                          <div className="collab-fragment">
                            <span className="collab-fragment-date">{relDate(c.created_at)} —</span>
                            {" "}
                            {c.status === "new" || c.status === "pending"
                              ? "waiting for a reply."
                              : c.status === "active"
                                ? "still in motion."
                                : "in the books."}
                          </div>
                          <div className="collab-foot">
                            <span className={`tag${isOpen ? " hot" : " muted"}`}>
                              {isOpen ? "Open" : "Quiet"}
                            </span>
                            <div className="collab-palette">
                              <div className="swatch" style={{ background: palette[0] }} />
                              <div className="swatch" style={{ background: palette[1] }} />
                              <div className="swatch" style={{ background: palette[2] }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : !nextEvent ? (
                <div className="scene-empty">
                  Nothing live in the scene yet. <br />
                  Post something or wander.
                </div>
              ) : null}
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
              <div className="task-empty">Nothing pressing.</div>
            )}

            <Link href="/dashboard/tasks" className="plan-add">
              <span>Add a task</span>
              <span>→</span>
            </Link>
          </section>

          {/* ── ACTIVITY ── */}
          <section className={`cell c-activity${isLit("activity") ? (intent ? " spotlight" : "") : " dim"}`}>
            <div className="cell-head">
              <div className="cell-label">
                <span className="cell-label-tag">Recent activity</span>
                <h2 className="cell-title">The week so far</h2>
              </div>
              <Link href="/dashboard/sales" className="cell-link">All →</Link>
            </div>

            {recentSales.length > 0 || recentClients.length > 0 ? (
              <>
                {recentSales.slice(0, 2).map((s) => (
                  <Link key={s.id} href="/dashboard/sales" className="activity-row">
                    <div className="activity-when">{relDate(s.sale_date)}</div>
                    <div className="activity-what">
                      Sale to <em>{s.buyer_name || "a collector"}</em>.
                    </div>
                    <div className="activity-amt">€{(s.amount || 0).toLocaleString()}</div>
                  </Link>
                ))}
                {recentClients.slice(0, 3 - Math.min(recentSales.length, 2)).map((c) => (
                  <Link key={c.id} href="/dashboard/clients" className="activity-row">
                    <div className="activity-when">{relDate(c.created_at)}</div>
                    <div className="activity-what">
                      <em>{c.full_name || "A new collector"}</em> joined your list.
                    </div>
                    <div className="activity-amt" />
                  </Link>
                ))}
              </>
            ) : (
              <div className="activity-empty">
                Nothing has moved through the books yet. Sales and new collectors will appear here as they come.
              </div>
            )}
          </section>

          {/* ── MONEY ── */}
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
                <div className="money-value">€{loaded ? Math.round(stats.sales_month).toLocaleString() : "—"}</div>
                <div className="money-note">{salesNote}</div>
              </Link>
              <Link href="/dashboard/discover" className="money-tile live">
                <div className="money-label">Reach</div>
                <div className="money-value">{loaded ? stats.followers.toLocaleString() : "—"}</div>
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
                <h2 className="cell-title">{notifications.length > 0 ? `${notifications.length} new` : "Quiet"}</h2>
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
              <div className="inbox-empty">
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
