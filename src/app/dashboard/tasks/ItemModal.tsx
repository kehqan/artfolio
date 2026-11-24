"use client";
// Add or edit anything in the Planner: a to-do or an event.
import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Chip, Field, Input, Modal, Select, Switch, Textarea, cn } from "@/components/ui";
import { type CalEvent, type Step, type Task, EVENT_TYPES, PRIORITIES } from "./planner";

export type Editing =
  | { mode: "new"; kind: "task" | "event"; date?: string }
  | { mode: "task"; task: Task }
  | { mode: "event"; event: CalEvent };

type Props = { editing: Editing | null; userId: string; today: string; onClose: () => void; onSaved: () => void };

const emptyTask = { title: "", description: "", priority: "medium", status: "pending", due: "", steps: [] as Step[] };
const emptyEvent = { title: "", description: "", type: "exhibition", start: "", end: "", allDay: true, startTime: "", endTime: "", location: "" };

export function ItemModal({ editing, userId, today, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<"task" | "event">("task");
  const [t, setT] = useState(emptyTask);
  const [e, setE] = useState(emptyEvent);
  const [newStep, setNewStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    setError(""); setConfirming(false); setNewStep("");
    if (editing.mode === "new") {
      setKind(editing.kind);
      setT({ ...emptyTask, due: editing.date || "" });
      setE({ ...emptyEvent, start: editing.date || today });
    } else if (editing.mode === "task") {
      const x = editing.task;
      setKind("task");
      setT({ title: x.title, description: x.description || "", priority: x.priority || "medium", status: x.status || "pending", due: x.due_date || "", steps: x.checklist });
    } else {
      const x = editing.event;
      setKind("event");
      setE({
        title: x.title, description: x.description || "", type: x.type || "personal", start: x.start_date, end: x.end_date || "",
        allDay: x.all_day, startTime: (x.start_time || "").slice(0, 5), endTime: (x.end_time || "").slice(0, 5), location: x.location || "",
      });
    }
  }, [editing, today]);

  if (!editing) return null;
  const isNew = editing.mode === "new";

  async function save() {
    const sb = createClient();
    setError("");
    if (kind === "task") {
      if (!t.title.trim()) { setError("Give the to-do a name."); return; }
      const done = t.steps.filter(s => s.done).length;
      const progress = t.status === "done" ? 100 : t.steps.length ? Math.round((done / t.steps.length) * 100) : 0;
      const row = {
        title: t.title.trim(), description: t.description.trim() || null, priority: t.priority, status: t.status,
        due_date: t.due || null, checklist: t.steps, progress, updated_at: new Date().toISOString(),
      };
      setSaving(true);
      const res = editing!.mode === "task"
        ? await sb.from("tasks").update(row).eq("id", editing!.task.id).eq("user_id", userId)
        : await sb.from("tasks").insert({ ...row, user_id: userId, type: "personal" });
      setSaving(false);
      if (res.error) { setError("That didn't save. Please try again."); return; }
    } else {
      if (!e.title.trim()) { setError("Give the event a name."); return; }
      if (!e.start) { setError("Pick a date."); return; }
      if (e.end && e.end < e.start) { setError("The end date is before the start date."); return; }
      const row = {
        title: e.title.trim(), description: e.description.trim() || null, type: e.type,
        start_date: e.start, end_date: e.end || null, all_day: e.allDay,
        start_time: e.allDay ? null : e.startTime || null, end_time: e.allDay ? null : e.endTime || null,
        location: e.location.trim() || null,
      };
      setSaving(true);
      const res = editing!.mode === "event"
        ? await sb.from("calendar_events").update(row).eq("id", editing!.event.id).eq("user_id", userId)
        : await sb.from("calendar_events").insert({ ...row, user_id: userId, source: "private", is_public: false });
      setSaving(false);
      if (res.error) { setError("That didn't save. Please try again."); return; }
    }
    onSaved(); onClose();
  }

  async function remove() {
    const sb = createClient();
    setSaving(true);
    const res = editing!.mode === "task"
      ? await sb.from("tasks").delete().eq("id", editing!.task.id).eq("user_id", userId)
      : editing!.mode === "event"
        ? await sb.from("calendar_events").delete().eq("id", editing!.event.id).eq("user_id", userId)
        : { error: null };
    setSaving(false);
    if (res.error) { setError("That didn't delete. Please try again."); return; }
    onSaved(); onClose();
  }

  const addStep = () => {
    const v = newStep.trim();
    if (!v) return;
    setT(x => ({ ...x, steps: [...x.steps, { text: v, done: false }] }));
    setNewStep("");
  };

  const footer = confirming ? (
    <>
      <span className="mr-auto font-ui text-body-sm text-fg-2">Delete this for good?</span>
      <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
      <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>
    </>
  ) : (
    <>
      {!isNew && <Button variant="ghost" className="mr-auto" onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden /> Delete</Button>}
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : isNew ? "Add" : "Save"}</Button>
    </>
  );

  const title = isNew ? (kind === "task" ? "New to-do" : "New event") : kind === "task" ? "Edit to-do" : "Edit event";

  return (
    <Modal open onClose={onClose} size="md" title={title} footer={footer}>
      <div className="flex flex-col gap-4">
        {isNew && (
          <div className="flex gap-2" role="group" aria-label="What to add">
            <Chip selected={kind === "task"} onClick={() => setKind("task")}>To-do</Chip>
            <Chip selected={kind === "event"} onClick={() => setKind("event")}>Event</Chip>
          </div>
        )}
        {error && <Alert tone="bad">{error}</Alert>}

        {kind === "task" ? (
          <>
            <Field label="To-do">
              {p => <Input {...p} autoFocus value={t.title} maxLength={140} placeholder="Varnish the harbour painting" onChange={ev => setT(x => ({ ...x, title: ev.target.value }))} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Due" hint="Optional">
                {p => <Input {...p} type="date" value={t.due} onChange={ev => setT(x => ({ ...x, due: ev.target.value }))} />}
              </Field>
              <Field label="Priority">
                {p => (
                  <Select {...p} value={t.priority} onChange={ev => setT(x => ({ ...x, priority: ev.target.value }))}>
                    {PRIORITIES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Status">
                {p => (
                  <Select {...p} value={t.status} onChange={ev => setT(x => ({ ...x, status: ev.target.value }))}>
                    <option value="pending">To do</option>
                    <option value="in_progress">Doing</option>
                    <option value="done">Done</option>
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Notes" hint="Optional">
              {p => <Textarea {...p} rows={3} value={t.description} onChange={ev => setT(x => ({ ...x, description: ev.target.value }))} />}
            </Field>
            <div className="flex flex-col gap-2">
              <span className="font-ui text-label font-semibold text-fg">Steps</span>
              {t.steps.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {t.steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <button type="button" role="checkbox" aria-checked={s.done} aria-label={s.text}
                        onClick={() => setT(x => ({ ...x, steps: x.steps.map((y, j) => (j === i ? { ...y, done: !y.done } : y)) }))}
                        className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-chip border-outline border-ink", s.done ? "bg-ink text-on-inverse" : "bg-surface")}>
                        {s.done && <Check size={12} aria-hidden />}
                      </button>
                      <span className={cn("flex-1 font-ui text-body-sm", s.done ? "text-fg-3 line-through" : "text-fg")}>{s.text}</span>
                      <button type="button" aria-label={`Remove ${s.text}`} onClick={() => setT(x => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}
                        className="grid h-7 w-7 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg"><X size={14} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input value={newStep} placeholder="Add a step" aria-label="Add a step" onChange={ev => setNewStep(ev.target.value)}
                  onKeyDown={ev => { if (ev.key === "Enter") { ev.preventDefault(); addStep(); } }} />
                <Button variant="secondary" onClick={addStep} aria-label="Add step"><Plus size={15} aria-hidden /></Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Field label="Event">
              {p => <Input {...p} autoFocus value={e.title} maxLength={140} placeholder="Hang the show at Galerie Ost" onChange={ev => setE(x => ({ ...x, title: ev.target.value }))} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                {p => (
                  <Select {...p} value={e.type} onChange={ev => setE(x => ({ ...x, type: ev.target.value }))}>
                    {EVENT_TYPES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Where" hint="Optional">
                {p => <Input {...p} value={e.location} onChange={ev => setE(x => ({ ...x, location: ev.target.value }))} />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date">{p => <Input {...p} type="date" value={e.start} onChange={ev => setE(x => ({ ...x, start: ev.target.value }))} />}</Field>
              <Field label="Until" hint="For events over several days">{p => <Input {...p} type="date" value={e.end} onChange={ev => setE(x => ({ ...x, end: ev.target.value }))} />}</Field>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-ui text-body-sm font-semibold text-fg">All day</span>
              <Switch checked={e.allDay} onChange={v => setE(x => ({ ...x, allDay: v }))} label="All day" />
            </div>
            {!e.allDay && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From">{p => <Input {...p} type="time" value={e.startTime} onChange={ev => setE(x => ({ ...x, startTime: ev.target.value }))} />}</Field>
                <Field label="To" hint="Optional">{p => <Input {...p} type="time" value={e.endTime} onChange={ev => setE(x => ({ ...x, endTime: ev.target.value }))} />}</Field>
              </div>
            )}
            <Field label="Notes" hint="Optional">
              {p => <Textarea {...p} rows={3} value={e.description} onChange={ev => setE(x => ({ ...x, description: ev.target.value }))} />}
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
