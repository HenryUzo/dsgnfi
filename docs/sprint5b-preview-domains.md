# Sprint 5B — Preview and Domains

Sprint 5B adds token-gated draft preview and conservative domain management on top of the existing site-scoped platform.

## Preview

### Lifecycle

Preview tokens are:
- site-scoped
- optionally page-scoped
- time-limited
- revocable
- stored by token hash, not raw token value

The raw token is returned only once at creation time.

### Admin routes

- `GET /admin/preview`
- `POST /admin/preview/token`
- `DELETE /admin/preview/:tokenId`

Default behavior:
- preview tokens default to a 1 hour TTL
- preview creation validates `pageKey` against the current site's supported pages
- revocation does not expose the raw token again

### Public preview route

- `GET /public/preview/pages/:pageKey?token=...`

Behavior:
- validates token hash match
- rejects revoked or expired tokens
- enforces pageKey scope when the token is page-scoped
- returns draft page-engine content only
- does not affect normal public routes

Normal public routes such as `/public/pages/:pageKey` still return published content only.

## Domains

### Supported domain types

- DSGNFI subdomains
- custom domains

### Admin routes

- `GET /admin/domains`
- `POST /admin/domains`
- `POST /admin/domains/:domainId/verify`
- `POST /admin/domains/:domainId/set-primary`
- `DELETE /admin/domains/:domainId`

### Verification model

Custom domains use explicit verification status:
- `PENDING`
- `VERIFIED`
- `FAILED`

Verification instructions are TXT-based:
- host: `_dsgnfi-verification.<hostname>`
- value: generated token value

Verification behavior:
- custom domains are created in `PENDING`
- verification checks DNS TXT records
- `FAILED` is set if the expected TXT record is missing or the DNS lookup fails
- custom domains cannot become primary until verified

DSGNFI subdomains:
- use `APP_BASE_DOMAIN`
- are created as immediately usable when valid and unique

### Public site resolution

Public host resolution now accepts:
- valid DSGNFI subdomains
- verified primary custom domains
- existing dev overrides for local development

Unverified custom domains are ignored by public site resolution.

## Frontend

The admin site settings surface now includes:
- domain management
- preview token generation

Added behaviors:
- site switch reloads domain and preview state
- blocked primary-domain actions are shown clearly for unverified custom domains
- generated preview links are shown once and can be revoked

Preview rendering:
- preview pages are rendered on `/preview/pages/:pageKey?token=...`
- preview mode is visibly marked with a banner
- preview mode does not bleed into normal browsing

## Local / Dev Notes

- `APP_BASE_DOMAIN` is used for DSGNFI subdomain generation
- local development can still use the existing site resolution overrides
- DNS verification is real TXT lookup logic; local manual QA for custom domain verification may require a real resolvable domain or mocked/test DNS

## Deferred

Still intentionally out of scope:
- billing
- subscription plans
- SSL orchestration
- custom domain certificate automation
- shareable whole-site preview sessions
- legacy-route draft preview beyond the page-engine preview route
