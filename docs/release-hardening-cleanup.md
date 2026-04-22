# Release Hardening Cleanup

## Public Site Contract

`GET /public/site` is now normalized to:

```json
{
  "ok": true,
  "site": { "id": "site-id", "name": "Site Name", "slug": "site-slug" },
  "settings": {},
  "theme": {},
  "navigation": {
    "primary": [],
    "footer": []
  }
}
```

The old nested `site.site` response shape is deprecated and no longer used by the frontend.

The related public presentation routes stay clean and unchanged:

- `GET /public/site/settings`
- `GET /public/site/theme`
- `GET /public/site/navigation`

Optional presentation data still returns `200` with empty/default values. An unresolved non-local public host now returns a controlled `404 Site not found.` instead of falling through to a generic route-level `500`. Local development requests on `localhost` still resolve through the configured default site unless a valid dev override or subdomain is used.

## Preview Route Semantics

Preview now has two clearly separated route concepts:

- Browser route: `/preview/pages/:pageKey?token=...`
- Token-gated API route: `/public/preview/pages/:pageKey?token=...`

The browser route exists only to render the preview UI. It must fetch draft data from the token-gated API route. Normal public routes remain published-only.

Preview token creation returns the browser URL once and may also include the API path for clarity. Raw preview tokens are still exposed only at creation time.

## Audit Logging

A lightweight `AuditLog` table now records structured admin actions for debugging and release operations.

Current audit coverage:

- `site_settings.updated`
- `site_theme.updated`
- `site_navigation.updated`
- `preview_token.created`
- `preview_token.revoked`
- `domain.created`
- `domain.verification_attempted`
- `domain.primary_set`
- `domain.deleted`
- `page.published`

Each log stores:

- actor admin id when available
- site id when available
- action
- entity type
- entity id
- structured metadata
- timestamp

Raw preview tokens are never written to audit logs.

## Canonical Admin Surfaces

Canonical site presentation surface:

- `/admin/site-settings`

Deprecated duplicate surface:

- legacy branding/theme controls inside `/admin/pages/home`

Those legacy controls are now treated as deprecated and should not be used as a source of truth for site presentation updates.

## Stable Test Commands

Backend:

```powershell
cd C:\Websites\dsgnfi\server
npx prisma generate
npx tsc -p tsconfig.json --noEmit
npm test
```

Frontend:

```powershell
cd C:\Websites\dsgnfi\app
npx tsc -p tsconfig.json --noEmit
npm run test:stable
npm run build
```

`npm run test:stable` is the codified stable frontend test command on this machine.

## Manual QA Checklist

- verified locally: `/public/site` returns top-level `site/settings/theme/navigation`
- verified locally: unresolved non-local host returns `404 Site not found.`
- verified locally: local `localhost` requests still resolve the configured default site
- to verify manually: public navigation, footer, title, favicon, and theme still load from `/public/site`
- verified locally: preview link generation opens `/preview/pages/:pageKey?token=...`
- verified locally: the preview page fetches draft content successfully
- verified locally: normal `/public/pages/:pageKey` still serves published-only content
- verified locally: site settings updates create audit log entries
- verified locally: preview create/revoke creates audit log entries
- partially verified locally: domain create/verify/delete creates audit log entries; successful `set-primary` still requires a verified domain in the target environment
- to verify manually: `/admin/pages/home` points admins to `/admin/site-settings` for branding/theme changes

## Manual QA Runbook

Use these local URLs unless your ports differ:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000`
- admin login: `/admin/login`

Use the seeded admin account:

- email: `admin@dsgnfi.com`
- password: `MyStrongPassword123!`

### 1. Public site presentation

1. Open `http://localhost:5173/`
2. Confirm the header and footer render without crashing.
3. In DevTools Network, inspect `GET http://localhost:4000/public/site`
4. Expected status: `200`
5. Expected response shape:

```json
{
  "ok": true,
  "site": { "id": "...", "name": "...", "slug": "..." },
  "settings": { "siteName": "...", "logoUrl": null, "faviconUrl": null },
  "theme": {},
  "navigation": { "primary": [], "footer": [] }
}
```

6. Expected UI behavior:
   - navigation renders
   - footer renders
   - page title/favicon/theme use site presentation data where configured
   - empty optional values do not crash the page

### 2. Unresolved host handling

1. Call:

```powershell
curl.exe -i -H "Host: missing.example.com" http://localhost:4000/public/site
```

2. Expected status: `404`
3. Expected response:

```json
{
  "ok": false,
  "error": {
    "message": "Site not found."
  }
}
```

4. Call:

```powershell
curl.exe -i http://localhost:4000/public/site
```

5. Expected status: `200`
6. Expected behavior: local `localhost` still resolves the configured default site

### 3. Admin home deprecation surface

