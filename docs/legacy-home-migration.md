# Legacy Home Migration Preview

This workflow lets an admin generate a block-editor draft proposal from legacy `CmsSection` homepage content without changing the live site.

## Safety guarantees

- Legacy `CmsSection` records are never modified or deleted.
- Preview generation does not create a `PageRevision`.
- Applying the preview creates a new modern **draft** revision only.
- Published page revisions stay unchanged until a normal publish action is used.
- Legacy content changes invalidate older previews through a deterministic source fingerprint.

## Routes

- `POST /admin/pages/home/legacy-migration/preview`
- `POST /admin/pages/home/legacy-migration/apply`
- `POST /admin/pages/home/legacy-migration/cancel`

All routes require admin auth, site context, and a write-capable role.

## Supported mappings

The migration service inspects the current modern home page and chooses explicit mappings based on the block types that page allows.

### Generic starter blocks

- `hero` -> `hero`
- `services` -> `features`
- `featuredWork` -> `gallery` using scoped work projects
- `faq` -> `faq`
- `cta` -> `cta`
- `testimonials` -> `richText`
- `awards` -> `stats`

### Blit imported home blocks

- `hero` -> `blitHeroCollage`
- `services` -> `blitCapabilitiesGrid`
- `featuredWork` -> `blitFeaturedWork`
- `cta` -> `blitFinalStatement`
- `testimonials` -> `blitEditorialStatement`

If the current template does not allow the needed block type, the section is reported as unsupported instead of being guessed.

## Unsupported and lossy cases

- Legacy fields that do not exist on the target block are surfaced in the preview.
- Example: legacy CTA links become warnings when the target is `blitFinalStatement`, because that block is text-only.
- Unsupported sections remain in the legacy editor and are not removed.

## Fingerprint behavior

Previews include `sourceFingerprint`, a SHA-256 hash of the scoped legacy home section state:

- section keys
- draft and published JSON
- section status
- updated timestamps
- published timestamps

If any legacy section changes after preview generation, apply is rejected with `LEGACY_MIGRATION_SOURCE_CHANGED`.

## Revision history and rollback

- Applying a migration uses the normal page draft save flow.
- The previous modern draft remains in revision history.
- Rollback uses the existing page revision restore flow.

## Publishing

Migration preview does not publish. After applying:

1. review the generated draft in the block editor
2. adjust unsupported or lossy areas manually
3. publish with the normal page publish control when ready
