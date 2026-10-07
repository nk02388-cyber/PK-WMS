# Dashboard motion

Inspired by the user's dashboard-animation reference: https://www.instagram.com/reels/DeHGjlZPIHF/. The implementation is original and uses PK WMS's own layout, palette and operational data.

Visible cards enter with a 10px upward motion and opacity transition (340ms, 35ms stagger, maximum eight cards). Visible chart fills scale from their baseline (520ms, maximum 40 fills); chart replacements schedule one refresh per animation frame. Buttons have a brief press response; desktop stock cards have a small hover lift. The desktop sidebar expands and collapses over 240ms; the mobile drawer slides over 260ms while its backdrop fades in and out. Repeated toggles reverse the transition; reduced-motion preferences disable it. Displayed quantities and DOM data are never counted up or rewritten for decoration.

The map and pallet-editing viewer are excluded from these effects. Animations finish without retaining style overrides, are cancelled for hidden tabs and honor `prefers-reduced-motion`. No blur/filter animations, continuous timers or external animation libraries are added.

Verification: `node tests/motion-browser.cjs` and the same script with `PK_MOTION_BROWSER=webkit` pass at 1440 and 390px. Checks running/finished effects, unchanged totals and bar styles, reduced-motion cancellation, no map effects and viewport bounds. Sidebar, pallet-copy and WebKit map workflows passed; all 78 unit tests passed. These tests do not establish frame rates on physical iPhone hardware.

Sidebar update (2026-10-07): Edge and WebKit pass at 1440, 390 and 950px, including intermediate widths, rapid toggles, persisted state, logo alignment, focus recovery and reduced motion. Mobile map toolbar checks pass at 430×932, 390×844, 932×430 and 320×640. Physical iPhone performance remains unverified.
