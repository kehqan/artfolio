// Deals: one journey from "here are some works" to a signed agreement.
//
//   sent -> interested -> agreement_sent -> signed
//           declined (by the person who received it)
//   withdrawn (by the person who started it)
//
// An artist offering works to a venue and a venue requesting works from
// an artist both create a deal. Every move also adds a line to the two
// people's chat, so the conversation stays in one place. Those lines are
// tagged "deal" so they aren't emailed on their own: each step already has
// its own email (database/migrations/20261124_emails.sql).
import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlaceArtwork, workLine } from "@/lib/places";

export type DealStatus = "sent" | "interested" | "declined" | "withdrawn" | "agreement_sent" | "signed";

export type DealTerms = { sells?: boolean | null; commission?: number | null; duration?: string | null; wall?: string | null; terms?: string | null };

export type Deal = {
  id: string; artist_id: string; venue_id: string; started_by: string;
  pool_request_id: string | null; project_id?: string | null; artwork_ids: string[]; note: string | null; terms: DealTerms | null;
  status: DealStatus; conversation_id: string | null; contract_id: string | null;
  created_at: string; updated_at: string;
};

export type Person = { id: string; full_name?: string | null; avatar_url?: string | null; role?: string | null; location?: string | null; username?: string | null };

export type DealView = Deal & {
  works: PlaceArtwork[];
  other: Person | null;
  post: { id: string; title: string; details?: DealTerms | null; location?: string | null; status?: string | null } | null;
  /** The curator's project this deal is part of, if any (lib/projects). */
  project: { id: string; title: string; kind: string; starts_on: string | null; ends_on: string | null; place: string | null; online: boolean } | null;
};

/** The 4 steps everyone sees. */
export const STEPS = ["Offered", "Interested", "Agreement", "Done"] as const;

export function stepIndex(s: DealStatus): number {
  return s === "sent" ? 0 : s === "interested" ? 1 : s === "agreement_sent" ? 2 : s === "signed" ? 3 : -1;
}

export const isClosed = (d: Deal) => d.status === "declined" || d.status === "withdrawn";

/** Is the next move mine? */
export function needsMe(d: Deal, me: string): boolean {
  if (d.status === "sent") return d.started_by !== me;          // answer it
  if (d.status === "interested") return d.venue_id === me;       // venue sends the agreement
  if (d.status === "agreement_sent") return true;                 // whoever hasn't signed (checked against the contract)
  return false;
}

/** "Mina offered 2 works", "Café Lounge asked for 1 work". */
export function headline(d: DealView, me: string): string {
  const n = d.artwork_ids.length;
  const works = `${n} ${n === 1 ? "work" : "works"}`;
  const name = d.other?.full_name || (d.venue_id === me ? "An artist" : "A venue");
  const iStarted = d.started_by === me;
  const offer = d.started_by === d.artist_id;
  if (d.project && !offer) return iStarted ? `You invited ${name} to ${d.project.title}` : `${name} invited you to ${d.project.title}`;
  if (d.project && offer) return iStarted ? `You offered ${works} to ${d.project.title}` : `${name} offered ${works} for ${d.project.title}`;
  if (iStarted) return offer ? `You offered ${works} to ${name}` : `You asked ${name} for ${works}`;
  return offer ? `${name} offered you ${works}` : `${name} asked for ${works}`;
}

/** What happens now, in plain words. */
export function nextLine(d: DealView, me: string): string {
  const other = d.other?.full_name || "They";
  const iAmVenue = d.venue_id === me;
  switch (d.status) {
    case "sent": return d.started_by === me ? `Waiting for ${other} to answer.` : d.project && d.started_by !== d.artist_id ? "Would you like to join?" : "Are you interested?";
    case "interested": return iAmVenue ? "Send an agreement to make it official." : `${other} is interested. They'll send an agreement.`;
    case "agreement_sent": return "The agreement is waiting for signatures.";
    case "signed": return "Signed by both. It's a deal.";
    case "declined": return d.started_by === me ? `${other} passed this time.` : "You passed on this one.";
    case "withdrawn": return d.started_by === me ? "You withdrew this." : `${other} withdrew this.`;
  }
}

