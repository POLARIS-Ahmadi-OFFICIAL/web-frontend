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

### Auth

- App opens at **`/login`** first (GitHub via Supabase, or **Skip (dev)** with a bypass cookie).
- Add redirect URL in Supabase: `http://localhost:3000/auth/callback`.
- API calls from the browser use same-origin `/api/v1/*` (proxied to the backend by `next.config.ts`).
- LLM providers: **Qwen** (Hugging Face) and **Google Gemini** in Settings → General.

## Desktop

```bash
npm run dev:desktop
```

## Deploy

Vercel for web; GitHub Releases + `electron-builder` for desktop (`npm run build:desktop`).
