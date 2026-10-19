# Receipt plan import — 19 October 2026

Imported 81 plan rows from the authenticated incoming-plan table at https://frolicking-pavlova-ec7d3a.netlify.app/. The source reports Excel `แผนเรียกเข้าวัตถุดิบเข้า Dashboard PK.xlsx`, uploaded by pkbcl01 at 17/10/2026 16:10 Bangkok time. There are 11 rows dated 19 October. All dates, product codes, names, quantities, original units, suppliers and PO strings are preserved, including unusual source codes/units. No stock or actual receipt is created by this import.

Source payload SHA256: `2b16f25893ec410cb352a06f816a0d389ebfb856c912ca4c107f816f399d48d9`. Imported at 2026-10-19 04:57:09 UTC. Private payload/archive stays in ignored workspace files, outside static deployment.

`supabase-receipt-plan.sql` creates an append-only snapshot store for privileged imports, RLS enabled with no browser table access. Its sole read RPC checks the active PK account's `receipt-plan` menu via the established `has_menu_access` helper. No browser import/write endpoint is added. Database checks confirmed 81 total/11 on the selected date, authorized read, denial for an unknown account, anon RPC denial, and direct table SELECT/INSERT denial for browser roles.

The existing plan tab now reads this snapshot, defaults to today, supports previous day/today/all dates and multi-keyword search, and displays source/import/check timestamps. The five-minute refresh checks PK WMS data; it does not log into or synchronize the source website. Further source changes require another authorized import, without replacing old snapshots.

Validation: 123 Node regression tests passed. Dedicated Edge and WebKit checks passed at 1440px and 390px for date/all/search/empty/malformed-response/error retention/HTML escaping/account-change race. Full-page 14-search-control integration passed desktop and mobile Edge. Actual handheld devices were not tested.
