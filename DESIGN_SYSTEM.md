# PK WMS — Design System

Version 1.3, 16 October 2026. Current visual contract for [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [AGENTS.md](AGENTS.md). Foundation baseline: `bf518e7`, with the scoped Hallmark Dashboard corrections described below.

## Overview and use

Use these patterns for PK WMS inventory workflows and shared login/department navigation. A component represents a specific action and data source; styling must preserve units, history, loading/error states and accessible names. Do not apply PK account assumptions to the separate RM/FG applications. Authoring skills described in [docs/SKILLS.md](docs/SKILLS.md) are not browser plugins.

## Foundations and CSS ownership

`account-login.css` defines compact entry cards; `haulix-theme.css` and then `reference-wms.css` establish final themes. Feature styles such as `dashboard-layout.css`, `product-history.css` and `floorplan-mobile-controls.css` own their scoped layout. `typography.css` contains important type overrides: inspect computed styles rather than assuming a late font-size wins. `auth-redesign.css` remains an unused historical file and is not linked by the current page. The Figma split-screen design is superseded. `DESIGN.md` points here instead of maintaining a second palette.

| Semantic token | Light | Dark | Role |
|---|---|---|---|
| `--page-plane` | #f1f3f5 | #15242b | Page canvas |
| `--surface-1` | #ffffff | #1e3038 | Cards/header |
| `--surface-2` | #f7f9fa | #253b44 | Nested surfaces |
| `--text-primary` | #23313a | #edf4f7 | Main text |
| `--text-secondary` | #52616a | #bdd0d9 | Secondary text |
| `--text-muted` | #6d7b84 | #a0b6c1 | Hints |
| `--border` | #e0e6ea | #354b57 | Dividers/controls |
| `--series-1` | #267457 | #9ed5ba | Primary interactive accent |
| `--nav-ink` | #f9fafb | #1b2c34 | Sidebar background |
| `--nav-active` | #dff1e8 | #294f44 | Selected menu |
| `--nav-text` | #4b5963 | #c9d9df | Sidebar labels/icons |
| `--focus-ring` | #4b9e80 | #9ed5ba | Visible focus |

Default theme is dark; users explicitly select light/dark and preference persists in `pk-dashboard-theme-haulix`. Do not silently substitute OS auto-dark. New components should reference semantic CSS variables; raw values above are documentation of the current palette.

Noto Sans Thai is served locally through `typography.css`. Use the existing type scale: 22px page title, 18px section title, generally 14px body/control text; mobile pallet form fields use 16px to avoid browser zoom. Main panel/control radii are 14px/10px. Dashboard gap/padding: 18px/22px desktop, 12px/16px mobile. Prefer 44px interactive touch targets; existing smaller controls need individual checks rather than a blanket accessibility compliance claim.

## Component entries

### Login and department chooser

**Overview/use:** compact cards for selecting the warehouse application and signing into PK. Do not use them as evidence of shared RM/FG identity.

**Anatomy:** department card contains BCL logo/name, heading/instructions, three icon choices, separate-account note and footer. Login card contains department switch, logo/product badge, username, password/PIN with reveal button, help/error/loading, submit and footer. The department switch uses a decorative four-square SVG plus visible text; no arrow.

**Variants/states:** light/dark; required fields, password visibility, pending, rejected credentials, network failure, success and Back. Back clears the password and invalidates delayed login results. Existing sessions can enter PK after department selection. Avatar upload remains in Settings only.

**Tokens:** surfaces/borders/text/accent/focus use the foundation tokens. Cards use existing compact geometry from account-login.css, including a 440px maximum login card, responsive padding and 50px input/action baseline. Reference and typography overrides determine final rendering.

**Accessibility:** native form/labels/autocomplete, Enter submits; reveal has accessible name and pressed state; error uses alert, loading uses status. Decorative SVGs are hidden from assistive technology. No new contrast certification is implied.

**Related:** account Settings, mobile navigation. Evidence: tests/auth-flow-browser.cjs and tests/department-login.test.cjs.

### Dashboard and dates

**Anatomy:** overview stock value / total capacity / activity distribution; full-width packaging-age strip; movement trend beside building capacity; lower value distributions. Primary overview weights are 1.15 / 1.05 / 0.9 with 270px desktop cards, 20px gaps, 44–56px value, 210px total gauge, 180px building gauges and 140px activity donut. Donut legend aligns right at up to 210px, with a 24px gap. At 1100px and below activity uses a full row; at 600px primary cards stack at 240px and donut uses 120px/16px gap.

**Variants/states:** one green→yellow→red capacity arc and dotted needle grammar for total/buildings, numeric used/total/available values from the same capacity calculation. Trend uses full container width and a 230px SVG height; text/markers do not stretch. Building cards align top/bottom with movement analysis above 1250px. Category bars use gauge green #5aa77d; warehouse bars use #78b0c9 and #5c95af hover. These are current chart-specific values, not new global theme tokens.

**Date controls:** two labeled date fields, From and To, start at the first day of the current Bangkok month through today. Trend, totals, daily rows and donut share the inclusive interval. Empty/reversed dates preserve the last valid chart and show validation. Single-day plots center points without duplicated labels.

**Hallmark corrections (16 October):** at 600px and below the stock-value and total-capacity cards size to their content instead of a fixed 260px minimum. Activity heading/date stack vertically; activity dates, legend and capacity detail use 13px text. Update Stock, calendar and notification targets are at least 44×44px at this breakpoint. Desktop card dimensions remain unchanged; the stock-value card uses a uniform 1px border in both layouts, preserving its green surface. Dashboard CSS records its DESIGN.md / DESIGN_SYSTEM.md ownership. Evidence: tests/dashboard-layout-browser.cjs covers 320/375/390/414/768/1024/1440/1920px, with mobile content containment and touch-target checks.

**Shared workbench (16 October):** `wms-workbench.css` is a scoped final layer consuming the existing theme tokens. Dashboard starts with its overview metrics; the duplicate action list was removed at the user’s request. Actionable notifications remain available through the header bell. Receiving forms use 48px controls and a stronger primary action; receiving-history tables retain horizontal scrolling and use sticky headings and tabular numbers. Withdrawal/return fields have accessible names, at least 44px height, and one-column field order at 600px and below; date defaults, suggestions and validation remain unchanged. Entry cards retain their compact flow and use shared surface/radius/accent tokens with 13px supporting text. Mobile notification/account panels retain left/right half-screen placement and safe-area/available-height bounds, with larger notification actions and readable details. `tests/workbench-browser.cjs`, the auth-flow and header-popover browser checks cover the affected interactions with fixtures.

**Accessibility:** units, percentage/denominator and text legends remain available without interpreting color. Daily rows provide a text alternative. Date controls are keyboard-operable; browser fixtures do not establish full screen-reader or physical-device coverage.

**Related:** product-history range, freshness header. Sources: dashboard-insights.js, dashboard-layout.css, dashboard-motion.js.

### Product-history date range

**Overview/use:** filter retained movements for a selected product; do not treat these as the current stock snapshot.

**Anatomy:** product/stock context → history heading and filtered count → From/To date controls → table or empty/loading message → full-history reconciliation and explanatory notes.

**States:** default current Bangkok month through today; inclusive valid range, invalid range, no matches, loading/failure, pagination. Selection persists while switching products in the current page session. Undated rows are excluded from a dated result and disclosed. Filter runs after full-history running balances, so a selected range does not reset balances to zero. The stock comparison remains based on complete retained history and snapshot date.

**Tokens:** page-plane date background, border, text-primary/secondary, focus-ring; 145px date fields with at least 44px height and 10px radius. Narrow layouts wrap controls and use 16px input text.

**Accessibility:** explicit From/To labels, native date inputs, required validation with a Thai error for missing/reversed range, focus restored after rerender. Table scrolls horizontally inside its own region.

**Related:** stock card and Dashboard dates. Evidence: tests/product-history.test.cjs, tests/product-history-range-browser.cjs.

### Sidebar and map

**Sidebar anatomy/states:** 64px icon rail with company logo, menu labels/badges and toggle. Desktop pointer hover or keyboard focus expands the whole navigation over content; reserved rail width stays constant. Toggle pins 278px navigation and slides content alongside it. Long menu rows use stable 262px label layout, switching between 44px/68px without height animation. No floating menu-name labels. Mobile uses a drawer with backdrop, focus trapping/restoration, Escape and inert background.

**Map anatomy:** zoom percentage, minus/plus, rotate, reset and fullscreen toolbar; cropped drawing and all pallet overlays share one presentation transform. Normal mobile controls reserve space above the map; fullscreen preserves available map height. Zoom range is 10–600%; reset returns to 100%. After rotation, dragging clamps to actual drawing bounds rather than screen height. Reduced drawings are centered on axes where they fit. Pointer gestures do not select text/images or trigger blue selection; dragging/pinching must not select a zone. Map selection suppression is scoped to the overview and zone viewport, not transaction forms.

**Accessibility:** named native controls remain keyboard-operable alongside mouse/pinch gestures; preserve focus and reduced-motion settings. Geometry and pallet identities must remain unchanged by presentation transforms.

**Related:** pallet detail/transaction forms and copy destination. Evidence: tests/sidebar-hover-browser.cjs, tests/sidebar-browser.cjs, tests/overview-pan-browser.cjs, tests/overview-pan-bounds.test.cjs, tests/zoom-portrait.test.cjs.

### Transaction forms, scanning and feedback

Withdrawal/return date defaults are today in Bangkok. Quantity, actor and document inputs expose native datalist suggestions from the latest five distinct nonempty values across loaded pallets/products, separated by action. Selecting a suggestion fills only that field; historical rows are not rewritten. Separate recent-history tables are superseded. Browser controls popup appearance.

QR camera actions use the supplied qr-code.png as a 28px alpha mask with a green high-contrast button, text and focus indicator (46px minimum height). Camera and Excel libraries load only on use. Import/Export asks for the stock PIN; import authorization belongs on the server, not the button appearance.

Quiet synthesized hover/click tones begin after user interaction; disabled/inert/synthetic events remain silent, hover is throttled, and mute preference syncs across browser tabs. QR confirmation sound remains separate. No continuous audio is intended.

## Motion

Motion 14.1.1 is vendored locally with its MIT license. Finite page entries use a 20–40px horizontal slide and fade over 320–380ms; incoming/putaway content uses 40px/380ms. Bounded staggering avoids long delays. Native browser animation is the fallback. Rapid navigation, hidden document and reduced-motion cancel animation and restore inline properties. Sidebar uses its own 280ms slide and 200ms label fade, with a 120ms pointer-leave delay; do not stack a second menu-label translation. Gauge/trend effects finish at the actual value.

## Data presentation states

| State | User-facing behavior |
|---|---|
| Locked | Explain login/menu access; clear privileged prior-account data |
| Loading | Show status; unloaded is not confirmed zero |
| Error | Visible failure/retry; do not substitute a public stock/BOM fallback |
| Empty | State no loaded records match; preserve search/date controls |
| Ready | Actual values with units, denominator and data date |

These are shared requirements; coverage varies by feature. New placeholders are not claimed implemented simply because listed here.

## Correct and incorrect usage

| Correct | Incorrect and reason |
|---|---|
| Use compact Login and department cards | Restore superseded split Figma screen without a new request |
| Hover expands sidebar over content; toggle pins it | Shift the page on hover or add floating menu tooltips |
| Filter movements after full running-balance calculation | Reset running balance to zero at the selected start date |
| Read snapshot date and movement dates separately | Claim a filtered movement total is current stock |
| Pan the drawing using its rotated rendered bounds | Clamp every zoom level to viewport height |
| Reserve map toolbar space on mobile | Place a tall wrapping toolbar across pallet zones |
| Edit avatar in Settings | Add an upload action to the header account dropdown |

## Validation and governance

Use affected browser fixtures and matching unit/SQL tests. Include mobile/light/dark and reduced motion where relevant. Check focus, labels, overflow and contrast for changed components; do not claim full WCAG certification or physical-device testing from fixtures. [Review ledger](docs/SKILL-REVIEW-2026-10-15.md) records this revision's evidence and limitations.

Keep PRD behavior, architecture ownership and final CSS precedence synchronized. Do not add a dependency or alter business data solely to match a documentation example.

## Changelog

- 1.2 — 2026-10-15: Consolidated current component entries; restored compact Login/departments, documented grid icon, dated product history, 10–600% map zoom/rotated panning, selection suppression, lazy libraries and finite Motion. Removed contradictory current-vs-superseded design notes.
- 1.1 — 2026-10-09: Defined presentation states and distinguished requirements from observed coverage.
- 1.0 — 2026-10-09: Established reference WMS tokens/components with design-system-doc. Source provenance: docs/SKILLS.md.


15 October 2026 performance follow-up: reference/map JPEGs use asset URLs instead of embedded base64, with identical source bytes. BOM automatic refresh respects active BOM/planning panes and reuses baseline data in memory for up to 15 minutes; manual refresh remains available. No component layout, map geometry or visual tokens change. Evidence: [implementation report](docs/REPORT-IMPROVEMENTS-2026-10-15.md).


15 October 2026 mobile header fix: account and notification menus at widths below 1024px use fixed viewport insets with border-box sizing. Their top/available height follow the actual header and visual viewport on resize/scroll, and contents scroll internally on short screens. Mobile account buttons have at least 44px height. Toasts show only the newest message near the safe bottom edge and are suppressed while account/notifications/calendar/navigation is open; bell entries and unread state remain intact. Evidence: tests/header-popovers-browser.cjs (Edge/WebKit at 320, 390, 430, 932 and 1440px; light/dark, resize and scroll). Physical iPhone verification remains user-side.


15 October 2026 entry theme controls: compact department and User Login cards each expose a 44px sun/moon toggle at the top right. Both use the same explicit light/dark preference as the Dashboard, update accessible labels/pressed state together, persist through reload, and sync storage changes. Native button keyboard activation works without submitting Login. No new theme key or default-theme change is introduced. Evidence: tests/entry-theme-browser.cjs and tests/theme-toggle.test.cjs.


15 October 2026 header menu placement: below 1024px, notification popover occupies the left half and account popover the right half, separated by 12px and retaining 12px outer/safe-area margins. Controls and notification cards wrap inside each column; short screens retain internal scrolling. Existing button/outside-click/Escape behavior and desktop placement remain. Validated with half-column and content-overflow assertions in tests/header-popovers-browser.cjs on Edge and WebKit.


15 October 2026 mobile notification placement update: notification popover is bottom-anchored with safe-area margins and up to 60dvh height; transient toasts remain at the bottom. The account menu retains the right half below the header. This overrides the earlier left-half notification placement only below 1024px; desktop is unchanged.


15 October 2026 latest placement: mobile notification menu returns to the left half beside the right-half account menu below the header. Only transient toast messages stay bottom-anchored. Desktop is unchanged; this supersedes the bottom-anchored notification-menu entry above.


15 October 2026 stock-card reconciliation: Scrap/ตัดจำหน่าย is treated as outbound in product-history running balances and comparisons, matching the pallet ledger. Unknown comparisons show reason counts for missing/invalid movement dates, quantities, unsupported movement types, invalid snapshot date, or unavailable stock for the unit. Unknown values are never coerced to zero; no historical records are changed. Tests: product-history.test.cjs, product-history-range-browser.cjs.


15 October 2026 sound profile: UI hover uses a short filtered square-wave bleep; activation combines two brief bleeps and a triangle bass hit for an original early-2000s game-menu character. Envelope levels use a 2× multiplier (200%). Existing gesture unlock, hover throttling, synthetic/disabled silence, cross-tab mute and preference persistence remain; QR confirmation is separate. No game recording or external audio file is loaded. Evidence: tests/ui-sound-browser.cjs, including real Web Audio unlock; perceived loudness on hardware is not measured.


15 October 2026 latest sound profile: use short local menu navigation/confirmation excerpts, loaded and decoded once after an enabled gesture. The prior synthesized profile is retained only for failed/unsupported sample loading. Level multiplier stays 2× with hover/click balancing; mute behavior is unchanged. Attribution, excerpt timings, hashes and validation: [UI audio sources](docs/UI-AUDIO-SOURCES.md).

15 October 2026 reorder usage review: a 44px analysis action on each product opens an inline card above the reorder table. Code/unit heading, date range, lead days and safety quantity use a four-column desktop grid and two-column mobile grid. Four metrics separate gross withdrawals, returns, net and daily gross average. Warning text distinguishes malformed records, other units and unverified coverage; absent/invalid inputs show no preview. Close restores focus to the originating row; heading receives focus on open. Existing product-code buttons still open product history. Theme tokens are reused. Default 56-day dates are inclusive; scenarios are labeled experimental and never replace the workbook ROP alert threshold or Update Stock quantity. Tests: reorder-usage.test.cjs and reorder-usage-browser.cjs.

15 October 2026 S1 layout: the upper bay has three equal positions (S1-01, S1-02, new S1-15), centered within the bay; the middle row has eight (new S1-16, S1-17 followed by existing S1-03 through S1-08). Existing S1-03 through S1-14 geometry and all pallet identities/history are preserved. Total mapped capacity is 17. Masks remove obsolete upper rack/sign artwork under the new geometry. The same coordinates drive overview, zoom, selection and putaway choices. Supabase incoming_locations was extended with S1-15/16/17 and verified at 17 S1 positions; no pallet inventory was written. Reapply reference registration with supabase-s1-locations.sql; baseline seed is also 17. Evidence: pallet-row-layout.test.cjs, capacity-usage.test.cjs and fixture Edge desktop/mobile map selection checks.

15 October 2026 S1 numbering supersedes the temporary S1-15/16/17 placements: physical rows now read S1-01–03, S1-04–11, S1-12–14 and S1-15–17 from left to right, top to bottom. Geometry is unchanged from the 17-position expansion. One-time supabase-s1-renumber-20261015.sql backs up S1 slots/audit/putaway/location records with SHA-256 in the private archive, remaps identities atomically, increments versions above the previous maximum to reject stale editors, and checks all inventory/history payloads remain intact. Historical free-text references inside item JSON stay as recorded. Old S1-12/13/14 inventory now belongs to S1-15/16/17 at the same physical coordinates. Reload old open pages after release. Evidence: s1-renumber-migration.test.mjs (local PostgreSQL preservation/backup/rerun guard), pallet-row-layout.test.cjs and s1-renumber-browser.cjs (desktop/mobile sequential labels and edit target).

15 October 2026 S1 alignment: shift the full S1-04–11 middle row left and normalize its existing near-equal pitch to the top row's 0.728%, aligning S1-06/07/08 exactly beneath S1-01/02/03. Vertical positions, all 17 identities, upper/lower rows and inventory remain unchanged. Mask obsolete CAD middle-rack artwork at the old position in overview and zoom. Geometry tests verify alignment and spacing; fixture desktop/mobile editing checks pass. No database change.

16 October 2026 product history: when a valid selected date range contains no movements, show a presentation-only opening row per unit with the last recorded running balance strictly before the start date. Opening rows have no receipt/issue quantity, are labeled ยอดยกมา and do not increase the period movement count. No prior history means no invented opening row; unknown quantities or undated entries keep the unit's opening unknown. Future movements and Update Stock never seed the opening. The stock comparison remains independent and unchanged. No ledger or database writes. Evidence: product-history.test.cjs and product-history-range-browser.cjs (desktop/mobile opening, zero count and unknown display).

16 October 2026 product history all-records control: a button beside the retained From/To dates toggles แสดงรายการทั้งหมด / แสดงตามช่วงวันที่ with aria-pressed and restored keyboard focus. All mode shows every loaded movement for the selected product, including undated rows and records beyond the 100-row pagination limit, without synthetic opening rows. Returning restores the previous date range; committing a valid date edit also returns to range mode. Existing running balance and stock comparison use the same ledger. No new requests, dependencies or data writes. Evidence: product-history-range-browser.cjs checks 107 fixture rows, undated inclusion, toggling, date edits and no overflow on Edge/WebKit at 390/768/1440px.

16 October 2026 U lower rack only: U-26/27 and U-28/29 overlay heights are 90% of the actual vertical row-center gap (0.459% of the drawing), leaving separation without moving or renaming slots. palletSlotHeight is shared by overview, zoom and neighbouring U context. Four overview markers omit the border/outer shadow because the browser's minimum pixel border caused overlap at mobile map scale. Other slot dimensions, especially S1, are unchanged. No database writes. Evidence: pallet-row-layout.test.cjs checks only these four shrink; u-renumber-browser.cjs checks DOM rectangles are separate in desktop/mobile overview and zoom, plus existing context/selection behavior.

16 October 2026 selected-pallet visibility: after openSlotEdit shows and lays out the details panel, revealEditingSlot pans the existing map just enough to place the selected cell inside the remaining viewport with a 12px margin above the panel. Screen-space deltas reuse zoomPanX/Y so all four rotations work; zoom scale and pallet coordinates are unchanged. Already-visible cells do not move; cells larger than the available area are centered on that axis. Hidden/closed/other-zone selections are ignored. The shared openSlotEdit path covers map taps and search links; no data writes. Evidence: slot-selection-visible-browser.cjs checks U27 with the panel open at four rotations on desktop/mobile Edge and WebKit, and unchanged zoom; map-rotation.test.cjs and pallet-security.test.cjs pass. Physical on-screen keyboard behavior is unverified.

21 October 2026 Cycle Count labels: the existing print menu is named พิมพ์ Label / QR · Cycle Count. The new card selects a zone and multiple current geometry positions, with select-all/clear and an announced selected count. The Cycle Counts shortcut carries the selected zone into this card. Printing requires connected pallet data and uses the same CycleCountCore snapshot rules (including unknown balances and occupied positions without item details). Labels contain slot/zone, PKLOC QR with four-module quiet zone, SKU/name/Lot/unit and blank physical count/date/counter/reviewer fields; expected quantities are deliberately omitted. QR resolves through the existing floorplan scanner, not a public URL or a count submission. A4 portrait uses two normal labels per page; unusually long item lists may need more paper. No stock, schedules or count results are changed. Reuses existing print, barcode and theme helpers with no new dependency. Evidence: tests/cycle-labels-browser.cjs in Edge/WebKit at 1440/390px, light/dark overflow checks, selection/offline/popup/escaping/QR resolver checks, and Edge PDF pagination. Physical printing and phone-camera scan quality remain untested.

21 October 2026 Cycle Counts online revision supersedes the local-only notice: frequencies, shared draft and history use authenticated, menu-guarded RPCs with optimistic version checks. New controls load latest, save draft online, import legacy local data without overwriting existing schedules/drafts, and download unsent form data. Unsent edits show a warning and stay on screen on network/conflict failures; confirmation is required before reloading dirty edits. History says online; no stock adjustment is implied. One shared job is supported, with idle polling every 30 seconds. Mobile sticky-scroll measurement excludes the fixed drawer so the completed-count button remains reachable. Tests: cycle-counts-online.test.mjs (real disposable Postgres), cycle-counts-online-browser.cjs (Edge/WebKit, two browser contexts including 390px), cycle-labels-browser.cjs regression.

21 October 2026 Count Sheet revision supersedes the two-label Cycle Count layout: the same zone/multi-position selection now produces one continuous A4 landscape count table. Each active SKU/Lot row repeats the location and location QR (18 mm, four-module quiet zone); empty selected positions remain explicit. Columns are sequence, position/QR, SKU/name, Lot, unit, blank physical count and notes. Header includes blank document number/date/time/counter fields; the table header repeats zone/date/document identification on subsequent pages; footer has counter/reviewer signatures. No expected balance is printed and no count job or stock mutation is created by printing. Existing ordinary product/location QR label controls are retained. Sidebar and Cycle Counts shortcut now say Count Sheet. Verification: cycle-labels-browser.cjs in Edge/WebKit, 1440/390px; four rows fit one A4 landscape PDF page, full-zone rows paginate, multiple SKU/Lot and empty positions stay present, values are escaped, offline/popup errors and legacy location labels preserved. Physical printer/camera remains untested.

21 October 2026 existing-stock Label printing: the print menu now includes an FM-ST-019 card to select existing items from a zone's pallet positions. Only known finite remaining quantities greater than zero appear. One A4 landscape sheet has four copies of each selected item, reusing the receiving printer. Labels use current remaining quantity and recorded SKU/name/Lot/unit/receipt fields; missing metadata stays “—”. The retrospective branch is explicitly marked as existing balance and uses the existing PKLOC location payload, never a fabricated PKTAG. No receipt/tag/inventory record is created or updated. Before opening print, connected-state and snapshot equality checks reject changed selections. Account changes clear selected private data. The ordinary receiving PKTAG/batch quantity path remains unchanged; QR quiet zones use four modules. Tests: retro-labels-browser.cjs (Edge/WebKit at 1440/390px, positive-only/current-balance selection, stale/offline/popup guards, missing metadata, escaping, exact inventory preservation, printable label bounds, 2 PDF sheets for 2 selected items and ordinary incoming-label regression).

21 October 2026 date-display revision: human date text across PK WMS and embedded Operations now uses DD/MM/YYYY with Gregorian years. Shared `date-display.js` formats date-only ISO/slash/legacy Thai report metadata and timezone-qualified timestamps; timestamps retain time and explicitly use Asia/Bangkok. Invalid/absent dates show “—”. Label receipt/manufacture/expiry fields and Count Sheet print timestamps use it, as do stock metadata, history/cutoff/audit timestamps, cycle-count schedules/history, scrap history, receipt-plan status, notifications, calendar headings and dashboard dates. Calendar month-only headings and month groups show MM/YYYY, without inventing a day. Operations reports/ticket/audit timestamps use four-digit Gregorian dates; planned dates/report scopes and holiday display use DD/MM/YYYY. Holiday textarea converts the displayed dates back to ISO before the existing settings validation; native date fields retain ISO values and declare en-GB. Database dates, filtering/sorting keys, JSON backups and inventory data stay unchanged. Tests: date-display.test.cjs, date-display-browser.cjs, retro-labels-browser.cjs, receipt-plan-browser.cjs, operations-keyword-browser.cjs, calendar-realtime-browser.cjs and the complete Node regression suite.

22 October 2026: added the original Cycle Count pallet-front Label/QR as an additional print action alongside Count Sheet. Both use the same zone/position selection, readiness validation, location QR and count snapshot. Count Sheet remains A4 landscape; pallet labels use A4 portrait with two normal labels per page, large position code, product/name/Lot/unit and blank actual-count/date/counter/reviewer fields. Expected balances are omitted; empty selected positions remain explicit. Ordinary FM-ST-019 existing-stock labels are a separate card. No stock or count records are written. Edge/WebKit desktop/mobile checks cover both outputs, mixed products, empty positions, escaped names, disabled empty selection, three labels/two PDF pages and exact inventory preservation. Long item lists can need more paper; physical printing remains untested.
