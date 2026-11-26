"use client";
// Report a page or work: someone copied your art, something breaks the law,
// or it shares private details. The EU Digital Services Act asks for an easy
// way to tell us, a receipt, and a reasoned answer. Reports land in
// content_reports and are emailed to us (database/migrations/20261126_legal.sql).
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Chip, Field, Input, Textarea } from "@/components/ui";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { OPERATOR } from "@/lib/legal";

type Reason = "copyright" | "illegal" | "personal" | "other";
const REASONS: { key: Reason; label: string; hint: string }[] = [
  { key: "copyright", label: "It copies my work", hint: "Say which work is yours and where we can see the original (your site, Instagram, a show)." },
  { key: "illegal", label: "It breaks the law", hint: "Say what is illegal about it and, if you can, which law." },
  { key: "personal", label: "It shares private details", hint: "Say whose details and what they are. Don't repeat them in full here." },
  { key: "other", label: "Something else", hint: "Tell us what's wrong." },
];

export default function ReportPage() {
  const [reason, setReason] = useState<Reason | null>(null);
  const [url, setUrl] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mine, setMine] = useState(false);
  const [true_, setTrue] = useState(false);
  const [state, setState] = useState<"edit" | "busy" | "done">("edit");
  const [err, setErr] = useState("");

  useEffect(() => {
    // "Report" links on public pages pass the page they came from.
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) setUrl(u);
    else if (document.referrer.startsWith(window.location.origin) && !document.referrer.includes("/report")) setUrl(document.referrer);
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(e => e || user.email!);
      const n = user?.user_metadata?.full_name;
      if (typeof n === "string") setName(v => v || n);
    });
  }, []);

  const hint = REASONS.find(r => r.key === reason)?.hint;
  const ready = reason && url.trim() && details.trim().length >= 10 && name.trim() && email.trim() && true_ && (reason !== "copyright" || mine);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setState("busy"); setErr("");
    const { error } = await createClient().rpc("report_content", {
      p_url: url.trim(), p_reason: reason, p_details: details.trim(), p_name: name.trim(), p_email: email.trim(),
      p_rights_holder: mine, p_good_faith: true_,
    });
    if (error) { setErr(error.message || "That didn't send. Please try again."); setState("edit"); return; }
    setState("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <LegalPage
      eyebrow="Report a problem"
      title={state === "done" ? "Thanks, we've got it" : "Something wrong on Artomango?"}
      intro={state === "done"
        ? <>We sent a receipt to <strong className="text-fg">{email}</strong>. A person will look at it and write back, usually within 3 working days.</>
        : "If a page or work copies your art, breaks the law or shares someone's private details, tell us here. A person reads every report."}
    >
      {state === "done" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => { setState("edit"); setDetails(""); setUrl(""); setReason(null); setMine(false); setTrue(false); }}>Report something else</Button>
          <Link href="/" className="inline-flex h-10 items-center px-2 font-ui text-label font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ink">Back to Artomango</Link>
        </div>
      ) : (
        <Card padding="lg" className="flex flex-col gap-6">
          <form onSubmit={send} className="flex flex-col gap-6">
            {err && <Alert tone="bad">{err}</Alert>}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-ui text-label font-semibold text-fg">What&rsquo;s wrong?</legend>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => <Chip key={r.key} selected={reason === r.key} onClick={() => setReason(r.key)}>{r.label}</Chip>)}
              </div>
            </fieldset>

            <Field label="Link to the page or work" hint="Copy it from your browser's address bar.">
              {(p) => <Input {...p} type="url" required placeholder="https://artomango.com/…" value={url} onChange={e => setUrl(e.target.value)} />}
            </Field>

            <Field label="What should we know?" hint={hint ?? "Be as specific as you can. It helps us act faster."}>
              {(p) => <Textarea {...p} required rows={5} minLength={10} maxLength={4000} value={details} onChange={e => setDetails(e.target.value)} />}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                {(p) => <Input {...p} required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />}
              </Field>
              <Field label="Your email" hint="We'll answer here.">
                {(p) => <Input {...p} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />}
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              {reason === "copyright" && (
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-ink" />
                  <span className="font-ui text-body-sm text-fg-2">It&rsquo;s my work, or I act for the person who made it.</span>
                </label>
              )}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={true_} onChange={e => setTrue(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-ink" />
                <span className="font-ui text-body-sm text-fg-2">What I wrote is true and complete as far as I know.</span>
              </label>
            </div>

            <Button type="submit" variant="primary" disabled={!ready || state === "busy"} className="w-full sm:w-auto sm:self-start">
              {state === "busy" ? "Sending…" : "Send report"}
            </Button>
          </form>
        </Card>
      )}

      <Section id="next" title="What happens next">
        <ul>
          <li>You get an email receipt right away.</li>
          <li>A person looks at it, usually within 3 working days, faster for anything urgent.</li>
          <li>If it breaks our <Link href="/terms">terms</Link> or the law, we hide or remove it and tell the person who posted it why. They can answer or appeal, and so can you.</li>
          <li>We write back to you with what we decided and why.</li>
        </ul>
        <p>
          Rather write? <a href={`mailto:${OPERATOR.email}?subject=Report`}>{OPERATOR.email}</a>. Authorities can reach us at the
          same address.
        </p>
      </Section>
    </LegalPage>
  );
}
