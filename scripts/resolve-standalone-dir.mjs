import fs from "node:fs";
import path from "node:path";

/**
 * Locate Next.js standalone output (layout varies by Next version / monorepo root).
 */
export function resolveStandaloneSourceDir(projectRoot) {
  const candidates = [
    path.join(projectRoot, ".next", "standalone"),
    path.join(projectRoot, ".next", "standalone", "Documents", "web-frontend"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "server.js"))) {
      return dir;
    }
  }

  const base = path.join(projectRoot, ".next", "standalone");
  if (!fs.existsSync(base)) {
    return null;
  }

  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    if (fs.existsSync(path.join(dir, "server.js"))) {
      return dir;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        stack.push(path.join(dir, entry.name));
      }
    }
  }

  return null;
}

/** Flat directory used by electron-builder extraResources. */
export function getElectronStandaloneDir(projectRoot) {
  return path.join(projectRoot, ".next", "electron-standalone");
}
