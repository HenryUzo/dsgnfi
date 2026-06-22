# Dsgnfi AI Studio Release Checklist

## Git checklist

- Confirm all `studio/` changes are committed on the intended release branch.
- Review the diff for accidental debug code, local URLs, or secrets.
- Confirm `npm run lint`, `npm run typecheck`, and `npm run build` pass from `studio/`.

## Vercel setup

- Create or open the Vercel project for Dsgnfi AI Studio.
- Set the project root directory to `studio`.
- Use `npm install` as the install command.
- Use `npm run build` as the build command.
- Keep the default Next.js output configuration.
- Set the production domain and update `NEXT_PUBLIC_APP_URL` to that exact origin.

## Environment variables

Set these in Vercel for the production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_APP_URL`

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- `OPENAI_API_KEY` must remain server-only.
- Do not paste secrets into client components, query strings, or logs.

## Supabase Auth URLs

- Site URL:
  - `http://localhost:3000` for local development
  - `https://YOUR_PRODUCTION_DOMAIN` for production
- Allowed redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_PRODUCTION_DOMAIN/auth/callback`
- Recommended password recovery URLs:
  - `http://localhost:3000/update-password`
  - `https://YOUR_PRODUCTION_DOMAIN/update-password`

## Database migration status

- Confirm the production Supabase project has the current `studio/supabase/migrations` applied.
- Do not automatically load demo seed data into production.
- If demo rows already exist in production, remove or archive them manually only after owner access is verified.

## Storage bucket status

- Confirm the `agency-assets` bucket exists.
- Confirm the bucket is private.
- Confirm `studio/supabase/storage/agency-assets.sql` has been applied in production.
- Confirm allowed MIME types and the `10MB` size limit match the app.

## Owner membership

- Create the production owner account through the deployed app or Supabase Auth.
- Add the owner user UUID to `agency_members`.
- Confirm the row points to the intended production `agency_id`.
- Confirm membership `status = active`.

## Smoke testing

- Sign up and sign in successfully.
- Confirm protected routes redirect correctly when signed out.
- Confirm `/api/health` returns safe JSON.
- Confirm dashboard metrics load.
- Confirm at least one client, campaign, content item, and asset record can be viewed.
- Confirm asset upload and delete both work.
- Confirm CSV export works for an authenticated agency member.
- Confirm OpenAI generation actions run only from authenticated workspace pages.

## Rollback steps

- Re-deploy the previous healthy Vercel deployment.
- If a release depends on a new migration, avoid destructive rollback of production data.
- Re-check auth flows, owner membership, and uploads after rollback.
- Document what failed before attempting another rollout.

## Post-deployment verification

- Open `/settings` and confirm environment status cards show configured values.
- Confirm the displayed application version is `0.1.0-mvp`.
- Verify Supabase Auth callbacks, password reset, and logout on the production domain.
- Confirm RLS limits data visibility to the correct agency.
- Confirm no secret values appear in browser responses or logs.
