# Count Sheet — 21 October 2026

This replaces the Cycle Count pallet-front label output added earlier today. Open **พิมพ์ Count Sheet / QR**, choose a zone and required pallet positions, then **พิมพ์ใบ Count Sheet พร้อม QR**. The Cycle Counts shortcut carries its selected zone into the printing card.

The result is an A4 landscape table for walking a count route, with sequence, position and QR, SKU/name, Lot, unit, blank actual count and notes. Multiple items on a pallet have separate rows. Empty selected locations are included. Document number, date, start/end times, counter and reviewer are handwritten; this print action does not create a numbered online count job. Zone/date/document identification and column headings repeat on subsequent printed pages. Expected quantities are omitted.

Use A4 landscape, actual size/100%, browser headers/footers off. QR identifies a fixed location and uses the existing floorplan scanner. Write actual results on paper and enter them in Cycle Counts. Printing does not save counts or adjust stock. Ordinary location and product QR labels remain in the same menu.

Tests: `node tests/cycle-labels-browser.cjs` with Edge and WebKit at 1440/390px. Checks selection/zone shortcut, current O1/U positions, mixed SKU/Lot, empty positions, escaping, no expected quantities, blank count cells, QR resolver, offline/popup errors, full-zone pagination and unchanged ordinary location label output. Edge PDF check fits four count rows on one A4 landscape page and paginates a full zone. Physical printing and phone-camera scans were not performed.

Count Sheet sequence heading correction (21 October 2026): first column is 5% with 1 mm inline padding and nowrap for its heading/numbers; notes column is 19%. Browser checks measure the actual Thai heading at the printable A4 landscape width (1047 CSS px) to ensure one line and sufficient content width, in Edge/WebKit.
