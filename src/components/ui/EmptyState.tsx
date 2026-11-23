import type { ReactNode } from "react";
import { cn } from "./cn";
import { Heading } from "./Heading";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Shown when a list has nothing in it yet. Say what will appear and how to add the first one. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border-outline border-dashed border-line-strong bg-surface px-5 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="grid h-11 w-11 place-items-center rounded-control border-outline border-ink bg-mango text-on-mango shadow-hard-1">
          {icon}
        </div>
      )}
      <Heading level={3}>{title}</Heading>
      {description && <p className="max-w-[40ch] font-ui text-body-sm text-fg-2">{description}</p>}
      {action}
    </div>
  );
}
