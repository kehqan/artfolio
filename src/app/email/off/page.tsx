"use client";
// The "Turn off these emails" link in every email lands here. It asks before
// turning anything off, because some mail apps open links on their own.
// Two choices: only the news (places looking for art), or every email.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";

export default function EmailOffPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"ask" | "busy" | "news" | "all" | "bad">("ask");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    setToken(t);
    if (!t) setState("bad");
  }, []);

  async function turnOff(what: "news" | "all") {
    if (!token) return;
    setState("busy");
    const { data, error } = await createClient().rpc(what === "news" ? "email_news_off" : "email_turn_off", { p_token: token });
    setState(!error && data ? what : "bad");
  }

  const footer = <AuthLink href="/dashboard/profile">Email settings in your profile</AuthLink>;

  if (state === "news") return (
    <AuthShell title="No more news emails" footer={footer}>
      <Alert tone="ok">You won&rsquo;t hear about places near you looking for art. Offers, agreements and messages still come by email.</Alert>
    </AuthShell>
  );

  if (state === "all") return (
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
    <AuthShell title="Fewer emails?" description="Pick what to stop. Everything still shows up in the app." footer={footer}>
      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={() => turnOff("news")} disabled={state === "busy"} className="w-full">
          Only stop news about places looking for art
        </Button>
        <Button variant="primary" onClick={() => turnOff("all")} disabled={state === "busy"} className="w-full">
          {state === "busy" ? "Turning off…" : "Stop all emails"}
        </Button>
      </div>
    </AuthShell>
  );
}
