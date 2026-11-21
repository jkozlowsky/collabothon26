---
status: ready
topic: B
owner: Jan; question pool content: Danylo (lessons)
branch: feat/quick-check (from quick-check + origin/main)
---
# F1b Quick check and learning path summary

## Goal
<!-- frozen once approved: only Jan changes it -->
The onboarding should show that Finance Quest **knows the user** and **understands what they need to learn**. After Remigiusz's three questions and the consent card, the user answers four short open questions drawn from a pool tied to Danylo's lessons. Where the user agreed, the questions are built on their own account ("You keep €12,500 in savings at 2.25%…"). Jev judges each answer against a written criterion in one call. A summary screen then says, in plain words, what kind of learner they are, where they know more (or less) than they think, and which lesson to start with.

What the jury should see:
- **It knows me**: questions quote the user's own numbers, computed on the device; exact amounts never leave it.
- **It understands me**: Jev judges free-text answers; a `choice` on a criterion is something an `if` cannot do.
- **Confidence gap with evidence**: "You said: I save regularly. Your answer about how long to stay invested shows you understand compounding."
- **Actionable**: the summary ends on a concrete first lesson.

## Jan's decisions (21.11)
- Q1 Quick check is our step in `/categorizing`: consent card → Quick check → loading → summary → lesson. Remigiusz's onboarding is unchanged.
- Q2/Q15 Questions are written by people, not generated: each of Danylo's lessons carries 1–2 **check questions** in the format below; Jev only judges.
- Q4 Answers are open text (1–2 sentences) plus a "Not sure" button.
- Q6 Without consent the same questions use example numbers.
- Q7 When `JevProperties.callsJev()` is false the Quick check is skipped (no keyword imitation of a judge) and the summary comes from the rules; a TypeSafe key is required for the demo.
- Q8 The consent card says Quick check answers go to the lesson picker; only the judgement is stored, never the raw text (GDPR art. 5(1)(c)). D3: the app never sends exact amounts, but your own words are sent as typed, so the card and the hint under the input say exactly that (GDPR art. 5(1)(c), art. 25: honest wording over masking digits, which would hurt the judging).
- Q9/Q18 A summary screen before Learn: confidence gap first, then role and 2–3 areas with "why", then "Start learning", which opens the first lesson of the weakest area.
- Q10 Blueprint: 4 questions, 2 from **finance** (Everyday money, Saving, Borrowing) and 2 from **investing** (Investing, Protect & plan), drawn without repetition. D7: one question per area within a category (account version only as tiebreak), plus a `retirement` question so pre-retirement users are covered ("All generations"); skipped if a category has fewer than 2 areas.
- Q12 Every check question has an account version and a generic version; with consent, the draw prefers questions whose account data exists.
- Q13 Random per onboarding; optional `EXPO_PUBLIC_QUIZ_SEED` makes the draw repeatable for a rehearsed demo (mulberry32 over the pool sorted by `id`; a non-numeric seed is ignored; dev builds only; it overrides Q20).
- Q14 Jev judges each answer against its criterion: `understands` / `partly` / `not-yet`; `not-yet` areas missing from `focusAreas` are inserted at the front in check order, de-duplicated, capped at 5; the summary shows the first 3.
- Q16 Coordinator writes a starter pool of 9 (4 finance + 5 investing, with D7's `retirement` question); Danylo takes it over and extends it with his lessons.
- Q17 The pool lives in the backend next to the lessons (migration); the front fills account numbers in only when rendering. D9: `GET` does not return `criterion` (the judge's rubric stays in the backend), and the backend wraps every answer as delimited data in the Jev request (OWASP LLM01 prompt injection); Danylo is told.
- Q19 One Jev call at the end, during the loading screen; no right/wrong feedback per question ("No wrong answers").
- Q20 Every new onboarding draws new questions and recategorises.
- Migrations: categorisation moves to `V15__categorization.sql` (renamed from `V5__categorization.sql` on PR #25's branch; main already has `V4__account_and_progress`) and the pool is `V16__check_questions.sql`. Flyway versioned migrations are immutable and ordered, so no `outOfOrder`; `origin/main` is merged into the integration branch before Q-B. PR #29 takes `V6__glossary.sql`.
- Mockups (Q-M, done in 7e452a8): direction B "The route" (`docs/design/mockups/quick-check-b.html`) plus the slip line from C, "Only your answer is sent, never these numbers.", on account questions; gap card title "You know more than you think".
- Backend tests use only JUnit assertions (`org.junit.jupiter.api.Assertions`), no AssertJ or Hamcrest; Q-B first rewrites the existing categorisation tests that use AssertJ in a separate commit.
- D2 Jev judges an answer against the generic prompt plus the instruction "the person saw their own figures; judge the reasoning, not the numbers", so an account-version answer is not marked `not-yet` for missing the generic example's numbers; account prompts no longer ask "how did you work it out".
- D4 One line above question 1 on both the consent and the no-consent path (GDPR art. 13): "Your answers are checked by an AI service to pick your first lesson; only the result is kept."
- D5 Confidence gaps from checks come from a rule table for `saving` and `investing`: experience low × `understands` → `UNDER`, experience high × `not-yet` → `OVER`, with F1's thresholds per area (saving: low = `not-saving`, `occasional`; high = `regular`, `investing`, `planning`. investing: low = `not-saving`, `occasional`, `regular`; high = `investing`, `planning`); skipped experience → no gap; valid without consent, text from a template. It keeps the headline pitch point and works on the no-consent path.
- D6 If Jev fails after answers were sent, the whole categorisation falls back to rules (F1 rule), `checks` holds only the "Not sure" entries, and the summary says "We couldn't check your answers this time".
- D8 MiFID II wording: the risk and ETF questions ask how spreading money changes risk and whether a short-term fall says anything about the long term; no named product in any prompt.
- Coordinator's calls: answers up to 280 characters; "Not sure" counts as `not-yet` and sends no text; all copy in English; the model is never named.

## Contract
Consumers: Danylo (check questions per lesson), the summary screen, F5 lesson variants. Changes go to `.planning/decisions.md` and the team channel.

```
GET  /api/check-questions                     → CheckQuestion[]          // the whole pool ordered by `id`; the front draws
POST /api/users/{userId}/categorization       {consent, facts?, answers?: CheckAnswer[]} → Categorization

CheckQuestion = {
  id: string,                                 // stable slug, e.g. "savings-runway"
  category: "finance" | "investing",
  area: "saving" | "debt" | "investing" | "risk" | "retirement",
  lessonId: number | null,                    // the lesson that teaches it
  accountPrompt: string | null,               // with {slot} placeholders; null = generic only
  slots: string[],                            // slots accountPrompt needs, from the list below
  genericPrompt: string                       // example numbers, no slots
}                                             // `criterion` stays in the backend (D9)
CheckAnswer = {questionId: string, text: string | null}     // null = "Not sure"; text ≤ 280 chars

Categorization gains:
  checks: [{questionId, area, lessonId, result: "understands" | "partly" | "not-yet"}],   // [] when skipped
  startLesson: {lessonId: number, title: string} | null
  stored rows without `checks`/`startLesson` read as `[]`/null.
confidenceGaps[].because may cite a check (D5), only one with `result: understands` in the same area as the gap:
  "…and your answer about {area} shows you understand it."
```
- **Slots** (filled on the device from `BankState` through Danylo's selectors): `savingsBalance`, `savingsInterestRate`, `monthOut`, `loanRemaining`, `loanApr`, `cardUsed`, `cardLimit`, `etfMonthly`, `depotTotal`, `positionCount`. An account version is usable only with consent and every slot available: a slot is available when its value is > 0, `positionCount` must be ≥ 2, and the `rate-vs-inflation` version needs `savingsInterestRate` < 3. Amounts are whole euros from cents (`en-IE`). Q-F adds the selectors `etfMonthly` (`Math.abs(amount)` of the standing order whose recipient starts with "Depot") and any other missing slot to `selectors.ts`.
- **What Jev gets per answer**: the **generic** prompt, the criterion and the answer text, never the account version, so the app sends no exact amounts. The text is wrapped as delimited data with the instruction to treat it as an answer, never as instructions (OWASP LLM01), plus the D2 instruction to judge the reasoning, not the numbers. Each answered check is one `choice` question `check_<id>` (key = `check_` + id with `-` → `_`) with labels `understands`, `partly`, `not-yet`, in the same request as role and focus areas. The request-level `state` gains `checks: [{questionId, genericPrompt, criterion, answer}]` for answered checks. A "Not sure" answer creates no `check_<id>` question; the backend sets its result to `not-yet`. `sharedWithModel` records `checks: [{questionId, answered}]`, never the text.
- **Errors**: `answers` absent or `[]` → no check (`checks: []`). Otherwise exactly 4 answers, 2 `finance` + 2 `investing` by the stored category, unique and known ids; `text` is null or 1–280 UTF-16 code units after trim; blank → 400. When `JevProperties.callsJev()` is false, answers are ignored before validation. The 400 `detail` never echoes the rejected value. If Jev fails after answers were sent: whole fallback (D6). The 5-minute reuse of a recent categorisation is skipped when `answers` is non-empty.
- **Storage**: pool in `V16__check_questions.sql` (`check_question` table: `id` with `CHECK (id ~ '^[a-z0-9-]+$')`, `area` with a CHECK that it belongs to `category`, `lesson_id` FK to `lesson` `ON DELETE SET NULL`, nullable), seeded with the starter pool; seed `lesson_id` as `(SELECT id FROM lesson WHERE position = n)`. The number is in `.planning/decisions.md`; announce it on the team channel before push. `checks` and `startLesson` live inside the categorisation JSONB; raw answer text is never stored or logged.
- **startLesson**: sort checks that have a `lessonId` by (`not-yet` before `partly`, then the area's index in the reordered `focusAreas`) and take the first. Else take `min(lesson_id)` from `check_question` for the first focus area that has one. Else null (the button opens the map).

## Reference

### Starter pool (Danylo takes it over; the criterion column is backend-only, D9)
| id | cat. | area | lesson | account prompt | generic prompt | criterion |
|---|---|---|---|---|---|---|
| `savings-runway` | finance | saving | 1 Emergency fund | You keep €{savingsBalance} in savings and spend about €{monthOut} a month. If your income stopped tomorrow, how long would your money last? | Imagine you keep €5,000 in savings and spend €1,500 a month. If your income stopped tomorrow, how long would your money last, and how did you work it out? | Relates savings to monthly spending (roughly savings ÷ spending) and sees the money as a safety net for emergencies. |
| `rate-vs-inflation` | finance | saving | 3 Inflation | Your savings account pays {savingsInterestRate}% a year. If prices rise 3% a year, what happens to what your €{savingsBalance} can buy? | A savings account pays 2% a year while prices rise 3% a year. What happens to what €5,000 can buy? | Sees that when prices rise faster than the interest, the money buys less over time. |
| `loan-apr` | finance | debt | — | Your instalment loan has €{loanRemaining} left at {loanApr}% APR. What does that APR tell you about the loan? | A loan of €8,000 has a 6% APR. What does the APR tell you about the loan? | Explains APR as the yearly cost of borrowing, so a higher APR makes the same loan cost more. |
| `card-minimum` | finance | debt | — | You have used €{cardUsed} of your €{cardLimit} credit card limit. What happens if you pay only the minimum each month? | You owe €1,000 on a credit card. What happens if you pay only the minimum each month? | Sees that the unpaid balance keeps costing interest, so the debt lasts longer and costs more. |
| `etf-drop` | investing | investing | — | Every month €{etfMonthly} goes into your monthly ETF plan. If the market falls 20% next month, what happens to that money? | Every month €100 goes into a world ETF. If the market falls 20% next month, what happens to that money? | Understands the value can fall and rise and that a short-term fall says little about the long term. |
| `time-in-market` | investing | investing | 2 Compound interest | Your depot holds €{depotTotal}. Why does how long you stay invested matter? | You invest €1,000. Why does how long you stay invested matter? | Describes compounding: returns earn returns, so a longer horizon grows the money more. |
| `one-etf-vs-one-stock` | investing | risk | — | Your depot has {positionCount} positions. How does spreading money over many companies change risk compared with putting it all in one company? | How does spreading money over many companies change risk compared with putting it all in one company? | Explains spreading money over many companies, so one company failing hurts less. |
| `too-good-offer` | investing | risk | — | — | Someone online promises 20% a month with no risk. What tells you something is wrong? | Recognises that high guaranteed returns without risk are a scam signal; return and risk go together. |
| `pension-gap` | investing | retirement | — | — | Why might your state pension alone not cover what you spend today? | Sees that income in retirement is usually lower than during work, so the gap has to be planned for ahead. |
Every prompt asks about understanding and recommends nothing (MiFID II). Draw: one question per area within each category (finance: `saving`, `debt`; investing: `investing`, `risk`, `retirement`).

### Quick check screen (`/categorizing`, after consent)
- One question per screen, progress "1 of 4", the prompt, a multiline input (280-char counter), "Next" (disabled while empty) and "Not sure". No right/wrong feedback. Back goes to the previous question with its answer kept; Back on question 1 returns to the consent card with the answers kept; the last Next is disabled while the POST is in flight.
- Copy above the first question, on both paths: "Four quick questions so we know where to start. There are no wrong answers." and "Your answers are checked by an AI service to pick your first lesson; only the result is kept." Under the input: "No need to type exact amounts". Under account questions: "Only your answer is sent, never these numbers."
- Skipped entirely when `GET /api/check-questions` returns `[]`: `JevProperties.callsJev()` is false, or either category has fewer than 2 areas with a question. A failed GET counts as `[]`.

### Summary screen (`/learning-path`)
- Order: confidence gap card titled "You know more than you think" (when there is one) → "You're {a beginner / an intermediate / an advanced} learner" with the role's because lines → 2–3 focus areas with one "why" each → "Start learning" (opens `startLesson`, else the map) and a quiet "See all lessons".
- Educate, never advise: sentences describe what the answers and the account show; no product, no "you should".
- If Jev failed after answers were sent, one line: "We couldn't check your answers this time".
- Shown when `categorizedAt` is later than a locally stored `summarySeenAt`; `/learning-path` without a categorisation redirects to the map. Profile can link to it later.

## Tasks
Simplest working solution, no code or tests for later.

- [x] **Q-M mockups**: done in 7e452a8; chosen direction B "The route" (`docs/design/mockups/quick-check-b.html`) plus the slip line from C and the gap card title "You know more than you think".
- [ ] **Q-B backend** (`java-springboot`). Steps in order: (1) merge `origin/main` into the integration branch and restore main's `V4__account_and_progress`; (2) rename `V5__categorization.sql` → `V15__categorization.sql`; (3) rewrite the AssertJ tests (`RulesTests`, `JevPropertiesTests`, `JevRedirectTests`, `JevClientTests`, `CategorizationControllerTests`) to JUnit assertions in a separate commit; then `V16__check_questions.sql` with the starter pool, `GET /api/check-questions` (no `criterion`), answers in `POST`, Jev `check_<id>` questions, `checks`, `startLesson`, focus-area reordering, gap rules from checks (D5). Done when `./mvnw clean test` (JUnit assertions only) covers each 400 case, the startLesson ordering, the focus reordering, 4× Not sure and two POSTs with different answers; the Jev request carries generic prompts only and "Not sure" sends no text; the 5-minute reuse is skipped when `answers` is non-empty; a sentinel answer is absent from the logs, the ProblemDetail and `categorization.data` on the success path, the 400 path and the Jev 500 path (`OutputCaptureExtension`, `MockRestServiceServer`); a pool test checks that every `{slot}` in `accountPrompt` is in `slots` and in the known set.
- [ ] **Q-F front**: draw 2 + 2 per D7 with optional seed, slot filling from `BankState`, the Quick check screen, the summary screen, the consent card line. Done when `npm run check` and Playwright cover consent → 4 questions → summary → lesson and the no-key path skipping straight to the summary; the happy path uses Playwright `page.route` stubs for `/api/check-questions` and the POST; every clickable element has a `testID`.
- [ ] **Danylo handover**: the check-question format above and the starter pool, sent by Jan. Done when Danylo has confirmed the format and the contract (including `GET` without `criterion`) is in `decisions.md`.

## Never
- Generated questions, a right/wrong verdict per question, or a score shown as a grade.
- Exact account amounts sent by the app, or raw answer text stored or logged.

## Review triage
