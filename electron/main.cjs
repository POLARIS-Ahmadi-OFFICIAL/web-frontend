const { app, BrowserWindow } = require("electron");
const path = require("path");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });
  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

if (process.env.ELECTRON_AUTO_UPDATE === "true") {
  try {
    const { autoUpdater } = require("electron-updater");
    app.whenReady().then(() => autoUpdater.checkForUpdatesAndNotify());
  } catch {
    /* optional in dev */
  }
}
