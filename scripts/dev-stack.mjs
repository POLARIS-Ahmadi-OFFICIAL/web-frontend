#!/usr/bin/env node
/**
 * Run backend-api, web-frontend, and mobile-development together.
 * Usage: npm run dev:stack (from web-frontend)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backend = path.join(root, "backend-api");
const mobile = path.join(root, "mobile-development");
const web = path.join(root, "web-frontend");

const backendPython =
  process.platform === "win32"
    ? path.join(backend, ".venv", "Scripts", "python.exe")
    : path.join(backend, ".venv", "bin", "python");

const procs = [
  {
    name: "api",
    cwd: backend,
    cmd: backendPython,
    args: ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8080"],
    color: "\x1b[34m",
  },
  {
    name: "web",
    cwd: web,
    cmd: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    color: "\x1b[32m",
  },
  {
    name: "mobile",
    cwd: mobile,
    cmd: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["expo", "start"],
    color: "\x1b[35m",
  },
];

function prefix(name, color, data) {
  const lines = data.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
  }
}

const children = procs.map((p) => {
  const child = spawn(p.cmd, p.args, { cwd: p.cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env });
  child.stdout.on("data", (d) => prefix(p.name, p.color, d));
  child.stderr.on("data", (d) => prefix(p.name, p.color, d));
  child.on("exit", (code) => {
    console.log(`\x1b[33m[${p.name}]\x1b[0m exited with code ${code}`);
  });
  return child;
});

function shutdown() {
  for (const c of children) c.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("\x1b[36mPOLARIS dev stack\x1b[0m — api :8080, web :3000, mobile (Expo)\n");
