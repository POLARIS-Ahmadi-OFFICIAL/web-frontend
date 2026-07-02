#!/usr/bin/env node
/**
 * Starts only the backend-api uvicorn server.
 * Creates .venv on first run if it doesn't exist.
 * Used by dev:desktop so Electron gets a live backend on :8080.
 */
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backend = path.join(root, "backend-api");

const isWin = process.platform === "win32";
const venvPython = path.join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");

function findPython() {
  for (const candidate of ["python3.12", "python3.11", "python3.10", "python3"]) {
    const result = spawnSync(isWin ? "where" : "which", [candidate], { encoding: "utf8" });
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split("\n")[0].trim();
    }
  }
  return null;
}

if (!fs.existsSync(venvPython)) {
  const pythonBin = findPython();
  if (!pythonBin) {
    console.error("[api] ERROR: Python 3.10+ not found. Install Python 3.12 and re-run.");
    process.exit(1);
  }
  console.log(`[api] Creating .venv with ${pythonBin}…`);
  const venvResult = spawnSync(pythonBin, ["-m", "venv", ".venv"], {
    cwd: backend,
    stdio: "inherit",
  });
  if (venvResult.status !== 0) {
    console.error("[api] Failed to create .venv");
    process.exit(1);
  }
  console.log("[api] Installing dependencies (pip install -e .)…");
  const pipResult = spawnSync(venvPython, ["-m", "pip", "install", "-e", ".", "--quiet"], {
    cwd: backend,
    stdio: "inherit",
  });
  if (pipResult.status !== 0) {
    console.error("[api] pip install failed");
    process.exit(1);
  }
}

// Kill any stale process occupying :8080 before starting.
const existing = spawnSync(isWin ? "netstat" : "lsof", isWin ? ["-ano"] : ["-ti", ":8080"], {
  encoding: "utf8",
});
if (existing.stdout?.trim()) {
  const pids = existing.stdout.trim().split(/\s+/).filter(Boolean);
  for (const pid of pids) {
    try { process.kill(Number(pid), "SIGTERM"); } catch { /* already gone */ }
  }
  await new Promise((r) => setTimeout(r, 800));
}

const child = spawn(
  venvPython,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8080"],
  { cwd: backend, stdio: ["ignore", "pipe", "pipe"], env: process.env },
);

child.stdout.on("data", (d) => process.stdout.write(`\x1b[34m[api]\x1b[0m ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`\x1b[34m[api]\x1b[0m ${d}`));
child.on("error", (err) => {
  console.error(`[api] Failed to start: ${err.message}`);
  process.exit(1);
});
child.on("exit", (code) => console.log(`\x1b[33m[api]\x1b[0m exited with code ${code}`));

process.on("SIGINT", () => { child.kill("SIGTERM"); process.exit(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); process.exit(0); });
