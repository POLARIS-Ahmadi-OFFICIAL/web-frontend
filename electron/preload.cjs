const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("polaris", {
  platform: process.platform,
  isDesktop: true,
});
