# PK WMS reference redesign — 2026-10-08

Reference: [WMS Dashboard by Andrii Kuzma](https://dribbble.com/shots/27333090-WMS-Dashboard-Warehouse-Management-System-Web-App). The reference was inspected through its screenshots and embedded video. This is an original implementation using existing PK warehouse data and workflows; no robot operations or unsupported metrics were added.

The light theme uses an off-white navigation rail, white panels, cool grey canvas, blue inventory charts, mint category charts and green menu selection. The dark theme uses slate blue surfaces with mint accents. Noto Sans Thai, company logo, user avatars, access checks, stored sidebar preferences and the pallet layout remain in place. Menu icons use a consistent 24px SVG grid. Forms and tables use the same borders, spacing and surface colors.

Motion: existing sidebar expansion and mobile slide, chart entry and gauge sweep continue. Active menu icons settle into place over 220ms; account panels, dialogs and the pallet viewer open over 200–240ms. All effects respect reduced motion. Pallet colors continue to represent age, and no continuous warehouse simulation is added.

Validation: Edge and WebKit design checks at 1440 and 390px; sidebar at 1440/390/950px; WebKit audit of 16 menus and pallet forms at 1440/390/768px with no page errors or horizontal overflow; Admin/user settings and profile-photo flows; map toolbar at 430×932, 390×844, 932×430 and 320×640; chart/gauge reduced-motion tests. Screenshots in work/reference-dashboard-*.png are local test views, not a production data verification. Physical iPhone smoothness remains unverified.
