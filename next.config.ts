import type { NextConfig } from "next";

// cacheComponents / partial prefetching stay off: every API response is a fresh model stream.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // The preview iframe has an opaque origin, so fonts need CORS (specs/05 §5.2).
      { source: "/fonts/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
      { source: "/vendor/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
