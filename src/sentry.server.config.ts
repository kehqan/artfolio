// Crash reports from server code (pages, API routes). See src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, IGNORE_ERRORS, scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || "development",
    enabled: process.env.NODE_ENV === "production",
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: 0,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}
