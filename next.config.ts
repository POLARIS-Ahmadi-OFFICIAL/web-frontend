import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const pkg = createRequire(import.meta.url)("./package.json") as { version: string };

const nextConfig: NextConfig = {
  // Bundled into the Electron desktop app (see scripts/prepare-standalone.mjs).
  output: process.env.ELECTRON_DESKTOP_BUILD === "1" ? "standalone" : undefined,
  // Keep standalone layout flat when the repo lives under a parent workspace folder.
  outputFileTracingRoot: projectRoot,
  // Allow Electron (and other local clients) to access Next.js dev resources like HMR.
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
