# Dsgnfi AI Studio

This is the isolated Next.js workspace for the Dsgnfi AI Studio Content + Campaign MVP.

It is separate from the older root-level `app/` and `server/` code. Work in `studio/` only.

## MVP Setup And Testing Guide

### 1. Required environment variables

Create `studio/.env.local` from `studio/.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` must be the Supabase project API URL, for example `https://<project-ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for browser and SSR usage.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- `OPENAI_API_KEY` is server-only.
- `OPENAI_MODEL` is server-only and defaults to `gpt-5-mini` if omitted in development, but it should be set explicitly in production.
- `NEXT_PUBLIC_APP_URL` should match the local or deployed origin.

### 2. Install and run locally

```bash
npm install
npm run dev
```

Local app URL:

- [http://localhost:3000](http://localhost:3000)

### 3. Supabase migration setup

Database schema files:

- `studio/supabase/migrations/20260620190000_content_campaign_mvp_schema.sql`
- `studio/supabase/seed.sql`

Apply them with the Supabase CLI or SQL Editor.

CLI example:

```bash
supabase db push
```

If using SQL Editor:

1. Run the migration file first.
2. Run `studio/supabase/seed.sql` second.

### 4. Seed setup

The seed file creates the MVP reference records, including:

- agency: `Dsgnfi Studio`
- client: `Lili Veterinary Hospital`
- campaign: `Summer Pet Safety`
- brand profile and related MVP records

The seed does not hardcode an `auth.users.id`.

### 5. Agency membership setup

After signing up in the app:

1. Copy your Supabase Auth user UUID.
2. Open `studio/supabase/seed.sql`.
3. Run the commented `agency_members` insert with your real auth user ID.

Without an active `agency_members` row, RLS will make the workspace appear empty.

Required message to keep in mind:

- `No active agency membership found for this account. Add this user to agency_members or create an agency membership.`

### 6. Supabase Storage bucket setup

The Asset Library requires a private bucket named:

- `agency-assets`

Run:

- `studio/supabase/storage/agency-assets.sql`

This sets up:

- the bucket
- max file size: `10MB`
- allowed MIME types
- agency-scoped storage policies

Allowed file types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/svg+xml`
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-powerpoint`
- `application/vnd.openxmlformats-officedocument.presentationml.presentation`

Storage path pattern used by the app:

- `{agency_id}/{client_id}/{campaign_id-or-general}/{timestamp}-{safe-file-name}`

### 7. OpenAI key setup

Add:

```env
OPENAI_API_KEY=your_openai_api_key
```

The app uses OpenAI server-side only for:

- campaign strategy and calendar generation
- content draft generation

If the key is missing, the app surfaces a configuration warning in Settings and generation actions fail with a clear message.

## Full QA checklist

### Auth and protected routes

1. Open `/signup` and create an account.
2. Confirm email if your Supabase project requires it.
3. Sign in at `/login`.
4. Confirm successful login redirects to `/dashboard`.
5. Confirm signed-out access to `/dashboard`, `/clients`, `/campaigns`, `/content-calendar`, `/assets`, and `/settings` redirects to `/login`.
6. Use the workspace user menu to log out.

### Clients and brand profiles

1. Open `/clients`.
2. Confirm the seeded `Lili Veterinary Hospital` client appears after agency membership is added.
3. Create a new client at `/clients/new`.
4. Edit it from `/clients/[clientId]/edit`.
5. Open the Brand Profile tab and save profile fields.

### Campaigns

1. Open `/campaigns`.
2. Confirm the seeded `Summer Pet Safety` campaign appears.
3. Create a new campaign at `/campaigns/new`.
4. Open `/campaigns/[campaignId]`.
5. Edit the campaign and confirm values persist.

### AI strategy and content generation

1. Open the seeded campaign detail page.
2. Generate strategy and calendar output.
3. Confirm:
   - `ai_generations` row is created
   - `content_items` rows are inserted
   - campaign status updates to `content_generated`
4. Open `/content-calendar`.
5. Open a content item and generate a full content draft.
6. Confirm a new `content_variants` row is created.

### Approval workflow

1. On a content item detail page, move the item through:
   - Draft
   - Needs Review
   - Changes Requested
   - Approved
   - Ready to Publish
   - Published Manually
2. Add comments.
3. Save current version and save as new version.

### CSV export

1. Open `/content-calendar`.
2. Filter to approved or publish-ready content.
3. Click `Export filtered CSV`.
4. Confirm the file downloads and only exportable statuses are included.

### Asset Library

1. Open `/assets`.
2. Upload a valid file under `10MB`.
3. Link it to a client and optional campaign.
4. Confirm redirect to `/assets/[assetId]`.
5. Edit metadata.
6. Confirm the asset appears in:
   - `/assets`
   - `/clients/[clientId]?tab=assets`
   - `/campaigns/[campaignId]?tab=assets`
7. Delete the asset and confirm:
   - asset record is removed
   - storage file removal is attempted

### Dashboard and settings

1. Open `/dashboard`.
2. Confirm real metrics load from Supabase.
3. Confirm empty states show clear next steps if data is missing.
4. Open `/settings`.
5. Confirm:
   - agency name displays
   - current user email displays
   - current role displays
   - Supabase public config status displays
   - service role config status displays
   - OpenAI config status displays

## Troubleshooting

### RLS shows empty data

Check:

- the signed-in account matches the `agency_members.user_id`
- `agency_members.status = active`
- seeded rows use the same `agency_id`
- you signed out and back in after changing memberships

### Storage permission errors

Check:

- bucket name is exactly `agency-assets`
- bucket is private
- `studio/supabase/storage/agency-assets.sql` was applied
- storage object path starts with the same `agency_id` as the membership row
- `SUPABASE_SERVICE_ROLE_KEY` exists in `studio/.env.local`

### Missing Supabase configuration

Check:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Missing OpenAI configuration

Check:

- `OPENAI_API_KEY`
- restart the dev server after changing env vars

### Failed CSV export

Check:

- you are signed in
- you have active agency membership
- the selected filters include exportable statuses:
  - `approved`
  - `ready_to_publish`
  - `published_manually`

## Deployment notes for Vercel

Before deploying:

1. Add all required environment variables in Vercel.
2. Confirm Supabase redirect URLs include the deployed app URL.
3. Confirm the production app URL is also allowed for password recovery and auth callbacks.
4. Confirm the database migration and seed steps were applied in the target Supabase project.
5. Confirm `agency-assets` bucket and storage policies exist in the target project.
6. Run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Private production deployment

### Vercel project configuration

- Vercel project root directory: `studio`
- Install command: `npm install`
- Build command: `npm run build`
- Output setting: use the default Next.js output. No custom output directory is required.
- Production domain value: set `NEXT_PUBLIC_APP_URL` to the exact deployed origin, for example `https://studio.example.com`

