// src/app/dashboard/page.tsx — The Atelier: the artist's home screen
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Bell, CalendarDays, Circle, Plus } from "lucide-react";
import { Avatar, Badge, ButtonLink, Card, Eyebrow, Heading, StatTile, Tabs, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { mainCurrency } from "./sales/money";
import { ArtistNextStep } from "@/components/home/ArtistNextStep";
import { VenueHome } from "./home/VenueHome";
import { isVenueRole } from "@/lib/site";

/* ── Labels ─────────────────────────────────────────────────────── */
type ScenePostType = "event" | "exhibition" | "collab" | "opencall" | "commission";
const SCENE_LABEL: Record<ScenePostType, string> = {
  event: "Event", exhibition: "Exhibition", collab: "Collab", opencall: "Open call", commission: "Commission",
};
const CAL_LABEL: Record<string, string> = {
  exhibition: "Exhibition", deadline: "Deadline", collab: "Collab", meeting: "Meeting",
  personal: "Personal", sale: "Sale", artwork: "Artwork", task: "Task", scene: "Open call",
};

/* ── Helpers ────────────────────────────────────────────────────── */
function daysUntil(d?: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}
function relDate(d?: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const day = 86400000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return `${Math.floor(diff / (30 * day))}mo ago`;
}
function fmtAgendaDate(d: string): { rel: string; num: number } {
  const dt = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dt); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const rel = diff === 0 ? "Today" : diff === 1 ? "Tmrw" : dt.toLocaleDateString("en-GB", { weekday: "short" });
  return { rel, num: dt.getDate() };
}
function fmtTime(t?: string | null) {
  return t ? t.slice(0, 5) : null;
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function priority(p?: string): { tone: BadgeTone; label: string } {
  if (p === "high" || p === "urgent") return { tone: "bad", label: "High" };
  if (p === "low") return { tone: "neutral", label: "Low" };
  return { tone: "warn", label: "Medium" };
}

type AgendaItem = {
  id: string; title: string; type: string;
  source: "private" | "task" | "public";
  date: string; time?: string | null; where?: string | null; href: string;
};

/** Section card with a title row and an optional link on the right. */
function Panel({ title, eyebrow, action, children, className }: {
  title: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card padding="none" className={cn("flex flex-col", className)}>
      <div className="flex items-end justify-between gap-3 border-b-hair border-line px-5 py-4">
        <div className="flex flex-col gap-1">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Heading level={2} size="h3">{title}</Heading>
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  );
}
function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 font-ui text-label font-semibold text-fg-2 hover:text-fg">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 font-ui text-body-sm text-fg-3">{children}</p>;
}

/* ═══════════════════════════════════════════════════════════════════ */
/** Venues get their own Home (home/VenueHome.tsx); artists get the Atelier. */
export default function DashboardPage() {
  const [venue, setVenue] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setVenue(false); return; }
      const { data } = await sb.from("profiles").select("role").eq("id", user.id).single();
      setVenue(isVenueRole(data?.role));
    });
  }, []);
  if (venue === null) return <div aria-hidden className="h-[60vh]" />;
  return venue ? <VenueHome /> : <ArtistHome />;
}

