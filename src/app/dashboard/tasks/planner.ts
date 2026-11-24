// The Planner puts to-dos and calendar events in one list. Tasks with a
// due date sit next to events on that day; tasks without one wait under
// "Anytime". Data stays in the existing tasks and calendar_events tables.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Step = { text: string; done: boolean };

export type Task = {
  id: string; user_id: string; title: string; description?: string | null;
  status: string; priority: string; type?: string | null; due_date?: string | null;
  progress?: number | null; checklist: Step[]; created_at?: string; updated_at?: string;
};

export type CalEvent = {
  id: string; user_id: string; title: string; description?: string | null; type: string;
  start_date: string; end_date?: string | null; start_time?: string | null; end_time?: string | null;
  all_day: boolean; location?: string | null; source?: string | null; origin_id?: string | null;
};

export type PublicEvent = {
  id: string; title: string; type: string; start_date: string; end_date?: string | null;
  start_time?: string | null; end_time?: string | null; venue?: string | null; city?: string | null;
  description?: string | null; cover_url?: string | null;
};

export type Entry =
  | { kind: "task"; key: string; date: string | null; task: Task }
  | { kind: "event"; key: string; date: string; event: CalEvent };

export const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "exhibition", label: "Show" },
  { key: "meeting", label: "Meeting" },
  { key: "deadline", label: "Deadline" },
  { key: "collab", label: "Collab" },
  { key: "sale", label: "Sale" },
  { key: "artwork", label: "Studio" },
  { key: "personal", label: "Personal" },
];
export const eventLabel = (t: string) => EVENT_TYPES.find(e => e.key === t)?.label || "Event";

export const PRIORITIES = [
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

export const isDone = (t: Task) => t.status === "done";

// ── Dates (local time, never UTC, so "today" matches the artist's day) ──
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "");

export function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const d = new Date(date + "T12:00:00");
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}
export function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Events that cover a day: starting that day, or running across it. */
export function eventOn(e: CalEvent, date: string): boolean {
  const end = e.end_date && e.end_date >= e.start_date ? e.end_date : e.start_date;
  return e.start_date <= date && date <= end;
}

export function stepsDone(t: Task): [number, number] {
  return [t.checklist.filter(s => s.done).length, t.checklist.length];
}

// ── Loading ─────────────────────────────────────────────────────────
export async function loadPlanner(sb: SupabaseClient, me: string, today: string) {
  const [tk, ev, pub] = await Promise.all([
    sb.from("tasks").select("*").eq("user_id", me).neq("status", "cancelled").order("created_at", { ascending: false }),
    sb.from("calendar_events").select("*").eq("user_id", me).order("start_date", { ascending: true }),
    sb.from("public_events").select("id, title, type, start_date, end_date, start_time, end_time, venue, city, description, cover_url")
      .gte("start_date", today).lte("start_date", addDays(today, 30)).order("start_date", { ascending: true }).limit(12),
  ]);
  const tasks: Task[] = (tk.data || []).map((t: any) => ({ ...t, checklist: Array.isArray(t.checklist) ? t.checklist : [] }));
  return {
    tasks,
    events: (ev.data || []) as CalEvent[],
    publicEvents: (pub.data || []) as PublicEvent[],
  };
}

export function publicToEvent(p: PublicEvent, me: string) {
  return {
    user_id: me, title: p.title,
    type: p.type === "open_call" || p.type === "residency" ? "deadline" : "exhibition",
    start_date: p.start_date, end_date: p.end_date || null,
    start_time: p.start_time || null, end_time: p.end_time || null, all_day: !p.start_time,
    description: p.description || null,
    location: p.venue ? `${p.venue}${p.city ? ", " + p.city : ""}` : p.city || null,
    cover_url: p.cover_url || null, is_public: false, source: "scene", origin_id: p.id,
  };
}
