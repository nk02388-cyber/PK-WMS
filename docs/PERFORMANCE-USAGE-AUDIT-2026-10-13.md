# PK WMS / Supabase performance and usage review

Inspected 13 October 2026, Asia/Bangkok. Read-only production inspection; no database, inventory, account, schema, index or application behaviour changes.

## Measurement boundaries

- Supabase PK WMS: `zgsxbuckjrplkpvtlbmn`, active healthy, Sydney region. POS: `dstzgirkfhrehjxnjool`, active healthy, Singapore region.
- Log counts use the rolling last 24 hours at inspection. Gateway origin time is not browser end-to-end latency or database execution time.
- SQL statement statistics are cumulative since 27 August 2026, 02:49:13 UTC. Table/database counters have a different reset timestamp. Old anonymous-role calls therefore do not prove current anonymous access.
- Browser profile uses local source, isolated authorization mocks, synthetic stock in all mapped slots and five withdrawal records per slot. Desktop 1440px and mobile-width 390px use 4x CPU throttling. These are comparative lab measurements, not phone hardware benchmarks or production API timings.
- Physical CPU/RAM usage percentages were not obtained. No conclusion that the database is currently saturated.

## Supabase priorities

| Area | Evidence | Interpretation / next action |
|---|---|---|
| BOM baseline | 757 calls/24h; gateway mean 885.5ms; authenticated SQL mean 135.71ms over 2,407 calls; JSON payload 3,009,378 bytes | Highest cumulative application RPC execution cost. `pk-recipes.js:88` fetches the full baseline and saved recipes; `:148` repeats every 60 seconds even when the recipes/BOM panels are not selected. Prefer version checks and fetch only when changed; refresh while relevant views are active. Preserve guarded API access. |
| Saved recipes | 759 calls/24h; SQL mean 5.4ms; recipe tables have zero rows | The feature is wired and queried but no custom recipes/version data are currently saved. Avoid conflating empty tables with dead code. Reduce redundant paired refreshes. |
| Calendar | 1,419 GETs/24h; SQL cumulative mean 1.83ms | Cheap queries, high frequency. `event-calendar.js:233` polls every 30 seconds and also subscribes to Realtime. Review fallback polling frequency while preserving due-event notifications. |
| Account checks | 899 Auth user calls and 775 app-user calls/24h | Active authorization work. Do not remove these checks without preserving account revocation/access updates. `account-status.js:389` refreshes while visible every minute. |
| Stock | 58 latest-stock RPCs/24h; authenticated SQL mean 46.9ms | Lower call frequency than BOM. Optimize repeated BOM downloads first. |
| Realtime | `realtime.list_changes` about 2.306 million calls and 14.044 million cumulative execution milliseconds; publication contains pallet slots, receive dates and calendar | Largest cumulative infrastructure query cost. This is ongoing replication/RLS processing, not equivalent to failed inventory transactions. Requires Realtime connection/event/RLS metrics to quantify current load. |
| Unused indexes | Advisor flags 11 non-unique indexes with zero scans, total 155,648 bytes | Only 152 KiB. Lower priority than redundant network transfers. Foreign-key support and future workflows must be checked before removal. None removed. |

At inspection: database size approximately 27.4 MiB, zero recorded deadlocks, mostly idle client connections and WAL sender waiting for WAL. This snapshot does not establish peak-time performance.

Last-24h errors in the gateway aggregation were 24 HTTP 401s: incoming pallets 12, pallet slots 4, receive dates 4, calendar 4. No 5xx appeared in that aggregation. Need correlate sessions/token expiry before classifying these as defects.

## Parts without populated data / without recent activity

- `public.pk_recipes`, `pk_recipe_lines`, `pk_recipe_versions`: no saved rows. Baseline BOM is populated separately and actively used; these do not represent the entire BOM feature.
- `warehouse_ops.work_standards` and `competency_ratings`: no rows in estimates, but referenced by the Operations application. No deletion recommended merely because empty.
- `receive_dates`: currently empty, but read and included in Realtime. It is not unused.
- `wms_legacy_archive.snapshots`: an archived snapshot exists; retain as historical/rollback data until a separate retention decision.
- POS has no application gateway/auth/function logs in the inspected 24h window, but `cafe_pos` has four orders/payments, ingredients, recipes and backups. It is a low recent activity project, not a proven unused project. No Edge Functions are deployed there.
- Static reference scan found no unreferenced root JavaScript/CSS candidates. Coverage reports identify unexecuted branches only in the sampled workflows, not safely deletable features.

## Website findings

| Area | Observed result | Priority |
|---|---|---|
| Initial page | HTML 2,460,243 bytes; embedded image base64 1,430,452 characters; 38 external scripts and 26 CSS references | High: move inline plan images to separately cacheable assets and defer feature-specific dependencies after verifying CSP/loading paths. |
| Excel / QR libraries | XLSX source about 709,300 characters; html5-qrcode about 375,363 characters loaded eagerly | High: load on first import/export or camera action. They are used features, not dead files. Most library functions did not execute in this browsing sample. |
| Reorder page | 390px fixture produced a ~1,007ms tab handler / ~1,009ms long task under 4x CPU throttling | Investigate repeated evaluation/rendering of 200 rows and notification refresh. One lab sample, not a proven production latency. Debounce searches and reuse computed stock groups. |
| First map open | 1440px ~390ms; 390px ~232ms, subsequent opens ~10–20ms under 4x CPU throttling | Heavy initial setup, substantially cheaper reuse. Keep prepared map surfaces and avoid rebuilding all labels. |
| Dashboard refresh | first ~67–69ms; repeat ~23–39ms with synthetic data under 4x CPU throttling | Moderate. `refreshAfterRemoteChange` refreshes several modules even if panes are hidden. Coalesce bursts and mark hidden panes dirty for rendering on entry. |
| Mobile map pan | existing 6x CPU performance check: 120 pan updates ~100ms; 60 pinch updates ~41ms; prepared slot styles unchanged and no other-zone CAD labels built | Existing fast path passed. Not the first optimization target. |

The profiled pages had no uncaught errors. DOM counts after visiting menus were approximately 9,054 desktop and 7,009 mobile. Source coverage was collected, but unexecuted branches include save, import, camera, error and privileged paths; they must not be removed based on this sample.

Production initial department page, checked with Edge at 1440px: successful load, no observed page errors, no failed same-origin responses during the short observation, no horizontal overflow. Full authenticated production workflows were not exercised. A broader WebKit read-only run stalled and was stopped; it is not recorded as passing.

## Recommended order

1. Stop unconditional full BOM polling; add version-aware guarded reads and preserve account-generation checks.
2. Reconcile calendar Realtime and fallback polling without breaking notification freshness.
3. Lazy-load XLSX and QR dependencies; separate cacheable floorplan assets from HTML.
4. Optimize reorder rendering and batch remote-change refreshes for hidden panes.
5. Reassess index usage after a representative business period. Potential savings are small.

No cleanup or performance fixes were applied by this audit.

## Evidence and references

Local lab evidence: ignored `work/performance-2026-10-13.json`, `work/performance-summary.txt`, `work/mobile-map-after.json`; scripts `work/profile-performance.cjs` and `work/live-performance-quick.cjs`.

- [Supabase query statistics](https://supabase.com/docs/guides/database/extensions/pg_stat_statements)
- [Snapshot vs cumulative statistics](https://supabase.com/docs/guides/observability/inspect)
- [Unused-index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Realtime performance reports](https://supabase.com/docs/guides/realtime/reports)
