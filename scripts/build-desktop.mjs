#!/usr/bin/env node
/**
 * Build POLARIS desktop installers (macOS + Windows).
 *
 * Usage:
 *   npm run build:desktop          # current OS
 *   npm run build:desktop:mac      # macOS (.dmg + .zip)
 *   npm run build:desktop:win      # Windows (NSIS + portable)
 *
 * Set NEXT_PUBLIC_API_URL (and Supabase vars) before building so they are baked into the UI.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function run(cmd, cmdArgs, extraEnv = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const targets = [];
if (args.includes("--mac")) targets.push("--mac");
if (args.includes("--win")) targets.push("--win");
if (args.includes("--linux")) targets.push("--linux");

if (targets.length === 0) {
  if (process.platform === "darwin") targets.push("--mac");
  else if (process.platform === "win32") targets.push("--win");
  else targets.push("--linux");
}

console.log("Building Next.js (standalone) for desktop…");
run("npm", ["run", "build"], { ELECTRON_DESKTOP_BUILD: "1" });

console.log("Preparing standalone assets…");
run("node", ["scripts/prepare-standalone.mjs"]);

const builderArgs = ["electron-builder", ...targets, "--publish", "never"];
console.log("Running:", builderArgs.join(" "));
run("npx", builderArgs);

console.log("\nDesktop artifacts are in dist-electron/");
