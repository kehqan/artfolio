"use client";
// Offer or request works, in one sheet.
//   offer:   an artist picks 1 to 3 of their works for a venue.
//   request: a venue picks 1 to 3 of an artist's available works.
// Either way it starts a deal (see lib/deals.ts) and adds the works to the
// two people's chat as cards and as plain lines with links. If deals
// aren't set up in the database yet, it still sends the message.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Button, ButtonLink, EmptyState, Field, Modal, Select, Skeleton, Textarea, cn } from "@/components/ui";
import { type PlaceArtwork, WALL_LABEL, isSold, missingForWall, wallReady, workLine } from "@/lib/places";
import { type DealTerms, chatLine, dealLink, workLines } from "@/lib/deals";
import { useJourney } from "@/components/journey/JourneyProvider";
import { type Project, PROJECT_COLS, inviteNote, isCuratorRole, termsOf } from "@/lib/projects";

const MAX = 3;

export type OfferTarget = {
  recipientId: string;
  name: string;
  avatar?: string | null;
  /** What they posted, if anything: shown with the message. */
  contextId?: string;
  contextTitle?: string;
  contextLabel?: string;
  /** offer (artist to venue, the default) or request (venue to artist). */
  mode?: "offer" | "request";
  /** The venue's wall post this is for, if any. */
  poolRequestId?: string | null;
  /** A curator's project this invitation is for (lib/projects). */
  projectId?: string | null;
  terms?: DealTerms | null;
};

type WallPost = { id: string; title: string; details?: DealTerms | null };

type Props = {
  open: boolean;
  onClose: () => void;
  target: OfferTarget | null;
  /** Works to tick when the sheet opens. */
  preselect?: string[];
};

