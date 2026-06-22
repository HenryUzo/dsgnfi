# Production Readiness

## Environment checklist

- `NEXT_PUBLIC_APP_URL` set correctly for the deployed origin
- `NEXT_PUBLIC_SUPABASE_URL` set to the project API URL, not the dashboard URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- `SUPABASE_SERVICE_ROLE_KEY` configured server-side only
- `OPENAI_API_KEY` configured server-side only
- optional `OPENAI_MODEL` reviewed

## Supabase checklist

- schema migration applied
- seed data applied if using the seeded MVP workflow
- auth email provider enabled
- auth redirect URLs configured for:
  - `/auth/callback`
  - `/update-password`
- production user can sign up, sign in, and sign out

## RLS checklist

- `agency_members` contains the expected production users
- membership rows use `status = active`
- seeded or production rows use the same `agency_id` as the active membership
- clients, campaigns, content, assets, and activity logs are not visible across agencies

## Storage checklist

- private bucket `agency-assets` exists
- `studio/supabase/storage/agency-assets.sql` applied
- allowed MIME types match app validation
- `10MB` max file size enforced
- upload, preview, signed URL access, and delete flows work

## OpenAI checklist

- campaign strategy generation succeeds
- content draft generation succeeds
- failed generations are recorded without exposing secrets
- no client component references `OPENAI_API_KEY`

## Vercel deployment checklist

- all required env vars added to Vercel
- production build passes locally first
- Vercel deployment completes without missing env errors
- deployed auth redirects point back to the correct production origin
- storage-backed asset previews work in production

## Manual QA checklist

- signup, login, logout
- protected routes redirect correctly
- create and edit client
- create and edit campaign
- generate strategy and calendar
- generate content draft
- comments and version history work
- approval workflow works
- CSV export downloads correctly
- asset upload, metadata edit, preview, and delete work
- dashboard metrics load correctly
- settings page health checks are accurate

## Known limitations

- no billing
- no team invite workflow
- no advanced permissions UI
- no direct publishing
- no scheduling automation
- no AI image generation
- no Canva or Figma integrations

## Next phase recommendations

- add richer activity timeline UI
- add command menu behavior or remove placeholder trigger
- improve export UX with explicit failure handling in-page
- add stronger server monitoring for failed AI and storage operations
- add agency switching if multi-agency membership becomes a real use case
- add deployment smoke tests against Supabase auth, storage, and OpenAI flows
