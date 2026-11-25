// Curator projects: an exhibition, an event or a collection that a curator
// gathers art for. The curator invites artists through deals (lib/deals),
// taking the venue's place in each one, and the deal remembers its project.
// So the project page is the project itself plus every deal that points at
// it: the works, the artists, the agreements and the dates, in one place.
//
// Database: database/migrations/20261125_curator_projects.sql
import type { SupabaseClient } from "@supabase/supabase-js";
import { type DealView, isClosed, loadDeals, stepIndex } from "@/lib/deals";
import type { PlaceArtwork } from "@/lib/places";

export const isCuratorRole = (r?: string | null) => r === "curator";

export type ProjectKind = "exhibition" | "event" | "collection";
export const KIND_LABEL: Record<ProjectKind, string> = { exhibition: "Exhibition", event: "Event or show", collection: "Collection" };
export const KIND_SHORT: Record<ProjectKind, string> = { exhibition: "Exhibition", event: "Event", collection: "Collection" };

export type ProjectDeal = "loan" | "sale" | "buy" | "unsure";
export const DEAL_LABEL: Record<ProjectDeal, string> = {
  loan: "Loan for the show", sale: "For sale through us", buy: "We buy the work", unsure: "Not sure yet",
};

export type LookingFor = { mediums?: string[]; count?: number | null; deal?: ProjectDeal | null; commission?: number | null };

export type Project = {
  id: string; owner_id: string; kind: ProjectKind; title: string;
  starts_on: string | null; ends_on: string | null;
  place: string | null; lat: number | null; lng: number | null; online: boolean;
  about: string | null; looking_for: LookingFor; cover_url: string | null;
  is_open: boolean; is_public?: boolean; status: "active" | "done";
  created_at: string; updated_at: string;
};

export const PROJECT_COLS = "id, owner_id, kind, title, starts_on, ends_on, place, lat, lng, online, about, looking_for, cover_url, is_open, is_public, status, created_at, updated_at";

/** Where a gathered work stands, in the words the project page uses. */
export type WorkStep = "offered" | "invited" | "interested" | "agreement" | "signed";
export const WORK_STEP_LABEL: Record<WorkStep, string> = { offered: "Offered to you", invited: "Invited", interested: "Said yes", agreement: "To sign", signed: "Signed" };
export function workStep(d: DealView): WorkStep {
  const i = stepIndex(d.status);
  if (i <= 0) return d.started_by === d.artist_id ? "offered" : "invited";
  return i === 1 ? "interested" : i === 2 ? "agreement" : "signed";
}

export type GatheredWork = PlaceArtwork & { deal: DealView; step: WorkStep };

export type ProjectView = Project & {
  deals: DealView[];       // live deals in this project, newest first
  closed: DealView[];      // declined or withdrawn
  works: GatheredWork[];   // every work in a live deal
  artists: number;
  signed: number;          // signed works
  toSign: number;          // agreements waiting
};

function viewOf(p: Project, all: DealView[]): ProjectView {
  const mine = all.filter(d => d.project_id === p.id);
  const deals = mine.filter(d => !isClosed(d));
  const works = deals.flatMap(d => d.works.map(w => ({ ...w, deal: d, step: workStep(d) })));
  return {
    ...p, looking_for: p.looking_for || {},
    deals, closed: mine.filter(isClosed), works,
    artists: new Set(deals.map(d => d.artist_id)).size,
    signed: works.filter(w => w.step === "signed").length,
    toSign: deals.filter(d => d.status === "agreement_sent").length,
  };
}

/** All of a curator's projects with their deals. null when projects aren't set up in the database yet. */
export async function loadProjects(sb: SupabaseClient, me: string): Promise<ProjectView[] | null> {
  const [{ data, error }, deals] = await Promise.all([
    sb.from("projects").select(PROJECT_COLS).eq("owner_id", me).order("created_at", { ascending: false }),
    loadDeals(sb, me).catch(() => null),
  ]);
  if (error) return null;
  return ((data || []) as Project[]).map(p => viewOf(p, deals || []));
}

export async function loadProject(sb: SupabaseClient, me: string, id: string): Promise<ProjectView | null> {
  const [{ data }, deals] = await Promise.all([
    sb.from("projects").select(PROJECT_COLS).eq("id", id).maybeSingle(),
    loadDeals(sb, me).catch(() => null),
  ]);
  return data ? viewOf(data as Project, deals || []) : null;
}

// ── Words ───────────────────────────────────────────────────────────
const fmt = (d: string, year = false) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });

