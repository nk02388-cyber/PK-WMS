# PK WMS — Design System

Version 1.2, 15 October 2026. Current visual contract for [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [AGENTS.md](AGENTS.md). Code baseline: `bf518e7`. This document consolidates superseded design notes into the current behavior; it does not redesign the product.

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
