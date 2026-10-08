# PK WMS Keyword search coverage — 2026-10-08

Keyword rule: partial words, multiple whitespace-separated keywords in any order, all keywords must match within a record's available search fields. Case-insensitive; Unicode width normalization in the updated search paths. Exact barcode/code identification is retained for scans and final SKU selection.

## Main PK WMS — 14 search controls

| Control | Fields / behavior verified |
|---|---|
| productHistoryQuery | SKU, product name and catalog keywords; Enter opens product history |
| reorderSearch | SKU, name, supplier; live filtering |
| floorplanSearchInput | SKU, names, Lot, zone, slot, receipt actor/reference; Search button |
| fseAddCode | Updated-stock SKU, name, aliases; arrows/Enter chooses canonical code |
| incomingProductCode | SKU, name, aliases/unit; arrows/Enter selects product |
| daily-receive .daily-query | SKU, name, Lot, zone, slot, actor, reference |
| daily-issue .daily-query | SKU, name, Lot, zone, slot, actor, reference |
| fgBomSearch | FG SKU/name; View BOM button |
| pkRecipeCode | FG SKU/name; keyword result selection before editing |
| recipe component pk_code | Stock SKU/name/aliases/unit; selection fills name/unit |
| bomPlanFg | FG SKU/name; Enter selects and Add resolves unique result; ambiguous query is rejected |
| stockReconcileSearch | SKU, name, unit, status, slot, warehouse |
| palletAuditSearch | Zone, slot, actor, reference, action/Thai label, before/after items |
| receiptPlanQuery | RR, company, period, PO, SKU, item, unit |

## Embedded PK withdrawal operations — 6 search controls

| Control | Fields verified |
|---|---|
| ticket-search | Ticket number, assigned staff/job, FG, material codes/names |
| trash-search | Ticket number, assigned staff/job, FG, material codes/names |
| case-search | Ticket number, material code/name, assigned staff |
| audit-search | Ticket number, actor, reason, action label |
| bom-search | FG code/name |
| stock-code | Material code/name; select result before adding a line |

## Evidence

- tests/all-keyword-search-browser.cjs: every main control exercised with isolated data at 1440 and 390px in WebKit and Edge. Checks actual fields and results, buttons/Enter, receipt XLSX fixture, and ambiguous selection guard. Edge mobile uses an inspected pointer hit after explicit scroll for controls where Playwright automatic scrolling moves the target outside the viewport.
- tests/operations-keyword-browser.cjs: all six controls exercised at 1440/390 in WebKit and Edge using a patched local Auth/RPC fixture; no production writes.
- tests/keyword-search.test.cjs: multiword, reordered/partial words, cross-field matches, nonmatches, mixed document/person/material fields.
- Full regression: 90/90 unit tests pass. Existing recipe persistence/browser test also passes.

## Fixes this pass

- Replaced browser-native FG/recipe code datalist searching with a keyboard-accessible keyword picker; handles new manual codes, unique matches and explicit choice when ambiguous.
- Recipe Load and plan Add accept a unique keyword result while preserving the canonical FG identity.
- Keyword result lists on mobile no longer overlay the Search button.
- Updated search copy and cache versions.

## Boundaries

Dropdown filters, dates, unit datalists and barcode scanners are not free-text keyword searches. Historical/database searches operate on the rows loaded into their page; no claim of full server-history search. RM/FG WMS are separate projects and are not covered. Fixture tests do not prove physical iPhone keyboard behavior or production Auth/write persistence.
