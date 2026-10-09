# PK WMS — security and stability audit, 9 October 2026

Production: https://bcl-wms.vercel.app. Hosting observed: Vercel; database/Auth: Supabase.

## Scope and limits

Reviewed deployed HTTP responses, source access controls, Supabase security/performance advisors, database policy/index metadata, browser storage use, dependency delivery, and fixture-based browser regressions. The attached security-audit ZIP was read as reference material; its scripts were not executed. This is a defensive review, not a penetration test or a certification of complete security. No production inventory, accounts, passwords, PINs or business records were changed by test fixtures. Read-only production checks do not establish long-term uptime or load capacity.

The Cloudflare plugin supplied documentation guidance but no callable zone/cache management API was available. Responses did not show Cloudflare proxy/cache headers. No Cloudflare purge or WAF change is claimed.

## Applied improvements

- Added Vercel CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy. Same-origin frames remain allowed for warehouse operations; third-party framing is blocked. Camera remains allowed on this origin for barcode scanning. CSP keeps inline scripts/styles because the existing static application requires them; this is baseline hardening, not complete XSS prevention.
- Replaced floating Supabase JS `@2` with a local pinned 2.57.0 UMD file, matching the version already used by operations. Updated SheetJS from 0.18.5 to the current documented 0.20.3 and stored it locally. Source URLs and SHA-384 checksums are recorded in `vendor/audit-dependencies.json`. Operations still uses pinned CDN ESM imports.
- Added exact-key startup cleanup for obsolete `pk-sidebar-collapsed` and expired/malformed daily notification dismissals/toast state. Current-day choices remain. Login sessions, inventory, cycle counts, BOM drafts, calendar data and current theme/sidebar preferences are retained. Cleanup occurs separately in each browser when it next opens this release; it does not remotely erase all devices' storage.
- Applied `audit_rls_initplan_and_foreign_key_indexes` to Supabase: seven foreign-key indexes on small warehouse_ops tables, and `(select auth.uid())` in the action confirmation read policy. Authorization predicates remain unchanged. SQL is preserved in `supabase-security-audit.sql`. No indexes were dropped merely because their usage counter was zero.

## Remaining findings

| Priority | Finding and evidence | Next action |
|---|---|---|
| High | Public `index.html` embeds legacy stock/BOM data including quantities and values. Anonymous HTTP GET can read this source even when Login hides the UI. `operations/pk-bom.json` is also a static catalog. | Move confidential snapshots/catalogs behind authenticated server endpoints, remove production fallback data and separately assess copies on legacy hosting/repository history. UI login and CSP cannot make already-public static data confidential. |
| Medium / needs business decision | `public.get_withdrawal_stock_catalog()` explicitly grants anon execution. Source says this supports a separate Withdrawal Skill Matrix app and intentionally exposes codes/names/units/freshness, not quantities/values. | Decide whether this catalog is intended public. If private, coordinate authentication in the dependent app before revoking anon execution; unconditional revocation would break that integration. [Supabase advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). |
| Medium | Supabase advisor reports leaked password protection disabled. | Enable after checking project plan/configuration and account credential compatibility. [Password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). |
| Review | Authenticated SECURITY DEFINER RPC advisories remain. Public tables all have RLS enabled, but privileged functions require per-function authorization review. Tables with RLS and no policies may intentionally deny direct access and use guarded RPCs. | Keep explicit server role/menu guards; do not add permissive policies merely to silence advisor messages. No complete proof of every RPC's behavior is claimed. |
| Review | Login/PIN brute-force resistance, account-level throttling, backup restoration, incident alerting and sustained load were not exercised against production. | Verify provider rate limits and monitoring; schedule controlled tests using dedicated test accounts/data. |

## Validation

- Node suite: **96 passed, 0 failed**, including credential/PIN/rename/avatar authorization fixtures and local database login migration checks.
- WebKit: Login/department flow at 1440 and 390 px; settings Admin/user at both widths; 16 menu views and forms at 1440, 390 and 768 px, with no page errors or horizontal overflow in these checks.
- Operations keyword fixture: six controls at desktop/mobile passed.
- New browser check: enforced application CSP (transport upgrading omitted only on the local HTTP test server), local dependency loading with external network blocked, mobile Login rendering and Thai Excel read/write passed.
- Supabase post-change metadata: seven new indexes present; zero public regular/partitioned tables with RLS disabled. Performance advisor no longer reports unindexed foreign keys or auth RLS initplan warnings. Newly added indexes naturally appear unused until relevant queries execute.
- Production after deployment: new security headers verified on root and operations; desktop/mobile department and Login checks passed with zero page errors; all 91 referenced local assets returned HTTP 200. Anonymous operations entry remained denied. The SQL audit file returned HTTP 404 as intended.
- Production verification is recorded in `work/live-readonly-audit.json` and `work/security-live-headers.json` after deployment. Those local evidence files are excluded from public deployment.

## Cache handling

No service worker or CacheStorage/IndexedDB cache was identified in the reviewed application source. Vercel responses already require revalidation (`public, max-age=0, must-revalidate`), so HTML/JS is not marked immutable. A new deployment updates served assets. Business localStorage is not unused cache. No blanket `localStorage.clear()`, index removal or full CDN purge was performed.

References: [Cloudflare recommends targeted URL purges](https://developers.cloudflare.com/cache/how-to/purge-cache/), [Vercel security headers](https://vercel.com/docs/cdn-security/security-headers), [Supabase RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security), [SheetJS standalone installation and vendoring](https://docs.sheetjs.com/docs/getting-started/installation/standalone/).
