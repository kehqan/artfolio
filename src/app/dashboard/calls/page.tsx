"use client";
// Open calls: open calls, grants, residencies and prizes, checked by the
// Artomango team. Soonest deadline first. One tap puts the deadline (and a
// to-do a week before) in the Planner. Admins add and change calls here.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, ExternalLink, Megaphone, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Switch, Textarea, buttonClasses, cn } from "@/components/ui";
import { useJourney } from "@/components/journey/JourneyProvider";
import {
  type CallDraft, type OpenCall, KINDS, REGIONS, addToPlanner, closesLine, daysLeft, draftOf, emptyDraft, isNear, isNew,
  kindName, loadCalls, loadSaved, regionName, removeFromPlanner, rowOf, todayIso,
} from "@/lib/open-calls";

type Filter = "all" | "near" | OpenCall["kind"];

export default function OpenCallsPage() {
  const { toast } = useJourney();
  const [me, setMe] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [calls, setCalls] = useState<OpenCall[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<OpenCall | "new" | null>(null);

  async function load() {
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user.id || null;
    setMe(uid);
    const [list, isAdm, sv] = await Promise.all([
      loadCalls(sb),
      sb.rpc("is_admin").then(r => !!r.data, () => false),
      uid ? loadSaved(sb, uid) : Promise.resolve({}),
    ]);
    setAdmin(isAdm);
    if (!list) { setMissing(true); setCalls([]); return; }
    // Admins also see drafts and closed calls, to tidy them up.
    setCalls(isAdm ? ((await loadCalls(sb, { all: true })) || list) : list);
    setSaved(sv);
  }
  useEffect(() => { load(); }, []);

  const today = todayIso();
  const open = useMemo(() => (calls || []).filter(c => admin || (c.published && c.deadline >= today)), [calls, admin, today]);
  const shown = useMemo(() => open.filter(c => filter === "all" || (filter === "near" ? isNear(c) : c.kind === filter)), [open, filter]);
  const groups = useMemo(() => {
    const g: [string, OpenCall[]][] = [["Closing in the next 2 weeks", []], ["Later", []], ["Closed or hidden", []]];
    shown.forEach(c => {
      if (c.deadline < today || !c.published) g[2][1].push(c);
      else if (daysLeft(c.deadline, today) <= 14) g[0][1].push(c);
      else g[1][1].push(c);
    });
    return g.filter(([, l]) => l.length);
  }, [shown, today]);
  const newCount = open.filter(c => c.published && isNew(c)).length;

  async function toggle(c: OpenCall) {
    if (!me) return;
    const sb = createClient();
    setBusy(c.id);
    if (saved[c.id]) {
      await removeFromPlanner(sb, me, c, saved[c.id]);
      setSaved(s => { const n = { ...s }; delete n[c.id]; return n; });
      toast({ title: "Taken out of your Planner" });
    } else {
      const id = await addToPlanner(sb, me, c);
      if (id) {
        setSaved(s => ({ ...s, [c.id]: id }));
        toast({ title: "In your Planner", body: "The deadline, and a to-do a week before to get your application ready.", action: { label: "Open Planner", href: "/dashboard/tasks" } });
      } else toast({ title: "That didn't work. Please try again.", tone: "plain" });
    }
    setBusy(null);
  }

  const chips: { key: Filter; name: string }[] = [
    { key: "all", name: "All" }, { key: "near", name: "Prague and Czechia" },
    ...KINDS.map(k => ({ key: k.key as Filter, name: k.plural })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Open calls"
        description="Open calls, grants, residencies and prizes for artists in Prague and across Europe. We check each one. Add a deadline to your Planner in one tap."
        actions={admin ? <Button variant="primary" onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Add an open call</Button> : undefined}
      />

      {missing && <Alert tone="info">Open calls aren&rsquo;t switched on yet. {admin ? "Run the artist_value SQL in Supabase, then refresh." : "Check back soon."}</Alert>}

      {calls && open.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Show">
          {chips.map(c => <Chip key={c.key} selected={filter === c.key} onClick={() => setFilter(c.key)}>{c.name}</Chip>)}
        </div>
      )}

      {!calls ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-36 w-full rounded-card" />)}</div>
      ) : !missing && !open.length ? (
        <EmptyState icon={<Megaphone size={22} aria-hidden />} title="No open calls right now"
          description={admin ? "Add the first one. Artists see it straight away, soonest deadline first." : "We add new open calls, grants and residencies every week. Check back soon, or post your own in the Scene."}
          action={admin
            ? <Button variant="primary" onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Add an open call</Button>
            : <Link href="/dashboard/scene" className={buttonClasses("secondary")}>Go to the Scene</Link>} />
      ) : !shown.length ? (
        <p className="font-ui text-body-sm text-fg-3">Nothing here for this filter. <button type="button" className="font-semibold text-fg underline underline-offset-2" onClick={() => setFilter("all")}>Show all</button></p>
      ) : (
        <>
          {newCount > 0 && <p className="font-ui text-body-sm text-fg-2"><strong className="font-semibold text-fg">{newCount} new</strong> this week.</p>}
          {groups.map(([name, list]) => (
            <section key={name} className="flex flex-col gap-3">
              <h2 className="font-display text-h3 leading-tight text-fg">{name}</h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {list.map(c => (
                  <li key={c.id}>
                    <CallCard c={c} today={today} saved={!!saved[c.id]} busy={busy === c.id} canSave={!!me}
                      onToggle={() => toggle(c)} onEdit={admin ? () => setEditing(c) : undefined} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <p className="font-ui text-caption text-fg-3">
        Always read the full call on the organiser&rsquo;s site before you apply. Know a good one? Tell us in Messages, or post it in the <Link href="/dashboard/scene" className="underline underline-offset-2">Scene</Link>.
      </p>

      {editing && <CallEditor call={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CallCard({ c, today, saved, busy, canSave, onToggle, onEdit }: {
  c: OpenCall; today: string; saved: boolean; busy: boolean; canSave: boolean; onToggle: () => void; onEdit?: () => void;
}) {
  const left = daysLeft(c.deadline, today);
  const soon = left >= 0 && left <= 7;
  const where = [c.place, regionName(c.region)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ");
  return (
    <Card padding="lg" className={cn("flex h-full flex-col gap-3", !c.published && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{kindName(c.kind)}</Badge>
        {isNew(c) && c.published && <Badge tone="mango">New</Badge>}
        {!c.published && <Badge tone="neutral">Hidden</Badge>}
        <span className={cn("ml-auto font-ui text-label font-semibold tabular-nums", soon ? "text-bad" : "text-fg-2")}>{closesLine(c.deadline, today)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-h3 leading-tight text-fg">{c.title}</h3>
        <p className="font-ui text-body-sm text-fg-3">{[c.organizer, where].filter(Boolean).join(" · ")}</p>
      </div>
      {c.summary && <p className="line-clamp-3 font-ui text-body-sm text-fg-2">{c.summary}</p>}
      {(c.award || c.fee) && (
        <p className="font-ui text-body-sm text-fg">{[c.award, c.fee].filter(Boolean).join(" · ")}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {canSave && (
          <Button size="sm" variant={saved ? "ghost" : "secondary"} disabled={busy} onClick={onToggle} aria-pressed={saved}>
            {saved ? <><CalendarCheck size={14} aria-hidden /> In your Planner</> : <><CalendarPlus size={14} aria-hidden /> Add to Planner</>}
          </Button>
        )}
        <a href={c.url} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost", "sm")}>
          Read and apply <ExternalLink size={13} aria-hidden />
        </a>
        {onEdit && <Button size="sm" variant="ghost" className="ml-auto" onClick={onEdit} aria-label={`Change ${c.title}`}><Pencil size={14} aria-hidden /></Button>}
      </div>
    </Card>
  );
}

// ── Adding and changing (admins only; the database checks too) ─────
function CallEditor({ call, onClose, onSaved }: { call: OpenCall | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<CallDraft>(call ? draftOf(call) : emptyDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof CallDraft>(k: K, v: CallDraft[K]) => setD(x => ({ ...x, [k]: v }));

  async function save() {
    const r = rowOf(d);
    if ("error" in r) { setError(r.error); return; }
    setBusy(true); setError("");
    const sb = createClient();
    const res = call ? await sb.from("open_calls").update(r.row).eq("id", call.id) : await sb.from("open_calls").insert(r.row);
    setBusy(false);
    if (res.error) { setError(res.error.code === "42501" ? "Only the Artomango team can add open calls." : "That didn't save. Please check the fields and try again."); return; }
    onSaved();
  }
  async function remove() {
    if (!call) return;
    setBusy(true);
    await createClient().from("open_calls").delete().eq("id", call.id);
    setBusy(false);
    onSaved();
  }

  return (
    <Modal open onClose={onClose} size="lg" title={call ? "Change this open call" : "Add an open call"}
      description="Artists see it straight away, soonest deadline first. Keep it short; the link has the details."
      footer={
        <>
          {call && <Button variant="ghost" className="mr-auto text-bad" disabled={busy} onClick={remove}>Remove</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : call ? "Save" : "Add it"}</Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Link to the call" hint="Where artists read the rules and apply.">{p => <Input {...p} type="url" inputMode="url" value={d.url} onChange={e => set("url", e.target.value)} placeholder="https://" />}</Field>
        <Field label="Title">{p => <Input {...p} maxLength={140} value={d.title} onChange={e => set("title", e.target.value)} placeholder="Young painters' prize 2027" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who runs it">{p => <Input {...p} maxLength={120} value={d.organizer} onChange={e => set("organizer", e.target.value)} placeholder="Gallery, foundation or city" />}</Field>
          <Field label="Deadline">{p => <Input {...p} type="date" value={d.deadline} onChange={e => set("deadline", e.target.value)} />}</Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-ui text-label font-semibold text-fg">What it is</legend>
          <div className="flex flex-wrap gap-2">{KINDS.map(k => <Chip key={k.key} selected={d.kind === k.key} onClick={() => set("kind", k.key)}>{k.name}</Chip>)}</div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where" hint="Prague and Czechia show under the near-you filter.">
            {p => <Select {...p} value={d.region} onChange={e => set("region", e.target.value as CallDraft["region"])}>{REGIONS.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}</Select>}
          </Field>
          <Field label="Place" hint="Optional. A city or venue.">{p => <Input {...p} maxLength={120} value={d.place} onChange={e => set("place", e.target.value)} placeholder="Brno, DOX, Vienna" />}</Field>
        </div>
        <Field label="In a few lines" hint="Who can apply and what they get.">{p => <Textarea {...p} rows={3} maxLength={600} value={d.summary} onChange={e => set("summary", e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What artists get" hint="Optional.">{p => <Input {...p} maxLength={80} value={d.award} onChange={e => set("award", e.target.value)} placeholder="€5,000 and a solo show" />}</Field>
          <Field label="Fee" hint="Optional.">{p => <Input {...p} maxLength={60} value={d.fee} onChange={e => set("fee", e.target.value)} placeholder="Free to apply" />}</Field>
        </div>
        <div className="flex items-center justify-between gap-4 border-t-hair border-line pt-4">
          <span className="flex flex-col">
            <span className="font-ui text-label font-semibold text-fg">Show to artists</span>
            <span className="font-ui text-caption text-fg-3">Switch off to keep it as a draft.</span>
          </span>
          <Switch checked={d.published} onChange={v => set("published", v)} label="Show to artists" />
        </div>
      </div>
    </Modal>
  );
}
