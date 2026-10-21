# Cycle Counts online and ERP/WMS next steps — 21 October 2026

## Implemented

- Shared online schedules, one in-progress count draft and completed results; active app account plus Cycle Counts permission required.
- Explicit draft save, immutable completed history, Auth actor/version/time audit, conflict rejection and retained input on network failure.
- Manual refresh and 30-second visible idle polling; dirty forms are not overwritten.
- Legacy local import preserves online schedule values and an existing online draft, deduplicates completed runs and retains the original browser data.
- No quantity, movement or valuation is changed by a count save.
- Fixed mobile drawer measurement inflating scroll padding and preventing access to the complete-count action.

## Proposed, not implemented

Priority 1: independent numbered jobs (for example CC-2026-0001), assigned counters, due date and status Draft / Counting / Recount / Review / Approved / Posted / Cancelled; separate per-job tables permit simultaneous zones and paginated history.

Priority 1: snapshot actual per-location versions on count start. Detect receipts/issues/returns/moves during counting; either operationally freeze the locations or require reconciliation/recount before posting. Never apply a stale expected balance to current stock.

Priority 1: blind count input, recount above configured absolute/percentage tolerance, required reason codes, reviewer distinct from counter, and an explicit adjustment document after authorized approval. Posting must create a versioned movement and audit record; no silent overwrite of stock snapshots or mixed units.

Priority 2: ABC/risk-based frequencies, location/product/Lot scope, scan-to-count matching, duplicate scan handling, unexpected items, accuracy/overdue/recount metrics and evidence attachments.

This is a recommended roadmap rather than a claim of compliance with every ERP. Odoo documents scheduled/assigned counts and applying differences as inventory movements: https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/management/inventory_adjustments.html

## Verification

`node --test --test-concurrency=1 tests/*.test.cjs tests/*.test.mjs`

`node tests/cycle-counts-online-browser.cjs` in Edge/WebKit: two devices share schedules, draft and results; stale writers are rejected; network failure retains input; legacy import is repeat-safe; account change discards late replies; desktop/mobile overflow and sticky scroll padding checked.

Database fixture checks CAS, append-only history, payload validation/rollback, actor audit, menu/inactive/anonymous denial and no direct table access. Live DDL installed through Supabase migration; production data writes are only through the authenticated app UI. No fabricated production count or stock adjustment is submitted for testing.