// ── Loading ─────────────────────────────────────────────────────────
export async function loadDeals(sb: SupabaseClient, me: string): Promise<DealView[] | null> {
  const { data, error } = await sb.from("deals").select("*").or(`artist_id.eq.${me},venue_id.eq.${me}`).order("updated_at", { ascending: false });
  if (error) return null;
  const deals = (data || []) as Deal[];
  if (!deals.length) return [];
  const workIds = Array.from(new Set(deals.flatMap(d => d.artwork_ids)));
  const people = Array.from(new Set(deals.map(d => (d.artist_id === me ? d.venue_id : d.artist_id))));
  const posts = Array.from(new Set(deals.map(d => d.pool_request_id).filter(Boolean))) as string[];
  const projects = Array.from(new Set(deals.map(d => d.project_id).filter(Boolean))) as string[];
  const [{ data: ws }, { data: ps }, { data: pr }, { data: pj }] = await Promise.all([
    sb.from("artworks").select("id,title,images,medium,width_cm,height_cm,depth_cm,price,currency,status,wall_terms,user_id").in("id", workIds),
    sb.from("profiles").select("id,full_name,avatar_url,role,location,username").in("id", people),
    posts.length ? sb.from("pool_requests").select("id,title,details,location,status").in("id", posts) : Promise.resolve({ data: [] as any[] }),
    projects.length ? sb.from("projects").select("id,title,kind,starts_on,ends_on,place,online").in("id", projects) : Promise.resolve({ data: [] as any[] }),
  ]);
  const work = new Map(((ws || []) as PlaceArtwork[]).map(w => [w.id, w]));
  const person = new Map(((ps || []) as Person[]).map(p => [p.id, p]));
  const post = new Map(((pr || []) as any[]).map(p => [p.id, p]));
  const project = new Map(((pj || []) as any[]).map(p => [p.id, p]));
  return deals.map(d => ({
    ...d,
    works: d.artwork_ids.map(id => work.get(id)).filter(Boolean) as PlaceArtwork[],
    other: person.get(d.artist_id === me ? d.venue_id : d.artist_id) || null,
    post: d.pool_request_id ? post.get(d.pool_request_id) || null : null,
    project: d.project_id ? project.get(d.project_id) || null : null,
  }));
}

// ── Moves ───────────────────────────────────────────────────────────
/** Add a line to the deal's chat (creating the chat the first time). */
export async function chatLine(sb: SupabaseClient, d: Pick<Deal, "id" | "artist_id" | "venue_id" | "conversation_id">, me: string, body: string, meta?: Record<string, unknown>) {
  if (d.conversation_id) {
    await fetch(`/api/conversations/${d.conversation_id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, template_key: "deal" }),
    }).catch(() => null);
    return d.conversation_id;
  }
  const res = await fetch("/api/conversations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient_id: me === d.artist_id ? d.venue_id : d.artist_id,
      context_type: "collab", context_id: d.id, context_title: (meta?.title as string) || "Works for your walls",
      context_meta: { label: "Deal", deal_id: d.id, ...meta }, initial_message: body, template_key: "deal",
    }),
  }).catch(() => null);
  const json = res && res.ok ? await res.json().catch(() => ({})) : {};
  const id = (json as { conversation_id?: string }).conversation_id || null;
  if (id) await sb.from("deals").update({ conversation_id: id }).eq("id", d.id);
  return id;
}

/** Works as plain lines with links, for the chat. */
export function workLines(works: PlaceArtwork[], origin: string) {
  return works.map(w => `• ${w.title}${workLine(w) ? ` (${workLine(w)})` : ""}\n  ${origin}/artwork/${w.id}/passport`).join("\n");
}

export async function setStatus(sb: SupabaseClient, d: Deal, me: string, status: DealStatus, line: string) {
  const { error } = await sb.from("deals").update({ status }).eq("id", d.id);
  if (error) return false;
  await chatLine(sb, d, me, line);
  return true;
}

export const dealLink = (id: string) => `/dashboard/messages?tab=deals&deal=${id}`;
