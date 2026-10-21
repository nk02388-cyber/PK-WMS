# Cycle Count pallet labels — 21 October 2026

Use **พิมพ์ Label / QR · Cycle Count** in the sidebar, or **พิมพ์ Label / QR ติดพาเลท** from Cycle Counts. Select a zone, select the required positions and print. Labels include current active product codes/names, Lot and units, with blank fields for physical count, date, time, counter and reviewer. Empty selected positions are included for physical verification. Expected balances are omitted to support independent counting.

The QR contains the existing `PKLOC|zone|slot` payload. Scan it through the floorplan scanner to open the location. It identifies a fixed location; it does not follow a moved pallet. Printing does not submit counts or change stock. Enter paper results in Cycle Counts using the existing workflow.

Choose A4 portrait, actual size/100%, and disable browser headers/footers. Normal labels print two per page. Long product lists can require additional space; review the preview. Print data requires a connected pallet snapshot. Allow the print popup if blocked.

Verified with `node tests/cycle-labels-browser.cjs` and `PK_COPY_BROWSER=webkit`: Edge/WebKit at desktop/mobile widths, zone shortcut, multi-selection, current O1/U geometry, mixed SKU/Lot, empty/zero stock, escaping, offline/popup errors, location QR resolver and print-only heading hiding. Edge generated three labels as two PDF pages. No physical printer, handheld scanner or phone camera was tested.
