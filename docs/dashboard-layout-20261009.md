# PK Dashboard layout — 2026-10-09

- Overview: stock value, total Storage capacity, packaging age. Consistent 202px desktop cards; mobile value/capacity pair and full-width age card.
- Main analysis: wide movement trend with period/date controls, receive/issue/return totals, full-width plot and expandable daily table.
- Independent right stack: paired building gauges and a separate activity-distribution widget. The donut still uses the exact same movement summary and date controls; scope is visible on its own card.
- Lower sections: stock-value charts, top withdrawals and stock-value table. The table has a keyboard-focusable horizontal scroll region rather than widening mobile pages.
- Theme tokens and Noto Sans Thai retained. Standard 18px spacing/22px card padding; mobile 12px/16px. No inventory values or business logic altered.

Verification: WebKit and Edge layout at 1920,1440,1024,768,390,320px; light/dark; zero page overflow; movement data/7-day control; trend and building gauge animation/reduced motion. Unit suite 94/94; stock data and map asset hashes unchanged. Browser fixtures use isolated sample inventory, not production mutations.
