# Sidebar toggle

The panel icon beside the header branding opens/closes navigation. On desktop (1024px and wider), collapse keeps a 64px icon rail with working menu buttons, title tooltips and accessible names, and expands the work area; the preference persists under `pk-sidebar-collapsed`. On smaller screens, navigation is an overlay drawer, closed by default. The close button, backdrop, Escape or successful navigation closes it. Reduced-motion settings disable the slide transition.

The hidden mobile drawer is inert and aria-hidden; the desktop icon rail remains interactive. An open mobile drawer makes the underlying header/work area inert, traps Tab among the drawer's keyboard stops and returns focus to the toggle when dismissed. Native dialogs remain the innermost keyboard interaction. Logout closes an open drawer. Department/login screens retain their existing workflow and account/menu permissions are unchanged.

Map ResizeObserver callbacks now schedule their layout writes on an animation frame rather than inside observer delivery, fixing the WebKit resize-loop error found during drawer navigation.

Verification: `node tests/sidebar-browser.cjs`, and the same script with `PK_SIDEBAR_BROWSER=webkit` (PowerShell environment syntax on Windows), passed at 1440, 390 and 950px. Covers desktop work-area expansion, persisted collapse/reload, mobile navigation, Escape/focus return, close/backdrop and horizontal bounds. The existing 78 unit tests, pallet-copy browser workflow and WebKit map workflow passed. No physical-phone test is claimed.
