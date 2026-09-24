import type { NextConfig } from "next";
import { resolve } from "node:path";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  transpilePackages: ["@promptsite/compiler"],
  // A CDN in front (e.g. Cloudflare) only answers Range requests from its cache, and it
  // won't cache files served with max-age=0, which breaks video seeking.
  async headers() {
    return [{ source: "/media/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] }];
  },
};

export default config;
