"use client";
// Block or unblock a person. Blocked people can't message you, start a deal
// with you or follow you, and follows between you end. They aren't told.
// The rules live in the database (database/migrations/20261126_security_hardening.sql).
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Modal } from "@/components/ui";

export async function setBlocked(otherId: string, block: boolean): Promise<string | null> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return "Sign in first.";
  const { error } = block
    ? await sb.from("user_blocks").insert({ blocker_id: user.id, blocked_id: otherId })
    : await sb.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherId);
  // Already blocked counts as done.
  if (error && error.code !== "23505") return error.hint === "rate_limited" ? error.message : "That didn't work. Please try again.";
  return null;
}

/** The report form, filled in for a person: spam, a scam or harassment. */
export const reportPersonHref = (profileUrl?: string | null) =>
  `/report?reason=abuse${profileUrl ? `&url=${encodeURIComponent(profileUrl)}` : ""}`;

export function BlockDialog({ open, onClose, otherId, name, blocked, onDone, profileUrl }: {
  open: boolean;
  onClose: () => void;
  otherId: string;
  name: string;
  /** True when you already blocked them: the dialog offers to unblock. */
  blocked: boolean;
  onDone: (blocked: boolean) => void;
  /** Their public page, so a report from here already says who it's about. */
  profileUrl?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const first = name.split(" ")[0] || "them";

  async function go() {
    setBusy(true); setErr("");
    const e = await setBlocked(otherId, !blocked);
    setBusy(false);
    if (e) { setErr(e); return; }
    onDone(!blocked);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}
      title={blocked ? `Unblock ${first}?` : `Block ${first}?`}
      description={blocked
        ? `${first} will be able to message you and follow you again.`
        : `${first} won't be able to message you, offer you a deal or follow you. We won't tell them. You can unblock any time.`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={blocked ? "primary" : "danger"} onClick={go} disabled={busy}>
          {busy ? "One moment…" : blocked ? "Unblock" : "Block"}
        </Button>
      </>}>
      {err && <Alert tone="bad">{err}</Alert>}
      {!blocked && (
        <p className="font-ui text-body-sm text-fg-2">
          If they did something that breaks our rules, like spam, a scam or harassment, please also <a className="font-semibold text-fg underline underline-offset-4" href={reportPersonHref(profileUrl)}>report it</a>. A person reads every report.
        </p>
      )}
    </Modal>
  );
}
