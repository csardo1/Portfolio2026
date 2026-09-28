import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local preview accepts newly published slugs; the GitHub Pages build
  // includes only the project pages generated from Markdown at build time.
  pageExtensions: process.env.NODE_ENV === "development"
    ? ["tsx", "ts", "local.tsx", "local.ts"]
    : ["tsx", "ts", "public.tsx", "public.ts"],
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // GitHub Pages serves each generated route from its own index.html.
  // The local preview does not need redirects; Studio has its own server.
  trailingSlash: process.env.NODE_ENV === "production",
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
