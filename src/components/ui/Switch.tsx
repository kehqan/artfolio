"use client";

import { cn } from "./cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name when there's no visible label wired with aria-labelledby. */
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** On/off control. Ink track when on; it's interactive, so it carries the ink outline. */
export function Switch({ checked, onChange, label, disabled, className, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border-outline border-ink transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:shadow-hard-1 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ink" : "bg-surface",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-4 w-4 rounded-pill transition-transform duration-fast",
          checked ? "translate-x-[22px] bg-mango" : "translate-x-[3px] bg-ink",
        )}
      />
    </button>
  );
}
