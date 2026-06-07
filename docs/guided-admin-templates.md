# Guided Admin UX and Custom Templates

## Scope
This pass improves operator guidance in the admin and adds tenant-scoped custom
templates without turning DSGNFI into a page builder.

## What changed

### Guided admin flow
- The admin shell now keeps `site`, `tenant`, and `role` more visible.
- The dashboard now shows site readiness and the next recommended task.
- The sites screen now shows readiness, template lineage, and template drift state.
- The home, process, and work editors now call out draft/publish behavior more
  explicitly.
- The site creation wizard now only offers active templates and explains the
  next post-create steps more clearly.

### Custom templates
- Templates now distinguish between:
  - `STARTER`
  - `CUSTOM`
- Custom templates are tenant-scoped and inherit from a starter template.
- Template draft defaults are stored as validated preset overrides, not raw
  arbitrary manifests.
- New admin routes:
  - `POST /admin/templates`
  - `PATCH /admin/templates/:templateId`
  - `POST /admin/templates/:templateId/publish`
  - `GET /admin/templates/:templateId/usages`
- `GET /admin/templates` now accepts `scope=all|starter|custom`.

### Custom template editing surface
- New admin route and page:
  - `/admin/templates`
- Operators can:
  - browse starter and custom templates
  - create a custom template from a starter template
  - clone an existing site into a custom template
  - edit overview, brand defaults, navigation defaults, module toggles, and
    starter page metadata
  - publish a new template version
  - inspect which sites use the template

### Template-approved pages
- Sites now have a dedicated admin route:
  - `/admin/pages`
- Operators can:
  - review the current site page inventory
  - add new pages only from the template-approved page catalog
  - edit generic page-engine pages through `/admin/pages/:pageKey`
  - publish those pages and link them from site navigation
- Public delivery now supports published page lookups by slug through:
  - `GET /public/pages/by-slug?slug=/your-page`

## Important behavior
- Publishing a template affects **new sites only**.
- Existing sites are not silently overwritten.
- Public navigation still hides internal links whose target page is not
  published.
- Starter block structure stays constrained by the base starter manifest.
- New custom pages cannot take over reserved public routes such as `/work`,
  `/process`, `/studio`, `/insights`, or `/admin`.

## Current limitation
- First-pass block-level starter content customization is handled through
  **clone from existing site**.
- Direct in-template rich starter block editing is intentionally deferred so the
  system stays structured and avoids drifting into unrestricted layout editing.
- First-pass generic page editing uses constrained page-engine fields plus
  per-block JSON data editing. A richer block-form editor can be layered on top
  later without changing the underlying page contracts.
