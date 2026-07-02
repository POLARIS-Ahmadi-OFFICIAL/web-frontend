const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
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
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  });
  console.log("[notarize] Done.");
};
