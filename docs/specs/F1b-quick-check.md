---
status: ready
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
v3 (21.11, Jan; overrides everything below where they differ):
- Consent comes first, on one onboarding screen merged with "What we know": what the account already shows, what is still asked, the GDPR notice and "Your choices are checked by an AI service."
- The profile questions leave the test and move into the survey. With consent the age band comes from the account; without it the survey asks life stage, experience and savings cover. The time frame is always a survey step.
- A purpose question ("What are you saving for?") replaces the goals grid in a fresh onboarding and is saved as `goals`.
- One 1–5 confidence rating in the survey replaces the chips: 1–2 → `guessing`, 3 → `fairly-sure`, 4–5 → `sure`, sent with every answered option.
- `GET /api/check-questions` returns `correctIndex`; the right answer and a feedback line show after each question, and "Continue" moves on.
- No dock during the test; the two-marker map stays on the summary.
- No "Use simple check instead" (replaces D5); the app still sends back the `useRules` and `stepFellBack` the backend returns.
- No back inside the test (replaces D3): Close leaves for Learn, hardware back does nothing.
- Fallback role: when the test ran and no experience was declared, the role comes from the result and follows the map: no answered area with mastery above 0.75 → novice; at least one, even with a single answer → intermediate; every answered area Solid (two answers each) → advanced. A declared experience and the Jev path are unchanged.
- Gaps: "under" needs every answer in the area right and the self-rating low (`guessing`); "over" still needs a wrong answer at `sure`. The cards say "You rated your confidence low/high" and name the area's answers, since there is one overall rating.
- Scores: a right answer scores 0.85 whatever the confidence, so a low self-rating can still reach Solid; the confidence feeds only the confidence marker and the gaps.
- Rule length: a run with every answer right goes on while an area with questions left has a single answer, and the next question comes from that area, still at most 4; so the rule can reach Solid in two areas and the advanced role. A run with a wrong or "Not sure" answer ends as before.
- Onboarding is mandatory: a fresh onboarding has no "Skip" on any step, no "Skip for now" before the test and no Close in the test (replaces the Close in "No back inside the test" above); only Close on the welcome screen leaves, and it saves nothing. The two error screens keep their way out, labelled "Continue to Learn". Profile → "Edit answers" keeps its "Skip".
- Consent is required: the consent screen offers "Use my account data" and "Not now" (nothing saved, back to the bank, onboarding shows again on the next Learn tap); there is no run without account access, so the survey no longer asks life stage, experience or savings cover. The backend still accepts `consent: false`, which a reload of /categorizing sends.

v4 (21.11, Jan; overrides v3 and everything below where they differ):
- No self-rating: the survey's 1–5 confidence step is gone (a fresh survey is purpose and time frame), history entries carry only `questionId` and `optionIndex`, and the feedback banner has three texts (right, wrong, not sure). `Categorization.confidence` and the confidence markers and legend on the summary map are removed.
- The gap compares what the knowledge answers show with what the account shows. Habit per area, from the facts sent with consent: saving = `savesRegularly`, investing = `holdsInvestments`; other areas have no habit and no gap.
- Gap rule, in code, per area with at least one answer and with facts present: habit and at least one answer not correct → `habit-ahead`; no habit and every answer correct → `knowledge-ahead`; otherwise no gap. Without facts (the reload path sends `consent: false`) there are no gaps. Still at most `MAX_GAP_CARDS`, the card about the start lesson's area first.
- Renamed: `confidenceGaps` → `gaps`, entries `{area, direction: "habit-ahead" | "knowledge-ahead", because}` (`GapDto`). F1's said-versus-account table (only without a Quick check) uses the same directions: the account ahead of what the user said → `habit-ahead`, the reverse → `knowledge-ahead`.
- `because`, descriptive only: `habit-ahead` "Your account shows you move money to savings every month. Your Saving answers leave a few things open, which is where your first lesson starts." (investing: "Your account shows you already invest. Your Investing answers leave a few things open, …"; the ending is "…open to explore." when the first lesson is in another area); `knowledge-ahead` "Your Saving answers show you understand how it works. Your account shows no monthly transfer to savings." (investing: "…Your account shows no investment products.").
- Summary copy: "Based on N answers and what your account shows."; card titles "Your habits are ahead of the theory" (`habit-ahead`) and "You know more than your account shows" (`knowledge-ahead`), body = `because`.
- Jev: each answer in `answers` / `checkAnswers` carries its `lessonId` and no `confidence`; the step's `next` no longer mentions how sure the user felt; the final call asks one `gap_<area>` choice per answered area with a habit, only when facts were sent, with options `habit_ahead`, `knowledge_ahead`, `aligned`. A Jev label counts only when the gap rule above gives the same direction for that area; otherwise the area is aligned.
- Stored rows: the categorisation JSONB has no `confidence` key any more and `gaps` replaces `confidenceGaps`; there is no column to migrate, and a row written before v4 reads with `gaps: []`.

