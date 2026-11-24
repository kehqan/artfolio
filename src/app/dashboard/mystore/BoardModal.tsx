"use client";
// Add or edit a moodboard link (Pinterest, Milanote, Figma, Miro, Notion
// or any other board). Paste the link and the title and cover fill in.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input, Modal, Switch, Textarea } from "@/components/ui";

export type Board = {
  id: string; provider: string; url: string; title: string; description?: string | null;
  thumbnail_url?: string | null; og_image?: string | null; is_public: boolean;
};

export const PROVIDER_LABEL: Record<string, string> = {
  milanote: "Milanote", pinterest: "Pinterest", figma: "Figma", miro: "Miro", notion: "Notion", other: "Board",
};

const DOMAINS: [string, string[]][] = [
  ["milanote", ["milanote.com"]], ["pinterest", ["pinterest.", "pin.it"]], ["figma", ["figma.com"]],
  ["miro", ["miro.com"]], ["notion", ["notion.so", "notion.com", "notion.site"]],
];

function clean(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  try { return new URL(v.startsWith("http") ? v : `https://${v}`).toString(); } catch { return null; }
}

function detect(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return DOMAINS.find(([, ds]) => ds.some(d => host.includes(d)))?.[0] || "other";
  } catch { return "other"; }
}

type Props = { open: boolean; board: Board | null; userId: string; onClose: () => void; onSaved: (b: Board) => void };

export function BoardModal({ open, board, userId, onClose, onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumb, setThumb] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setUrl(board?.url || ""); setTitle(board?.title || ""); setDescription(board?.description || "");
    setThumb(board?.thumbnail_url || board?.og_image || ""); setIsPublic(board?.is_public ?? true); setError("");
  }, [open, board]);

  async function fillFromLink() {
    const link = clean(url);
    if (!link || (title && thumb)) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(link)}`);
      if (res.ok) {
        const d = await res.json();
        if (d.title && !title) setTitle(d.title);
        if (d.image && !thumb) setThumb(d.image);
        if (d.description && !description) setDescription(d.description);
      }
    } catch { /* the link still saves without a preview */ }
    setFetching(false);
  }

  async function save() {
    const link = clean(url);
    if (!link) { setError("That doesn't look like a link. Paste the board's full address."); return; }
    setSaving(true); setError("");
    const provider = detect(link);
    const row = {
      provider, url: link, title: title.trim() || `${PROVIDER_LABEL[provider]} board`,
      description: description.trim() || null, thumbnail_url: thumb || null, is_public: isPublic,
    };
    const sb = createClient();
    const q = board
      ? sb.from("moodboards").update(row).eq("id", board.id).eq("user_id", userId)
      : sb.from("moodboards").insert({ ...row, user_id: userId, tags: [] });
    const { data, error: err } = await q.select("id, provider, url, title, description, thumbnail_url, og_image, is_public").single();
    setSaving(false);
    if (err || !data) { setError("That didn't save. Please try again."); return; }
    onSaved(data as Board);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={board ? "Edit board" : "Add a board"}
      description={board ? undefined : "Link a board from Pinterest, Milanote, Figma, Miro, Notion or anywhere else."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || fetching}>{saving ? "Saving…" : board ? "Save" : "Add board"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Link" hint={fetching ? "Looking up the board…" : undefined}>
          {p => <Input {...p} type="url" value={url} placeholder="https://pinterest.com/…" onChange={e => setUrl(e.target.value)} onBlur={fillFromLink} />}
        </Field>
        <div className="flex gap-3">
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-control border-hair border-line bg-sunken">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <Field label="Title" className="flex-1">
            {p => <Input {...p} value={title} maxLength={100} onChange={e => setTitle(e.target.value)} />}
          </Field>
        </div>
        <Field label="Note" hint="Optional. What's on this board?">
          {p => <Textarea {...p} rows={3} value={description} onChange={e => setDescription(e.target.value)} />}
        </Field>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-ui text-body-sm font-semibold text-fg">Show on your public page</span>
            <span className="font-ui text-caption text-fg-3">Hidden boards stay here for you.</span>
          </div>
          <Switch checked={isPublic} onChange={setIsPublic} label="Show on your public page" />
        </div>
      </div>
    </Modal>
  );
}
