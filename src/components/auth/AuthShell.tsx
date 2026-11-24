import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Heading } from "@/components/ui";

const POINTS = [
  "Every work, with its photos, size, price and history",
  "A public page and storefront collectors can visit",
  "Sales, collectors, contracts and shows in one place",
];

/**
 * Frame for log in, sign up and password pages: a quiet story panel on the
 * left (desktop only) and the form on the right.
 */
export function AuthShell({
  title, description, children, footer, aside, before, width = "sm",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Small print under the form card, e.g. "New here? Create an account". */
  footer?: ReactNode;
  /** Shown above the title, e.g. a back link and step bar. */
  before?: ReactNode;
  /** Replaces the default story panel. */
  aside?: ReactNode;
  width?: "sm" | "md";
}) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Story panel */}
      <aside className="hidden flex-col justify-between border-r-hair border-line bg-sunken px-12 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Wordmark />
        {aside ?? (
          <div className="flex max-w-[440px] flex-col gap-6">
            <Heading level={2} size="display" className="text-fg">
              Your studio, your shows, your sales.
            </Heading>
            <ul className="flex flex-col gap-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 font-ui text-lead text-fg-2">
                  <span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full border-outline border-ink bg-mango" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="font-ui text-caption text-fg-3">For artists, venues and the people who love their work.</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-4 py-6 sm:px-8 lg:px-12">
        <div className="lg:hidden"><Wordmark /></div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className={width === "md" ? "w-full max-w-[560px]" : "w-full max-w-[420px]"}>
            {before}
            <div className="mb-6 flex flex-col gap-2">
              <Heading level={1} size="h1">{title}</Heading>
              {description && <p className="font-ui text-body text-fg-2">{description}</p>}
            </div>
            {children}
            {footer && <div className="mt-6 font-ui text-body-sm text-fg-2">{footer}</div>}
          </div>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-4 font-ui text-caption text-fg-3">
          <Link href="/explore" className="hover:text-fg">Explore Artomango</Link>
        </nav>
      </main>
    </div>
  );
}

/** Inline text link used under auth forms. */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ink">
      {children}
    </Link>
  );
}
