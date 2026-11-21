# Duel v3 — Figma state

## Duel v3

File `R4dCZH3fl7LqTwbqX3a6Jd`, page "Page 1", section **"New duel"** `152:3648` (x 12762, y -45).
The section was widened from 4270 to **7660** px; the v2 frames and the v2 kit were not moved or changed.
The v3 block starts at section-relative x 4370, with the heading text `166:8331` at y 16.
Row 1: captions at y 60, frames at y 220. Row 2: captions at y 1340, frames at y 1500.
Link pattern: `https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=<id with - instead of :>`.

Screenshots (1.5×) are in `.plans/duel-v3-figma/`. They are for review only; do not commit them unless the team wants to.

| # | Frame | Node | Link | Caption | Screenshot |
|---|---|---|---|---|---|
| 1 | Duel v3 — Question · sort (Submit disabled) | 166:4997 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-4997) | 166:8301 | `01-question-sort.png` |
| 2 | Duel v3 — Question · match (Submit disabled) | 166:5181 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-5181) | 166:8304 | `02-question-match.png` |
| 3 | Duel v3 — Question · slider (Submit active) | 166:5311 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-5311) | 166:8307 | `03-question-slider.png` |
| 4 | Duel v3 — Rankings · medal cards + sticky row | 166:5622 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-5622) | 166:8310 | `04-rankings-sticky.png` |
| 5 | Duel v3 — Rankings · your row merged (scrolled) | 166:6337 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-6337) | 166:8313 | `05-rankings-merged.png` |
| 6 | Duel v3 — Rankings · climb #7 → #6 (3 steps) | 166:7025 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-7025) | 166:8316 | `06-rankings-climb.png` |
| 7 | Duel v3 — Result · win (confetti, XP count-up, category bars) | 166:7608 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-7608) | 166:8319 | `07-result-win.png` |
| 8 | Duel v3 — Result · loss (rival won, no confetti) | 166:8955 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-8955) | 166:9258 | `08-result-loss.png` |
| 9 | Duel v3 — Result · draw (no confetti) | 166:7903 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-7903) | 166:8322 | `09-result-draw.png` |
| 10 | Duel v3 — Result · solo (score only) | 166:8085 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-8085) | 166:8325 | `10-result-solo.png` |
| 11 | Duel v3 — Level-up overlay (tap to continue) | 166:8235 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-8235) | 166:8328 | `11-level-up.png` |
| — | Duel v3 · Kit | 166:5407 | [open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-5407) | — | `12-kit.png` |

Row 2 x positions (section-relative): win 4370, loss 4840, draw 5310, solo 5780, level-up 6250, kit 6720.

### Design decisions taken in the frames

- **Footer (D11).** The footer is fixed at the bottom of the screen. It has `bg/canvas`, a 1 px `border/default` top line, and padding 12/20/24/20. It holds, top to bottom:
  - the tip "Time doesn't affect points — accuracy counts";
  - `Button / Large` Primary "Submit";
  - for sort and match only, the hint "Sort every card to submit" or "Match every pair to submit".

  Disabled = the app's `Button` disabled style (opacity 0.4). Sliders are active at once and show no hint.
- **Rankings (D12–D13).**
  - The rankings are a stack screen with a back chevron and **no tab bar**, as in `app/duel/rankings.tsx`. The v2 frame showed a tab bar.
  - The navy header is fixed and the list scrolls under it.
  - The sticky own row is a `Ranking Row` State=Me with `Elevation/Mid`. It sits in a canvas strip with a top border, above the bottom edge.
  - Demo: you are #11 in frames 4–5 so the row is really off-screen. The climb strip uses its own crop (#5–#8).
- **Climb (D14).** Step 1 (0 ms): the row is at #7 with 105 XP. Step 2 (~600 ms): the row is lifted with `Elevation/High` at scale 1.02, at 118 XP, and the row below slides down. Step 3 (~1200 ms): the row is at #6 with 130 XP, with an "Up 1 place" chip (`feedback/success` at 14%), the rank-up sound and a light haptic.
- **Result (D18).**
  - Demo match: Inflation & savings goes from 92/100 at Lv 3, +20 XP, to Lv 4 with 12/120 XP. Diversification goes from 72/80 at Lv 2, +5 XP, to 77/80. 5 correct = +25 XP, won 5:4.
  - Category bar: solid = old XP, a 40% tint segment = XP gained in this match.
  - The win screen has about 33 confetti pieces, kept clear of the text. The implementation target is still about 50 pieces (spec §2.3).
  - The draw shows "+0 XP" and bars that do not move.
  - Solo shows the score only, plus a "Practice round" note that solo earns no XP.
