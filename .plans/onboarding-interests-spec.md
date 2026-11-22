---
status: in-progress
baseline_commit: c65aeb40e6793aa7876092aa3789b6d5c1371328
branch: jkozlowsky/restore-interests-onboarding
---
# Onboarding: "What would you like to learn?" replaces the savings questions

Status: **in-progress** (agreed in interview, 2026-11-22). Written against `origin/main` @ `00804f8`, built on `c65aeb4`. Branch `jkozlowsky/restore-interests-onboarding`.

## 0. Goal

A fresh onboarding asks two questions today: "What are you saving for?" (`purpose`) and when the money is needed (`horizon`). Asking about savings at the very first screen makes no sense to the user. Both go. In their place: **one screen, "What would you like to learn?"**, with one tile per lesson path. Each tile comes from the backend, so the tiles match the paths on the map.

What a pick means: **"I want to get better at this because I don't know it yet."** Each pick is a self-reported weak spot. It feeds:

1. the **order and choice of Quick check questions** (§4), and
2. **Jev's choice of the first lesson** for the new user, together with the test result (§5).

The old 15-value `goals` vocabulary is **removed** everywhere. `interests` replaces it (§3).

## 1. Flow

`welcome → intro → challenge → consent → interests → check-intro`

- `purpose` and `horizon` steps are deleted, along with `PURPOSES`, the `Purpose` type, `Intake.purpose` / `Intake.horizon`, `savingForLine`, `Summary.savingFor` and the "Saving for …" line in `PathSummary`. Grep each one before deleting it.
- The Quick check profile still sends `horizon: null`. `ProfileRanges.horizon` and the `Horizon` type stay, because the backend and the quick check accept null.
- A single question needs no "Step 1 of 1" progress header. A back button is enough.

## 2. The interests screen

- **Title:** "What would you like to learn?"
- **Source:** `GET /api/stories?userId=…` (`useApi`, as `PathSummary` and `story/[id].tsx` already do). There is no hardcoded list in the app.
- **Which paths:** only `status === 'available'`, in the order the endpoint returns them. Today that is 7: Hype & leverage, Inflation & savings, Instalments & debt, Diversification, Fast inflation, Small savings, Gold.
- **Tile:** the story's `icon` (Feather), `category` as the title, `topic` as the subtitle, and a check when the tile is selected. The city is not shown; the user meets it on the map. Reuse the existing `OptionCard` and `AnswerTile` components. Follow the `finance-quest-ui` skill and the Figma Design Kit. No new design primitives.
- **Selection:**
  - Multi-select. Continue is enabled once at least one tile is picked.
  - A last tile, **"Not sure yet"**, is exclusive. Picking it clears the paths, and picking a path clears it. It saves `interests: []` and enables Continue.
- **Loading:** show a skeleton or spinner in the list area while the request runs.
- **Request fails:** show an error message with **Retry**, plus **Skip**. Skip moves on with `interests: []`.
- **Personas** (`front/src/lib/personas.ts`, `hints`):
  - The new `hints.interests` (story ids) replaces `purpose`, `horizon` and `goals`.
  - Daniel: `['seoul', 'mumbai']`. He invests, so hype, leverage and gold are the gaps.
  - Elena: `['berlin', 'buenos-aires']`, for a safety net and inflation.
  - Alex: no hints, unchanged.
  - Update the doc comment.
- **testIDs:** `onboarding-interests`, `interest-<storyId>`, `interest-not-sure`, `interests-retry`, `interests-skip`, plus the existing `onboarding-continue`.

## 3. Contract: `interests` replaces `goals`

Change these deliberately and tell the team; this is a shared contract.

- **DB:** new migration `V26__interests.sql` (written as V25, see C1): `ALTER TABLE user_profile RENAME COLUMN goals TO interests; UPDATE user_profile SET interests = '{}';`. Old goal ids are not story ids. Check that the V24 demo account seeds do not write `goals`; if they do, rewrite them.
- **Backend:**
  - `UserProfile.goals` becomes `interests` (same `TEXT[]`).
  - `goals` becomes `interests` in `OnboardingRequest`, `ProfileDto`, `OnboardingAnswersDto`, `ProfileAnswersProjection`, `SharedWithModelDto`, `JevQuickCheck` and `ProfileAnswersRepository`.
  - **Validation:** `OnboardingRequest.interests` is `@NotNull List<@NotNull @Size(max = 64) String>`, and `@Size(max = MAX_INTERESTS)` on the list (32, a named constant, see C2). Every id must be a story in `StoryRepository`; an unknown id returns 400 with a `ProfileErrorCode`. The `GOALS` regex is deleted.
