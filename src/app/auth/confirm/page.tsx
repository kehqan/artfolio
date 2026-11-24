"use client";
// The "confirm your email" link lands here with ?code=…. Exchanging it
// signs the person in; then we save what they told us at sign-up and
// take them to Home.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyPendingProfile } from "@/lib/pending-profile";
import { ButtonLink } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ConfirmPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sb = createClient();
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code");
    (async () => {
      if (code) await sb.auth.exchangeCodeForSession(code).catch(() => null);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setFailed(true); return; }
      await applyPendingProfile(sb, user);
      router.replace("/dashboard");
    })();
  }, [router]);

  if (failed) {
    return (
      <AuthShell title="This link didn't work" description="It may have expired, or it was already used. Sign in and you're all set, or ask for a new link from the sign-in page.">
        <ButtonLink href="/login" variant="primary" className="w-full">Sign in</ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirming your email…" description="One moment, we're signing you in.">
      <div className="h-2 overflow-hidden rounded-pill bg-sunken"><div className="h-full w-1/2 animate-pulse bg-mango" /></div>
    </AuthShell>
  );
}
