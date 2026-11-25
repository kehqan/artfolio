"use client";
// Who can see a project, and inviting people who aren't on Artomango yet.
//
//   Open to artists  shows the project in Scene; artists offer their works
//   Public page      a page with the project and its signed works to share
//   Invite by email  a personal link, sent from the curator's own email app;
//                    it opens the project and lets them offer works once
//                    they've joined (database: project_invites)
import { useState } from "react";
import { Check, Copy, ExternalLink, Mail, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, ButtonLink, Card, Eyebrow, Field, Input, Modal, Switch } from "@/components/ui";
import { type ProjectInvite, type ProjectView, inviteEmail, publicProjectHref } from "@/lib/projects";

const full = (path: string) => (typeof window !== "undefined" ? window.location.origin : "") + path;

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function Share({ p, curator, invites, onChange, onInvited }: {
  p: ProjectView; curator: string; invites: ProjectInvite[];
  onChange: (patch: { is_open?: boolean; is_public?: boolean }) => void;
  onInvited: () => void;
}) {
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pageLink = full(publicProjectHref(p.id));

  async function flip(key: "is_open" | "is_public", v: boolean) {
    setError("");
    onChange({ [key]: v });
    const { error: e } = await createClient().from("projects").update({ [key]: v }).eq("id", p.id);
    if (e) { onChange({ [key]: !v }); setError("That didn't save. Please try again."); }
  }

  async function copyLink(id: string, text: string) {
    if (await copy(text)) { setCopied(id); setTimeout(() => setCopied(c => (c === id ? null : c)), 1800); }
  }

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex flex-col gap-0.5 px-5 pb-3 pt-5">
        <Eyebrow>Sharing</Eyebrow>
        <h2 className="font-display text-h3 leading-tight text-fg">Who can see it</h2>
      </div>
      {error && <div className="px-5 pb-3"><Alert tone="bad">{error}</Alert></div>}
      <ul className="divide-y divide-line border-t-hair border-line">
        <li className="flex items-start gap-4 px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-ui text-body-sm font-semibold text-fg">Open to artists</span>
            <span className="font-ui text-caption text-fg-3">It shows in Scene. Artists offer their works, you say yes or no thanks.</span>
          </div>
          <Switch checked={p.is_open} onChange={v => flip("is_open", v)} label="Open to artists" disabled={p.status === "done"} />
        </li>
        <li className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-ui text-body-sm font-semibold text-fg">Public page</span>
              <span className="font-ui text-caption text-fg-3">The project and its signed works, to send to press or put on your site.</span>
            </div>
            <Switch checked={!!p.is_public} onChange={v => flip("is_public", v)} label="Public page" />
          </div>
          {p.is_public && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => copyLink("page", pageLink)}>
                {copied === "page" ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy link</>}
              </Button>
              <ButtonLink size="sm" variant="ghost" href={publicProjectHref(p.id)} target="_blank"><ExternalLink size={14} aria-hidden /> Open</ButtonLink>
            </div>
          )}
        </li>
        <li className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-ui text-body-sm font-semibold text-fg">Artists not on Artomango yet</span>
              <span className="font-ui text-caption text-fg-3">Send them a personal link. It opens the project, and they can offer works once they&rsquo;ve joined.</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="self-start" onClick={() => setInviting(true)} disabled={p.status === "done"}>
            <Mail size={14} aria-hidden /> Invite by email
          </Button>
          {invites.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {invites.map(i => (
                <li key={i.id} className="flex items-center gap-2 font-ui text-caption">
                  <span className="min-w-0 flex-1 truncate text-fg-2">{i.name || i.email || "Invitation link"}{i.name && i.email ? <span className="text-fg-3"> · {i.email}</span> : null}</span>
                  {i.accepted_by ? <Badge tone="ok">Joined</Badge> : <Badge>Not yet</Badge>}
                  <button type="button" onClick={() => copyLink(i.id, full(publicProjectHref(p.id, i.token)))}
                    className="font-semibold text-fg-2 underline-offset-2 hover:text-fg hover:underline">{copied === i.id ? "Copied" : "Copy link"}</button>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
      {inviting && <InviteSheet p={p} curator={curator} onClose={() => setInviting(false)} onDone={onInvited} />}
    </Card>
  );
}

function InviteSheet({ p, curator, onClose, onDone }: { p: ProjectView; curator: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<ProjectInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true); setError("");
    const { data, error: e } = await createClient().from("project_invites")
      .insert({ project_id: p.id, name: name.trim() || null, email: email.trim() || null }).select("*").single();
    setBusy(false);
    if (e || !data) { setError("That didn't work. Please try again."); return; }
    setMade(data as ProjectInvite);
    onDone();
  }

  if (made) {
    const link = full(publicProjectHref(p.id, made.token));
    const mail = inviteEmail(p, made.name || "", curator, link, made.email);
    return (
      <Modal open onClose={onClose} size="md" title="Your invitation is ready"
        footer={<>
          <Button variant="ghost" className="mr-auto" onClick={async () => { if (await copy(link)) setCopied(true); }}>
            {copied ? <><Check size={15} aria-hidden /> Copied</> : <><Copy size={15} aria-hidden /> Copy link</>}
          </Button>
          <Button variant="secondary" onClick={onClose}>Done</Button>
          <a href={mail.mailto} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control border-outline border-ink bg-mango px-5 font-ui text-control font-semibold text-on-mango shadow-hard-1 transition hover:-translate-x-px hover:-translate-y-px hover:bg-mango-hover hover:shadow-hard-2">
            <Mail size={15} aria-hidden /> Open in your email
          </a>
        </>}>
        <div className="flex flex-col gap-4">
          <p className="font-ui text-body-sm text-fg-2">
            It goes from your own email, so it reads as personal. We&rsquo;ve written it for you. You can also send the link any other way.
          </p>
          <div className="flex flex-col gap-2 rounded-card border-hair border-line bg-sunken p-4">
            <span className="font-ui text-caption font-semibold text-fg-3">{mail.subject}</span>
            <p className="whitespace-pre-line font-ui text-body-sm text-fg">{mail.body}</p>
          </div>
          <p className="font-ui text-caption text-fg-3">When they join and offer works, you&rsquo;ll see it here and in Deals.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm" title={`Invite someone to ${p.title}`}
      description={<span className="font-ui text-body-sm text-fg-3">For artists who aren&rsquo;t on Artomango yet.</span>}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={create} disabled={busy}>{busy ? "One moment…" : <><Plus size={15} aria-hidden /> Make the invitation</>}</Button>
      </>}>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); create(); }}>
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Their name">{f => <Input {...f} autoFocus value={name} maxLength={160} onChange={e => setName(e.target.value)} placeholder="Lena Horak" />}</Field>
        <Field label="Their email" hint="Optional. We fill it in for you in your email app.">{f => <Input {...f} type="email" value={email} maxLength={320} onChange={e => setEmail(e.target.value)} placeholder="lena@example.com" />}</Field>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
