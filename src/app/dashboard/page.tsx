// src/app/dashboard/page.tsx
// S1 · Overview — the studio dashboard.
// Rebuilt from the "ArtoMango Dashboard" Lucerna mockup as real Next.js,
// wired to the live Supabase schema (see column notes inline). Anywhere the
// mockup showed a number with no real table behind it (e.g. "Reach") this
// swaps in the closest thing the schema actually tracks, rather than
// inventing a metric — per the project's "data source accuracy" rule.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import SceneBackdrop from "@/components/layout/SceneBackdrop";

// ── Types ────────────────────────────────────────────────────────────────
type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
};

type ArtworkCard = {
  id: string;
  title: string;
  medium: string | null;
  price: number | null;
  currency: string | null;
  images: string[] | null;
  availability_status: string | null;
  created_at: string;
  notes: string | null;
};

type ScenePost = {
  id: string;
  post_type: string;
  title: string;
  location: string | null;
  is_online: boolean | null;
  start_date: string | null;
  deadline: string | null;
  created_at: string;
  user_id: string;
  posterName?: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

type AgendaRow = {
  id: string;
  title: string;
  kind: string;
  where: string;
  start_date: string;
  all_day?: boolean | null;
  start_time?: string | null;
};

type Conversation = {
  id: string;
  otherName: string;
  preview: string | null;
  when: string;
  unread: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────
const fmtEUR = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d} d ago`;
};

const dayLabel = (isoDate: string) => {
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return { rel: "today", num: d.getDate() };
  if (diffDays === 1) return { rel: "tomorrow", num: d.getDate() };
  const weekday = d.toLocaleDateString("en", { weekday: "short" }).toLowerCase();
  return { rel: weekday, num: d.getDate() };
};

const priorityTone = (p: string) =>
  p === "high"
    ? { tone: "var(--bad)", well: "var(--bad-well)" }
    : p === "low"
    ? { tone: "var(--ok)", well: "var(--ok-well)" }
    : { tone: "var(--lt-3)", well: "var(--chip)" };

const kindTone = (kind: string) =>
  kind === "deadline"
    ? { tone: "var(--bad)", well: "var(--bad-well)" }
    : kind === "meeting"
    ? { tone: "var(--lt-3)", well: "var(--chip)" }
    : { tone: "var(--accent-on-well)", well: "var(--accent-well)" };

const isoDaysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const startOfMonthISO = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export default function OverviewPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [stats, setStats] = useState({ total: 0, forSale: 0, reserved: 0, sold: 0 });
  const [wall, setWall] = useState<ArtworkCard[]>([]);

  const [scene, setScene] = useState<ScenePost[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});

  const [calTab, setCalTab] = useState<"yours" | "around">("yours");
  const [agendaYours, setAgendaYours] = useState<AgendaRow[]>([]);
  const [agendaAround, setAgendaAround] = useState<AgendaRow[]>([]);

  const [soldThisMonth, setSoldThisMonth] = useState(0);
  const [soldLastMonth, setSoldLastMonth] = useState(0);
  const [reachCount, setReachCount] = useState(0);
  const [papersOut, setPapersOut] = useState(0);
  const [papersAwaiting, setPapersAwaiting] = useState(0);
  const [frontDoorLive, setFrontDoorLive] = useState(false);

  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.push("/login");
        return;
      }
      const uid = user.id;

      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, location")
          .eq("id", uid)
          .single();
        if (p) setProfile(p as Profile);
      } catch (err) {
        console.error("profile load failed", err);
      }

      try {
        const { data: works } = await supabase
          .from("artworks")
          .select("id, title, medium, price, currency, images, availability_status, created_at, notes")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });
        const list = (works ?? []) as ArtworkCard[];
        setStats({
          total: list.length,
          forSale: list.filter((w) => w.availability_status === "available").length,
          reserved: list.filter((w) => w.availability_status === "reserved").length,
          sold: list.filter((w) => w.availability_status === "sold").length,
        });
        setWall(list.slice(0, 4));
      } catch (err) {
        console.error("artworks load failed", err);
      }

      try {
        const { data: posts } = await supabase
          .from("scene_posts")
          .select("id, post_type, title, location, is_online, start_date, deadline, created_at, user_id")
          .eq("is_public", true)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(3);
        const list = (posts ?? []) as ScenePost[];
        const posterIds = Array.from(new Set(list.map((post) => post.user_id)));
        let posterMap: Record<string, string> = {};
        if (posterIds.length > 0) {
          const { data: posters } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", posterIds);
          posterMap = Object.fromEntries((posters ?? []).map((row: any) => [row.id, row.full_name || "An artist"]));
        }
        setScene(list.map((post) => ({ ...post, posterName: posterMap[post.user_id] })));
      } catch (err) {
        console.error("scene load failed", err);
      }

      try {
        const { data: t } = await supabase
          .from("tasks")
          .select("id, title, status, priority, due_date")
          .eq("user_id", uid)
          .in("status", ["pending", "in_progress"])
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5);
        setTasks((t ?? []) as Task[]);
      } catch (err) {
        console.error("tasks load failed", err);
      }

      try {
        const { data: yours } = await supabase
          .from("calendar_events")
          .select("id, title, type, start_date, all_day, start_time, location")
          .eq("user_id", uid)
          .gte("start_date", isoDaysFromNow(0))
          .lte("start_date", isoDaysFromNow(7))
          .order("start_date", { ascending: true })
          .limit(6);
        setAgendaYours(
          (yours ?? []).map((e: any) => ({
            id: e.id,
            title: e.title,
            kind: e.type,
            where: e.location || "—",
            start_date: e.start_date,
            all_day: e.all_day,
            start_time: e.start_time,
          }))
        );
      } catch (err) {
        console.error("calendar (yours) load failed", err);
      }

      try {
        const { data: around } = await supabase
          .from("public_events")
          .select("id, title, type, start_date, start_time, venue, city")
          .gte("start_date", isoDaysFromNow(0))
          .lte("start_date", isoDaysFromNow(7))
          .order("start_date", { ascending: true })
          .limit(6);
        setAgendaAround(
          (around ?? []).map((e: any) => ({
            id: e.id,
            title: e.title,
            kind: e.type,
            where: e.venue || e.city || "—",
            start_date: e.start_date,
            start_time: e.start_time,
          }))
        );
      } catch (err) {
        console.error("calendar (around) load failed", err);
      }

      try {
        const { data: salesRows } = await supabase
          .from("sales")
          .select("sale_price, sale_date, status, seller_id, user_id")
          .or(`seller_id.eq.${uid},user_id.eq.${uid}`)
          .eq("status", "completed")
          .gte("sale_date", startOfMonthISO(-1));
        const thisMonthStart = startOfMonthISO(0);
        let curr = 0;
        let prev = 0;
        for (const row of salesRows ?? []) {
          const price = Number((row as any).sale_price) || 0;
          const d = (row as any).sale_date as string;
          if (d >= thisMonthStart) curr += price;
          else prev += price;
        }
        setSoldThisMonth(curr);
        setSoldLastMonth(prev);
      } catch (err) {
        console.error("sales load failed", err);
      }

      try {
        const { data: myWorks } = await supabase.from("artworks").select("id").eq("user_id", uid);
        const ids = (myWorks ?? []).map((w: any) => w.id);
        if (ids.length > 0) {
          const since = new Date();
          since.setDate(since.getDate() - 30);
          const { count } = await supabase
            .from("passport_views")
            .select("id", { count: "exact", head: true })
            .in("artwork_id", ids)
            .gte("viewed_at", since.toISOString());
          setReachCount(count ?? 0);
        }
      } catch (err) {
        console.error("reach load failed", err);
      }

      try {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, initiator_id, counterparty_id, initiator_signed_at, counterparty_signed_at, executed_at")
          .or(`initiator_id.eq.${uid},counterparty_id.eq.${uid}`)
          .is("executed_at", null);
        const rows = contracts ?? [];
        setPapersOut(rows.length);
        setPapersAwaiting(
          rows.filter((c: any) => Boolean(c.initiator_signed_at) !== Boolean(c.counterparty_signed_at)).length
        );
      } catch (err) {
        console.error("contracts load failed", err);
      }

      try {
        const { data: store } = await supabase
          .from("store_settings")
          .select("is_active")
          .eq("user_id", uid)
          .maybeSingle();
        setFrontDoorLive(Boolean(store?.is_active));
      } catch (err) {
        console.error("store_settings load failed", err);
      }

      try {
        const { data: convos } = await supabase
          .from("conversations")
          .select(
            "id, participant_a, participant_b, guest_name, last_message_at, last_message_preview, read_by_a, read_by_b"
          )
          .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
          .order("last_message_at", { ascending: false })
          .limit(5);
        const rows = convos ?? [];

        const otherIds = Array.from(
          new Set(
            rows
              .map((c: any) => (c.participant_a === uid ? c.participant_b : c.participant_a))
              .filter((id: string | null) => Boolean(id))
          )
        );
        let nameMap: Record<string, string> = {};
        if (otherIds.length > 0) {
          const { data: others } = await supabase.from("profiles").select("id, full_name").in("id", otherIds);
          nameMap = Object.fromEntries((others ?? []).map((row: any) => [row.id, row.full_name || "Someone"]));
        }

        let unread = 0;
        const built: Conversation[] = rows.slice(0, 2).map((c: any) => {
          const isA = c.participant_a === uid;
          const otherId = isA ? c.participant_b : c.participant_a;
          const isUnread = isA ? !c.read_by_a : !c.read_by_b;
          return {
            id: c.id,
            otherName: otherId ? nameMap[otherId] || "Someone" : c.guest_name || "Guest",
            preview: c.last_message_preview,
            when: c.last_message_at ? timeAgo(c.last_message_at) : "",
            unread: isUnread,
          };
        });
        for (const c of rows) {
          const isA = c.participant_a === uid;
          const isUnread = isA ? !c.read_by_a : !c.read_by_b;
          if (isUnread) unread += 1;
        }
        setInbox(built);
        setUnreadTotal(unread);
      } catch (err) {
        console.error("inbox load failed", err);
      }

      setLoading(false);
    };

    load();
  }, []);

  const toggleTask = async (task: Task) => {
    const nowDone = !doneIds[task.id];
    setDoneIds((prev) => ({ ...prev, [task.id]: nowDone }));
    try {
      await supabase.from("tasks").update({ status: nowDone ? "done" : "pending" }).eq("id", task.id);
    } catch (err) {
      console.error("task toggle failed", err);
      setDoneIds((prev) => ({ ...prev, [task.id]: !nowDone }));
    }
  };

  const firstName = (profile?.full_name || "there").split(" ")[0];
  const today = new Date();
  const dateLine = today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
  const notebookNote = wall.find((w) => w.notes)?.notes;
  const agenda = calTab === "yours" ? agendaYours : agendaAround;
  const salesDelta =
    soldLastMonth > 0
      ? `${soldThisMonth >= soldLastMonth ? "up" : "down"} from ${fmtEUR(soldLastMonth)} last month`
      : "no sales logged last month";
  const salesPct = soldLastMonth > 0 ? Math.min(100, Math.round((soldThisMonth / (soldLastMonth || 1)) * 100)) : soldThisMonth > 0 ? 100 : 0;

  return (
    <>
      <SceneBackdrop mood="mango light" />
      <AppHeader
        userName={profile?.full_name || "Your studio"}
        userLocation={profile?.location || undefined}
        avatarUrl={profile?.avatar_url}
        avatarInitials={(profile?.full_name || "AM").slice(0, 2).toUpperCase()}
        unreadMessages={unreadTotal}
      />

      <div
        className="ln-wrap"
        style={{ paddingTop: "calc(var(--header-h) + 34px)", paddingBottom: 80 }}
      >
        {/* ── Greeting + top stats ─────────────────────────────────── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            gap: 40,
            alignItems: "end",
            paddingBottom: 26,
          }}
        >
          <div>
            <div className="ln-eyebrow" style={{ marginBottom: 14 }}>
              {dateLine} · Prague
            </div>
            <h1 className="ln-hero" style={{ maxWidth: 640 }}>
              Welcome back, {firstName}. <span style={{ color: "var(--lt-3)" }}>The studio is yours.</span>
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
              <Link href="/dashboard/works?compose=1" className="ln-btn ln-btn-primary">
                Add a work
              </Link>
              <Link href="/dashboard/frontdoor" className="ln-btn ln-btn-ghost">
                Open the front door
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { value: stats.total, label: "Works catalogued" },
              { value: stats.forSale, label: "For sale" },
              { value: fmtEUR(soldThisMonth), label: "Sold this month" },
            ].map((s) => (
              <div key={s.label} className="ln-nested" style={{ width: 140, padding: "16px 18px" }}>
                <div className="ln-num" style={{ fontSize: 26 }}>
                  {s.value}
                </div>
                <div className="ln-meta" style={{ marginTop: 6, fontSize: 11 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bento grid ───────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0,1.45fr) minmax(0,1fr) minmax(0,0.85fr)",
          }}
          className="ln-collapse"
        >
          {/* The wall */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                The wall
              </h2>
              <div className="ln-rule" />
              <Link href="/dashboard/works" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>
                All works
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
              {[
                { label: "Total", value: stats.total },
                { label: "For sale", value: stats.forSale },
                { label: "Reserved", value: stats.reserved, accent: true },
                { label: "Sold", value: stats.sold },
              ].map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    padding: i === 0 ? "0 16px 0 0" : i === 3 ? "0 0 0 16px" : "0 16px",
                    borderRight: i < 3 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <div className="ln-cap" style={{ marginBottom: 7 }}>
                    {s.label}
                  </div>
                  <div className="ln-num" style={{ fontSize: 24, color: s.accent ? "var(--flame)" : undefined }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: wall.length > 0 ? "1.5fr 1fr 1fr" : "1fr",
                gridTemplateRows: "184px",
                gap: 12,
              }}
            >
              {wall.length === 0 ? (
                <Link href="/dashboard/works?compose=1" className="ln-drop" style={{ padding: 14, gap: 9 }}>
                  <span className="ln-drop-well">
                    <Plus size={20} strokeWidth={1.4} />
                  </span>
                  <span className="ln-meta" style={{ fontSize: 11.5 }}>
                    Hang your first work
                  </span>
                </Link>
              ) : (
                wall.slice(0, 3).map((w, i) => (
                  <Link
                    key={w.id}
                    href={`/dashboard/works/${w.id}`}
                    style={{
                      position: "relative",
                      borderRadius: "var(--r-card)",
                      overflow: "hidden",
                      backgroundImage: w.images?.[0] ? `url(${w.images[0]})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "#1E2833",
                      boxShadow: "var(--ambient), var(--rim-sm)",
                      display: "block",
                      gridRow: i === 0 ? "span 1" : undefined,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg,rgba(11,16,22,0) 40%,rgba(11,16,22,0.82) 100%)",
                      }}
                    />
                    <div style={{ position: "absolute", left: 13, right: 13, bottom: 12 }}>
                      <div className="ln-card-title" style={{ fontSize: i === 0 ? 16 : 13.5 }}>
                        {w.title}
                      </div>
                      <div className="ln-meta" style={{ marginTop: 4, fontSize: 11 }}>
                        {w.availability_status === "sold"
                          ? "Sold"
                          : w.availability_status === "reserved"
                          ? "Reserved"
                          : w.price
                          ? `${w.currency === "EUR" ? "€" : "$"}${w.price} · ${w.medium || ""}`
                          : w.medium || "In progress"}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {notebookNote && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span className="ln-cap" style={{ whiteSpace: "nowrap" }}>
                  Notebook
                </span>
                <p className="ln-body" style={{ margin: 0, fontSize: 13.5, flex: 1, minWidth: 0 }}>
                  "{notebookNote}"
                </p>
              </div>
            )}
          </section>

          {/* The scene */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                The scene
              </h2>
              <div className="ln-rule" />
              <span className="ln-dot" />
              <span className="ln-cap">Live now</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {scene.length === 0 && (
                <p className="ln-meta" style={{ fontSize: 12 }}>
                  Nothing posted to the Scene yet.
                </p>
              )}
              {scene.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/scene/${post.id}`}
                  className="ln-fi"
                  style={{ alignItems: "flex-start", textDecoration: "none" }}
                >
                  <span
                    className="ln-thumb"
                    style={{ background: "linear-gradient(150deg,#2C5468,#14202B)" }}
                  />
                  <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                    <span className="ln-tag" style={{ display: "block" }}>
                      {post.post_type}
                    </span>
                    <span className="ln-card-title" style={{ display: "block", fontSize: 14 }}>
                      {post.title}
                    </span>
                    <span className="ln-meta" style={{ display: "block", marginTop: 4 }}>
                      {post.is_online ? "Online" : post.location || "Location TBC"}
                      {post.deadline ? ` · closes ${post.deadline}` : post.start_date ? ` · ${post.start_date}` : ""}
                    </span>
                    <span
                      className="ln-meta"
                      style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--lt-4)" }}
                    >
                      Posted by {post.posterName || "an artist"} · {timeAgo(post.created_at)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <Link href="/dashboard/scene" className="ln-btn ln-btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
                See who's around
              </Link>
              <Link href="/dashboard/scene?compose=1" className="ln-btn ln-btn-ghost">
                Post to the scene
              </Link>
            </div>
          </section>

          {/* To-do */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                To-do
              </h2>
              <div className="ln-rule" />
              <span className="ln-cap">{tasks.length} open</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
              {tasks.length === 0 && (
                <p className="ln-meta" style={{ fontSize: 12 }}>
                  Nothing open. Good week.
                </p>
              )}
              {tasks.map((t) => {
                const done = Boolean(doneIds[t.id]);
                const tone = priorityTone(t.priority);
                return (
                  <div key={t.id} className="ln-nested" style={{ padding: "13px 14px", display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <button className={`ln-box ${done ? "on" : ""}`} onClick={() => toggleTask(t)} aria-label="Mark done">
                      {done && (
                        <svg viewBox="0 0 24 24">
                          <path d="M4 12.5l5 5L20 6.5" />
                        </svg>
                      )}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ln-ct" style={{ opacity: done ? 0.45 : 1 }}>
                        {t.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span className="ln-badge" style={{ background: tone.well, color: tone.tone }}>
                          {t.priority}
                        </span>
                        <span className="ln-meta" style={{ fontSize: 11, color: "var(--lt-4)" }}>
                          {t.due_date || "no date"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link href="/dashboard/calendar?compose=1&type=task" className="ln-btn ln-btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Add a task
            </Link>
          </section>

          {/* This week */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                This week
              </h2>
              <div className="ln-rule" />
              <div className="ln-nav" style={{ padding: 3 }}>
                <button className={calTab === "yours" ? "on" : ""} onClick={() => setCalTab("yours")}>
                  Yours
                </button>
                <button className={calTab === "around" ? "on" : ""} onClick={() => setCalTab("around")}>
                  Around town
                </button>
              </div>
              <Link href="/dashboard/calendar" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>
                Open calendar
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.4fr .9fr 1fr .7fr",
                gap: 12,
                padding: "0 0 9px",
                borderBottom: "2px solid var(--border)",
              }}
            >
              <div className="ln-cap">What</div>
              <div className="ln-cap">Kind</div>
              <div className="ln-cap">Where</div>
              <div className="ln-cap">When</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {agenda.length === 0 && (
                <p className="ln-meta" style={{ fontSize: 12, padding: "12px 0" }}>
                  Nothing in the next seven days.
                </p>
              )}
              {agenda.map((e) => {
                const { rel, num } = dayLabel(e.start_date);
                const tone = kindTone(e.kind);
                return (
                  <Link
                    key={e.id}
                    href={calTab === "yours" ? `/dashboard/calendar?event=${e.id}` : "/dashboard/scene"}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.4fr .9fr 1fr .7fr",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 34, flex: "0 0 auto", textAlign: "center" }}>
                        <div className="ln-cap" style={{ fontSize: 9.5 }}>
                          {rel}
                        </div>
                        <div className="ln-num" style={{ fontSize: 19, marginTop: 2 }}>
                          {num}
                        </div>
                      </div>
                      <div className="ln-ct" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.title}
                      </div>
                    </div>
                    <div>
                      <span className="ln-badge" style={{ background: tone.well, color: tone.tone }}>
                        {e.kind}
                      </span>
                    </div>
                    <div className="ln-meta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.where}
                    </div>
                    <div className="ln-meta" style={{ color: "var(--lt-4)" }}>
                      {e.all_day === false && e.start_time ? e.start_time.slice(0, 5) : "all day"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Money */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                Money
              </h2>
              <div className="ln-rule" />
              <Link href="/dashboard/sales" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>
                Sales
              </Link>
            </div>

            <div className="ln-nested" style={{ padding: "18px 20px" }}>
              <div className="ln-cap" style={{ marginBottom: 9 }}>
                Sold this month
              </div>
              <div className="ln-num" style={{ color: "var(--flame)" }}>
                {fmtEUR(soldThisMonth)}
              </div>
              <div className="ln-body" style={{ fontSize: 13, marginTop: 8 }}>
                {salesDelta}.
              </div>
              <div className="ln-bar" style={{ marginTop: 14 }}>
                <i style={{ width: `${salesPct}%` }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="ln-well" style={{ padding: "15px 16px" }}>
                <div className="ln-cap" style={{ marginBottom: 8 }}>
                  Reach
                </div>
                <div className="ln-num" style={{ fontSize: 24 }}>
                  {reachCount}
                </div>
                <div className="ln-meta" style={{ marginTop: 6, fontSize: 11 }}>
                  views · last 30 days
                </div>
              </div>
              <div className="ln-well" style={{ padding: "15px 16px" }}>
                <div className="ln-cap" style={{ marginBottom: 8 }}>
                  Papers out
                </div>
                <div className="ln-num" style={{ fontSize: 24 }}>
                  {papersOut}
                </div>
                {papersAwaiting > 0 && (
                  <div className="ln-meta" style={{ marginTop: 6, fontSize: 11, color: "var(--warn)" }}>
                    {papersAwaiting} awaiting signature
                  </div>
                )}
              </div>
            </div>

            <div className="ln-status" style={{ marginTop: "auto" }}>
              <span>Front door · artomango.com/{profile?.username || "you"}</span>
              {frontDoorLive ? (
                <span className="ln-tick" style={{ background: "var(--ok-well)", color: "var(--ok)" }}>
                  ✓
                </span>
              ) : (
                <Link href="/dashboard/frontdoor" className="ln-meta" style={{ fontSize: 11, color: "var(--warn)" }}>
                  not live
                </Link>
              )}
            </div>
          </section>

          {/* Inbox */}
          <section className="ln-slab ln-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="ln-section-title" style={{ fontSize: 22 }}>
                Inbox
              </h2>
              <div className="ln-rule" />
              {unreadTotal > 0 && <span className="ln-pill">{unreadTotal} new</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {inbox.length === 0 && (
                <p className="ln-meta" style={{ fontSize: 12 }}>
                  Nothing yet.
                </p>
              )}
              {inbox.map((c) => (
                <Link key={c.id} href={`/dashboard/messages?c=${c.id}`} className="ln-nested" style={{ padding: 14, display: "flex", gap: 11, textDecoration: "none" }}>
                  <span className="ln-face">{c.otherName.slice(0, 2).toUpperCase()}</span>
                  <span style={{ minWidth: 0, display: "block" }}>
                    <span className="ln-card-title" style={{ display: "block", fontSize: 13.5 }}>
                      {c.otherName}
                    </span>
                    {c.preview && (
                      <span className="ln-body" style={{ display: "block", fontSize: 12.5, marginTop: 5 }}>
                        {c.preview}
                      </span>
                    )}
                    <span className="ln-meta" style={{ display: "block", marginTop: 7, fontSize: 11, color: "var(--lt-4)" }}>
                      {c.when}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <Link href="/dashboard/messages" className="ln-btn ln-btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Open messages
            </Link>
          </section>
        </div>

        {loading && (
          <p className="ln-meta" style={{ marginTop: 24, textAlign: "center" }}>
            Loading the studio…
          </p>
        )}
      </div>
    </>
  );
}
