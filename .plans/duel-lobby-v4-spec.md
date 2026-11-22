# Duel lobby v3, area categories, fixed Risk set for Alex, review and ranking fixes

Status: **started 2026-11-22.** Figma (Opus) first, then front (Sonnet) and backend. Branch `Sarnolek/duel-lobby-v4` from `origin/main` (PR #51 is merged).

**Naming: all new Figma frames are tagged `v4` ("Duel v4 — …", "Caption · v4 · N · …").** Never reuse the v3 tag.

It builds on:
- `duel-v3-spec.md` (PR #46, merged into main);
- `duel-live-spec.md` (PR #51 `Sarnolek/duel-live` → main, open);
- `demo-accounts-spec.md` (Alex / Daniel / Elena, `useCurrentUser()`).

## 0. Goal

1. **The lobby** (`front/src/app/(main)/(learn)/duel.tsx`) is redesigned in the visual language of frames v3·7+ (navy header, avatars, accent cards):
   - mode tiles have illustrations, not plain text;
   - Ranking and History become tiles;
   - the Play | History tabs go away.
2. **Duel categories have the lesson names, 1:1.** They are the `area` of the learning paths (as shown in the story screen title), not the cities and not the old `category` field.
3. **Question pools**: about 3 questions per lesson, rewritten with new numbers and situations.
4. **Alex** always gets the Risk category in his match, with a fixed question set. This is hidden: his lobby looks normal.
5. **Result screen fixes:**
   - solo no longer overlaps, and it gets confetti and fireworks by score;
   - the review drops the single "first wrong answer" card.
6. **Ranking**: your row sticks to the top or the bottom when it is scrolled out of view.

## 1. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Category name | The path `area` from `stories.json`, exactly: **Money basics, Saving, Borrowing, Investing, Risk**. No cities in duel UI or copy. The old `category` field ("Hype & leverage" etc.) is no longer shown in the duel. |
| D2 | Duplicate areas | **Merge into 5 duel categories.** Slugs: `money-basics` (buenos-aires), `saving` (berlin + nairobi), `borrowing` (sao-paulo), `investing` (tokyo + mumbai), `risk` (seoul). A question still keeps its own `lessonId` / `sourceStepId`, so the review "Go to lesson" opens the exact lesson. The slug → stories mapping comes from `stories.json` `area` (derived, not hard-coded twice). |
| D3 | Pool size | About **3 questions per lesson**: Money basics about 3, Saving about 18, Borrowing about 15, Investing about 18, Risk about 15. A match is still `app.duel.questions-per-match` (5). |
| D4 | Rewriting | Every question tests the **same concept as its source step, but with a new scenario and new numbers**. It must not be answerable by remembering the lesson's text or numbers. Keep the v3 question types (quiz, sort, match, predict, chart slider). Recompute every numeric answer with `front/src/lib/.../models.ts` (as `berlinDuelContent.test.ts` does) or the backend equivalent. English copy. **Educate, never advise** (MiFID II): no product recommendations. |
| D5 | Alex + Risk | Every match Alex (`demo-user`) plays **includes Risk**, even if he did not tick it. **Hidden**: the lobby shows no lock or badge. The match header shows the real categories, so Risk appears there. |
| D6 | Fixed Risk set | Alex's Risk slots use a **fixed, ordered list** of Risk questions: the same questions in the same order every time. Base it on the current Seoul ("Hype & leverage") questions, rewritten per D4. Other ticked categories fill the remaining slots at random from their pools. The split of slots between categories stays the current algorithm. Risk counts towards the 4-category limit server-side; if Alex ticked 4 others, drop the last ticked one. |
| D7 | Live duel with Alex | When Alex is one of the two players in a live match (`duel-live` L9 intersection), Risk is added to the match and **both players** get the fixed Risk set (shared seed, the same question list). |
| D8 | XP migration | Flyway migration (next free `V<n>` after checking main and duel-live, which has V25). It rewrites story ids to area slugs in `xp_event.category`, `duel_match.categories` and any other duel table with a category column. XP of merged stories is summed. **Before writing it, check whether `xp_event.category` is also read by lessons or profile** (V19 backfilled it from lesson progress). If it is, map only the duel reads and keep lesson data intact. |
| D9 | Alex's numbers | Alex is frozen. **His weekly rank and total XP must not change.** Exception, approved by the user: his **Risk** XP is set **5–10 XP below the next level**, so a demo win shows the level-up overlay in Risk. The other categories are the sums of the old ones. `alexSeedFrozen` and the duel-v3 seeder rules (every category, one player 2–3 XP above demo-user) stay green. Update the tests to the new category keys. |
| D10 | Lobby layout | Option **B**: navy header; then two tiles, **Ranking** and **History**; then the mode tiles, the category chips and the CTA. The Play | History tabs are removed. |
| D10a | No subtitles | User feedback 2026-11-22: **no secondary description lines anywhere in the lobby.** Not "Live or bot", "Beat your best score", "5 questions from your categories", "This week 125 XP" or "W 8 · L 4". Tiles show an icon or illustration and a short title only. The header shows the avatar, "Duel arena" and the level. |
| D11 | Mode tiles | **Illustrated tiles, side by side.** The selected tile has an accent border and a check; the other has a grey border. Keep `ModeToggle`'s testIDs or map them 1:1. |
| D12 | History | A separate screen, **`/duel/history`**, pushed from the History tile. Navy header in the rankings v3 style, a W / L / D summary, then "In progress" and "Finished" lists (today's `MatchRow`). Tapping a match opens its result and review. Keep the empty state "No finished duels yet". |
| D13 | Ranking | The Ranking tile opens the existing `/duel/rankings`. The `LeagueCard` leaves the lobby body. |
| D14 | Solo result | Fix the header overlapping the score (verifier finding, frame v3·10) at 390×844 and 360×640. Celebration by score (same components as the win: `Fireworks`, `Confetti`, sounds; reduced motion respected): |
| | | – **100 %**: full win celebration (fireworks, confetti, win sound); |
| | | – **at least 60 %**: confetti only plus the XP count-up; |
| | | – **below 60 %**: soft pop-in plus the XP count-up only. |
| | | This deliberately goes beyond Figma v3·10. |
| D15 | Review | Remove the standalone card for the first wrong answer (`ReviewCard`: "the first one stays a card, the rest fold"). Show only two groups, **"Wrong answers (n)"** and **"Correct answers (n)"**, **both collapsed** by default as in v3·12. A tap expands a group: 250 ms height animation and a chevron turning 180°. Expanded cards keep the v3·13–17 flow ("Go to lesson", locked or unlocked). Hide a group with 0 items. |
| D16 | Ranking sticky row | On `/duel/rankings`: |
| | | – your row in view: it stays inline; |
| | | – scrolled past (the row is above the viewport): it sticks to the **top** of the list; |
| | | – not reached yet (the row is below the viewport): it sticks to the **bottom**. |
| | | Smooth hand-off with no jump. It works with the v3·5 "merged" row and the v3·6 climb animation. |

## 2. Figma first (step 1, only after the user's go)

A Claude Sonnet worker (never Gemini) **adds new frames** to the section "New duel" `152:3648` of file `R4dCZH3fl7LqTwbqX3a6Jd`. It reuses the Duel v3 Kit `166:5407` and its variables, and does not change existing frames.

| New frame | Content |
|---|---|
| v4·1 Lobby · vs Rival | D10 and D11 with the 5 area chips (icon, name, check; "3 / 4" counter); the CTA "Find rival · 3 categories". |
| v4·2 Lobby · Solo selected | The same lobby with Solo selected; the CTA "Start solo · …". |
| v4·3 History | D12, with in-progress and finished rows and the W/L/D summary. |
| v4·4 Result · solo ≥ 60 % | No overlap; confetti; XP count-up. |
| v4·5 Result · review (2 groups) | D15, both groups collapsed. |
| v4·6 Rankings · sticky top / bottom | D16, both states side by side. |

Each frame gets a caption (`Caption · v4 · N · …`) like the existing ones.

**Tile details for the worker to design:**
- **Ranking tile**: trophy icon, "#7" and the change this week if the API has it, else "Top x %".
- **History tile**: clock icon and "12 duels" or "W 8 · L 4".
- **vs Rival tile**: your avatar, a "VS" badge and a pulsing "?" avatar. Title "vs Rival", line "Live or bot · win XP".
- **Solo tile**: your avatar with a target icon. Title "Solo", line "Beat your best score".
- **Category icons**: one per area (Saving: shield; Investing: trending-up; Borrowing: credit-card; Risk: alert-triangle or zap; Money basics: tag), with a colour from `storyColors`.

**Reading and writing Figma:**
- Use the Orca browser tab (page `df7f2357-efed-4f71-8e8d-f04b07c0f2ae`) with the Plugin API, or the Figma MCP `use_figma` if it is not rate-limited.
- Export PNGs to `.plans/duel-lobby-v4-figma/`.
- **The coordinator shows the PNGs to the user and waits for approval before step 2.**

## 3. Backend tasks (step 2)

1. Category model:
   - the duel category list endpoint (`/api/duel/categories`) returns the 5 area slugs with `name` = area, `icon` and `color`;
   - move the duel content from `content/duel/<story>.json` to `content/duel/<area-slug>.json`, or keep the per-story files and group them by area at load; choose the simpler one and keep `DuelContentTests` meaningful.
2. Pools: write D3 and D4 content. Each question keeps `lessonId` and `sourceStepId` pointing at existing lesson steps (`DuelContentTests` checks this).
3. Alex: D5–D7 in `DuelMatchService` (question selection) and in `startLive`. Identify Alex by the existing demo-user id constant, not by a new literal.
4. Migration and seeder: D8 and D9.
5. Follow `.claude/skills/spring-boot-best-practices`. Hibernate runs with `ddl-auto=validate`.

## 4. Frontend tasks (step 2, after the Figma approval)

1. `front/src/lib/duel/meta.ts`: the 5 area categories. Remove the city-keyed names from the duel UI. Update the tests that expect "Hype & leverage" (`duel-screens.test.tsx`).
2. Lobby rebuild per the approved frames:
   - small components, for example `LobbyTiles`, `ModeTile`, `CategoryChip`;
   - keep the existing testIDs or rename them consistently in the tests;
   - the matchmaking flow from duel-live (`MatchmakingView`, socket) stays untouched.
3. `front/src/app/duel/history.tsx` (D12).
4. Result screen: D14 (solo) and D15 (review).
5. Rankings: D16 (sticky top and bottom).
6. Follow the `finance-quest-ui` and React best-practices skills. Use the tokens from `front/src/constants/theme.ts`, adding new ones additively.

## 5. Tests and QA (targeted only)

- **Backend:**
  - the content tests: every question has a valid source step, and the numeric answers are recomputed;
  - a selection test: Alex always gets Risk, the fixed order is identical across 3 matches, and other users get random Risk questions;
  - a live test: Alex vs Daniel both get the same fixed Risk set;
  - a migration test: merged XP is summed, and Alex's rank and total XP are unchanged (`alexSeedFrozen`).
- **Frontend:**
  - Jest for the lobby (tiles, mode selection, CTA text), history, the review groups and the sticky row logic;
  - `npx tsc --noEmit`;
  - lint on the changed files.
- **QA:**
  - one stack: Postgres 5434, backend 8090, Metro 8082 with `--max-workers 2`, all on 127.0.0.1;
  - at most 2 browser contexts;
  - screenshots at 390×844 and 360×640, next to the approved Figma PNGs: the lobby in both modes, history, solo at 100 % / 60 % / 40 % (timed shots of the celebration), the review collapsed and expanded, rankings sticky at the top and at the bottom, and Alex's match header showing Risk.
- **Never touch the user's Postgres on 5433 or the user's processes.**

## 6. Branch and git

- If PR #51 (duel-live) is merged by then, branch from `origin/main`. Otherwise branch from `origin/Sarnolek/duel-live` and open the PR into main after #51.
- Workers never commit or push. The coordinator commits and pushes only when the user says so.

## 7. Out of scope

- Restyling the question screens (v3·1–3).
- Changing lesson content or the path screen.
- New duel modes, invites, chat.
