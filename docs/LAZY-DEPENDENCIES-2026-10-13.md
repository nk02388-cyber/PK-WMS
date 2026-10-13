# Optional Excel and scanner dependencies

XLSX and html5-qrcode no longer have startup script tags. `dependency-loader.js` loads the pinned same-origin vendor files on demand and shares a single pending request per library. Successful downloads are reused; network failures, missing globals and 20-second timeouts allow a later retry.

Excel entry points await the loader: stock file parsing, stock reconciliation export, floorplan export, BOM-plan export, and receipt-plan workbook loading. Receipt-plan startup no longer fetches its workbook while its pane is hidden; opening the tab or refreshing starts the load.

Both camera entry points await the scanner loader after marking startup pending. Existing generation checks prevent a delayed load from opening a camera after cancellation/navigation. The barcode reader retains keyboard/scanner-input handling without the camera dependency.

No vendor version, CSP source, database access rule, inventory unit or API data source was changed.

Validation: 105 Node tests passed, including concurrent-load sharing, retry after failed requests and timeout/missing-export recovery. Browser fixtures at 1440px and 390px confirmed neither optional library is requested on startup, each loads once on demand, real XLSX workbook round-trip works, the real scanner library loads, and both camera UI start/stop paths work with a mocked camera. Actual hardware camera permission/decoding is not exercised by that mock. Existing 14-control keyword tests passed at both widths, including receipt-plan Excel loading.