- **Level-up (D19).**
  - Opaque `brand/primary` full screen.
  - `Level-up Badge`: a 120 px circle in the category colour with a white icon and a 4 px white ring, flat.
  - Below the badge: "Level up!", the category name, chips "Lv 3" → "Lv 4" (accent), "12 / 120 XP towards Lv 5", and "Tap anywhere to continue".
- Category icons to use: seoul `Icon/message-circle` 152:3660, berlin `Icon/shield` 152:3657, sao-paulo `Icon/card` 11:259, tokyo `Icon/globe` 3:203, buenos-aires `Icon/tag` 166:8511, nairobi `Icon/phone` 26:532, mumbai `Icon/database` 166:8516. `Icon/tag` and `Icon/database` were added in round 2.

### New variables (collection "Finance Quest / Color", mode Light)

| Variable | Id | Value | Use |
|---|---|---|---|
| medal/gold | VariableID:166:4991 | #B8860B | rank 1 badge and card border |
| medal/gold-soft | VariableID:166:4992 | #FBF1D6 | rank 1 card background |
| medal/silver | VariableID:166:4993 | #7D8A94 | rank 2 |
| medal/silver-soft | VariableID:166:4994 | #EEF1F4 | rank 2 card background |
| medal/bronze | VariableID:166:4995 | #A0602E | rank 3 |
| medal/bronze-soft | VariableID:166:4996 | #F7E9DE | rank 3 card background |

White bold numbers on the badge fills reach about 3.3:1 (gold), 3.5:1 (silver) and 5.0:1 (bronze), which meets the 3:1 rule for large bold text.
Suggested `constants/theme.ts` names: `medalGold`, `medalGoldSoft`, `medalSilver`, `medalSilverSoft`, `medalBronze`, `medalBronzeSoft`.

### New components (in "Duel v3 · Kit" 166:5407)

- **Medal Card** set `166:5621`.
  - Variants Medal=Gold/Silver/Bronze × State=Default/Me: Gold 166:5433 / Me 166:5527, Silver 166:5470 / Me 166:5564, Bronze 166:5497 / Me 166:5591.
  - Text properties: Name, Meta, XP. The rank number comes from the variant.
  - Layout: 350×72, radius `radius/lg`, a 32 px medal badge and a 44 px Explorer Avatar.
  - Default = medal-soft fill with a 1.5 px medal-colour border. Me = `brand/accent-soft` with a 2 px `brand/primary` border.
- **Category XP Row** `166:7589`.
  - Properties: Name, Gain, Level, Meta, and Icon (instance swap).
  - A 40 px icon tile at 14% of the category colour.
  - Track: `bg/tint`, 8 px high. Its `paddingRight` is the part still empty, the child "New (old + gained)" uses the category colour at 40% with `paddingRight` = the gained part, and its child "Old" is solid.
  - On each instance, set the tile fill, the icon stroke and both bar fills.
- **Level-up Badge** `166:7605`, with an Icon instance-swap property.
- Kit rows, reference only (not components): the Question Footer, disabled and active, and the Confetti sample.

### Gotchas (v3)

- **A bound paint can render black on an instance.** If an instance's paint is bound to the same variable as its main component, but the paint was created with a placeholder `color: {0,0,0}`, the instance renders black. Create bound paints with the variable's resolved value as `color`; the `paint()` helper in the build scripts does this.
- **Bound paint opacity is lost when spread** (same as v2). Set the fills first, then clone them and set `opacity`.
- **Review Item "Repeat lesson" button.** Its label is the nested Button's `Label#3:0`, not the Review Item `Lesson` property. Set it on the nested instance.
- **Medal Card text defaults.** The text-property defaults are shared by all variants, so every kit variant shows "Tomasz Nowak". Set Name, Meta and XP on each instance.
- **Avatars in Ranking Rows.** Ranking Row avatars were chosen by rank (`AV[rank % 4]`). After a rank change, set the avatar explicitly so the same person keeps the same face.
- **Large exports time out.** `exportAsync` on large frames (the v2 kit at 0.6×) can time out through `orca eval`. Export single frames at 1–1.5×.

How it was built: Plugin API scripts run with `orca eval --page <figma tab>` (async IIFE), the same way as v2. The Figma MCP was not used.

## Round 2 (user feedback, 2026-11-21)

