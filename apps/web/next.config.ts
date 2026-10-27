import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@nido/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.dummyjson.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
