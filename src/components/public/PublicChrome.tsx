"use client";
import { useState, type ReactNode } from "react";
import { ImageIcon, Menu as MenuIcon, X } from "lucide-react";
import { ButtonLink, cn } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";

/** Page column for public pages, same width as the dashboard content column. */
export const publicWrap = "mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8";

/** Underlined text link used across public pages. */
export const textLink =
  "inline-flex items-center gap-1.5 font-ui text-label font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ink";

const NAV: [string, string][] = [
  ["Explore", "/explore"],
  ["How it works", "/#how"],
  ["For venues", "/#venues"],
];

/**
 * Sticky public header: wordmark, main links, sign in and the one primary action.
 * When signedIn, "Sign in" is replaced by a link back to the dashboard.
 */
export function PublicHeader({ action, signedIn = false }: { action?: ReactNode; signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-nav border-b-hair border-line bg-surface">
      <div className={cn(publicWrap, "flex h-header items-center gap-6")}>
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="rounded-pill px-3 py-2 font-ui text-label font-semibold text-fg-2 hover:bg-sunken hover:text-fg">{label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            action ?? <ButtonLink href="/dashboard" variant="secondary">Open your studio</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">Sign in</ButtonLink>
              {action ?? <ButtonLink href="/register" variant="primary">Get started</ButtonLink>}
            </>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="grid h-10 w-10 place-items-center rounded-pill text-fg-2 hover:bg-sunken md:hidden"
          >
            {open ? <X size={18} aria-hidden /> : <MenuIcon size={18} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Main" className="border-t-hair border-line px-4 py-3 md:hidden">
          {[...NAV, (signedIn ? ["Your studio", "/dashboard"] : ["Sign in", "/login"]) as [string, string]].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-control px-3 py-2.5 font-ui text-body font-semibold text-fg hover:bg-sunken">{label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t-hair border-line bg-page">
      <div className={cn(publicWrap, "flex flex-col gap-8 py-10 md:flex-row md:justify-between")}>
        <div className="flex max-w-[320px] flex-col gap-3">
          <Wordmark />
          <p className="font-ui text-body-sm text-fg-3">From your studio to a wall. Made for artists, not algorithms.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 font-ui text-body-sm">
          <span className="mb-1 font-semibold text-fg">Platform</span>
          <span className="mb-1 font-semibold text-fg">Account</span>
          <a href="/explore" className="text-fg-2 hover:text-fg">Explore</a>
          <a href="/register" className="text-fg-2 hover:text-fg">Create an account</a>
          <a href="/#how" className="text-fg-2 hover:text-fg">How it works</a>
          <a href="/login" className="text-fg-2 hover:text-fg">Sign in</a>
        </div>
      </div>
      <div className={cn(publicWrap, "border-t-hair border-line py-5 font-ui text-caption text-fg-3")} suppressHydrationWarning>
        © {new Date().getFullYear()} Artomango
      </div>
    </footer>
  );
}

/** Artwork on a mat: never cropped, never covered. Give it a size or aspect via className. */
export function Mat({ src, alt, className, pad = "p-3" }: { src?: string | null; alt: string; className?: string; pad?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-sunken", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className={cn("absolute inset-0 h-full w-full object-contain", pad)} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-fg-disabled"><ImageIcon size={28} aria-hidden /></div>
      )}
    </div>
  );
}

/** Price formatting shared by public pages. */
export function formatPrice(value?: number | null, currency?: string | null) {
  if (value == null) return "";
  const code = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString("en-US")} ${currency ?? ""}`.trim();
  }
}
