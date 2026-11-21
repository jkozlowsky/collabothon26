---
status: grilled
topic: B
owner: Jan; question bank content: Danylo (lessons)
branch: feat/quick-check
---
# F1b Quick check v2: adaptive test and learning path

## Goal
<!-- frozen once approved: only Jan changes it -->
Onboarding should show that Finance Quest **knows the user** and **understands what they need to learn**. After Remigiusz's three questions, the consent card and a "What we know about you" card, the user takes a short adaptive test. A few profile tiles fill in only what is still missing. Then come 3–6 single-choice knowledge questions, and each answer is followed by a confidence chip. Jev is the examiner: after every answer it rates mastery per area and picks the next question from a bank tied to Danylo's lessons. When it has seen enough, it says the test is done. A dock at the foot of the screen shows two markers per area as the answers come in: how sure the user felt, and what their answers show. The summary names the confidence gap, the learner role and the first lesson, and the Learn map marks that lesson "Start here".

What the jury should see:
- **It knows me**: questions quote the user's own numbers, computed on the device; exact amounts never leave it, and the "What we know" card shows ranges only.
- **It understands me**: Jev, not an `if`, decides after each answer how well the user knows an area and what to ask next; a rule takes over only as a safety net.
- **Measured confidence gap**: the chips against the answers ("On Saving you said “Guessing”, yet your answers show you already understand how it works."), visible live on the dock.
- **Actionable**: the summary ends on a concrete first lesson, and the map shows it as "Start here" until it is done.

Design source: direction C "Two markers on a dock", `docs/design/mockups/quick-check-v2-c.html` (dock with two markers, confidence chips inside the tapped tile, profile questions, "What we know about you" card, Learn map with "Start here").

