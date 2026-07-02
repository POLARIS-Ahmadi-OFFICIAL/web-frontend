#!/usr/bin/env node
/**
 * Starts only the backend-api uvicorn server.
 * Used by dev:desktop so Electron gets a live backend on :8080.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backend = path.join(root, "backend-api");
const python =
  process.platform === "win32"
    ? path.join(backend, ".venv", "Scripts", "python.exe")
    : path.join(backend, ".venv", "bin", "python");

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8080"],
  { cwd: backend, stdio: ["ignore", "pipe", "pipe"], env: process.env },
);

child.stdout.on("data", (d) => process.stdout.write(`\x1b[34m[api]\x1b[0m ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`\x1b[34m[api]\x1b[0m ${d}`));
child.on("exit", (code) => console.log(`\x1b[33m[api]\x1b[0m exited with code ${code}`));

process.on("SIGINT", () => { child.kill("SIGTERM"); process.exit(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); process.exit(0); });
