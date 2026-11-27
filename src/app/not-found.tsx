// Any link that leads nowhere: the brand, a plain sentence and two ways on.
import type { Metadata } from "next";
import { ButtonLink, Heading } from "@/components/ui";
import { MangoMark } from "@/components/brand/MangoMark";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="px-5 py-5 sm:px-8">
        <Wordmark />
      </header>
      <main className="grid flex-1 place-items-center px-5 pb-24 pt-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <MangoMark size={72} />
          <Heading level={1}>This page isn&rsquo;t here</Heading>
          <p className="font-ui text-body text-fg-2">
            The link may be old, or the page has moved. The art is still where it was.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/" variant="primary">Go to the home page</ButtonLink>
            <ButtonLink href="/explore" variant="secondary">Explore art</ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
