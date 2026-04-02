/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly pass env vars to client bundle at build time
  // This ensures NEXT_PUBLIC_ vars are always available even if set after initial build
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
};

module.exports = nextConfig;
