"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ImageIcon, CalendarDays, Users, Plus, ArrowRight, DollarSign,
  Bell, Check, Sparkles, X, Palette, Building2, Brush, Frame,
  Megaphone, PencilLine, Coffee, Handshake, ShoppingBag, CheckSquare,
  HandHeart,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   THE ATELIER — Dashboard as an artist's desk
   Ripe design system · 60/30/10 (cream / ink / mango)
   ══════════════════════════════════════════════════════════════════ */

/* ── Types ─────────────────────────────────────────────────────── */
type Stats = {
  artworks: number; available: number; sold: number; in_progress: number;
  exhibitions: number; sales_total: number; sales_month: number;
  tasks_pending: number; followers: number;
};
type Notif = {
  id: string; type: string; title: string; body?: string;
  read: boolean; data?: any; created_at: string;
};
type Artwork = {
  id: string; title: string; status: string; images?: string[];
  price?: number; medium?: string; year?: number;
  width_cm?: number; height_cm?: number;
  created_at: string; updated_at?: string;
};
type UpcomingEvent = {
  id: string; title: string; start_date?: string; venue?: string; status: string;
};
type Task = {
  id: string; title: string; status: string; priority: string;
  due_date?: string; progress: number;
};
type Sale = {
  id: string; sale_price: number; sale_date?: string;
  status: string; artwork_id?: string; artwork_title?: string;
};

/* ── The helper's one question: 5 visual intent cards ────────── */
type Intent = "create" | "sell" | "show" | "plan" | "collab";
const INTENT_CARDS: {
  key: Intent;
  label: string;
  blurb: string;
  href: string;
  icon: any;
  color: string;
  banner: string;
}[] = [
  {
    key: "create",
    label: "Create",
    blurb: "Start a new piece.",
    href: "/dashboard/artworks/new",
    icon: Brush,
    color: "#FFD400",
    banner: "Let's make something. Heading to the new-artwork canvas.",
  },
  {
    key: "sell",
    label: "Sell",
    blurb: "List work & track sales.",
    href: "/dashboard/mystore",
    icon: ShoppingBag,
    color: "#4ECDC4",
    banner: "Time to sell. Opening MyStore to list or edit your works.",
  },
  {
    key: "show",
    label: "Show",
    blurb: "Events & exhibitions.",
    href: "/dashboard/exhibitions",
    icon: Building2,
    color: "#FF6B6B",
    banner: "Let's put you in the room. Opening Events & Exhibitions.",
  },
  {
    key: "plan",
    label: "Plan",
    blurb: "Tasks, calendar, deadlines.",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    color: "#8B5CF6",
    banner: "Planning mode. Opening your tasks and deadlines.",
  },
  {
    key: "collab",
    label: "Collab",
    blurb: "Find & respond to collabs.",
    href: "/dashboard/pool",
    icon: Handshake,
    color: "#95E1D3",
    banner: "Let's collaborate. Opening the collab pool.",
  },
];