- **Result header = versus layout** (win, loss, draw). The navy "Header block" was rebuilt in place, so the frame ids did not change. Top to bottom:
  - win only: a trophy badge (56 px `brand/accent` circle);
  - the outcome headline, 34 px Bold: win "You won!" in `brand/accent` (yellow reads best on navy; success green is too dark there), loss "You lost" in `feedback/danger`, draw "Draw" in `text/on-brand`;
  - the "Versus" row: **you on the left** (avatar, "Alex K.", "You", dot track), the score in the middle (56 px Bold, **your score first**, e.g. "5 : 4", "correct answers" under it), **the rival on the right** ("Ola W.", "Rival", dot track);
  - the "Reward" row: the `XP Pill` ("+25 XP") and "5 XP per correct answer".

  The winner's avatar is 72 px with a 3 px `brand/accent` ring and a filled yellow `Icon/crown` above it. The other avatar is 60 px with a 1.5 px muted ring. In a draw, neither side gets a crown.
  The win frame has 55 confetti pieces over the header, placed clear of all text, avatars and pills. The trophy moved from the XP card to the header.
- **Loss frame** `166:8955` (new): "You lost", 3 : 4, crown on the rival, +15 XP, no confetti. Its caption notes that today's mirror rival (D17) cannot win, so the frame exists for completeness.
- **Solo** `166:8085`: "Practice complete", a centred avatar with "Alex K." and "You · solo, no XP", the big "5 / 6", "correct answers" and the dot track. There is no rival side and no XP pill.
- **Names** everywhere = first name + last-name initial with a dot ("Alex K.", "Ola W.", "Tomasz N."; a bare first name stays bare). Your own row and card no longer say "(You)" in the name. The meta line starts with "You · " instead (Player Cards: "You · Lv 3 · Inflation & savings"; Ranking Row: "You · Lv 3"). This is applied to the question frames, rankings, climb strip, results, and the Medal Card default (`Tomasz N.`).
- **New variable** `text/on-brand-muted` (`VariableID:166:8504`) = #FFFFFF at 70%, matching the app's `colors.onBrandMuted`. It is used for every secondary text on navy: the rankings header subtitles (they rendered dark before, see gotcha), the result header, and the level-up overlay.
- **New icons** in the v3 kit, row "Icons": `Icon/tag` 166:8511 (buenos-aires), `Icon/database` 166:8516 (mumbai), `Icon/crown` 166:8519 (duel winner; filled `brand/accent` in the header). A new "Category icons" row shows all 7 stories with their icon and colour: seoul message-circle 152:3660 (violet), berlin shield 152:3657 (teal), sao-paulo card 11:259 (orange), tokyo globe 3:203 (rose), buenos-aires tag 166:8511 (orange), nairobi phone 26:532 (violet), mumbai database 166:8516 (orange).

### Gotchas (round 2)

- **Dark subtitles came from the black placeholder bug.** Recolouring with a bound paint that was built from a `{0,0,0}` placeholder colour plus an opacity rendered the text black in the editor. A scan of all v3 frames found 5 such paints, and all are fixed. When adding paints, use the resolved colour or the `text/on-brand-muted` variable.
- **Draw: hidden check icon.** The draw's "More to review" Review Group has a red status dot, and its `Icon/check` is hidden in that instance.
- **Orca runtime timeouts.** `orca eval` can return `runtime_timeout` after a long script. Retry once; the script itself had already run.

## Round 3: review cards and the "Repeat lesson" flow (2026-11-21)

Row 3 of the v3 block: heading `166:10593` (y 3860), captions at y 3920, frames at y 4080. The section is now 7660 × 5000.

| # | Frame | Node | Caption | Screenshot |
|---|---|---|---|---|
| 12 | Duel v3 — Result · review collapsed | 166:9388 | 166:10575 | `13-review-collapsed.png` |
| 13 | Duel v3 — Story 1 · result: expand + tap "Go to lesson" | 166:9492 | 166:10578 | `14-story1-expand-tap.png` |
| 14 | Duel v3 — Story 2 · transition (stack push, 350 ms) | 166:10013 | 166:10581 | `15-story2-transition.png` |
| 15 | Duel v3 — Story 3 · path: locked stop, red outline + shake | 166:9645 | 166:10584 | `16-story3-locked-outline.png` |
| 16 | Duel v3 — Story 4 · "Oops, lesson locked" sheet | 166:9819 | 166:10587 | `17-story4-locked-sheet.png` |
| 17 | Duel v3 — Story · unlocked target: accent highlight + "Repeat lesson" | 166:10298 | 166:10590 | `18-story-unlocked.png` |

Links: `https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=166-9388` (replace the id for the others).

