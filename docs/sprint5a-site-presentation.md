# Sprint 5A — Site Presentation and Media

Sprint 5A adds operational site presentation management without changing the core multi-site, template, page-engine, or legacy compatibility architecture.

## Backend

### Asset library

Assets are now first-class records tied to `siteId`.

Routes:
- `GET /admin/assets`
- `POST /admin/assets`
- `PATCH /admin/assets/:assetId`
- `DELETE /admin/assets/:assetId`

Behavior:
- all asset operations are scoped by the active admin site context
- uploads reuse the existing upload path and now create an `Asset` record
- asset deletion also clears matching `logoUrl` and `faviconUrl` references from `SiteSettings`

Stored asset metadata:
- `id`
- `siteId`
- `url`
- `filename`
- `mimeType`
- `size`
- `altText`
- `createdAt`
- `updatedAt`

### Site settings, theme, and navigation

Site presentation remains centered on `SiteSettings`.

Added structured fields:
- `primaryNavigation`
- `footerNavigation`

Theme remains inside `SiteSettings.theme` and is constrained to:
- `primaryColor`
- `accentColor`
- `backgroundColor`
- `textColor`
- `buttonRadius`

Admin routes:
- `GET /admin/site-settings`
- `PATCH /admin/site-settings`
- `GET /admin/site-settings/navigation`
- `PATCH /admin/site-settings/navigation`

Public routes:
- `GET /public/site`
- `GET /public/site/settings`
- `GET /public/site/theme`
- `GET /public/site/navigation`

Behavior:
- admin routes always resolve the current site from request context
- public routes always resolve the site through the existing public site middleware
- public navigation resolves page-backed items to slugs and filters out unpublished page references
- public routes return deterministic empty values for optional fields instead of failing

### Validation

Validation is explicit and typed for:
- site settings payloads
- theme tokens
- navigation items
- asset metadata updates

Navigation rules:
- flat lists only
- each item must have a `label`
- each item must reference either `pageKey` or `href`
- `href` must start with `/`, `http://`, or `https://`
- page-backed references are validated against the current site's supported pages

## Frontend

### Admin surfaces

Added a new admin page:
- `/admin/site-settings`

The page provides four tabs:
- `Settings`
- `Theme`
- `Navigation`
- `Assets`

Behavior:
- reloads when the active admin site changes
- uses backend-owned site context
- does not require a full reload after site switch

### Public wiring

Public site presentation now reads from the new public site endpoints.

Updated consumers:
- navigation/header
- footer
- theme application
- favicon
- site title / SEO title fallback

Important behavior:
- public components no longer mask real API state with hardcoded branding when site data exists
- hardcoded fallback is only used before any site presentation data is available at all

## Deferred

Not included in Sprint 5A:
- custom domains
- DNS verification
- preview tokens
- freeform CSS editing
- nested navigation trees
- asset folders/tagging

Those remain Sprint 5B or later concerns.