v5 (21.11, Jan; overrides v4, v3 and everything below where they differ):
- The questions are the `quiz` steps of the lessons in `back/src/main/resources/content/lessons`: 46 steps in 22 of the 23 lessons (seoul-4 has none and is never tested). Left out, in one place (`CheckQuestionService`): the five steps with a `chart` (tokyo-3/q1, tokyo-4/q1, tokyo-5/q1, buenos-aires-1/q3, mumbai-1/q1), since the test shows no chart. The pool has 41 questions in 22 lessons. A prompt's lesson counter ("Checkpoint 1 of 3 · " in berlin-1) is cut off. After the merge of main's universal paths (21.11) the stories have no character, so the filter on the character's name is gone; three explanations still lean on their lesson's example (sao-paulo-1/q2 "the fridge", sao-paulo-2/q1 "€420 a month", sao-paulo-5/q1 "from mission 2"). The hand-written bank is gone: the `check_question` table (dropped in `V23__drop_check_question.sql`, after main's `V22__check_questions_new_paths.sql`), levels, slots, account and generic prompts, misconceptions, `checks`, the easy-first and slot ordering, and the D8 horizon question swap with its two constants.
- Pool: one question per quiz step that is not left out, id `<lessonId>/<stepId>` (`berlin-1/q1`), in story order (stories.json, then each story's `lessonIds`, then the lesson's steps), read through `LessonContentRepository`. A question carries its lesson's `topic` and `concepts` and its story's area: "Saving" and "Money basics" → `saving`, "Borrowing" → `debt`, "Investing" and "Risk" → `investing` (`FocusArea.ofStoryArea`, the one place). Seoul's "Risk" path is about investing risk (hype, leverage, spreading), so the test rates it with investing and three areas stay in play: saving (Berlin, Buenos Aires, Nairobi), debt (São Paulo), investing (Seoul, Tokyo, Mumbai).
- The lesson the next question comes from is chosen from the answers: by Jev when it answers, by the rule otherwise (no key, timeout, `useRules`, `stepFellBack`). The question is drawn at random from that lesson's quiz steps not asked yet (the `RandomGenerator` bean; tests replace it). The step endpoint stays stateless: the history's question ids say what was asked. A lesson the user completed is never asked about.
- Rule for the next lesson, in this order: (1) empty history → the first area of the area order, at its first lesson in story order that has a question left; (2) after an answer that is not correct → the same lesson while it has a question left, else the next lesson of that story that has one; (3) the first area in order without an answer; (4) in a run without a mistake, the first area one answer short of Solid; (5) the areas by mastery ascending (ties: area order). In (3)–(5) the area gives its first lesson in story order that has not been asked about yet, else its first lesson with a question left; an area with nothing left to ask passes to the next rule. Stop rules: `MIN_QUESTIONS` 3, `MAX_QUESTIONS` 6, Jev `enough`, and for the rule `RULE_MAX_QUESTIONS` 4 once any answer is wrong or "Not sure". While every answer so far is correct the rule's limit is `MAX_QUESTIONS`, so the "one answer short of Solid" extension can give two answers in each of the three areas. An area with no question left counts as covered.
- Jev step call: `next` is a choice among lessons, at most `LESSON_CHOICES_PER_AREA` (2) per area in the area order, so at most 6 options: lessons with a question left, each story's first such lesson before any story's second, so the two investing options are one of Seoul and one of Tokyo, and the two saving options one of Berlin and one of Buenos Aires. Each option is named by the lesson's topic in snake case (`inflation_and_what_your_money_can_buy`) and described by "<topic>. Covers: <concepts>."; code maps the name back to the `lessonId` and draws the question. A name outside the options, any invalid answer or no answer in 3 s → the rule, `stepFellBack: true`, as before. One `mastery_<area>` noul per answered area: saving, debt, investing. Each answer in the state is `{area, lessonId, topic, concepts, result}`; `misconception` is gone.
- First question (21.11, Jan): with an empty history and a key the step asks Jev too, among the same lesson options, with the `first` wording sent as the call's one question `next`. The state is `{profile, goals, facts?}` with no `answers` key (an empty list would read as a signal), and `mastery_<area>` and `enough` are not asked: mastery starts all `null` and no stop rule applies before `MIN_QUESTIONS`. A failed call or a name outside the options → the rule's lesson (rule 1) with `stepFellBack: true`; fewer than two lessons to choose from → the rule without a call. The front counts this step into `stepCallsMade` once the response says `useRules: false`.
- Jev final call: `first_lesson` is a choice among lessons, named and described the same way: per area of the candidate pool (answered, non-Solid areas when any, as before) at most 2 lessons not completed, those with an answer that was not correct first, then one per story. Jev's lesson counts only when it is one of the options sent; an option name outside them fails validation and the whole categorisation runs on rules. The rule's lesson is the one of the lowest-scored answer in the weakest area, as before.
- Start lesson: the picked lesson gives the story and the area. The app opens a story's lessons only in order (`LessonProgression.requireUnlocked`, 403 `PREVIOUS_LESSON_LOCKED`; later lessons show locked), and the lock rules stay, so `startLesson` is that story's first lesson not completed, not the picked lesson itself. `startHere` for a later path story takes the story's area.
- Mastery, Solid, the role (`measuredRole`) and the gaps keep their rules, now over three areas; gaps stay with saving and investing, the areas with a habit in the facts. A run without a mistake on the rule asks 6 questions, two per area, makes every area Solid and gives `advanced` (`readyForNext: true`, the path is the first story with a lesson left); a run with a mistake ends at 4 as before.
- `GET /api/check-questions` returns `{id, lessonId, area, prompt, options, correctIndex, explanation}`.
- Front: the question shows the quiz step's `prompt` and options. No slots, no "Example numbers" and no "Only your answer is sent, never these numbers." line. The feedback banner shows the question's `explanation` under "Right" / "Not quite" / "Good to know". The lesson renderer's glossary link needs the lesson's own `glossary` map, which the test does not have, so a `[[concept|shown text]]` marker shows as its plain label (`[[real-return]]` → "real return"). The summary map shows every area with a key in `mastery` (saving, debt, investing; "Not checked yet" without an answer); `debt` keeps its existing label "Borrowing".

v2 adversarial review (21.11, `.planning/reviews/F1b-v2-spec-adversarial-review.md`; binding over everything below):
- D1 Age bands `18-25 | 26-40 | 41-59 | 60+`. With life stage skipped: `18-25` → student, `60+` → pre-retirement, `26-40` and `41-59` → null (GDPR art. 5(1)(d) accuracy: no inferred family status).
- D2 Final-call fallback line: "We used a simpler check this time".
- D3 Answers are final. Back (button or hardware) returns to the "What we know" card and restarts with an empty knowledge history; profile answers are kept.
- D4 One mastery source: the final POST carries the last step's `mastery`; the final Jev block has no `mastery_*`.
- D5 The "What we know" card says "Your choices are checked by an AI service." and links "Use simple check instead", which runs the test with `useRules: true` (GDPR art. 25).
- D6 Fixed summary line: "This picks lessons for you. It is not investment advice." (MiFID II).
- D7 An area is Solid only with ≥ 2 answers; copy "You're ready for the next lesson".
- D8 (Jan, after review round 1, A14) Two horizon questions. `fall-before-you-need-it` (saving, easy, lesson 1) asks what a 15% fall next month means for money needed within a year; with `within-1y` our code serves it first for saving on both paths, and `short-term-fall` is never served to these users. `short-term-fall` (investing, easy, lesson 2) asks about a fall next month against 20 years of compounding and stays for longer horizons.
- D9 Latency budget: Jev step p50 < 1.5 s with the key; the smoke records each step's time; a step over budget takes `next`/`done` from the rule and keeps Jev's mastery. The 3 s timeout stays the hard limit.
- D10 No rate limit and no cap on Jev calls: the step endpoint is stateless, so every request with Jev on is one Jev call, whatever `MAX_QUESTIONS` says about one test. No auth in the hackathon; acceptable only without a public deployment. A deliberate omission.
- Review fixes 1–13 accepted; fix 2 changes Q22's order: bank content first.

v2 (21.11, grilling rounds 1–3):
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
- Migrations: `V17__categorization.sql`, `V18__check_questions.sql` (renumbered from V15/V16 after main's `V15__glossary.sql`/`V16__glossary_content.sql`); no `outOfOrder`.
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
None: the three v2 forks are settled by D1–D3.

## Contract
Consumers: Danylo (bank format), the summary screen, the map's author (`startHere`), F5 (`lessonVariant`, unchanged). Changes go to `.planning/decisions.md` and the team channel. Everything F1 defines (`docs/specs/F1-profiling.md`: facts, consent rule, Jev call, validation, fallback, because lines) stays unless changed here.

```
GET  /api/check-questions                          → CheckQuestion[]    // the lessons' quiz steps in story order, with or without a key
POST /api/users/{userId}/quick-check/step          StepRequest → StepResponse
POST /api/users/{userId}/categorization            {consent, facts?, profile?, history?, mastery?, useRules?, stepCallsMade?} → Categorization
GET  /api/users/{userId}/categorization            → Categorization | 404     // startHere computed on read
```

`GET /api/check-questions` (v5: one entry per lesson quiz step in the pool):
```json
[{
  "id": "berlin-1/q1",
  "lessonId": "berlin-1",
  "area": "saving",
  "prompt": "What does an inflation rate of 3% mean?",
  "options": ["On average, the basket of goods costs 3% more than a year ago", "Every price rose by exactly 3%", "The bank takes 3% of your balance"],
  "correctIndex": 0,
  "explanation": "[[inflation]] is an average over a basket. Some prices rise much more, some less, some even fall."
}]
```
`id` is `<lessonId>/<stepId>`; `area` is the story's area (`saving` | `debt` | `investing`); `prompt`, `options`, `correctIndex` and `explanation` are the quiz step's own, the explanation with its `[[concept]]` / `[[concept|shown text]]` glossary markup. The correct option and the explanation go out because the app shows them after each answer.

`POST /api/users/{userId}/quick-check/step`:
```json
{
  "consent": true,
  "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true},
  "profile": {"ageBand": null, "savingsCover": null, "horizon": "1-5y"},
  "history": [
    {"questionId": "berlin-1/q1", "optionIndex": 1},
    {"questionId": "sao-paulo-3/q2", "optionIndex": null}
  ],
  "useRules": false,
  "stepFellBack": false
}
```
```json
{"mastery": {"saving": 0.85, "debt": 0.25, "investing": null}, "nextQuestionId": "sao-paulo-1/q1", "done": false, "useRules": false, "stepFellBack": false}
```
- `optionIndex: null` = "Not sure". `history: []` returns the first question: its lesson is picked by Jev from the goals, the profile and, with consent, the facts, or by the rule when the step runs without Jev (v5, "First question").
- `mastery` has a key for every area that has questions (saving, debt, investing); `null` = no answer yet. `done: true` comes with `nextQuestionId: null`.
- `useRules` means no Jev at all: the user's opt-out (D5) or no configured key (`JevProperties.callsJev()` false); the response returns `true` in either case. `stepFellBack` (default `false`) turns `true` in the response once a step's Jev call failed; it switches only the later steps to the rule, and the final Jev call still runs (Q12). The front sends the last response's `useRules` and `stepFellBack` with the next step, and `useRules` with the final POST. With either one `true` the step makes no Jev call. So every step sent with both `false` is one Jev call; the front counts them into `stepCallsMade`: on send for a step with a history, and for the first step once its response says `useRules: false` (only that response tells the front whether the backend has a key).

Final `POST /api/users/{userId}/categorization`:
```json
{
  "consent": false,
  "profile": {"ageBand": "26-40", "savingsCover": "1-3", "horizon": "within-1y"},
  "history": [
    {"questionId": "berlin-1/q2", "optionIndex": 0},
    {"questionId": "sao-paulo-1/q1", "optionIndex": 2},
    {"questionId": "seoul-1/q2", "optionIndex": 1}
  ],
  "mastery": {"saving": 0.85, "debt": 0.25, "investing": 0.85},
  "useRules": true,
  "stepCallsMade": 2
}
```
- `profile`, `history`, `mastery` and `stepCallsMade` are absent when the Quick check was skipped (empty or failed `GET`, or a failed first step); then F1 applies unchanged, and after the opt-out (D5) the front still sends `useRules: true`, which the backend honours without `profile`. The Quick check ran only with `profile` and a non-empty `history`; `profile` with an empty history is the skip path. Without `profile`, `history` and `mastery` are ignored and not checked against the bank.
- `mastery` is the last step response's `mastery` (D4), stored with a key for every bank area; an answered area whose value is missing or null takes the rule mean. `useRules: true` → no final Jev call, the categorisation runs on rules; a step fallback (`stepFellBack`) does not stop the final call.
- `stepCallsMade` is counted by the front on send, kept across D3 restarts and on the F1 resend after a failed step; negative → 400, no upper bound, stored as sent.
- With life stage skipped in onboarding, the categorisation reads `lifeStage` from `ageBand` (D1: `18-25` → student, `60+` → pre-retirement, else null); the onboarding row is not changed.

Value sets: `ageBand` `18-25` | `26-40` | `41-59` | `60+`; `savingsCover` = F1 `cashBufferMonths` values `<1` | `1-3` | `3-6` | `6+`; `horizon` `within-1y` | `1-5y` | `5y+` | `not-sure`. Every profile field is nullable.

`Categorization` (F1) changes; stored in the categorisation JSONB:
```
profile: {ageBand, savingsCover, horizon} | null         // the ranges the user picked (Q7); non-null = the Quick check ran
mastery: {<area>: number | null}                         // {} without a Quick check
answerCount: number                                      // knowledge answers; 0 without a Quick check
gaps: [{area, direction: "habit-ahead" | "knowledge-ahead", because}]   // ≤ 2, from the v4 gap rule when the Quick check ran; F1's facts table only without one
startLesson: {lessonId, title, area, storyId, storyCity} | null   // lessonId a JSON lesson id (string), title the lesson's, storyCity stories.json city, area the area that picked the story (J4; null when no candidate picked it, e.g. all Solid); null → the summary hides the first-lesson card
readyForNext: boolean                                    // every area Solid (Q15, D7)
pathStoryIds: string[]                                   // story ids in path order: startLesson's story first, then the other candidate stories (v2.1)
startHere: {lessonId, title, area, storyId, storyCity} | null   // not stored: the key is absent from the row; the first path story with a lesson not done, at its first lesson not done; area as in startLesson for its story, for a later path story its bank area with the lowest stored mastery; null when every path story is done (v2.1)
sharedWithModel: {facts | null, answers | null, goals, profile | null, answerCount, stepCallsMade} | null   // categories sent to Jev in steps or the final call, built when stepCallsMade > 0 or the final call was sent, whether or not the Quick check ran; answers (onboarding) only when the final call was sent; goals always (steps and the final call both send them); null = nothing was sent
v1 `checks` is removed. Rows without these fields read as null / {} / 0 / [] / false.
```
- The per-answer history is not stored (Q20: "We keep the result, your topics and the ranges"); the request history is used for the call and dropped.
- `startHere` and the completion filter read completions through `com.collabothon.back.lesson.LessonProgress.completed(userId)` and lessons and stories through `LessonContent` (`stories()`, `lessonIdsOf`, `lesson`), public and read-only for F1b (v2.1).
- The summary decides the D2 line from the stored row alone: `source == "fallback"` and `sharedWithModel != null`.

### Jev step call
`POST {jev.base-url}/v1/systemone` as in F1. 3 s limit (`JevConsts.STEP_READ_TIMEOUT`): the step waits 3 s on a `Future` over the shared client and then cancels it, because Boot binds `MockRestServiceServer` to one `RestClient.Builder` and a second client would reach the real API in tests. The abandoned HTTP read may run on to the shared 7 s read timeout. The final call keeps the shared 7 s. `state`:
```json
{
  "profile": {"horizon": "within-1y"},
  "interests": [{"category": "<picked path category>", "topic": "<picked path topic>"}],
  "facts": {"...": "F1 facts, only with consent"},
  "answers": [
    {"area": "saving", "lessonId": "berlin-1", "topic": "Inflation and what your money can buy", "concepts": ["inflation", "real-return"], "result": "wrong"},
    {"area": "debt", "lessonId": "sao-paulo-1", "topic": "The interest in \"no interest\"", "concepts": ["installments", "hidden-interest"], "result": "not-sure"}
  ]
}
```
`profile` holds only the ranges given and is left out when none is, `interests` is left out when empty, `facts` without consent and `answers` before the first answer. `result` is `correct` | `wrong` | `not-sure`; `lessonId`, `topic` and `concepts` are those of the lesson the question came from. Questions, verbatim (`mastery_<area>` only for areas with at least one answer; `next` only with 2+ lessons to choose from). `next.criteria` is built per request (v5): one option per candidate lesson, named by the lesson's topic in snake case and described by an object with the same fields on every option, `{"topic": <topic>, "concepts": [<concepts, hyphens as spaces>]}` (22.11; replaces the "<topic>. Covers: <concepts>." text of v5); the candidates are at most `LESSON_CHOICES_PER_AREA` (2) lessons per area in the area order, lessons with a question left, each story's first such lesson before any story's second. The backend test compares each sent question with its entry below, the criteria filled from the lessons, and finds no extra keys.

<!-- jev-step-questions: the backend test compares the Jev request with this block -->
```json
{
  "mastery_saving":    {"type": "noul", "instructions": "Do this person's saving answers, the entries of `answers` whose `area` is saving, show that they understand ideas such as inflation, an emergency fund and how savings grow?"},
  "mastery_debt":      {"type": "noul", "instructions": "Do this person's borrowing answers, the entries of `answers` whose `area` is debt, show that they understand ideas such as instalments, card debt and the full cost of a loan?"},
  "mastery_investing": {"type": "noul", "instructions": "Do this person's investing answers, the entries of `answers` whose `area` is investing, show that they understand ideas such as market falls, borrowing to invest and spreading risk?"},
  "next": {"type": "choice",
    "instructions": "The next test question will come from one of these lessons. Which lesson would show best what this person still needs to learn, given their answers so far in `answers`, when they might need their money in `profile.horizon` (when given) and, when given, the topics they said are new to them in `interests`?",
    "criteria": {"<lesson topic in snake case>": {"topic": "<lesson topic>", "concepts": ["<lesson concept>"]}}},
  "first": {"type": "choice",
    "instructions": "The first test question will come from one of these lessons. Which lesson's topic matters most for this person's situation, given when they might need their money in `profile.horizon` (when given) and, when given, the topics they said are new to them in `interests` and the facts about their accounts in `facts`?",
    "criteria": {"<lesson topic in snake case>": {"topic": "<lesson topic>", "concepts": ["<lesson concept>"]}}},
  "enough": {"type": "noul", "instructions": "Do the answers so far show clearly enough what this person already understands and what they should learn first?"}
}
```
Step outcome, in this order:
1. A response that fails F1's validation (missing question, label outside its set, `next` not among the lessons sent, probability outside [0, 1]), a timeout or any error → this step runs on the rule and returns `stepFellBack: true`. After a fallback the rule recomputes mastery from all answers, so the dock's values can jump from Jev's to the rule's.
2. `mastery` = the `mastery_<area>` probabilities; an answered area without a `mastery_<area>` question takes the rule mean.
3. A response later than `JevConsts.STEP_BUDGET` (1.5 s, D9) → `next` from the rule, `done` as in outcome 4 with Jev's `enough`; `stepFellBack` stays `false`.
4. `done` when answered ≥ `MAX_QUESTIONS`, when no unasked question is left, or when answered ≥ `MIN_QUESTIONS` and `enough` ≥ `ENOUGH_THRESHOLD`. Otherwise the next question is drawn at random from the unasked quiz steps of the lesson `next` names, or of the single candidate lesson when `next` was not asked.
5. Removed in v5 (the D8 question swap went with the bank); `within-1y` still moves saving before investing in the area order.

### Jev final call
F1's request (role and `focus_*` verbatim from F1's `jev-questions` block) plus `state.profile` (as in the step call) and `state.checkAnswers` (the step call's `answers`; F1's `state.answers` already holds the onboarding answers), plus this question (`first_lesson` only with 2+ lessons to choose from, its criteria built per request as in the step call: per area of the candidate pool at most 2 lessons not completed, those with an answer that was not correct first, then one per story, v5; then the interest lessons, whose options also have `personal_context`, one sentence saying that the person picked the path and, in a Solid area, that the test showed they already know the basics; no other option has that field). No `mastery_*` (D4). Same per-key comparison as the step block.

<!-- jev-final-questions: the backend test compares the Jev request with this block -->
```json
{
  "first_lesson": {"type": "choice",
    "instructions": "Which of these lessons should this person start with, given which ideas their knowledge answers in `checkAnswers` show they have not mastered yet?",
    "criteria": {"<lesson topic in snake case>": {"topic": "<lesson topic>", "concepts": ["<lesson concept>"]}}}
}
```
F1 validation applies to the whole response; any failure → the whole categorisation on rules (D6), 7 s read timeout. Jev is not asked about gaps (22.11; replaces the `gap_<area>` choices of v4): the v4 gap rule gives them in code from the facts and the history, the same whether the call answered or fell back. The response's `direction` is `habit-ahead` / `knowledge-ahead`.

### Validation and errors
`ProblemDetail` from the global handler; `detail` never echoes a rejected value. Both POSTs share these rules:
- F1 rules: malformed JSON, missing `consent`, `userId` blank or over 64 chars, a fact outside its set, `facts` with `consent: false` → 400; no onboarding row → 404 "Finish onboarding first". Skipped onboarding is allowed as in F1.
- `profile` value outside its set, or `savingsCover` with `consent: true` (the card asks it only without consent) → 400.
- `history`: more than `MAX_QUESTIONS` entries, an unknown or repeated `questionId`, `optionIndex` outside the question's options → 400.
- Final POST with `profile`: a `mastery` key that is not a bank area or a value outside [0, 1] → 400; a negative `stepCallsMade` → 400 (with or without `profile`). F1's 5-minute reuse of a recent categorisation is skipped when `profile` is sent or `useRules` is true, and reuses only a stored row without `profile` and with `answerCount` 0.
- No rate limit (D10).

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
| `SOLID_MIN_ANSWERS` | 2 | D7 |
| `MAX_GAP_CARDS` | 2 | gaps on the summary |
| `SHORT_HORIZON_QUESTION_ID` | `fall-before-you-need-it` | Q17, D8: served first for saving with `within-1y` |
| `LONG_HORIZON_QUESTION_ID` | `short-term-fall` | D8: never served with `within-1y` |
| `CHIP_GUESSING` / `_FAIRLY_SURE` / `_SURE` | 0.25 / 0.6 / 0.9 | confidence aggregate |

- **Mastery**: the mean of the area's answer scores; no answers → null.
- **Confidence**: per area, the mean of the chip values, "Not sure" counted as Guessing; no answers → null. The backend stores it; the front uses the same values live on the dock.
- **Area order**: areas from the user's goals first (F1 goals → areas map), then the rest in `saving, debt, investing, risk, retirement` order, keeping only areas with bank questions; `horizon` `within-1y` moves `saving` before `investing`.
- **Next** (v5 replaces this with the lesson-level rule in the v5 block): (1) after a wrong or "Not sure" answer, an unasked `easy` question from the same area; (2) otherwise the first area in order with no answer; (3) otherwise the areas by mastery ascending (ties: area order), the first with an unasked question; none → done. Within an area: `easy` before `hard`, then `id`; with `within-1y`, `fall-before-you-need-it` first for saving and `short-term-fall` excluded, as in step outcome 5. No unasked question in the chosen area → the next rule down.
- **Done**: answered ≥ `RULE_MAX_QUESTIONS`, or answered ≥ `MIN_QUESTIONS` and every area has an answer, or no unasked question left.
- **Gaps (Q14)**, per area, from the chips ("Not sure" carries no chip and is ignored). Preconditions: `over` needs ≥ 1 wrong answer with `sure`; `under` needs ≥ 1 correct answer with a chip other than `sure` and no wrong `sure`. Rule: `over` when its precondition holds; else `under` when its precondition holds and mastery ≥ `JUST_STARTING_BELOW`; else none. Jev labels pass only when their precondition holds, else `aligned`; Jev's `under` also needs mastery ≥ `JUST_STARTING_BELOW` (0.4), like the rule's; `aligned` = none. At most `MAX_GAP_CARDS`: `under` before `over`, then area order. The quoted chip: `under` the lowest chip in the area, `over` the highest. `because` is built after `startLesson`, since the `over` template depends on it.
- **First lesson (Q15)**: candidates = lessons with bank rows in non-Solid areas (no answer counts as non-Solid), minus lessons the user completed before the test. A lesson's area is the area of its lowest-id bank question; lessons without bank rows are skipped. Jev and the rule pick from candidates in answered areas when any exist, else from unanswered ones. One candidate → it, without a Jev question. Rule: the weakest area (lowest mastery, ties: area order); in it, the answered question with the lowest score (ties: earlier in the history) gives the lesson; an unanswered area gives its lowest `lessonId`. No candidates → the uncompleted lesson with bank rows and the highest `position`; `readyForNext: true` only when every area is Solid; none left → `startLesson: null`. Without the Quick check the area order is F1's `focusAreas` first, then the other bank areas in area order, so the map's why line reads "{Area} is not checked yet".
- **pathLessonIds**: `startLesson` first, then the other candidates: answered areas by mastery ascending, then unanswered areas, then lesson id; with `readyForNext` just `[startLesson.lessonId]`; `[]` when `startLesson` is null.
- **F1 fallback inputs**: without bank data, `savingsCover` stands in for `cashBufferMonths` in F1's focus rule. F1's facts gap table applies only when the Quick check did not run.

### Mastery levels (Q16, D7)
| mastery | label | dock short label |
|---|---|---|
| null | Not checked yet | Not yet |
| < 0.4 | Just starting | Starting |
| 0.4 – 0.75, or > 0.75 with fewer than `SOLID_MIN_ANSWERS` answers | Building | Building |
| > 0.75 with ≥ `SOLID_MIN_ANSWERS` answers | Solid | Solid |

Never a percentage or number on screen.

### Horizon (Q17, D8)
v5: only the area order is left; the question swap below went with the bank.
`within-1y` changes the area order, the saving pick and drops `short-term-fall` (step outcome 5, both paths), and Jev sees it in `state.profile`. Other values change nothing in the rule.

### "Start here" (Q18)
`startHere` = the first id in `pathLessonIds` that still exists in `lesson` and has no `lesson_completion` row for the user, else null; title and area are read on GET. The map shows it on that lesson's card; after a completion the next GET moves it on; when all are done it disappears.

### Front flow and errors
- The first step (`history: []`) fails → Quick check skipped: the F1 path, final POST without `profile`/`history`.
- A later step fails → one retry with `stepFellBack: true`; a second failure ends the test and sends the final POST with the history so far.
- The final POST fails → F1's "Your path stopped halfway" with Retry and "Skip for now".
- While a step is in flight, tiles and chips are disabled. Each step has its own `AbortController` (client timeout 5 s), aborted on Back and unmount; a response is applied only when the history it was sent with still has the current length.
- Back (D3): returns to the "What we know" card; "Start the quick check" restarts with an empty knowledge history and the kept profile answers. Turning account access on drops `savingsCover`; turning it off asks it.
- "Quick check ran" = `profile != null` in the stored row.

### Screens (look: mockup C; `finance-quest-ui` skill; tokens from `front/src/constants/theme.ts`)
- **Consent card** (F1 + Q20): the facts preview as in F1, then the notice. The v1 sentence about typed answers is removed.
- **"What we know about you"**: rows for life stage ("You told us" / "Life stage not shared · You skipped this · We will ask one question."), goals ("You told us" / "Goals not shared · You skipped this"), and with consent the F1 fact lines tagged "From your accounts", without consent "Account access is off · You chose this · We will ask about your savings."; footer "Ranges only, never exact amounts. Your questions use the exact numbers on this phone." and "Your choices are checked by an AI service." (D5); buttons "Start the quick check" and "Change account access" (back to the consent card); link "Use simple check instead" (starts the test with `useRules: true`).
- **Question**: header "Question {n} of up to {MAX_QUESTIONS + profile questions}" with "Not a test you can fail" (knowledge) or "Not scored" (profile); the prompt; "Why this question: …"; tiles as a radio group. Knowledge tile tap → the chips "How sure are you?" Guessing / Fairly sure / Sure appear inside that tile; a chip tap commits. A "Not sure" tile commits at once. A profile tile commits on tap and has no chips and no dock. Under account questions the slip "Only your answer is sent, never these numbers."; under generic ones "Example numbers"; under profile ones "A fact about you, not a test.". No right/wrong feedback.
- **Between questions**: a status line "Choosing your next question" while the step runs; on `done` "All set · That is enough to place you".
- **Dock**: "Your map so far", one column per bank area with the filled bar (mastery) and the hollow diamond (confidence); a tap opens the sheet "Your map in detail" (levels, legend "How sure you felt" / "What your answers show"; Close, Escape and the scrim close it). Each column has a screen-reader text "{Area}: {level}". Reduced motion: the diamond (350 ms), bar (700 ms) and sheet (320 ms) appear in place.
- **Summary** (`/learning-path`; since 22.11 without the area map and the gap notes; `gaps` stays in the response): "You're {a beginner / an intermediate / an advanced} learner" + "Based on {answerCount} answers and how sure you felt about each." → "Your first lesson · {Area}" with the title (and "You're ready for the next lesson" when `readyForNext`), hidden when `startLesson` is null → "This picks lessons for you. It is not investment advice." (D6) → "Start learning" (opens `startLesson`, else the map) and a quiet "See all lessons". The D2 line when `source == "fallback"` and `sharedWithModel != null`.
- **Map** (`(learn)/map.tsx`): on the `startHere` lesson card a "Start here" badge and a "Why here" line; reloaded on focus; 404 or error → the list as today.
- Area display names: Saving, Borrowing (`debt`), Investing, Risk, Retirement.

### Copy, verbatim (Q19, Q20 and the cards)
- Why this question (Q19): knowledge, first question in the area: "Picked to learn more about {Area}"; area already asked: "Picked to look at {Area} from another angle". Profile: age band "So examples fit your stage of life"; savings cover "So examples fit your savings"; time frame "So examples match your time frame".
- Why here (map): one line, "Based on your onboarding answers" (Jan, 21.11).
- Consent notice (Q20, GDPR art. 13(1)(e); Jan, 22.11): "Your answers, the topics you pick and ranges from your accounts are checked by an external AI provider to pick your first lesson. Exact account numbers never leave this phone. We keep the result, your topics and the ranges. Your choices are checked by an AI service."
- Profile questions (Q10 order): "Which age band are you in?" 18–25 / 26–40 / 41–59 / 60+; "How many months of spending could your savings cover?" Less than 1 month / 1–3 months / 3–6 months / 6 months or more; "When might you need the money you save or invest?" Within a year / 1–5 years / 5+ years / Not sure.
- Gap cards: under, title "You know more than you think", because "On {Area} you said “{chip}”, yet your answers show you already understand how it works."; over, title "There is more to explore here", because with `startLesson` in this area "On {Area} you said “{chip}”. Your answers leave a few things open, which is where your first lesson starts.", otherwise "On {Area} you said “{chip}”. Your answers leave a few things open to explore."; aligned, title "How sure you felt matches your answers", text "On the areas we checked, your confidence and your answers line up." The backend builds `because`; the front adds the titles.
- D2 line: "We used a simpler check this time".

### Bank rules (for the content task and Danylo)
Removed in v5: there is no bank and no `check_question` table; the questions are the lessons' quiz steps.
- Columns of `check_question`: `id` (slug `^[a-z0-9-]+$`), `lesson_id` (NOT NULL, FK `lesson(id)` `ON DELETE CASCADE`), `area`, `level` (`easy` | `hard`), `account_prompt` (nullable), `slots`, `generic_prompt`, `options` (3–4), `correct_index` (0-based), `misconceptions` (same length as `options`, NULL at `correct_index`, text elsewhere), `checks` (one sentence).
- DB `CHECK`s hold the lengths, ranges and sets. Postgres arrays are 1-based: `cardinality(options) BETWEEN 3 AND 4`, `cardinality(misconceptions) = cardinality(options)`, `correct_index BETWEEN 0 AND cardinality(options) - 1`, `misconceptions[correct_index + 1] IS NULL`, and exactly one NULL in `misconceptions` (`cardinality(array_positions(misconceptions, NULL)) = 1`), no NULL or empty option, `account_prompt` NULL exactly when `slots` is empty, and no `{` in `generic_prompt`.
- Starter bank, 9 rows from V2's lessons (1 Emergency fund and 3 Inflation → `saving`; 2 Compound interest → `investing`): each area at least 2 `easy` and 1 `hard`, so a 6-question test never runs out. `short-term-fall` (investing, easy, lesson 2, D8) asks what a fall next month means for money left to compound for 20 years; `fall-before-you-need-it` (saving, easy, lesson 1, D8) asks what it means for money needed within a year. Same concept and level as the lesson, other numbers or scenario, no lesson question copied.
- Every prompt asks about understanding and recommends nothing: no named product, no "should", no buy / invest / switch as advice (MiFID II).

## Tasks
Simplest working solution, no code or tests for later. Each task loads `ponytail:ponytail` and runs `ponytail:ponytail-review` on its diff; backend rules from `CLAUDE.local.md` "Backend: konwencje" (layer subpackages under `categorization`, one type per file, Lombok, MapStruct, JPQL projections, named constants, Bean Validation on DTOs, JUnit assertions, TDD, each test creates its own data). Before running the real backend, reset the local compose DB (`docker compose down -v`): V16 is rewritten in place. Testcontainers tests are unaffected.

- [ ] **Q-C bank content** (sonnet), first. Write the new `V16__check_questions.sql` (schema per "Bank rules" and the 8 real rows, reading `git show origin/main:back/src/main/resources/db/migration/V2__lessons.sql`) to the path the coordinator gives, **without committing it**: the v1 `CheckQuestion` entity no longer matches, so V16 lands in Q-B's contract commit together with the entity and no commit is red. No placeholder rows. Done when V1–V15 from the branch plus the new V16 apply in order on a throwaway Postgres 17 (`psql -v ON_ERROR_STOP=1`), every account prompt's `{slot}` is in `slots` and in the known set, and the bank rules and MiFID wording hold. Q-C closes when the Q-B implementer's review of the rows (Q-B's first step) is in "Review triage", each finding `fix`ed in V16 or `reject`ed with a reason.
- [ ] **Q-B backend contract** (opus, `java-springboot`), after Q-C. First review Q-C's rows into "Review triage" and copy the reviewed file over `back/src/main/resources/db/migration/V16__check_questions.sql`. Then: the entity for the new V16; `GET /api/check-questions` in the new shape (no key check); `POST /api/users/{userId}/quick-check/step` (new `QuickCheckController`, `QuickCheckService`); the step Jev client with 3 s and `STEP_BUDGET`; the final call additions; the stored fields and `startHere` (own query on `lesson_completion`); remove the v1 text path (`CheckAnswerDto`, `JevCheckDto`, `CheckDto`, `checks`, the boundary code, `AnswerRedactionTests`). Files: `back/src/main/java/com/collabothon/back/categorization/**`, `back/src/test/java/com/collabothon/back/categorization/**`. Commit the contract (V16, entity, DTOs) on its own first, green. Each test clears `check_question` and inserts its own rows, asserting on those ids. Done when `./mvnw clean test` is green and covers: GET without `correctIndex`, `misconceptions`, `checks`; each 400 case above; a V16-violating row (misconception at `correct_index`) rejected; step with Jev (`MockRestServiceServer`) returning `next`; a 3 s timeout and a `next` outside the list → rule, `stepFellBack: true`, `useRules: false`; a later step sent with `stepFellBack: true` → no Jev request; a response after `STEP_BUDGET` → rule `next`, Jev mastery; `useRules: true` → no Jev request; fewer than 2 unasked ids → no `next` question; `within-1y` → `fall-before-you-need-it` and never `short-term-fall` on both paths; each rule row (scores, next incl. rule (3), done, gaps incl. the `under` mastery guard, first lesson incl. completed-before and unanswered ranking, all Solid, Solid with one answer = Building); a Jev gap label without its precondition → `aligned`; both Jev request bodies match their blocks per key; the stored row has `confidence` and `answerCount` and no per-answer history; `lifeStage` from `ageBand`; `startHere` moves after a `lesson_completion` row and skips a deleted lesson; the slot test over the seeded rows.
- [ ] **Q-F front** (sonnet, `expo` skills, `frontend-react-best-practices`, `finance-quest-ui`), after Q-B's contract commit. Types in `front/src/types/quickCheck.ts` and `categorization.ts`; `front/src/lib/quickCheck.ts` (fetch, slot filling; the draw and the seed go); `front/src/hooks/useQuickCheck.ts` (profile questions, step calls and errors per "Front flow and errors", `stepCallsMade`); `ConsentCard` (Q20), a new "What we know" card, `QuickCheckPage` (tiles, chips, Not sure, why line, slip), the dock and sheet, `PathSummary`, `categorizing.tsx`, `learning-path.tsx`; remove the text input, the 280 limit and `EXPO_PUBLIC_QUIZ_SEED` (also from `front/.env.example`). Every clickable element has a `testID`. Done when `npx expo lint`, `npx tsc --noEmit` and `npm run check` pass and Playwright (`page.route` stubs for GET, step and POST) covers: consent → What we know → profile tiles → knowledge questions with chips → summary → lesson; the no-consent path (savings-cover tile, generic prompts); life stage skipped (age-band tile); "Use simple check instead"; a first-step failure (F1 path); a later step failure continuing on rules; `done` before `MAX_QUESTIONS`; Back and hardware Back restarting from the card with profile kept; the D2 line; the aligned card; `/learning-path` reload rebuilding the summary and dock; reduced motion; the dock's screen-reader text.
- [ ] **Q-F map** (same worker, last). `front/src/app/(main)/(learn)/map.tsx`: GET categorisation, the "Start here" badge (`testID="start-here"`) and the three "Why here" lines on the `startHere` lesson, reload on focus; nothing else on the screen changes. Done when Playwright shows the badge on the stubbed `startHere` lesson, no badge on 404, and the badge on the next lesson after a stubbed completion.
- [ ] **Smoke** (coordinator, `playwright-cli`): the whole flow on the real backend without a key, then with the key, each step's time recorded. Done when both runs reach the map with "Start here", the report starts from the no-key run and gives the keyed step p50 against D9.
- [ ] **Announcements** (coordinator). Done when `.planning/decisions.md` has V15/V16, the step endpoint and `startHere`, and Jan's announcements are listed for him: Danylo (bank format, missing lessons in debt/risk/retirement), the map's author (`map.tsx` change), the team (step endpoint, V16).

