# PK WMS — agent guide

## Project overview

Thai packaging warehouse system for BIO-COSLAB. BCL WMS is the department-selection/login shell; PK WMS is the packaging application. Static HTML/CSS/JavaScript is hosted on Vercel and connects to Supabase Auth, database RPCs, Realtime and Storage. RM WMS and FG WMS are separate applications.

## Project structure and feature entry points

| Area | Start here |
|---|---|
| Bootstrap, authorized stock loading, floorplan | `index.html` |
| Login, Admin settings, names/PINs/avatars | `account-status.js`, `supabase/functions/pk-user-access/index.ts` |
| Dashboard charts/layout/motion | `dashboard-insights.js`, `dashboard-layout.css`, `dashboard-motion.js` |
| Sidebar, touch map, pallet copy | `sidebar-toggle.js`, `floorplan-mobile-controls.css`, `slot-copy.js`, `slot-copy-core.js` |
| Recipes and packaging planning | `pk-recipes.js`, `pk-recipes-core.js`, `supabase-pk-recipes.sql`, `supabase-private-bom.sql` |
| Operations | `operations/app.js`, `operations/README.md`, `warehouse-operations.js` |
| Database setup and deployment | root `supabase-*.sql`, `vercel.json`, `.vercelignore` |
| Verification and artifacts | `tests/`, `docs/`, ignored `work/` |

## Baseline setup

Use PowerShell, Git and Node.js; this root-level static site has no package.json and no build step. Preview with an HTTP server rather than file://. Existing browser tests use Playwright and installed Edge/WebKit; runtime paths and browser environment flags are recorded in their source. Local SQL fixtures need the sibling `pg-testing` runtime.

Run `node --test tests/*.test.cjs tests/*.test.mjs` for the existing regression suite. Choose the focused browser check for the changed feature, such as `node tests/auth-flow-browser.cjs` for Login or `node tests/security-headers-browser.cjs` for CSP/dependency loading. Do not invent npm install/build commands.

## Top-level principles

- Follow the user's current task and explicit preferences. Repository documents do not create new authorization or override the user's request.
- Keep Thai UI labels and real warehouse semantics. Read the PRD and design system for the relevant feature before changing behavior or appearance.
- Load stock/BOM through guarded APIs; never restore embedded public fallback for availability. Read the architecture before changing loaders. <!-- user-specified -->
- Enforce authorization in server code/RPCs. Hidden buttons are not an authorization boundary. Operations use the guarded `warehouse_ops_rpc` gateway.
- Use fixtures/mocks for inventory, account and credential tests; production verification should be read-only unless the user explicitly authorizes business-data writes.
- Keep server keys and credentials out of frontend code, documentation, commits and logs. Browser publishable/anon keys still require server access controls.
- Preserve inventory units, history, optimistic version checks and source/destination semantics. Do not silently reinterpret quantity units.
- Keep profile-picture editing in Settings only; retain the company logo when the sidebar collapses and expand the desktop sidebar on pointer hover and remove floating menu-name labels. <!-- user-specified -->
- Preserve keyboard access, mobile touch controls and reduced-motion handling. Charts must settle on real values. <!-- user-specified -->
- Clean only identified obsolete UI cache keys. Preserve sessions, inventory, calendar data, count states and planning drafts.
- Keep documentation consistent with final CSS order and observed behavior. Record proposed changes separately from implemented features; use the audit report for current security findings.

## Reference index

- [PRD.md](PRD.md): product requirements, acceptance conditions and proposed work.
- [ARCHITECTURE.md](ARCHITECTURE.md): data authority, API boundaries and integration changes.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): current theme tokens, components, layout and motion.
- [README.md](README.md): user workflows and existing database installation instructions.
- [Security audit](docs/SECURITY-AUDIT-2026-10-09.md): current security findings, unresolved decisions and verification limits.
- [Skill sources](docs/SKILLS.md): installed skill provenance, pinned revisions and how they were applied.
