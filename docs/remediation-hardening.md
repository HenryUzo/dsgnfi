# Remediation Hardening Pass

This pass implements the first slice of the architectural review recommendations without rewriting the platform.

## Implemented

- Added non-breaking API error metadata: `error.code` and optional `error.fieldErrors` while preserving `error.message`.
- Made site creation fail fast when a requested template is invalid or inactive.
- Wrapped site creation and page revision pointer updates in transaction helpers so partial writes are avoided in normal Prisma execution.
- Added route-level RBAC middleware using the existing `req.context.membershipRole`.
- Applied OWNER/ADMIN gates to site/settings/assets/domains/preview/audit mutations and OWNER/ADMIN/EDITOR gates to content mutations.
- Public navigation now hides internal page links until the referenced page has a published revision.
- Upload write/delete paths now use the same configured uploads directory.
- Public published routes can use short cache headers; admin/auth/preview routes remain `no-store`.
- Frontend API errors now carry status, code, and field errors.
- Create Site is now a guided flow: template, identity, review, success.
- Site Settings warns about unpublished navigation links and unsaved settings/navigation changes.
- Added a local/CI secret scan script and removed live-looking secrets from tracked env files.

## Current role policy

- OWNER/ADMIN: manage sites, settings, navigation, assets, domains, preview links, and audit logs.
- OWNER/ADMIN/EDITOR: save and publish content for pages, CMS compatibility routes, process, and work.
- VIEWER: read-only admin access where routes support reads.

## API compatibility

Existing response envelopes are preserved. New metadata is additive:

```json
{
  "ok": false,
  "error": {
    "code": "site_validation_failed",
    "message": "Please correct the highlighted fields.",
    "fieldErrors": {
      "slug": ["Site slug already exists for this tenant."]
    }
  }
}
```

## Required human actions

- Rotate the Resend key, Vercel OIDC token, database password, JWT secret, and any seeded admin passwords that were previously committed or shared.
- Decide whether to rewrite Git history for tracked secrets. This pass removes/replaces current tracked values but does not rewrite history.
- Recreate local untracked `.env` files with real local values after rotation.

## Deferred

- PostgreSQL row-level security.
- Object storage/CDN migration for assets.
- Full admin design system cleanup.
- Optimistic concurrency and diff views for page publish/restore.