## Never
- Free text to Jev; Jev sees only bank content, choices, chips, goals and ranges.
- Exact amounts to Jev, in the stored row or on the "What we know" card.
- User-facing text written by the model: Jev returns labels and probabilities, every sentence comes from our templates.
- The model's name anywhere in the UI.
- Product advice or buy / invest / switch wording in questions, options or copy (MiFID II).
- A seed or any other way to fix the question order.
- A language-level output or language variants from the Quick check.
- An explicit right/wrong verdict per question (the dock may move), right/wrong words in any copy, a percentage or a score shown as a grade.
- A claim that the answer key is secret: `GET` leaves it out, but the step endpoint's rule mastery tells any caller right from wrong (no auth, D10). A known limit, not a security property.

## Review triage
v1 "To confirm" and both v1 triage rounds: `.planning/reviews/F1b-v1-triage.md` (coordinator's checkout). v2 spec review: `.planning/reviews/F1b-v2-spec-adversarial-review.md` (D1–D10 and fixes 1–13 applied above).

| # | finding | file:line | class | reason or commit |
|---|---|---|---|---|
| 1 | Q-C rows: `inflation-real-value` account version fixes inflation at "about 3%", so for a user whose own rate is 3% or more the keyed answer ("prices rise faster than the interest") is false | `back/src/main/resources/db/migration/V16__check_questions.sql` (`inflation-real-value`) | fix | Account prompt now says prices rise one percentage point more than the user's rate, so the keyed option holds for any rate; the generic version keeps 2% vs 3%. The Contract example above shows the old wording; it is only an example. |
| 2 | Q-C rows: `short-term-fall` states "you will not need the money for 20 years" as a fact about the user, yet D8 serves it first to users who picked `within-1y` | V16 (`short-term-fall`) | fix | Both versions are hypothetical now ("Imagine … you would not need the money for 20 years"). |
| 3 | Q-C rows: the keyed option was the longest in 6 of 8 rows, a test-wise cue that inflates correct answers and so the measured confidence gap | V16 (`emergency-cushion-purpose`, `compound-extra-year`, `time-in-market`, `short-term-fall`, `compound-rate-vs-time`) | fix | Distractors lengthened or the keyed option shortened; misconceptions unchanged. |
| 4 | Q-C rows: `correct_index` was 1 in 5 of 8 rows (options are not shuffled) | V16 (`compound-extra-year`, `short-term-fall`) | fix | Keyed option moved to index 0 and 2; spread is now 0×2, 1×3, 2×3, misconceptions realigned so the NULL sits at `correct_index`. |
| 5 | Q-C added `CHECK (slots <@ ARRAY[…ten slots…])`, not in "Bank rules" | V16 `check_question.slots` | reject | Kept: "DB CHECKs hold the lengths, ranges and sets" covers it, the front fills exactly these ten slots, and a new slot needs a front change and a migration anyway. Whether every `{slot}` in a prompt is declared stays with the backend slot test. |

### Q-B diff review, round 1 (21.11; reports: adversarial A, edge-case E, verification-gap V, conformance C)
| # | finding | where | class | reason / action |
|---|---|---|---|---|
| A1 | one step fallback sets `useRules`, so the final Jev call is skipped and the D2 line shows (contradicts Q12) | QuickCheckService:54, CategorizationService:112 | fix | split: `useRules` = opt-out (D5) or no key; step fallback only switches later steps (`stepFellBack`); final call runs unless `useRules` |
| A2/E1 | final `mastery` older than the history's last answer leaves answered areas null | CategorizationService:97-100 | fix | fill answered areas with null/missing mastery from the rule; store every bank area |
| A3 | step endpoint is an answer-key oracle (rule mastery reveals right/wrong) | QuickCheckService:43-44 | reject | known limit with no auth (D10); recorded under Never; GET hiding the key is not a security claim |
| A4 | the live dock tells right/wrong after each answer, against "Never: verdict per question" | StepResponseDto.mastery, dock | fix | Jan: the live dock stays, backend unchanged; header copy "Not a test you can fail", no right/wrong words in copy, Never reworded to "an explicit right/wrong verdict per question (the dock may move)" |
| A5/C3 | `readyForNext` true when non-Solid areas' lessons were all completed | QuickCheckRules:246-250 | fix | `readyForNext` = every area Solid |
| A6/E3/V15 | answered area without a `mastery_<area>` prompt gets null on the Jev path | JevClient:147-151 | fix | fall back to the rule mean for that area; test that every bank area has a step prompt or falls back |
| A7/C1/V14 | final call uses `state.checkAnswers`, spec says `state.answers` | JevClient:246 | fix | spec updated: `checkAnswers`, because F1's `answers` holds onboarding |
| A8 | `stepCallsMade` trusted from the client; restart can exceed 6 → stuck 400 | CategorizationService:125-128 | fix | count on send, keep across D3 restarts, clamp instead of 400 |
| A9 | opted-out user whose first step fails falls to F1 and the F1 Jev call runs | CategorizationService:112, front flow | fix | skip path sends `useRules: true` after opt-out; backend honours `useRules` without profile (test) |
| A10/E5 | 5-minute reuse ignores `profile` and `useRules` | CategorizationService:86-92 | fix | no reuse when `profile != null` or `useRules` |
| A11 | `profile` with empty history counts as ran ("Based on 0 answers") | CategorizationService:94 | fix | ran = profile and non-empty history; otherwise the skip path |
| A12/C2 | 3 s limit is a Future timeout; executor never closed; spec says second client | JevClient:118-176 | fix | `@PreDestroy` close; spec records the Future-timeout choice and that the HTTP read may run to 7 s |
| A13 | D10 says history caps calls, false for a stateless endpoint | spec D10 | fix | D10 reworded: no cap on Jev calls; acceptable only without a public deployment |
| A14 | `short-term-fall` keyed answer ("one month of 20 years, keeps compounding") is the wrong lesson for within-1y users | V16, D8 | fix | Jan: separate short-horizon question `fall-before-you-need-it` (saving, easy, lesson 1), served first for saving with `within-1y` on both paths; `short-term-fall` never served to within-1y users, kept for longer horizons (D8, constants, V16) |
| A15 | no CHECKs for NULL/empty options, prompt/slots pairing, `{slot}` in generic prompt | V16 | fix | add the three CHECKs |
| A16 | over-budget step ends the test by the rule's 4, ignoring Jev's `enough` | QuickCheckService:59-60 | fix | `done` from Jev's `enough` when it is in hand |
| A17 | mastery jumps from Jev to rule values after a fallback | QuickCheckService:43-54 | fix | spec states it: after a fallback the rule recomputes all answers |
| A18 | final POST validates history without profile; bank change makes Retry loop on 400 | CheckQuestionService:41-47 | fix | no validation when profile is null; front: 400 on final POST → F1 path |
| A19 | Jackson coerces `1.7` to 1 and `"true"` to true | DTOs | reject | default Jackson coercion, no user impact; not worth a mapper change |
| A20/E6 | skip path: `startLesson` from goal order, not the judged focus order | CategorizationService:96-120 | fix | without the Quick check, order by `focusAreas`; why line "{Area} is not checked yet" |
| E2 | `sharedWithModel` lists onboarding answers when only steps reached Jev | CategorizationService:125-128 | fix | onboarding answers only when the final call was sent |
| E4 | history without profile is checked then dropped | CategorizationService:94-95 | fix | covered by A18 |
| E7 | `first_lesson` gate counts answered-area candidates only | CategorizationService:106-109 | reject | follows Reference "answered areas first" |
| C4 | stored row has `"startHere": null` | CategorizationService:141 | fix | key absent from the stored JSON |
| C5/V3 | no step test without a key | CategorizationWithoutKeyTests | fix | keyless step: `useRules: true`, rule next, `ExpectedCount.never()` |
| C6 | two tests read seeded lessons/bank | CategorizationControllerTests:128-167, CategorizationWithoutKeyTests:52 | fix | tests insert their own rows |
| C7 | Hamcrest `contains` | QuickCheckCategorizationTests:297 | fix | JUnit assertion |
| C8 | literal dates in tests | QuickCheckCategorizationTests:301,314,346 | fix | from the `Clock` |
| C9 | `if` validation against the bank | CategorizationService:82, CheckQuestionService:45,48 | reject | needs the DB; a domain check in the service, not input shape; Bean Validation covers the shape |
| C10 | literal `2` for "a Jev choice needs 2+ options" in three places | JevClient:152, CategorizationService:107, QuickCheckRules:253 | fix | named constant |
| C11 | `new BankLesson(…)` five fields by hand | QuickCheckRules:203 | fix | MapStruct mapper |
| C12 | ~35 Javadoc lines restating names | FocusArea:20, QuickCheckRules:198,243, LessonPlan:5, Answer:35, QuickCheckService:21, JevClient:133-136 | fix | remove; keep only non-obvious one-liners |
| C13 | import order | CategorizationControllerTests:46-49 | fix | group as elsewhere |
| C14 | V16 rewritten in place | V16 | reject | Jan's Q4; not on any remote branch; compose reset documented |
| V1 | >6 history 400 tests fail for another reason | StepRequestDto, CategorizationRequestDto | fix | 7 distinct valid ids in the test bank |
| V2 | `useRules` no-Jev test cannot fail (mock error swallowed) | QuickCheckStepTests | fix | `ExpectedCount.never()` |
| V4 | Jev `first_lesson` pick never distinguished from the rule's | QuickCheckCategorizationTests:176 | fix | Jev picks a lesson the rule would not |
| V5 | one candidate → no `first_lesson` question untested | CategorizationService | fix | test |
| V6 | no final POST with consent and history | QuickCheckCategorizationTests | fix | test facts reach Jev and gaps are chip-only |
| V7 | `savingsCover`/`ageBand` into fallback focus untested end to end | CategorizationService | fix | two `useRules` tests |
| V8 | `readyForNext: true` and null `startHere` never observed via endpoints | CategorizationService | fix | tests |
| V9 | seeded bank not checked for `short-term-fall` | V16 | fix | seeded-bank test |
| V10 | Jev-path null mastery key not asserted | QuickCheckStepTests | fix | STRICT with `investing: null` |
| V11 | final POST with a null mastery value never sent | CategorizationRequestDto | fix | test 200 and read-back |
| V12 | timing assertion with 300 ms margin | QuickCheckStepTests:3622 | fix | drop the elapsed assertion |
| V13 | only one of the V16 CHECKs tested | CheckQuestionControllerTests | fix | parameterised violations |

### Q-B diff review, round 2 (21.11, last round; Jan: fix only high/critical)
| # | finding | where | severity | class | reason / action |
|---|---|---|---|---|---|
| R2-1 | a profile-less POST within 5 min reuses an earlier Quick-check row ("Based on N answers" for a skipped run) | CategorizationService:84-98 | high | fix | reuse only rows without profile and with answerCount 0 |
| R2-2 | disclosure under-reports: steps send goals but `answers` null; F1 resend drops `stepCallsMade`; clamp to 6 and negative→0 misstate the count | CategorizationService:138-142, CategorizationRequestDto:33-34 | high (GDPR art. 13) | fix | `sharedWithModel` built when `stepCallsMade > 0` or the final call was sent, independent of ran, with the goals; `@PositiveOrZero`, no upper clamp; front keeps `stepCallsMade` on the F1 resend |
| R2-3 | spec text stale after A1/A14/A18 (Reference "Next", Q-B done, "not validated") | spec :267, :326, Data | high (contract the front builds on) | fix | reword to the code's behaviour |
| R2-4 | a restart carries `stepFellBack: true` into the new test | front, D3 | medium | defer | front resets it on restart (sent to Q-F as a note) |
| R2-5 | `fall-before-you-need-it` also served to long horizons | QuickCheckRules.forHorizon | medium | defer | prompt is hypothetical ("Imagine…"); revisit with Danylo's bank |
| R2-6 | short-horizon question routes to Emergency fund | V16 | — | reject | Jan's A14 decision |
| R2-7 | garbled comments, import order, Javadoc on two constants, literal Jev URL in one test | CategorizationService:85,173, QuickCheckRulesTests:19, CategorizationConsts:54,57, CategorizationWithoutKeyTests:83 | low | defer | cosmetic |
| R2-8 | tests that would not catch a revert: A16, A10 profile half, A12 close(), V13 correct-index row | tests | medium | defer | behaviour verified by review; strengthen when touched |
| R2-9 | mastery sent for an unanswered area is stored; order from the filtered bank; RejectedExecution/close() wait at shutdown; whitespace-only options | various | low | defer | no demo-path impact |
| R2-10 | seeded-bank test reads seed data | CheckQuestionControllerTests:188 | low | reject | V9 asks for exactly this check |

### Q-F diff review (21.11, one round; Jan: fix only high/critical)
| # | finding | where | severity | class | reason / action |
|---|---|---|---|---|---|
| F-1 | after step calls, Back and a restart whose first step fails, the skip-path POST drops `stepCallsMade`; the stored disclosure says nothing reached the model | front categorizing.tsx:103, useQuickCheck.ts:137-139 | high (GDPR art. 13) | fix (ec51718) | send `stepCallsMade` on the skip path when calls > 0; Contract: kept on every final POST incl. the skip path |
| F-2 | e2e dock test: focus-before-Escape works by delay, not by the stated reason | e2e/quick-check.spec.ts:322-324 | low | fix (ec51718) | wait for the dialog role before Escape |
| F-3 | dock level reads "Starting", spec says "Just starting" | dock | low | defer | copy polish |
| F-4 | after a reload Solid needs `readyForNext`, and the aligned card counts "Not sure" (no per-area answer counts stored) | summary after reload | medium | defer | reload is off the demo path |
| F-5 | `_layout.tsx` guard `done \|\| !loaded`, shared `Sheet.tsx` reduced motion | layout, Sheet | — | reject | reviewed: no risk to other screens |

## v2.1 Adapt to main (21.11, Jan's decisions J1–J3)

### Why
PR #31 (`origin/main` d4b2a22) changed what F1b v2 was built on:
- `V5__lesson_progress.sql` drops the `lesson` and `question` tables. Lessons are JSON in `back/src/main/resources/content/` (`stories.json`, `lessons/<id>.json`, ids such as `berlin-1`). Completions live in `lesson_completion(user_id, lesson_id VARCHAR(64), …)`.
- Inside a story, lessons unlock one by one (`LessonController.summaries`: a lesson is `available` only when the previous one is done).
- The Map tab is the globe (`(main)/(learn)/map.tsx` with `StorySheet`, `StoryCard`, `story/[id].tsx`). The old lesson list is gone.
- `com.collabothon.back.lesson.LessonContent` and `LessonProgress` are package-private.

### Jan's decisions
- **J1** Adapt F1b to main: merge `origin/main` into `feat/quick-check` (merge, no rebase). Main's code wins on conflicts; F1b re-applies its changes on top.
- **J2** "Start here" is a **story**. Its start lesson is that story's next lesson that is not done, so it is always `available`. Lesson locking stays untouched.
- **J3** Role cap: when the Quick check ran and no area is at least Building (mastery ≥ 0.4 with ≥ 1 answer), the stored role is `NOVICE`, whatever Jev or the rule said; otherwise the role stays as Jev or the rule chose it. (changed 21.11: novice, Jan)
- **J4** `area` names the area that picked the story; all Solid → first story in stories.json, area null.

### Contract changes (supersede the v2 text above where they differ)
1. **V18 bank** (was V16; main's glossary took V15/V16): `lesson_id VARCHAR(64) NOT NULL`, no foreign key (the `lesson` table is gone). Rewrite V18 in place (Q4 still holds: neither V17 nor V18 is on any remote branch). Remap:
   - `inflation-*` → `berlin-1`
   - `compound-*` → `berlin-2`
   - `emergency-*`, `fall-before-you-need-it` → `berlin-3` (Jan's A14 put it on the emergency-fund lesson; `berlin-3` covers emergency fund and time horizon)
   - `short-term-fall`, `time-in-market` → `berlin-4` (volatility, drawdown, time horizon)
   
   The questions' wording stays. A backend test checks that every bank `lesson_id` exists in the lesson content.
2. **Lesson lookup:** categorization reads lessons through `com.collabothon.back.lesson`. Make the smallest read-only surface public there: `LessonContent` (`stories()`, `lessonIdsOf(story)`, `lesson(id)`) and `LessonProgress.completed(userId)`. Do not copy the JSON loading, and do not query `lesson_completion` separately. This touches another topic's package, so tell its author (Announcements).
3. **Candidates and path:** a candidate story is the story of a bank question's lesson in a non-Solid area. The story's start lesson is its first lesson in story order that is not completed; a story with all lessons done is not a candidate. `first_lesson` in the Jev final block becomes a choice among candidate **stories** (`story_<id>` labels, criterion = the story's `topic`). It is asked only with 2+ candidates; today the bank is all Berlin, so it is not asked. The rule picks the story of the weakest question in the weakest area. All Solid (`readyForNext`): the first story in `stories.json` order with a lesson not done.
4. **Stored row:** `pathLessonIds` becomes a list of story ids in path order. Rename it to `pathStoryIds` in the entity, the DTO and the front types; the V17 column changes in place, same rule as V18.
5. **Response `startLesson`:** `{ lessonId: string, title, area, storyId, storyCity }`, where `title` is the lesson's and `storyCity` is `stories.json` `city`. `startHere` on read is the same shape (plus the existing reason fields), recomputed from `pathStoryIds` and the current completions. It is null when every path story is done.
6. **Role cap (J3)** goes in the service after the role is chosen (Jev or rule), with a test for each side of the Building threshold.

### Front
- Summary "Your first lesson" card: overline `YOUR FIRST STOP · {AREA}`, title = lesson title, line `{storyCity} · stop {n} of {total}`. `summary-start` opens `/lesson/[id]` with that lesson id. `summary-all` goes to the Map tab (globe).
- "Start here": the `StoryCard` of the `startHere` story in `StorySheet` shows the "Start here" badge and the existing "Why here" line (`story-card-start-here`, `story-card-why-here`). No change to the 3D globe pin (skipped: the sheet already shows it; add it when the pin is reworked).
- Drop F1b's changes to the old list `map.tsx`; main's globe `map.tsx` gets only the `startHere` fetch on focus and passes it to `StorySheet`.
- `Sheet.tsx`: keep main's version plus F1b's reduced-motion change.
- Lesson ids are strings everywhere in F1b types.
- e2e: rewrite `start-here.spec.ts` for the story card; the quick-check specs use string lesson ids. Merge `e2e/smoke.spec.ts` so both sides' cases stay.

### Done when
- `feat/quick-check` contains `origin/main`, and `./mvnw -B clean test`, `npm run check`, `npx tsc --noEmit`, `npx expo lint` and the Playwright suite pass.
- Smoke without a key and with the key: the quiz runs, the summary names a Berlin stop that is `available`, and the globe's story sheet shows "Start here" on Berlin.
- Role cap test: no area at least Building plus Jev `advanced` or `intermediate` → stored `NOVICE`; one area at Building keeps Jev's role.

### Announcements (Jan)
- Lessons author (PR #31): `LessonContent` and `LessonProgress.completed` are now public, read-only, for F1b. `StorySheet`/`StoryCard` get an optional `startHere` prop.
- Danylo: bank questions point to JSON lesson ids. Debt (São Paulo) and risk (Seoul, Tokyo) now have lessons, so the bank can grow there.

### v2.1 diff review (21.11, one round, high/critical only)
| # | finding | where | severity | class | reason / action |
|---|---|---|---|---|---|
| V21-1 | origin/main 0a58d13 (PR #29) added V15/V16 glossary migrations; ours collide, backend would not start after merge | db/migration | critical | fix (b0ba5a8, 1a1f6e8) | merged main, renumbered to V17/V18, decisions.md updated |
| V21-2 | story sheet highlighted Seoul (main's `current`) while Start here sat on Berlin | front map.tsx | high | fix (b132549) | the startHere story is the only `current` when present |
| V21-3 | stale `.expo/types/router.d.ts` makes `tsc` fail on `/glossary/[slug]` until Expo runs once | front, local | — | reject | generated, gitignored file; ENV |