## Jan's decisions
v2 (21.11, grilling rounds 1–3; binding over everything below):
- Rebuild: the text field goes; single-choice tiles plus confidence chips (Guessing / Fairly sure / Sure); Jev drives the test, a rule is the fallback.
- Mockups v2: direction C. Profile questions are asked inside the quiz as tiles, only the missing ones: age band only when life stage was skipped, savings cover in ranges only without consent, time frame always. A "What we know about you" card comes before the quiz. The recommended first lesson must be visible in the interface, not only on the summary.
- Bank: separate from the lesson questions; every question carries a `lessonId` and stays close to its lesson (same concept and level, other numbers or scenario, never a copy of a lesson question).
- Q1 Every question has a mandatory `lessonId`; an area without a lesson has no questions and no place on the dock.
- Q2 A subagent writes a starter bank of ~8 questions from the 3 lessons; Danylo reviews and extends it.
- Q3 Question format: id, lessonId, area, `easy`/`hard`, an account version and a generic version, 3–4 options with exactly one correct, a misconception for each wrong option, and one sentence saying what it checks. `GET` never returns the correct option.
- Q4 `V16__check_questions.sql` is rewritten in place (it is on no remote branch), with an FK to `lesson(id)`.
- Q5 Stateless `POST …/quick-check/step` with the whole history returns `mastery`, `nextQuestionId`, `done`.
- Q6 No language-level output from the test (there are no lesson variants for it).
- Q7 Profile ranges live in the categorisation row, not in `user_profile`.
- Q8 Our front makes the "Start here" change in `map.tsx`; Jan tells the map's author.
- Q9 Work continues on `feat/quick-check`. Removed: the text field, the UUID boundary, the answer-redaction tests, the 280-char limit, `EXPO_PUBLIC_QUIZ_SEED`.
- Q10 Profile questions come first in a fixed order (age band → savings cover → time frame); Jev does not pick them.
- Q11 Jev step: `state` = profile ranges + account facts (with consent) + history (area, correct, misconception, confidence). Questions: `mastery_<area>` noul, `next` choice (criteria = each question's "what it checks"), `enough` noul. Our code enforces min 3 / max 6 knowledge questions; done when `enough` ≥ 0.7; a `next` outside the list → rule.
- Q12 Step timeout 3 s; after the first step failure the rest of the test runs on rules. The final call keeps 7 s and D6. The user sees a message only when the final call falls back.
- Q13 Rule (Reference): start 0.5, scores per answer, mean; next question; end condition; all values named constants.
- Q14 Confidence gap from chips (Reference); Jev `choice` `under`/`over`/`aligned` per area, rule as fallback, at most 2 gap cards. D5 is gone; `experience` still feeds the role.
- Q15 First lesson: candidates from non-Solid areas, Jev `choice` over lessonIds (criterion = lesson `summary`), rule fallback; all Solid → highest uncompleted lesson plus "You're ready for the next step".
- Q16 Mastery levels without percentages (Reference).
- Q17 Time frame "Within a year" moves saving before investing (rule and Jev `state`); the investing question it gets is the one about short-term risk.
- Q18 "Start here" = the first uncompleted lesson (`lesson_completion`) of the areas to learn; it moves on after each completion and disappears when all are done.
- Q19 "Why this question" comes from a template; the model writes no user-facing text.
- Q20 New GDPR art. 13 notice (Reference copy); the consent card loses the sentence about typed text; the slip on account questions stays.
- Q21 Tests: backend with `MockRestServiceServer` (Jev step, timeout, rest on rules, `next` outside the list, rules Q13–Q15, `GET` without the correct option); e2e for both paths, the account and life-stage toggles, and "Start here". Smoke twice (no key, then key); the report starts from the no-key view.
- Q22 Order: backend (opus) → bank content (sonnet, reviewed by the backend implementer) → front (sonnet, after the contract commit); 3 reviews + triage.
- Q23 Jan announces: to Danylo the bank format and the missing lessons for debt/risk/retirement; to the map's author the `map.tsx` change; on the channel the step endpoint and V16. `decisions.md` is updated at approval.
- Q24 No seed; with a key the test may differ between runs.

Still valid from v1 (21.11):
- Q1 Quick check is our step in `/categorizing`: consent card → "What we know" → Quick check → loading → summary → lesson. Remigiusz's onboarding is unchanged.
- Q2/Q15 Questions are written by people, never generated.
- Q6 Without consent the same questions use example numbers.
- Q9/Q18 A summary screen (`/learning-path`) comes before Learn.
- Q17 The bank lives in the backend next to the lessons (migration); the front fills account numbers in only when rendering.
- Q20 Every new onboarding recategorises (no seen-state).
- Migrations: `V15__categorization.sql`, `V16__check_questions.sql`; no `outOfOrder`.
- Backend tests use JUnit assertions only (`org.junit.jupiter.api.Assertions`).
- D6 If the final Jev call fails, the whole categorisation falls back to rules (F1 rule).
- All copy in English; the model is never named; educate, never advise (MiFID II): no named product in any question.

Removed v1 decisions (one line each):
- Q4 open-text answers: replaced by tiles + chips.
- Q7 Quick check skipped without a key: the keyless path now runs the test on rules.
- Q10 / D7 blueprint 2 finance + 2 investing and the forced `retirement` question: the order is adaptive.
- Q12 account-version preference in the draw: the front no longer draws.
- Q13 `EXPO_PUBLIC_QUIZ_SEED`: removed (Q24).
- Q14 `understands`/`partly`/`not-yet` judgement and focus reordering: replaced by mastery (Q11, Q16).
- Q16 starter pool of 9: replaced by Q2.
- Q19 one Jev call at the end: replaced by step calls plus the final call.
- D2 "judge the reasoning, not the numbers": nothing is judged as text.
- D3 / D4 notices about typed words: replaced by Q20.
- D5 experience × check gap table: replaced by Q14.
- D8 risk/ETF prompt wording: covered by the bank rules below.
- D9 delimited answer text and the random UUID boundary (OWASP LLM01): no free text reaches Jev.
- The 280-char limit and the answer-redaction tests: no text field.
- `checks` and `startLesson` from check results: replaced by the fields below.
- Mockup B "The route": replaced by v2 C.

## To confirm
Forks settled with the option marked →; Jan decides.
- **Age band and `lifeStage`.** The tile says "So examples fit your stage of life". (a) the band only goes to Jev and the row (b) a skipped life stage is filled from the band: `18-25` → student, `26-40` → family, `41-60` → established, `60+` → pre-retirement, so F5 personas and F1's retirement focus use it. → (b): using the range for the purpose the tile states (GDPR art. 5(1)(b) purpose limitation) and covering "all generations".
- **D6 line wording.** On the rules path the answers are still scored, so "We couldn't check your answers this time" is inaccurate. (a) keep it (b) "We used a simpler check this time". → (b): accurate information about the processing (GDPR art. 5(1)(a), art. 13).
- **Back during the test.** The test is adaptive, so the next question depends on the earlier answers. (a) answers are final; Back (button or hardware) returns to the "What we know" card and starts the test again with an empty history (b) step back one question and recompute. → (a): adaptive tests do not revisit items, and the restart is stated on the card ("Start the quick check"), so there is no unexpected change of context (WCAG 2.2 SC 3.2.2).

## Contract
Consumers: Danylo (bank format), the summary screen, the map's author (`startHere`), F5 (`lessonVariant`, unchanged). Changes go to `.planning/decisions.md` and the team channel. Everything F1 defines (`docs/specs/F1-profiling.md`: facts, consent rule, Jev call, validation, fallback, because lines) stays unless changed here.

```
GET  /api/check-questions                          → CheckQuestion[]    // the whole bank ordered by id, with or without a key
POST /api/users/{userId}/quick-check/step          StepRequest → StepResponse
POST /api/users/{userId}/categorization            {consent, facts?, profile?, history?} → Categorization
GET  /api/users/{userId}/categorization            → Categorization | 404     // startHere computed on read
```

`GET /api/check-questions` (no correct option, no misconceptions, no "checks" sentence, no level):
```json
[{
  "id": "inflation-real-value",
  "area": "saving",
  "accountPrompt": "Your savings account holds €{savingsBalance} at {savingsInterestRate}% a year. Inflation runs at about 3%. Over a year, what happens to what that money can buy?",
  "slots": ["savingsBalance", "savingsInterestRate"],
  "genericPrompt": "Your savings account holds €10,000 at 2% a year. Inflation runs at about 3%. Over a year, what happens to what that money can buy?",
  "options": [
    "It buys a little more, because the balance grows by the interest",
    "It buys a little less, because prices rise faster than the interest",
    "It stays the same, because the money is safe in the bank",
    "It depends on the bank, not on prices"
  ]
}]
```
`accountPrompt` is null for generic-only questions. Options carry no slots. Slots, their availability rules and their formatting are unchanged from v1: `savingsBalance`, `savingsInterestRate`, `monthOut`, `loanRemaining`, `loanApr`, `cardUsed`, `cardLimit`, `etfMonthly`, `depotTotal`, `positionCount`, filled by `slotValues` in `front/src/lib/bank/selectors.ts`. An account version is shown only with consent and when every slot is available; otherwise the generic version is shown.

`POST /api/users/{userId}/quick-check/step`:
```json
{
  "consent": true,
  "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true},
  "profile": {"ageBand": null, "savingsCover": null, "horizon": "1-5y"},
  "history": [
    {"questionId": "inflation-real-value", "optionIndex": 1, "confidence": "guessing"},
    {"questionId": "compound-two-years", "optionIndex": null, "confidence": null}
  ],
  "useRules": false
}
```
```json
{"mastery": {"saving": 0.6, "investing": 0.25}, "nextQuestionId": "time-in-market", "done": false, "useRules": false}
```
- `optionIndex: null` with `confidence: null` = "Not sure". `history: []` returns the first question, picked by the rule (no Jev call: there is nothing to judge yet).
- `mastery` has a key for every area that has bank questions; `null` = no answer yet. `done: true` comes with `nextQuestionId: null`.
- `useRules` in the response is `true` when no key is configured (`JevProperties.callsJev()` false) or when this step's Jev call failed; the front sends the last response's value with the next step. With `useRules: true` the backend makes no Jev call.

Final `POST /api/users/{userId}/categorization`:
```json
{
  "consent": false,
  "profile": {"ageBand": "26-40", "savingsCover": "1-3", "horizon": "within-1y"},
  "history": [
    {"questionId": "emergency-months", "optionIndex": 0, "confidence": "sure"},
    {"questionId": "inflation-real-value", "optionIndex": 2, "confidence": "sure"},
    {"questionId": "short-term-fall", "optionIndex": 1, "confidence": "fairly-sure"}
  ]
}
```
`profile` and `history` are absent when the Quick check was skipped (empty or failed `GET`); then F1 applies unchanged.

Value sets: `ageBand` `18-25` | `26-40` | `41-60` | `60+`; `savingsCover` = F1 `cashBufferMonths` values `<1` | `1-3` | `3-6` | `6+`; `horizon` `within-1y` | `1-5y` | `5y+` | `not-sure`; `confidence` `guessing` | `fairly-sure` | `sure`. Every profile field is nullable.

`Categorization` (F1) changes; stored in the categorisation JSONB:
```
profile: {ageBand, savingsCover, horizon} | null         // the ranges the user picked (Q7)
mastery: {<area>: number | null}                         // {} without a Quick check
confidenceGaps: [{area, direction: "under" | "over", because}]   // ≤ 2, from Q14 when the Quick check ran; F1's facts table only without one
startLesson: {lessonId, title, area} | null
readyForNext: boolean                                    // every area Solid (Q15)
pathLessonIds: number[]                                  // startLesson first, then the other lessons of non-Solid areas
startHere: {lessonId, title, area} | null                // not stored: first id of pathLessonIds the user has not completed
sharedWithModel gains: profile, answerCount              // never the per-answer history
v1 `checks` is removed. Rows without these fields read as null / {} / [] / false.
```
- The per-answer history is not stored (Q20: "We keep the result and the ranges you pick"); the request history is used for the call and dropped.
- `startHere` reads `lesson_completion` through the existing `LessonCompletionRepository.existsByUserIdAndLessonId` (read only; the profile module is not changed).
- On a failed final call `sharedWithModel` still records what was sent, so the summary decides the D6 line from the stored row alone: `source == "fallback"` and `sharedWithModel != null`.

### Jev step call
`POST {jev.base-url}/v1/systemone` as in F1. Read timeout 3 s (`JevConsts.STEP_READ_TIMEOUT`, a second client built from the injected `RestClient.Builder`); the final call keeps the shared 7 s. `state`:
```json
{
  "profile": {"ageBand": null, "savingsCover": null, "horizon": "within-1y"},
  "facts": {"...": "F1 facts, only with consent"},
  "answers": [
    {"area": "saving", "result": "wrong", "misconception": "Thinks money in the bank keeps its value whatever prices do.", "confidence": "sure"},
    {"area": "investing", "result": "not-sure", "misconception": null, "confidence": null}
  ]
}
```
`result` is `correct` | `wrong` | `not-sure`; `misconception` is the chosen wrong option's text from the bank, else null. Questions, verbatim (`mastery_<area>` only for areas with at least one answer; `next` labels are the unasked question ids, each criterion its `checks` sentence):

<!-- jev-step-questions: the backend test compares the Jev request with this block -->
```json
{
  "mastery_saving":     {"type": "noul", "instructions": "Do this person's answers about saving, emergency funds and inflation show that they understand these ideas well?"},
  "mastery_debt":       {"type": "noul", "instructions": "Do this person's answers about borrowing, loans and credit cards show that they understand these ideas well?"},
  "mastery_investing":  {"type": "noul", "instructions": "Do this person's answers about investing, compound interest and market ups and downs show that they understand these ideas well?"},
  "mastery_risk":       {"type": "noul", "instructions": "Do this person's answers about risk, spreading money and scams show that they understand these ideas well?"},
  "mastery_retirement": {"type": "noul", "instructions": "Do this person's answers about planning for retirement show that they understand these ideas well?"},
  "next": {"type": "choice",
    "instructions": "Which of these questions would show best what this person still needs to learn, given their answers so far, how sure they felt and when they might need their money?",
    "criteria": {"<question id>": "<the question's checks sentence>"}},
  "enough": {"type": "noul", "instructions": "Do the answers so far show clearly enough what this person already understands and what they should learn first?"}
}
```
Step outcome: `mastery` = the `mastery_<area>` probabilities. `done` when answered ≥ `MAX_QUESTIONS`, when no unasked question is left, or when answered ≥ `MIN_QUESTIONS` and `enough` ≥ `ENOUGH_THRESHOLD`; otherwise `nextQuestionId` = `next`. A response that fails F1's validation (missing question, label outside its set, `next` not among the unasked ids, probability outside [0, 1]), a timeout or any error → this step runs on the rule and returns `useRules: true`.

### Jev final call
F1's request (role and `focus_*` verbatim from F1's `jev-questions` block) plus `state.profile` and `state.answers` as in the step call, plus these questions (`mastery_<area>` as in the step block; `gap_<area>` only for areas with at least one answer that carries a chip; `first_lesson` only with 2+ candidates, Q15):