Frames 07–10 (win 166:7608, loss 166:8955, draw 166:7903, solo 166:8085) now use the collapsed Review Card in place of the old expanded `Review Item`. The new instances are 166:10483, 166:10506, 166:10529 and 166:10552.

### Unlock rule (from the code)

- `back/.../lesson/services/LessonProgression.java`, `summaries()` and `status()`. Lessons are walked in story order (`stories.json` `lessonIds`):
  - **done**: the user completed it;
  - **available**: not done, and the lesson **just before it in the same story** is done (the first lesson is always available);
  - **locked**: otherwise.
- `requireUnlocked()` gives the same rule on the server: opening or finishing a lesson whose previous lesson is not done fails with `PREVIOUS_LESSON_LOCKED` (403, "Complete the previous lesson in this story first."). Anonymous users skip this check.
- Stories have no lock of their own (all `status: available`).
- Duel questions come from every story, so a wrong answer can point at a lesson the user has not reached yet.
- The lesson path screen is `front/src/app/story/[id].tsx`. It lists the stops (`Stop`), already takes `?lesson=<id>`, scrolls to that stop and shows a plain "Lesson locked" sheet when the stop is locked. `ReviewCard.tsx` already calls `router.push('/story/[id]', { id: category, lesson: lessonId })`. `learning-path.tsx` is only the onboarding summary and does not list lessons.

### UX decisions

- **Collapsed by default.**
  - A collapsed card shows the overline (Question n · category), the question (full), and your answer → the correct answer as two one-line pills (red ✗ and green ✓, truncated), plus a chevron.
  - The whole card is the tap target. It expands with a height animation (250 ms ease-out, the chevron turns 180°). The expanded card wraps the pills and adds the explanation, the lesson button and a line saying where the lesson is.
  - Several cards can be open at once.
- **The button label follows the lesson status.**
  - done: "Repeat lesson: <title>";
  - available: "Start lesson: <title>";
  - locked: "Go to lesson: <title>", plus a 🔒 line such as "Seoul · stop 3 of 5 · not unlocked yet".
  - "Repeat" would be wrong for a lesson the user never took, and the lock line warns them before they tap.
- **Transition.** A native stack push (350 ms) keeps Back working: the result screen keeps its scroll position and open card. After the push, the screen auto-scrolls (600 ms ease-in-out) so the target ends up about 1/3 from the top.
- **Locked target.**
  - The stop card gets a white background, a 2 px `feedback/danger` outline, a "Locked" chip, a shake (±6 px × 3, 300 ms), an error haptic, and two ring pulses (+6 px, 30% → 0%, 700 ms each).
  - At about 1.3 s, the **"Oops, lesson locked"** bottom sheet opens with "Lessons in Seoul open one by one. Finish "<first available>" to unlock "<target>"." and a two-stop mini path.
  - Primary: **Start "<first available>"** (the first `available` stop is always the one that unlocks the chain). Secondary: **Got it**.
  - When more than one lesson is missing, the copy is "Finish "<first available>" and n more first".
  - Closing the sheet fades the outline out (300 ms) and leaves the user on the path.
- **Unlocked target.** It gets the same push and scroll, with no shake and no sheet. The card gets `brand/accent-soft`, a 2 px accent border, a "From your duel" chip (navy, swords icon) and two accent pulses.
  - **No auto-open.** The user sees where the lesson sits in the story and taps "Repeat lesson" or "Start lesson". An automatic jump into a lesson right after a push felt abrupt, and the user may only want to look.
- **Reduced motion.** No shake and no pulses (static outline only), and the scroll jumps straight to the target.
- **Demo data.** The flows use Seoul: a done "The chat that always knows" (stop 1), an available "Pulling everything in" (stop 2), and a locked "Spot the red flags" (stop 3). Seoul is the story screen that already exists in Figma (87:3125); it is cloned, and the original is untouched.

### New component

- **Review Card** set `166:9324`: State=Collapsed `166:9264`, State=Expanded `166:9287`.
  - Text properties: Overline, Question, Your answer, Right answer, Explanation, Lesson meta.
  - The lesson button is a nested `Button` (3:334) whose label is set with `Label#3:0`.
  - The answer pills are tinted 10%. That tint must be re-applied on every instance (`fixPills` in the build helpers), the same instance-opacity gotcha as before.

### Annotation style

Annotations are not UI. Numbered markers are a navy circle with an accent number. The legend (navy card with numbered steps) sits at the bottom of each frame, or at the top in frame 16, and the timings are written in it. A dashed circle marks a tap.
