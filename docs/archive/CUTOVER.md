# v1.0.0 cutover runbook

## Pre-release

1. Tag `shared-types@v1.0.0` and publish npm package.
2. Bump `@polaris/shared-types` in web and mobile.
3. Deploy `backend-api` container with `AUTH_DISABLED=false` and Supabase secrets.
4. Run `alembic upgrade head` and `scripts/migrate_sqlite_to_postgres.py` on staging.
5. Deploy web to Vercel; smoke test all routes in `app/(app)/`.

## Release

1. Tag all four repos `v1.0.0` on the same day.
2. Publish Electron artifacts from `web-frontend` workflow.
3. Run EAS production build for mobile.

## Archive source

Update [CyberA183/polaris_ahmadi](https://github.com/CyberA183/polaris_ahmadi) README:

```markdown
# Archived

Development continues in:

- https://github.com/POLARIS-Ahmadi-OFFICIAL/backend-api
- https://github.com/POLARIS-Ahmadi-OFFICIAL/web-frontend
- https://github.com/POLARIS-Ahmadi-OFFICIAL/mobile-development
- https://github.com/POLARIS-Ahmadi-OFFICIAL/shared-types
```

Mark repository read-only in GitHub settings.

## Rollback

Redeploy previous container image and Vercel deployment; restore Postgres snapshot if migration was applied.
