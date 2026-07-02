import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Bundled into the Electron desktop app (see scripts/prepare-standalone.mjs).
  output: process.env.ELECTRON_DESKTOP_BUILD === "1" ? "standalone" : undefined,
  // Keep standalone layout flat when the repo lives under a parent workspace folder.
  outputFileTracingRoot: projectRoot,
  // Allow Electron (and other local clients) to access Next.js dev resources like HMR.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
