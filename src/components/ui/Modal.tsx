"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { Heading } from "./Heading";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons, right-aligned. Put the main action last. */
  footer?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const widths = { sm: "max-w-[400px]", md: "max-w-[520px]", lg: "max-w-[720px]" } as const;

/** Floating layer: gets the full ink outline and the largest hard shadow. */
export function Modal({ open, onClose, title, description, footer, children, size = "sm" }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col gap-4 rounded-card border-outline border-ink bg-surface p-6 shadow-hard-3 outline-none",
          widths[size],
        )}
      >
        <div className="flex flex-col gap-1.5">
          <Heading level={2} size="h3" id={titleId}>
            {title}
          </Heading>
          {description && <p className="font-ui text-body-sm text-fg-2">{description}</p>}
        </div>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
