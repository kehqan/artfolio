"use client";

// When a page breaks: a calm way back instead of a blank screen. The error goes
// to the crash reports (src/instrumentation-client.ts) so we hear about it first.
import { useEffect } from "react";
import { reportError } from "@/lib/crash";
import { Button, ButtonLink, Heading } from "@/components/ui";
import { MangoMark } from "@/components/brand/MangoMark";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error); }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <MangoMark size={56} />
        <Heading level={1}>Something broke on this page</Heading>
        <p className="font-ui text-body text-fg-2">
          It&rsquo;s on us, not you. We&rsquo;ve been told about it automatically. Try again, or start from the home page.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">Go to the home page</ButtonLink>
        </div>
      </div>
    </main>
  );
}
