import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "127.0.0.1:3000",
    "localhost:3000",
  ],
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:5000/api/v1/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/v1/:path*",
      },
      {
        source: "/webhooks/:path*",
        destination: "http://127.0.0.1:5000/webhooks/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // Legacy domain permanent 301 redirection: trigyna.com -> https://www.trigyna.in/:path*
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "trigyna.com",
          },
        ],
        destination: "https://www.trigyna.in/:path*",
        permanent: true,
      },
      // Legacy subdomain permanent 301 redirection: www.trigyna.com -> https://www.trigyna.in/:path*
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.trigyna.com",
          },
        ],
        destination: "https://www.trigyna.in/:path*",
        permanent: true,
      },
      // Canonical hostname enforcement (apex trigyna.in -> www.trigyna.in)
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "trigyna.in",
          },
        ],
        destination: "https://www.trigyna.in/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