<!-- jev-final-questions: the backend test compares the Jev request with this block -->
```json
{
  "gap_<area>": {"type": "choice",
    "instructions": "In this area, how does how sure this person felt compare with how well they answered?",
    "criteria": {
      "under": "Their answers in this area are mostly right, yet they said they were guessing or only fairly sure.",
      "over": "They said they were sure, yet their answers in this area show gaps.",
      "aligned": "How sure they felt roughly matches how well they answered."}},
  "first_lesson": {"type": "choice",
    "instructions": "Which lesson should this person start with, given which ideas their answers show they have not mastered yet?",
    "criteria": {"lesson_<id>": "<the lesson's summary>"}}
}
```
F1 validation applies to the whole response; any failure → the whole categorisation on rules (D6), 7 s read timeout.

### Validation and errors
`ProblemDetail` from the global handler; `detail` never echoes a rejected value. Both POSTs share these rules:
- F1 rules: malformed JSON, missing `consent`, `userId` blank or over 64 chars, a fact outside its set, `facts` with `consent: false` → 400; onboarding not finished or skipped → 404 "Finish onboarding first" (the step needs the goals).
- `profile` value outside its set → 400.
- `history`: more than `MAX_QUESTIONS` entries, an unknown or repeated `questionId`, `optionIndex` outside the question's options, `confidence` null with a non-null `optionIndex` (or the reverse), `confidence` outside its set → 400.
- Final POST: F1's 5-minute reuse of a recent categorisation is skipped when `history` is non-empty.

