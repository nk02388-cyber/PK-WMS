# Reorder-point responsiveness

The reorder screen previously evaluated all stock/rules and rebuilt its table on every search input, including when the pane was hidden. Formatting each numeric cell also constructed locale-formatting machinery repeatedly, and each render refreshed notifications with another evaluation.

The implementation now:

- Shares evaluated rows with notifications while the rule array, stock-item array and trusted-snapshot state remain unchanged. An explicit stock refresh invalidates the cache, including in-place quantity changes.
- Reuses one Thai `Intl.NumberFormat` instance for table cells.
- Debounces typing by 120ms; filter changes update immediately.
- Keeps badge/summary updates but defers the table until the pane is visible.
- Preserves existing table DOM when generated content is identical.
- Removes the search-render notification refresh; notifications retain their existing stock/account/event refresh paths.

Units, excluded warehouses, rule eligibility, unknown-balance handling, the 200-row display limit and product-history navigation are unchanged. When stock becomes untrusted the cache is rebuilt without stock quantities.

Validation: 102 Node tests passed. Browser fixtures at 1440px and 390px verified deferred rows, shared cache, search, filter, DOM reuse, explicit invalidation after quantity changes, rejection of stale stock alerts and absence of page overflow/errors. The existing keyword-search browser suite was also run. The comparative local profile uses authorization mocks and CPU throttling; tab-handler timings do not include every asynchronous paint and must not be presented as production end-to-end speedups.

Evidence: ignored `work/reorder-unit-results.txt`, `work/reorder-keyword-check.txt`, `work/reorder-performance-after.json`. No production stock or database writes are involved.
