#!/usr/bin/env node
/**
 * Normalize Next standalone output and copy static assets for Electron packaging.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getElectronStandaloneDir,
  resolveStandaloneSourceDir,
} from "./resolve-standalone-dir.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolveStandaloneSourceDir(root);

if (!sourceDir) {
  console.error(
    "Could not find standalone server.js — run ELECTRON_DESKTOP_BUILD=1 npm run build first.",
  );
  process.exit(1);
}

const destDir = getElectronStandaloneDir(root);

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.cpSync(sourceDir, destDir, { recursive: true });

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true });
}

copyDir(path.join(root, "public"), path.join(destDir, "public"));
copyDir(path.join(root, ".next", "static"), path.join(destDir, ".next", "static"));

console.log("Standalone source:", sourceDir);
console.log("Electron bundle ready:", destDir);
