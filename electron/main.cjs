const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const DEV_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const useBundledServer = app.isPackaged || process.env.ELECTRON_USE_BUNDLED_SERVER === "1";

let mainWindow = null;
let serverProcess = null;
let appUrl = DEV_APP_URL;

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  const flat = path.join(__dirname, "..", ".next", "electron-standalone");
  if (require("node:fs").existsSync(path.join(flat, "server.js"))) {
    return flat;
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startBundledServer() {
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");
  const port = await findFreePort();

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "pipe",
  });

  serverProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[next] ${chunk}`);
  });

  serverProcess.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Next server exited with code ${code}`);
    }
  });

  appUrl = `http://127.0.0.1:${port}`;
  await waitForUrl(appUrl);
}

function stopBundledServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
  serverProcess = null;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "POLARIS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  try {
    if (useBundledServer) {
      await startBundledServer();
    }
    await createWindow();
  } catch (err) {
    console.error("Failed to start POLARIS desktop:", err);
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", () => {
  stopBundledServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

if (process.env.ELECTRON_AUTO_UPDATE === "true") {
  try {
    const { autoUpdater } = require("electron-updater");
    app.whenReady().then(() => autoUpdater.checkForUpdatesAndNotify());
  } catch {
    /* optional */
  }
}
