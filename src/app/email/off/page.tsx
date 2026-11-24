"use client";
// The "Turn off these emails" link in every email lands here. It asks before
// turning anything off, because some mail apps open links on their own.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";

export default function EmailOffPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"ask" | "busy" | "done" | "bad">("ask");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    setToken(t);
    if (!t) setState("bad");
  }, []);

  async function turnOff() {
    if (!token) return;
    setState("busy");
    const { data, error } = await createClient().rpc("email_turn_off", { p_token: token });
    setState(!error && data ? "done" : "bad");
  }

  const footer = <AuthLink href="/dashboard/profile">Email settings in your profile</AuthLink>;

  if (state === "done") return (
    <AuthShell title="Emails are off" footer={footer}>
      <Alert tone="ok">You won&rsquo;t get emails from Artomango anymore. Offers, agreements and messages still show up in the app.</Alert>
    </AuthShell>
  );

  if (state === "bad") return (
    <AuthShell title="That link didn't work" footer={footer}>
      <Alert tone="bad">It may be old or incomplete. Sign in and switch emails off in your profile instead.</Alert>
    </AuthShell>
  );

  return (
    <AuthShell title="Turn off emails?" description="You won't get emails about offers, agreements or messages. Everything still shows up in the app." footer={footer}>
      <Button variant="primary" onClick={turnOff} disabled={state === "busy"} className="w-full">
        {state === "busy" ? "Turning off…" : "Turn off emails"}
      </Button>
    </AuthShell>
  );
}
