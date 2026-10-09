# Stock/BOM private API migration — 9 October 2026

Production: https://bcl-wms.vercel.app. Source: PK-WMS repository. Supabase project: `zgsxbuckjrplkpvtlbmn`.

## Imported source and integrity

| Source | Imported coverage |
|---|---|
| Original root BOM details | 757 recipes, 3,476 raw component lines |
| Original FG catalog | 758 entries; the entry without a detail remains visible in catalog |
| Original Operations formula variant | 756 recipes, preserved exactly rather than regenerated |

The combined baseline JSON SHA-256 is `f697cd33df3e5620e78b08e9d212853c7e9f29706c6b92de35818687bfb8c0d9`. All 104 import batches passed JSON content comparison against their exact source before the baseline was marked ready. Missing FG units, source exclusions and raw duplicate lines remain unchanged. This migration does not infer conversion rates or repair business formulas.

Exact backups and manifests are in the ignored local `work/private-migration/` directory in this checkout. They are excluded from Git and Vercel; they are not an off-machine disaster-recovery backup. No confidential payload is included in the schema migration or this report.

## Database and application change

`supabase-private-bom.sql` records schema and guarded API only. `public.pk_bom_baselines` has RLS enabled and no direct grants to anon/authenticated roles. `get_pk_bom_baseline()` allows authenticated BOM/planning access or an active Admin. Anon EXECUTE is revoked. A source hash identifies the immutable baseline, and the API reads only completed (`ready`) versions.

The root page starts with empty stock/BOM data. It reads `get_latest_stock_inventory`, `get_pk_bom_baseline` and `get_pk_recipes` after account/menu authorization. Saved recipes override baseline formulas by FG code. The Operations module reads the original Operations variant from the same guarded baseline and retains its existing saved production formula overlay.

Public `operations/pk-bom.json` is deleted. API failures show an error and clear privileged data; there is no public stock/BOM fallback. Logout or a changed account invalidates old requests so delayed results cannot restore privileged projections.

## Verification

- Database content: 757 / 3,476 / 758 / 756 counts verified; all 104 batch comparisons passed.
- Read-only authorized database transaction: baseline 757, latest inventory 2,901 items, editable saved recipes 0 at migration. No existing editable formulas or inventory snapshots were overwritten.
- Negative database transaction: a synthetic subject without access was denied baseline access; stock read returned no data. Transactions rolled back.
- Grants: anonymous stock/BOM EXECUTE false; authenticated direct baseline SELECT false; baseline RLS true.
- Node regression suite: 96 passed, 0 failed.
- Browser fixtures: private API loading, baseline/saved overlay, logout, delayed response, API failure/retry at 1440/390 px; recipe save/version conflict/failed draft; Operations keyword controls; Login/settings/mobile menus; application CSP and local dependencies.
- Live release `118be79`: embedded stock items and BOM recipes both 0; `/operations/pk-bom.json` and `/supabase-private-bom.sql` HTTP 404; anonymous baseline and latest stock RPC requests HTTP 401. Department/Login at 1440/390 px and anonymous Operations denial passed with no page errors; all 91 referenced assets HTTP 200. Evidence: ignored `work/private-live-api.json` and `work/live-readonly-audit.json`.
- Authenticated behavior is supported by read-only database checks and browser fixtures, rather than changes to real inventory/accounts. Physical iPhone behavior and long-term uptime were not measured.

## Rollback and remaining boundaries

Keep the private API consumer and correct a defective baseline by importing a separately verified version; do not restore public confidential JSON as an availability workaround. A new baseline remains unready until content verification finishes. Preserve saved recipes and inventory history independently.

This release removes confidential fallback from the current website, not from previously published Git commits, old deployment URLs, legacy hosting or third-party copies. No history rewriting was performed. `get_withdrawal_stock_catalog` remains intentionally public for an existing external integration and contains codes/names/units/freshness, not quantities/values; changing that integration requires a separate decision. Other security findings remain in the [audit report](SECURITY-AUDIT-2026-10-09.md).
