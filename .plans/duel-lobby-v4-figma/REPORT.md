# Duel v4 — Figma frames (design only)

File `R4dCZH3fl7LqTwbqX3a6Jd`. New section **"Duel v4"** `176:7692` (x 12762, y 5055), directly below "New duel" `152:3648`. No existing node was renamed, moved or edited. All new frames come from the Duel v3 Kit and the v3 frames, which were cloned and adapted.

Link pattern: `https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=<id with - instead of :>`

| # | Frame | Node | Caption | PNG |
|---|---|---|---|---|
| v4·1 | Duel v4 — Lobby · vs Rival | 176:7925 | 176:10540 | `v4-1-lobby-vs-rival.png` |
| v4·2 | Duel v4 — Lobby · Solo selected | 176:8156 | 176:10543 | `v4-2-lobby-solo-selected.png` |
| v4·3 | Duel v4 — History | 176:8402 | 176:10546 | `v4-3-history.png` |
| v4·4 | Duel v4 — Result · solo ≥ 60 % (confetti) | 176:8888 | 176:10549 | `v4-4-result-solo-60-confetti.png` |
| v4·5 | Duel v4 — Result · review (2 groups collapsed) | 176:9117 | 176:10552 | `v4-5-result-review-groups.png` |
| v4·6 | Duel v4 — Rankings · sticky row top / bottom | 176:9275 (phone A 176:9279, phone B 176:9309) | 176:10555 | `v4-6-rankings-sticky-top-bottom.png` |

## User feedback applied (lobby subtitles)

- **Lobby (v4·1 and v4·2):**
  - The header shows only the avatar, "Duel arena" and the "Lv 3" pill.
  - The tiles show only an icon and a title: "Ranking #7" (with a small "↑ 2" chip next to the chevron) and "History".
  - The mode tiles show only an illustration and a title: "vs Rival" and "Solo".
  - The helper line under the chips is removed.
- **History (v4·3):**
  - The header shows only the back button and "History".
  - The W / L / D summary is now compact stat chips: W 8, L 4, D 0.
  - The section-side labels ("2", "This week") and the "rival still playing" helper text are removed.

## Decisions I made where the spec left room

- **Category colours.** Each area has its own story colour: Money basics slate, Saving teal, Borrowing orange, Investing rose, Risk violet.
- **Category icons.** Money basics uses `Icon/tag`, Saving `Icon/shield`, Borrowing `Icon/card`, Investing `Icon/trend`, and Risk `Icon/bolt` (the zap).
- **History icon.** The file has no clock icon, so I drew a simple clock (circle and hands) inside the frame. I did not add it to the kit.
- **Solo XP (needs confirmation).** D14 asks for an "XP count-up" on the solo result, so v4·4 shows "+20 XP", the XP card with category bars, and the "+20 XP" pill. The v3 note "Practice round, no XP" is gone. Today's code and backend give solo **no XP**. If solo stays XP-free, replace the XP card with the old practice note and use the count-up on the score only.
- **Solo headline.** The headline for ≥ 60 % is "Great round!". The demo score is 4 / 5, and the Dot Track shows 5 dots.
- **Confetti.** The confetti is cloned from the win frame. Every piece that overlapped text, the avatar, the dots or the pill was removed, which leaves 37 pieces.
- **Legend.** The tiers are in a legend card, along with the header-overlap fix (60 px top padding):
  - 100 %: fireworks, confetti and the win sound;
  - ≥ 60 %: confetti and the XP count-up;
  - < 60 %: a soft pop-in and the XP count-up;
  - reduced motion: no confetti or fireworks.
- **Review (v4·5).** I cloned the v3 review frame. It now has two Review Group instances:
  - "Wrong answers (2)", with a red status dot and the check hidden;
  - "Correct answers (3)".

  The section title is now "Your answers". The old category XP rows became Risk and Saving, and the XP total is +15 for 3 correct answers.
- **Rankings (v4·6).** This is a wrapper frame that holds two phones:
  - **Phone A** is the v3 bottom-sticky frame, with Alex at #11.
  - **Phone B** is scrolled past Alex's row. His row is pinned under the header in a canvas strip with a bottom border. I added rows #15–#22 for this.

  The lobby tile says #7 because the brief asked for it, while the rankings frames keep the v3 demo rank #11. The two are not the same demo data.
- **Floating nav.** The lobby keeps the floating Learn nav, cloned from the v2 lobby with English labels: Map, Glossary, Duel, Profile.
