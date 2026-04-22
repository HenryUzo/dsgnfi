# Sprint 4 — Legacy Route Compatibility

## Summary
- `/admin/process/*` now uses the page engine as the canonical source for `pageKey = "process"`.
- `/public/process/*` serves published page-engine content first, then falls back to published legacy `CmsSection` content.
- `/admin/work/*` and `/public/work/*` keep the current route contracts and Prisma schema, but now run through explicit site-scoped services.
- `/public/cms/*` remains backward-compatible and site-aware, but now prefers page-engine content for the explicit mapping `page=process&section=content`.

## Process strategy
- Canonical process storage is `Page` + `PageRevision`.
- Existing process payloads are preserved.
- A dedicated process compatibility validator allows:
  - legacy process-specific blocks
  - the existing process-compatible generic blocks already used by the frontend process templates
- Admin process reads lazily bridge legacy `CmsSection(page="process", section="content")` draft/published content into the page engine when needed.
- Public process reads do not mutate legacy storage; they read page-engine published content first and legacy published content second.

## Work strategy
- No schema migration was added.
- `WorkPageMeta`, `WorkTag`, `WorkProject`, and `WorkProjectTag` remain the source of truth.
- New services centralize:
  - site-scoped admin reads/writes
  - site-scoped public published-only delivery
  - tag validation and tag-isolation rules

## Public CMS behavior
- `/public/cms/section?page=process&section=content`
  - returns published process content from the page engine when available
  - otherwise returns published legacy process `CmsSection` content
- all other public CMS requests still read site-scoped legacy `CmsSection`

## Deferred
- No destructive migration of legacy process content
- No generic collection schema for work
- No section-to-block mapping beyond the explicit process compatibility path
