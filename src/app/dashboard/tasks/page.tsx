"use client";
// The Planner: to-dos and schedule on one page. A List view groups
// everything by day, a Month view shows the same things on a calendar.
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { Hint } from "@/components/journey/Hint";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, Tabs, cn } from "@/components/ui";
import {
  type CalEvent, type Entry, type PublicEvent, type Task,
  addDays, dayLabel, eventLabel, eventOn, fmtTime, isDone, iso, loadPlanner, publicToEvent, shortDate, stepsDone,
} from "./planner";
import { ItemModal, type Editing } from "./ItemModal";

type View = "list" | "month";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Rows ────────────────────────────────────────────────────────────
function TaskRow({ task, today, onToggle, onOpen }: { task: Task; today: string; onToggle: () => void; onOpen: () => void }) {
  const done = isDone(task);
  const [d, n] = stepsDone(task);
  const overdue = !done && !!task.due_date && task.due_date < today;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button type="button" role="checkbox" aria-checked={done} aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        onClick={onToggle}
        className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-pill border-outline border-ink transition-colors",
          done ? "bg-ink text-on-inverse" : "bg-surface hover:bg-mango-soft")}>
        {done && <Check size={12} aria-hidden />}
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className={cn("font-ui text-body", done ? "text-fg-3 line-through" : "text-fg")}>{task.title}</span>
        {(task.priority === "high" || n > 0 || overdue || task.status === "in_progress") && !done && (
          <span className="flex flex-wrap items-center gap-2 font-ui text-caption text-fg-3">
            {overdue && <span className="font-semibold text-bad">Due {shortDate(task.due_date!)}</span>}
            {task.priority === "high" && <Badge tone="bad">High</Badge>}
            {task.status === "in_progress" && <Badge>Doing</Badge>}
            {n > 0 && <span className="tabular-nums">{d} of {n} steps</span>}
          </span>
        )}
      </button>
    </li>
  );
}

