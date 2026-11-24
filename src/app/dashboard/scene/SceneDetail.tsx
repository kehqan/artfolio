"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Modal } from "@/components/ui";
import { Mat } from "@/components/public/PublicChrome";
import { type FeedItem, fullDate, wallDetails } from "./feed";
import { KIND_TONE } from "./SceneCard";

type Props = {
  item: FeedItem | null;
  mine: boolean;
  onClose: () => void;
  onMessage: (item: FeedItem) => void;
  /** Replaces "Message …" on the main button, for example "Offer a work". */
  actionLabel?: string;
  onEdit: (item: FeedItem) => void;
  onDelete: (item: FeedItem) => Promise<void>;
};

export function SceneDetail({ item, mine, onClose, onMessage, actionLabel, onEdit, onDelete }: Props) {
  const [idx, setIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!item) return null;
  const imgs = item.images;
  const name = item.poster?.full_name || "Member";

  const close = () => { setIdx(0); setConfirming(false); onClose(); };

  const rows: [string, React.ReactNode][] = [];
  if (item.kind === "show" && item.start) {
    rows.push(["When", item.end && item.end !== item.start ? `${fullDate(item.start)} – ${fullDate(item.end)}` : fullDate(item.start)]);
  } else if (item.start) {
    rows.push(["Starts", fullDate(item.start)]);
  }
  if (item.deadline) rows.push(["Apply by", fullDate(item.deadline)]);
  rows.push(["Where", item.online ? "Online" : item.where || "Not given"]);
  if (item.price) rows.push(["Price from", item.price]);
  const wd = wallDetails(item);
  if (wd.wall) rows.push(["Wall", wd.wall]);
  if (wd.duration) rows.push(["For how long", wd.duration]);
  if (wd.sells != null) rows.push(["Selling", wd.sells ? `Yes${wd.commission != null ? `, ${wd.commission}% commission` : ""}` : "No, display only"]);
  if (item.raw?.num_artists) rows.push(["Looking for", `${item.raw.num_artists} ${item.raw.num_artists === 1 ? "artist" : "artists"}`]);
  if (item.link) {
    rows.push(["Link", (
      <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-fg underline underline-offset-4">
        Open link <ExternalLink size={13} aria-hidden />
      </a>
    )]);
  }

  const footer = mine ? (
    confirming ? (
      <>
        <span className="mr-auto font-ui text-body-sm text-fg-2">Delete this post for good?</span>
        <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
        <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await onDelete(item); setBusy(false); close(); }}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" className="mr-auto" onClick={() => setConfirming(true)}><Trash2 size={15} aria-hidden /> Delete</Button>
        <Button variant="primary" onClick={() => { close(); onEdit(item); }}><Pencil size={15} aria-hidden /> Edit</Button>
      </>
    )
  ) : (
    <Button variant="primary" onClick={() => { close(); onMessage(item); }}>
      <MessageSquare size={15} aria-hidden /> {actionLabel || <>Message {(item.poster?.role === "venue" || item.poster?.role === "gallery" ? item.poster?.full_name : item.poster?.full_name?.split(" ")[0]) || "them"}</>}
    </Button>
  );

  return (
    <Modal open onClose={close} size="lg" title={item.title} description={<Badge tone={KIND_TONE[item.kind]}>{item.typeLabel}</Badge>} footer={footer}>
      <div className="flex flex-col gap-5">
        {imgs.length > 0 && (
          <div className="relative">
            <Mat src={imgs[idx]} alt={item.title} className="aspect-[4/3] w-full rounded-control" pad="p-4" />
            {imgs.length > 1 && (
              <>
                <button type="button" aria-label="Previous image" onClick={() => setIdx((idx - 1 + imgs.length) % imgs.length)}
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <button type="button" aria-label="Next image" onClick={() => setIdx((idx + 1) % imgs.length)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
                  <ChevronRight size={18} aria-hidden />
                </button>
                <span className="absolute bottom-2 right-2 rounded-pill bg-surface px-2 py-0.5 font-ui text-caption tabular-nums text-fg-2">{idx + 1} / {imgs.length}</span>
              </>
            )}
          </div>
        )}

        {item.description && <p className="whitespace-pre-line font-ui text-body text-fg-2">{item.description}</p>}

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t-hair border-line pt-4 font-ui text-body-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-fg-3">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-3 border-t-hair border-line pt-4">
          <Avatar name={name} src={item.poster?.avatar_url} size="md" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-ui text-body font-semibold text-fg">{mine ? "Posted by you" : name}</span>
            <span className="font-ui text-caption text-fg-3">
              {item.poster?.role === "venue" || item.poster?.role === "gallery" ? "Venue" : "Artist"}
            </span>
          </div>
          {!mine && item.poster?.username && (
            <Link href={`/${item.poster.username}`} target="_blank" className="font-ui text-body-sm font-semibold text-fg underline-offset-4 hover:underline">
              View profile
            </Link>
          )}
        </div>
      </div>
    </Modal>
  );
}
