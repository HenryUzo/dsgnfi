# Frontend Compatibility Wiring

This pass aligns the existing frontend with the current Sprint 2–4 backend behavior without changing backend contracts or rewriting the app shell.

## What Was Rewired

- Admin site switching now remains driven by `/auth/switch-site` and the authenticated admin context.
- Admin pages reload their site-scoped data from `admin.currentSite.id` instead of assuming a single-site session.
- Public process now reads `/public/process/content` as the canonical source.
- Public CMS section consumers now distinguish between:
  - content present
  - content empty (`200` with `data: null`)
  - request error
- Public work keeps using the published-only work endpoints, but the page load is now centralized in a dedicated hook.

## Empty State Semantics

- `GET /public/process/content`
  - `200` with `data: null` is treated as “no published process content yet”
  - the UI shows an explicit empty state instead of fake fallback content
- `GET /public/cms/section`
  - `200` with `data: null` is treated as an empty CMS section
  - section consumers must decide whether to render nothing or local defaults

## Current Frontend Assumptions

- Public process uses the direct process endpoint, not `/public/cms/section?page=process&section=content`.
- Navigation, theme, and featured-work CMS consumers still use `/public/cms/section`, but now handle empty content honestly.
- Work admin remains on the current editor UI and schema, with clearer conflict handling for site-scoped tag and project mutations.

## Manual QA Checklist

1. Log in and switch sites from the admin header while on:
   - `/admin`
   - `/admin/pages/home`
   - `/admin/work`
   - `/admin/process`
2. Confirm the current site label updates immediately and each screen reloads its site-scoped data.
3. On `/process`, confirm:
   - published content renders when present
   - an explicit empty state appears when the backend returns `200` with `data: null`
4. On `/work`, confirm:
   - only published projects appear publicly
   - missing projects show the not-found view
5. In `/admin/work`, confirm:
   - tag/project changes refresh after save/publish/duplicate
   - duplicate slug/tag conflicts show actionable messages

## Deferred

- No React Query/TanStack migration was introduced.
- No redesign of the Process or Work UIs was done.
- Legacy public CMS consumers outside the existing section hooks were not expanded into a broader data layer.