## Reference

### Fallback rule (Q13–Q15; constants in `CategorizationConsts`)
| constant | value | use |
|---|---|---|
| `RULE_START` | 0.5 | value of an area with no answer, for ordering only; shown as "Not checked yet" |
| `SCORE_CORRECT_SURE` / `_FAIRLY_SURE` / `_GUESSING` | 0.85 / 0.75 / 0.6 | one correct answer |
| `SCORE_WRONG` | 0.25 | a wrong answer or "Not sure" |
| `MIN_QUESTIONS` / `MAX_QUESTIONS` | 3 / 6 | knowledge questions per test, both paths |
| `RULE_MAX_QUESTIONS` | 4 | the rule ends here |
| `ENOUGH_THRESHOLD` | 0.7 | Jev `enough` |
| `JUST_STARTING_BELOW` / `SOLID_ABOVE` | 0.4 / 0.75 | levels (Q16) |
| `MAX_GAP_CARDS` | 2 | gaps on the summary |
| `SHORT_HORIZON_QUESTION_ID` | `short-term-fall` | Q17 |

- **Mastery**: the mean of the area's answer scores; no answers → null.
- **Area order**: areas from the user's goals first (F1 goals → areas map), then the rest in `saving, debt, investing, risk, retirement` order, keeping only areas with bank questions; `horizon` `within-1y` moves `saving` before `investing`.
- **Next**: (1) after a wrong or "Not sure" answer, an unasked `easy` question from the same area; (2) otherwise the first area in order with no answer; (3) when every area has an answer, the area with the lowest mastery (ties: area order). Within an area: `easy` before `hard`, then `id`; for `investing` with `horizon` `within-1y`, `short-term-fall` first while it is unasked. No unasked question in the chosen area → the next rule down.
- **Done**: answered ≥ `RULE_MAX_QUESTIONS`, or answered ≥ `MIN_QUESTIONS` and every area has an answer, or no unasked question left.
- **Gaps (Q14)**, per area, from the chips ("Not sure" carries no chip and is ignored): `over` when a wrong answer has `sure`; else `under` when a correct answer has `guessing`; else none. Jev `aligned` = none. At most `MAX_GAP_CARDS`: `under` before `over`, then area order. The quoted chip label: `under` quotes the lowest chip in the area, `over` the highest.
- **First lesson (Q15)**: candidates = the distinct `lessonId`s of bank questions in non-Solid areas (an area with no answer counts as non-Solid). One candidate → it, without a Jev question. Rule: the weakest area (lowest mastery, an area with no answer = `RULE_START`, ties: area order); in it, the answered question with the lowest score (ties: earlier in the history) gives the lesson; an area with no answer gives its lowest `lessonId`. No candidates (every area Solid) → the uncompleted lesson with the highest `position`, `readyForNext: true`; every lesson completed → `startLesson: null`.
- **pathLessonIds**: `startLesson` first, then the other candidates by area mastery ascending (no answer = `RULE_START`), then lesson id; with `readyForNext` just `[startLesson.lessonId]`.
- **F1 fallback inputs**: without bank data, `savingsCover` stands in for `cashBufferMonths` in F1's focus rule. F1's facts gap table applies only when the Quick check did not run.

