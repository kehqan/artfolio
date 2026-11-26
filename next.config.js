/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs/config");

// Files in /public keep the same name when they change, so they get a day of
// browser cache plus a week of "use the old copy while fetching the new one".
// Files Next builds (/_next/static) are already cached for a year, because
// their names change whenever their content does.
const PUBLIC_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig = {
  // Explicitly pass env vars to client bundle at build time
  // This ensures NEXT_PUBLIC_ vars are always available even if set after initial build
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
  // Responses are gzip/brotli compressed (Vercel does this at its edge too).
  compress: true,
  // Next 14 only runs src/instrumentation.ts (crash reports) with this on.
  experimental: { instrumentationHook: true },
  async headers() {
    return [
      // Basic browser protections on every page: no framing by other sites
      // (our own site preview still works), no type guessing, no full URLs
      // sent to other sites, and no camera or microphone.
      { source: "/:path*", headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
      ] },
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: PUBLIC_CACHE }] },
      { source: "/:file(favicon\\.ico|favicon\\.svg|favicon-16\\.png|favicon-32\\.png|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|logo\\.png|og-image\\.jpg|manifest\\.json)", headers: [{ key: "Cache-Control", value: PUBLIC_CACHE }] },
    ];
  },
};

// Crash reports (Sentry). Without SENTRY_AUTH_TOKEN the build still works, it
// just doesn't upload source maps (then stack traces show minified code).
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  url: process.env.SENTRY_URL || undefined,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  // Errors only: leave the tracing and replay code out of the pages people download.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  suppressOnRouterTransitionStartWarning: true,
});
