---
name: finance-quest-ui
description: Design rules and clean-code rules for Finance Quest app UI, with the Figma file as the source of truth. Use before building, changing or reviewing any screen, component, style or user-facing copy in `front/`.
---

# Finance Quest UI

The Figma file **Finance Quest — Globe Learn Screen** is the source of truth for how the app looks. Code follows Figma; when the two disagree, Figma wins and the code is the bug.

- File: https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/Finance-Quest-%E2%80%94-Globe-Learn-Screen
- `fileKey`: `R4dCZH3fl7LqTwbqX3a6Jd`
- Tokens, type scale, elevation and the map of screen/component node IDs: [`DESIGN-REFERENCE.md`](DESIGN-REFERENCE.md).

## Workflow

Every UI task runs these steps in order.

1. **Look at Figma first.** Before writing any UI code:
   - `create_session` with the `fileKey` above.
   - Find the matching frame in the node map in [`DESIGN-REFERENCE.md`](DESIGN-REFERENCE.md). For a node not listed there, call `get_metadata` with `nodeId: "0:1"` (the result is large; extract it with `jq` into the scratchpad).
   - `get_screenshot` of the frame, and read the image.
   - Load the Figma `figma-design-to-code` guidance (skill, or the `skill://figma/figma-design-to-code/SKILL.md` MCP resource) and call `get_design_context` on the frame or component for exact values.

   Done when you have the screenshot and the exact sizes, colours and text styles of everything you are about to build. If no Figma frame exists for the task, say so, and compose the screen only from existing Design Kit components and tokens.
2. **Find what already exists.** Check `front/src/constants/theme.ts` and `front/src/components/` for the token or component before creating one. Each Figma component (Button, Stat Chip, Story Card, Floating Nav, ...) maps to one code component; reuse it, or extend it with a variant prop.
3. **Build** following the design and code rules below.
4. **Check.** Run `npm run check` in `front/` (typecheck, lint, tests). Compare the rendered screen against the Figma screenshot at 390 px width. Done when the check passes and every element matches the screenshot in colour, size, spacing and text style.

## Design rules

The look is "Commerzbank-inspired": deep **petrol** (`brand/primary` #002E3C) with **yellow** (`brand/accent` #FFCC00) on a cool off-white canvas. Calm, banking-grade, with game elements (XP, streak, pins, stamps) layered on top.

- **Yellow means "your next step".** Use `brand/accent` for the single primary action or active item on a screen: the Continue button, the active nav item, the current pin, the current story card (`accent-soft` fill + 2 px petrol border). One yellow focal point per view.
- **Petrol carries structure.** Headlines, progress fills for in-progress items, the globe ocean, dark hero cards. Text on yellow is petrol (`text/on-accent`), never white.
- **Surfaces stay light.** Screen background `bg/canvas`, cards `bg/surface` with a 1 px `border/default`. Use elevation instead of heavy borders for things that float (callouts, sheets, nav).
- **Status colours are semantic.** Green `feedback/success` = done/correct, red `feedback/danger` = wrong/negative amount, `feedback/xp` gold for XP, `feedback/streak` orange for streak. Use them only for those meanings.
- **Story colours identify a path.** Each story (city) has one `story/*` colour, used as the icon tile at 14% opacity with the icon in the full colour. Locked content uses `story/slate` and 60% opacity plus a lock icon.
- **Typography is Inter, from the scale only.** Use the 10 text styles in the reference; no ad-hoc sizes or weights. Copy is short: a title plus one meta line in `Label/Default` muted, with `·` as the separator ("Frankfurt · How stocks work", "Lesson 3 of 6 · 4 min").
- **Shapes are soft.** Radii: 10 small buttons, 12 icon tiles, 16 cards and callouts, 28 top of bottom sheets, 999 pills and chips. Icons are 24 px line icons with a 2 px stroke (22 px inside tiles and nav, 16 px inside buttons).
- **Mobile frame is 390 × 844.** 16–20 px side padding. The floating glass nav sits above content; give scrolling content enough bottom padding to clear it.
- **Motion and touch.** Pressables show feedback (scale ~0.98 or the `pressed` colour). Touch targets are at least 44 px.
- **Copy educates, never advises.** Explain concepts and consequences; never tell the user to buy a specific product (MiFID II, see root `AGENTS.md`).

## Code rules

Stack: Expo Router + React Native `StyleSheet`, TypeScript. No Tailwind and no styling library; translate Figma's Tailwind output into `StyleSheet` objects.

- **Tokens, never literals.** Every colour, font style, radius, spacing value and shadow comes from `front/src/constants/theme.ts`. Name tokens after the Figma variables (`colors.brandPrimary` ↔ `brand/primary`, `type.titleCard` ↔ `Title/Card`) so a value can be traced to Figma in one search. When Figma has a value the theme lacks, add it to the theme first, then use it.
- **One component per Figma component.** Name it like the Figma component (`StoryCard`, `PinCallout`, `StatChip`, `FloatingNav`). Express Figma variants (`State=Done/Active/Locked/Default`, `Type=Primary`) as one typed union prop, for example `state: 'default' | 'active' | 'done' | 'locked'`, not separate components or boolean piles.
- **Screens compose, components draw.** Files in `src/app/` arrange components and wire data and navigation; they hold almost no styling. Visual detail lives in `src/components/`.
- **Layout with flexbox.** Translate Figma auto-layout to `flexDirection`, `gap`, `padding`, `alignItems`. Use absolute positioning only where the design is truly free-placed (globe pins, the callout over the globe).
- **Small and typed.** One exported component per file, a `Props` type at the top, `StyleSheet.create` at the bottom. Data shapes live in `src/types/`. No `any`.
- **Accessible by default.** Every pressable has `accessibilityRole` and a label when it has no visible text; headers use `accessibilityRole="header"`; key elements carry a `testID`.
- **Assets are local.** Download icons and images from Figma into the project; never reference `figma.com/api/mcp/asset/...` URLs at runtime (they expire).
- **Comments say why**, in one line, in English.
