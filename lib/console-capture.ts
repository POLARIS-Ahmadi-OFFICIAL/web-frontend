const MAX_ENTRIES = 20;
const buffer: string[] = [];
let installed = false;

function record(level: string, args: unknown[]) {
  const text = args
    .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : typeof a === "string" ? a : safeStringify(a)))
    .join(" ");
  buffer.push(`[${level}] ${text}`);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function installConsoleCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    record("error", args);
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    record("warn", args);
    originalWarn(...args);
  };

  window.addEventListener("error", (e) => record("error", [e.message]));
  window.addEventListener("unhandledrejection", (e) => record("error", [`Unhandled rejection: ${e.reason}`]));
}

export function getRecentConsoleErrors(): string[] {
  return [...buffer];
}