- **`FocusArea`:**
  - The goal sets and `fromGoals` are removed.
  - New `FocusArea.fromInterests(List<String> storyIds, List<Story> stories)` keeps the order the user picked, maps through `ofStoryArea(story.area)` and drops duplicates.
- **Frontend:**
  - `goals` becomes `interests: string[]` in `OnboardingAnswers`, `UserProfile` and `types/categorization.ts`.
  - The `Goal` type is deleted.
  - `useOnboarding` and `complete({ interests })` follow the rename.
- **Rules fallback (`CategorizationRules`):**
  - Lines ~108 and ~179 read interests.
  - The explanation "You picked X as a goal." becomes "You said X is new to you.", with the story `category` in place of X.

Lombok and MapStruct apply as everywhere in `back/`. Each new type goes in its own file.

## 4. Quick check

- **Area order:** `QuickCheckRules.areaOrder` puts interest areas first (`fromInterests`), then the fixed order. The horizon rule stays but never fires for a fresh onboarding, since horizon is null.
- **Jev step** (`JevClient.step`, the `first` and `next` questions):
  - The state gets `interests`: a list of `{ category, topic }` names of the picked paths, never ids.
  - The question instruction refers to it as the topics the person said are new to them.
  - With `interests: []`, leave the field out of the state, because an empty list reads as a signal.
- Every area with questions is still tested. Interests change the order, not the coverage.

## 5. First lesson: hybrid pool

The pool Jev chooses from (`firstLessonChoices`) contains:

1. **Gap lessons:** today's logic, per answered area, gap first.
2. **Interest lessons:** for each picked path, its start lesson for this user (the first lesson not completed).
   - **When the test showed that path's area is solid**, the path still stays in the pool, but only with **one later lesson**: the first lesson of that story whose questions the user did *not* answer right (this skips the basics). If none remains, the path drops out of the pool.

The two parts are merged with duplicates removed. The existing per-area and per-story limits still hold, plus at most one lesson per interest path. If the merged pool has fewer than 2 entries, nothing is asked, as today.

**Jev criteria per lesson** (`lessonChoice`). Code states the facts it knows; Jev weighs them. Append to the lesson's criterion:

- for a picked path: "The person picked this path as new to them."
- for a picked path whose area is solid: "The person picked this path as new to them; the test showed they already know the basics."

Nothing is added for non-interest lessons. Keep the wording in `JevConsts` or the same place as the other question texts.

**Plan order** (`QuickCheckRules.plan`). If the start lesson is not from an interest path:

- the first picked path goes **second** in `path`, right after the start, before the other candidates;
- this also covers the rules fallback without Jev (`ruleFirstLesson` is unchanged).

## 6. Tests and demo

- **Backend:**
  - `fromInterests` ordering.
  - An unknown story id returns 400.
  - Pool composition: interest + gap, a solid interest path gets its later lesson, and a solid path with no lesson left drops out.
  - Criteria text is present only on interest lessons.
  - Plan order puts the interest path second.
  - The migration starts with Hibernate `validate`.
  - Update every test that sends `goals` (`UserProfileControllerTests`, `CategorizationControllerTests`, `QuickCheck*Tests`, `CategorizationRulesTests`, `JevClientTests`, `LessonControllerTests`, `CategorizationWithoutKeyTests`).
- **Frontend (jest):**
  - The screen renders tiles from a mocked `/api/stories`.
  - "Not sure yet" is exclusive.
  - Continue is disabled with nothing picked.
  - The error state offers Retry and Skip.
  - Persona preselection works.
  - Update `onboarding.test.tsx`, `quick-check*.test.ts(x)`, `personas.test.ts`, `hints.test.tsx` and `test-utils/onboarding.ts`.
