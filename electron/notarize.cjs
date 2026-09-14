const { notarize } = require("@electron/notarize");
const { execFileSync } = require("node:child_process");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  // electron-builder only warns (doesn't fail the build) when it can't find a
  // Developer ID identity in the keychain, and leaves the app bundle with
  // whatever signature the raw Electron.app template shipped with — which no
  // longer matches this customized bundle. macOS's arm64 code-integrity check
  // rejects that mismatch as "damaged", even after clearing quarantine.
  // Without a real identity configured, force a fresh ad-hoc signature so the
  // shipped app is at least internally consistent and launchable.
  if (!process.env.CSC_LINK && !process.env.CSC_NAME) {
    console.log("[notarize] No Developer ID identity configured — applying fallback ad-hoc signature.");
    execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn("[notarize] Skipping — APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID not set.");
    return;
  }

  console.log(`[notarize] Notarizing ${appName}…`);
  await notarize({
    appBundleId: "com.polarisahmadi.desktop",
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
  console.log("[notarize] Done.");
};
