"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ImageIcon, Bell, X, ArrowRight, Plus, Check, Mail,
  MapPin, DollarSign, Users, FileText, TrendingUp,
  Handshake, Sparkles, Palette, Store, Layout as LayoutIcon,
  CheckSquare, CalendarDays,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   THE ATELIER — Bento Dashboard
   Ripe design system · Neo-brutalism × warm cream
   ══════════════════════════════════════════════════════════════════ */

/* ── Helpers ───────────────────────────────────────────────────── */
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function dateMonth(d?: string) {
  if (!d) return { month: "—", day: "—" };
  const dt = new Date(d);
  return {
    month: dt.toLocaleDateString("en-US", { month: "short" }),
    day: String(dt.getDate()),
  };
}

/* ── Notification config (used in bell dropdown) ───────────────── */
const NOTIF_CFG: Record<string, { icon: any; color: string; bg: string }> = {
  follow:  { icon: Users,      color: "#4ECDC4", bg: "#F0FDF4" },
  sale:    { icon: DollarSign, color: "#16A34A", bg: "#DCFCE7" },
  collab:  { icon: Handshake,  color: "#CA8A04", bg: "#FEF9C3" },
  system:  { icon: Sparkles,   color: "#8B5CF6", bg: "#EDE9FE" },
  artwork: { icon: ImageIcon,  color: "#FF6B6B", bg: "#FFE4E6" },
};

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  /* ── Data state ─────────────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0, available: 0, in_progress: 0, sold: 0,
    sales_month: 0, sales_total: 0, followers: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loaded, setLoaded] = useState(false);

  /* ── UI state ───────────────────────────────────────────────── */
  const [todoFilter, setTodoFilter] = useState<"important" | "upcoming">("important");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* ── Load everything ────────────────────────────────────────── */
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
        { data: co },
        { data: notifs },
        { data: salesAll },
        { count: followerCount },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name,username,avatar_url").eq("id", user.id).single(),
        // Full list for stats
        supabase.from("artworks").select("id,status").eq("user_id", user.id),
        // 3 most recent for display
        supabase.from("artworks").select("id,title,images,status,price").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        // Moodboards — 2 recent. Assumes a `moodboards` table with cover_image column.
        // If table/columns differ, query silently returns empty and cell shows its empty state.
        supabase.from("moodboards").select("id,title,cover_image,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2),
        supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").order("due_date", { ascending: true }).limit(4),
        // Upcoming events (list of 2 for the events card)
        supabase.from("exhibitions").select("*").eq("user_id", user.id).gte("end_date", new Date().toISOString().split("T")[0]).order("start_date", { ascending: true }).limit(2),
        // Single next event (for the schedule panel)
        supabase.from("exhibitions").select("*").eq("user_id", user.id).gte("end_date", new Date().toISOString().split("T")[0]).order("start_date", { ascending: true }).limit(1).single(),
        // Open collabs from ANY user (community feed) — newest first
        supabase.from("collaborations").select("id,title,description,type,user_id,status,created_at").eq("status", "Open").order("created_at", { ascending: false }).limit(3),
        // Notifications for bell dropdown
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        // Sales for Studio stats + Money tile
        supabase.from("sales").select("sale_price,sale_date,status").eq("user_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      ]);

      setProfile(prof);
      setArtworks(awRecent || []);
      setMoodboards(mb || []);
      setTasks(tk || []);
      setEvents(evAll || []);
      setNextEvent(evNext);
      setNotifications(notifs || []);

      // Enrich collabs with poster profile (for avatars)
      const enrichedCollabs = co || [];
      if (enrichedCollabs.length) {
        const uids = enrichedCollabs.map((c: any) => c.user_id).filter(Boolean);
        if (uids.length) {
          const { data: posters } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", uids);
          const map: Record<string, any> = {};
          posters?.forEach((p: any) => { map[p.id] = p; });
          enrichedCollabs.forEach((c: any) => { c.poster = map[c.user_id]; });
        }
      }
      setCollabs(enrichedCollabs);

      // Compute stats
      const list = awAll || [];
      const completed = (salesAll || []).filter((s: any) => s.status?.toLowerCase() === "completed");
      const totalRev = completed.reduce((a: number, s: any) => a + (s.sale_price || 0), 0);
      const monthRev = completed
        .filter((s: any) => s.sale_date && new Date(s.sale_date) >= new Date(monthStart))
        .reduce((a: number, s: any) => a + (s.sale_price || 0), 0);

      setStats({
        total: list.length,
        available: list.filter((a: any) => String(a.status).toLowerCase() === "available").length,
        in_progress: list.filter((a: any) => {
          const s = String(a.status).toLowerCase().replace(/ /g, "_");
          return s === "in_progress";
        }).length,
        sold: list.filter((a: any) => String(a.status).toLowerCase() === "sold").length,
        sales_month: monthRev,
        sales_total: totalRev,
        followers: followerCount || 0,
      });

      // Unread message count — messages table may not exist yet; treat errors as 0.
      try {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("read", false);
        setUnreadMessages(count || 0);
      } catch {
        setUnreadMessages(0);
      }

      setLoaded(true);
    });
  }, []);

  /* ── Close bell dropdown on outside click ──────────────────── */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    if (bellOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [bellOpen]);

  /* ── Notification actions ──────────────────────────────────── */
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

  /* ── Computed ─────────────────────────────────────────────── */
  const fname = profile?.full_name?.split(" ")[0] || "Artist";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "A";
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const storeUrl = profile?.username ? `/${profile.username}` : null;

  // Todos filter: important = high priority, upcoming = has due date
  const filteredTasks = tasks.filter(t => {
    if (todoFilter === "important") return t.priority === "high";
    return !!t.due_date;
  }).slice(0, 3);

  const addWorkTileCount = Math.max(0, 3 - artworks.length); // pad work grid to show at least the add tile

  return (
    <>
      <style>{`
        /* ══ SHARED CELL CHASSIS ══ */
        .cell {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 18px;
          box-shadow: 4px 5px 0 #D4C9A8;
          padding: 18px 20px 20px;
          overflow: hidden;
          position: relative;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .cell-title {
          font-size: 15px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -0.3px;
          margin: 0 0 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.1;
        }
        .cell-title::before {
          content: "";
          width: 8px; height: 8px; border-radius: 3px;
          border: 1.5px solid #111110;
          background: var(--dot, #FFD400);
          flex-shrink: 0;
        }
        .cell-meta {
          font-size: 11px; font-weight: 600;
          color: #9B8F7A;
          margin-bottom: 14px;
          font-style: italic;
        }

        /* ══ HEADER ══ */
        .db-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .db-hello { display: flex; align-items: center; gap: 14px; }
        .db-avatar {
          width: 52px; height: 52px;
          border-radius: 16px;
          border: 2.5px solid #111110;
          background: #FFD400;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 900; color: #111110;
          box-shadow: 3px 3px 0 #111110;
          flex-shrink: 0;
          overflow: hidden;
        }
        .db-date {
          font-size: 11px; font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 2px;
        }
        .db-h1 {
          font-size: 28px; font-weight: 900;
          letter-spacing: -0.8px;
          margin: 0; line-height: 1.05;
          color: #111110;
        }
        .db-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #FFD400;
          border: 2.5px solid #111110;
          border-radius: 12px;
          font-size: 13px; font-weight: 800;
          box-shadow: 3px 3px 0 #111110;
          cursor: pointer;
          font-family: inherit;
          color: #111110;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .db-add-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 #111110;
        }

        /* ══ BENTO GRID ══ */
        .bento {
          display: grid;
          grid-template-columns: 1.35fr 0.95fr 0.7fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }

        /* ── My Studio (big, top-left) ── */
        .c-studio { grid-column: 1; grid-row: 1; }
        .c-studio .cell-title { --dot: #FFD400; }
        .studio-stats {
          display: flex;
          gap: 20px;
          padding: 10px 14px;
          background: #FFFBEA;
          border: 2px solid #111110;
          border-radius: 12px;
          margin-bottom: 18px;
          overflow-x: auto;
        }
        .studio-stat {
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-right: 20px;
          border-right: 1.5px dashed #E8E0D0;
        }
        .studio-stat:last-child { border-right: none; padding-right: 0; }
        .studio-stat-label {
          font-size: 9.5px; font-weight: 800; color: #9B8F7A;
          text-transform: uppercase; letter-spacing: 0.12em;
          margin-bottom: 2px; white-space: nowrap;
        }
        .studio-stat-value {
          font-size: 20px; font-weight: 900; color: #111110;
          letter-spacing: -0.5px; line-height: 1; white-space: nowrap;
        }
        .studio-sub {
          font-size: 11px; font-weight: 800; color: #5C5346;
          text-transform: uppercase; letter-spacing: 0.12em;
          margin: 2px 0 10px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .view-all {
          font-size: 10.5px; color: #9B8F7A;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: none;
          display: inline-flex; align-items: center; gap: 3px;
          text-decoration: none;
          transition: color 0.15s;
        }
        .view-all:hover { color: #111110; }

        .works-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .work-tile {
          aspect-ratio: 1 / 1;
          border: 2px solid #111110;
          border-radius: 12px;
          background: #FAF7F3;
          overflow: hidden;
          position: relative;
          box-shadow: 2px 2px 0 #D4C9A8;
          transition: all 0.2s;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .work-tile:hover {
          border-color: #111110;
          box-shadow: 3px 3px 0 #111110;
          transform: translate(-1px, -1px);
        }
        .work-tile img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .work-tile-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: #D4C9A8;
        }
        .work-tile-title {
          position: absolute;
          left: 8px; right: 8px; bottom: 8px;
          background: rgba(17,17,16,0.82);
          color: #fff;
          font-size: 10px; font-weight: 800;
          padding: 3px 7px;
          border-radius: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .work-tile-add {
          background: #FAF7F3;
          border: 2px dashed #9B8F7A;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          box-shadow: none;
        }
        .work-tile-add:hover { border-color: #111110; border-style: solid; background: #FFFBEA; }
        .work-tile-add-plus {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 2px solid #111110;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 900; color: #111110;
          line-height: 1;
        }
        .work-tile-add-lbl {
          font-size: 10px; font-weight: 800;
          color: #5C5346;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        .studio-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding-top: 16px;
          border-top: 1.5px dashed #E8E0D0;
        }
        .studio-subcell-title {
          font-size: 12px; font-weight: 800; color: #111110;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 8px;
          display: flex; align-items: center; gap: 6px;
        }
        .studio-subcell-title::before {
          content: "";
          width: 6px; height: 6px; border-radius: 2px;
          border: 1.5px solid #111110;
        }
        .front-door-title::before { background: #FF6B6B; }
        .moodboard-title::before { background: #95E1D3; }
        .front-door-row { display: flex; gap: 8px; align-items: center; }
        .front-door-btn {
          padding: 7px 12px;
          background: #111110;
          color: #FFD400;
          border: 2px solid #111110;
          border-radius: 9px;
          font-size: 11.5px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          box-shadow: 2px 2px 0 #FFD400;
          white-space: nowrap;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .front-door-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #FFD400; }
        .front-door-url {
          flex: 1; min-width: 0;
          padding: 7px 10px;
          background: #FAF7F3;
          border: 2px dashed #D4C9A8;
          border-radius: 9px;
          font-size: 11px;
          color: #5C5346;
          font-family: monospace;
          font-weight: 700;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .front-door-url:hover { border-color: #111110; background: #FFFBEA; }
        .moodboard-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 6px;
          align-items: stretch;
        }
        .moodboard-tile {
          aspect-ratio: 1 / 1;
          border: 2px solid #111110;
          border-radius: 10px;
          background: #F0EDFF;
          overflow: hidden;
          position: relative;
          box-shadow: 2px 2px 0 #D4C9A8;
          text-decoration: none;
          transition: all 0.2s;
          display: block;
        }
        .moodboard-tile:hover { box-shadow: 3px 3px 0 #111110; transform: translate(-1px, -1px); }
        .moodboard-tile:nth-of-type(2) { background: #FFF4D6; }
        .moodboard-tile img { width: 100%; height: 100%; object-fit: cover; }
        .moodboard-tile-add {
          width: 36px;
          aspect-ratio: 1 / 1;
          background: #FAF7F3;
          border: 2px dashed #9B8F7A;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900;
          color: #111110;
          align-self: stretch;
          text-decoration: none;
          transition: all 0.15s;
        }
        .moodboard-tile-add:hover { border-color: #111110; border-style: solid; background: #FFFBEA; }

        /* ── The Scene (cols 2+3 row 1) ── */
        .c-scene { grid-column: 2 / 4; grid-row: 1; }
        .c-scene .cell-title { --dot: #FF6B6B; }
        .scene-inner {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 14px;
          height: calc(100% - 44px);
        }

        /* Collabs column */
        .collabs-feed {
          background: #FFFBEA;
          border: 2px solid #E8E0D0;
          border-radius: 12px;
          padding: 12px 14px;
        }
        .collabs-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .collabs-header-label {
          font-size: 10px; font-weight: 800; color: #9B8F7A;
          text-transform: uppercase; letter-spacing: 0.12em;
        }
        .collabs-post-btn {
          padding: 5px 10px;
          background: #111110; color: #FFD400;
          border: 1.5px solid #111110;
          border-radius: 8px;
          font-size: 10px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          display: inline-flex; align-items: center; gap: 4px;
          text-decoration: none;
          transition: transform 0.15s;
        }
        .collabs-post-btn:hover { transform: translate(-1px, -1px); }
        .collab-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0;
          border-bottom: 1px dashed #E8E0D0;
          text-decoration: none;
          color: inherit;
        }
        .collab-item:last-child { border-bottom: none; }
        .collab-item:hover .collab-name { color: #8B5CF6; }
        .collab-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 1.5px solid #111110;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900;
          flex-shrink: 0;
          overflow: hidden;
        }
        .collab-body { flex: 1; min-width: 0; }
        .collab-name {
          font-size: 11.5px; font-weight: 800;
          color: #111110;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: color 0.15s;
        }
        .collab-desc {
          font-size: 10.5px; color: #9B8F7A;
          font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Events card + map — right column of Scene */
        .scene-side {
          display: flex; flex-direction: column; gap: 10px;
          min-height: 0;
        }
        .events-card {
          background: #FFFBEA;
          border: 2px solid #E8E0D0;
          border-radius: 12px;
          padding: 12px 14px;
        }
        .events-header {
          font-size: 10px; font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 8px;
        }
        .event-item {
          display: flex; gap: 10px;
          padding: 6px 0;
          border-bottom: 1px dashed #E8E0D0;
          text-decoration: none;
          color: inherit;
        }
        .event-item:last-child { border-bottom: none; }
        .event-item:hover .event-title { color: #4ECDC4; }
        .event-date {
          width: 34px;
          border: 1.5px solid #111110;
          border-radius: 7px;
          background: #fff;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          flex-shrink: 0;
          padding: 2px 0;
        }
        .event-date-month {
          font-size: 8px; font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1;
        }
        .event-date-day {
          font-size: 13px; font-weight: 900;
          color: #111110;
          line-height: 1;
          margin-top: 1px;
        }
        .event-body { flex: 1; min-width: 0; }
        .event-title {
          font-size: 11.5px; font-weight: 800;
          color: #111110;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: color 0.15s;
        }
        .event-venue {
          font-size: 10px; color: #9B8F7A;
          font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Prague map preview */
        .scene-map {
          position: relative;
          border: 2px solid #111110;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 2px 2px 0 #D4C9A8;
          cursor: pointer;
          min-height: 150px;
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: #E8E4D8;
          transition: all 0.2s;
          text-decoration: none;
        }
        .scene-map:hover {
          box-shadow: 3px 3px 0 #111110;
          transform: translate(-1px, -1px);
        }
        .scene-map-svg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
        }
        .scene-map-label {
          position: relative; z-index: 2;
          background: rgba(17,17,16,0.92);
          color: #FFD400;
          padding: 9px 12px;
          margin: 10px;
          border-radius: 9px;
          border: 1.5px solid #111110;
          display: flex; align-items: center; gap: 8px;
          width: calc(100% - 20px);
        }
        .scene-map-label-text { flex: 1; min-width: 0; }
        .scene-map-title {
          font-size: 12px; font-weight: 900;
          line-height: 1.1;
        }
        .scene-map-sub {
          font-size: 9.5px; font-weight: 700;
          color: rgba(255, 212, 0, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }
        .scene-map-arrow { font-size: 14px; font-weight: 900; color: #FFD400; flex-shrink: 0; }

        /* ── Planning (row 2 col 1) ── */
        .c-planning { grid-column: 1; grid-row: 2; }
        .c-planning .cell-title { --dot: #8B5CF6; }
        .planning-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .planning-col { display: flex; flex-direction: column; gap: 8px; }
        .planning-col-title {
          font-size: 11px; font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 2px;
        }
        .planning-col-title-count {
          background: #8B5CF6; color: #fff;
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 900;
        }
        .todo-pills {
          display: flex; gap: 4px; margin-bottom: 4px;
        }
        .todo-pill {
          padding: 3px 10px;
          background: #fff;
          border: 1.5px solid #E8E0D0;
          border-radius: 9999px;
          font-size: 10px; font-weight: 800;
          color: #9B8F7A;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .todo-pill:hover { border-color: #111110; color: #111110; }
        .todo-pill.active {
          background: #111110;
          border-color: #111110;
          color: #FFD400;
        }
        .todo-item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          background: #FFFBEA;
          border: 1.5px solid #E8E0D0;
          border-radius: 9px;
          font-size: 11.5px;
          color: #111110;
          font-weight: 700;
          text-decoration: none;
          overflow: hidden;
        }
        .todo-item:hover { border-color: #111110; }
        .todo-item-text {
          flex: 1; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .todo-check {
          width: 13px; height: 13px;
          border: 1.5px solid #111110;
          border-radius: 3px;
          background: #fff;
          flex-shrink: 0;
        }
        .todo-add {
          padding: 7px 10px;
          border: 1.5px dashed #9B8F7A;
          border-radius: 9px;
          font-size: 11.5px;
          font-weight: 800;
          color: #5C5346;
          text-align: left;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          display: flex; align-items: center; gap: 6px;
          text-decoration: none;
          transition: all 0.15s;
        }
        .todo-add:hover { border-color: #111110; border-style: solid; color: #111110; background: #FFFBEA; }

        .schedule-card {
          background: #FFFBEA;
          border: 1.5px solid #E8E0D0;
          border-radius: 12px;
          padding: 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
        }
        .schedule-date {
          font-size: 32px; font-weight: 900;
          color: #111110;
          letter-spacing: -1.2px;
          line-height: 1;
        }
        .schedule-date-month {
          font-size: 10px; font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 2px;
        }
        .schedule-next {
          font-size: 11px; font-weight: 700;
          color: #5C5346;
          line-height: 1.4;
        }
        .schedule-btn {
          margin-top: auto;
          padding: 7px 12px;
          background: #111110; color: #FFD400;
          border: 2px solid #111110;
          border-radius: 9px;
          font-size: 11px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          align-self: flex-start;
          box-shadow: 2px 2px 0 #FFD400;
          text-decoration: none;
          display: inline-flex;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .schedule-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #FFD400; }

        /* ── Deals & Money (row 2 col 2) ── */
        .c-money { grid-column: 2; grid-row: 2; }
        .c-money .cell-title { --dot: #16A34A; }
        .money-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .money-tile {
          background: #FFFBEA;
          border: 2px solid #E8E0D0;
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .money-tile:hover {
          border-color: #111110;
          box-shadow: 2px 2px 0 #111110;
          transform: translate(-1px, -1px);
        }
        .money-tile-icon {
          width: 30px; height: 30px;
          border-radius: 9px;
          background: #fff;
          border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .money-tile.sales .money-tile-icon { background: #FFD400; }
        .money-tile.collectors .money-tile-icon { background: #4ECDC4; }
        .money-tile.papers .money-tile-icon { background: #FFE4E6; }
        .money-tile.reach .money-tile-icon { background: #8B5CF6; }
        .money-tile-name {
          font-size: 13px; font-weight: 900;
          color: #111110;
          letter-spacing: -0.2px;
          margin-bottom: 2px;
        }
        .money-tile-desc {
          font-size: 10.5px; color: #9B8F7A;
          font-weight: 600;
          line-height: 1.3;
        }
        .money-tile-num {
          font-size: 15px; font-weight: 900;
          color: #111110;
          letter-spacing: -0.4px;
          font-family: monospace;
          margin-top: 4px;
        }

        /* ── Inbox (row 2 col 3) ── */
        .c-msgs { grid-column: 3; grid-row: 2; }
        .c-msgs .cell-title { --dot: #4ECDC4; }
        .msgs-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .msg-btn {
          position: relative;
          background: #FFFBEA;
          border: 2px solid #111110;
          border-radius: 12px;
          padding: 16px 12px 12px;
          text-align: center;
          cursor: pointer;
          box-shadow: 2px 2px 0 #111110;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          display: block;
          font-family: inherit;
        }
        .msg-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 #111110;
        }
        .msg-btn-icon {
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 6px;
        }
        .msg-btn-label {
          font-size: 11px; font-weight: 900;
          color: #111110;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .msg-btn-badge {
          position: absolute;
          top: -6px; right: -6px;
          background: #FF6B6B;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 10px;
          border: 1.5px solid #111110;
          min-width: 20px;
          line-height: 1.3;
        }

        /* ── Bell dropdown ── */
        .bell-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          max-width: calc(100vw - 32px);
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 16px;
          box-shadow: 5px 6px 0 #111110;
          z-index: 40;
          overflow: hidden;
          animation: dropdownIn 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .bell-drop-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 2px solid #111110;
          background: #FFFBEA;
        }
        .bell-drop-title {
          font-size: 13px; font-weight: 900; color: #111110;
        }
        .bell-drop-clear {
          font-size: 10px; font-weight: 800;
          color: #9B8F7A;
          background: none; border: none;
          cursor: pointer; font-family: inherit;
        }
        .bell-drop-clear:hover { color: #111110; }
        .bell-drop-list {
          max-height: 320px; overflow-y: auto;
        }
        .bell-notif-item {
          display: flex; gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid #F5F0E8;
          cursor: pointer;
          transition: background 0.15s;
        }
        .bell-notif-item:hover { background: #FFFBEA; }
        .bell-notif-item:last-child { border-bottom: none; }
        .bell-notif-dot {
          width: 30px; height: 30px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .bell-notif-body { flex: 1; min-width: 0; }
        .bell-notif-title {
          font-size: 12px; font-weight: 800;
          color: #111110;
          display: flex; align-items: center; gap: 5px;
        }
        .bell-notif-sub {
          font-size: 10.5px; color: #9B8F7A;
          font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          margin-top: 1px;
        }
        .bell-notif-time {
          font-size: 9.5px; color: #C0B8A8;
          font-weight: 600;
          margin-top: 3px;
        }
        .bell-empty {
          padding: 32px 20px;
          text-align: center;
          color: #9B8F7A;
          font-size: 13px;
          font-weight: 700;
        }

        /* ══ Responsive ══ */
        @media (max-width: 1100px) {
          .bento {
            grid-template-columns: 1fr 1fr;
          }
          .c-studio { grid-column: 1 / 3; grid-row: 1; }
          .c-scene  { grid-column: 1 / 3; grid-row: 2; }
          .c-planning { grid-column: 1; grid-row: 3; }
          .c-money    { grid-column: 2; grid-row: 3; }
          .c-msgs     { grid-column: 1 / 3; grid-row: 4; }
        }
        @media (max-width: 680px) {
          .bento { grid-template-columns: 1fr; }
          .c-studio, .c-scene, .c-planning, .c-money, .c-msgs {
            grid-column: 1; grid-row: auto;
          }
          .works-grid { grid-template-columns: repeat(2, 1fr); }
          .studio-bottom { grid-template-columns: 1fr; }
          .scene-inner { grid-template-columns: 1fr; height: auto; }
          .planning-row { grid-template-columns: 1fr; }
          .money-grid { grid-template-columns: 1fr 1fr; }
          .db-h1 { font-size: 22px; }
        }
      `}</style>

      <div>
        {/* ═══ HEADER ═══ */}
        <div className="db-header">
          <div className="db-hello">
            <div className="db-avatar">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <div className="db-date">{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
              <h1 className="db-h1">{greeting}, {fname}</h1>
            </div>
          </div>
          <Link href="/dashboard/artworks/new" className="db-add-btn">
            <Plus size={14} strokeWidth={3} /> Add Artwork
          </Link>
        </div>

        {/* ═══ BENTO ═══ */}
        <div className="bento">

          {/* ━━ MY STUDIO ━━ */}
          <section className="cell c-studio">
            <h2 className="cell-title">My Studio</h2>

            {/* Stats strip */}
            <div className="studio-stats">
              <div className="studio-stat">
                <div className="studio-stat-label">Total works</div>
                <div className="studio-stat-value">{loaded ? stats.total : "—"}</div>
              </div>
              <div className="studio-stat">
                <div className="studio-stat-label">Available</div>
                <div className="studio-stat-value">{loaded ? stats.available : "—"}</div>
              </div>
              <div className="studio-stat">
                <div className="studio-stat-label">In progress</div>
                <div className="studio-stat-value">{loaded ? stats.in_progress : "—"}</div>
              </div>
              <div className="studio-stat">
                <div className="studio-stat-label">Sold</div>
                <div className="studio-stat-value">{loaded ? stats.sold : "—"}</div>
              </div>
              <div className="studio-stat">
                <div className="studio-stat-label">This month</div>
                <div className="studio-stat-value">${loaded ? stats.sales_month.toLocaleString() : "—"}</div>
              </div>
            </div>

            {/* My Works */}
            <div className="studio-sub">
              <span>My Works</span>
              <Link href="/dashboard/artworks" className="view-all">
                View all <ArrowRight size={11} />
              </Link>
            </div>

            <div className="works-grid">
              {artworks.map(aw => {
                const img = Array.isArray(aw.images) ? aw.images[0] : null;
                return (
                  <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="work-tile">
                    {img ? (
                      <img src={img} alt={aw.title} />
                    ) : (
                      <div className="work-tile-empty">
                        <ImageIcon size={28} />
                      </div>
                    )}
                    <div className="work-tile-title">{aw.title || "Untitled"}</div>
                  </Link>
                );
              })}
              {/* Pad with empty placeholders only if we have fewer than 3 real works, so grid stays visually full */}
              {Array.from({ length: addWorkTileCount }).map((_, i) => (
                <div key={`ph-${i}`} className="work-tile" style={{ boxShadow: "none", opacity: 0.5 }}>
                  <div className="work-tile-empty">
                    <ImageIcon size={24} />
                  </div>
                </div>
              ))}
              <Link href="/dashboard/artworks/new" className="work-tile work-tile-add">
                <div className="work-tile-add-plus">+</div>
                <div className="work-tile-add-lbl">Add artwork</div>
              </Link>
            </div>

            {/* Front Door + Moodboard */}
            <div className="studio-bottom">
              <div>
                <div className="studio-subcell-title front-door-title">My Front Door</div>
                <div className="front-door-row">
                  <Link href="/dashboard/mystore" className="front-door-btn">Edit store</Link>
                  {storeUrl ? (
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="front-door-url">
                      <span style={{ fontSize: 12, flexShrink: 0 }}>↗</span>
                      {storeUrl}
                    </a>
                  ) : (
                    <div className="front-door-url" style={{ color: "#C0B8A8" }}>No username set</div>
                  )}
                </div>
              </div>
              <div>
                <div className="studio-subcell-title moodboard-title">Moodboard</div>
                <div className="moodboard-row">
                  {moodboards.slice(0, 2).map(mb => (
                    <Link key={mb.id} href={`/dashboard/moodboard/${mb.id}`} className="moodboard-tile">
                      {mb.cover_image && <img src={mb.cover_image} alt={mb.title} />}
                    </Link>
                  ))}
                  {/* Pad with empty tiles if we have fewer than 2 */}
                  {Array.from({ length: Math.max(0, 2 - moodboards.length) }).map((_, i) => (
                    <Link key={`mb-ph-${i}`} href="/dashboard/moodboard" className="moodboard-tile" style={{ opacity: 0.5 }} />
                  ))}
                  <Link href="/dashboard/moodboard" className="moodboard-tile-add">+</Link>
                </div>
              </div>
            </div>
          </section>

          {/* ━━ THE SCENE ━━ */}
          <section className="cell c-scene">
            <h2 className="cell-title">The Scene</h2>
            <div className="cell-meta">What's happening in the community</div>

            <div className="scene-inner">
              {/* Collabs */}
              <div className="collabs-feed">
                <div className="collabs-header">
                  <div className="collabs-header-label">Open collabs · {collabs.length}</div>
                  <Link href="/dashboard/pool" className="collabs-post-btn">
                    <Plus size={10} strokeWidth={3} /> Post
                  </Link>
                </div>
                {collabs.length === 0 ? (
                  <div style={{ padding: "12px 0", fontSize: 11, color: "#9B8F7A", fontWeight: 600, textAlign: "center" }}>
                    No open collabs right now.
                  </div>
                ) : (
                  collabs.map((c, i) => {
                    const colors = ["#FFD400", "#4ECDC4", "#FF6B6B"];
                    const poster = c.poster;
                    const initials = poster?.full_name
                      ? poster.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                      : "??";
                    return (
                      <Link key={c.id} href="/dashboard/pool" className="collab-item">
                        <div className="collab-avatar" style={{ background: colors[i % colors.length], color: i === 2 ? "#fff" : "#111110" }}>
                          {poster?.avatar_url
                            ? <img src={poster.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : initials}
                        </div>
                        <div className="collab-body">
                          <div className="collab-name">{poster?.full_name || "Anonymous"}</div>
                          <div className="collab-desc">{c.title}{c.type ? ` · ${c.type}` : ""}</div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Events + Map stack */}
              <div className="scene-side">
                <div className="events-card">
                  <div className="events-header">Events · Next {events.length || 0}</div>
                  {events.length === 0 ? (
                    <div style={{ padding: "8px 0", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                      No upcoming events.
                    </div>
                  ) : (
                    events.map(ev => {
                      const d = dateMonth(ev.start_date);
                      return (
                        <Link key={ev.id} href="/dashboard/exhibitions" className="event-item">
                          <div className="event-date">
                            <div className="event-date-month">{d.month}</div>
                            <div className="event-date-day">{d.day}</div>
                          </div>
                          <div className="event-body">
                            <div className="event-title">{ev.title}</div>
                            <div className="event-venue">{ev.venue || "No venue"}</div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Prague map preview */}
                <Link href="/dashboard/map" className="scene-map">
                  <svg className="scene-map-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="240" fill="#F0E8D0"/>
                    <rect width="400" height="240" fill="#EBE1C5" opacity="0.5"/>
                    <path d="M 50 -10 Q 130 70 100 130 Q 85 190 180 230 Q 220 250 260 270" stroke="#A5D3E8" strokeWidth="18" fill="none" strokeLinecap="round"/>
                    <path d="M 50 -10 Q 130 70 100 130 Q 85 190 180 230 Q 220 250 260 270" stroke="#7FB8D1" strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.3"/>
                    <g stroke="#D4C9A8" strokeWidth="2.5" fill="none" opacity="0.7">
                      <path d="M 0 60 L 400 90"/>
                      <path d="M 0 160 L 400 130"/>
                      <path d="M 60 0 L 90 240"/>
                      <path d="M 220 0 L 250 240"/>
                      <path d="M 310 0 L 340 240"/>
                    </g>
                    <g stroke="#D4C9A8" strokeWidth="1.2" fill="none" opacity="0.5">
                      <path d="M 0 110 L 400 125"/>
                      <path d="M 0 200 L 400 195"/>
                      <path d="M 140 0 L 160 240"/>
                      <path d="M 370 0 L 385 240"/>
                    </g>
                    <path d="M 160 30 Q 200 20 230 45 Q 240 75 210 85 Q 175 90 160 60 Z" fill="#C6D9A8" opacity="0.65"/>
                    <path d="M 290 150 Q 330 140 350 170 Q 345 200 310 200 Q 280 185 290 150 Z" fill="#C6D9A8" opacity="0.65"/>
                    <rect x="188" y="100" width="34" height="26" fill="#E5D5A8" stroke="#9B8F7A" strokeWidth="0.8" opacity="0.7"/>
                    <g>
                      <circle cx="140" cy="95" r="9" fill="#111110"/>
                      <circle cx="140" cy="95" r="5" fill="#FFD400"/>
                      <circle cx="260" cy="155" r="9" fill="#111110"/>
                      <circle cx="260" cy="155" r="5" fill="#FF6B6B"/>
                      <circle cx="330" cy="75" r="9" fill="#111110"/>
                      <circle cx="330" cy="75" r="5" fill="#4ECDC4"/>
                      <circle cx="90" cy="180" r="9" fill="#111110"/>
                      <circle cx="90" cy="180" r="5" fill="#8B5CF6"/>
                    </g>
                  </svg>
                  <div className="scene-map-label">
                    <MapPin size={14} color="#FFD400" strokeWidth={2.4} style={{ flexShrink: 0 }} />
                    <div className="scene-map-label-text">
                      <div className="scene-map-title">Prague art scene</div>
                      <div className="scene-map-sub">Open the map</div>
                    </div>
                    <span className="scene-map-arrow">→</span>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* ━━ PLANNING ━━ */}
          <section className="cell c-planning">
            <h2 className="cell-title">Planning</h2>
            <div className="cell-meta">Your to-dos and what's ahead</div>

            <div className="planning-row">
              {/* To-do column */}
              <div className="planning-col">
                <div className="planning-col-title">
                  To-do list
                  {tasks.length > 0 && <span className="planning-col-title-count">{tasks.length}</span>}
                </div>
                <div className="todo-pills">
                  <button
                    className={`todo-pill ${todoFilter === "important" ? "active" : ""}`}
                    onClick={() => setTodoFilter("important")}>
                    Important
                  </button>
                  <button
                    className={`todo-pill ${todoFilter === "upcoming" ? "active" : ""}`}
                    onClick={() => setTodoFilter("upcoming")}>
                    Upcoming
                  </button>
                </div>
                {filteredTasks.length === 0 ? (
                  <div style={{ padding: "10px 0", fontSize: 11, color: "#9B8F7A", fontWeight: 600, fontStyle: "italic" }}>
                    {todoFilter === "important" ? "Nothing marked important." : "Nothing scheduled."}
                  </div>
                ) : (
                  filteredTasks.map(t => (
                    <Link key={t.id} href="/dashboard/tasks" className="todo-item">
                      <div className="todo-check" />
                      <div className="todo-item-text">{t.title}</div>
                    </Link>
                  ))
                )}
                <Link href="/dashboard/tasks" className="todo-add">
                  <Plus size={12} strokeWidth={2.5} /> New task
                </Link>
              </div>

              {/* Schedule column */}
              <div className="planning-col">
                <div className="planning-col-title">My schedule</div>
                <div className="schedule-card">
                  {nextEvent ? (
                    <>
                      <div>
                        <div className="schedule-date-month">{dateMonth(nextEvent.start_date).month} · Next event</div>
                        <div className="schedule-date">{dateMonth(nextEvent.start_date).day}</div>
                      </div>
                      <div className="schedule-next">
                        {nextEvent.title}<br />
                        <span style={{ color: "#9B8F7A" }}>{nextEvent.venue || "No venue"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="schedule-date-month">Nothing scheduled</div>
                        <div className="schedule-date" style={{ color: "#C0B8A8" }}>—</div>
                      </div>
                      <div className="schedule-next" style={{ color: "#9B8F7A", fontStyle: "italic" }}>
                        Your calendar is clear.
                      </div>
                    </>
                  )}
                  <Link href="/dashboard/calendar" className="schedule-btn">View calendar</Link>
                </div>
              </div>
            </div>
          </section>

          {/* ━━ DEALS & MONEY ━━ */}
          <section className="cell c-money">
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
                <div className="money-tile-num">{loaded ? `${stats.followers}` : "—"}</div>
              </Link>
            </div>
          </section>

          {/* ━━ INBOX ━━ */}
          <section className="cell c-msgs">
            <h2 className="cell-title">Inbox</h2>
            <div className="cell-meta">Messages &amp; notifications</div>

            <div className="msgs-row">
              <Link href="/dashboard/messages" className="msg-btn">
                {unreadMessages > 0 && <div className="msg-btn-badge">{unreadMessages}</div>}
                <div className="msg-btn-icon"><Mail size={22} color="#111110" strokeWidth={2.2} /></div>
                <div className="msg-btn-label">Messages</div>
              </Link>

              <div ref={bellRef} style={{ position: "relative" }}>
                <button className="msg-btn" onClick={() => setBellOpen(o => !o)}>
                  {unreadNotifs > 0 && <div className="msg-btn-badge">{unreadNotifs}</div>}
                  <div className="msg-btn-icon"><Bell size={22} color="#111110" strokeWidth={2.2} /></div>
                  <div className="msg-btn-label">Alerts</div>
                </button>

                {bellOpen && (
                  <div className="bell-dropdown">
                    <div className="bell-drop-head">
                      <div className="bell-drop-title">
                        Notifications {unreadNotifs > 0 && <span style={{ color: "#FF6B6B" }}>· {unreadNotifs} new</span>}
                      </div>
                      {unreadNotifs > 0 && (
                        <button className="bell-drop-clear" onClick={markAllRead}>Mark all read</button>
                      )}
                    </div>
                    <div className="bell-drop-list">
                      {notifications.length === 0 ? (
                        <div className="bell-empty">
                          <div style={{ fontSize: 22, marginBottom: 6 }}>🔔</div>
                          All quiet.
                        </div>
                      ) : (
                        notifications.map(n => {
                          const cfg = NOTIF_CFG[n.type] || NOTIF_CFG.system;
                          const Icon = cfg.icon;
                          return (
                            <div key={n.id} className="bell-notif-item" onClick={() => markRead(n.id)}
                              style={{ background: n.read ? "transparent" : "#FFFEF5" }}>
                              <div className="bell-notif-dot" style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}` }}>
                                <Icon size={14} color={cfg.color} />
                              </div>
                              <div className="bell-notif-body">
                                <div className="bell-notif-title">
                                  {n.title}
                                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B" }} />}
                                </div>
                                {n.body && <div className="bell-notif-sub">{n.body}</div>}
                                <div className="bell-notif-time">{timeAgo(n.created_at)}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
