"use client";
// A one-time line that explains a page the first time someone opens it.
// "Got it" closes it for good (on every device). One per page, at most.
import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/components/ui";
import { useJourney } from "./JourneyProvider";

export function Hint({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  const { hintOpen, closeHint } = useJourney();
  if (!hintOpen(id)) return null;
  return (
    <aside aria-label={title}
      className={cn("flex items-start gap-3 rounded-card border-hair border-line bg-mango-soft/60 p-4 animate-drop-in sm:items-center", className)}>
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango">
        <Lightbulb size={15} />
      </span>
      <p className="min-w-0 flex-1 font-ui text-body-sm text-fg-2">
        <strong className="font-semibold text-fg">{title}</strong> {children}
      </p>
      <button type="button" onClick={() => closeHint(id)}
        className="shrink-0 rounded-chip border-outline border-ink bg-surface px-3 py-1.5 font-ui text-label font-semibold text-fg hover:bg-sunken">
        Got it
      </button>
    </aside>
  );
}
