# Dashboard motion

Inspired by the user's dashboard-animation reference: https://www.instagram.com/reels/DeHGjlZPIHF/. The implementation is original and uses PK WMS's own layout, palette and operational data.

Visible cards enter with a 10px upward motion and opacity transition (340ms, 35ms stagger, maximum eight cards). Visible chart fills scale from their baseline (520ms, maximum 40 fills); chart replacements schedule one refresh per animation frame. Buttons have a brief press response; desktop stock cards have a small hover lift. Sidebar transitions fade its own content without animating grid width. Displayed quantities and DOM data are never counted up or rewritten for decoration.

The map and pallet-editing viewer are excluded from these effects. Animations finish without retaining style overrides, are cancelled for hidden tabs and honor `prefers-reduced-motion`. No blur/filter animations, continuous timers or external animation libraries are added.

Verification: `node tests/motion-browser.cjs` and the same script with `PK_MOTION_BROWSER=webkit` pass at 1440 and 390px. Checks running/finished effects, unchanged totals and bar styles, reduced-motion cancellation, no map effects and viewport bounds. Sidebar, pallet-copy and WebKit map workflows passed; all 78 unit tests passed. These tests do not establish frame rates on physical iPhone hardware.
