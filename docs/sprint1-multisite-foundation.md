# Sprint 1 Multi-Site Foundation (Implemented)

## Actual backend stack
- Runtime: Node.js + Express 5 + TypeScript (`server/`)
- ORM: Prisma 7 + PostgreSQL adapter (`@prisma/adapter-pg`)
- Auth: JWT cookie (`cms_token`)
- Tests: Vitest + Supertest (added in Sprint 1)

## Architecture decision
- Sprint 1 uses application-level tenant/site scoping.
- Isolation is enforced through:
  - foreign keys and indexes
  - admin/public site-resolution middleware
  - typed request context propagation
  - explicit route/service/repository query filtering
  - smoke tests proving isolation behavior
- PostgreSQL row-level security (RLS) is intentionally not implemented in Sprint 1.
- Future hardening recommendation:
  - add database-level enforcement such as PostgreSQL RLS only after the application-level scoping layer has stabilized and route behavior is fully validated in production-like environments.

## Scope delivered
- `DSGN-001` tenant/site/membership/domain models added.
- `DSGN-002` `siteId` added to CMS/work/process persisted content models.
- `DSGN-003` default tenant/site backfill included in migration.
- `DSGN-004` admin site context middleware added and applied to admin content routes.
- `DSGN-005` public host resolution middleware added and applied to public content routes.
- `DSGN-006` `/auth/me` extended with memberships/current tenant/current site/current role.
- `DSGN-049` smoke tests added for host resolution/site isolation/auth context.

## Migrations and data backfill
- Migration file:
  - `server/prisma/migrations/20260316083000_multisite_foundation/migration.sql`
- Migration behavior:
  - Creates `Tenant`, `Site`, `Membership`, `SiteDomain`.
  - Adds `siteId` to `CmsSection`, `WorkPageMeta`, `WorkTag`, `WorkProject`.
  - Backfills existing content to default site.
  - Creates default tenant/site:
    - tenant: `Dsgnfi` (`dsgnfi`)
    - site: `Main Site` (`main`)
  - Assigns existing admins to tenant as `OWNER`.
  - Keeps `dsgnfi_random_uuid()` as persistent database infrastructure because new table `id` defaults still depend on it in migration replay.

## Route behavior notes
- Existing route families are unchanged:
  - `/auth/*`
  - `/admin/*`
  - `/public/*`
- Route contracts are kept backward-compatible.
- Content queries are now site-scoped using request context:
  - admin routes -> resolved `req.context.siteId`
  - public routes -> host/override-resolved `req.context.siteId`

## Added env vars
- `APP_BASE_DOMAIN` (optional)
- `DEFAULT_TENANT_SLUG` (default `dsgnfi`)
- `DEFAULT_SITE_SLUG` (default `main`)
- `ALLOW_DEV_SITE_QUERY_OVERRIDE` (default `true` in current env parsing)

`server/.env.example` has been updated.

## Local commands
- Generate Prisma client:
  - `cd server && npx prisma generate`
- Run migration:
  - `cd server && npm run prisma:migrate`
- Seed admin (now ensures default tenant/site membership):
  - `cd server && npm run seed:admin`
- Seed work sample data (site-scoped):
  - `cd server && npm run seed:work`
- Typecheck:
  - `cd server && npm run typecheck`
- Smoke tests:
  - `cd server && npm test`

## Local host testing
- Public host resolution order:
  1. `SiteDomain.hostname`
  2. `*.localhost` subdomain slug in dev
  3. dev overrides (`x-site-slug` or `?site=slug`) when enabled
  4. configured default site fallback
- Example dev override:
  - `GET /public/cms/section?page=home&section=hero` with header `x-site-slug: main`

## Primary files changed
- Prisma:
  - `server/prisma/schema.prisma`
  - `server/prisma/migrations/20260316083000_multisite_foundation/migration.sql`
- Server bootstrap:
  - `server/src/app.ts` (new app factory)
  - `server/src/server.ts`
- Context resolution:
  - `server/src/services/siteContext.ts`
  - `server/src/middleware/withAdminSiteContext.ts`
  - `server/src/middleware/withPublicSiteContext.ts`
  - `server/src/types/express.d.ts`
- Auth:
  - `server/src/auth/jwt.ts`
  - `server/src/middleware/requireAdmin.ts`
  - `server/src/routes/auth.ts`
- Site-scoped routes:
  - `server/src/routes/cmsAdmin.ts`
  - `server/src/routes/cmsPublic.ts`
  - `server/src/routes/workAdmin.ts`
  - `server/src/routes/workPublic.ts`
  - `server/src/routes/processAdmin.ts`
  - `server/src/routes/processPublic.ts`
- Seeds:
  - `server/src/scripts/seedAdmin.ts`
  - `server/src/scripts/seedWork.ts`
- Tests:
  - `server/tests/multisite.smoke.test.ts`
  - `server/vitest.config.ts`
  - `server/package.json`
