import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anchor the Turbopack root to this project so the repo isn't guessed
  // from the nearest package-lock.json (which in this environment is the
  // user home directory).
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
