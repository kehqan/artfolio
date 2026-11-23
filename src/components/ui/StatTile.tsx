import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "./cn";

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Short change note, e.g. "+3 vs October". */
  delta?: ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}

const trendColor = { up: "text-ok", down: "text-bad", flat: "text-fg-3" } as const;

export function StatTile({ label, value, delta, trend = "flat", className }: StatTileProps) {
  return (
    <Card padding="md" className={cn("flex flex-col gap-1", className)}>
      <span className="font-ui text-label text-fg-2">{label}</span>
      <span className="font-display text-h1 leading-none tabular-nums text-fg">{value}</span>
      {delta && <span className={cn("font-ui text-caption font-semibold", trendColor[trend])}>{delta}</span>}
    </Card>
  );
}