function EventRow({ event, date, onOpen }: { event: CalEvent; date: string; onOpen: () => void }) {
  const multi = !!event.end_date && event.end_date !== event.start_date;
  const time = event.all_day || !event.start_time ? "All day" : fmtTime(event.start_time);
  const note = multi ? (date === event.start_date ? `Until ${shortDate(event.end_date!)}` : `Day ${Math.round((+new Date(date) - +new Date(event.start_date)) / 864e5) + 1}, until ${shortDate(event.end_date!)}`) : null;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken">
        <span className="w-14 shrink-0 pt-0.5 font-ui text-body-sm tabular-nums text-fg-2">{time}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-ui text-body font-semibold text-fg">{event.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 font-ui text-caption text-fg-3">
            <span>{eventLabel(event.type)}</span>
            {event.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={11} aria-hidden /><span className="truncate">{event.location}</span></span>}
            {note && <span>{note}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [publicEvents, setPublicEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("list");
  const [month, setMonth] = useState({ y: 2026, m: 0 });
  const [picked, setPicked] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const reload = useCallback(async (me: string, t: string) => {
    try {
      const d = await loadPlanner(createClient(), me, t);
      setTasks(d.tasks); setEvents(d.events); setPublicEvents(d.publicEvents); setError("");
    } catch {
      setError("Your planner didn't load. Please refresh the page.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const now = new Date();
    const t = iso(now);
    setToday(t);
    setMonth({ y: now.getFullYear(), m: now.getMonth() });
    if (new URLSearchParams(window.location.search).get("view") === "month") setView("month");
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      reload(user.id, t);
    });
  }, [reload]);

  async function toggleTask(task: Task) {
    const status = isDone(task) ? "pending" : "done";
    const progress = status === "done" ? 100 : task.checklist.length ? Math.round((task.checklist.filter(s => s.done).length / task.checklist.length) * 100) : 0;
    setTasks(p => p.map(x => (x.id === task.id ? { ...x, status, progress } : x)));
    const { error: err } = await createClient().from("tasks").update({ status, progress, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (err) {
      setTasks(p => p.map(x => (x.id === task.id ? task : x)));
      setError("That didn't save. Please try again.");
    }
  }

  async function addPublic(p: PublicEvent) {
    if (!userId) return;
    setAdding(p.id);
    const { error: err } = await createClient().from("calendar_events").insert(publicToEvent(p, userId));
    setAdding(null);
    if (err) { setError("Couldn't add that to your planner. Please try again."); return; }
    reload(userId, today);
  }

  const saved = useMemo(() => new Set(events.filter(e => e.source === "scene" && e.origin_id).map(e => e.origin_id!)), [events]);

  // Everything due or happening on one day
  const entriesOn = useCallback((date: string): Entry[] => {
    const ev = events.filter(e => eventOn(e, date))
      .sort((a, b) => (a.all_day === b.all_day ? (a.start_time || "").localeCompare(b.start_time || "") : a.all_day ? -1 : 1))
      .map(e => ({ kind: "event" as const, key: `e-${e.id}-${date}`, date, event: e }));
    const tk = tasks.filter(t => t.due_date === date && (!isDone(t) || showDone))
      .map(t => ({ kind: "task" as const, key: `t-${t.id}`, date, task: t }));
    return [...ev, ...tk];
  }, [events, tasks, showDone]);

  // List view sections
  const list = useMemo(() => {
    if (!today) return { overdue: [] as Task[], days: [] as { date: string; items: Entry[] }[], anytime: [] as Task[], later: 0, done: [] as Task[] };
    const overdue = tasks.filter(t => !isDone(t) && t.due_date && t.due_date < today)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    const days: { date: string; items: Entry[] }[] = [];
    for (let i = 0; i < 31; i++) {
      const date = addDays(today, i);
      const items = entriesOn(date).filter(x => x.kind === "task" || x.event.start_date === date || date === today);
      if (items.length) days.push({ date, items });
    }
    const horizon = addDays(today, 30);
    const later = events.filter(e => e.start_date > horizon).length + tasks.filter(t => !isDone(t) && t.due_date && t.due_date > horizon).length;
    const anytime = tasks.filter(t => !t.due_date && (!isDone(t)));
    const done = tasks.filter(isDone).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 15);
    return { overdue, days, anytime, later, done };
  }, [today, tasks, events, entriesOn]);

  // Month grid
  const grid = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const start = iso(new Date(month.y, month.m, 1 - lead));
    const cells = Math.ceil((lead + new Date(month.y, month.m + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: cells }, (_, i) => addDays(start, i));
  }, [month]);

  const monthName = new Date(month.y, month.m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shiftMonth = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const renderEntry = (x: Entry) => x.kind === "task"
    ? <TaskRow key={x.key} task={x.task} today={today} onToggle={() => toggleTask(x.task)} onOpen={() => setEditing({ mode: "task", task: x.task })} />
    : <EventRow key={x.key} event={x.event} date={x.date} onOpen={() => setEditing({ mode: "event", event: x.event })} />;

  const section = (title: string, children: React.ReactNode, tone?: "bad", action?: React.ReactNode) => (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b-hair border-line px-4 py-2.5">
        <h2 className={cn("font-ui text-label font-semibold", tone === "bad" ? "text-bad" : "text-fg")}>{title}</h2>
        {action}
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </Card>
  );

  const nothingAhead = !list.overdue.length && !list.days.length && !list.anytime.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Planner"
        description="Your to-dos and your schedule in one place."
        actions={<Button variant="primary" onClick={() => setEditing({ mode: "new", kind: "task", date: view === "month" && picked ? picked : undefined })}><Plus size={16} aria-hidden /> Add</Button>}
      />

      <Hint id="planner" title="Your planner fills itself.">When you sign an agreement, the hanging and taking-down dates land here on their own. Add your own to-dos and events anytime.</Hint>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<View> label="View" value={view} onChange={setView} items={[{ value: "list", label: "List" }, { value: "month", label: "Month" }]} />
        {view === "month" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} aria-hidden /></Button>
            <span className="min-w-[9rem] text-center font-ui text-body font-semibold text-fg">{monthName}</span>
            <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={16} aria-hidden /></Button>
            <Button variant="secondary" size="sm" onClick={() => { const d = new Date(); setMonth({ y: d.getFullYear(), m: d.getMonth() }); setPicked(today); }}>Today</Button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {loading ? (
            <>{[0, 1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-card" />)}</>
          ) : view === "list" ? (
            nothingAhead ? (
              <EmptyState title="Nothing planned" description="Add a to-do or an event. Shows you agree to in Deals appear here by themselves."
                action={<Button variant="secondary" onClick={() => setEditing({ mode: "new", kind: "task" })}><Plus size={15} aria-hidden /> Add</Button>} />
            ) : (
              <>
                {list.overdue.length > 0 && section("Overdue", list.overdue.map(t => (
                  <TaskRow key={t.id} task={t} today={today} onToggle={() => toggleTask(t)} onOpen={() => setEditing({ mode: "task", task: t })} />
                )), "bad")}
                {list.days.map(d => (
                  <div key={d.date}>
                    {section(dayLabel(d.date, today), d.items.map(renderEntry), undefined,
                      <button type="button" onClick={() => setEditing({ mode: "new", kind: "task", date: d.date })} aria-label={`Add to ${dayLabel(d.date, today)}`}
                        className="grid h-7 w-7 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg"><Plus size={15} aria-hidden /></button>)}
                  </div>
                ))}
                {list.later > 0 && (
                  <button type="button" onClick={() => setView("month")} className="self-start font-ui text-body-sm font-semibold text-fg underline-offset-4 hover:underline">
                    {list.later} more after the next 30 days. See the month view
                  </button>
                )}
                {list.anytime.length > 0 && section("Anytime", list.anytime.map(t => (
                  <TaskRow key={t.id} task={t} today={today} onToggle={() => toggleTask(t)} onOpen={() => setEditing({ mode: "task", task: t })} />
                )))}
              </>
            )
          ) : (
            <>
              <Card padding="none" className="overflow-hidden">
                <div className="grid grid-cols-7 border-b-hair border-line">
                  {WEEKDAYS.map(w => <div key={w} className="px-2 py-2 text-center font-ui text-caption font-semibold text-fg-3">{w}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {grid.map((date, i) => {
                    const inMonth = Number(date.slice(5, 7)) - 1 === month.m;
                    const items = entriesOn(date);
                    const isToday = date === today;
                    const isPicked = date === picked;
                    return (
                      <button key={date} type="button" onClick={() => setPicked(date)} aria-label={`${dayLabel(date, today)}, ${items.length} items`} aria-pressed={isPicked}
                        className={cn("flex min-h-[64px] flex-col gap-1 border-line p-1.5 text-left sm:min-h-[96px]",
                          i % 7 !== 6 && "border-r-hair", i < grid.length - 7 && "border-b-hair",
                          !inMonth && "bg-sunken", isPicked && "outline outline-2 -outline-offset-2 outline-ink")}>
                        <span className={cn("grid h-6 w-6 place-items-center rounded-pill font-ui text-caption tabular-nums",
                          isToday ? "bg-mango font-semibold text-on-mango" : inMonth ? "text-fg" : "text-fg-3")}>{Number(date.slice(8))}</span>
                        <span className="hidden flex-col gap-0.5 sm:flex">
                          {items.slice(0, 3).map(x => (
                            <span key={x.key} className={cn("truncate rounded-chip px-1 font-ui text-caption",
                              x.kind === "event" ? "bg-n-100 text-fg" : isDone(x.task) ? "text-fg-3 line-through" : "text-fg-2")}>
                              {x.kind === "task" ? "○ " : ""}{x.kind === "task" ? x.task.title : x.event.title}
                            </span>
                          ))}
                          {items.length > 3 && <span className="px-1 font-ui text-caption text-fg-3">+{items.length - 3} more</span>}
                        </span>
                        {items.length > 0 && <span className="h-1.5 w-1.5 rounded-pill bg-ink sm:hidden" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </Card>
              {picked && (
                entriesOn(picked).length
                  ? section(dayLabel(picked, today), entriesOn(picked).map(renderEntry), undefined,
                    <button type="button" onClick={() => setEditing({ mode: "new", kind: "task", date: picked })} aria-label="Add to this day"
                      className="grid h-7 w-7 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg"><Plus size={15} aria-hidden /></button>)
                  : (
                    <Card padding="md" className="flex items-center justify-between gap-3">
                      <span className="font-ui text-body-sm text-fg-2">Nothing on {dayLabel(picked, today).toLowerCase() === "today" ? "today" : dayLabel(picked, today)}.</span>
                      <Button variant="secondary" size="sm" onClick={() => setEditing({ mode: "new", kind: "event", date: picked })}><Plus size={14} aria-hidden /> Add</Button>
                    </Card>
                  )
              )}
            </>
          )}

          {!loading && list.done.length > 0 && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone}
                className="inline-flex items-center gap-1 self-start font-ui text-body-sm font-semibold text-fg-2 hover:text-fg">
                <ChevronDown size={15} aria-hidden className={cn("transition-transform", showDone && "rotate-180")} /> Done recently ({list.done.length})
              </button>
              {showDone && section("Done", list.done.map(t => (
                <TaskRow key={t.id} task={t} today={today} onToggle={() => toggleTask(t)} onOpen={() => setEditing({ mode: "task", task: t })} />
              )))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b-hair border-line px-4 py-3">
              <h2 className="font-ui text-label font-semibold text-fg">Happening around you</h2>
              <p className="font-ui text-caption text-fg-3">Openings and events in the next 30 days.</p>
            </div>
            {publicEvents.length === 0 ? (
              <p className="px-4 py-4 font-ui text-body-sm text-fg-3">Nothing listed yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {publicEvents.map(p => {
                  const isSaved = saved.has(p.id);
                  return (
                    <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-ui text-body-sm font-semibold text-fg">{p.title}</span>
                        <span className="font-ui text-caption text-fg-3">
                          {shortDate(p.start_date)}{p.start_time ? `, ${fmtTime(p.start_time)}` : ""}{p.venue || p.city ? ` · ${[p.venue, p.city].filter(Boolean).join(", ")}` : ""}
                        </span>
                      </div>
                      {isSaved ? (
                        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 font-ui text-caption font-semibold text-fg-2"><Check size={13} aria-hidden /> Added</span>
                      ) : (
                        <Button variant="ghost" size="sm" disabled={adding === p.id} onClick={() => addPublic(p)} aria-label={`Add ${p.title} to your planner`}>
                          <CalendarPlus size={14} aria-hidden /> Add
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {userId && today && (
        <ItemModal editing={editing} userId={userId} today={today} onClose={() => setEditing(null)} onSaved={() => reload(userId, today)} />
      )}
    </div>
  );
}
