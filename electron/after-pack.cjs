const fs = require("node:fs");
const path = require("node:path");

/**
 * electron-builder's extraResources copier silently drops any node_modules
 * directory it encounters (a known upstream quirk), so the bundled Next.js
 * standalone server ends up with no `next` module to require. Copy it back
 * in manually after packaging.
 */
module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const projectRoot = path.resolve(__dirname, "..");
  const source = path.join(projectRoot, ".next", "electron-standalone", "node_modules");

  if (!fs.existsSync(source)) {
    console.warn("[after-pack] no standalone node_modules found at", source, "- skipping");
    return;
  }

  const resourcesDir =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");

  const dest = path.join(resourcesDir, "standalone", "node_modules");
  fs.cpSync(source, dest, { recursive: true, dereference: true });
  console.log("[after-pack] copied standalone node_modules ->", dest);
};
