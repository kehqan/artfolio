/** @type {import('next').NextConfig} */

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
  poweredByHeader: false,
  images: {
    // When next/image is used, serve AVIF first, then WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "pepvuswdwoxrgmhdipyu.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
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

module.exports = nextConfig;
