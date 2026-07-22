/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");

delete process.env.ELECTRON_RUN_AS_NODE;

const electronPath = require("electron");
const child = spawn(electronPath, ["."], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
