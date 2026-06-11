# DSGNFI CMS

DSGNFI is a multi-site CMS for building and managing editable marketing websites. It includes a React public frontend, a protected admin workspace, a Prisma/Postgres API, starter and imported templates, page revisions, assets, domains, contact submissions, and OpenAI-assisted admin guidance and draft prefill.

## Architecture

- `app/`: React 19 + Vite frontend. Public routes render the active site; protected `/admin/*` routes provide the CMS workspace.
- `server/`: Express API with Prisma/Postgres. Route groups cover auth, public site data, pages, templates, assets, domains, work, process, previews, contact, and AI.
- `server/prisma/schema.prisma`: database schema for tenants, sites, memberships, templates, pages/revisions, assets, domains, audits, work projects, contact submissions, and AI prefill records.
- `.github/workflows/ci.yml`: CI runs secret scanning plus server and app verification through the root scripts.

## Local Setup

Install root, server, and app dependencies:

```bash
npm ci
npm --prefix server ci
npm --prefix app ci
```

Create local environment files from examples where available:

```bash
cp server/.env.example server/.env
cp app/.env.example app/.env.local
```

Do not commit `.env`, `.env.local`, uploads, logs, screenshots, or dependency folders.

## Environment Variables

Server:

- `DATABASE_URL`: Postgres connection string.
- `JWT_SECRET`: strong secret used to sign admin auth cookies.
- `CORS_ORIGIN`: comma-separated frontend origins, for example `http://localhost:5174`.
- `FRONTEND_ORIGIN`: optional public frontend origin used in generated links.
- `BACKEND_ORIGIN`: optional API origin used in generated links.
- `OPENAI_API_KEY`: optional for local development, required for live AI responses.
- `OPENAI_MODEL`: optional, defaults to `gpt-5-mini`.
- `UPLOADS_DIR`: optional legacy/local public upload directory override.
- `STORAGE_PROVIDER`: `local` by default, or `s3` for S3/R2-compatible object storage.
- `STORAGE_PUBLIC_BASE_URL`: optional CDN/public base URL for public CMS and template-import assets.
- `STORAGE_LOCAL_PUBLIC_DIR`: optional local public storage directory. Defaults to `UPLOADS_DIR` or `server/uploads`.
- `STORAGE_LOCAL_PRIVATE_DIR`: optional local private storage directory for AI prefill briefs. Defaults outside the public upload root.
- `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`: required only when `STORAGE_PROVIDER=s3`.
- `DEFAULT_TENANT_SLUG`, `DEFAULT_SITE_SLUG`: local/default site resolution values.
- `ALLOW_DEV_SITE_QUERY_OVERRIDE`: enables `?site=` style development overrides outside production.

App:

- `VITE_API_BASE_URL`: API base URL. Leave empty when the app and API are served from the same origin.

Any real credentials previously committed to Git should be rotated.

## Database

Generate Prisma client and apply local migrations:

```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
```

Bootstrap a local database with admin and templates:

```bash
npm --prefix server run bootstrap:local
```

Individual seed commands:

```bash
npm --prefix server run seed:admin
npm --prefix server run seed:templates
npm --prefix server run seed:work
```

## Development Commands

Run the API:

```bash
npm --prefix server run dev
```

Run the frontend:

```bash
npm --prefix app run dev
```

If CORS blocks a local port, update `CORS_ORIGIN` in `server/.env` and restart the API.

## Verification

Root checks:

```bash
npm run scan:secrets
npm run verify:server
npm run verify:app
```

Focused commands:

```bash
npm --prefix server run typecheck
npm --prefix server run test
npm --prefix app run typecheck
npm --prefix app run test:stable
npm --prefix app run build
```

On Windows, Vitest thread-pool execution can hit process-spawn restrictions in some sandboxes. Re-run outside the sandbox if `spawn EPERM` appears.

## AI Setup

The admin AI guide and document-to-page prefill use the OpenAI API from the server only. Add `OPENAI_API_KEY` to `server/.env` or the deployment environment. Do not expose OpenAI credentials through Vite or client-side variables.

AI guide chat is read-only. AI prefill suggestions are draft-only and require explicit review, apply, save, and publish actions by an admin.

AI prefill brief files are private storage objects. They are not served from `/uploads` and should only be exposed later through short-lived signed URLs if an admin download/preview flow is added.

## Storage

The server uses a storage abstraction for public CMS uploads, template-import assets, and private AI prefill brief artifacts.

Local development uses `STORAGE_PROVIDER=local`. Public files are written under `STORAGE_LOCAL_PUBLIC_DIR`, or `UPLOADS_DIR`, and are served through `/uploads`. Existing URL-only asset records still render through the old `/uploads` path.

Private files, currently AI prefill briefs, are written under `STORAGE_LOCAL_PRIVATE_DIR` and are not mounted with `express.static`. Do not place private storage under the public upload root.

Production should use `STORAGE_PROVIDER=s3` with an S3/R2-compatible bucket. Public CMS assets can be served through `STORAGE_PUBLIC_BASE_URL`; private AI prefill artifacts should stay private and use signed reads only when needed by the server.

## Template Import Notes

The server can import supported React/Vite template bundles and map them into editable CMS page blocks. The Blit Studio importer copies bundle assets through the configured public storage provider, creates a custom template, and maps pages such as home, works, studio, contact, unfolded, and case studies.

Imported templates are editable through the block-based Page Editor. Legacy CMS section routes remain for compatibility.

## Known Limitations

- Some legacy CMS section editing still exists for backwards compatibility.
- Local filesystem storage is acceptable for development and small internal demos. Production should use S3/R2-compatible object storage with private AI prefill artifacts and public CMS asset delivery through a CDN-compatible base URL.
- Contact submissions are stored but do not yet include an admin inbox or email notification workflow.
- Domain verification stores DNS instructions and status, but does not automate DNS provider changes.
- AI output quality depends on the configured model and uploaded brief quality; admins must review suggestions before saving.
- Public fallbacks exist for older routes when no CMS page is published for a slug.
