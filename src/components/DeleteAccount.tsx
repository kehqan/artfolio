"use client";
// Delete my account, from Profile.
//
// Files go first (only Supabase Storage can remove them), then the account
// itself (database/migrations/20261127_edge_cases.sql, delete_my_account).
// Everything else follows from the account: works, posts, chats, deals,
// sales, planner. Agreements signed by both sides stay with the other person.
// If the connection drops halfway, doing it again picks up where it stopped.
import { useState } from "react";
import { Alert, Button, Field, Input, Modal } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const WORD = "DELETE";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || typed.trim().toUpperCase() !== WORD) return;
    setBusy(true); setError("");
    const sb = createClient();
    try {
      const { data: files, error: listErr } = await sb.rpc("my_storage_files");
      if (listErr && listErr.code === "PGRST202") throw new Error("not_ready");
      const byBucket = new Map<string, string[]>();
      for (const f of (files || []) as { bucket: string; path: string }[]) {
        byBucket.set(f.bucket, [...(byBucket.get(f.bucket) || []), f.path]);
      }
      for (const [bucket, paths] of Array.from(byBucket.entries())) {
        for (let i = 0; i < paths.length; i += 100) {
          await sb.storage.from(bucket).remove(paths.slice(i, i + 100));
        }
      }
      const { error: delErr } = await sb.rpc("delete_my_account");
      if (delErr) throw delErr;
      await sb.auth.signOut().catch(() => null);
      window.location.href = "/?account=deleted";
    } catch (e) {
      const msg = (e as { message?: string; code?: string })?.message || "";
      setBusy(false);
      setError(msg === "not_ready" || (e as { code?: string })?.code === "PGRST202"
        ? "Deleting accounts isn't switched on yet. Write to us from the report page and we'll do it within a few days."
        : /admin/i.test(msg) ? msg
        : /fetch|network/i.test(msg) ? "No connection. Check your signal and try again. Nothing is lost by trying again."
        : "That didn't work. Please try again in a minute.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setTyped(""); setError(""); }}
        className="self-start font-ui text-body-sm font-semibold text-bad underline decoration-transparent underline-offset-4 hover:decoration-current">
        Delete my account
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Delete your account?"
        description="This can't be undone."
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Keep my account</Button>
          <Button variant="danger" onClick={remove} disabled={busy || typed.trim().toUpperCase() !== WORD}>
            {busy ? "Deleting…" : "Delete for good"}
          </Button>
        </>}>
        <div className="flex flex-col gap-4">
          <p className="font-ui text-body-sm text-fg-2">
            Your works, photos, public page, posts, messages, deals, sales and planner are removed.
            Agreements that both sides signed stay with the other person, as their record of the deal.
          </p>
          {error && <Alert tone="bad">{error}</Alert>}
          <Field label={`Type ${WORD} to confirm`}>
            {(p) => <Input {...p} value={typed} onChange={e => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />}
          </Field>
        </div>
      </Modal>
    </>
  );
}
