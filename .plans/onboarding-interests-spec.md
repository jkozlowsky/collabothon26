---
status: review
baseline_commit: c65aeb40e6793aa7876092aa3789b6d5c1371328
branch: jkozlowsky/restore-interests-onboarding
---
# Onboarding: "What would you like to learn?" replaces the savings questions

Status: **review** (agreed in interview, 2026-11-22). Written against `origin/main` @ `00804f8`, built on `c65aeb4`. Branch `jkozlowsky/restore-interests-onboarding`.

## 0. Goal

A fresh onboarding asks two questions today: "What are you saving for?" (`purpose`) and when the money is needed (`horizon`). Asking about savings at the very first screen makes no sense to the user. Both go. In their place: **one screen, "What would you like to learn?"**, with one chip per area (C24). The areas come from the backend, so the chips carry the names the map uses.

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
- **Helper:** "Pick every topic that is new to you. We'll build your path around them."
- **Which areas:** the `available` stories grouped by `area` (`category` if a story has none), in order of first appearance. Today that is 5: Risk (seoul), Saving (berlin, nairobi), Borrowing (sao-paulo), Investing (tokyo, mumbai), Money basics (buenos-aires).
- **Chip:** Figma "07 Survey · Goals": wrapping pills labelled with the area as spelled in the data. Unselected: white, thin border, plus. Selected: petrol, yellow check, white label, same size. Touch target at least 44 px. No subtitle, icon or city; the user meets the city on the map.
- **What a chip saves:** every available story id of its area. Chips in pick order, stories in endpoint order within a chip. A saved or hinted id of any of its stories selects the whole chip.
- **Counter:** a green check and "N selected" (chips) under them from one pick; none for "Not sure yet".
- **Selection:**
  - Multi-select. Continue is enabled once at least one chip is picked; there is no upper limit.
  - A last chip, **"Not sure yet"**, is exclusive. Picking it clears the areas, and picking an area clears it. It saves `interests: []` and enables Continue.
- **Loading:** show a skeleton or spinner in the list area while the request runs.
- **Request fails:** show an error message with **Retry**, plus **Skip**. Skip moves on with `interests: []`.
- **Personas** (`front/src/lib/personas.ts`, `hints`):
  - The new `hints.interests` (story ids) replaces `purpose`, `horizon` and `goals`.
  - Daniel: `['seoul', 'mumbai']`. He invests, so hype, leverage and gold are the gaps.
  - Elena: `['berlin', 'buenos-aires']`, for a safety net and inflation.
  - Alex: no hints, unchanged.
  - Update the doc comment.
- **testIDs:** `onboarding-interests`, `interest-<area slug>` (`interest-money-basics`), `interest-not-sure`, `interests-count`, `interests-retry`, `interests-skip`, plus the existing `onboarding-continue`.

## 3. Contract: `interests` replaces `goals`

Change these deliberately and tell the team; this is a shared contract.

- **DB:** new migration `V27__interests.sql` (written as V25, then V26, see C1): `ALTER TABLE user_profile RENAME COLUMN goals TO interests; UPDATE user_profile SET interests = '{}';`. Old goal ids are not story ids. Check that the V24 demo account seeds do not write `goals`; if they do, rewrite them.
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
  - The explanation "You picked X as a goal." becomes "You said X is new to you.", with the story `area` in place of X, once per area (C13).

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
  - The screen renders one chip per area from a mocked `/api/stories`; a tap or a one-id hint saves the whole area.
  - "Not sure yet" is exclusive.
  - Continue is disabled with nothing picked.
  - The error state offers Retry and Skip.
  - Persona preselection works.
  - Update `onboarding.test.tsx`, `quick-check*.test.ts(x)`, `personas.test.ts`, `hints.test.tsx` and `test-utils/onboarding.ts`.
