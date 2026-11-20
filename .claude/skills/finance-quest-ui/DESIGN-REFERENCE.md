# Finance Quest design reference

Values copied from the Figma Design Kit (node `3:55`) on 2026-11-20. Figma stays the source of truth: when a value here disagrees with `get_variable_defs` on `3:55`, trust Figma and update this file.

## Colour variables

| Variable | Hex | Use |
|---|---|---|
| `brand/primary` | #002E3C | petrol: headlines on dark, active borders, in-progress fills |
| `brand/primary-pressed` | #001F29 | pressed state of petrol elements |
| `brand/primary-soft` | #E6EEF0 | secondary button fill, soft petrol backgrounds |
| `brand/accent` | #FFCC00 | yellow: primary action, active nav item, current pin |
| `brand/accent-soft` | #FFF4CC | current / selected card fill |
| `bg/canvas` | #F5F7F7 | screen background |
| `bg/surface` | #FFFFFF | cards, sheets, callouts |
| `bg/tint` | #E3EDEF | tinted sections |
| `border/default` | #E1E6E8 | card borders, empty progress track |
| `border/strong` | #C9D2D6 | sheet handle, stronger dividers |
| `text/primary` | #0F1E24 | body and titles |
| `text/muted` | #5F6F76 | meta lines, inactive labels |
| `text/on-brand` | #FFFFFF | text on petrol |
| `text/on-accent` | #002E3C | text on yellow |
| `feedback/success` | #1E8A5E | done, correct, positive amounts |
| `feedback/danger` | #D64545 | wrong, negative amounts |
| `feedback/xp` | #B58B00 | XP |
| `feedback/streak` | #E8833A | streak flame |
| `globe/ocean-light` | #1B6F82 | globe gradient |
| `globe/ocean-deep` | #002E3C | globe gradient |
| `globe/land` | #CFE5DD | globe land |
| `globe/land-edge` | #9CC3B6 | globe land outline |
| `story/rose` | #D9577A | Amsterdam |
| `story/violet` | #6E5AD6 | Lagos |
| `story/orange` | #E8833A | Dubai |
| `story/teal` | #1E9AA8 | Cape Town |
| `story/slate` | #9AA5AB | locked (New York) |

Frankfurt (the current story) uses `brand/accent`. Story icon tiles: story colour at 14% opacity, 44 × 44, radius 12, 22 px icon in the full colour.

## Text styles (Inter)

| Style | Size / line height | Weight | Letter spacing |
|---|---|---|---|
| `Display/Amount` | 32 / 38 | 700 | -1.5 |
| `Display/Large` | 26 / 32 | 700 | -1 |
| `Title/Section` | 18 / 24 | 700 | 0 |
| `Title/Card` | 15 / 20 | 600 | 0 |
| `Body/Default` | 13 / 18 | 400 | 0 |
| `Label/Strong` | 12 / 16 | 600 | 0 |
| `Label/Default` | 12 / 16 | 500 | 0 |
| `Label/Tab Active` | 11 / 14 | 600 | 0 |
| `Label/Tab` | 11 / 14 | 500 | 0 |
| `Overline` | 10 / 12 | 700 | 0.8 px, uppercase |

Figma reports `Overline` letter spacing as `8`; that is 8 %, which is 0.8 px in React Native.

## Elevation (shadow colour is #001F29)

| Effect | Offset Y | Blur | Alpha | Use |
|---|---|---|---|---|
| `Elevation/Low` | 2 | 6 | 8% | resting cards |
| `Elevation/Mid` | 8 | 20 | 16% | callouts, popovers |
| `Elevation/High` | 16 | 40 | 28% | modals, hero cards |
| `Elevation/Sheet` | -6 | 24 | 12% | bottom sheets (shadow goes up) |
| `Elevation/Pin` | 4 | 8 | 30% | globe pins |
| `Glass/Nav` | 8 | 24 | 16% + 24 background blur | floating nav; fill white 62%, 1 px border white 95% |

## Shape and spacing

- Radius: 3 progress bars · 10 small buttons · 12 icon tiles · 16 cards, callouts · 28 sheet top corners · 32 nav orb · 999 pills.
- Story card: padding 10 vertical, 12 left, 14 right; gap 12; title/meta/progress gap 4; progress bar 150 × 5.
- Small button (`Continue`): padding 8 vertical, 14 left, 12 right; gap 6; `Label/Strong`; 16 px arrow icon.
- Bottom sheet: padding 16 sides, 10 top; handle 40 × 5; item gap 10.
- Floating nav: orb 64 × 64; glass pill padding 6; items 66 wide, 7 vertical padding; gap 8 between orb and pill.

## Node map

| Node ID | Frame |
|---|---|
| `3:55` | Design Kit (colours, type, elevation, icons, all components) |
| `3:496` | Learn — Globe (home: globe, pins, callout, story sheet, nav) |
| `3:616` | Story list bottom sheet |
| `3:599` | Pin Callout |
| `26:663` | Floating Nav (Learn mode) |
| `63:2744` | Story — Amsterdam 1637 (story path: tram line, stations, branches) |
| `70:2742`, `70:2940`, `70:3109` | Story concepts: street walk, trip itinerary, city block |
| `28:1006` | Section: Onboarding · Survey · Tutorial (frames `29:1036` to `31:1626`, kit `28:1007`) |
| `36:2016` | Section: Profile · Review · Rewards (profile `42:2048`, review `45:2280`–`45:2335`, rewards `48:2340`, kit `36:2017`) |
| `55:2491` | Section: Glossary (browse `55:2492`, search `57:2552`, definition `57:2692`) |
| `67:3047` | Section: Duel (matchmaking `67:3953`, lobby `67:4010`, question `67:4267`, feedback `67:4342`) |
| `11:452`, `26:725`, `26:932`, `26:1128` | Bank shell: Home, Payments, Credits, Invest |
