import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Clickable cards get the ink outline and hard shadow on hover only. */
  interactive?: boolean;
  /** Inner padding. Use "none" when an image runs to the edges. */
  padding?: "none" | "sm" | "md" | "lg";
}

const pad = { none: "", sm: "p-4", md: "p-5", lg: "p-6" } as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, padding = "md", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-card border-hair border-line bg-surface",
        interactive &&
          "cursor-pointer transition-[transform,box-shadow,border-color] duration-base ease-out " +
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2 " +
            "focus-within:border-ink",
        pad[padding],
        className,
      )}
      {...props}
    />
  );
});
