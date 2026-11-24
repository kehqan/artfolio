import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "./cn";

export type AlertTone = "bad" | "ok" | "warn" | "info";

const tones: Record<AlertTone, { cls: string; Icon: typeof Info }> = {
  bad: { cls: "bg-bad-well text-bad", Icon: AlertCircle },
  ok: { cls: "bg-ok-well text-ok", Icon: CheckCircle2 },
  warn: { cls: "bg-warn-well text-warn", Icon: TriangleAlert },
  info: { cls: "bg-info-well text-info", Icon: Info },
};

/** Inline message inside a form or panel. Errors state what is needed, not just that it failed. */
export function Alert({ tone = "info", children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-control px-3.5 py-3 font-ui text-body-sm font-medium", cls, className)}>
      <Icon size={16} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
