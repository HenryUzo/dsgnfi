# Sprint 3 — Revisioned Page Engine

## Stack Reality
- Backend: Node.js + Express 5 + TypeScript under `server/`
- ORM: Prisma 7 with PostgreSQL
- Auth: JWT cookie auth
- Site scoping: Sprint 1 request context middleware
- Templates: Sprint 2 hybrid template registry (database metadata + code manifests)

## What Sprint 3 Adds
- New site-scoped `Page` model with stable `pageKey` identity
- New immutable `PageRevision` model for draft/published history
- Template-driven supported page definitions and default blocks
- Zod validation for page content and allowed block types
- New admin/public page routes
- Eager starter page creation when a site is created

## Schema Changes
- Added `PageStatus` enum
- Added `PageRevisionState` enum
- Added `Page`
- Added `PageRevision`
- Added reverse relations from `AdminUser` to created/published revisions

## Route Additions
### Admin
- `GET /admin/pages`
- `GET /admin/pages/:pageKey/draft`
- `PUT /admin/pages/:pageKey/draft`
- `POST /admin/pages/:pageKey/publish`
- `GET /admin/pages/:pageKey/history`
- `POST /admin/pages/:pageKey/restore/:revisionId`

### Public
- `GET /public/pages/:pageKey`

## Revision Behavior
- One stable `Page` exists per `siteId + pageKey`
- Draft save creates a new `DRAFT` revision snapshot
- Publish creates a new `PUBLISHED` revision snapshot
- Restore copies a historical revision into a new `DRAFT` revision
- Published history is not mutated in place
- Initial `schemaVersion` is `1`

## Starter Page Strategy
- Starter pages are created eagerly during `POST /admin/sites`
- Source of truth is the assigned template manifest
- Base required pages:
  - `home`
  - `about`
  - `contact`
- Optional pages:
  - `process` when `processEnabled = true`
  - `work` shell when `workEnabled = true`

## Validation Rules
- Top-level content shape must be:
  - `{ "blocks": [...] }`
- Each block must include:
  - `id`
  - `type`
  - `data`
- Allowed block types in Sprint 3:
  - `hero`
  - `richText`
  - `features`
  - `faq`
  - `cta`
  - `contact`
  - `stats`
  - `gallery`
- Unknown block types are rejected
- Blocks not allowed for the page/template are rejected
- Public delivery returns published content only

## Deferred to Sprint 4
- Bridging or migrating existing `CmsSection` content into the page engine
- Moving `work` and `process` modules onto the generic page engine
- Preview tokens and richer public preview behavior
- Any visual page builder or unrestricted block DSL

## Files Changed
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260405100000_sprint3_page_engine/migration.sql`
- `server/src/templates/types.ts`
- `server/src/templates/pageDefaults.ts`
- `server/src/templates/manifests/agencyStarter.ts`
- `server/src/templates/manifests/clinicStarter.ts`
- `server/src/templates/manifests/schoolStarter.ts`
- `server/src/templates/manifests/restaurantStarter.ts`
- `server/src/templates/manifests/realEstateStarter.ts`
- `server/src/templates/manifests/logisticsStarter.ts`
- `server/src/services/pageCatalog.ts`
- `server/src/services/pageValidation.ts`
- `server/src/services/pageAdmin.ts`
- `server/src/services/pagePublic.ts`
- `server/src/services/sitesAdmin.ts`
- `server/src/routes/pagesAdmin.ts`
- `server/src/routes/pagesPublic.ts`
- `server/src/app.ts`
- `server/tests/sprint2.admin.test.ts`
- `server/tests/sprint3.pages.test.ts`
