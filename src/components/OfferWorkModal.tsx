"use client";
// "Offer a work": an artist picks one to three of their works and sends
// them to a venue in one message. The message carries the works as cards
// (context_meta.works) and as plain lines with links, so it reads well
// anywhere it shows up.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Button, ButtonLink, EmptyState, Field, Modal, Skeleton, Textarea, cn } from "@/components/ui";
import { type PlaceArtwork, WALL_LABEL, isSold, missingForWall, wallReady, workLine } from "@/lib/places";

const MAX = 3;

export type OfferTarget = {
  recipientId: string;
  name: string;
  avatar?: string | null;
  /** What they posted, if anything: shown with the message. */
  contextId?: string;
  contextTitle?: string;
  contextLabel?: string;
};

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
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) return;
    setError(""); setSent(null); setSending(false);
    setNote(`Hi ${target.name}, I saw you're looking for art. Here are a few works that could fit your space. Happy to send more photos or bring them by.`);
    setLoading(true);
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await sb.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const list = ((data || []) as PlaceArtwork[]).filter(a => !isSold(a));
      // Open to a wall first, then ready ones, then the rest.
      const rank = (a: PlaceArtwork) => (a.wall_terms ? 0 : 2) + (wallReady(a) ? 0 : 1);
      list.sort((a, b) => rank(a) - rank(b));
      setWorks(list);
      const ids = new Set(list.map(a => a.id));
      setPicked(preselect.filter(id => ids.has(id)).slice(0, MAX));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.recipientId]);

  function toggle(id: string) {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= MAX ? p : [...p, id]);
  }

  async function send() {
    if (!target) return;
    const chosen = picked.map(id => works.find(w => w.id === id)).filter(Boolean) as PlaceArtwork[];
    if (!chosen.length) { setError("Pick at least one work."); return; }
    setSending(true); setError("");
    const origin = window.location.origin;
    const lines = chosen.map(w => `• ${w.title}${workLine(w) ? ` (${workLine(w)})` : ""}\n  ${origin}/artwork/${w.id}/passport`);
    const body = `${note.trim()}\n\n${lines.join("\n")}`;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: target.recipientId,
        context_type: "collab",
        context_id: target.contextId || null,
        context_title: target.contextTitle || `${chosen.length === 1 ? "A work" : `${chosen.length} works`} for your walls`,
        context_meta: {
          label: "Offered works",
          image: chosen[0].images?.[0] || null,
          subtitle: chosen.map(w => w.title).join(", "),
          works: chosen.map(w => ({ id: w.id, title: w.title, image: w.images?.[0] || null, line: workLine(w) })),
        },
        initial_message: body,
      }),
    }).catch(() => null);
    setSending(false);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) { setError("That didn't send. Please try again."); return; }
    setSent(json.conversation_id || "");
  }

  if (!target) return null;
  const name = target.name;

  if (sent !== null) {
    return (
      <Modal open={open} onClose={onClose} size="sm" title="Sent"
        footer={<>
          <Button variant="secondary" onClick={onClose}>Done</Button>
          <ButtonLink variant="primary" href={sent ? `/dashboard/messages?c=${sent}` : "/dashboard/messages"}>Open the chat</ButtonLink>
        </>}>
        <p className="font-ui text-body text-fg-2">
          {name} has your {picked.length === 1 ? "work" : `${picked.length} works`}. Their reply will show up in Messages.
        </p>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Offer a work to ${name}`}
      description={target.contextTitle ? <span className="font-ui text-body-sm text-fg-3">For &ldquo;{target.contextTitle}&rdquo;</span> : undefined}
      footer={<>
        <span className="mr-auto font-ui text-body-sm tabular-nums text-fg-3">{picked.length} of {MAX} picked</span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={send} disabled={sending || !picked.length}>{sending ? "Sending…" : "Send"}</Button>
      </>}>
      <div className="flex flex-col gap-5">
        {error && <Alert tone="bad">{error}</Alert>}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="aspect-square rounded-card" />)}</div>
        ) : works.length === 0 ? (
          <EmptyState
            title="No works to offer yet"
            description="Add a work with a photo, its size and a price, then come back."
            action={<ButtonLink variant="secondary" href="/dashboard/artworks/new">Add a work</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <span className="font-ui text-label font-semibold text-fg">Pick up to {MAX}</span>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map(w => {
                const on = picked.includes(w.id);
                const missing = missingForWall(w);
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

        <Field label="Your note">
          {p => <Textarea {...p} rows={3} value={note} onChange={e => setNote(e.target.value)} />}
        </Field>

        <div className="flex items-center gap-2 font-ui text-caption text-fg-3">
          <Avatar name={name} src={target.avatar} size="sm" />
          <span>{name} sees your note, the works you pick and a link to each one. <Link href="/dashboard/messages" className="underline underline-offset-2">Messages</Link> keeps the chat.</span>
        </div>
      </div>
    </Modal>
  );
}
