"use client";
// One project, one folder: everything a curator has gathered for a show,
// an event or a collection, on one scroll.
//
//   Top        cover, name, dates, place, and one status line
//   Next step  the single most useful thing to do now
//   Works      every gathered piece, with where its deal stands
//   Artists    each artist once, with their step and a Message button
//   Dates      the project's timeline
//   Papers     every agreement in the project
//   About      what it's about and what it's looking for, each one editable
//
// The works, artists and papers all come from the deals that belong to the
// project (lib/projects), so nothing here has to be kept in sync by hand.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ExternalLink, FileSignature, ImageOff, MapPin, MessageSquare, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, Eyebrow, Modal, Skeleton, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { NextStepCard } from "@/components/home/NextStepCard";
import { AgreementSheet } from "@/components/deals/AgreementSheet";
import { useJourney } from "@/components/journey/JourneyProvider";
import { formatPrice } from "@/components/public/PublicChrome";
import { type DealView, dealLink, nextLine } from "@/lib/deals";
import { sizeLine } from "@/lib/places";
import { Share } from "./Share";
import {
  type GatheredWork, type ProjectInvite, type ProjectView, type WorkStep,
  DEAL_LABEL, KIND_LABEL, WORK_STEP_LABEL, dateLine, loadProject, opensIn, placeLine, statusLine,
} from "@/lib/projects";

