# web-frontend

POLARIS web UI (Next.js) and desktop shell (Electron).

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 — requires [backend-api](../backend-api) on port 8080 for live health check.

### Run API + web + mobile together

From this repo (starts backend on :8080, Next on :3000, Expo):

```bash
# Ensure backend venv exists: cd ../backend-api && python3 -m venv .venv && pip install -e ".[dev]"
npm run dev:stack
```

## Production (Vercel + Railway)

Vercel hosts this app only. Deploy the API separately — see [backend-api/docs/DEPLOY-RAILWAY.md](../backend-api/docs/DEPLOY-RAILWAY.md).

In Vercel → **Environment Variables**:

```bash
NEXT_PUBLIC_API_URL=https://<your-railway-domain>
```

Add the same Vercel URL to the backend `CORS_ORIGINS` on Railway.

### Auth

- App opens at **`/login`** first (GitHub via Supabase, or **Skip (dev)** with a bypass cookie).
- Add redirect URL in Supabase: `http://localhost:3000/auth/callback`.
- API calls from the browser use same-origin `/api/v1/*` (proxied to the backend by `next.config.ts`).
- LLM providers: **Qwen** (Hugging Face) and **Google Gemini** in Settings → General.

## Desktop (Electron)

**Development** (Next dev server + Electron window):

```bash
npm run dev:desktop
```

**Production installers** (bundles Next.js; run on each OS):

```bash
# Set API URL before building (see docs/DESKTOP-BUILD.md)
export NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
npm run build:desktop:mac   # macOS — .dmg + .zip in dist-electron/
npm run build:desktop:win   # Windows — NSIS + portable .exe
```

Full guide: **[docs/DESKTOP-BUILD.md](./docs/DESKTOP-BUILD.md)**. Tag `v*` pushes build both via GitHub Actions.

## Deploy

Vercel for web; Railway (or similar) for API; GitHub Releases for desktop builds.
