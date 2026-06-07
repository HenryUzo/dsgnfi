# React Template Import Spec

## Purpose
This document defines how a developer can integrate a React frontend into the
DSGNFI template system, what the current importer supports, and what must be
built to support arbitrary uploaded React templates instead of the current
Blit-specific conversion path.

## Current state
The current upload/import flow is not a generic "host my React site" feature.
It is a structured importer that:

1. accepts a zipped React/Vite project
2. extracts route and asset information
3. converts the frontend into DSGNFI-supported template pages and block data
4. stores the result as a custom template in the CMS

The active implementation lives in:

- [C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts](C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts:119)
- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:551)

The importer currently supports one curated mapping path:

- source type: `react-vite`
- importer profile: `blit-studio-v1`

That mapping is hardcoded in:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:260)

## What "importing a template" means in DSGNFI
Importing a React frontend does not mean serving the original React app
directly. It means producing DSGNFI-native template data:

- a `Template`
- one or more `TemplateVersion` records
- supported page definitions
- page block defaults
- site settings defaults
- navigation defaults
- imported asset URLs

The frontend source is treated as input to a conversion step, not as the
runtime artifact.

## Upload contract

### Supported project type
The current importer accepts only a React/Vite application zip.

Detection rules:

- `package.json` must exist
- `src/App.tsx` must exist
- `package.json` must include both:
  - `react`
  - `vite`

This detection happens in:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:81)

### Upload endpoint
The upload API is:

- `POST /admin/templates/imports`

Behavior:

- requires authenticated admin user
- requires `OWNER` or `ADMIN`
- accepts a single uploaded zip file under field name `bundle`
- stores the zip temporarily
- extracts and validates the project
- creates a `READY` custom template record

Route:

- [C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts](C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts:119)

### Publish endpoint
After import, the custom template must be published:

- `POST /admin/templates/imports/:importId/publish`

Route:

- [C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts](C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts:186)

## Required project structure for developers
The developer should prepare the uploaded project with the following structure:

```text
my-template/
  package.json
  src/
    App.tsx
    pages/
      Home.tsx
      Works.tsx
      Studio.tsx
      Contact.tsx
      Unfolded.tsx
  public/
    assets/
      hero.jpg
      reel.mp4
      ...
```

Minimum requirement:

- `package.json`
- `src/App.tsx`
- route components referenced from `App.tsx`
- `public/assets/` for imported media

## Route rules
The current route extractor is regex-based. It is intentionally narrow.

Supported pattern:

```tsx
<Route path="/studio" element={<Studio />} />
```

Extraction happens in:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:157)

### Route limitations
The current importer is not reliable for:

- nested route config objects
- dynamically generated routes
- lazy-loaded route factories
- nonstandard wrappers around `<Route>`
- custom router abstractions that hide path strings from `App.tsx`

If developers want the current importer to work, routes should remain explicit
in `src/App.tsx`.

## Asset rules
Static images and videos intended for import should live under:

- `public/assets/`

During import:

- each asset is copied into DSGNFI uploads storage
- the importer rewrites `/assets/...` paths to stored upload URLs

Asset handling is implemented in:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:173)

