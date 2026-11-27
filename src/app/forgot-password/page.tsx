"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { Captcha, captchaOptions, captchaWaiting } from "@/components/auth/Captcha";
import { normEmail } from "@/lib/email-address";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true); setError("");
    const { error } = await createClient().auth.resetPasswordForEmail(normEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`, ...captchaOptions(captcha),
    });
    setTries(t => t + 1);
    setSending(false);
    // Too many tries is the only error worth showing: saying "no such account"
    // would tell anyone which emails are signed up.
    if (error && /rate limit|too many|seconds/i.test(error.message)) { setError("A link was sent a moment ago. Wait a minute before asking for another."); return; }
    if (error && /fetch|network/i.test(error.message)) { setError("No connection. Check your signal and try again."); return; }
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  const back = <AuthLink href="/login">Back to sign in</AuthLink>;

  if (sent) return (
    <AuthShell title="Check your email" footer={back}>
      <Alert tone="ok">
        If an account exists for <strong className="font-semibold">{email}</strong>, a link to choose a new password is on its way. It can take a minute to arrive.
      </Alert>
    </AuthShell>
  );

  return (
    <AuthShell title="Reset your password" description="Enter the email you signed up with and we’ll send you a link to choose a new password." footer={back}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Email">
          {(p) => (
            <Input {...p} type="email" required autoFocus autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <Captcha onToken={setCaptcha} resetKey={tries} />
        <Button type="submit" variant="primary" disabled={sending || captchaWaiting(captcha)} className="mt-2 w-full">
          {sending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
