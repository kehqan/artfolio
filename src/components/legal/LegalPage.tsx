"use client";
// Frame for the privacy, terms and report pages: the public header and
// footer, a title, and a readable column.
import type { ReactNode } from "react";
import { Eyebrow, Heading, cn } from "@/components/ui";
import { PublicFooter, PublicHeader, publicWrap } from "@/components/public/PublicChrome";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <PublicHeader />
      <main className={cn(publicWrap, "py-12 sm:py-16")}>
        <div className="mx-auto flex max-w-[720px] flex-col gap-10">
          <header className="flex flex-col gap-3">
            <Eyebrow>{eyebrow}</Eyebrow>
            <Heading level={1} size="display">{title}</Heading>
            {intro && <div className="font-ui text-lead text-fg-2">{intro}</div>}
          </header>
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

/** One section: a heading and plain paragraphs or lists. */
export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3 border-t-hair border-line pt-8">
      <Heading level={2} size="h3">{title}</Heading>
      <div className="flex flex-col gap-3 font-ui text-body text-fg-2 [&_a]:font-semibold [&_a]:text-fg [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:text-fg [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
