// src/app/dashboard/calendar/page.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type CalEvent = {
  id: string;
  user_id: string;
  title: string;
  type: string;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  all_day: boolean;
  description?: string | null;
  location?: string | null;
  cover_url?: string | null;
  is_public?: boolean;
  rsvp_enabled?: boolean;
  capacity?: number | null;
  share_slug?: string | null;
  source?: "private" | "scene"; // "scene" = added from public_events
  origin_id?: string | null;     // pointer to public_events.id when source="scene"
};

type PublicEvent = {
  id: string;
  title: string;
  type: string;             // opening / vernissage / talk / open_call / festival / workshop / etc.
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  city?: string | null;
  description?: string | null;
  cover_url?: string | null;
  cover_gradient?: string | null; // fallback gradient if no cover_url
  distance_km?: number | null;
  closes_at?: string | null;      // for open calls
  external_url?: string | null;
};

type Task = {
  id: string;
  title: string;
  due_date: string;
  type?: string;
  status?: string;
  priority?: string;
};

type ViewMode = "month" | "week";
type SceneTab = "this_week" | "open_calls" | "saved";

/* ════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const TYPE_CFG: Record<string, { label: string; color: string; cls: string }> = {
  exhibition: { label: "Exhibition", color: "#CA8A04", cls: "exhibition" },
  deadline:   { label: "Deadline",   color: "#D93A26", cls: "deadline" },
  collab:     { label: "Collab",     color: "#0EA5A5", cls: "collab" },
  meeting:    { label: "Meeting",    color: "#7C3AED", cls: "meeting" },
  personal:   { label: "Personal",   color: "#111110", cls: "personal" },
  sale:       { label: "Sale",       color: "#EC4899", cls: "sale" },
  artwork:    { label: "Artwork",    color: "#FFD400", cls: "artwork" },
};

const PUBLIC_TYPE_CFG: Record<string, { label: string; gradient: string; tagBg: string; tagColor: string; tagBorder: string }> = {
  opening:    { label: "Opening",    gradient: "linear-gradient(135deg,#FFD400 0%,#E8A400 100%)", tagBg: "#FFD400", tagColor: "#111110", tagBorder: "#111110" },
  vernissage: { label: "Vernissage", gradient: "linear-gradient(135deg,#1A1A1A 0%,#5C4A3A 100%)", tagBg: "#111110", tagColor: "#FFD400", tagBorder: "#111110" },
  talk:       { label: "Talk",       gradient: "linear-gradient(135deg,#9EE3DC 0%,#0EA5A5 100%)", tagBg: "#7C3AED", tagColor: "#fff",     tagBorder: "#111110" },
  open_call:  { label: "Open call",  gradient: "linear-gradient(135deg,#FFC9DE 0%,#EC4899 100%)", tagBg: "#fff",    tagColor: "#111110", tagBorder: "#111110" },
  festival:   { label: "Festival",   gradient: "linear-gradient(135deg,#C9B6E4 0%,#7C3AED 100%)", tagBg: "#111110", tagColor: "#FFD400", tagBorder: "#111110" },
  workshop:   { label: "Workshop",   gradient: "linear-gradient(135deg,#B5D99C 0%,#1E8E3E 100%)", tagBg: "#fff",    tagColor: "#111110", tagBorder: "#111110" },
  residency:  { label: "Residency",  gradient: "linear-gradient(135deg,#FFE08A 0%,#CA8A04 100%)", tagBg: "#111110", tagColor: "#FFD400", tagBorder: "#111110" },
};

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
};

const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "");

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const formatRelDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
};

const daysFromNow = (d?: string | null) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `${diff} days`;
};

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const today = new Date();
  const todayStr = isoDate(today);

  /* ── view & nav ── */
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  });

  /* ── data ── */
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savedPublicIds, setSavedPublicIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  /* ── filters ── */
  const initialFilters = new Set([
    "exhibition", "deadline", "collab", "meeting", "personal", "sale", "artwork", "scene", "tasks",
  ]);
  const [filters, setFilters] = useState<Set<string>>(initialFilters);
  const [sceneTab, setSceneTab] = useState<SceneTab>("this_week");
  const [sceneSearch, setSceneSearch] = useState("");

  /* ── composer drawer ── */
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const blankForm = {
    title: "",
    type: "exhibition",
    start_date: todayStr,
    end_date: "",
    start_time: "",
    end_time: "",
    all_day: false,
    description: "",
    location: "",
    cover_url: "",
    is_public: false,
    rsvp_enabled: false,
    capacity: "",
  };
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  /* ── public event detail panel ── */
  const [detailEvent, setDetailEvent] = useState<PublicEvent | null>(null);

  /* ── private event detail (click on grid chip) ── */
  const [selectedPrivate, setSelectedPrivate] = useState<CalEvent | null>(null);

  /* ════════════════════════════════════════════════════════════
     LOAD DATA
  ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const [evRes, pubRes, tkRes] = await Promise.all([
          supabase.from("calendar_events").select("*").eq("user_id", user.id).order("start_date"),
          supabase.from("public_events").select("*").order("start_date"),
          supabase.from("tasks").select("id,title,due_date,type,status,priority").eq("user_id", user.id).not("due_date", "is", null),
        ]);

        const evs = (evRes.data || []) as CalEvent[];
        setEvents(evs);
        setPublicEvents((pubRes.data || []) as PublicEvent[]);
        setTasks(((tkRes.data || []) as Task[]).filter(t => t.due_date && t.status !== "done"));

        // Track which public events the user has already added (by origin_id)
        const saved = new Set<string>();
        evs.forEach(e => { if (e.source === "scene" && e.origin_id) saved.add(e.origin_id); });
        setSavedPublicIds(saved);
      } catch (err) {
        console.error("[calendar] load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const reload = async () => {
    const supabase = createClient();
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const { data: evs } = await supabase.from("calendar_events").select("*").eq("user_id", user.id).order("start_date");
      const list = (evs || []) as CalEvent[];
      setEvents(list);
      const saved = new Set<string>();
      list.forEach(e => { if (e.source === "scene" && e.origin_id) saved.add(e.origin_id); });
      setSavedPublicIds(saved);
    } catch (err) {
      console.error("[calendar] reload error:", err);
    }
  };

  /* ════════════════════════════════════════════════════════════
     ITEM AGGREGATION (for the grid)
  ═══════════════════════════════════════════════════════════ */
  type GridItem = {
    id: string;
    title: string;
    type: string;
    source: "private" | "scene" | "public" | "task";
    start_date: string;
    end_date?: string | null;
    start_time?: string | null;
    raw: CalEvent | PublicEvent | Task;
  };

  const allGridItems: GridItem[] = useMemo(() => {
    const out: GridItem[] = [];

    // Private events (user-owned, both source=private and source=scene live here)
    events.forEach(e => {
      const passType = e.source === "scene" ? filters.has("scene") : filters.has(e.type);
      if (!passType) return;
      out.push({
        id: e.id,
        title: e.title,
        type: e.type,
        source: e.source === "scene" ? "scene" : "private",
        start_date: e.start_date,
        end_date: e.end_date,
        start_time: e.start_time,
        raw: e,
      });
    });

    // Public events that are NOT yet added (shown as dashed/italic on grid)
    if (filters.has("scene")) {
      publicEvents.forEach(p => {
        if (savedPublicIds.has(p.id)) return; // already in private list as source=scene
        out.push({
          id: `pub-${p.id}`,
          title: p.title,
          type: p.type,
          source: "public",
          start_date: p.start_date,
          end_date: p.end_date,
          start_time: p.start_time,
          raw: p,
        });
      });
    }

    // Tasks (with due_date)
    if (filters.has("tasks")) {
      tasks.forEach(t => {
        out.push({
          id: `task-${t.id}`,
          title: t.title,
          type: "task",
          source: "task",
          start_date: t.due_date,
          raw: t,
        });
      });
    }

    return out;
  }, [events, publicEvents, tasks, filters, savedPublicIds]);

  const itemsForDate = (dateStr: string) =>
    allGridItems.filter(it => {
      if (it.end_date) return it.start_date <= dateStr && it.end_date >= dateStr;
      return it.start_date === dateStr;
    });

  /* ════════════════════════════════════════════════════════════
     SCENE PANEL FILTERING
  ═══════════════════════════════════════════════════════════ */
  const scenePanelItems = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const q = sceneSearch.trim().toLowerCase();

    return publicEvents
      .filter(p => {
        if (q) {
          const hay = `${p.title} ${p.venue || ""} ${p.city || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (sceneTab === "open_calls") return p.type === "open_call" || p.type === "residency";
        if (sceneTab === "saved") return savedPublicIds.has(p.id);
        // this_week
        const t = new Date(p.start_date).getTime();
        return p.type === "open_call" ? true : (t >= now && t <= weekFromNow + 30 * 24 * 60 * 60 * 1000);
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [publicEvents, sceneTab, sceneSearch, savedPublicIds]);

  /* ════════════════════════════════════════════════════════════
     ACTIONS
  ═══════════════════════════════════════════════════════════ */
  const openComposerNew = (presetDate?: string) => {
    setComposerMode("create");
    setEditingId(null);
    setForm({ ...blankForm, start_date: presetDate || todayStr });
    setSelectedPrivate(null);
    setDetailEvent(null);
    setComposerOpen(true);
  };

  const openComposerEdit = (e: CalEvent) => {
    setComposerMode("edit");
    setEditingId(e.id);
    setForm({
      title: e.title || "",
      type: e.type || "exhibition",
      start_date: e.start_date,
      end_date: e.end_date || "",
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      all_day: e.all_day,
      description: e.description || "",
      location: e.location || "",
      cover_url: e.cover_url || "",
      is_public: !!e.is_public,
      rsvp_enabled: !!e.rsvp_enabled,
      capacity: e.capacity ? String(e.capacity) : "",
    });
    setSelectedPrivate(null);
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setEditingId(null);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) { setSaving(false); return; }

      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        start_time: form.all_day ? null : (form.start_time || null),
        end_time: form.all_day ? null : (form.end_time || null),
        all_day: form.all_day,
        description: form.description || null,
        location: form.location || null,
        cover_url: form.cover_url || null,
        is_public: form.is_public,
        rsvp_enabled: form.is_public ? form.rsvp_enabled : false,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        share_slug: form.is_public ? slugify(form.title) : null,
      };

      if (composerMode === "edit" && editingId) {
        await supabase.from("calendar_events").update(payload).eq("id", editingId);
      } else {
        await supabase.from("calendar_events").insert({ ...payload, source: "private" });
      }

      setComposerOpen(false);
      setEditingId(null);
      setForm(blankForm);
      await reload();
    } catch (err) {
      console.error("[calendar] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    try {
      await supabase.from("calendar_events").delete().eq("id", id);
      setSelectedPrivate(null);
      setComposerOpen(false);
      await reload();
    } catch (err) {
      console.error("[calendar] delete error:", err);
    }
  };

  const addPublicToCalendar = async (p: PublicEvent) => {
    const supabase = createClient();
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: p.title,
        type: p.type === "open_call" || p.type === "residency" ? "deadline" : "exhibition",
        start_date: p.start_date,
        end_date: p.end_date || null,
        start_time: p.start_time || null,
        end_time: p.end_time || null,
        all_day: !p.start_time,
        description: p.description || null,
        location: p.venue ? `${p.venue}${p.city ? ", " + p.city : ""}` : null,
        cover_url: p.cover_url || null,
        is_public: false,
        source: "scene",
        origin_id: p.id,
      });
      await reload();
      setDetailEvent(null);
    } catch (err) {
      console.error("[calendar] addPublic error:", err);
    }
  };

  const removeAddedPublic = async (publicId: string) => {
    const supabase = createClient();
    try {
      await supabase.from("calendar_events").delete().eq("origin_id", publicId);
      await reload();
    } catch (err) {
      console.error("[calendar] removeAddedPublic error:", err);
    }
  };

  /* ── nav ── */
  const prevPeriod = () => {
    if (view === "month") {
      let m = cursor.month - 1, y = cursor.year;
      if (m < 0) { m = 11; y--; }
      setCursor(c => ({ ...c, year: y, month: m }));
    } else {
      const d = new Date(cursor.year, cursor.month, cursor.day - 7);
      setCursor({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    }
  };
  const nextPeriod = () => {
    if (view === "month") {
      let m = cursor.month + 1, y = cursor.year;
      if (m > 11) { m = 0; y++; }
      setCursor(c => ({ ...c, year: y, month: m }));
    } else {
      const d = new Date(cursor.year, cursor.month, cursor.day + 7);
      setCursor({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    }
  };
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });

  const toggleFilter = (key: string) => {
    setFilters(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const getWeekDates = () => {
    const base = new Date(cursor.year, cursor.month, cursor.day);
    const dow = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  /* ════════════════════════════════════════════════════════════
     MONTH GRID DATES
  ═══════════════════════════════════════════════════════════ */
  const monthGrid = useMemo(() => {
    const daysIn = getDaysInMonth(cursor.year, cursor.month);
    const firstDay = getFirstDayOfMonth(cursor.year, cursor.month);
    const prevMonthDays = getDaysInMonth(cursor.year, cursor.month - 1);
    const cells: { date: Date; out: boolean }[] = [];

    // leading days
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(cursor.year, cursor.month - 1, prevMonthDays - i),
        out: true,
      });
    }
    // current month
    for (let d = 1; d <= daysIn; d++) {
      cells.push({ date: new Date(cursor.year, cursor.month, d), out: false });
    }
    // trailing days to fill 6 rows max (or 5)
    const totalNeeded = cells.length <= 35 ? 35 : 42;
    let nextD = 1;
    while (cells.length < totalNeeded) {
      cells.push({ date: new Date(cursor.year, cursor.month + 1, nextD), out: true });
      nextD++;
    }
    return cells;
  }, [cursor]);

  /* ════════════════════════════════════════════════════════════
     PREVIEW DATA (for composer right panel)
  ═══════════════════════════════════════════════════════════ */
  const previewGradient = PUBLIC_TYPE_CFG[form.type]?.gradient || PUBLIC_TYPE_CFG.opening.gradient;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
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
          --amber:#CA8A04;
          --shadow:3px 4px 0 var(--black);
          --radius:20px;
        }
        .cal-root { font-family: 'Darker Grotesque', system-ui, sans-serif; color: var(--black); padding-bottom: 80px; font-weight: 500; }
        .cal-root .serif { font-family: 'Fraunces', serif; }
        .cal-root .serif-i { font-family: 'Fraunces', serif; font-style: italic; font-weight: 600; }

        /* ─── HEADER ─── */
        .ph {
          display: grid; grid-template-columns: 1fr auto; gap: 24px;
          align-items: end; margin-bottom: 22px;
          padding-bottom: 18px; border-bottom: 2.5px solid var(--black);
        }
        .ph-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 11px; font-weight: 800; color: var(--ink);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 8px;
        }
        .ph-eyebrow .ln { width: 24px; height: 2px; background: var(--black); }
        .ph-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: clamp(36px, 4.5vw, 54px);
          line-height: 0.95; letter-spacing: -1.8px; margin: 0;
        }
        .ph-title em { font-style: italic; color: var(--ink); font-weight: 600; }
        .ph-sub {
          font-size: 14px; font-weight: 600; color: var(--ink);
          margin-top: 10px; max-width: 520px; line-height: 1.4;
        }
        .ph-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        /* ─── BUTTONS ─── */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 18px; border: 2.5px solid var(--black); border-radius: 99px;
          background: #fff; font-family: inherit; font-size: 13px; font-weight: 800;
          color: var(--black); cursor: pointer; box-shadow: 3px 3px 0 var(--black);
          transition: transform .15s, box-shadow .15s;
        }
        .btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--black); }
        .btn.primary { background: var(--yellow); }
        .btn.dark { background: var(--black); color: var(--yellow); box-shadow: 3px 3px 0 var(--yellow); }
        .btn.ghost { box-shadow: none; background: transparent; }
        .btn.danger { background: #fff; color: var(--red); border-color: var(--red); box-shadow: 3px 3px 0 var(--red); }
        .btn-arrow { font-family: 'Fraunces', serif; font-style: italic; font-size: 16px; }

        /* ─── TOOLBAR ─── */
        .tb {
          display: grid; grid-template-columns: auto auto 1fr; gap: 14px;
          align-items: center; margin-bottom: 18px; flex-wrap: wrap;
        }
        .tb-month {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 30px;
          letter-spacing: -1px; line-height: 1;
        }
        .tb-month em { font-style: italic; color: var(--ink); font-weight: 600; margin-left: 4px; }
        .nav-group {
          display: flex; align-items: center; border: 2.5px solid var(--black);
          border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 2px 2px 0 var(--black);
        }
        .nav-group button {
          width: 40px; height: 38px; background: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: inherit; font-size: 18px; font-weight: 900; color: var(--black);
          border-right: 1.5px solid var(--black);
        }
        .nav-group button:last-child { border-right: none; }
        .nav-group button.today {
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0 14px; width: auto; background: var(--cream);
        }
        .nav-group button:hover { background: var(--cream); }
        .nav-group button.today:hover { background: var(--yellow); }

        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .filter-pills .show-lbl {
          font-size: 10px; font-weight: 900; color: var(--muted);
          letter-spacing: 0.14em; text-transform: uppercase; margin-right: 4px;
        }
        .fp {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border: 2px solid var(--black); border-radius: 99px;
          background: #fff; font-family: inherit; font-size: 11px; font-weight: 800;
          cursor: pointer; transition: opacity .15s;
          color: var(--black);
        }
        .fp .dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--black); }
        .fp.off { opacity: 0.4; }
        .fp.off .dot { background: transparent !important; }
        .fp .dot-dashed { background: transparent; border: 1.5px dashed var(--black); }

        .view-toggle {
          display: flex; padding: 3px; background: var(--cream);
          border: 2.5px solid var(--black); border-radius: 99px;
        }
        .view-toggle button {
          padding: 7px 18px; border-radius: 99px; border: none; background: none;
          font-family: inherit; font-size: 11.5px; font-weight: 900; letter-spacing: 0.06em;
          text-transform: uppercase; cursor: pointer; color: var(--ink);
        }
        .view-toggle button.on { background: var(--black); color: var(--yellow); }

        /* ─── MAIN GRID ─── */
        .main { display: grid; grid-template-columns: 1fr 380px; gap: 18px; }

        /* ─── CALENDAR GRID ─── */
        .cal-card {
          background: #fff; border: 2.5px solid var(--black);
          border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
        }
        .wd-row { display: grid; grid-template-columns: repeat(7, 1fr); background: var(--black); }
        .wd-row .wd {
          padding: 11px 14px; color: var(--yellow);
          font-size: 10.5px; font-weight: 900; letter-spacing: 0.16em;
          text-transform: uppercase; border-right: 1.5px solid rgba(255,212,0,0.2);
        }
        .wd-row .wd:last-child { border-right: none; }
        .wd-row .wd.weekend { color: rgba(255,212,0,0.55); }

        .month-grid {
          display: grid; grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(124px, auto);
        }
        .day {
          border-right: 1.5px solid var(--border);
          border-bottom: 1.5px solid var(--border);
          padding: 8px 9px 10px;
          background: #fff; cursor: pointer;
          transition: background .15s;
          position: relative;
          overflow: hidden;
        }
        .day:nth-child(7n) { border-right: none; }
        .day:hover { background: var(--cream); }
        .day.out { background: var(--paper); opacity: 0.55; }
        .day.weekend { background: #FCFAF5; }
        .day.weekend.out { background: var(--paper); }
        .day-num {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 20px;
          line-height: 1; letter-spacing: -0.5px; color: var(--black);
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 28px; height: 28px; margin-bottom: 6px;
        }
        .day.today .day-num {
          background: var(--yellow); border: 2px solid var(--black); border-radius: 50%;
          width: 30px; height: 30px; font-size: 15px; font-weight: 800;
          box-shadow: 2px 2px 0 var(--black);
        }
        .day.out .day-num { color: var(--muted); }

        /* event chips */
        .ev {
          display: flex; align-items: center; gap: 5px;
          padding: 3px 7px; margin-bottom: 3px; border-radius: 5px;
          font-size: 10.5px; font-weight: 800; line-height: 1.2;
          border: 1.5px solid var(--black); cursor: pointer;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          background: #fff;
        }
        .ev .ev-time {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 10px;
          flex-shrink: 0; opacity: 0.7;
        }
        .ev.exhibition { background: #FFF6CC; border-color: var(--amber); }
        .ev.deadline   { background: #FFE0DA; border-color: var(--red); }
        .ev.collab     { background: #D6F2EF; border-color: var(--teal); }
        .ev.meeting    { background: #E8DDFA; border-color: var(--violet); }
        .ev.personal   { background: #fff; border-color: var(--black); }
        .ev.sale       { background: #FCE7F3; border-color: var(--pink); }
        .ev.artwork    { background: var(--cream); border-color: var(--amber); }
        .ev.public-pending {
          background: transparent; color: var(--ink);
          border: 1.5px dashed var(--black);
          font-style: italic;
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 10.5px;
        }
        .ev.public-pending::before {
          content: "○"; font-family: 'Fraunces', serif; font-style: normal;
          font-weight: 800; margin-right: 3px; color: var(--black); font-size: 10px;
        }
        .ev.scene-added {
          background: var(--yellow);
          border: 1.5px dashed var(--black);
          font-weight: 800;
        }
        .ev.scene-added::before { content: "✓ "; color: var(--black); font-weight: 900; }
        .ev.task {
          background: #FAFAF8; border: 1.5px solid var(--black);
        }
        .ev.task::before { content: "⚑ "; color: var(--red); font-weight: 900; }
        .ev:hover { transform: translate(-1px,-1px); }

        .ev-more {
          font-size: 10px; font-weight: 800; color: var(--ink);
          padding: 2px 7px; background: none; border: none; cursor: pointer;
          font-family: inherit;
          text-decoration: underline; text-decoration-thickness: 1.5px;
          text-underline-offset: 2px;
        }

        /* ─── WEEK VIEW ─── */
        .week-grid {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          background: #fff;
        }
        .week-grid .h-cell {
          padding: 10px 8px; border-right: 1.5px solid var(--border);
          border-bottom: 2px solid var(--black);
          font-size: 11px; font-weight: 900; color: var(--ink);
          letter-spacing: 0.08em; text-transform: uppercase;
          background: var(--cream); text-align: center;
        }
        .week-grid .h-cell.today { background: var(--yellow); }
        .week-grid .h-cell .d-num {
          font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600;
          letter-spacing: -0.4px; color: var(--black); display: block; margin-top: 2px;
        }
        .week-grid .corner { background: var(--black); }
        .week-grid .hour-lbl {
          padding: 6px 8px; border-right: 1.5px solid var(--border);
          border-bottom: 1px dashed var(--border);
          font-family: 'Fraunces', serif; font-style: italic;
          font-size: 12px; font-weight: 600; color: var(--ink);
          text-align: right;
        }
        .week-grid .h-slot {
          border-right: 1.5px solid var(--border);
          border-bottom: 1px dashed var(--border);
          min-height: 44px; padding: 2px 4px; cursor: pointer;
        }
        .week-grid .h-slot:hover { background: var(--cream); }
        .week-grid .all-day-row { background: #FCFAF5; }
        .week-grid .all-day-row .h-slot { border-bottom: 2px solid var(--black); min-height: 32px; }

        /* ─── SCENE PANEL ─── */
        .scene-panel {
          background: var(--black); color: #fff;
          border: 2.5px solid var(--black); border-radius: var(--radius);
          box-shadow: 5px 6px 0 var(--yellow);
          display: flex; flex-direction: column;
          align-self: start;
          overflow: hidden;
        }
        .scene-head {
          padding: 22px 22px 18px;
          border-bottom: 2px solid rgba(255,255,255,0.08);
        }
        .scene-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10.5px; font-weight: 900; color: var(--yellow);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 8px;
        }
        .scene-eyebrow .ln { width: 20px; height: 2px; background: var(--yellow); }
        .scene-title {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 28px;
          letter-spacing: -1px; line-height: 1.05; margin: 0; color: #fff;
        }
        .scene-title em { color: var(--yellow); font-style: italic; font-weight: 600; }
        .scene-sub {
          font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.65);
          margin-top: 8px; line-height: 1.4;
        }
        .scene-search {
          margin-top: 14px; display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px;
        }
        .scene-search input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #fff; font-family: inherit; font-size: 12px; font-weight: 700;
        }
        .scene-search input::placeholder { color: rgba(255,255,255,0.45); }
        .scene-search .icon { color: var(--yellow); font-family: 'Fraunces', serif; font-size: 14px; }

        .scene-tabs {
          display: flex; padding: 0 12px;
          border-bottom: 2px solid rgba(255,255,255,0.08);
        }
        .scene-tabs button {
          flex: 1; padding: 11px 8px; background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 11px; font-weight: 900;
          color: rgba(255,255,255,0.55); letter-spacing: 0.1em; text-transform: uppercase;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
        }
        .scene-tabs button.on { color: var(--yellow); border-color: var(--yellow); }

        .scene-list {
          padding: 14px; display: flex; flex-direction: column; gap: 10px;
          max-height: 880px; overflow-y: auto;
        }
        .scene-list::-webkit-scrollbar { width: 6px; }
        .scene-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 99px; }
        .se {
          background: #fff; color: var(--black); border: 2px solid var(--black);
          border-radius: 14px; overflow: hidden;
          box-shadow: 3px 3px 0 var(--yellow);
          transition: transform .15s, box-shadow .15s;
          cursor: pointer; flex-shrink: 0;
        }
        .se:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--yellow); }
        .se.added { box-shadow: 3px 3px 0 #fff; outline: 2px solid var(--yellow); }
        .se-cover {
          height: 96px; position: relative;
          border-bottom: 2px solid var(--black);
          background-size: cover; background-position: center;
          display: flex; align-items: flex-end; padding: 10px;
        }
        .se-cover-tag {
          font-size: 9.5px; font-weight: 900; padding: 3px 9px;
          border-radius: 99px; letter-spacing: 0.12em; text-transform: uppercase;
          border: 1.5px solid;
        }
        .se-body { padding: 12px 14px; }
        .se-date {
          display: flex; align-items: center; gap: 6px;
          font-size: 10.5px; font-weight: 900; color: var(--ink);
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;
        }
        .se-date b { color: var(--black); font-weight: 900; }
        .se-title {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 17px;
          letter-spacing: -0.5px; line-height: 1.15; margin: 0 0 4px;
        }
        .se-venue { font-size: 12px; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
        .se-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .se-meta { font-size: 10.5px; font-weight: 800; color: var(--muted); display: flex; gap: 6px; align-items: center; }
        .se-add {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 11px; background: var(--yellow); color: var(--black);
          border: 2px solid var(--black); border-radius: 99px;
          font-family: inherit; font-size: 11px; font-weight: 900;
          cursor: pointer; box-shadow: 2px 2px 0 var(--black);
        }
        .se-add.added { background: #fff; color: var(--ink); }
        .se-empty {
          padding: 28px 16px; text-align: center;
          color: rgba(255,255,255,0.55); font-size: 13px; font-weight: 700;
        }

        /* ─── COMPOSER DRAWER ─── */
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(17,17,16,0.55);
          backdrop-filter: blur(2px);
          display: flex; justify-content: flex-end;
          animation: fade .18s ease-out;
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .drawer {
          width: min(880px, 100vw);
          background: var(--paper);
          border-left: 2.5px solid var(--black);
          display: grid; grid-template-columns: 1.1fr 1fr;
          overflow: hidden;
          animation: slide-in .25s ease-out;
        }
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .drawer-close {
          position: absolute; top: 16px; right: 18px;
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff; border: 2.5px solid var(--black);
          font-family: inherit; font-size: 18px; font-weight: 900;
          cursor: pointer; box-shadow: 2px 2px 0 var(--black);
          z-index: 5;
        }
        .composer-left {
          padding: 32px 32px 28px;
          background: var(--cream);
          position: relative;
          overflow-y: auto;
          border-right: 2.5px solid var(--black);
        }
        .composer-left::after {
          content: ""; position: absolute; inset: 0; opacity: 0.05; pointer-events: none;
          background-image: radial-gradient(var(--black) 1px, transparent 1px);
          background-size: 5px 5px;
        }
        .composer-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 10.5px; font-weight: 900; color: var(--ink);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 12px;
          position: relative; z-index: 2;
        }
        .composer-eyebrow .ln { width: 20px; height: 2px; background: var(--ink); }
        .composer-h {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 36px; letter-spacing: -1.3px; line-height: 1; margin: 0 0 6px;
          position: relative; z-index: 2;
        }
        .composer-h em { font-style: italic; color: var(--ink); font-weight: 600; }
        .composer-sub {
          font-size: 13px; font-weight: 600; color: var(--ink);
          margin-bottom: 22px; line-height: 1.4;
          position: relative; z-index: 2;
        }

        .visibility-tog {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0;
          border: 2.5px solid var(--black); border-radius: 14px; overflow: hidden;
          margin-bottom: 22px; background: #fff;
          box-shadow: 3px 3px 0 var(--black);
          position: relative; z-index: 2;
        }
        .vtg {
          padding: 14px 16px; cursor: pointer; background: #fff;
          border-right: 2.5px solid var(--black);
          display: flex; flex-direction: column; gap: 2px;
          font-family: inherit;
        }
        .vtg:last-child { border-right: none; }
        .vtg.on { background: var(--yellow); }
        .vtg-t {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px;
          letter-spacing: -0.5px; line-height: 1;
          display: flex; align-items: center; gap: 8px;
        }
        .vtg-t::before {
          content: ""; width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid var(--black); background: #fff;
        }
        .vtg.on .vtg-t::before { background: var(--black); }
        .vtg-d { font-size: 11px; font-weight: 700; color: var(--ink); margin-top: 2px; text-align: left; }

        .field { margin-bottom: 16px; position: relative; z-index: 2; }
        .field-l {
          font-size: 10px; font-weight: 900; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink); margin-bottom: 6px; display: block;
        }
        .field input, .field textarea, .field select {
          width: 100%; padding: 11px 14px; font-family: inherit;
          font-size: 14px; font-weight: 600;
          border: 2px solid var(--black); border-radius: 10px; background: #fff;
          color: var(--black); outline: none; box-sizing: border-box;
        }
        .field input:focus, .field textarea:focus, .field select:focus {
          border-color: var(--yellow); box-shadow: 0 0 0 2px var(--yellow);
        }
        .field input::placeholder, .field textarea::placeholder {
          color: var(--muted); font-weight: 500;
        }
        .field input.title-input {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 24px;
          letter-spacing: -0.6px; border: none; background: transparent;
          padding: 0; margin-bottom: 14px;
        }
        .field input.title-input:focus { box-shadow: none; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .type-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .type-pill {
          padding: 6px 12px; border: 2px solid var(--black); border-radius: 99px;
          font-family: inherit; font-size: 11px; font-weight: 800;
          background: #fff; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .type-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
        .type-pill.on { background: var(--black); color: #fff; }

        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; background: #fff; border: 2px solid var(--black);
          border-radius: 12px; margin-bottom: 10px; position: relative; z-index: 2;
        }
        .tr-l { font-size: 13px; font-weight: 800; }
        .tr-d { font-size: 11px; font-weight: 600; color: var(--ink); margin-top: 2px; }
        .switch {
          width: 42px; height: 24px; border: 2px solid var(--black); border-radius: 99px;
          background: #fff; position: relative; cursor: pointer; flex-shrink: 0;
        }
        .switch.on { background: var(--yellow); }
        .switch::after {
          content: ""; width: 14px; height: 14px; border-radius: 50%;
          background: var(--black); position: absolute; top: 3px; left: 3px;
          transition: left .15s;
        }
        .switch.on::after { left: 21px; }

        .composer-right {
          padding: 32px 32px 28px; background: #fff;
          display: flex; flex-direction: column; gap: 14px;
          overflow-y: auto;
        }
        .preview-eyebrow {
          font-size: 10.5px; font-weight: 900; color: var(--muted);
          letter-spacing: 0.18em; text-transform: uppercase;
        }
        .preview-card {
          background: #fff; border: 2.5px solid var(--black);
          border-radius: 14px; overflow: hidden;
          box-shadow: 5px 6px 0 var(--yellow);
        }
        .preview-cover {
          height: 160px; background-size: cover; background-position: center;
          border-bottom: 2.5px solid var(--black);
          display: flex; align-items: flex-end; padding: 14px;
        }
        .preview-cover-tag {
          font-size: 10px; font-weight: 900; padding: 4px 10px;
          border-radius: 99px; letter-spacing: 0.12em; text-transform: uppercase;
          border: 2px solid;
        }
        .preview-body { padding: 18px; }
        .preview-date {
          display: flex; align-items: center; gap: 8px;
          font-size: 11.5px; font-weight: 900; color: var(--ink);
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;
        }
        .preview-title {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 24px;
          letter-spacing: -0.7px; line-height: 1.1; margin: 0 0 8px;
        }
        .preview-venue { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 14px; }
        .preview-desc {
          font-size: 13px; font-weight: 600; color: var(--ink);
          line-height: 1.45; margin-bottom: 14px;
        }
        .preview-meta {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding-top: 14px; border-top: 1.5px solid var(--border);
        }
        .preview-chip {
          font-size: 10.5px; font-weight: 800; padding: 5px 10px; border-radius: 99px;
          background: var(--cream); border: 1.5px solid var(--black);
        }
        .preview-share {
          margin-top: 14px; display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: var(--black); color: var(--yellow);
          border-radius: 10px; font-size: 12px; font-weight: 800;
        }
        .preview-share .url {
          font-family: 'Fraunces', serif; font-style: italic; color: #fff;
          font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .composer-actions {
          display: flex; gap: 10px; justify-content: space-between; align-items: center;
          margin-top: 18px; padding-top: 18px; border-top: 2px solid var(--black);
          position: relative; z-index: 2;
        }
        .composer-actions .left, .composer-actions .right { display: flex; gap: 10px; }

        /* ─── PUBLIC EVENT DETAIL MODAL ─── */
        .detail-overlay {
          position: fixed; inset: 0; z-index: 90;
          background: rgba(17,17,16,0.6); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center;
          padding: 32px; animation: fade .18s ease-out;
        }
        .detail {
          width: min(960px, 100%);
          max-height: 90vh; overflow: auto;
          background: #fff; border: 2.5px solid var(--black);
          border-radius: var(--radius); box-shadow: var(--shadow);
          display: grid; grid-template-columns: 1.3fr 1fr;
          animation: pop-in .22s ease-out;
        }
        @keyframes pop-in {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .detail-cover {
          background-size: cover; background-position: center;
          border-right: 2.5px solid var(--black);
          position: relative; display: flex; align-items: flex-end; padding: 24px;
          min-height: 380px;
        }
        .detail-cover::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(17,17,16,0.85) 100%);
          pointer-events: none;
        }
        .detail-cover-content { position: relative; z-index: 2; color: #fff; }
        .dtag-row { display: flex; gap: 8px; margin-bottom: 14px; }
        .dtag {
          padding: 5px 12px; border-radius: 99px;
          font-size: 11px; font-weight: 900; letter-spacing: 0.1em;
          text-transform: uppercase; border: 2px solid;
        }
        .detail-h {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 38px; letter-spacing: -1.3px; line-height: 1.02;
          margin: 0 0 8px; color: #fff;
        }
        .detail-venue { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); }
        .detail-body { padding: 28px 30px; display: flex; flex-direction: column; gap: 18px; }
        .detail-when {
          display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: center;
          padding: 14px 16px; border: 2.5px solid var(--black); border-radius: 14px;
          background: var(--cream);
        }
        .ddb {
          text-align: center; padding: 8px 12px; background: var(--yellow);
          border: 2px solid var(--black); border-radius: 10px; min-width: 70px;
        }
        .ddb-m { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
        .ddb-d { font-family: 'Fraunces', serif; font-weight: 600; font-size: 30px; line-height: 1; letter-spacing: -1px; }
        .detail-when-r { font-size: 13px; font-weight: 700; color: var(--ink); }
        .detail-when-r b { color: var(--black); font-weight: 900; font-size: 14px; display: block; margin-bottom: 2px; }
        .detail-desc { font-size: 14px; font-weight: 600; color: var(--ink); line-height: 1.5; }
        .detail-meta { display: flex; flex-wrap: wrap; gap: 8px; }
        .dmeta {
          font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 99px;
          background: #fff; border: 2px solid var(--black);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .detail-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; padding-top: 8px; }

        /* ─── PRIVATE EVENT POPOVER ─── */
        .priv-pop {
          position: fixed; z-index: 60; background: #fff;
          border: 2.5px solid var(--black); border-radius: 16px;
          box-shadow: var(--shadow);
          padding: 18px 20px; width: 320px;
          font-family: inherit;
        }
        .priv-pop-head {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;
          margin-bottom: 10px;
        }
        .priv-pop-tag {
          font-size: 10px; font-weight: 900; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 3px 8px; border: 1.5px solid var(--black);
          border-radius: 99px; background: var(--cream);
        }
        .priv-pop-x {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid var(--black); background: #fff; cursor: pointer;
          font-weight: 900; font-family: inherit;
        }
        .priv-pop-t {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px;
          letter-spacing: -0.5px; line-height: 1.1; margin: 0 0 6px;
        }
        .priv-pop-when, .priv-pop-loc {
          font-size: 12px; font-weight: 700; color: var(--ink); margin-bottom: 6px;
        }
        .priv-pop-desc { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.4; margin: 10px 0; }
        .priv-pop-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1.5px solid var(--border); }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1100px) {
          .main { grid-template-columns: 1fr; }
          .scene-panel { max-height: none; }
          .drawer { grid-template-columns: 1fr; width: 100%; }
        }
        @media (max-width: 700px) {
          .ph { grid-template-columns: 1fr; }
          .ph-actions { width: 100%; justify-content: space-between; }
          .tb { grid-template-columns: 1fr; }
          .month-grid { grid-auto-rows: minmax(78px, auto); }
          .day-num { font-size: 14px; min-width: 22px; height: 22px; }
          .ev { font-size: 9px; padding: 2px 5px; }
          .composer-left, .composer-right { padding: 22px 20px; }
        }
      `}</style>

      <div className="cal-root">

        {/* ════════════ HEADER ════════════ */}
        <div className="ph">
          <div>
            <div className="ph-eyebrow">
              <span className="ln" />
              The Atelier · Calendar
            </div>
            <h1 className="ph-title">Your time, <em>your scene.</em></h1>
            <div className="ph-sub">What's on your plate, and what Prague is up to — side by side.</div>
          </div>
          <div className="ph-actions">
            <div className="view-toggle">
              <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>Month</button>
              <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Week</button>
            </div>
            <button className="btn dark" onClick={() => openComposerNew()}>
              + Compose event
            </button>
          </div>
        </div>

        {/* ════════════ TOOLBAR ════════════ */}
        <div className="tb">
          <div className="tb-month">
            {view === "month"
              ? <>{MONTHS[cursor.month]} <em>{cursor.year}</em></>
              : (() => {
                const w = getWeekDates();
                return <>{MONTHS[w[0].getMonth()]} {w[0].getDate()}–{w[6].getDate()} <em>{w[6].getFullYear()}</em></>;
              })()
            }
          </div>
          <div className="nav-group">
            <button onClick={prevPeriod}>‹</button>
            <button className="today" onClick={goToday}>Today</button>
            <button onClick={nextPeriod}>›</button>
          </div>
          <div className="filter-pills">
            <span className="show-lbl">Show</span>
            {(["exhibition", "deadline", "collab", "meeting", "personal", "sale"] as const).map(k => (
              <button
                key={k}
                className={`fp${filters.has(k) ? "" : " off"}`}
                onClick={() => toggleFilter(k)}
              >
                <span className="dot" style={{ background: TYPE_CFG[k].color }} />
                {TYPE_CFG[k].label}
              </button>
            ))}
            <button
              className={`fp${filters.has("scene") ? "" : " off"}`}
              onClick={() => toggleFilter("scene")}
            >
              <span className="dot dot-dashed" />
              The Scene
            </button>
            <button
              className={`fp${filters.has("tasks") ? "" : " off"}`}
              onClick={() => toggleFilter("tasks")}
            >
              <span className="dot" style={{ background: "#FAFAF8" }} />
              Tasks ⚑
            </button>
          </div>
        </div>

        {/* ════════════ MAIN GRID ════════════ */}
        <div className="main">

          {/* ─────── CALENDAR ─────── */}
          <section className="cal-card">
            <div className="wd-row">
              {DAYS_SHORT.map((d, i) => (
                <div key={d} className={`wd${i >= 5 ? " weekend" : ""}`}>{d}</div>
              ))}
            </div>

            {view === "month" && (
              <div className="month-grid">
                {monthGrid.map((cell, idx) => {
                  const ds = isoDate(cell.date);
                  const dow = cell.date.getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const isToday = ds === todayStr;
                  const items = itemsForDate(ds);
                  const visible = items.slice(0, 3);
                  const overflow = items.length - visible.length;

                  return (
                    <div
                      key={idx}
                      className={`day${cell.out ? " out" : ""}${isWeekend ? " weekend" : ""}${isToday ? " today" : ""}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest(".ev") || (e.target as HTMLElement).closest(".ev-more")) return;
                        openComposerNew(ds);
                      }}
                    >
                      <span className="day-num">{cell.date.getDate()}</span>

                      {visible.map((it) => {
                        let cls = "ev";
                        if (it.source === "private" || it.source === "scene") {
                          cls += it.source === "scene" ? " scene-added" : ` ${TYPE_CFG[it.type]?.cls || "personal"}`;
                        } else if (it.source === "public") {
                          cls += " public-pending";
                        } else if (it.source === "task") {
                          cls += " task";
                        }
                        return (
                          <div
                            key={it.id}
                            className={cls}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (it.source === "public") {
                                setDetailEvent(it.raw as PublicEvent);
                              } else if (it.source === "private" || it.source === "scene") {
                                setSelectedPrivate(it.raw as CalEvent);
                              } else if (it.source === "task") {
                                window.location.href = "/dashboard/tasks";
                              }
                            }}
                            title={it.title}
                          >
                            {it.start_time && (it.source === "private" || it.source === "scene") && (
                              <span className="ev-time">{fmtTime(it.start_time)}</span>
                            )}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {it.title}
                            </span>
                          </div>
                        );
                      })}

                      {overflow > 0 && (
                        <button
                          className="ev-more"
                          onClick={(e) => { e.stopPropagation(); /* could open day detail; for now, no-op */ }}
                        >
                          + {overflow} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {view === "week" && (() => {
              const week = getWeekDates();
              const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm
              return (
                <div className="week-grid">
                  <div className="corner h-cell" />
                  {week.map((d, i) => {
                    const isT = isoDate(d) === todayStr;
                    return (
                      <div key={i} className={`h-cell${isT ? " today" : ""}`}>
                        {DAYS_SHORT[i]}
                        <span className="d-num">{d.getDate()}</span>
                      </div>
                    );
                  })}

                  {/* All-day row */}
                  <div className="hour-lbl all-day-row" style={{ borderBottom: "2px solid var(--black)" }}>all-day</div>
                  {week.map((d, i) => {
                    const ds = isoDate(d);
                    const allDayItems = itemsForDate(ds).filter(it => {
                      if (it.source === "task") return true;
                      if (it.source === "public") return !(it.raw as PublicEvent).start_time;
                      const ev = it.raw as CalEvent;
                      return ev.all_day;
                    });
                    return (
                      <div key={`ad-${i}`} className="h-slot all-day-row" onClick={() => openComposerNew(ds)}>
                        {allDayItems.map(it => {
                          let cls = "ev";
                          if (it.source === "private" || it.source === "scene") {
                            cls += it.source === "scene" ? " scene-added" : ` ${TYPE_CFG[it.type]?.cls || "personal"}`;
                          } else if (it.source === "public") cls += " public-pending";
                          else if (it.source === "task") cls += " task";
                          return (
                            <div
                              key={it.id}
                              className={cls}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (it.source === "public") setDetailEvent(it.raw as PublicEvent);
                                else if (it.source === "private" || it.source === "scene") setSelectedPrivate(it.raw as CalEvent);
                              }}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Hour rows */}
                  {HOURS.map(h => (
                    <>
                      <div key={`h-${h}`} className="hour-lbl">
                        {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                      </div>
                      {week.map((d, i) => {
                        const ds = isoDate(d);
                        const items = itemsForDate(ds).filter(it => {
                          if (it.source === "task") return false;
                          if (it.source === "public") {
                            const p = it.raw as PublicEvent;
                            if (!p.start_time) return false;
                            return parseInt(p.start_time.split(":")[0], 10) === h;
                          }
                          const ev = it.raw as CalEvent;
                          if (ev.all_day || !ev.start_time) return false;
                          return parseInt(ev.start_time.split(":")[0], 10) === h;
                        });
                        return (
                          <div
                            key={`s-${h}-${i}`}
                            className="h-slot"
                            onClick={() => {
                              setComposerMode("create");
                              setEditingId(null);
                              setForm({ ...blankForm, start_date: ds, all_day: false, start_time: `${String(h).padStart(2,"0")}:00` });
                              setComposerOpen(true);
                            }}
                          >
                            {items.map(it => {
                              let cls = "ev";
                              if (it.source === "private" || it.source === "scene") {
                                cls += it.source === "scene" ? " scene-added" : ` ${TYPE_CFG[it.type]?.cls || "personal"}`;
                              } else if (it.source === "public") cls += " public-pending";
                              return (
                                <div
                                  key={it.id}
                                  className={cls}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (it.source === "public") setDetailEvent(it.raw as PublicEvent);
                                    else setSelectedPrivate(it.raw as CalEvent);
                                  }}
                                >
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {it.start_time && <span className="ev-time">{fmtTime(it.start_time)} </span>}
                                    {it.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              );
            })()}
          </section>

          {/* ─────── SCENE PANEL ─────── */}
          <aside className="scene-panel">
            <div className="scene-head">
              <div className="scene-eyebrow"><span className="ln" />The Scene · Prague</div>
              <h2 className="scene-title">What's <em>on</em> this week.</h2>
              <div className="scene-sub">{publicEvents.length} events live, one-tap to add.</div>
              <div className="scene-search">
                <span className="icon">⌕</span>
                <input
                  placeholder="Search venues, artists, open calls…"
                  value={sceneSearch}
                  onChange={e => setSceneSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="scene-tabs">
              <button className={sceneTab === "this_week" ? "on" : ""} onClick={() => setSceneTab("this_week")}>This week</button>
              <button className={sceneTab === "open_calls" ? "on" : ""} onClick={() => setSceneTab("open_calls")}>Open calls</button>
              <button className={sceneTab === "saved" ? "on" : ""} onClick={() => setSceneTab("saved")}>Saved</button>
            </div>
            <div className="scene-list">
              {scenePanelItems.length === 0 ? (
                <div className="se-empty">
                  {loading ? "Loading scene events…" : "Nothing here yet."}
                </div>
              ) : scenePanelItems.map(p => {
                const cfg = PUBLIC_TYPE_CFG[p.type] || PUBLIC_TYPE_CFG.opening;
                const added = savedPublicIds.has(p.id);
                return (
                  <article key={p.id} className={`se${added ? " added" : ""}`} onClick={() => setDetailEvent(p)}>
                    <div className="se-cover" style={{ background: p.cover_url ? `url(${p.cover_url})` : (p.cover_gradient || cfg.gradient) }}>
                      <div
                        className="se-cover-tag"
                        style={{ background: cfg.tagBg, color: cfg.tagColor, borderColor: cfg.tagBorder }}
                      >
                        {cfg.label}
                      </div>
                    </div>
                    <div className="se-body">
                      <div className="se-date">
                        {p.type === "open_call" || p.type === "residency"
                          ? <>Closes <b>{daysFromNow(p.closes_at || p.start_date) || "—"}</b></>
                          : <>{formatRelDate(p.start_date)}{p.start_time ? <> · <b>{fmtTime(p.start_time)}</b></> : null}</>
                        }
                      </div>
                      <h3 className="se-title">{p.title}</h3>
                      <div className="se-venue">{p.venue || ""}{p.city ? ` · ${p.city}` : ""}</div>
                      <div className="se-row">
                        <div className="se-meta">
                          {p.distance_km ? <>📍 {p.distance_km.toFixed(1)} km</> : null}
                        </div>
                        <button
                          className={`se-add${added ? " added" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (added) {
                              removeAddedPublic(p.id);
                            } else {
                              addPublicToCalendar(p);
                            }
                          }}
                        >
                          {added ? "✓ Added" : "+ Add"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>

        </div>

        {/* ════════════ COMPOSER DRAWER ════════════ */}
        {composerOpen && (
          <div className="drawer-overlay" onClick={closeComposer}>
            <div className="drawer" onClick={e => e.stopPropagation()}>
              <button className="drawer-close" onClick={closeComposer} title="Close">×</button>

              {/* LEFT: form */}
              <form className="composer-left" onSubmit={saveEvent}>
                <div className="composer-eyebrow">
                  <span className="ln" />
                  {composerMode === "edit" ? "Edit event" : "New event"}
                </div>
                <h2 className="composer-h">Make it <em>real.</em></h2>
                <div className="composer-sub">
                  Private stays just for you. Public goes on your storefront and is shareable.
                </div>

                {/* visibility */}
                <div className="visibility-tog">
                  <button
                    type="button"
                    className={`vtg${form.is_public ? " on" : ""}`}
                    onClick={() => setForm(f => ({ ...f, is_public: true }))}
                  >
                    <div className="vtg-t">Public</div>
                    <div className="vtg-d">Visible on your profile · sharable link</div>
                  </button>
                  <button
                    type="button"
                    className={`vtg${!form.is_public ? " on" : ""}`}
                    onClick={() => setForm(f => ({ ...f, is_public: false }))}
                  >
                    <div className="vtg-t">Private</div>
                    <div className="vtg-d">Just for you</div>
                  </button>
                </div>

                {/* title */}
                <div className="field" style={{ marginBottom: 10 }}>
                  <input
                    className="title-input"
                    placeholder="Event title…"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                {/* type */}
                <div className="field">
                  <span className="field-l">Type</span>
                  <div className="type-pills">
                    {Object.entries(TYPE_CFG).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        className={`type-pill${form.type === k ? " on" : ""}`}
                        onClick={() => setForm(f => ({ ...f, type: k }))}
                      >
                        <span className="dot" style={{ background: v.color }} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* dates */}
                <div className="field-row">
                  <div className="field">
                    <span className="field-l">Start date</span>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <span className="field-l">End date</span>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* times */}
                {!form.all_day && (
                  <div className="field-row">
                    <div className="field">
                      <span className="field-l">Start time</span>
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      />
                    </div>
                    <div className="field">
                      <span className="field-l">End time</span>
                      <input
                        type="time"
                        value={form.end_time}
                        onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="toggle-row">
                  <div>
                    <div className="tr-l">All-day event</div>
                    <div className="tr-d">No specific start/end times</div>
                  </div>
                  <button
                    type="button"
                    className={`switch${form.all_day ? " on" : ""}`}
                    onClick={() => setForm(f => ({ ...f, all_day: !f.all_day }))}
                  />
                </div>

                {/* location */}
                <div className="field">
                  <span className="field-l">Location</span>
                  <input
                    type="text"
                    placeholder="Galerie Smečky, Praha 1"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                {/* description */}
                <div className="field">
                  <span className="field-l">Description</span>
                  <textarea
                    rows={3}
                    placeholder="What's the event about?"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* cover */}
                <div className="field">
                  <span className="field-l">Cover image URL (optional)</span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.cover_url}
                    onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                  />
                </div>

                {/* public-only toggles */}
                {form.is_public && (
                  <>
                    <div className="toggle-row">
                      <div>
                        <div className="tr-l">RSVP</div>
                        <div className="tr-d">Let people confirm they're coming</div>
                      </div>
                      <button
                        type="button"
                        className={`switch${form.rsvp_enabled ? " on" : ""}`}
                        onClick={() => setForm(f => ({ ...f, rsvp_enabled: !f.rsvp_enabled }))}
                      />
                    </div>
                    {form.rsvp_enabled && (
                      <div className="field">
                        <span className="field-l">Capacity (leave blank for unlimited)</span>
                        <input
                          type="number"
                          min={1}
                          placeholder="80"
                          value={form.capacity}
                          onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="composer-actions">
                  <div className="left">
                    {composerMode === "edit" && editingId && (
                      <button type="button" className="btn danger" onClick={() => deleteEvent(editingId)}>
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="right">
                    <button type="button" className="btn ghost" onClick={closeComposer}>Cancel</button>
                    <button type="submit" className="btn primary" disabled={saving || !form.title.trim()}>
                      {saving ? "Saving…" : (form.is_public ? "Publish event " : "Save event ")}
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* RIGHT: live preview */}
              <div className="composer-right">
                <div className="preview-eyebrow">Live preview · how it'll look</div>
                <div className="preview-card">
                  <div
                    className="preview-cover"
                    style={{
                      background: form.cover_url ? `url(${form.cover_url})` : previewGradient,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div
                      className="preview-cover-tag"
                      style={{
                        background: PUBLIC_TYPE_CFG[form.type]?.tagBg || "var(--yellow)",
                        color: PUBLIC_TYPE_CFG[form.type]?.tagColor || "var(--black)",
                        borderColor: PUBLIC_TYPE_CFG[form.type]?.tagBorder || "var(--black)",
                      }}
                    >
                      {TYPE_CFG[form.type]?.label || "Event"}
                    </div>
                  </div>
                  <div className="preview-body">
                    <div className="preview-date">
                      {form.start_date ? new Date(form.start_date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Pick a date"}
                      {form.start_time && !form.all_day ? ` · ${fmtTime(form.start_time)}` : ""}
                    </div>
                    <h3 className="preview-title">{form.title || "Your event title…"}</h3>
                    {form.location && <div className="preview-venue">{form.location}</div>}
                    {form.description && <div className="preview-desc">{form.description}</div>}
                    <div className="preview-meta">
                      {form.is_public && <span className="preview-chip">Public</span>}
                      {!form.is_public && <span className="preview-chip">Private</span>}
                      {form.is_public && form.rsvp_enabled && <span className="preview-chip">RSVP open</span>}
                      {form.is_public && form.rsvp_enabled && form.capacity && <span className="preview-chip">{form.capacity} spots</span>}
                      {form.all_day && <span className="preview-chip">All day</span>}
                    </div>
                    {form.is_public && form.title && (
                      <div className="preview-share">
                        🔗 <span className="url">artomango.com/e/{slugify(form.title)}</span>
                        <span style={{ fontWeight: 900 }}>Copy</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", lineHeight: 1.5 }}>
                  Everything updates as you type. Add a cover URL to replace the gradient.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ PUBLIC EVENT DETAIL ════════════ */}
        {detailEvent && (() => {
          const p = detailEvent;
          const cfg = PUBLIC_TYPE_CFG[p.type] || PUBLIC_TYPE_CFG.opening;
          const added = savedPublicIds.has(p.id);
          const dt = new Date(p.start_date);
          return (
            <div className="detail-overlay" onClick={() => setDetailEvent(null)}>
              <div className="detail" onClick={e => e.stopPropagation()}>
                <div
                  className="detail-cover"
                  style={{ backgroundImage: p.cover_url ? `url(${p.cover_url})` : (p.cover_gradient || cfg.gradient) }}
                >
                  <div className="detail-cover-content">
                    <div className="dtag-row">
                      <span className="dtag" style={{ background: cfg.tagBg, color: cfg.tagColor, borderColor: cfg.tagBorder }}>
                        {cfg.label}
                      </span>
                      <span className="dtag" style={{ background: "var(--black)", color: "var(--yellow)", borderColor: "var(--yellow)" }}>
                        The Scene
                      </span>
                    </div>
                    <h1 className="detail-h">{p.title}</h1>
                    <div className="detail-venue">{p.venue}{p.city ? ` · ${p.city}` : ""}</div>
                  </div>
                </div>
                <div className="detail-body">
                  <div className="detail-when">
                    <div className="ddb">
                      <div className="ddb-m">{dt.toLocaleString("en-US", { weekday: "short" }).toUpperCase()}</div>
                      <div className="ddb-d">{dt.getDate()}</div>
                    </div>
                    <div className="detail-when-r">
                      <b>{dt.toLocaleString("en-US", { month: "long" })} {dt.getFullYear()}{p.start_time ? ` · ${fmtTime(p.start_time)}` : ""}{p.end_time ? `–${fmtTime(p.end_time)}` : ""}</b>
                      {p.type === "open_call" && p.closes_at ? `Closes ${daysFromNow(p.closes_at)}` : ""}
                    </div>
                  </div>
                  {p.description && <div className="detail-desc">{p.description}</div>}
                  <div className="detail-meta">
                    {p.distance_km && <span className="dmeta">📍 {p.distance_km.toFixed(1)} km from your studio</span>}
                    {p.city && <span className="dmeta">🏙 {p.city}</span>}
                  </div>
                  <div className="detail-actions">
                    <button
                      className="btn primary"
                      onClick={() => {
                        if (added) removeAddedPublic(p.id);
                        else addPublicToCalendar(p);
                      }}
                    >
                      {added ? "✓ Added — Remove" : "+ Add to my calendar"}
                    </button>
                    {p.external_url && (
                      <a className="btn" href={p.external_url} target="_blank" rel="noopener noreferrer">
                        Visit site
                      </a>
                    )}
                    <button className="btn ghost" onClick={() => setDetailEvent(null)}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════════════ PRIVATE EVENT POPOVER ════════════ */}
        {selectedPrivate && (
          <div className="detail-overlay" onClick={() => setSelectedPrivate(null)}>
            <div
              className="priv-pop"
              onClick={e => e.stopPropagation()}
              style={{ position: "relative", inset: "auto" }}
            >
              <div className="priv-pop-head">
                <span className="priv-pop-tag" style={{ background: TYPE_CFG[selectedPrivate.type]?.color + "33" || "var(--cream)" }}>
                  {selectedPrivate.source === "scene" ? "From The Scene" : (TYPE_CFG[selectedPrivate.type]?.label || "Event")}
                </span>
                <button className="priv-pop-x" onClick={() => setSelectedPrivate(null)}>×</button>
              </div>
              <h3 className="priv-pop-t">{selectedPrivate.title}</h3>
              <div className="priv-pop-when">
                {new Date(selectedPrivate.start_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {selectedPrivate.start_time ? ` · ${fmtTime(selectedPrivate.start_time)}` : ""}
                {selectedPrivate.end_time ? `–${fmtTime(selectedPrivate.end_time)}` : ""}
              </div>
              {selectedPrivate.location && <div className="priv-pop-loc">📍 {selectedPrivate.location}</div>}
              {selectedPrivate.description && <div className="priv-pop-desc">{selectedPrivate.description}</div>}
              <div className="priv-pop-actions">
                <button className="btn primary" onClick={() => openComposerEdit(selectedPrivate)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => deleteEvent(selectedPrivate.id)}>
                  Delete
                </button>
                {selectedPrivate.is_public && selectedPrivate.share_slug && (
                  <button
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://artomango.com/e/${selectedPrivate.share_slug}`);
                    }}
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
