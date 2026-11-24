"use client";
// One item in the Scene feed. Art first, never cropped, then what it is,
// where and when, and who posted it.
import { CalendarDays, Globe, MapPin } from "lucide-react";
import { Avatar, Badge, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { type FeedItem, type Kind, whenLine, isPast, isLive } from "./feed";

export const KIND_TONE: Record<Kind, BadgeTone> = { show: "neutral", opportunity: "mango", collab: "info" };

export function MetaLine({ item, className }: { item: FeedItem; className?: string }) {
  const when = whenLine(item);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-body-sm text-fg-3", className)}>
      {item.online ? (
        <span className="inline-flex items-center gap-1"><Globe size={13} aria-hidden /> Online</span>
      ) : item.where ? (
        <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} aria-hidden className="shrink-0" /><span className="truncate">{item.where}</span></span>
      ) : null}
      {when && <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden /> {when}</span>}
    </div>
  );
}

export function SceneCard({ item, mine, onOpen }: { item: FeedItem; mine: boolean; onOpen: () => void }) {
  const cover = item.images[0];
  const name = item.poster?.full_name || "Member";
  const past = isPast(item);
  const hidden = !isLive(item);

  return (
    <article className="mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group block w-full overflow-hidden rounded-card border-hair border-line bg-surface text-left transition",
          "hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none",
          (past || hidden) && "opacity-70",
        )}
      >
        {cover && (
          <div className="border-b-hair border-line bg-sunken p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={item.title} loading="lazy" className="mx-auto block max-h-[420px] w-auto max-w-full object-contain" />
          </div>
        )}
        <div className="flex flex-col gap-2.5 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={KIND_TONE[item.kind]}>{item.typeLabel}</Badge>
            {mine && past && <Badge>Ended</Badge>}
            {mine && hidden && !past && <Badge>Not public</Badge>}
          </div>
          <h3 className="font-display text-h3 leading-tight text-fg">{item.title}</h3>
          {!cover && item.description && (
            <p className="line-clamp-3 font-ui text-body-sm text-fg-2">{item.description}</p>
          )}
          <MetaLine item={item} />
          <div className="mt-1 flex items-center gap-2 border-t-hair border-line pt-3">
            <Avatar name={name} src={item.poster?.avatar_url} size="sm" />
            <span className="truncate font-ui text-body-sm text-fg-2">{mine ? "You" : name}</span>
          </div>
        </div>
      </button>
    </article>
  );
}
