"use client";
// The one thing to do now, at the top of Home. One title, one line, one
// main button. An optional quiet progress line underneath.
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/components/ui";

export type StepAction = { label: string; href?: string; onClick?: () => void; busy?: boolean };
export type Progress = { label: string; done: boolean }[];

export function NextStepCard({ eyebrow = "Next step", title, line, primary, secondary, image, icon, progress, tone = "plain" }: {
  eyebrow?: string; title: string; line?: ReactNode; primary?: StepAction; secondary?: StepAction;
  image?: string | null; icon?: ReactNode; progress?: Progress; tone?: "plain" | "mango";
}) {
  const doneCount = progress?.filter(p => p.done).length ?? 0;
  const nextIdx = progress?.findIndex(p => !p.done) ?? -1;
  return (
    <section aria-label={eyebrow}
      className={cn("flex flex-col gap-4 rounded-card border-outline border-ink p-5 shadow-hard-1 animate-drop-in sm:p-6",
        tone === "mango" ? "bg-mango-soft" : "bg-surface")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {image !== undefined ? (
          <span className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-control border-hair border-line bg-sunken sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image && <img src={image} alt="" className="h-full w-full object-contain p-1" />}
          </span>
        ) : icon ? (
          <span aria-hidden className="hidden h-12 w-12 shrink-0 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango sm:grid">{icon}</span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{eyebrow}</span>
          <h2 className="font-display text-h2 leading-tight text-fg">{title}</h2>
          {line && <div className="font-ui text-body-sm text-fg-2">{line}</div>}
        </div>
        {(primary || secondary) && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {secondary && <Act a={secondary} variant="secondary" />}
            {primary && <Act a={primary} variant="primary" />}
          </div>
        )}
      </div>
      {progress && progress.length > 0 && (
        <div className="flex flex-col gap-2 border-t-hair border-line pt-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="shrink-0 font-ui text-caption font-semibold tabular-nums text-fg-2">{doneCount} of {progress.length} done</span>
          <ol className="flex flex-1 flex-wrap gap-x-4 gap-y-1.5" aria-label="Your progress">
            {progress.map((p, i) => (
              <li key={p.label} className="flex items-center gap-1.5 font-ui text-caption">
                <span aria-hidden className={cn("h-2 w-2 rounded-pill", p.done ? "bg-ink" : i === nextIdx ? "bg-mango ring-1 ring-ink" : "bg-line-strong")} />
                <span className={cn(p.done ? "text-fg-3 line-through decoration-1" : i === nextIdx ? "font-semibold text-fg" : "text-fg-3")}>{p.label}</span>
                <span className="sr-only">{p.done ? "(done)" : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Act({ a, variant }: { a: StepAction; variant: "primary" | "secondary" }) {
  const cls = variant === "primary"
    ? "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control border-outline border-ink bg-mango px-5 font-ui text-control font-semibold text-on-mango shadow-hard-1 transition hover:-translate-x-px hover:-translate-y-px hover:bg-mango-hover hover:shadow-hard-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
    : "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control border-hair border-transparent px-3 font-ui text-control font-semibold text-fg-2 hover:bg-sunken hover:text-fg";
  const inner = <>{a.label}{variant === "primary" && <ArrowRight size={16} aria-hidden />}</>;
  return a.href
    ? <Link href={a.href} className={cls}>{inner}</Link>
    : <button type="button" onClick={a.onClick} disabled={a.busy} className={cls}>{a.busy ? "One moment…" : inner}</button>;
}
