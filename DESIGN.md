---
version: alpha
name: PK WMS Operations
description: Charcoal operations dashboard with lime signals for BIO-COSLAB packaging inventory.
colors:
  primary: "#CEDE62"
  primary-hover: "#DEF184"
  on-primary: "#1D2410"
  canvas-dark: "#111311"
  surface-dark: "#1C1E1B"
  raised-dark: "#242720"
  ink-dark: "#F4F4F0"
  secondary-dark: "#BABDB4"
  muted-dark: "#91958B"
  border-dark: "#363A33"
  canvas: "#F4F4F0"
  surface: "#FFFFFF"
  ink: "#20231D"
  secondary: "#555A51"
  border: "#DCE0D5"
  success: "#A8D88C"
  warning: "#D8C36F"
  danger: "#FA8582"
  focus: "#CEDE62"
typography:
  page-title:
    fontFamily: Noto Sans Thai
    fontSize: 30px
    fontWeight: 760
    lineHeight: 1.2
  section-title:
    fontFamily: Noto Sans Thai
    fontSize: 16px
    fontWeight: 760
    lineHeight: 1.4
  body:
    fontFamily: Noto Sans Thai
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: 12px
  panel: 19px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  page-dark:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-dark}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.panel}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: 44px
  focus-indicator:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.on-primary}"
---

## Direction

PK WMS adapts the visual hierarchy of [Haulix by Phenomenon Studio](https://dribbble.com/shots/27229691-UI-UX-Design-for-Logistics-Dashboard-Haulix): a charcoal navigation rail, deep graphite cards, restrained borders and a lime active color. The reference is a fleet dashboard; PK WMS continues to show actual packaging stock, pallet occupancy, aging and warehouse-value data. Do not copy sample fleet metrics or artwork.

Dark is the default theme. A warm neutral light theme remains available through the existing toggle. The selected theme is stored under `pk-dashboard-theme-haulix`, allowing this redesign to start in dark mode while preserving future user choice. `haulix-theme.css` is loaded after the workflow CSS; functional layouts and responsive rules remain in their existing files.

## Layout and interaction

Desktop has a 278px navigation rail, a compact header and a fluid work area. The stock overview begins with a title, update controls, occupancy cards, age and capacity cards, then interactive warehouse and category charts. Keep Thai labels, real values and status text. Use a visible focus ring and at least 44px touch targets where practical. Mobile keeps the horizontal navigation and stacks overview cards. Reduced-motion users should not receive decorative transitions.

## Status and data

Lime marks selection and primary actions. Green, amber and red continue to communicate availability, aging and problems, always paired with labels or numbers. Use tabular numerals for counts and values. Keep CAD maps, QR codes, pallet status and printed labels legible; decorative styling must not obscure operational information.
