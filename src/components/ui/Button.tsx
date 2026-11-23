import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui font-semibold " +
  "border-outline transition-[transform,box-shadow,background-color,color] duration-fast ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink " +
  "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  // The one main action on a screen.
  primary:
    "bg-mango text-on-mango border-ink shadow-hard-1 " +
    "hover:bg-mango-hover hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-2 " +
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  secondary: "bg-surface text-fg border-ink hover:bg-sunken",
  ghost: "bg-transparent text-fg-2 border-transparent hover:bg-sunken hover:text-fg",
  danger: "bg-surface text-bad border-bad hover:bg-bad-well",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label rounded-chip",
  md: "h-10 px-4 text-control rounded-control",
};

/** Class string for anything that should look like a button. */
export function buttonClasses(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />;
});

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A Next.js link styled as a button. */
export function ButtonLink({ variant = "secondary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
