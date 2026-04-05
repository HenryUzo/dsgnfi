# Sprint 2 Sites and Templates

## Backend stack
- Node.js + Express 5 + TypeScript under `server/`
- Prisma 7 + PostgreSQL
- JWT cookie auth
- Sprint 1 site context middleware reused for admin scoping

## What Sprint 2 adds
- `POST /auth/switch-site`
- `GET /admin/templates`
- `GET /admin/templates/:templateKey`
- `GET /admin/sites`
- `GET /admin/sites/:siteId`
- `POST /admin/sites`

## Schema changes
- Added `Template`
- Added `TemplateVersion`
- Added `SiteSettings`
- Extended `Site` with:
  - `templateId`
  - `templateVersionId`
- `Site.status` default is now `DRAFT` for newly created sites

## Template architecture
- Template registry metadata is stored in the database
- Template manifests remain in code under:
  - `server/src/templates/`
- Seeded starter templates:
  - `agency-starter`
  - `clinic-starter`
  - `school-starter`
  - `restaurant-starter`
  - `real-estate-starter`
  - `logistics-starter`
- Current version for all starter templates:
  - `1.0.0`

## Bootstrap
- Explicit bootstrap command:
  - `npm run seed:templates`
- The admin template/site services also call the template bootstrap idempotently before reads/writes, so the catalog self-heals if it has not been seeded yet.

## New route shapes

### `POST /auth/switch-site`
Request:
```json
{
  "siteId": "..."
}
```

Response:
```json
{
  "ok": true,
  "currentTenant": { "id": "...", "name": "...", "slug": "..." },
  "currentSite": { "id": "...", "name": "...", "slug": "...", "status": "DRAFT", "isDefault": false },
  "currentRole": "OWNER"
}
```

Behavior:
- only switches within the currently active tenant context
- persists the active site by re-issuing the JWT cookie

### `GET /admin/templates`
Response:
```json
{
  "ok": true,
  "templates": []
}
```

Optional query:
- `?category=agency`

### `GET /admin/templates/:templateKey`
Response:
```json
{
  "ok": true,
  "template": {}
}
```

### `GET /admin/sites`
Response:
```json
{
  "ok": true,
  "sites": []
}
```

### `GET /admin/sites/:siteId`
Response:
```json
{
  "ok": true,
  "site": {}
}
```

### `POST /admin/sites`
Request:
```json
{
  "name": "Clinic West",
  "slug": "clinic-west",
  "templateKey": "clinic-starter",
  "templateVersion": "1.0.0"
}
```

Behavior:
- creates the site under the active tenant
- creates `SiteSettings` from template defaults when a template is supplied
- creates a minimal `WorkPageMeta` row so existing work admin/public behavior does not start from a missing record
- does not create the generic page engine or heavy content scaffolding in this sprint

## Files changed
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260405070000_sprint2_templates_sites/migration.sql`
- `server/src/templates/types.ts`
- `server/src/templates/registry.ts`
- `server/src/templates/manifests/agencyStarter.ts`
- `server/src/templates/manifests/clinicStarter.ts`
- `server/src/templates/manifests/schoolStarter.ts`
- `server/src/templates/manifests/restaurantStarter.ts`
- `server/src/templates/manifests/realEstateStarter.ts`
- `server/src/templates/manifests/logisticsStarter.ts`
- `server/src/services/templateCatalog.ts`
- `server/src/services/sitesAdmin.ts`
- `server/src/services/siteContext.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/templatesAdmin.ts`
- `server/src/routes/sitesAdmin.ts`
- `server/src/app.ts`
- `server/src/scripts/seedTemplates.ts`
- `server/tests/sprint2.admin.test.ts`
- `server/package.json`

## Deferred to Sprint 3
- generic page engine
- mutable template schema blobs in the database
- tenant switching UX and API
- automated page/content scaffolding beyond minimal compatibility rows