export function OfferWorkModal({ open, onClose, target, preselect = [] }: Props) {
  const [works, setWorks] = useState<PlaceArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [postId, setPostId] = useState<string>("");
  const [autoPicked, setAutoPicked] = useState(false);
  // Curators invite artists into one of their projects.
  const [curator, setCurator] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [noteTouched, setNoteTouched] = useState(false);
  const request = target?.mode === "request";
  const { toast, celebrate } = useJourney();

  useEffect(() => {
    if (!open || !target) return;
    setError(""); setSending(false); setNoteTouched(false); setCurator(false); setProjects([]);
    setPostId(target.poolRequestId || "");
    setNote(request
      ? `Hi ${target.name}, we love these works and would like to show them in our space. Would you be up for it?`
      : `Hi ${target.name}, I saw you're looking for art. Here are a few works that could fit your space. Happy to send more photos or bring them by.`);
    setLoading(true);
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: prof } = await sb.from("profiles").select("full_name, role").eq("id", user.id).single();
      setMe({ id: user.id, name: prof?.full_name || "" });
      let chosenProject: Project | null = null;
      if (request && isCuratorRole(prof?.role)) {
        setCurator(true);
        const { data: pj } = await sb.from("projects").select(PROJECT_COLS).eq("owner_id", user.id).eq("status", "active").order("created_at", { ascending: false });
        const list = (pj || []) as Project[];
        setProjects(list);
        chosenProject = list.find(x => x.id === target.projectId) || list[0] || null;
        setProjectId(chosenProject?.id || "");
      }
      const owner = request ? target.recipientId : user.id;
      const { data } = await sb.from("artworks").select("*").eq("user_id", owner).order("created_at", { ascending: false });
      let list = ((data || []) as PlaceArtwork[]).filter(a => !isSold(a));
      // A venue only sees works with a photo, and ones open to a wall first.
      if (request) list = list.filter(a => a.images?.length);
      if (request && !isCuratorRole(prof?.role)) {
        const { data: mine } = await sb.from("pool_requests").select("id,title,details").eq("user_id", user.id)
          .eq("request_type", "walls").eq("status", "open").order("created_at", { ascending: false });
        setPosts((mine || []) as WallPost[]);
        if (!target.poolRequestId && mine?.length) setPostId(mine[0].id);
      }
      // Open to a wall first, then ready ones, then the rest.
      const rank = (a: PlaceArtwork) => (a.wall_terms ? 0 : 2) + (wallReady(a) ? 0 : 1);
      list.sort((a, b) => rank(a) - rank(b));
      setWorks(list);
      const ids = new Set(list.map(a => a.id));
      const chosen = preselect.filter(id => ids.has(id)).slice(0, MAX);
      // Nothing chosen yet: pick the works that are open to a wall and ready,
      // so most offers are one tap.
      const auto = !request && chosen.length === 0
        ? list.filter(a => a.wall_terms && wallReady(a)).slice(0, MAX).map(a => a.id)
        : [];
      setPicked(chosen.length ? chosen : auto);
      setAutoPicked(auto.length > 0);
      const firstPick = list.find(a => a.id === (chosen[0] || auto[0]));
      if (chosenProject) setNote(inviteNote(chosenProject, target.name, firstPick?.title));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.recipientId]);

  function pickProject(id: string) {
    setProjectId(id);
    const p = projects.find(x => x.id === id);
    if (p && !noteTouched && target) setNote(inviteNote(p, target.name, works.find(w => w.id === picked[0])?.title));
  }

  function toggle(id: string) {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= MAX ? p : [...p, id]);
  }

  async function send() {
    if (!target || !me) return;
    const chosen = picked.map(id => works.find(w => w.id === id)).filter(Boolean) as PlaceArtwork[];
    if (!chosen.length) { setError("Pick at least one work."); return; }
    setSending(true); setError("");
    const sb = createClient();
    const origin = window.location.origin;
    const post = posts.find(p => p.id === postId);
    const project = curator ? projects.find(p => p.id === projectId) || null : null;
    const poolRequestId = request ? postId || null : target.poolRequestId || null;
    const title = project?.title || target.contextTitle || post?.title || `${chosen.length === 1 ? "A work" : `${chosen.length} works`} for your walls`;
    const meta = {
      title, label: project ? "Project invitation" : request ? "Requested works" : "Offered works",
      image: chosen[0].images?.[0] || null,
      subtitle: chosen.map(w => w.title).join(", "),
      works: chosen.map(w => ({ id: w.id, title: w.title, image: w.images?.[0] || null, line: workLine(w) })),
    };

    // 1. The deal.
    const { data: deal } = await sb.from("deals").insert({
      artist_id: request ? target.recipientId : me.id,
      venue_id: request ? me.id : target.recipientId,
      started_by: me.id,
      pool_request_id: project ? null : poolRequestId,
      ...(project ? { project_id: project.id } : {}),
      artwork_ids: chosen.map(w => w.id),
      note: note.trim() || null,
      terms: (project ? termsOf(project) : request ? post?.details : target.terms) || null,
    }).select().single();

    // 2. The message, with a link to the deal when there is one.
    const body = `${note.trim()}\n\n${workLines(chosen, origin)}${deal ? `\n\n${request ? "Answer here" : "See the offer"}: ${origin}${dealLink(deal.id)}` : ""}`;
    let convo: string | null = null;
    if (deal) {
      convo = await chatLine(sb, deal, me.id, body, { ...meta, deal_id: deal.id });
    } else {
      const res = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: target.recipientId, context_type: "collab", context_id: target.contextId || null, context_title: title, context_meta: meta, initial_message: body }),
      }).catch(() => null);
      const json = res && res.ok ? await res.json().catch(() => ({})) : null;
      convo = json?.conversation_id ?? null;
    }
    setSending(false);
    if (!deal && convo === null) { setError("That didn't send. Please try again."); return; }
    // Say what happens next, and celebrate the very first one.
    const n = chosen.length;
    const href = deal ? dealLink(deal.id) : convo ? `/dashboard/messages?c=${convo}` : "/dashboard/messages";
    const { count: started } = await sb.from("deals").select("id", { count: "exact", head: true }).eq("started_by", me.id);
    const shown = await celebrate(request ? "first_request" : "first_offer", request ? {
      title: "Your first request is out",
      body: `${target.name} gets an email now. If they say yes, you send a simple agreement, already filled in.`,
      image: chosen[0].images?.[0] || null,
      primary: { label: "See it in Deals", href },
    } : {
      title: "Your first offer is out",
      body: `${target.name} gets an email now with your ${n === 1 ? "work" : `${n} works`}. If they're interested, they send an agreement and you both sign. We'll tell you the moment they answer.`,
      image: chosen[0].images?.[0] || null,
      primary: { label: "See it in Deals", href },
    }, (started ?? 1) <= 1);
    if (shown) { onClose(); return; }
    toast({
      title: project ? `${target.name} is invited to ${project.title}` : `Sent to ${target.name}`,
      body: request ? "They get an email now. We'll tell you when they answer." : "They get an email now. We'll tell you the moment they answer.",
      action: { label: deal ? "See it in Deals" : "Open the chat", href },
    });
    onClose();
  }

  if (!target) return null;
  const name = target.name;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={curator ? `Invite ${name} to your project` : request ? `Ask ${name} for works` : `Offer a work to ${name}`}
      description={target.contextTitle ? <span className="font-ui text-body-sm text-fg-3">For &ldquo;{target.contextTitle}&rdquo;</span> : undefined}
      footer={<>
        <span className="mr-auto font-ui text-body-sm tabular-nums text-fg-3">{picked.length} of {MAX} picked</span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={send} disabled={sending || !picked.length || (curator && !projectId)}>{sending ? "Sending…" : "Send"}</Button>
      </>}>
      <div className="flex flex-col gap-5">
        {error && <Alert tone="bad">{error}</Alert>}
        {autoPicked && !loading && (
          <p className="font-ui text-body-sm text-fg-2">We picked your works that are open to a wall. Tap to change.</p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="aspect-square rounded-card" />)}</div>
        ) : works.length === 0 ? (
          request ? (
            <EmptyState title="No works available right now" description={`${name} hasn't got works available at the moment. Send a message instead.`} />
          ) : (
            <EmptyState
              title="No works to offer yet"
              description="Add a work with a photo, its size and a price, then come back."
              action={<ButtonLink variant="secondary" href="/dashboard/artworks/new">Add a work</ButtonLink>}
            />
          )
        ) : (
          <div className="flex flex-col gap-2">
            <span className="font-ui text-label font-semibold text-fg">Pick up to {MAX}</span>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map(w => {
                const on = picked.includes(w.id);
                const missing = request ? [] : missingForWall(w);
                return (
                  <li key={w.id}>
                    <button type="button" onClick={() => toggle(w.id)} aria-pressed={on}
                      disabled={!on && picked.length >= MAX}
                      className={cn(
                        "relative flex w-full flex-col overflow-hidden rounded-card border-hair bg-surface text-left transition disabled:opacity-50",
                        on ? "border-ink shadow-hard-2" : "border-line hover:border-ink",
                      )}>
                      <span className="relative block aspect-square bg-sunken">
                        {w.images?.[0]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={w.images[0]} alt="" className="absolute inset-0 h-full w-full object-contain p-2" />
                          : <ImageOff size={22} aria-hidden className="absolute inset-0 m-auto text-fg-3" />}
                      </span>
                      <span className="flex flex-col gap-0.5 p-2.5">
                        <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
                        <span className="truncate font-ui text-caption text-fg-3">
                          {missing.length ? `Add ${missing.join(", ")}` : w.wall_terms ? WALL_LABEL[w.wall_terms] : workLine(w)}
                        </span>
                      </span>
                      {on && (
                        <span aria-hidden className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {curator && projects.length === 0 && !loading && (
          <Alert tone="info">Start a project first, then invite artists into it. <Link href="/dashboard/projects/new" className="font-semibold underline underline-offset-2">Start a project</Link></Alert>
        )}
        {curator && projects.length > 0 && (
          <Field label="For which project?" hint="Its dates, place and terms go with the invitation.">
            {p => (
              <Select {...p} value={projectId} onChange={e => pickProject(e.target.value)}>
                {projects.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
              </Select>
            )}
          </Field>
        )}

        {request && !curator && posts.length > 0 && (
          <Field label="For which wall?" hint="Your wall size, timing and commission go with the request.">
            {p => (
              <Select {...p} value={postId} onChange={e => setPostId(e.target.value)}>
                {posts.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
                <option value="">Not for a specific post</option>
              </Select>
            )}
          </Field>
        )}

        <Field label="Your note">
          {p => <Textarea {...p} rows={3} value={note} onChange={e => { setNote(e.target.value); setNoteTouched(true); }} />}
        </Field>

        <div className="flex items-center gap-2 font-ui text-caption text-fg-3">
          <Avatar name={name} src={target.avatar} size="sm" />
          <span>{name} sees your note, the works you pick and a link to each one. <Link href="/dashboard/messages" className="underline underline-offset-2">Messages</Link> keeps the chat.</span>
        </div>
      </div>
    </Modal>
  );
}
