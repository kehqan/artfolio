import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggleable filter chip (stage filters, categories). */
export function Chip({ selected = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill border-hair px-3 font-ui text-label font-semibold transition-colors duration-fast",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        selected ? "border-ink bg-inverse text-on-inverse" : "border-line bg-surface text-fg-2 hover:border-ink hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
