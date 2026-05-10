# Sprint 6 — Release Stabilization & Deployment Readiness

## Scope

This sprint hardens operational behavior without adding new product scope.

Focus areas:

- environment/config normalization
- migration and seed bootstrap clarity
- health/readiness diagnostics
- preview/domain/runtime safety checks
- audit visibility for recent site actions
- stable test commands and CI
- release and rollback runbook

## Environment Matrix

### Server

Required for all environments:

- `PORT`
- `CORS_ORIGIN`
  - defaults to `http://localhost:5174` for local development when unset
  - should be explicit in staging/production
- `DATABASE_URL`
- `JWT_SECRET`

Operationally important:

- `FRONTEND_ORIGIN`
  - canonical browser origin for preview URL generation
  - should be set in production
- `BACKEND_ORIGIN`
  - canonical backend/API origin for deployment docs and readiness checks
  - should be set in production
- `APP_BASE_DOMAIN`
  - required for managed DSGNFI subdomains in production
- `UPLOADS_DIR`
  - optional override for asset storage path
- `DEFAULT_TENANT_SLUG`
- `DEFAULT_SITE_SLUG`
- `ALLOW_DEV_SITE_QUERY_OVERRIDE`
  - development-only convenience
  - must be `false` in production

Seeding:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_WORK_TAG_NAME`
- `SEED_WORK_TAG_SLUG`
- `SEED_WORK_PROJECT_TITLE`
- `SEED_WORK_PROJECT_SLUG`
- `SEED_WORK_TEMPLATE_ID`

### Frontend

Required:

- `VITE_API_BASE_URL`

Example local value:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Bootstrap Order

Local bootstrap:

```powershell
cd C:\Websites\dsgnfi\server
npm run bootstrap:local
```

That command runs:

1. `npm run prisma:generate`
2. `npm run prisma:migrate`
3. `npm run seed:admin`
4. `npm run seed:templates`

Optional sample work data:

```powershell
cd C:\Websites\dsgnfi\server
npm run seed:work
```

Recommended frontend bootstrap:

```powershell
cd C:\Websites\dsgnfi\app
npm install
```

## Stable Verification Commands

Backend:

```powershell
cd C:\Websites\dsgnfi\server
npm run verify
```

Frontend:

```powershell
cd C:\Websites\dsgnfi\app
npm run verify
```

Repository root:

```powershell
cd C:\Websites\dsgnfi
npm run verify:server
npm run verify:app
```

## Runtime Diagnostics

### `GET /health`

Purpose:

- confirms the process is alive

Typical response:

```json
{
  "ok": true,
  "service": "dsgnfi-cms-api",
  "environment": "development"
}
```

### `GET /ready`

Purpose:

- confirms the API is ready enough to serve traffic
- checks database connectivity
- checks configuration safety expectations

Typical success response:

```json
{
  "ok": true,
  "service": "dsgnfi-cms-api",
  "environment": "development",
  "checks": {
    "config": "ok",
    "database": "ok"
  },
  "issues": [],
  "summary": {
    "nodeEnv": "development",
    "frontendOriginConfigured": true,
    "backendOriginConfigured": true,
    "appBaseDomainConfigured": false,
    "uploadsDirConfigured": false,
    "allowDevSiteQueryOverride": true,
    "corsOriginCount": 2
  }
}
```

Failure semantics:

- returns `503` when configuration is unsafe for the current environment or the database is unavailable
- never exposes secrets

## Audit Visibility

Admin-only route:

- `GET /admin/audit`

Query parameters:

- `limit`
- `action`

Behavior:

- always scoped to the current site context
- returns recent actions with actor, entity, metadata, and timestamp
- never returns raw preview tokens

Typical response:

```json
{
  "ok": true,
  "entries": [
    {
      "id": "audit-id",
      "action": "preview_token.created",
      "entityType": "preview_token",
      "entityId": "preview-id",
      "metadata": {
        "pageKey": "home",
        "expiresAt": "2026-04-07T12:00:00.000Z"
      },
      "createdAt": "2026-04-07T11:00:00.000Z",
      "actor": {
        "id": "admin-id",
        "email": "admin@dsgnfi.com"
      }
    }
  ]
}
```

## Security / Config Notes

- preview browser URLs should come from `FRONTEND_ORIGIN`
- normal public routes remain published-only
- preview content stays token-gated and revocable
- unverified custom domains do not resolve as active public hosts
- local dev default-site fallback is allowed only for local hosts
- non-local unresolved hosts return `404 Site not found.`
- uploads remain site-scoped

## Minimal CI

Workflow added:

- `C:\Websites\dsgnfi\.github\workflows\ci.yml`

Jobs:

- server: install, typecheck, test
- app: install, typecheck, `npm run test:stable`, build

## Release Runbook

### Pre-deploy

1. Confirm environment values are set from `server/.env.example` and `app/.env.example`
2. Confirm the target database is backed up
3. Run:

```powershell
cd C:\Websites\dsgnfi\server
npx prisma generate
npx prisma migrate status
```

4. Verify frontend and backend with:

```powershell
cd C:\Websites\dsgnfi
npm run verify:server
npm run verify:app
```

### Deploy order

1. deploy backend code
2. run database migrations
3. run required seeds
4. deploy frontend code
5. perform smoke checks

### Post-deploy smoke checks

1. `GET /health`
2. `GET /ready`
3. admin login
4. site switching
5. `GET /public/site`
6. preview token creation + preview render
7. domain list / verification UI
8. `GET /admin/audit`

## Rollback Guidance

### Bad migration

1. stop further deploys
2. inspect `npx prisma migrate status`
3. if the migration is additive and safe, deploy a forward fix
4. if rollback is required, restore the database from backup before re-deploying the previous app version

Do not use destructive local reset commands against shared environments.

### Broken frontend deploy

1. redeploy the previous frontend artifact
2. keep the backend running if APIs are still healthy
3. verify `GET /public/site` and admin login after rollback

### Preview or domain misconfiguration

1. verify `FRONTEND_ORIGIN`, `BACKEND_ORIGIN`, and `APP_BASE_DOMAIN`
2. verify DNS/TXT records for custom domains
3. use `GET /ready` and `GET /admin/audit` to confirm the platform state

## Known Limitations / Non-goals

- no billing or entitlement logic
- no SSL orchestration system beyond current domain verification flow
- no full analytics/audit product UI
- no destructive migration automation
