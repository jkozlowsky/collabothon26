# Onboarding and Profile mockups: report

Serve: `python3 -m http.server 8099 --directory docs/design/mockups`, then open http://localhost:8099/ (3 columns side by side, one row per screen). Each direction also opens on its own: `a.html`, `b.html`, `c.html`.

## Files
- `index.html`: the 3 directions side by side (iframes, rows aligned)
- `a.html` A Bank-native, `b.html` B Quest, `c.html` C Editorial calm: 9 artboards each (1 consent, 2 connect, 3a goals, 3b knowledge, 3c confidence, 4 analysing, 5a result by Jev, 5b result by rules, 6 Profile tab)
- `base.css`: kit tokens, the 390×844 phone frame, artboard labels
- `icons.svg`: kit icons as a sprite (24px, 2px stroke, outline)
- `shots/a.png`, `shots/b.png`, `shots/c.png`: one full-page screenshot per direction; `shots/index-top.png`: top of the index

## Checks (Playwright, every text node and tappable element inside the 27 phones)
| | A Bank-native | B Quest | C Editorial calm |
|---|---|---|---|
| Text contrast (min, target 4.5:1) | 4.86, 0 failures | 4.86, 0 failures | 5.22, 0 failures |
| Touch targets ≥ 44px (button, label, radio) | 0 below | 0 below | 0 below |
| Horizontal overflow of the 390px frame | none | none | none |

Kit colours that fail as text were kept off text: `feedback/success` #1E8A5E (4.33 on white, used only as a dot or icon), `feedback/xp`, `story/*` (used only as rings), muted grey on `bg/tint`. Reduced motion stops the spinner, orbit and progress animations.

Not checked: dark mode (brief asks for light), 375px and landscape (frames are fixed at 390), large system text.

## To confirm
1. **"Skip for now" on consent.** Mockups: skips bank data only and continues to the test (spec: "declining skips bank data"). Option: skip the whole onboarding (`POST /api/profile/skip`), with test-only as an unchecked box plus Continue.
2. **Overall Jev %.** The header shows "Jev 91%", but the contract only has `confidence` per insight. Options: use the `lifeStage` insight's confidence, the mean of the insights, or add a field such as `Profile.sourceConfidence`.
3. **Button height.** The kit Button is 32px tall, below the 44px minimum. Mockups use 48px (A) and 52px (B, C).
4. **Body size for older users.** The kit's Body is 13px. A and B use it; C uses 15px for body text. Option: 15px everywhere, which suits Ingrid (58).
5. **Sample values are invented.** Ingrid's answers (ETF right, risk wrong), the Jev levels (saving advanced), the percentages (88/93/84/96) and the wrong ETF options plus "I'm not sure" are not in the spec, which only gives the correct answers.
6. **Withdrawing consent.** Only "Redo onboarding" withdraws, as the brief says. Option: a separate "Withdraw consent" row on the Profile tab that drops bank data without a new test.
7. **XP and level on Profile.** Not shown (topic C owns them). Option: reserve a slot in the Profile header.
8. **Long screens.** Consent (A), both results and the Profile tab scroll inside the 844px frame, so the screenshots show only the first screen. Scroll inside a phone on the index to see the rest.

# B Quest: more screens (direction B picked)

Open http://localhost:8099/b-more.html (linked from the index as "B Quest: more screens"). Sample: Ingrid (58), lesson "When markets fall".

## Files
- `b-more.html`: 12 artboards
- `b.css`: B styles moved out of `b.html` so both pages share them (`b.html` looks the same and passes the same checks)
- `icons.svg`: added flame, play and pin from the kit list, plus search and x, which the kit doesn't list
- `index.html`: link to `b-more.html`
- `shots/b-more.png`: full page; `shots/b-more/NN.png`: one per artboard: 01 Learn home, 02 lesson intro, 03 quiz, 04 quiz correct, 05 quiz wrong, 06 matching, 07 story step, 08 glossary sheet, 09 decision, 10 lesson complete, 11 Glossary tab, 12 Profile tab

## Checks (12 artboards)
| Check | Result |
|---|---|
| Text contrast (target 4.5:1) | minimum 4.86, 0 failures |
| Touch targets ≥ 44px | 0 below; the inline glossary term inside body text is exempt (WCAG 2.5.8 inline exception) and was left out of the check |
| Horizontal overflow of the 390px frame | none |

The content under the glossary sheet's scrim is `inert` and was left out of the check.

## To confirm
1. **Why it's recommended.** The card uses the brief's wording, "new to investing", but Ingrid's profile says investing: intermediate, risk: beginner. Option: "new to investment risk".
2. **Step order.** The steps follow the brief: quiz → matching → story → decision. Option: story first, so the lesson explains before it tests.
3. **Gamification numbers are invented.** They are 10 XP per correct answer, 40 XP per lesson, 500 XP per level (Level 3 at 340 XP) and a 4 → 5 day streak. Topic C owns XP, so their numbers win.
4. **Feedback colours.** The kit has no success-soft or danger-soft. Correct uses `globe/land` #CFE5DD, wrong uses `accent-soft` with a `danger` icon and border. Option: add two tokens.
5. **Fact check before the demo.** The story step says "world stock markets have fallen 30–50% several times, for example in 2008". Option: cite a source or drop the numbers.
6. **The decision consequence mentions Ingrid's horizon** ("money needed in 3–10 years has time to ride out a fall"). It stays educational, but compliance may read it as personal. Option: make it general.
7. **Path titles and the 6-lesson unit are placeholders.** Topic A owns lesson content.
8. **Glossary filter chips wrap to two lines.** Options: drop "All", or make the row scroll sideways.
