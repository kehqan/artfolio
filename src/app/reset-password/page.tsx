"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard, { authInput, authButton, authError, authLink } from "@/components/AuthCard";

// The email link lands here with ?code=…; exchanging it signs the user in so
// they can set a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = createClient();
    const code = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) { setLinkError("This reset link is invalid or has expired. Please request a new one."); return; }
      }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setLinkError("This reset link is invalid or has expired. Please request a new one."); return; }
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  }

  if (linkError) return (
    <AuthCard title="Link expired" subtitle={linkError}>
      <Link href="/forgot-password" style={{ ...authButton, display: "block", textAlign: "center", textDecoration: "none" }}>Send a new link</Link>
    </AuthCard>
  );

  if (!ready) return <AuthCard title="Checking your link…"><span /></AuthCard>;

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit}>
        <input type="password" required autoFocus autoComplete="new-password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} style={authInput} />
        <input type="password" required autoComplete="new-password" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} style={authInput} />
        {error && <div style={authError}>{error}</div>}
        <button type="submit" disabled={saving} style={authButton}>{saving ? "Saving…" : "Save new password"}</button>
      </form>
      <Link href="/login" style={authLink}>← Back to sign in</Link>
    </AuthCard>
  );
}
