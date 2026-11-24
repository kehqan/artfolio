"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Field, PasswordInput } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";

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
        if (error) { setLinkError("This reset link is invalid or has expired. Request a new one below."); return; }
      }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setLinkError("This reset link is invalid or has expired. Request a new one below."); return; }
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don’t match."); return; }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  }

  const back = <AuthLink href="/login">Back to sign in</AuthLink>;

  if (linkError) return (
    <AuthShell title="This link has expired" footer={back}>
      <div className="flex flex-col gap-4">
        <Alert tone="warn">{linkError}</Alert>
        <ButtonLink href="/forgot-password" variant="primary" className="w-full">Send a new link</ButtonLink>
      </div>
    </AuthShell>
  );

  if (!ready) return <AuthShell title="Checking your link…"><p className="font-ui text-body text-fg-3">One moment.</p></AuthShell>;

  return (
    <AuthShell title="Choose a new password" description="Use at least 8 characters." footer={back}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="New password">
          {(p) => <PasswordInput {...p} required autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Repeat new password">
          {(p) => <PasswordInput {...p} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        <Button type="submit" variant="primary" disabled={saving} className="mt-2 w-full">
          {saving ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
