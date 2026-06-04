# POLARIS desktop app (Electron)

The desktop build bundles the **Next.js standalone server** inside Electron. On launch, the app starts that server locally and opens the UI in a window. API calls still go through the Next proxy to your backend (`NEXT_PUBLIC_API_URL`).

## Prerequisites

- Node.js 22+
- **macOS** to build `.dmg` / `.zip`
- **Windows** to build `.exe` (NSIS installer + portable)
- Backend API reachable from the machine (local `:8080`, Railway, etc.)

## Configure before build

Bake production URLs into the client at build time:

```bash
export NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
export NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Optional: default login redirect base (desktop uses 127.0.0.1 at runtime)
export NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Add Supabase redirect URL for desktop (use the port shown in dev, or configure after first run):

- `http://127.0.0.1:<port>/auth/callback` (port is chosen dynamically in the packaged app)

For local backend testing:

```bash
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
```

## Build commands

From `web-frontend`:

```bash
npm install

# Current platform only
npm run build:desktop

# macOS (DMG + ZIP) — run on a Mac
npm run build:desktop:mac

# Windows (NSIS + portable) — run on Windows (recommended)
npm run build:desktop:win
```

Artifacts land in **`dist-electron/`**:

| Platform | Files |
|----------|--------|
| macOS | `POLARIS-x.x.x.dmg`, `POLARIS-x.x.x-mac.zip` |
| Windows | `POLARIS Setup x.x.x.exe`, `POLARIS x.x.x.exe` (portable) |

## Development (no installer)

Terminal 1 — backend (optional if using remote API):

```bash
cd backend-api && uvicorn app.main:app --reload --port 8080
```

Terminal 2 — desktop dev:

```bash
cd web-frontend
cp .env.example .env.local
npm run dev:desktop
```

This runs Next dev on `:3000` and opens Electron pointed at it.

## Test bundled server without installer

```bash
ELECTRON_DESKTOP_BUILD=1 npm run build
npm run prepare:standalone
ELECTRON_USE_BUNDLED_SERVER=1 electron .
```

## GitHub Releases (CI)

Push a version tag to build both platforms in CI:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow uploads macOS and Windows artifacts to the GitHub Release (requires repo `secrets` / variables for API URL if you customize the workflow).

## Notes

- **Code signing**: macOS/Windows may warn on unsigned builds. For distribution, add Apple Developer / Authenticode certificates in `electron-builder` config.
- **Auto-update**: set `ELECTRON_AUTO_UPDATE=true` and configure `publish` in `package.json` when you publish to GitHub Releases.
- **Size**: The installer includes the Next standalone `node_modules` bundle (~hundreds of MB).