const STEP_TONE: Record<WorkStep, BadgeTone> = { offered: "mango", invited: "neutral", interested: "mango", agreement: "info", signed: "ok" };
const edit = (id: string, step: string) => `/dashboard/projects/new?id=${id}&step=${step}`;
const fmt = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Paper = { id: string; title: string; status: string; executed_at: string | null };

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [p, setP] = useState<ProjectView | null>(null);
  const [missing, setMissing] = useState(false);
  const [papers, setPapers] = useState<Map<string, Paper>>(new Map());
  const [onlySigned, setOnlySigned] = useState(false);
  const [openWork, setOpenWork] = useState<GatheredWork | null>(null);
  const [agreeing, setAgreeing] = useState<DealView | null>(null);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [curator, setCurator] = useState("");
  const { later } = useJourney();

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    setMe(user.id);
    const view = await loadProject(sb, user.id, params.id);
    if (!view || view.owner_id !== user.id) { setMissing(true); return; }
    setP(view);
    sb.from("project_invites").select("*").eq("project_id", view.id).order("created_at", { ascending: false })
      .then(({ data }) => setInvites((data || []) as ProjectInvite[]));
    sb.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => setCurator(data?.full_name || ""));
    const ids = view.deals.map(d => d.contract_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data } = await sb.from("contracts").select("id, title, status, executed_at").in("id", ids);
      setPapers(new Map(((data || []) as Paper[]).map(c => [c.id, c])));
    } else setPapers(new Map());
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const works = useMemo(() => (p ? (onlySigned ? p.works.filter(w => w.step === "signed") : p.works) : []), [p, onlySigned]);
  const artists = useMemo(() => {
    if (!p) return [];
    const by = new Map<string, DealView[]>();
    p.deals.forEach(d => by.set(d.artist_id, [...(by.get(d.artist_id) || []), d]));
    return Array.from(by.values());
  }, [p]);

  if (missing) return (
    <EmptyState title="This project isn't here" description="It may have been removed, or it belongs to someone else."
      action={<ButtonLink variant="secondary" href="/dashboard/projects">Your projects</ButtonLink>} />
  );
  if (!p || !me) return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-56 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-card" />)}</div>
    </div>
  );

  const invite = `/dashboard/looking?project=${p.id}`;
  const finished = p.status === "done";

  function finish(done: boolean) {
    if (!p) return;
    const prev = p.status;
    setP({ ...p, status: done ? "done" : "active" });
    later({
      title: done ? `${p.title} is marked as finished` : `${p.title} is open again`,
      body: done ? "It moves to Finished in your projects." : undefined,
      commit: async () => { await createClient().from("projects").update({ status: done ? "done" : "active" }).eq("id", p.id); },
      undo: () => setP(x => x && { ...x, status: prev }),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 self-start font-ui text-label font-semibold text-fg-3 hover:text-fg">
        <ArrowLeft size={14} aria-hidden /> Projects
      </Link>

      {/* ── Top ── */}
      <header className="flex flex-col overflow-hidden rounded-card border-outline border-ink bg-surface shadow-hard-1">
        {p.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="aspect-[21/9] max-h-[320px] w-full border-b-outline border-ink object-cover" />
        ) : (
          <Link href={edit(p.id, "cover")} className="flex h-28 items-center justify-center gap-2 border-b-hair border-line bg-sunken font-ui text-body-sm font-semibold text-fg-3 hover:text-fg">
            <Plus size={16} aria-hidden /> Add a cover image
          </Link>
        )}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Eyebrow>{KIND_LABEL[p.kind]}</Eyebrow>
              {finished && <Badge>Finished</Badge>}
            </div>
            <h1 className="font-display text-display leading-[0.95] text-fg">{p.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-ui text-body-sm text-fg-2">
              <Link href={edit(p.id, "when")} className="inline-flex items-center gap-1.5 hover:text-fg"><CalendarDays size={14} aria-hidden /> {dateLine(p)}</Link>
              <Link href={edit(p.id, "where")} className="inline-flex items-center gap-1.5 hover:text-fg"><MapPin size={14} aria-hidden /> {placeLine(p)}</Link>
            </div>
            <p className="font-ui text-body font-semibold text-fg">{statusLine(p)}</p>
          </div>
          {!finished && <ButtonLink variant="primary" href={invite}><Plus size={16} aria-hidden /> Invite artists</ButtonLink>}
        </div>
      </header>

      {/* ── Next step ── */}
      {!finished && <ProjectNextStep p={p} me={me} invite={invite} papers={papers} onAgree={setAgreeing} />}

      {/* ── Works ── */}
      <section aria-labelledby="works-head" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Eyebrow>Gathered so far</Eyebrow>
            <h2 id="works-head" className="font-display text-h2 leading-tight text-fg">
              {p.works.length ? `${p.works.length} ${p.works.length === 1 ? "work" : "works"}` : "Works"}
              {p.looking_for?.count ? <span className="text-fg-3"> of about {p.looking_for.count}</span> : null}
            </h2>
          </div>
          {p.works.length > 0 && (
            <div role="group" aria-label="Show" className="inline-flex rounded-control border-hair border-line bg-surface p-0.5">
              {[["All", false], [`Signed (${p.signed})`, true]].map(([label, v]) => (
                <button key={String(v)} type="button" aria-pressed={onlySigned === v} onClick={() => setOnlySigned(v as boolean)}
                  className={cn("h-8 rounded-[6px] px-3 font-ui text-label font-semibold transition-colors", onlySigned === v ? "bg-ink text-on-inverse" : "text-fg-2 hover:text-fg")}>
                  {label as string}
                </button>
              ))}
            </div>
          )}
        </div>
        {p.works.length === 0 ? (
          <EmptyState title="No works yet" description="Invite an artist and the works you ask for land here, with where each one stands."
            action={!finished ? <ButtonLink variant="secondary" href={invite}>Find artists</ButtonLink> : undefined} />
        ) : works.length === 0 ? (
          <p className="font-ui text-body-sm text-fg-3">Nothing signed yet. When an artist signs, their works show here as your final list.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {works.map(w => (
              <li key={`${w.deal.id}-${w.id}`}>
                <button type="button" onClick={() => setOpenWork(w)}
                  className="group flex w-full flex-col overflow-hidden rounded-card border-hair border-line bg-surface text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none">
                  <span className="relative block aspect-square bg-sunken">
                    {w.images?.[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={w.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-3" />
                      : <ImageOff size={22} aria-hidden className="absolute inset-0 m-auto text-fg-3" />}
                    <Badge tone={STEP_TONE[w.step]} className="absolute left-2 top-2">{WORK_STEP_LABEL[w.step]}</Badge>
                  </span>
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
                    <span className="truncate font-ui text-caption text-fg-2">{w.deal.other?.full_name || "Artist"}</span>
                    <span className="truncate font-ui text-caption text-fg-3">{[sizeLine(w), formatPrice(w.price, w.currency)].filter(Boolean).join(" · ") || " "}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Artists ── */}
        <Card padding="none" className="flex flex-col lg:col-span-2">
          <PanelHead eyebrow="People" title={artists.length ? `${artists.length} ${artists.length === 1 ? "artist" : "artists"}` : "Artists"} />
          {artists.length === 0 ? (
            <Quiet>Artists you invite show up here, with where each one stands.</Quiet>
          ) : (
            <ul className="divide-y divide-line">
              {artists.map(ds => {
                const d = ds[0];
                const n = ds.reduce((s, x) => s + x.works.length, 0);
                return (
                  <li key={d.artist_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={d.other?.full_name || "Artist"} src={d.other?.avatar_url} size="md" />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-ui text-body font-semibold text-fg">{d.other?.full_name || "Artist"}</span>
                        <span className="truncate font-ui text-caption text-fg-3">{n} {n === 1 ? "work" : "works"} · {nextLine(d, me)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.status === "interested" && <Button size="sm" variant="primary" onClick={() => setAgreeing(d)}><FileSignature size={14} aria-hidden /> Send agreement</Button>}
                      {d.conversation_id && <ButtonLink size="sm" variant="ghost" href={`/dashboard/messages?c=${d.conversation_id}`}><MessageSquare size={14} aria-hidden /> Message</ButtonLink>}
                      <ButtonLink size="sm" variant="ghost" href={dealLink(d.id)}>Deal</ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── Dates ── */}
        <Card padding="none" className="flex flex-col">
          <PanelHead eyebrow="Timeline" title="Dates" action={<Link href={edit(p.id, "when")} className="font-ui text-label font-semibold text-fg-2 hover:text-fg">Edit</Link>} />
          <Timeline p={p} />
          {(p.starts_on || p.ends_on) && p.status !== "done" && (
            <Link href="/dashboard/tasks?view=month" className="mx-5 mb-5 inline-flex items-center gap-1.5 self-start font-ui text-label font-semibold text-fg-2 hover:text-fg">
              <CalendarDays size={13} aria-hidden /> In your Planner
            </Link>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Papers ── */}
        <Card padding="none" className="flex flex-col lg:col-span-2">
          <PanelHead eyebrow="Papers" title="Agreements" />
          {p.deals.filter(d => d.contract_id).length === 0 ? (
            <Quiet>When an artist says yes, you send a simple agreement, filled in from this project. They all live here.</Quiet>
          ) : (
            <ul className="divide-y divide-line">
              {p.deals.filter(d => d.contract_id).map(d => {
                const c = papers.get(d.contract_id!);
                const signed = d.status === "signed" || !!c?.executed_at;
                return (
                  <li key={d.id}>
                    <Link href={`/dashboard/contracts/${d.contract_id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-sunken">
                      <FileSignature size={16} aria-hidden className="shrink-0 text-fg-3" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{c?.title || `Agreement with ${d.other?.full_name || "the artist"}`}</span>
                        <span className="truncate font-ui text-caption text-fg-3">{d.other?.full_name}</span>
                      </span>
                      <Badge tone={signed ? "ok" : "info"}>{signed ? "Signed" : "Waiting"}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
        {/* ── About ── */}
          <Card padding="none" className="flex flex-col">
            <PanelHead eyebrow="About" title="The project" action={<Link href={edit(p.id, "about")} className="font-ui text-label font-semibold text-fg-2 hover:text-fg">Edit</Link>} />
            <div className="flex flex-col gap-4 px-5 pb-5">
              {p.about
                ? <p className="whitespace-pre-line font-ui text-body-sm text-fg-2">{p.about}</p>
                : <Link href={edit(p.id, "about")} className="font-ui text-body-sm text-fg-3 underline underline-offset-2 hover:text-fg">Add a few lines about it</Link>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t-hair border-line pt-4 font-ui text-body-sm">
                <dt className="text-fg-3">Kinds</dt><dd className="text-fg">{p.looking_for?.mediums?.length ? p.looking_for.mediums.join(", ") : "Any"}</dd>
                <dt className="text-fg-3">Works</dt><dd className="text-fg">{p.looking_for?.deal ? DEAL_LABEL[p.looking_for.deal] : "Not decided"}{p.looking_for?.deal === "sale" && p.looking_for.commission != null ? `, ${p.looking_for.commission}%` : ""}</dd>
              </dl>
              <Link href={edit(p.id, "looking")} className="inline-flex items-center gap-1.5 self-start font-ui text-label font-semibold text-fg-2 hover:text-fg"><Pencil size={13} aria-hidden /> What you&rsquo;re looking for</Link>
            </div>
          </Card>
          <Share p={p} curator={curator} invites={invites}
            onChange={patch => setP(x => x && { ...x, ...patch })}
            onInvited={() => createClient().from("project_invites").select("*").eq("project_id", p.id).order("created_at", { ascending: false }).then(({ data }) => setInvites((data || []) as ProjectInvite[]))} />
        </div>
      </div>

      <div className="flex justify-center border-t-hair border-line pt-6">
        <Button variant="ghost" size="sm" onClick={() => finish(!finished)}>{finished ? "Open it again" : "Mark the project as finished"}</Button>
      </div>

      {openWork && <WorkSheet w={openWork} papers={papers} onClose={() => setOpenWork(null)} onAgree={() => { setAgreeing(openWork.deal); setOpenWork(null); }} />}
      {agreeing && <AgreementSheet deal={agreeing} me={me} onClose={() => setAgreeing(null)} onSent={load} />}
    </div>
  );
}

// ── Next step ───────────────────────────────────────────────────────
function ProjectNextStep({ p, me, invite, papers, onAgree }: {
  p: ProjectView; me: string; invite: string; papers: Map<string, Paper>; onAgree: (d: DealView) => void;
}) {
  const asked = p.deals.find(d => d.status === "sent" && d.started_by === d.artist_id);
  if (asked) {
    const who = asked.other?.full_name || "An artist";
    const n = asked.works.length;
    return <NextStepCard tone="mango" eyebrow="Your turn" image={asked.works[0]?.images?.[0] ?? null}
      title={`${who} would like to join with ${n === 1 ? (asked.works[0]?.title ? `“${asked.works[0].title}”` : "a work") : `${n} works`}`}
      line="Have a look. Saying yes costs nothing: next you send the agreement, already filled in."
      primary={{ label: "Have a look", href: dealLink(asked.id) }} />;
  }
  const yes = p.deals.find(d => d.status === "interested");
  if (yes) {
    const who = yes.other?.full_name || "An artist";
    return <NextStepCard tone="mango" eyebrow="Your turn" image={yes.works[0]?.images?.[0] ?? null}
      title={`${who} said yes. Send the agreement.`}
      line="It's filled in from this project: the dates, the place and the terms. Check it and send."
      primary={{ label: "Send agreement", onClick: () => onAgree(yes) }} />;
  }
  const waiting = p.deals.find(d => d.status === "agreement_sent" && d.contract_id && !papers.get(d.contract_id)?.executed_at);
  if (waiting) {
    return <NextStepCard eyebrow="Waiting for signatures" title={`Your agreement with ${waiting.other?.full_name || "the artist"}`}
      line="Add your signature if you haven't yet. Once you've both signed, the work is in." image={waiting.works[0]?.images?.[0] ?? null}
      primary={{ label: "Open the agreement", href: `/dashboard/contracts/${waiting.contract_id}` }} />;
  }
  if (p.works.length === 0) {
    return <NextStepCard eyebrow="Next step" title="Invite your first artist"
      line="Pick a work you'd love to include. We write the invitation for you, with your dates and place."
      primary={{ label: "Find artists", href: invite }}
      progress={[
        { label: "Project started", done: true },
        { label: "Dates", done: !!(p.starts_on || p.ends_on) || p.kind === "collection" },
        { label: "First artist invited", done: false },
        { label: "First agreement signed", done: false },
      ]} />;
  }
  const o = opensIn(p);
  if (p.deals.every(d => d.status === "sent")) {
    return <NextStepCard eyebrow="Out with artists" title={`${p.deals.length === 1 ? "1 invitation" : `${p.deals.length} invitations`} waiting for an answer`}
      line="Artists get an email and answer in a tap. We'll tell you the moment someone says yes. Meanwhile, invite a few more."
      secondary={{ label: "See the deals", href: "/dashboard/messages?tab=deals" }} primary={{ label: "Invite more artists", href: invite }} />;
  }
  if (o != null && o <= 14 && p.signed > 0) {
    return <NextStepCard eyebrow="Coming up" title={o === 0 ? "It opens today" : `It opens in ${o} ${o === 1 ? "day" : "days"}`}
      line={`${p.signed} signed ${p.signed === 1 ? "work" : "works"}. Switch to Signed below for your final list.`} />;
  }
  return null;
}

// ── Pieces ──────────────────────────────────────────────────────────
function PanelHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-5">
      <div className="flex flex-col gap-0.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="font-display text-h3 leading-tight text-fg">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pb-6 pt-1 font-ui text-body-sm text-fg-3">{children}</p>;
}

function Timeline({ p }: { p: ProjectView }) {
  const t = new Date().toISOString().slice(0, 10);
  const firstInvite = [...p.deals, ...p.closed].map(d => d.created_at).sort()[0];
  const firstSigned = p.deals.filter(d => d.status === "signed").map(d => d.updated_at).sort()[0];
  const rows: { label: string; date: string | null; done: boolean }[] = [
    { label: "Project started", date: p.created_at, done: true },
    { label: "First artist invited", date: firstInvite || null, done: !!firstInvite },
    { label: "First agreement signed", date: firstSigned || null, done: !!firstSigned },
    ...(p.kind === "collection"
      ? (p.ends_on ? [{ label: "Handover", date: p.ends_on, done: p.ends_on < t }] : [])
      : [
        { label: "Opens", date: p.starts_on, done: !!p.starts_on && p.starts_on <= t },
        { label: "Closes", date: p.ends_on, done: !!p.ends_on && p.ends_on < t },
      ]),
  ];
  return (
    <ol className="flex flex-col px-5 pb-5">
      {rows.map((r, i) => (
        <li key={r.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < rows.length - 1 && <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-line" />}
          <span aria-hidden className={cn("relative mt-1 h-[15px] w-[15px] shrink-0 rounded-pill border-outline", r.done ? "border-ink bg-ink" : "border-line-strong bg-surface")} />
          <span className="flex flex-col">
            <span className={cn("font-ui text-body-sm font-semibold", r.done ? "text-fg" : "text-fg-2")}>{r.label}</span>
            <span className="font-ui text-caption text-fg-3">{r.date ? fmt(r.date) : "Not yet"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function WorkSheet({ w, papers, onClose, onAgree }: { w: GatheredWork; papers: Map<string, Paper>; onClose: () => void; onAgree: () => void }) {
  const d = w.deal;
  const paper = d.contract_id ? papers.get(d.contract_id) : null;
  const rows: [string, string | null | undefined][] = [
    ["Artist", d.other?.full_name],
    ["Size", sizeLine(w)],
    ["Medium", w.medium],
    ["Price", formatPrice(w.price, w.currency) || null],
    ["Status", WORK_STEP_LABEL[w.step]],
    ["Agreement", paper ? (paper.executed_at ? "Signed" : "Waiting for signatures") : d.status === "interested" ? "Ready to send" : null],
  ];
  return (
    <Modal open onClose={onClose} size="md" title={w.title}
      footer={<>
        <ButtonLink variant="ghost" href={`/artwork/${w.id}/passport`} target="_blank" className="mr-auto"><ExternalLink size={14} aria-hidden /> Full details</ButtonLink>
        {d.status === "interested"
          ? <Button variant="primary" onClick={onAgree}><FileSignature size={15} aria-hidden /> Send agreement</Button>
          : paper
            ? <ButtonLink variant="primary" href={`/dashboard/contracts/${paper.id}`}><FileSignature size={15} aria-hidden /> Open the agreement</ButtonLink>
            : <ButtonLink variant="secondary" href={dealLink(d.id)}>See the deal <ArrowRight size={15} aria-hidden /></ButtonLink>}
      </>}>
      <div className="flex flex-col gap-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-card border-hair border-line bg-sunken">
          {w.images?.[0]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={w.images[0]} alt={w.title} className="absolute inset-0 h-full w-full object-contain p-4" />
            : <ImageOff size={26} aria-hidden className="absolute inset-0 m-auto text-fg-3" />}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-ui text-body-sm">
          {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-fg-3">{k}</dt><dd className="text-fg">{v}</dd></div>)}
        </dl>
        <p className="flex items-center gap-2 rounded-control bg-sunken px-3 py-2 font-ui text-body-sm text-fg-2">
          {w.step === "signed" ? <Check size={15} aria-hidden className="shrink-0 text-ok" /> : null}{nextLine(d, d.venue_id)}
        </p>
      </div>
    </Modal>
  );
}
