"use client";
// What a visitor can do on a piece page: ask, ask to buy, follow, open the
// passport. Asking needs only a name and an email. Following needs an
// Artomango account: people without one get a sign-in link by email, and
// the follow happens when they tap it.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Mail, MessageSquare, Plus, ShoppingBag } from "lucide-react";
import { Alert, Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { recordEvent } from "@/lib/labels";

const NEXT_KEY = "artomango.next";

// The database client loads after the page (its own file), so the piece page a
// QR scan opens has less JavaScript to download before it can be used.
const getSb = () => import("@/lib/supabase/client").then(m => m.createClient());

function useMe() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  // The local session is enough to pick the buttons; it needs no request.
  useEffect(() => { getSb().then(sb => sb.auth.getSession()).then(({ data }) => setMe(data.session?.user.id || null)); }, []);
  return me;
}

// ── Follow ──────────────────────────────────────────────────────────
export function FollowButton({ code, artistId, artistFirst }: { code: string; artistId: string; artistFirst: string }) {
  const me = useMe();
  const [following, setFollowing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function follow(uid: string) {
    const sb = await getSb();
    const { error: err } = await sb.from("followers").insert({ follower_id: uid, following_id: artistId });
    if (err && !String(err.code).startsWith("23")) { setError("That didn't work. Please try again."); return false; }
    setFollowing(true);
    if (!err) recordEvent(sb, code, "follow");
    return true;
  }

  useEffect(() => {
    if (!me || me === artistId) return;
    getSb().then(sb => sb.from("followers").select("id").eq("follower_id", me).eq("following_id", artistId).maybeSingle()).then(({ data }) => {
      if (data) { setFollowing(true); return; }
      // Back from the sign-in email: finish the follow they asked for.
      const q = new URLSearchParams(window.location.search);
      if (q.get("do") === "follow") {
        follow(me).then(() => window.history.replaceState(null, "", window.location.pathname));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, artistId]);

  async function sendLink() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Please check the email address."); return; }
    setBusy(true); setError("");
    try { localStorage.setItem(NEXT_KEY, `/l/${code}?do=follow`); } catch { /* the link still signs them in */ }
    const { error: err } = await (await getSb()).auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm`, data: { role: "curator", full_name: name.trim().slice(0, 100) } },
    });
    setBusy(false);
    if (err) { setError(err.message.includes("rate") ? "Too many tries. Please wait a minute and try again." : "We couldn't send the email. Please try again."); return; }
    setSent(true);
  }

  if (me === artistId) return null;
  if (following) return <span className="inline-flex shrink-0 items-center gap-1 font-ui text-label font-semibold text-fg-2"><Check size={14} aria-hidden /> Following</span>;
  return (
    <>
      <Button size="sm" variant="secondary" className="shrink-0" disabled={me === undefined}
        onClick={() => (me ? follow(me) : setAsking(true))}>
        <Plus size={14} aria-hidden /> Follow
      </Button>
      {error && !asking && <span className="sr-only" role="alert">{error}</span>}
      <Modal open={asking} onClose={() => { setAsking(false); setSent(false); setError(""); }}
        title={sent ? "Check your email" : `Follow ${artistFirst}`}
        description={sent
          ? `We sent a link to ${email.trim()}. Tap it on this phone and you'll follow ${artistFirst} straight away.`
          : `Hear about ${artistFirst}'s new work and shows. Just your email: we'll send a link to sign in, no password.`}
        footer={sent ? <Button variant="primary" onClick={() => { setAsking(false); setSent(false); }}>Done</Button> : (
          <>
            <Button variant="ghost" onClick={() => setAsking(false)}>Not now</Button>
            <Button variant="primary" disabled={busy} onClick={sendLink}><Mail size={15} aria-hidden /> {busy ? "Sending…" : "Send the link"}</Button>
          </>
        )}>
        {!sent && (
          <div className="flex flex-col gap-3">
            {error && <Alert tone="bad">{error}</Alert>}
            <Field label="Your email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLink()} />}</Field>
            <Field label="Your name" hint="Optional. Shown to the artists you follow.">{p => <Input {...p} autoComplete="name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLink()} />}</Field>
            <p className="font-ui text-caption text-fg-3">{artistFirst} will see your name when you follow. Nothing else. Already on Artomango? This signs you in.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── Ask / buy ───────────────────────────────────────────────────────
export function SellingActions({ code, artistId, artistFirst, workId, title, place, withPrice }: {
  code: string; artistId: string; artistFirst: string; workId: string; title: string; place: string; withPrice: boolean;
}) {
  const me = useMe();
  const [open, setOpen] = useState<null | "buy" | "ask">(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function start(kind: "buy" | "ask") {
    const at = place ? ` at ${place}` : "";
    setBody(kind === "buy"
      ? `Hi ${artistFirst}, I saw “${title}”${at} and I'd like to buy it. How do we go about it?`
      : `Hi ${artistFirst}, I saw “${title}”${at}. `);
    setSent(false); setError(""); setOpen(kind);
  }

  async function send() {
    if (!body.trim()) { setError("Please write a message."); return; }
    if (!me && (!name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))) { setError("Please add your name and a working email, so the artist can write back."); return; }
    setBusy(true); setError("");
    const res = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: artistId, context_type: "artwork_inquiry", context_id: workId, context_title: title,
        context_meta: { label: code, place: place || null, buy: open === "buy", work_id: workId },
        initial_message: body.trim(),
        guest_name: me ? undefined : name.trim(), guest_email: me ? undefined : email.trim(),
      }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok || (json as { error?: string }).error) {
      setError((json as { error?: string }).error?.includes("Too many") ? "Too many messages right now. Please try again in an hour." : "Your message didn't send. Please try again.");
      return;
    }
    getSb().then(sb => recordEvent(sb, code, open === "buy" ? "buy" : "ask"));
    setSent(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {withPrice && <Button variant="primary" onClick={() => start("buy")}><ShoppingBag size={15} aria-hidden /> I&rsquo;d like to buy it</Button>}
        <Button variant={withPrice ? "secondary" : "primary"} onClick={() => start("ask")}><MessageSquare size={15} aria-hidden /> {withPrice ? "Ask a question" : "Ask about this piece"}</Button>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} size="md"
        title={sent ? "Sent" : open === "buy" ? `Tell ${artistFirst} you'd like it` : `Ask ${artistFirst}`}
        description={sent
          ? (me ? `${artistFirst} gets it now. The answer comes to your Messages on Artomango.` : `${artistFirst} gets it now and will write back to ${email.trim()}.`)
          : "No payment now. You and the artist agree on the details together."}
        footer={sent ? <Button variant="primary" onClick={() => setOpen(null)}>Done</Button> : (
          <>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send"}</Button>
          </>
        )}>
        {!sent && (
          <div className="flex flex-col gap-3">
            {error && <Alert tone="bad">{error}</Alert>}
            <Field label="Message">{p => <Textarea {...p} rows={4} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} />}</Field>
            {me === null && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your name">{p => <Input {...p} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />}</Field>
                <Field label="Your email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />}</Field>
              </div>
            )}
            <p className="font-ui text-caption text-fg-3">{artistFirst} will see your name, email and message. Nothing else.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

// ── Passport ────────────────────────────────────────────────────────
export function PassportLink({ code, href, count }: { code: string; href: string; count: number }) {
  return (
    <Link href={href} onClick={() => { getSb().then(sb => recordEvent(sb, code, "passport")); }}
      className="inline-flex items-center gap-1 self-start font-ui text-label font-semibold text-fg underline-offset-4 hover:underline">
      {count > 3 ? `See the full passport (${count} entries)` : "See the full passport"} <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