function ArtistHome() {
  /* ── Data state ─────────────────────────────────────── */
  const [profile, setProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [cur, setCur] = useState("EUR");
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

  /* ── UI state ───────────────────────────────────── */
  const [calToggle, setCalToggle] = useState<"yours" | "around">("yours");

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
            .select("id,title,priority,due_date,status,created_at")
            .eq("user_id", user.id)
            .neq("status", "done")
            .order("created_at", { ascending: false })
            .limit(10),
          // Sales — FIXED: use sale_price column, filter status=completed
          supabase
            .from("sales")
            .select("sale_price,sale_date,status,currency")
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
          supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id),
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
          setCur(mainCurrency(salesAll || []));
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

  const todayFmt = new Date().toLocaleDateString("en-GB", {
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
      href: "/dashboard/tasks?view=month",
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
  ].sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(0, 5);

  const agendaAround: AgendaItem[] = publicEvents
    .map((p: any): AgendaItem => ({
      id: `pub-${p.id}`,
      title: p.title,
      type: p.type === "open_call" || p.type === "residency" ? "scene" : "exhibition",
      source: "public",
      date: p.start_date,
      time: fmtTime(p.start_time),
      where: p.venue ? `${p.venue}${p.city ? `, ${p.city}` : ""}` : p.city || null,
      href: "/dashboard/tasks?view=month",
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

  const wall = artworks.slice(0, 5);
  const monthName = new Date().toLocaleDateString("en-GB", { month: "long" });
  const salesDelta = stats.sales_prev_month > 0
    ? `${formatPrice(stats.sales_prev_month, cur)} in the month before`
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Greeting ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Eyebrow suppressHydrationWarning>{todayFmt}</Eyebrow>
          <Heading level={1} size="h1" suppressHydrationWarning>{timeWord}, {fname}.</Heading>
          <p className="font-ui text-body text-fg-2">{loaded ? greetSub : " "}</p>
        </div>
        <ButtonLink href="/dashboard/artworks/new" variant="secondary" className="hidden sm:inline-flex"><Plus size={16} aria-hidden /> Add a work</ButtonLink>
      </header>

      {/* ── The one next step (also answers "where can my work go?") ── */}
      <ArtistNextStep />

      {/* ── Numbers ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Works" value={loaded ? stats.total : "–"} delta={loaded && stats.in_progress > 0 ? `${stats.in_progress} in progress` : undefined} />
        <StatTile label="For sale" value={loaded ? stats.available : "–"} delta={loaded && stats.sold > 0 ? `${stats.sold} sold so far` : undefined} />
        <StatTile label={`Sales in ${monthName}`} value={loaded ? formatPrice(stats.sales_month, cur) : "–"} delta={loaded ? salesDelta : undefined} />
        <StatTile label="Followers" value={loaded ? stats.followers : "–"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Studio wall ── */}
        <Panel title="On the wall" eyebrow="Studio" className="lg:col-span-2" action={<PanelLink href="/dashboard/artworks">All works</PanelLink>}>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {wall.map(aw => (
              <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} className="group flex flex-col gap-2">
                <Mat src={aw.images?.[0]} alt={aw.title || "Untitled"} className="aspect-square w-full rounded-control border-hair border-line transition-colors duration-fast group-hover:border-ink" />
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-ui text-body-sm font-semibold text-fg">{aw.title || "Untitled"}</span>
                  {aw.status === "sold" && <Badge tone="inverse">Sold</Badge>}
                </span>
              </Link>
            ))}
            <Link
              href="/dashboard/artworks/new"
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-control border-hair border-dashed border-line-strong text-fg-3 transition-colors duration-fast hover:border-ink hover:text-fg"
            >
              <Plus size={20} aria-hidden />
              <span className="font-ui text-body-sm font-semibold">{wall.length ? "Add a work" : "Add your first work"}</span>
            </Link>
          </div>
        </Panel>

        {/* ── To-do ── */}
        <Panel title="To do" eyebrow="Today" action={<PanelLink href="/dashboard/tasks">All</PanelLink>}>
          {tasks.length > 0 ? (
            <ul className="divide-y divide-line">
              {tasks.slice(0, 5).map(t => {
                const pr = priority(t.priority);
                return (
                  <li key={t.id}>
                    <Link href="/dashboard/tasks" className="flex items-start gap-3 px-5 py-3 hover:bg-sunken">
                      <Circle size={16} aria-hidden className="mt-0.5 shrink-0 text-fg-3" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{t.title}</span>
                        <span className="flex items-center gap-2 font-ui text-caption text-fg-3">
                          <Badge tone={pr.tone}>{pr.label}</Badge>
                          {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Quiet>Nothing pressing. Add a task when something comes up.</Quiet>
          )}
          <div className="mt-auto border-t-hair border-line px-5 py-3">
            <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 font-ui text-label font-semibold text-fg hover:underline hover:underline-offset-4">
              <Plus size={14} aria-hidden /> Add a task
            </Link>
          </div>
        </Panel>

        {/* ── This week ── */}
        <Panel
          title="This week"
          eyebrow="Calendar"
          className="lg:col-span-2"
          action={
            <Tabs
              items={[{ value: "yours", label: "Yours" }, { value: "around", label: "Around you" }]}
              value={calToggle}
              onChange={setCalToggle}
              label="Whose events"
            />
          }
        >
          {agenda.length > 0 ? (
            <ul className="divide-y divide-line">
              {agenda.map(item => {
                const { rel, num } = fmtAgendaDate(item.date);
                return (
                  <li key={item.id}>
                    <Link href={item.href} className="flex items-center gap-4 px-5 py-3 hover:bg-sunken">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-control border-hair border-line bg-page py-1.5">
                        <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{rel}</span>
                        <span className="font-display text-h3 font-bold leading-none tabular-nums text-fg">{num}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{item.title}</span>
                        <span className="truncate font-ui text-caption text-fg-3">
                          {[CAL_LABEL[item.type] || "Event", item.source === "task" ? null : item.where].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 font-ui text-caption tabular-nums text-fg-3">
                        {item.time || (item.source === "task" ? "Due" : "All day")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Quiet>{calToggle === "yours" ? "Nothing booked for the next two weeks." : "No public events nearby in the next two weeks."}</Quiet>
          )}
          <div className="mt-auto border-t-hair border-line px-5 py-3">
            <PanelLink href="/dashboard/tasks?view=month">Open planner</PanelLink>
          </div>
        </Panel>

        {/* ── Inbox ── */}
        <Panel
          title={notifications.length > 0 ? `${notifications.length} new` : "Inbox"}
          eyebrow="Notifications"
          action={<PanelLink href="/dashboard/messages">{unreadMessages > 0 ? `${unreadMessages} unread` : "Messages"}</PanelLink>}
        >
          {notifications.length > 0 ? (
            <ul className="divide-y divide-line">
              {notifications.slice(0, 4).map(n => (
                <li key={n.id}>
                  <Link href="/dashboard/messages" className="flex items-start gap-3 px-5 py-3 hover:bg-sunken">
                    <Bell size={16} aria-hidden className="mt-0.5 shrink-0 text-fg-3" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-ui text-body-sm font-semibold text-fg">{n.title}</span>
                      {n.body && <span className="line-clamp-2 font-ui text-caption text-fg-2">{n.body}</span>}
                      <span className="font-ui text-caption text-fg-3">{relDate(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>Nothing new. When a collector, curator or another artist reaches out, it shows up here.</Quiet>
          )}
        </Panel>

        {/* ── Scene ── */}
        <Panel
          title="Live in the scene"
          eyebrow="Scene"
          className="lg:col-span-2"
          action={<PanelLink href="/dashboard/scene">See all</PanelLink>}
        >
          {scenePosts.length > 0 ? (
            <ul className="divide-y divide-line">
              {scenePosts.slice(0, 3).map(p => (
                <li key={p.id}>
                  <Link href="/dashboard/scene" className="flex items-center gap-4 px-5 py-3 hover:bg-sunken">
                    <Mat src={p.cover_image || p.images?.[0]} alt="" className="h-16 w-16 shrink-0 rounded-control" pad="p-1" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{p.title}</span>
                        <Badge>{SCENE_LABEL[p.post_type as ScenePostType] || "Post"}</Badge>
                      </span>
                      <span className="truncate font-ui text-caption text-fg-3">{sceneMeta(p)}</span>
                      <span className="flex items-center gap-2 font-ui text-caption text-fg-3">
                        <Avatar name={p.poster?.full_name || "Member"} src={p.poster?.avatar_url} size="sm" className="h-5 w-5 text-[9px]" />
                        {p.poster?.full_name || "A member"} · {relDate(p.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>Nothing live yet. Post an open call, a show or a collab and it appears here for everyone.</Quiet>
          )}
          <div className="mt-auto border-t-hair border-line px-5 py-3">
            <Link href="/dashboard/scene?post=1" className="inline-flex items-center gap-1.5 font-ui text-label font-semibold text-fg hover:underline hover:underline-offset-4">
              <Plus size={14} aria-hidden /> Post to the scene
            </Link>
          </div>
        </Panel>

        {/* ── Sales & papers ── */}
        <Panel title="Deals and papers" eyebrow="Sales" action={<PanelLink href="/dashboard/sales">Sales</PanelLink>}>
          <dl className="divide-y divide-line">
            {[
              { label: "Sold in total", value: loaded ? formatPrice(stats.sales_total, cur) : "–", href: "/dashboard/sales" },
              { label: "Contracts out", value: String(contractsOut.out), href: "/dashboard/contracts", note: contractsOut.awaiting > 0 ? `${contractsOut.awaiting} waiting for a signature` : null },
              { label: "Your public page", value: profile?.username ? "Open" : "Set up", href: profile?.username ? `/${profile.username}` : "/dashboard/profile" },
            ].map(row => (
              <Link key={row.label} href={row.href} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-sunken">
                <span className="flex flex-col gap-0.5">
                  <dt className="font-ui text-body-sm text-fg-2">{row.label}</dt>
                  {row.note && <span className="font-ui text-caption font-semibold text-warn">{row.note}</span>}
                </span>
                <dd className="flex items-center gap-1 font-ui text-body font-semibold tabular-nums text-fg">
                  {row.value} <ArrowRight size={14} aria-hidden className="text-fg-3" />
                </dd>
              </Link>
            ))}
          </dl>
        </Panel>
      </div>

      <p className="flex items-center gap-2 font-ui text-caption text-fg-3">
        <CalendarDays size={13} aria-hidden /> Agenda and scene show the next two weeks.
      </p>
    </div>
  );
}