1. Log in at `http://localhost:5173/admin/login`
2. Open `http://localhost:5173/admin/pages/home`
3. Expected behavior:
   - legacy branding/theme controls are not the active editing surface
   - the page clearly points admins to `http://localhost:5173/admin/site-settings`

### 4. Site switching

1. Open `http://localhost:5173/admin`
2. Use the site switcher in the admin header
3. Switch between at least two sites
4. Expected behavior:
   - current site label updates
   - admin screens reload without full-page breakage
   - site-scoped pages like `http://localhost:5173/admin/site-settings`, `http://localhost:5173/admin/work`, and `http://localhost:5173/admin/process` reflect the newly selected site

### 5. Seeded templates

1. In the browser or via API, open:
   - `http://localhost:5173/admin/sites`
2. Confirm templates are available in the create-site flow
3. Or call:

```powershell
curl.exe -s http://localhost:4000/admin/templates
```

4. Expected status: `200` when authenticated
5. Expected behavior: starter templates are listed and selectable during site creation

### 6. Site settings, theme, navigation, and assets on two sites

1. Open `http://localhost:5173/admin/site-settings`
2. On Site A:
   - update tagline
   - update theme colors
   - update primary/footer navigation
   - upload or choose a logo asset if available
3. Switch to Site B and confirm Site A values do not leak
4. Expected behavior:
   - each save succeeds
   - values reload correctly for the active site
   - uploaded assets remain site-scoped
   - public header/footer/theme reflect Site A only when Site A is resolved

### 7. Preview flow

1. Open `http://localhost:5173/admin/site-settings`
2. Go to the `Preview` tab
3. Create a preview token for `home`
4. Expected creation response in the UI:
   - a browser URL like `http://localhost:5173/preview/pages/home?token=...`
   - not a backend URL on port `4000`
5. Open the generated preview link
6. Expected behavior:
   - preview page loads
   - preview banner/indicator is visible
   - draft content renders
7. Confirm the token-gated API route also works:

```powershell
curl.exe -i "http://localhost:4000/public/preview/pages/home?token=PASTE_TOKEN_HERE"
```

8. Expected status: `200`
9. Revoke the preview token in admin
10. Call the same preview API route again
11. Expected status: `403`
12. Expected response:

```json
{
  "ok": false,
  "error": {
    "message": "Preview token is invalid or expired."
  }
}
```

13. Confirm normal public page delivery stays published-only:

```powershell
curl.exe -i http://localhost:4000/public/pages/home
```

14. Expected behavior:
   - returns only published content
   - does not expose draft-only preview content

### 8. Process / work / public CMS compatibility

1. Open:
   - `http://localhost:5173/admin/process`
   - `http://localhost:5173/admin/work`
2. Make a small draft change and save where appropriate
3. Switch sites and confirm state refreshes per site
4. Open public pages:
   - `http://localhost:5173/process`
   - `http://localhost:5173/work`
5. Expected behavior:
   - process public page uses published content only
   - work public list/details stay site-scoped
   - public CMS-driven sections render or remain empty honestly, without cross-site leakage

### 9. Domain verification and primary switching

1. Open `http://localhost:5173/admin/site-settings`
2. Go to the `Domains` tab
3. Add a custom domain
4. Expected behavior:
   - status starts as `PENDING`
   - verification instructions are shown
5. Click verify without creating the DNS record
6. Expected behavior:
   - verification attempt completes
   - domain remains non-primary
   - status becomes `FAILED` or remains non-verified depending on DNS result
7. Attempt to set that unverified custom domain as primary
8. Expected behavior:
   - action is blocked in UI and/or backend
9. If you control a real DNS record in the target environment:
   - create the required TXT record
   - verify again
   - set primary
10. Expected result after true verification:
   - domain becomes `VERIFIED`
   - `set-primary` succeeds

### 10. Audit log verification

1. Perform at least one of each:
   - site settings update
   - preview create/revoke
   - domain create/verify/delete
2. Query the database or your chosen admin/debug surface for recent `AuditLog` rows
3. Expected actions present:
   - `site_settings.updated`
   - `site_theme.updated`
   - `preview_token.created`
   - `preview_token.revoked`
   - `domain.created`
   - `domain.verification_attempted`
   - `domain.deleted`
4. Expected behavior:
   - rows include actor, site, entity, metadata, timestamp
   - raw preview tokens are not stored

## Release Readiness

- apply pending Prisma migrations
- to verify manually: confirm seeded templates still exist
- to verify manually: verify site switching in admin
- to verify manually: verify process/work/public CMS compatibility flows still behave correctly
- to verify manually: verify site settings, theme, navigation, and assets on at least two sites
- verified locally: preview token creation, preview render, and revocation
- partially verified locally: domain verification flow works and unresolved custom domains stay non-primary; primary switching still requires a verified domain in the target environment
- verified locally: unresolved-host handling
- verified locally: audit log writes for the covered actions