### Mastery levels (Q16)
| mastery | label | dock short label |
|---|---|---|
| null | Not checked yet | Not yet |
| < 0.4 | Just starting | Starting |
| 0.4 – 0.75 | Building | Building |
| > 0.75 | Solid | Solid |

Never a percentage or number on screen. The "How sure you felt" marker (front only, display): mean of the area's chips, Guessing 0.25 / Fairly sure 0.6 / Sure 0.9, "Not sure" counted as Guessing.

### Horizon (Q17)
`within-1y` changes the area order and the investing pick (rule above), and Jev sees it in `state.profile`. Other values change nothing in the rule.

### "Start here" (Q18)
`startHere` = the first id in `pathLessonIds` with no `lesson_completion` row for the user, else null. The map shows it on that lesson's card; after a completion the next GET moves it on; when all are done it disappears.

### Screens (look: mockup C; `finance-quest-ui` skill; tokens from `front/src/constants/theme.ts`)
- **Consent card** (F1 + Q20): the facts preview as in F1, then the notice. The v1 sentence about typed answers is removed.
- **"What we know about you"**: rows for life stage ("You told us" / "Life stage not shared · You skipped this · We will ask one question."), goals ("You told us"), and with consent the F1 fact lines tagged "From your accounts", without consent "Account access is off · You chose this · We will ask about your savings."; footer "Ranges only, never exact amounts. Your questions use the exact numbers on this phone."; buttons "Start the quick check" and "Change account access" (back to the consent card).
- **Question**: header "Question {n} of up to {MAX_QUESTIONS + profile questions}" with "No wrong answers" (knowledge) or "Not scored" (profile); the prompt; "Why this question: …"; tiles as a radio group. Knowledge tile tap → the chips "How sure are you?" Guessing / Fairly sure / Sure appear inside that tile; a chip tap commits. A "Not sure" tile commits at once. A profile tile commits on tap and has no chips and no dock. Under account questions the slip "Only your answer is sent, never these numbers."; under generic ones "Example numbers"; under profile ones "A fact about you, not a test.". No right/wrong feedback.
- **Between questions**: a status line "Choosing your next question" while the step runs; on `done` "All set · That is enough to place you".
- **Dock**: "Your map so far", one column per bank area with the filled bar (mastery) and the hollow diamond (how sure); a tap opens the sheet "Your map in detail" (levels, legend "How sure you felt" / "What your answers show"; Close, Escape and the scrim close it). Each column has a screen-reader text "{Area}: {level}". Reduced motion: the diamond (350 ms), bar (700 ms) and sheet (320 ms) appear in place.
- **Summary** (`/learning-path`): gap cards (≤ 2) or, when the Quick check ran with no gap, the aligned card → "You're {a beginner / an intermediate / an advanced} learner" + "Based on {n} answers and how sure you felt about each." → "Your first lesson · {Area}" with the title (and "You're ready for the next step" when `readyForNext`) → "Your map" (both markers) → "Start learning" (opens `startLesson`, else the map) and a quiet "See all lessons". The D6 line when `source == "fallback"` and `sharedWithModel != null`.
- **Map** (`(learn)/map.tsx`): on the `startHere` lesson card a "Start here" badge and the line "Why here: Your answers about {Area}"; reloaded on focus; 404 or error → the list as today.
- Area display names: Saving, Borrowing (`debt`), Investing, Risk, Retirement.