- **e2e and recordings:**
  - Replace the `option-home` / `option-1-5y` taps in `front/recordings/journey.ts` with `interest-berlin` and Continue. The film is the Berlin take. Update the stubbed categorization if it echoes `goals`.
  - Update `e2e/onboarding.spec.ts`, `quick-check.spec.ts`, `start-here.spec.ts` and `e2e/app.ts`.
- **Smoke test** in Jan's setup, without a Jev key: the rules fallback must still start the user on a sensible lesson and put the interest path second (§5). Without the key, the Jev-side effect of interests disappears. Say so in the walkthrough.

## 7. Out of scope

- Showing or editing interests in Profile.
- Highlighting picked paths on the globe.
- Backfilling interests for existing profiles (they start empty).

## To confirm

Forks found while preparing the build on 2026-11-22. Each took the simplest option that keeps the agreement above.
The build follows the option marked "chosen".

- **C1 Migration number.** (a) V25: collides with `V25__duel_live.sql` in open PR #51, and Flyway refuses to start
  once both merge. (b) **chosen:** V26. PR #51 should merge first; otherwise a database that already ran V26 rejects
  the late V25.
- **C2 List limit.** (a) **chosen:** `MAX_INTERESTS = 32`, well above the 7 paths. (b) the live story count.
- **C3 Final Jev call.** The onboarding answers are serialised to Jev as they are, so ids such as `seoul` would leave
  the backend and read like the person's location. (a) **chosen:** §4's rule holds for both calls: `state.interests`
  carries `{category, topic}`, is left out when empty, and the serialised `answers` carry no interest ids (neither an
  `interests` nor a `goals` key). The profile and `sharedWithModel` keep the ids. (b) send the ids.
- **C4 "Answered right".** (a) **chosen:** a lesson counts as answered right when it has at least one answer and all
  its answers are correct, as in the existing gap-first rule. An unasked lesson does not count. (b) every question of
  the lesson answered right: almost impossible in a 3-6 question check.
- **C5 Skipping the basics.** Lessons unlock in order and `plan` always starts a story at its first lesson not
  completed. (a) **chosen:** §5's later lesson is only what Jev weighs; the user still starts that path at the first
  lesson not completed. Unlocking is unchanged. (b) unlock the later lesson: changes the lesson module.
- **C6 Every area solid.** `plan` ignores Jev's pick when there are no gap candidates. (a) **chosen:** a pick from the
  merged pool is honoured there too; `readyForNext` keeps its meaning. Without a pick the start is unchanged.
- **C7 A finished first pick.** (a) **chosen:** the path that goes second is the first picked path with a lesson left.
  The rule applies to every branch of `plan`. (b) the first pick even when it is finished.
- **C8 Interest lesson without a quiz.** (a) **chosen:** the pool holds quiz lessons only (`CheckLesson`), so the start
  lesson of a path is its first quiz lesson not completed.
- **C9 A hint that is not a tile.** (a) **chosen:** only ids of rendered tiles are selected and saved. An unknown id
  would be a 400 that the background save only logs.
- **C10 Multi-select semantics.** (a) **chosen:** the path tiles and "Not sure yet" announce as checkboxes (WCAG 4.1.2).
- **C11 Parallel work on the same files.** Local branch `jkozlowsky/simplify-jev` (unmerged, with uncommitted work
  while this was built) rewrites `JevClient`, `QuickCheckRules`, `CategorizationService` and their tests. (a)
  **chosen:** build on `origin/main` with narrow hunks; whichever lands second merges and resolves. (b) build on that
  branch: depends on unfinished, unreviewed work.

## Tasks

- [ ] T1 Contract (§3, C1, C2), backend, first and in its own commit: done when the backend compiles, its tests pass,
      `interests` round-trips through the profile and an unknown id is a 400.
- [ ] T2 Quick check, pool, plan, Jev (§4, §5, C3-C8): done when every backend case of §6 has a passing test.
- [ ] T3 Screen, personas, frontend contract (§1, §2, §3, C9, C10): done when the jest cases of §6 pass, with tsc and
      lint clean.
- [ ] T4 e2e and recordings (§6): done when the touched Playwright specs pass against this branch's backend.
- [ ] T5 Smoke without a Jev key (§6): done when the picked path is first or second on a real run.

## Review triage

| # | finding | file:line | severity | fix/defer/reject | reason or commit |
|---|---|---|---|---|---|