/** "12 Mar – 30 Mar 2027", "From 12 Mar 2027", "Dates to come". */
export function dateLine(p: Pick<Project, "starts_on" | "ends_on" | "kind">): string {
  if (p.starts_on && p.ends_on) return p.starts_on === p.ends_on ? fmt(p.starts_on, true) : `${fmt(p.starts_on)} – ${fmt(p.ends_on, true)}`;
  if (p.starts_on) return `From ${fmt(p.starts_on, true)}`;
  if (p.ends_on) return `Until ${fmt(p.ends_on, true)}`;
  return p.kind === "collection" ? "Ongoing" : "Dates to come";
}

export function placeLine(p: Pick<Project, "place" | "online">): string {
  if (p.online) return p.place ? `${p.place} and online` : "Online";
  return p.place || "Place to come";
}

/** Days until it opens, when it's coming up. */
export function opensIn(p: Pick<Project, "starts_on">): number | null {
  if (!p.starts_on) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = Math.round((new Date(p.starts_on + "T00:00:00").getTime() - t.getTime()) / 86400000);
  return d >= 0 ? d : null;
}

/** "9 works from 5 artists · 2 to sign · opens in 12 days". */
export function statusLine(p: ProjectView): string {
  const bits: string[] = [];
  const n = p.works.length;
  if (!n) bits.push("No works yet");
  else bits.push(`${n} ${n === 1 ? "work" : "works"} from ${p.artists} ${p.artists === 1 ? "artist" : "artists"}`);
  if (p.toSign) bits.push(`${p.toSign} to sign`);
  const o = opensIn(p);
  if (o != null && p.kind !== "collection") bits.push(o === 0 ? "opens today" : o === 1 ? "opens tomorrow" : `opens in ${o} days`);
  return bits.join(" · ");
}

/** The deal terms an invitation carries, from what the project is looking for. */
export function termsOf(p: Pick<Project, "looking_for" | "starts_on" | "ends_on">) {
  const lf = p.looking_for || {};
  return {
    sells: lf.deal === "sale" ? true : lf.deal === "loan" ? false : null,
    commission: lf.deal === "sale" && lf.commission != null ? lf.commission : null,
    duration: null,
    terms: lf.deal ? DEAL_LABEL[lf.deal] : null,
  };
}

/** The invitation note, written for them. */
export function inviteNote(p: Pick<Project, "title" | "starts_on" | "ends_on" | "place" | "online" | "kind">, artist: string, workTitle?: string | null) {
  const first = (artist || "").trim().split(/\s+/)[0] || "there";
  const when = p.starts_on || p.ends_on ? ` (${dateLine(p)})` : "";
  const where = p.place ? ` at ${p.place}` : p.online ? " online" : "";
  const what = p.kind === "collection" ? `building a collection, ${p.title}` : `putting together ${p.title}${where}${when}`;
  const ask = workTitle ? `I'd love to include ${workTitle}.` : "I'd love to include some of your work.";
  return `Hi ${first}, I'm ${what}. ${ask} Would you like to join?`;
}

export const projectHref = (id: string) => `/dashboard/projects/${id}`;
/** The page anyone can open: public, open to artists, or with an invitation. */
export const publicProjectHref = (id: string, token?: string | null) => `/project/${id}${token ? `?invite=${token}` : ""}`;

// ── Invitations by email (part 2) ───────────────────────────────────
export type ProjectInvite = { id: string; project_id: string; email: string | null; name: string | null; token: string; accepted_by: string | null; accepted_at: string | null; created_at: string };

/** A ready email: subject and body with the link, for the curator's own mail app. */
export function inviteEmail(p: Pick<Project, "title" | "starts_on" | "ends_on" | "place" | "online" | "kind">, name: string, curator: string, link: string, email?: string | null) {
  const subject = `Join ${p.title}?`;
  const body = `${inviteNote(p, name)}\n\nHere's the project, and where you can offer your works:\n${link}\n\nIt's on Artomango, free for artists. If you're new, it takes two minutes to join.\n\n${curator}`;
  return { subject, body, mailto: `mailto:${email ? encodeURIComponent(email).replace("%40", "@") : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

/** What the public page reads (database function public_project). */
export type PublicProject = Pick<Project, "id" | "kind" | "title" | "starts_on" | "ends_on" | "place" | "online" | "about" | "looking_for" | "cover_url" | "status"> & {
  is_open: boolean; is_public: boolean;
  owner: { id: string; name: string; avatar: string | null; username: string | null; location: string | null } | null;
  works: { id: string; title: string; image: string | null; medium: string | null; width_cm: number | null; height_cm: number | null; artist: string; artist_username: string | null }[];
  invite: { name: string | null } | null;
};
