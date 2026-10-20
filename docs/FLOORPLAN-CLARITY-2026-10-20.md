# Floorplan clarity review — 20 October 2026

Reviewed all 41 zones, including the expanded O1 layout, in the overview and selected-zone viewer.

## Corrections

- U-26 through U-29 retain their existing short, border-box dimensions but now use the same overview border and white boundary shadow as other pallets. The old inline override removed both.
- Zoom labels can shrink below the previous 6px minimum when a long rack is fitted into a narrow mobile viewport, keeping the label chip within its pallet. Zooming in enlarges the label as before; the 19px maximum is unchanged.
- Pallet geometry, identities, stock, age thresholds, permissions and editing behavior are unchanged. No database migration is required.

## Verification

`node tests/floorplan-zone-clarity-browser.cjs` and the same command with `PK_COPY_BROWSER=webkit` check every zone at 1440px and 390px, in light and dark themes:

- All overview pallets retain a 1px boundary and visible shadow.
- Gray, green, yellow and red fills are consistent between zones, separately in overview and zoom views.
- Every selected-zone pallet has a border and matching code label; labels remain within pallet bounds after layout settles.
- Selected-zone counts match the current zone geometry and no unexpected browser errors occur.

Tests use local fixtures and simulated ages, with external requests blocked. Screenshots of all 41 zones in both viewport sizes are saved under ignored `work/zone-clarity/`; Edge contact sheets were visually reviewed. These screenshots do not represent live stock.

Physical phones are not covered. Long racks fitted into a phone's width still require pinch zoom to read individual codes comfortably.