/* ── Helpers ──────────────────────────────────────────────── */
function daysAgo(date?: string) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDay(d?: string) {
  if (!d) return "No date";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const NOTIF_CFG: Record<string, { icon: any; color: string }> = {
  follow:  { icon: Users,      color: "#4ECDC4" },
  sale:    { icon: DollarSign, color: "#16A34A" },
  collab:  { icon: Handshake,  color: "#CA8A04" },
  system:  { icon: Sparkles,   color: "#8B5CF6" },
  artwork: { icon: ImageIcon,  color: "#FF6B6B" },
};

const STATUS_DOT: Record<string, string> = {
  available: "#16A34A", sold: "#111110", reserved: "#D97706",
  "in progress": "#8B5CF6", "in_progress": "#8B5CF6",
  concept: "#9B8F7A", complete: "#0EA5E9",
};

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */
export default function AtelierPage() {
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [stats, setStats] = useState<Stats>({
    artworks:0, available:0, sold:0, in_progress:0,
    exhibitions:0, sales_total:0, sales_month:0,
    tasks_pending:0, followers:0,
  });
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  /* Helper badge state */
  const [helperOpen, setHelperOpen] = useState(false);
  const [pickedIntent, setPickedIntent] = useState<Intent | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const helperRef = useRef<HTMLDivElement>(null);

  /* Greeting */
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting("Good morning");
    else if (h >= 12 && h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  /* Click outside to close helper */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (helperRef.current && !helperRef.current.contains(e.target as Node)) {
        setHelperOpen(false);
      }
    }
    if (helperOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [helperOpen]);

  /* Escape closes helper */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setHelperOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── Load everything ─────────────────────────────────────── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (!user) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { data: prof },
        { data: awAll },
        { data: tk },
        { data: notifData },
        { data: salesData },
        { data: eventsData },
        { count: followerCount },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name,username,avatar_url").eq("id", user.id).single(),
        supabase.from("artworks").select("id,title,status,images,price,medium,year,width_cm,height_cm,created_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("tasks").select("id,title,status,priority,due_date,progress").eq("user_id", user.id).in("status", ["pending","in_progress"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("sales").select("id,sale_price,sale_date,status,artwork_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("exhibitions").select("id,title,start_date,venue,status").eq("user_id", user.id).in("status", ["planning","upcoming","current","Planning","Upcoming","Current"]).order("start_date", { ascending: true }).limit(3),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      ]);

      setProfile(prof);
      setArtworks(awAll || []);
      setTasks((tk || []).map((t: any) => ({ ...t, progress: t.progress || 0 })));
      setNotifs(notifData || []);
      setEvents(eventsData || []);

      let enrichedSales: Sale[] = salesData || [];
      if (salesData?.length) {
        const ids = salesData.map((s: any) => s.artwork_id).filter(Boolean);
        if (ids.length) {
          const { data: sa } = await supabase.from("artworks").select("id,title").in("id", ids);
          const map: Record<string, string> = {};
          sa?.forEach((a: any) => { map[a.id] = a.title; });
          enrichedSales = salesData.map((s: any) => ({ ...s, artwork_title: map[s.artwork_id] }));
        }
      }
      setRecentSales(enrichedSales);

      const list = awAll || [];
      const completedSales = enrichedSales.filter(s => s.status?.toLowerCase() === "completed");
      const totalRev = completedSales.reduce((a, s) => a + (s.sale_price || 0), 0);
      const monthSales = completedSales.filter(s => s.sale_date && new Date(s.sale_date) >= new Date(monthStart));
      const monthRev = monthSales.reduce((a, s) => a + (s.sale_price || 0), 0);

      setStats({
        artworks: list.length,
        available: list.filter((a: any) => String(a.status).toLowerCase() === "available").length,
        sold: list.filter((a: any) => String(a.status).toLowerCase() === "sold").length,
        in_progress: list.filter((a: any) => String(a.status).toLowerCase().replace(/ /g,"_") === "in_progress").length,
        exhibitions: eventsData?.length || 0,
        sales_total: totalRev,
        sales_month: monthRev,
        tasks_pending: (tk || []).length,
        followers: followerCount || 0,
      });
    });
  }, []);

  /* ── Easel piece ─────────────────────────────────────── */
  const easelPiece = (() => {
    if (!artworks.length) return null;
    const ip = artworks.filter(a => String(a.status).toLowerCase().replace(/ /g,"_") === "in_progress");
    if (ip.length) return ip[0];
    return artworks[0];
  })();

  const fname = profile?.full_name?.split(" ")[0] || "there";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : "A";

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifs(p => p.map(n => ({ ...n, read: true })));
  }

  function handlePick(intent: Intent) {
    setPickedIntent(intent);
    setBannerDismissed(false);
  }

  const pickedCard = pickedIntent ? INTENT_CARDS.find(c => c.key === pickedIntent) : null;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        /* ══ SECTION CARDS ══ */
        .atl-section {
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 18px;
          box-shadow: 4px 5px 0 #D4C9A8;
          padding: 18px 20px 20px;
          position: relative;
          transition: box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .atl-section:hover {
          box-shadow: 6px 7px 0 #111110;
          transform: translate(-1px, -2px) rotate(0deg) !important;
        }

        .atl-tape {
          position: absolute;
          width: 56px; height: 18px;
          background: rgba(255, 212, 0, 0.55);
          border: 1px solid rgba(17,17,16,0.1);
          z-index: 2;
          pointer-events: none;
          top: -8px;
          left: 26px;
          transform: rotate(-6deg);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .atl-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .atl-icon-badge {
          width: 32px; height: 32px; border-radius: 10px;
          border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 2px 2px 0 #111110;
          flex-shrink: 0;
        }
        .atl-section-title {
          font-size: 17px; font-weight: 900; color: #111110;
          letter-spacing: -0.4px; line-height: 1.1;
        }
        .atl-section-why {
          font-size: 11.5px; font-weight: 600; color: #9B8F7A;
          font-style: italic; margin-top: 2px; line-height: 1.3;
        }
        .atl-section-cta {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 800; color: #9B8F7A;
          text-decoration: none; text-transform: uppercase;
          letter-spacing: 0.1em; padding: 4px 8px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .atl-section-cta:hover { color: #111110; background: #FFFBEA; }

        /* ══ HELPER BADGE ══ */
        .atl-helper-wrap { position: relative; }

        .atl-helper-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px 10px 10px;
          background: #FFFBEA;
          border: 2.5px solid #111110;
          border-radius: 9999px;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 3px 3px 0 #111110;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          position: relative;
          color: #111110;
        }
        .atl-helper-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 #111110;
          background: #fff;
        }
        .atl-helper-btn.open {
          background: #111110;
          color: #FFD400;
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 #FFD400;
        }

        .atl-helper-face {
          width: 32px; height: 32px; border-radius: 50%;
          background: #FFD400;
          border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        .atl-helper-face::after {
          content: "";
          position: absolute;
          top: -3px; right: -3px;
          width: 9px; height: 9px;
          border-radius: 50%;
          background: #FF6B6B;
          border: 1.5px solid #111110;
        }
        .atl-helper-btn.open .atl-helper-face::after { display: none; }

        .atl-helper-text {
          display: flex; flex-direction: column; line-height: 1;
          text-align: left; padding-right: 4px;
        }
        .atl-helper-text small {
          font-size: 9px;
          font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          margin-bottom: 3px;
        }
        .atl-helper-btn.open .atl-helper-text small {
          color: rgba(255, 212, 0, 0.7);
        }
        .atl-helper-text strong {
          font-size: 13px;
          font-weight: 900;
          color: inherit;
          letter-spacing: -0.2px;
        }

        @keyframes atl-helper-wiggle {
          0%, 90%, 100% { transform: rotate(0deg); }
          93% { transform: rotate(-8deg); }
          96% { transform: rotate(8deg); }
        }
        .atl-helper-btn .atl-helper-face {
          animation: atl-helper-wiggle 3.5s ease-in-out 1.2s 2;
          transform-origin: center;
        }

        /* ── HELPER PANEL ── */
        .atl-helper-panel {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 540px;
          max-width: calc(100vw - 32px);
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 20px;
          box-shadow: 6px 7px 0 #111110;
          z-index: 80;
          padding: 20px 22px 22px;
          animation: atl-panel-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes atl-panel-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }

        /* Speech-bubble tail */
        .atl-helper-panel::before,
        .atl-helper-panel::after {
          content: "";
          position: absolute;
          top: -12px;
          right: 32px;
          width: 0; height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 11px solid #111110;
        }
        .atl-helper-panel::after {
          top: -9px;
          border-bottom-color: #fff;
        }

        .atl-helper-heading {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          margin-bottom: 16px;
        }
        .atl-helper-q {
          font-size: 18px; font-weight: 900; color: #111110;
          letter-spacing: -0.5px; line-height: 1.2;
          margin: 0;
        }
        .atl-helper-sub {
          font-size: 12px; font-weight: 600; color: #9B8F7A;
          font-style: italic; margin-top: 4px;
        }
        .atl-helper-close {
          background: none; border: none; cursor: pointer;
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #9B8F7A;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .atl-helper-close:hover { background: #FAF7F3; color: #111110; }

        /* Intent grid */
        .atl-intent-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }
        .atl-intent-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 14px 8px 12px;
          background: #FAF7F3;
          border: 2px solid #E8E0D0;
          border-radius: 14px;
          cursor: pointer;
          font-family: inherit;
          text-align: center;
          transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        .atl-intent-card:hover {
          border-color: #111110;
          background: #fff;
          transform: translateY(-2px);
          box-shadow: 2px 3px 0 #111110;
        }
        .atl-intent-card.picked {
          border-color: #111110;
          background: #fff;
          box-shadow: 2px 3px 0 #111110;
        }
        .atl-intent-card.dimmed { opacity: 0.42; }
        .atl-intent-card.dimmed:hover { opacity: 1; }

        .atl-intent-icon {
          width: 44px; height: 44px; border-radius: 12px;
          border: 2px solid #111110;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 2px 2px 0 #111110;
          transition: transform 0.18s;
        }
        .atl-intent-card:hover .atl-intent-icon { transform: scale(1.06) rotate(-3deg); }
        .atl-intent-card.picked .atl-intent-icon { transform: scale(1.06); }

        .atl-intent-label {
          font-size: 13px; font-weight: 900; color: #111110;
          letter-spacing: -0.2px; line-height: 1;
        }
        .atl-intent-blurb {
          font-size: 10px; font-weight: 600; color: #9B8F7A;
          line-height: 1.25;
        }

        /* Pick result inside panel */
        .atl-pick-result {
          margin-top: 14px;
          padding: 12px 14px;
          background: #FFFBEA;
          border: 2px dashed #111110;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: atl-panel-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .atl-pick-msg {
          flex: 1;
          font-size: 12px;
          font-weight: 700;
          color: #111110;
          line-height: 1.35;
        }
        .atl-pick-go {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 8px 14px;
          background: #111110;
          color: #FFD400;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 2px 2px 0 #FFD400;
          transition: transform 0.15s, box-shadow 0.15s;
          border: none;
          cursor: pointer;
          font-family: inherit;
          flex-shrink: 0;
        }
        .atl-pick-go:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 #FFD400;
        }

        /* ══ DIRECTIONAL BANNER ══ */
        .atl-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: #FFD400;
          border: 2.5px solid #111110;
          border-radius: 14px;
          box-shadow: 3px 4px 0 #111110;
          margin-bottom: 20px;
          animation: atl-panel-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        .atl-banner-icon {
          width: 40px; height: 40px; border-radius: 11px;
          background: #111110;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .atl-banner-text { flex: 1; min-width: 0; }
        .atl-banner-label {
          font-size: 10px;
          font-weight: 800;
          color: #111110;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          opacity: 0.65;
          margin-bottom: 2px;
        }
        .atl-banner-msg {
          font-size: 15px;
          font-weight: 800;
          color: #111110;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .atl-banner-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #111110;
          color: #FFD400;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 2px 2px 0 rgba(17,17,16,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
          flex-shrink: 0;
        }
        .atl-banner-cta:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(17,17,16,0.4);
        }
        .atl-banner-close {
          background: none; border: none; cursor: pointer;
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          color: #111110;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .atl-banner-close:hover { background: rgba(17,17,16,0.1); }

        /* ══ OTHER SECTIONS ══ */
        .atl-easel-card {
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 16px;
          align-items: stretch;
          padding: 4px;
          border-radius: 14px;
          transition: background 0.15s;
        }
        .atl-easel-card:hover { background: #FFFBEA; }
        .atl-easel-img {
          aspect-ratio: 1/1;
          border: 2px solid #111110;
          border-radius: 12px;
          overflow: hidden;
          background: #F5F0E8;
          box-shadow: 3px 3px 0 #D4C9A8;
        }
        .atl-easel-meta {
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 6px 0;
        }
        .atl-easel-action {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; background: #111110; color: #FFD400;
          border-radius: 10px; font-size: 12px; font-weight: 800;
          letter-spacing: -0.1px; align-self: flex-start;
          box-shadow: 2px 2px 0 #FFD400;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .atl-easel-card:hover .atl-easel-action {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 #FFD400;
        }

        .atl-wall-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 10px;
        }
        .atl-wall-tile {
          text-decoration: none; display: block;
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .atl-wall-tile:hover { transform: translateY(-3px) rotate(0deg) !important; }
        .atl-wall-img {
          position: relative;
          aspect-ratio: 1/1;
          background: #F5F0E8;
          border: 2px solid #111110;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 2px 2px 0 #D4C9A8;
          transition: box-shadow 0.2s;
        }
        .atl-wall-tile:hover .atl-wall-img { box-shadow: 3px 3px 0 #111110; }
        .atl-wall-dot {
          position: absolute; top: 6px; right: 6px;
          width: 8px; height: 8px; border-radius: 50%;
          border: 1.5px solid #111110;
        }
        .atl-wall-label {
          font-size: 11px; font-weight: 700; color: #5C5346;
          margin-top: 6px; text-align: center;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          padding: 0 2px;
        }

        .atl-add-row {
          display: flex; align-items: center; gap: 8px; justify-content: center;
          padding: 10px;
          border: 2px dashed #D4C9A8;
          border-radius: 10px;
          color: #9B8F7A;
          font-size: 12px; font-weight: 800;
          background: #FAF7F3;
          transition: all 0.15s;
        }
        .atl-add-row:hover {
          border-color: #111110;
          color: #111110;
          background: #FFFBEA;
        }

        .atl-big-num {
          font-size: 38px; font-weight: 900; color: #111110;
          letter-spacing: -1.5px; line-height: 1;
          margin-bottom: 2px;
        }
        .atl-ledger-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px;
          background: #FAFAF8;
          border: 1.5px solid #E8E0D0;
          border-radius: 10px;
        }

        .atl-doorway-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          transition: background 0.15s;
        }
        .atl-doorway-row:hover { background: #FFFBEA; border-radius: 8px; }

        .atl-notebook {
          background:
            linear-gradient(#fff, #fff),
            repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #F0E8D4 27px, #F0E8D4 28px);
          background-blend-mode: multiply;
        }
        .atl-note-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 0;
          border-bottom: 1px dashed #E8E0D0;
          transition: background 0.15s;
        }
        .atl-note-row:hover { background: #FFFBEA; }
        .atl-note-row:last-child { border-bottom: none; }
        .atl-checkbox {
          width: 15px; height: 15px;
          border: 2px solid #111110;
          border-radius: 4px;
          background: #fff;
          flex-shrink: 0;
        }

        .atl-empty {
          display: flex; align-items: center; gap: 12px;
          padding: 18px;
          border: 2px dashed #E8E0D0;
          border-radius: 12px;
          background: #FAF7F3;
        }
        .atl-empty-cta { cursor: pointer; transition: all 0.15s; }
        .atl-empty-cta:hover { border-color: #111110; background: #FFFBEA; }

        .atl-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @keyframes atl-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; }
        }
        .atl-in { animation: atl-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        @media (max-width: 900px) {
          .atl-intent-grid { grid-template-columns: repeat(3, 1fr); }
          .atl-helper-panel { width: 440px; }
        }
        @media (max-width: 768px) {
          .atl-grid { grid-template-columns: 1fr; }
          .atl-section[style*="grid-column"] { grid-column: span 1 !important; }
          .atl-easel-card { grid-template-columns: 1fr; }
          .atl-easel-img { aspect-ratio: 4/3; }
          .atl-wall-grid { grid-template-columns: repeat(3, 1fr); }
          .atl-helper-panel {
            width: calc(100vw - 32px);
            right: -8px;
          }
          .atl-helper-panel::before, .atl-helper-panel::after { right: 44px; }
          .atl-helper-text { display: none; }
          .atl-helper-btn { padding: 6px; }
          .atl-intent-grid { grid-template-columns: repeat(2, 1fr); }
          .atl-banner { flex-wrap: wrap; }
        }
      `}</style>

      <div>
        {/* ═══════════════════════════════════════════════════════
            HEADER — Greeting + Helper badge
            ═══════════════════════════════════════════════════════ */}
        <div className="atl-in" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, border: "2.5px solid #111110", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#111110", overflow: "hidden", boxShadow: "3px 3px 0 #111110", flexShrink: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0, lineHeight: 1.05 }}>
                {greeting}, {fname}.
              </h1>
              <p style={{ fontSize: 13, color: "#9B8F7A", margin: "3px 0 0", fontWeight: 600, fontStyle: "italic" }}>
                Welcome back to your atelier.
              </p>
            </div>
          </div>

          {/* ── HELPER BADGE ── */}
          <div className="atl-helper-wrap" ref={helperRef}>
            <button
              className={`atl-helper-btn ${helperOpen ? "open" : ""}`}
              onClick={() => setHelperOpen(o => !o)}
              aria-label="Open the helper"
              aria-expanded={helperOpen}
            >
              <div className="atl-helper-face">
                <HandHeart size={16} color="#111110" strokeWidth={2.3} />
              </div>
              <div className="atl-helper-text">
                <small>Not sure where to go?</small>
                <strong>Need a hand?</strong>
              </div>
            </button>

            {helperOpen && (
              <div className="atl-helper-panel" role="dialog" aria-label="Helper">
                <div className="atl-helper-heading">
                  <div>
                    <h2 className="atl-helper-q">What do you want to do today?</h2>
                    <div className="atl-helper-sub">Pick one — I'll take you there.</div>
                  </div>
                  <button className="atl-helper-close" onClick={() => setHelperOpen(false)} aria-label="Close">
                    <X size={15} />
                  </button>
                </div>

                <div className="atl-intent-grid">
                  {INTENT_CARDS.map(card => {
                    const Icon = card.icon;
                    const isPicked = pickedIntent === card.key;
                    const isDimmed = pickedIntent !== null && !isPicked;
                    return (
                      <button
                        key={card.key}
                        className={`atl-intent-card ${isPicked ? "picked" : ""} ${isDimmed ? "dimmed" : ""}`}
                        onClick={() => handlePick(card.key)}
                      >
                        <div className="atl-intent-icon" style={{ background: card.color }}>
                          <Icon size={20} color="#111110" strokeWidth={2.3} />
                        </div>
                        <div className="atl-intent-label">{card.label}</div>
                        <div className="atl-intent-blurb">{card.blurb}</div>
                      </button>
                    );
                  })}
                </div>

                {pickedCard && (
                  <div className="atl-pick-result">
                    <Sparkles size={16} color="#111110" strokeWidth={2.3} style={{ flexShrink: 0 }} />
                    <div className="atl-pick-msg">{pickedCard.banner}</div>
                    <Link href={pickedCard.href} className="atl-pick-go"
                      onClick={() => setHelperOpen(false)}>
                      Go there <ArrowRight size={12} strokeWidth={2.5} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            DIRECTIONAL BANNER — shown after pick, dismissible
            ═══════════════════════════════════════════════════════ */}
        {pickedCard && !bannerDismissed && (
          <div className="atl-banner">
            <div className="atl-banner-icon">
              {(() => {
                const Icon = pickedCard.icon;
                return <Icon size={18} color="#FFD400" strokeWidth={2.3} />;
              })()}
            </div>
            <div className="atl-banner-text">
              <div className="atl-banner-label">You picked · {pickedCard.label}</div>
              <div className="atl-banner-msg">{pickedCard.banner}</div>
            </div>
            <Link href={pickedCard.href} className="atl-banner-cta">
              Go there <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <button className="atl-banner-close" onClick={() => setBannerDismissed(true)} aria-label="Dismiss">
              <X size={16} strokeWidth={2.3} />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            THE DESK — stable order, no reshuffling
            ═══════════════════════════════════════════════════════ */}
        <div className="atl-grid atl-in" style={{ animationDelay: "0.08s" }}>

          {/* ── ON THE EASEL ── */}
          <section className="atl-section" style={{ gridColumn: "span 2", transform: "rotate(-0.25deg)" }}>
            <div className="atl-tape" />
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#FFD400" }}>
                  <Palette size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">On the easel</div>
                  <div className="atl-section-why">
                    {!easelPiece
                      ? "Nothing here yet — start a new piece."
                      : (() => {
                          const d = easelPiece.updated_at ? daysAgo(easelPiece.updated_at) : 0;
                          if (d === 0) return "You worked on this today.";
                          if (d === 1) return "One day since you last touched it.";
                          return `${d} days since you last touched it.`;
                        })()}
                  </div>
                </div>
              </div>
              <Link href="/dashboard/artworks" className="atl-section-cta">
                All works <ArrowRight size={12} />
              </Link>
            </div>

            {easelPiece ? (
              <Link href={`/dashboard/artworks/${easelPiece.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div className="atl-easel-card">
                  <div className="atl-easel-img">
                    {Array.isArray(easelPiece.images) && easelPiece.images[0] ? (
                      <img src={easelPiece.images[0]} alt={easelPiece.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                        <Brush size={36} color="#D4C9A8" />
                        <span style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>No image yet</span>
                      </div>
                    )}
                  </div>
                  <div className="atl-easel-meta">
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
                        {easelPiece.status?.replace(/_/g, " ") || "In progress"}
                      </div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: "#111110", margin: "0 0 6px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                        {easelPiece.title || "Untitled"}
                      </h3>
                      <div style={{ fontSize: 13, color: "#5C5346", fontWeight: 600 }}>
                        {[easelPiece.medium, easelPiece.year,
                          easelPiece.width_cm && easelPiece.height_cm ? `${easelPiece.width_cm}×${easelPiece.height_cm} cm` : null
                        ].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="atl-easel-action">
                      Open this piece <ArrowRight size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                <div className="atl-empty atl-empty-cta">
                  <Plus size={22} color="#111110" strokeWidth={2.5} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#111110" }}>Start a new piece</div>
                    <div style={{ fontSize: 12, color: "#5C5346", fontWeight: 600 }}>Every atelier begins with one mark.</div>
                  </div>
                </div>
              </Link>
            )}
          </section>

          {/* ── THE WALL ── */}
          <section className="atl-section" style={{ gridColumn: "span 2", transform: "rotate(0.15deg)" }}>
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#4ECDC4" }}>
                  <Frame size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">The wall</div>
                  <div className="atl-section-why">
                    {stats.artworks === 0 ? "Empty wall. Hang your first piece." :
                     `${stats.artworks} works · ${stats.available} available · ${stats.in_progress} in progress`}
                  </div>
                </div>
              </div>
              <Link href="/dashboard/artworks" className="atl-section-cta">See all <ArrowRight size={12} /></Link>
            </div>

            {artworks.length === 0 ? (
              <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
                <div className="atl-empty">
                  <ImageIcon size={22} color="#9B8F7A" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>No artworks yet</div>
                    <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>Add your first work to begin.</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="atl-wall-grid">
                {artworks.slice(0, 6).map((aw, i) => {
                  const img = Array.isArray(aw.images) ? aw.images[0] : null;
                  const dot = STATUS_DOT[String(aw.status).toLowerCase()] || "#9B8F7A";
                  return (
                    <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="atl-wall-tile"
                      style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (0.2 + (i % 3) * 0.15)}deg)` }}>
                      <div className="atl-wall-img">
                        {img ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ImageIcon size={20} color="#D4C9A8" /></div>}
                        <div className="atl-wall-dot" style={{ background: dot }} />
                      </div>
                      <div className="atl-wall-label">{aw.title || "Untitled"}</div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link href="/dashboard/artworks/new" style={{ textDecoration: "none", display: "block", marginTop: 12 }}>
              <div className="atl-add-row">
                <Plus size={14} strokeWidth={2.5} /> Add a new piece to the wall
              </div>
            </Link>
          </section>

          {/* ── THE LEDGER ── */}
          <section className="atl-section">
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#FFD400" }}>
                  <DollarSign size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">The ledger</div>
                  <div className="atl-section-why">
                    {(() => {
                      const completed = recentSales.filter(s => s.status?.toLowerCase() === "completed");
                      if (stats.sales_month > 0) return `$${stats.sales_month.toLocaleString()} this month`;
                      if (completed.length > 0) return `${completed.length} sales to date`;
                      return "Quiet ledger. First sale coming.";
                    })()}
                  </div>
                </div>
              </div>
              <Link href="/dashboard/sales" className="atl-section-cta">Open <ArrowRight size={12} /></Link>
            </div>

            <div style={{ padding: "4px 0" }}>
              <div className="atl-big-num">${stats.sales_total.toLocaleString()}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14 }}>
                Total earned · all time
              </div>

              {(() => {
                const last = recentSales.filter(s => s.status?.toLowerCase() === "completed")[0];
                if (!last) return (
                  <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, padding: "8px 0" }}>
                    No sales recorded yet.
                  </div>
                );
                return (
                  <div className="atl-ledger-row">
                    <div style={{ width: 4, height: 32, borderRadius: 2, background: "#16A34A" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {last.artwork_title || "Artwork"} · ${last.sale_price?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
                        Last sale · {last.sale_date ? formatDay(last.sale_date) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* ── THE DOORWAY ── */}
          <section className="atl-section" style={{ transform: "rotate(-0.2deg)" }}>
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#FF6B6B" }}>
                  <CalendarDays size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">The doorway</div>
                  <div className="atl-section-why">
                    {events[0] ? `Next: ${events[0].title}` : "No events planned. Open the door."}
                  </div>
                </div>
              </div>
              <Link href="/dashboard/exhibitions" className="atl-section-cta">All <ArrowRight size={12} /></Link>
            </div>

            {events.length === 0 ? (
              <Link href="/dashboard/exhibitions/new" style={{ textDecoration: "none" }}>
                <div className="atl-empty">
                  <Building2 size={22} color="#9B8F7A" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>Plan your next show</div>
                    <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>Add an exhibition or event.</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div>
                {events.map((ev, i) => (
                  <Link key={ev.id} href="/dashboard/exhibitions" style={{ textDecoration: "none" }}>
                    <div className="atl-doorway-row" style={{ borderBottom: i < events.length - 1 ? "1px dashed #E8E0D0" : "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF8E1", border: "2px solid #111110", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1 }}>
                          {ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-US", { month: "short" }) : "TBD"}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "#111110", lineHeight: 1, marginTop: 2 }}>
                          {ev.start_date ? new Date(ev.start_date).getDate() : "—"}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>{ev.venue || "No venue"}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── THE NOTEBOOK (tasks) ── */}
          <section className="atl-section atl-notebook" style={{ transform: "rotate(0.3deg)" }}>
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#8B5CF6" }}>
                  <PencilLine size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">The notebook</div>
                  <div className="atl-section-why">
                    {tasks.length === 0 ? "Nothing scribbled here." : `${tasks.length} open · the day's list`}
                  </div>
                </div>
              </div>
              <Link href="/dashboard/tasks" className="atl-section-cta">All <ArrowRight size={12} /></Link>
            </div>

            {tasks.length === 0 ? (
              <Link href="/dashboard/tasks" style={{ textDecoration: "none" }}>
                <div className="atl-empty">
                  <Coffee size={22} color="#9B8F7A" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>An empty page</div>
                    <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>Jot down what today needs.</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div>
                {tasks.slice(0, 5).map((t) => (
                  <Link key={t.id} href="/dashboard/tasks" style={{ textDecoration: "none" }}>
                    <div className="atl-note-row">
                      <div className="atl-checkbox" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.title}
                        </div>
                        {t.due_date && (
                          <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>
                            due {formatDay(t.due_date)}
                          </div>
                        )}
                      </div>
                      {t.priority === "high" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B6B" }} />}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── THE LETTERBOX ── */}
          <section className="atl-section" style={{ transform: "rotate(-0.15deg)" }}>
            <div className="atl-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="atl-icon-badge" style={{ background: "#95E1D3" }}>
                  <Bell size={15} color="#111110" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="atl-section-title">The letterbox</div>
                  <div className="atl-section-why">
                    {(() => {
                      const unread = notifs.filter(n => !n.read).length;
                      return unread > 0 ? `${unread} new letter${unread > 1 ? "s" : ""}` : "All letters opened.";
                    })()}
                  </div>
                </div>
              </div>
              {notifs.filter(n => !n.read).length > 0 && (
                <button onClick={markAllRead} className="atl-section-cta" style={{ border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  <Check size={12} /> Mark read
                </button>
              )}
            </div>

            {notifs.slice(0, 4).length === 0 ? (
              <div className="atl-empty">
                <Megaphone size={20} color="#9B8F7A" />
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9B8F7A" }}>Nothing new. Quiet day.</div>
              </div>
            ) : (
              <div>
                {notifs.slice(0, 4).map((n, i, arr) => {
                  const cfg = NOTIF_CFG[n.type] || { icon: Sparkles, color: "#9B8F7A" };
                  const Icon = cfg.icon;
                  return (
                    <div key={n.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 0",
                      borderBottom: i < arr.length - 1 ? "1px dashed #E8E0D0" : "none",
                      opacity: n.read ? 0.62 : 1,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${cfg.color}` }}>
                        <Icon size={12} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: n.read ? 600 : 800, color: "#111110" }}>{n.title}</span>
                          {!n.read && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF6B6B", flexShrink: 0 }} />}
                        </div>
                        {n.body && <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>}
                        <div style={{ fontSize: 10, color: "#C0B8A8", marginTop: 2, fontWeight: 600 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer line */}
        <div style={{ textAlign: "center", marginTop: 32, marginBottom: 16, fontSize: 11, fontWeight: 600, color: "#C0B8A8", fontStyle: "italic", letterSpacing: "0.04em" }}>
          — The atelier is always here when you need it. —
        </div>
      </div>
    </>
  );
}