- **e2e and recordings:**
  - Replace the `option-home` / `option-1-5y` taps in `front/recordings/journey.ts` with `interest-saving` and Continue. The film is the Berlin take. Update the stubbed categorization if it echoes `goals`.
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
  the late V25. (Resolved during the build: #51 merged as `03d5f8f` and is merged into this branch.)
  Moved again to V27: main merged and deployed `V26__duel_v4_areas.sql` (PR #56) before this branch landed.
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
- **C12 Final call without a Quick check.** (a) **chosen:** it also gets `state.interests` (C3 says both calls), so
  the list is an argument of `JevClient.ask` and `JevQuickCheck` drops `goals` instead of renaming it. (b) only inside
  `JevQuickCheck`: that call would lose the interests entirely.
- **C13 Several picks in one area.** (a) one "You said X is new to you." line per picked path, naming its category.
  (b) **chosen with C24:** one per area, naming the area as the map and the chips do.
- **C14 Lesson ids in Jev's knowledge answers.** `answers[].lessonId` and `checkAnswers[].lessonId` (`seoul-1`) already
  reach Jev on main. (a) **chosen:** left as is, outside this change. (b) drop them from `JevAnswerDto` in the Jev
  simplification branch.
- **C15 A pick steers the area, not the path's own questions.** §4 orders areas, so a Gold pick opens the check with a
  Seoul question (same area). (a) **chosen:** as §4 says. (b) within an area, picked paths' questions first: a small
  change to `QuickCheckRules`, closer to §0's "choice of questions".
- **C16 Criteria note and limits.** (a) **chosen:** only the interest lesson carries the note, and it comes on top of
  the two-per-area limit of the gap lessons, as §5 words it. (b) note every lesson of a picked path.
- **C17 Extra copy on the screen.** (a) **chosen:** the helper "Pick every topic that is new to you. We'll build your
  path around them." and the "N selected" counter. Chips need no subtitle, "Not sure yet" included. (b) title only.
- **C18 Consent notice (high; closed by Jan, 22.11).** F1b Q20's wording said "the ranges you pick" and "We keep the
  result and the ranges". Nothing asks for ranges now; picked topics are sent and kept. (a) keep it:
  the notice is inaccurate. (b) **chosen:** "Your answers, the topics you pick and ranges
  from your accounts are checked by an external AI provider to pick your first lesson. Exact account numbers never
  leave this phone. We keep the result, your topics and the ranges." followed by the existing last sentence.
  The lock line "Only these summaries are shared, never your transactions." is deleted: it was no longer true.
- **C19 Jev wording.** (a) **chosen:** as §4 words it. (b) explain `interests` in the F1 and `first_lesson` questions
  and drop the horizon clause when it is null: verbatim spec blocks, and needs a live probe.
- **C20 Every area solid, no Jev pick.** Smoke: picking Inflation & savings and passing everything starts in Seoul,
  with Berlin second; later picks are not in the path. (a) **chosen:** §5, the rule's start is unchanged. (b) start on
  the first pick and append the other picks: closer to §0, changes the rules.
- **C21 "New to you".** Preselected hints and plain interest are both reported as "new to you". (a) **chosen:** §0's
  meaning. (b) "You chose to learn about X.": softer, a weaker signal.
- **C22 Risk and retirement focus.** No path maps to them, so a pick cannot raise them. (a) **chosen:** §3's mapping.
  (b) a separate focus mapping for interests.
- **C23 A second branch carries this feature.** At 03:03 `jkozlowsky/onboarding-interests-jev` was cut from this
  branch (`481ff1b`) and merged `simplify-jev` (`b15e32d`); it keeps C3 by `givenAnswers` (read, its tests not run
  here), and has uncommitted front work. (a) **recommended:** merge this branch first, then that one as the Jev
  simplification on top, with its own review. (b) merge only that branch: one merge, but it also changes Jev's
  behaviour (gap labels, pinned model), which this review did not see.
- **C24 Jan, 22.11: tiles use the map's area names; one tile selects every path of that area.** The tiles are drawn as
  the chips of Figma "07 Survey · Goals", without its limit of three, step header and mock labels. The contract stays
  story ids; what Jev receives and the pool and plan rules stay per path.

## Tasks

- [x] T1 Contract (§3, C1, C2), backend, first and in its own commit: done when the backend compiles, its tests pass,
      `interests` round-trips through the profile and an unknown id is a 400.
- [x] T2 Quick check, pool, plan, Jev (§4, §5, C3-C8): done when every backend case of §6 has a passing test.
- [x] T3 Screen, personas, frontend contract (§1, §2, §3, C9, C10): done when the jest cases of §6 pass, with tsc and
      lint clean.
- [x] T4 e2e and recordings (§6): done when the touched Playwright specs pass against this branch's backend.
- [x] T5 Smoke without a Jev key (§6): done when the picked path is first or second on a real run.

## Review triage

| # | finding | file:line | severity | fix/defer/reject | reason or commit |
|---|---|---|---|---|---|
| A1 | consent notice says "the ranges you pick"; interests are sent and kept | `ConsentCard.tsx:45` | high | fix | C18 (b), approved by Jan 22.11 |
| A2 | disclosure keeps ids and omits the per-lesson notes | `CategorizationService.java:155` | medium | defer | ids follow C3; the notes derive from disclosed picks and answers; follow-up |
| A3 | pre-V27 categorisation rows read with null interests and old lines | `V27__interests.sql:3` | medium | defer | by reading: no caller dereferences it; the next onboarding rewrites the row |
| A4 | front type lacks sharedWithModel.interests, answers not nullable | `types/categorization.ts:63` | low | defer | already wrong on main, no reader |
| A5 | F1 questions never say what state.interests means | `JevClient.java:71` | medium | defer | Jev wording: C19 |
| A6 | first_lesson instruction ignores the interest notes | `JevClient.java:119` | medium | defer | Jev wording: C19 |
| A7 | step choices never offer Gold as the first question | `QuickCheckRules.java:137` | medium | defer | C15 |
| A8 | step questions refer to a horizon that is always null | `JevClient.java:93` | medium | defer | §1 and §4 keep horizon: C19 |
| A9 | all areas solid without a Jev pick starts at Seoul | `QuickCheckRules.java:380` | medium | defer | seen in smoke, follows §5 and C6: C20 |
| A10 | only the first pick is added to an all-solid path | `QuickCheckRules.java:393` | medium | defer | follows §5 and C7: C20 |
| A11 | Jev's later lesson still opens the path at lesson 1 | `QuickCheckRules.java:385` | medium | reject | C5, lessons unlock in order |
| A12 | "want to learn" is reported as "new to you", hints included | `InterestsStep.tsx:52` | medium | defer | §0's meaning: C21 |
| A13 | interests cannot reach the risk or retirement focus | `FocusArea.java:34` | medium | defer | follows §3: C22 |
| A14 | API accepts coming-soon stories | `UserProfileService.java:39` | low | reject | all 7 stories are available, §3 asks for a story id |
| A15 | enum imports a service type | `FocusArea.java:7` | low | defer | refactor with simplify-jev (C11) |
| A16 | advice guard runs on fixture categories only | `CategorizationRulesTests.java:250` | low | defer | the 7 real names were read and hold no advice; follow-up test |
| A17 | old goals are wiped without asking again | `V27__interests.sql:3` | medium | reject | §3 and §7: no backfill |
| A18 | rename without an alias | `OnboardingRequest.java:10` | medium | reject | §3: deliberate change, front and back land together |
| A19 | a 400 on the background save is only logged | `useOnboarding.tsx:95` | medium | defer | old fire-and-forget; C9 sends rendered ids only |
| A20 | Skip and "Not sure yet" are stored alike | `InterestsStep.tsx:60` | low | reject | §2 defines both as an empty list |
| A21 | Back before Continue drops picks and restores hints | `InterestsStep.tsx:23` | medium | defer | regression, visible before saving; small follow-up: lift the state |
| A22 | Skip after a failed refetch erases confirmed picks | `InterestsStep.tsx:60` | medium | defer | needs a failed request; small follow-up with A21 |
| A23 | a hung stories request has no way out | `InterestsStep.tsx:62` | medium | defer | useApi has no timeout anywhere; small follow-up: withTimeout |
| A24 | hardware back closes the onboarding | `onboarding.tsx:60` | medium | defer | same on main |
| A25 | F1/F1b specs still describe goals | `docs/specs/F1b-quick-check.md:213` | medium | defer | docs pass after simplify-jev |
| A26 | dead style, stale comments, stale fixture line | `personas.ts:22` | low | defer | cosmetic |
| S1 | record layout | `OnboardingRequest.java:10` | low | reject | layout already on main |
| S2 | limits live on the DTO, not in consts | `OnboardingRequest.java:14` | low | defer | same place as the removed GOALS constant |
| S3 | spec under .plans | `.plans/onboarding-interests-spec.md` | low | reject | the path Jan gave |
| S4 | multi-line comment | `personas.ts:19` | low | reject | it replaces a comment of the same length |
| S5 | F1b contract still says goals | `docs/specs/F1b-quick-check.md:213` | medium | defer | same as A25 |
| S6 | two meanings of category in adjacent comments | `types/stories.ts:40` | low | defer | cosmetic |
| S7 | many yellow icons with multi-select | `InterestsStep.tsx:68` | low | reject | the Design Kit's selected OptionCard |
| S8 | multi-select looks like radios | `ui.tsx:153` | low | reject | C10; a selected card shows a check |
| S9 | component fetches its data | `InterestsStep.tsx:21` | low | reject | §2 asks for useApi, as PathSummary does |
| S10 | copied styles, one now unused | `onboarding.tsx:217` | low | defer | same as A26 |
| S11 | duplicate add-interests block | `JevClient.java:158` | low | reject | three lines |
| S12 | story-to-area mapping repeated | `CategorizationRules.java:184` | low | reject | both call ofStoryArea |
| S13 | fromInterests in the enum reverses layering | `FocusArea.java:7` | low | defer | same as A15 |
| S14 | test provider tree repeated | `interests.test.tsx:41` | low | reject | test-only |
| S15 | answers and stories travel together | `CategorizationRules.java:68` | low | reject | refactor outside the change |
| S16 | plan has eight parameters | `QuickCheckRules.java:377` | low | defer | simplify-jev (C11) |
| S17 | stories() borrowed from CategorizationService | `QuickCheckService.java:54` | low | defer | simplify-jev (C11) |
| S18 | notes and ids are plain strings | `JevQuickCheck.java:16` | low | reject | a type would add code only |
| S19 | Intake wraps one field | `types/onboarding.ts:16` | low | reject | §1 only deletes fields |
| S20 | Survey is a stale name | `e2e/app.ts:82` | low | reject | test-only |
| P1 | start-here spec still stubs a horizon | `e2e/start-here.spec.ts:10` | low | reject | stub only, the spec passes |
| P2 | first_lesson instruction not updated | `JevClient.java:119` | medium | defer | same as A6: C19 |
| P3 | T4 and T5 unverified | `.plans/onboarding-interests-spec.md` | low | reject | run afterwards: 23/23 Playwright, 5 smoke runs |
| P4 | deleted constants beyond the list | `constants/quickCheck.ts` | low | reject | dead after §1 |
| P5 | readyForNext now computed with candidates | `QuickCheckRules.java:379` | low | reject | a candidate is never solid, so it stays false; true only under C6 |
| P6 | plan counts any lesson, pool only quiz lessons | `QuickCheckRules.java:397` | low | reject | C5 and C8 |
| P7 | unknown story area throws | `FocusArea.java:40` | low | reject | all areas map; the question pool already throws on main |
| P8 | API accepts coming-soon stories | `UserProfileService.java:39` | low | reject | same as A14 |
| P9 | duplicate ids reach Story.picked | `Story.java` | low | reject | answers come from the profile, which is de-duplicated |

A = adversarial, S = code review Standards, P = code review Spec. One round; no fix was sent.
