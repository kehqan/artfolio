"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCard, { authInput, authButton, authError, authLink } from "@/components/AuthCard";

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

  if (sent) return (
    <AuthCard title="Check your email" subtitle={`If an account exists for ${email}, we've sent a link to choose a new password.`}>
      <Link href="/login" style={authLink}>← Back to sign in</Link>
    </AuthCard>
  );

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <form onSubmit={submit}>
        <input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={authInput} />
        {error && <div style={authError}>{error}</div>}
        <button type="submit" disabled={sending} style={authButton}>{sending ? "Sending…" : "Send reset link"}</button>
      </form>
      <Link href="/login" style={authLink}>← Back to sign in</Link>
    </AuthCard>
  );
}
