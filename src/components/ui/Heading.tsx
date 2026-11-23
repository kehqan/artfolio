import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Size = "display" | "h1" | "h2" | "h3";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Visual size. Defaults to match the level. */
  size?: Size;
  level?: 1 | 2 | 3 | 4;
}

const defaultSize: Record<number, Size> = { 1: "h1", 2: "h2", 3: "h3", 4: "h3" };
const sizes: Record<Size, string> = {
  display: "text-display",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
};

/** Headlines in Darker Grotesque. Never use the display face below 20px. */
export function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as "h1";
  return (
    <Tag
      className={cn(
        "font-display font-extrabold tracking-[-0.01em] text-fg [text-wrap:balance]",
        sizes[size ?? defaultSize[level]],
        className,
      )}
      {...props}
    />
  );
}

/** Small uppercase label above a heading or section. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-ui text-caption font-semibold uppercase tracking-[0.08em] text-fg-3", className)}
      {...props}
    />
  );
}
