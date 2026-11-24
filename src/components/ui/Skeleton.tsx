import { cn } from "./cn";

/** Placeholder block while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-chip bg-n-100", className)} />;
}
