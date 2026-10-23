# web-frontend

POLARIS web UI (Next.js) and desktop app (Electron).

New to POLARIS? Start with the [onboarding guide](https://github.com/POLARIS-Ahmadi-OFFICIAL/.github/blob/main/ONBOARDING.md).

## Development

Requires **Node.js 22+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` points at the production API on Render. For local work set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080` in `.env.local`.

Open http://127.0.0.1:3000. Live data needs [backend-api](https://github.com/POLARIS-Ahmadi-OFFICIAL/backend-api) on port 8080.

### Run API + web + mobile together

Clone `backend-api` and `mobile-development` next to this repo, create the backend venv (`cd ../backend-api && python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"`), then:

```bash
npm run dev:stack
```

This starts the API on `:8080`, Next on `:3000`, and Expo, with prefixed logs.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next dev server on 127.0.0.1:3000 |
| `npm run lint` | ESLint (runs in CI) |
| `npm run build` | Production build (runs in CI) |
| `npm run dev:stack` | API + web + mobile together |
| `npm run dev:desktop` | Next dev + Electron window |
| `npm run build:desktop:mac` / `:win` | Desktop installers (see below) |

## App layout

| Path | Contents |
|------|----------|
| `app/(auth)/`, `app/auth/` | Login page and Supabase OAuth callback |
| `app/(app)/` | Signed-in pages: `home`, `dashboard` (Analytics), `workflow`, `agents/*` (literature, hypothesis, experiment, curve-fitting, ml-models, analysis), `phase-mapper`, `tools/watcher`, `tools/mcp`, `settings`, `history` |
| `components/` | Shared UI; `AppNav.tsx` defines the sidebar |
| `lib/` | API client helpers (`api-path.ts` mirrors the shared-types contract), Supabase setup |
| `electron/` | Desktop main process, packaging resources, macOS Gatekeeper helper |
| `scripts/` | dev-stack and desktop build scripts |
| `docs/superpowers/` | Design specs and implementation plans for major features |

## Production (Vercel + Render)

Vercel hosts this app only. The API runs on Render; see [backend-api/docs/DEPLOY.md](https://github.com/POLARIS-Ahmadi-OFFICIAL/backend-api/blob/main/docs/DEPLOY.md).

In Vercel → **Environment Variables**:

```bash
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
```

Add the same Vercel URL to the backend `CORS_ORIGINS`.

### Auth

- The app opens at **`/login`** first (GitHub via Supabase, or **Skip (dev only)** with a bypass cookie).
- Add redirect URL in Supabase: `http://localhost:3000/auth/callback`.
- Browser API calls use same-origin `/api/v1/*`, proxied to the backend by `next.config.ts`.
- LLM providers: **Qwen** (Hugging Face) and **Google Gemini** in Settings → General.

## Desktop (Electron)

```bash
npm run dev:desktop          # development
npm run build:desktop:mac    # macOS: .dmg + .zip in dist-electron/
npm run build:desktop:win    # Windows: NSIS + portable .exe
```

Full guide: **[docs/DESKTOP-BUILD.md](./docs/DESKTOP-BUILD.md)**. Pushing a `v*` tag builds both platforms in GitHub Actions and attaches them to a GitHub Release.

## Deploy summary

Vercel for web, Render for the API, GitHub Releases for desktop builds. Historical runbooks (v1.0.0 cutover) are in [docs/archive/](./docs/archive/).