Notes:

- The app does not rely on local disk persistence at runtime.
- No Windows-only runtime paths are used inside `studio/src`.
- Server actions and route handlers are written for the Next.js App Router and build correctly on Vercel.

### Supabase Auth URL configuration

The application uses the auth callback route:

- `/auth/callback`

Configure Supabase Auth with these exact patterns:

- Site URL:
  - local example: `http://localhost:3000`
  - production example: `https://YOUR_PRODUCTION_DOMAIN`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

Recommended additional password recovery URLs because the app also uses `/update-password`:

- `http://localhost:3000/update-password`
- `https://YOUR_PRODUCTION_DOMAIN/update-password`

### Production data guidance

- Do not run `studio/supabase/seed.sql` against private production unless you intentionally want the demo agency, client, campaign, and sample content records.
- If demo records were already seeded into production, archive or manually remove them only after the real owner membership is in place and RLS checks pass.
- Keep migrations in production. Demo content is optional; schema is not.

### Production owner membership

After the production owner signs up:

1. Copy the owner user UUID from Supabase Auth.
2. Insert or update an `agency_members` row that links the owner to the production `agency_id`.
3. Confirm `status = active`.
4. Sign out and sign back in before testing protected routes.

### Verify RLS in production

1. Sign in as the production owner and confirm `/dashboard`, `/clients`, `/campaigns`, `/content-calendar`, `/assets`, and `/settings` load.
2. Confirm seeded or live records appear only after the correct `agency_members` row exists.
3. If pages are empty, compare:
   - `agency_members.agency_id`
   - the `agency_id` on clients, campaigns, content items, assets, and brand profiles
4. Confirm a user outside the agency cannot read or mutate those records.

### Verify private storage and uploads

1. Confirm the `agency-assets` bucket exists and is private.
2. Re-apply `studio/supabase/storage/agency-assets.sql` in the production Supabase project if needed.
3. Upload a small valid file from `/assets/new`.
4. Confirm the asset detail page loads, preview/download links work, and the storage object path starts with the correct `agency_id`.
5. Delete the asset and confirm the record disappears from the UI.

### How to test login and signup after deployment

1. Open `/signup` on the deployed site and create an account.
2. If email confirmation is enabled, complete the email flow and confirm the callback returns to `/auth/callback`.
3. Sign in at `/login` and confirm redirect to `/dashboard`.
4. Open the user menu and confirm logout returns to `/login`.
5. Test `/forgot-password` and confirm the recovery link returns to `/update-password`.

## Security reminders

- `OPENAI_API_KEY` must stay server-only.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
- Do not log secrets.
- Do not reference secrets in client components.
- Asset uploads must remain authenticated, validated by file type, and capped at `10MB`.
- AI actions, asset actions, content actions, campaign actions, and client actions must remain authenticated.
- RLS is the primary record boundary and should be treated as part of the production security model.

## Known out-of-scope features

Not included in this MVP:

- Google Ads integration
- Google Analytics integration
- Meta publishing
- Instagram publishing
- TikTok publishing
- LinkedIn publishing
- automated scheduling
- payment system
- client billing
- AI image generation
- Canva integration
- Figma integration

## Verification

Run from `studio/`:

```bash
npm run lint
npm run typecheck
npm run build
```