Supported media types today:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`
- `.mp4`

## Mapping requirement
This is the critical part.

Uploading a React frontend is only step one. For the template to become usable
inside DSGNFI, the frontend must be mapped into DSGNFI-supported pages and
blocks.

Today that mapping is hardcoded. The importer explicitly creates:

- `home`
- `works`
- `studio`
- `contact`
- `unfolded`
- `echoes-living-installation`

and converts them into known CMS blocks such as:

- `blitHeroCollage`
- `blitFeaturedWork`
- `blitEditorialStatement`
- `blitVideoSection`
- `blitCapabilitiesGrid`
- `blitWorksIndex`
- `blitStudioHero`
- `blitPhilosophy`
- `blitOriginals`
- `blitContactGrid`
- `blitArticleGrid`

This mapping is defined in:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:260)

## What a developer must do today
For the current system, the developer must do one of these:

### Option A: Reuse existing DSGNFI block types
The developer structures the React frontend so it can be mapped into block types
that already exist in the platform.

Required work:

- identify which DSGNFI page blocks represent the template sections
- write an importer profile that maps source pages into those blocks
- validate the resulting template preset overrides

### Option B: Introduce new DSGNFI block types
If the frontend contains sections that DSGNFI cannot express yet, the developer
must add new block support before import.

Required work:

1. add block renderer support in public rendering
2. add block editor schema/support in admin editing
3. add block validation/default shape in template/page defaults
4. update importer mapping to emit the new block types

Relevant files:

- public rendering:
  - [C:\Websites\dsgnfi\app\src\components\pages\blit\BlitPageExperience.tsx](C:\Websites\dsgnfi\app\src\components\pages\blit\BlitPageExperience.tsx:1997)
  - [C:\Websites\dsgnfi\app\src\components\pages\PageBlocksRenderer.tsx](C:\Websites\dsgnfi\app\src\components\pages\PageBlocksRenderer.tsx:258)
- admin editor definitions:
  - [C:\Websites\dsgnfi\app\src\pages\admin\PageEditor.tsx](C:\Websites\dsgnfi\app\src\pages\admin\PageEditor.tsx:54)
- page defaults / blueprints:
  - [C:\Websites\dsgnfi\server\src\templates\pageDefaults.ts](C:\Websites\dsgnfi\server\src\templates\pageDefaults.ts:674)

## Current developer workflow

### 1. Prepare the frontend
- Use React + Vite
- Keep routes explicit in `src/App.tsx`
- Put importable media in `public/assets`
- Keep page structure stable enough to map into CMS blocks

### 2. Zip the project
- Zip the project root
- Do not upload only `dist/`
- Do not upload only component fragments

### 3. Upload to admin
- Upload the zip through the admin import flow
- Or send it to `POST /admin/templates/imports` as multipart form data

Field name:

- `bundle`

### 4. Review import result
The importer returns:

- detected root
- detected routes
- copied assets
- mapped pages
- mapped sections
- warnings

### 5. Publish the imported template
- call `POST /admin/templates/imports/:importId/publish`

### 6. Materialize the template into a site
After a template exists, it still must be instantiated as pages on a site.
That is a separate step from template creation.

## Current limitations

### 1. Not a generic React importer
The system does not yet understand arbitrary React layouts automatically.

### 2. Mapping is code-driven
A new imported design requires backend mapping code unless it fits an existing
import profile.

### 3. Route parsing is brittle
The route extractor depends on explicit route syntax in `App.tsx`.

### 4. Page instantiation is separate
Publishing a template does not by itself create all the expected pages on an
existing site unless the site page materialization logic explicitly does so.

### 5. Edits are stored as CMS data, not source React
Once imported, future admin edits live in CMS pages and page revisions, not in
the original React source tree.

## Recommended spec for arbitrary uploaded React templates
To support arbitrary developer templates properly, DSGNFI should move from a
single hardcoded importer to a profile-based import system.

### Target architecture

#### A. Import manifest inside the uploaded project
Require a manifest file in the uploaded template, for example:

```text
template.dsgnfi.json
```

Suggested manifest fields:

```json
{
  "name": "Blit Studio",
  "category": "agency",
  "framework": "react-vite",
  "routes": [
    { "path": "/", "pageKey": "home", "component": "Home" },
    { "path": "/works", "pageKey": "works", "component": "Works" }
  ],
  "assetsDir": "public/assets",
  "siteSettings": {
    "seoTitle": "Blit Studio",
    "contactEmail": "ad@blit.studio"
  },
  "navigation": {
    "primary": [
      { "label": "Home", "pageKey": "home" },
      { "label": "Works", "pageKey": "works" }
    ]
  },
  "pages": [
    {
      "pageKey": "home",
      "title": "Home",
      "slug": "/",
      "sections": [
        { "type": "blitHeroCollage", "source": "hero" },
        { "type": "blitFeaturedWork", "source": "featuredProjects" }
      ]
    }
  ]
}
```

#### B. Import profile registry
Add importer profiles by framework/source:

- `react-vite-generic`
- `nextjs-static`
- `blit-studio-v1`
- future custom profiles

Each profile should define:

- how project structure is validated
- how routes are discovered
- how assets are collected
- how source sections map to CMS blocks

#### C. Structured block mapping layer
Replace hardcoded page assembly with a registry:

- source section key -> block transformer
- route key -> page builder
- asset reference -> upload rewrite

#### D. Page materialization service
Add a formal service that applies imported template pages to a site safely:

- create missing pages
- update inherited pages
- preserve modified pages unless explicitly replaced

## Required code changes for arbitrary template support

### Backend
- extract `blit-studio-v1` logic into a reusable importer profile
- support project manifest parsing
- add profile validation and error reporting
- add generic page materialization for imported templates
- persist richer import provenance and section mapping

Primary files:

- [C:\Websites\dsgnfi\server\src\services\templateImport.ts](C:\Websites\dsgnfi\server\src\services\templateImport.ts:551)
- [C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts](C:\Websites\dsgnfi\server\src\routes\templatesAdmin.ts:119)
- [C:\Websites\dsgnfi\server\src\services\sitesAdmin.ts](C:\Websites\dsgnfi\server\src\services\sitesAdmin.ts:327)

### Frontend admin
- show import report clearly in admin
- let operators review detected routes and mapped pages before publish
- add "apply imported template pages to this site" controls
- show page overwrite policy before materialization

### Page engine
- expand supported block types where needed
- maintain a stable schema for imported page blocks

## Minimum developer checklist
Before uploading, the developer should confirm:

- project is React + Vite
- zip contains the project root
- routes are explicit in `src/App.tsx`
- page media lives in `public/assets`
- sections can be mapped to DSGNFI blocks
- any custom section has a corresponding renderer/editor contract

## Acceptance criteria for a successful import
A template import is complete only when all of the following are true:

- template uploads without validation failure
- import report lists detected pages and copied assets
- template is published successfully
- supported pages exist in the template detail
- a site can materialize those pages
- admin can edit those pages using supported block editors
- public page rendering uses DSGNFI blocks, not the raw uploaded React runtime

## Recommended next implementation step
The next engineering step should be to split the current Blit importer into:

1. a framework validator
2. a route/asset extractor
3. a template manifest reader
4. a reusable page-materialization service
5. one importer profile for `blit-studio-v1`

That preserves the current working Blit path while creating the foundation for
arbitrary developer-uploaded React templates.