### Copy, verbatim (Q19, Q20 and the cards)
- Why this question (Q19): knowledge, first question in the area: "Picked to learn more about {Area}"; area already asked: "Picked to look at {Area} from another angle". Profile: age band "So examples fit your stage of life"; savings cover "So examples fit your savings"; time frame "So examples match your time frame".
- Consent notice (Q20): "Your answers are checked by an AI service to pick your first lesson; only your choices are sent, never your account numbers. We keep the result and the ranges you pick."
- Profile questions (Q10 order): "Which age band are you in?" 18–25 / 26–40 / 41–60 / 60+; "How many months of spending could your savings cover?" Less than 1 month / 1–3 months / 3–6 months / More than 6 months; "When might you need the money you save or invest?" Within a year / 1–5 years / 5+ years / Not sure.
- Gap cards: under, title "You know more than you think", because "On {Area} you said “{chip}”, yet your answers show you already understand how it works."; over, title "There is more to explore here", because "On {Area} you said “{chip}”. Your answers leave a few things open, which is where your first lesson starts."; aligned, title "How sure you felt matches your answers", text "On the areas we checked, your confidence and your answers line up." The backend builds `because`; the front adds the titles.
- D6 line: "We couldn't check your answers this time" (wording under To confirm).

### Bank rules (for the content task and Danylo)
- Columns of `check_question`: `id` (slug `^[a-z0-9-]+$`), `lesson_id` (NOT NULL, FK `lesson(id)` `ON DELETE CASCADE`), `area`, `level` (`easy` | `hard`), `account_prompt` (nullable), `slots`, `generic_prompt`, `options` (3–4), `correct_index` (inside `options`), `misconceptions` (same length as `options`, NULL at `correct_index`, text elsewhere), `checks` (one sentence). DB `CHECK`s hold the lengths, ranges and sets.
- Starter bank, 8 rows from V2's lessons (1 Emergency fund and 3 Inflation → `saving`; 2 Compound interest → `investing`): each area at least 2 `easy` and 1 `hard`, so a 6-question test never runs out; `short-term-fall` (investing, easy, lesson 2) asks about a market fall next month against a long horizon. Same concept and level as the lesson, other numbers or scenario, no lesson question copied.
- Every prompt asks about understanding and recommends nothing: no named product, no "should", no buy / invest / switch as advice (MiFID II).

