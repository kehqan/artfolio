"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { Captcha, captchaOptions, captchaWaiting } from "@/components/auth/Captcha";
import { normEmail } from "@/lib/email-address";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: normEmail(email), password, options: captchaOptions(captcha) });
    setTries(t => t + 1); // a bot-check token works once
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don’t match an account. Check both, or reset your password."
          : /not confirmed/i.test(error.message)
            ? "Please confirm your email first. Open the link we sent you, or create the account again to get a new link."
            : /rate limit|too many/i.test(error.message)
              ? "Too many tries for now. Wait a few minutes, then try again."
              : /fetch|network/i.test(error.message)
                ? "No connection. Check your signal and try again."
                : error.message,
      );
      setLoading(false);
      return;
    }
    router.push(nextPath());
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your studio."
      footer={<>New to Artomango? <AuthLink href="/register">Create a free account</AuthLink></>}
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Email">
          {(p) => (
            <Input {...p} type="email" required autoFocus autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-password" className="font-ui text-label font-semibold text-fg">Password</label>
            <Link href="/forgot-password" className="font-ui text-caption font-semibold text-fg-3 hover:text-fg">Forgot password?</Link>
          </div>
          <PasswordInput id="login-password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Captcha onToken={setCaptcha} resetKey={tries} />
        <Button type="submit" variant="primary" disabled={loading || captchaWaiting(captcha)} className="mt-2 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
