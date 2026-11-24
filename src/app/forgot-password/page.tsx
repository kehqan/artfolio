"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError("");
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
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
            <Input {...p} type="email" required autoFocus autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <Button type="submit" variant="primary" disabled={sending} className="mt-2 w-full">
          {sending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
