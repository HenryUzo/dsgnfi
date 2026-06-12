# Storage

DSGNFI stores two classes of files.

Public files:
- CMS uploaded assets.
- Template-import assets.
- Images and media used by published public pages.

Private files:
- AI prefill uploaded briefs.
- Documents used only for AI analysis.

Private files must not be served from `/uploads`. The current implementation stores local private files outside the public upload root and returns no public URL for them.
AI prefill raw files are retained for 30 days by default and can be deleted immediately from the admin review flow while keeping generated suggestions and audit history.

## Local Development

Default configuration:

```env
STORAGE_PROVIDER=local
UPLOADS_DIR=./uploads
STORAGE_LOCAL_PUBLIC_DIR=
STORAGE_LOCAL_PRIVATE_DIR=
```

When `STORAGE_LOCAL_PUBLIC_DIR` is empty, public files use `UPLOADS_DIR` or `server/uploads`. Existing `/uploads/...` files remain compatible.

When `STORAGE_LOCAL_PRIVATE_DIR` is empty, private files use a sibling private directory outside the public upload root.

## S3/R2-Compatible Production

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_FORCE_PATH_STYLE=false
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_PUBLIC_BASE_URL=https://cdn.example.com
```

S3 credentials are required only when `STORAGE_PROVIDER=s3`. Do not commit them.

Storage smoke testing has passed against a real R2/S3 bucket for:

- public asset upload and delete
- private AI prefill upload and signed/server-side read
- object cleanup after delete

Public asset delivery still depends on `STORAGE_PUBLIC_BASE_URL` pointing to a real public asset host or custom domain.

## Compatibility

Existing `Asset.url` values are preserved and still render. New uploads add storage metadata such as provider, key, bucket, visibility, and checksum. The migration is additive.

AI prefill artifacts are stored as private objects with persisted metadata and are cleaned up after expiry. Suggestions remain draft-only and are never published automatically.