## Tasks
Simplest working solution, no code or tests for later. Each task loads `ponytail:ponytail` and runs `ponytail:ponytail-review` on its diff; backend rules from `CLAUDE.local.md` "Backend: konwencje" (layer subpackages under `categorization`, one type per file, Lombok, MapStruct, JPQL projections, named constants, Bean Validation on DTOs, JUnit assertions, TDD).

- [ ] **Q-B backend contract** (opus, `java-springboot`), first. Rewrite `back/src/main/resources/db/migration/V16__check_questions.sql` in place to the bank columns above with a 4-row placeholder seed (per area one `easy`, one `hard`, `short-term-fall` among them). `GET /api/check-questions` in the new shape (no key check); `POST /api/users/{userId}/quick-check/step` (new `QuickCheckController`, `QuickCheckService`); the step Jev client with 3 s; the final call additions; the stored fields and `startHere`; remove the v1 text path (`CheckAnswerDto`, `JevCheckDto`, `CheckDto`, `checks`, the boundary code, `AnswerRedactionTests`). Files: `back/src/main/java/com/collabothon/back/categorization/**`, `back/src/test/java/com/collabothon/back/categorization/**`, V16. Commit the contract (DTOs, V16 schema) on its own first. Done when `./mvnw clean test` is green and covers: GET without `correctIndex`, `misconceptions`, `checks`; each 400 case above; step with Jev (`MockRestServiceServer`) returning `next`; a 3 s timeout and a `next` outside the list → rule and `useRules: true`; `useRules: true` → no Jev request; each rule row (scores, next, done, gaps, first lesson, all Solid, `within-1y`); both Jev request bodies equal the two blocks; the stored row has no per-answer history; `startHere` moves after a `lesson_completion` row. Tests read expectations from the seeded bank, not from literal ids, so the content task does not break them.
- [ ] **Q-C bank content** (sonnet), after Q-B's contract commit. Replace V16's placeholder seed with the 8 rows per "Bank rules", reading `git show origin/main:back/src/main/resources/db/migration/V2__lessons.sql`. Done when `./mvnw clean test` stays green, every account prompt's `{slot}` is in `slots` and in the known set (existing pool test), and the Q-B implementer has reviewed the rows against the bank rules and MiFID wording (findings fixed).
- [ ] **Q-F front** (sonnet, `expo` skills, `frontend-react-best-practices`, `finance-quest-ui`), after Q-B's contract commit. Types in `front/src/types/quickCheck.ts` and `categorization.ts`; `front/src/lib/quickCheck.ts` (fetch, slot filling; the draw and the seed go); `front/src/hooks/useQuickCheck.ts` (profile questions, step calls with a 5 s client timeout, one retry with `useRules: true`, a second failure ends the test and sends the history so far); `ConsentCard` (Q20), a new "What we know" card, `QuickCheckPage` (tiles, chips, Not sure, why line, slip), the dock and sheet, `PathSummary`, `categorizing.tsx`, `learning-path.tsx`; remove the text input, the 280 limit and `EXPO_PUBLIC_QUIZ_SEED` (also from `front/.env.example`). Every clickable element has a `testID`. Done when `npx expo lint`, `npx tsc --noEmit` and `npm run check` pass and Playwright (`page.route` stubs for GET, step and POST) covers: consent → What we know → profile tiles → knowledge questions with chips → summary → lesson; the no-consent path (savings-cover tile, generic prompts); life stage skipped (age-band tile); a step failure continuing on rules; `done` before `MAX_QUESTIONS`.
- [ ] **Q-F map** (same worker, last). `front/src/app/(main)/(learn)/map.tsx`: GET categorisation, the "Start here" badge (`testID="start-here"`) and why line on the `startHere` lesson, reload on focus; nothing else on the screen changes. Done when Playwright shows the badge on the stubbed `startHere` lesson, no badge on 404, and the badge on the next lesson after a stubbed completion.
- [ ] **Smoke** (coordinator, `playwright-cli`): the whole flow on the real backend without a key, then with the key. Done when both runs reach the map with "Start here" and the report starts from the no-key run.

## Never
- Free text to Jev; Jev sees only bank content, choices, chips and ranges.
- Exact amounts to Jev, in the stored row or on the "What we know" card.
- User-facing text written by the model: Jev returns labels and probabilities, every sentence comes from our templates.
- The model's name anywhere in the UI.
- Product advice or buy / invest / switch wording in questions, options or copy (MiFID II).
- A seed or any other way to fix the question order.
- A language-level output or language variants from the Quick check.
- A right/wrong verdict per question, a percentage or a score shown as a grade.

## Review triage
v1 "To confirm" and both v1 triage rounds: `.planning/reviews/F1b-v1-triage.md` (coordinator's checkout).

| # | finding | file:line | class | reason or commit |
|---|---|---|---|---|
