import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "ok" | "warn" | "bad" | "info" | "violet" | "inverse" | "mango";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-n-100 text-fg-2",
  ok: "bg-ok-well text-ok",
  warn: "bg-warn-well text-warn",
  bad: "bg-bad-well text-bad",
  info: "bg-info-well text-info",
  violet: "bg-tag-violet-well text-tag-violet",
  inverse: "bg-inverse text-on-inverse",
  mango: "bg-mango text-on-mango border-outline border-ink",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Small status dot before the text. */
  dot?: boolean;
}

/** Status label, e.g. Available / Sold / Draft. */
export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 font-ui text-caption font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export type TagColor = "coral" | "teal" | "violet" | "pink" | "sky";

const tagDots: Record<TagColor, string> = {
  coral: "bg-tag-coral",
  teal: "bg-tag-teal",
  violet: "bg-tag-violet",
  pink: "bg-tag-pink",
  sky: "bg-tag-sky",
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** Optional category color shown as a dot. */
  color?: TagColor;
}

/** Neutral descriptor, e.g. a medium or series name. */
export function Tag({ color, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill border-hair border-line bg-surface px-2.5 font-ui text-caption font-medium text-fg-2",
        className,
      )}
      {...props}
    >
      {color && <span aria-hidden className={cn("h-2 w-2 rounded-full", tagDots[color])} />}
      {children}
    </span>
  );
}
