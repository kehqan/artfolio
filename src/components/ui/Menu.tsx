"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

export interface MenuProps {
  items: MenuItem[];
  /** Accessible name for the trigger, e.g. "Actions for Blue Hour". */
  label: string;
  /** Open above the trigger instead of below. */
  placement?: "bottom" | "top";
  trigger?: ReactNode;
  className?: string;
}

/** A small "⋯" actions menu. Floating, so it gets the ink outline and big shadow. */
export function Menu({ items, label, placement = "bottom", trigger, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative shrink-0", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-chip border-hair transition-colors duration-fast",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          open ? "border-ink bg-sunken text-fg" : "border-line bg-surface text-fg-3 hover:border-ink hover:text-fg",
        )}
      >
        {trigger ?? <MoreHorizontal size={16} aria-hidden />}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-dropdown min-w-[160px] overflow-hidden rounded-control border-outline border-ink bg-surface p-1 shadow-hard-3 animate-drop-in",
            placement === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-chip px-3 py-2 text-left font-ui text-body-sm font-medium transition-colors duration-fast",
                it.danger ? "text-bad hover:bg-bad-well" : "text-fg hover:bg-sunken",
              )}
            >
              {it.icon && <it.icon size={15} aria-hidden />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
