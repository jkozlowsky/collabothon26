# Duel v2 (plain) — Figma state when the MCP rate limit hit

File R4dCZH3fl7LqTwbqX3a6Jd, page "Page 1".
Section "Duel v2 (plain)" 152:3648 at (8782, 2160), 3860x3200. Holds only the kit frame so far.
Kit frame "Duel v2 · Kit (plain)" 152:3649 (section-relative x40, y2000).

Local components (all bound to Design Kit variables / text styles / Elevation/Low):
- Icon/shield 152:3657, Icon/message-circle 152:3660, Icon/colosseum 152:3670 (24px, 2px stroke)
- Progress Dot set 152:3679 (State=Correct 152:3674 / Wrong 152:3675 / Timeout 152:3676 / Current 152:3677 / Pending 152:3678)
- Dot Track 152:3680 (6 Progress Dot instances, "Dot 1..6")
- Player Card 152:3690 (Avatar = Explorer Avatar 36:2109 at 0.3, props Name, Meta, nested Dots)
- Story Tile 152:3725 (props City, Topic, Level, Icon swap; override "Icon tile" fill 14% + icon stroke + "Fill" bar colour/width)
- Pending Match Card set 153:3740 (Status=Playing / Finished; props Title, Meta)
- Mode Toggle set 153:3758 (Mode=Human / Solo)
- Ranking Row set 153:3824 (State=Default / Me; props Rank, Name, Meta, XP)
- Answer Banner set 153:3840 (Result=Correct / Wrong)
- Review Item set 154:3813 (Result=Correct / Wrong; props Number, Question, Your answer, Right answer, Explanation, Lesson; Wrong uses Button 3:334 Secondary)
- Arena Pin 154:3817 (Story Pin Default instance, petrol body, colosseum icon, "Arena" label chip)

Not built yet: all 8 screens (Lobby, Question quiz, Question slider, Answer banner, Waiting, Result+review, Rankings, Map with Rome pin).
Layout plan: frames 390 wide at section-relative x = 40 + i*470, y = 220; captions at y = 60.
Reuse: status text clone 94:5789, 5-tab nav clone 94:6004 (Duel active), Section Header 11:343, Stat Chip 3:345,
Answer Option 67:3330, Button/Large 28:1018, Choice Chip 28:1055, Pin Callout 3:456, globe frame 3:496 (clone).
Gotcha: after an INSTANCE_SWAP the swapped icon is renamed to the component name; find it via tile.children[0].
Gotcha: bound paints lose opacity when spread; set opacity by cloning fills after assignment.

Demo data: rival dots per spec D13 for player ✓✓✓✗✓✓ (5) = Ola ✗✓✓✗✓✓ (4).
Weekly ranking: 1 Tomasz Nowak Lv6 310 · 2 Ola Wiśniewska Lv5 265 · 3 Marta Zielińska Lv4 220 · 4 Jonas Weber Lv5 180 ·
5 Kasia Lewandowska Lv3 150 · 6 Alex Krause (Ty) Lv3 125 · 7 Piotr Kamiński Lv2 90 · 8 Sofia Rossi Lv2 60.

## Update: screens built through the Orca browser (Figma MCP was rate-limited)

The section was renamed **"New duel"** and moved next to the old duel section (x 12762, y -45). Base link:
https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/?node-id=<id with - instead of :>

| # | Frame | Node |
|---|---|---|
| 1 | Duel v2 — Lobby (390×1066, scrolls) | 157:3800 |
| 2 | Duel v2 — Question · quiz | 157:4008 |
| 3 | Duel v2 — Question · slider ("Zatwierdź") | 157:4130 |
| 4 | Duel v2 — Question · answer banner | 157:4245 |
| 5 | Duel v2 — Waiting ("Wróć później") | 157:4376 |
| 6 | Duel v2 — Result + review (390×1758) | 157:4454 |
| 7 | Duel v2 — Rankings | 157:4663 |
| 8 | Duel v2 — Map · Arena pin (Rome) | 157:5112 |
| — | Duel v2 · Kit (plain) | 152:3649 |

How it was done: Plugin API scripts run with `orca eval` on the Figma tab (the editor exposes `figma`), screenshots via `exportAsync`.
Gotcha: instances do not inherit a main component's paint opacity for bound tints; set it on each instance (Answer Banner, Review Item "Status").

## Round 3 (spec §0, R1–R9) — current state

Section "New duel" 152:3648 (x 12762, y -45, 4270 × 3774). Frames left to right (x = 40 + i·470, y 220):

| # | Frame | Node | Round 3 change |
|---|---|---|---|
| 1 | Duel v2 — Lobby · Graj | 157:3800 (kept) | navy header + league, Graj/Historia tabs, navy mode toggle, category list with checkboxes, yellow "Szukaj rywala · 2 kategorie", nav in Polish |
| 2 | Duel v2 — Lobby · Historia | 157:5725 (new) | W toku (pending) + Zakończone (Match Rows: rival, categories, date, score, XP pill) |
| 3 | Duel v2 — Question · quiz | 157:4008 (kept) | yellow timer pill + countdown, navy players block, meta "Lv N · <category>" |
| 4 | Duel v2 — Question · slider | 157:4130 (kept) | same; yellow slider thumb |
| 5 | Duel v2 — Question · answer banner | 157:4245 (kept) | banner with yellow XP pill |
| 6 | Duel v2 — Waiting | 157:4376 (kept) | navy score block with XP pill, light rival card, "Wróć później" |
| 7 | Duel v2 — Result + review | 157:4454 (kept) | navy header, wrong answers first (yellow "Powtórz lekcję"), "Dobrze (5)" collapsed, navy "Wróć do areny" |
| 8 | Duel v2 — Ranking | 157:4663 (kept) | navy header, overall only, chips removed |
| 9 | Duel v2 — Map · Arena pin (Rome) | 157:5112 (kept) | Polish copy, 4 stories (Seul, Berlin, São Paulo, Tokio) + Arena pin, old 6 stories hidden |

Kit "Duel v2 · Kit" 152:3649 (y 1284). New: XP Pill 157:5350, Checkbox 157:5360, Category Row 157:5389,
Tab Bar 157:5407, Match Row 157:5411, Review Group 157:5456, Progress Dot "Current dark" 157:5346.
Changed: Player Card is now a set 157:5492 (Theme=Light 152:3690 / Dark 157:5467, full width, dots on the right);
Mode Toggle 153:3758 (selected = navy); Answer Banner 153:3840 (XP pill); Review Item 154:3813 (wrong → yellow lesson button).
Removed: Story Tile 152:3725 (replaced by Category Row).

Gotchas (round 3): a rectangle's size inside an instance cannot be overridden, so progress bars are auto-layout tracks
whose paddingRight sets the remaining part (maps to RN width %). Paint opacity of a bound tint must be set on every instance.
