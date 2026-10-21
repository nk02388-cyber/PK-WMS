# Existing-balance pallet labels — 21 October 2026

Open **พิมพ์ Count Sheet / Label** and the card **พิมพ์ Label ติดพาเลทจากยอดคงเหลือ · FM-ST-019**. Select the zone, load the current list, and check the pallet/product/Lot rows that need physical labels. Print uses one A4 landscape sheet with four copies per selected existing item, matching the receiving label layout.

Only items with known finite remaining quantity greater than zero are selectable. Labels show that remaining balance, not the original receipt quantity. Missing supplier/reference/receipt date shows “—”; dates and missing metadata are never invented. Selection is cleared and must be reviewed if the source item/quantity metadata changes before print. Printing requires connected pallet data.

This is print-only. It does not add items, create receiving documents or incoming pallet tags, update balances/history or write to the database. Retrospective labels explicitly say existing balance and use PKLOC QR to open the fixed location via the floorplan scanner. Ordinary receiving labels still use their registered PKTAG and receipt/batch quantities. No edit form is introduced in the retrospective print card.

Verified: `node tests/retro-labels-browser.cjs` in Edge/WebKit at desktop/mobile widths; positive/zero/unknown/negative stock, remaining-vs-received quantities, separate products/lots, metadata omissions, HTML escaping, stale/connection/popup failure, exactly unchanged SLOT_ITEMS, four copies per selected item, label content bounds and PDF pagination. Ordinary receiving-label and Count Sheet regressions also checked. Physical printer/phone-camera quality remains untested.
