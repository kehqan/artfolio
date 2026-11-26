// Open calls: open calls, grants, residencies and prizes, added and checked
// by the Artomango team (admins). Artists read them and add the deadline to
// their Planner in one tap (database/migrations/20261126_artist_value.sql).
//
// In the Planner an open call is a calendar entry with source 'open_call'
// and origin_id = the call, plus a to-do a week before ("Get your
// application ready"). If the team moves a deadline, the Planner follows.
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, iso } from "@/app/dashboard/tasks/planner";

export type CallKind = "open_call" | "grant" | "residency" | "prize";
export type CallRegion = "prague" | "czechia" | "europe" | "world" | "online";

export type OpenCall = {
  id: string; title: string; organizer: string | null; kind: CallKind; region: CallRegion;
  place: string | null; deadline: string; url: string; summary: string | null;
  fee: string | null; award: string | null; published: boolean; created_at: string;
};

export const KINDS: { key: CallKind; name: string; plural: string }[] = [
  { key: "open_call", name: "Open call", plural: "Open calls" },
  { key: "grant", name: "Grant", plural: "Grants" },
  { key: "residency", name: "Residency", plural: "Residencies" },
  { key: "prize", name: "Prize", plural: "Prizes" },
];
export const kindName = (k: string) => KINDS.find(x => x.key === k)?.name || "Open call";

export const REGIONS: { key: CallRegion; name: string }[] = [
  { key: "prague", name: "Prague" },
  { key: "czechia", name: "Czechia" },
  { key: "europe", name: "Europe" },
  { key: "world", name: "Anywhere" },
  { key: "online", name: "Online" },
];
export const regionName = (k: string) => REGIONS.find(x => x.key === k)?.name || "";
/** "Near you" while Artomango starts in Prague. */
export const isNear = (c: Pick<OpenCall, "region">) => c.region === "prague" || c.region === "czechia";

export const todayIso = () => iso(new Date());

export function daysLeft(deadline: string, today = todayIso()) {
  return Math.round((new Date(deadline + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 864e5);
}

/** "Closes today", "Closes tomorrow", "6 days left", "Closes 12 Jan". */
export function closesLine(deadline: string, today = todayIso()) {
  const d = daysLeft(deadline, today);
  if (d < 0) return "Closed";
  if (d === 0) return "Closes today";
  if (d === 1) return "Closes tomorrow";
  if (d <= 14) return `${d} days left`;
  const sameYear = deadline.slice(0, 4) === today.slice(0, 4);
  return `Closes ${new Date(deadline + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })}`;
}

export const isNew = (c: Pick<OpenCall, "created_at">) => Date.now() - new Date(c.created_at).getTime() < 7 * 864e5;

/** Calls still open, soonest deadline first. null when the feature isn't set up yet. */
export async function loadCalls(sb: SupabaseClient, opts: { limit?: number; all?: boolean } = {}): Promise<OpenCall[] | null> {
  let q = sb.from("open_calls").select("*").order("deadline", { ascending: true });
  if (!opts.all) q = q.gte("deadline", todayIso());
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) return null;
  return (data || []) as OpenCall[];
}

/** Which calls are already in this person's Planner: call id → calendar entry id. */
export async function loadSaved(sb: SupabaseClient, me: string): Promise<Record<string, string>> {
  const { data } = await sb.from("calendar_events").select("id, origin_id").eq("user_id", me).eq("source", "open_call");
  const out: Record<string, string> = {};
  ((data || []) as { id: string; origin_id: string | null }[]).forEach(e => { if (e.origin_id) out[e.origin_id] = e.id; });
  return out;
}

const PREP_STEPS = ["Read the brief and the rules", "Pick the works to send", "Write or update your statement", "Send the application"];
const prepTitle = (c: Pick<OpenCall, "title">) => `Get your application ready: ${c.title}`;

/** Put a call in the Planner: the deadline, and a to-do a week before. Returns the entry id. */
export async function addToPlanner(sb: SupabaseClient, me: string, c: OpenCall): Promise<string | null> {
  const { data, error } = await sb.from("calendar_events").insert({
    user_id: me, title: `Deadline: ${c.title}`, type: "deadline",
    start_date: c.deadline, all_day: true, is_public: false,
    description: [c.organizer, c.summary, c.url].filter(Boolean).join("\n\n").slice(0, 2000),
    location: c.place || regionName(c.region) || null,
    source: "open_call", origin_id: c.id,
  }).select("id").single();
  if (error || !data) return null;
  const today = todayIso();
  const prep = addDays(c.deadline, -7) > today ? addDays(c.deadline, -7) : today;
  await sb.from("tasks").insert({
    user_id: me, title: prepTitle(c), description: c.url, status: "pending", priority: daysLeft(c.deadline) <= 7 ? "high" : "medium",
    type: "exhibition", due_date: prep, checklist: PREP_STEPS.map(text => ({ text, done: false })),
  });
  return (data as { id: string }).id;
}

/** Take a call out of the Planner again (the deadline and its to-do, if not started). */
export async function removeFromPlanner(sb: SupabaseClient, me: string, c: OpenCall, entryId: string) {
  await sb.from("calendar_events").delete().eq("id", entryId).eq("user_id", me);
  await sb.from("tasks").delete().eq("user_id", me).eq("title", prepTitle(c)).eq("status", "pending");
}

export type CallDraft = {
  title: string; organizer: string; kind: CallKind; region: CallRegion; place: string;
  deadline: string; url: string; summary: string; fee: string; award: string; published: boolean;
};
export const emptyDraft = (): CallDraft => ({
  title: "", organizer: "", kind: "open_call", region: "prague", place: "", deadline: "", url: "", summary: "", fee: "", award: "", published: true,
});
export const draftOf = (c: OpenCall): CallDraft => ({
  title: c.title, organizer: c.organizer || "", kind: c.kind, region: c.region, place: c.place || "", deadline: c.deadline,
  url: c.url, summary: c.summary || "", fee: c.fee || "", award: c.award || "", published: c.published,
});

/** Check a draft; returns an error line, or the row to save. */
export function rowOf(d: CallDraft): { error: string } | { row: Record<string, unknown> } {
  if (d.title.trim().length < 3) return { error: "Give it a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.deadline)) return { error: "Add the deadline." };
  let url = d.url.trim();
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  try { if (!url) throw new Error(); new URL(url); } catch { return { error: "Add the link to the call, where artists apply." }; }
  const t = (s: string, n: number) => s.trim().slice(0, n) || null;
  return {
    row: {
      title: d.title.trim().slice(0, 140), organizer: t(d.organizer, 120), kind: d.kind, region: d.region, place: t(d.place, 120),
      deadline: d.deadline, url, summary: t(d.summary, 600), fee: t(d.fee, 60), award: t(d.award, 80), published: d.published,
    },
  };
}
