---
status: grilled
topic: B
owner: Jan; question pool content: Danylo (lessons)
branch: quick-check (from jev-categorization, PR #25)
---
# F1b Quick check and learning path summary

## Goal
<!-- frozen once approved: only Jan changes it -->
The onboarding should show that Finance Quest **knows the user** and **understands what they need to learn**. After Remigiusz's three questions and the consent card, the user answers four short open questions drawn from a pool tied to Danylo's lessons. Where the user agreed, the questions are built on their own account ("You keep €12,500 in savings at 2.25%…"). Jev judges each answer against a written criterion in one call. A summary screen then says, in plain words, what kind of learner they are, where they know more (or less) than they think, and which lesson to start with.

What the jury should see:
- **It knows me**: questions quote the user's own numbers, computed on the device; exact amounts never leave it.
- **It understands me**: Jev judges free-text answers; a `choice` on a criterion is something an `if` cannot do.
- **Confidence gap with evidence**: "You said you don't invest yet, and your answer about your ETF plan shows you understand the risk."
- **Actionable**: the summary ends on a concrete first lesson.

## Jan's decisions (21.11)
- Q1 Quick check is our step in `/categorizing`: consent card → Quick check → loading → summary → lesson. Remigiusz's onboarding is unchanged.
- Q2/Q15 Questions are written by people, not generated: each of Danylo's lessons carries 1–2 **check questions** in the format below; Jev only judges.
- Q4 Answers are open text (1–2 sentences) plus a "Not sure" button.
- Q6 Without consent the same questions use example numbers.
- Q7 Without a Jev key the Quick check is skipped (no keyword imitation of a judge) and the summary comes from the rules; a TypeSafe key is required for the demo.
- Q8 The consent card says Quick check answers go to the lesson picker; only the judgement is stored, never the raw text (GDPR art. 5(1)(c)).
- Q9/Q18 A summary screen before Learn: confidence gap first, then role and 2–3 areas with "why", then "Start learning", which opens the first lesson of the weakest area.
- Q10 Blueprint: 4 questions, 2 from **finance** (Everyday money, Saving, Borrowing) and 2 from **investing** (Investing, Protect & plan), drawn without repetition.
- Q12 Every check question has an account version and a generic version; with consent, the draw prefers questions whose account data exists.
- Q13 Random per onboarding; optional `EXPO_PUBLIC_QUIZ_SEED` makes the draw repeatable for a rehearsed demo.
- Q14 Jev judges each answer against its criterion: `understands` / `partly` / `not-yet`; areas with `not-yet` move to the front of the focus areas.
- Q16 Coordinator writes a starter pool of 8 (4 + 4); Danylo takes it over and extends it with his lessons.
- Q17 The pool lives in the backend next to the lessons (migration); the front fills account numbers in only when rendering.
- Q19 One Jev call at the end, during the loading screen; no right/wrong feedback per question ("No wrong answers").
- Q20 Every new onboarding draws new questions and recategorises.
- Coordinator's calls: answers up to 280 characters; "Not sure" counts as `not-yet` and sends no text; all copy in English; the model is never named.

## Contract
Consumers: Danylo (check questions per lesson), the summary screen, F5 lesson variants. Changes go to `.planning/decisions.md` and the team channel.

```
GET  /api/check-questions                     → CheckQuestion[]          // the whole pool; the front draws
POST /api/users/{userId}/categorization       {consent, facts?, answers?: CheckAnswer[]} → Categorization

CheckQuestion = {
  id: string,                                 // stable slug, e.g. "savings-runway"
  category: "finance" | "investing",
  area: "saving" | "debt" | "investing" | "risk" | "retirement",
  lessonId: number | null,                    // the lesson that teaches it
  accountPrompt: string | null,               // with {slot} placeholders; null = generic only
  slots: string[],                            // slots accountPrompt needs, from the list below
  genericPrompt: string,                      // example numbers, no slots
  criterion: string                           // what an answer must show to count as "understands"
}
CheckAnswer = {questionId: string, text: string | null}     // null = "Not sure"; text ≤ 280 chars

Categorization gains:
  checks: [{questionId, area, lessonId, result: "understands" | "partly" | "not-yet"}],   // [] when skipped
  startLesson: {lessonId: number, title: string} | null
confidenceGaps[].because may cite a check: "…and your answer about {topic} shows you understand it."
```
- **Slots** (filled on the device from `BankState` through Danylo's selectors): `savingsBalance`, `savingsRate`, `monthOut`, `loanRemaining`, `loanApr`, `cardUsed`, `cardLimit`, `etfMonthly`, `etfName`, `depotTotal`, `positionCount`. An account version is usable only with consent and every slot available.
- **What Jev gets per answer**: the **generic** prompt, the criterion and the answer text; never the account version, so exact amounts stay on the device. Each answer is one `choice` question `check_<id>` with labels `understands`, `partly`, `not-yet`, in the same request as role and focus areas; answers and their judgements also go into the role question's `state`.
- **Errors**: 400 for an unknown `questionId`, a duplicate, text over 280 chars, more than 4 answers, or a blueprint other than 2 + 2; answers without a Jev key are ignored (rules path).
- **Storage**: pool in `V6__check_questions.sql` (`check_question` table, `lesson_id` FK to `lesson`, nullable), seeded with the starter pool. `checks` and `startLesson` live inside the categorisation JSONB; raw answer text is never stored or logged.
- **startLesson**: the first `lessonId` among `not-yet`, then `partly` checks, in focus-area order; else the first lesson of the first focus area that has one; else null (the button opens the map).

## Reference

### Starter pool (for Jan's approval; Danylo takes it over)
| id | cat. | area | lesson | account prompt | generic prompt | criterion |
|---|---|---|---|---|---|---|
| `savings-runway` | finance | saving | 1 Emergency fund | You keep €{savingsBalance} in savings and spend about €{monthOut} a month. If your income stopped tomorrow, how long would your money last, and how did you work it out? | Imagine you keep €5,000 in savings and spend €1,500 a month. If your income stopped tomorrow, how long would your money last, and how did you work it out? | Relates savings to monthly spending (roughly savings ÷ spending) and sees the money as a safety net for emergencies. |
| `rate-vs-inflation` | finance | saving | 3 Inflation | Your savings account pays {savingsRate}% a year. If prices rise 3% a year, what happens to what your €{savingsBalance} can buy? | A savings account pays 2% a year while prices rise 3% a year. What happens to what €5,000 can buy? | Sees that when prices rise faster than the interest, the money buys less over time. |
| `loan-apr` | finance | debt | — | Your instalment loan has €{loanRemaining} left at {loanApr}% APR. What does that APR tell you about the loan? | A loan of €8,000 has a 6% APR. What does the APR tell you about the loan? | Explains APR as the yearly cost of borrowing, so a higher APR makes the same loan cost more. |
| `card-minimum` | finance | debt | — | You have used €{cardUsed} of your €{cardLimit} credit card limit. What happens if you pay only the minimum each month? | You owe €1,000 on a credit card. What happens if you pay only the minimum each month? | Sees that the unpaid balance keeps costing interest, so the debt lasts longer and costs more. |
| `etf-drop` | investing | investing | — | Every month €{etfMonthly} goes into {etfName}. If the market falls 20% next month, what happens to that money? | Every month €100 goes into a world ETF. If the market falls 20% next month, what happens to that money? | Understands the value moves up and down, a fall is a loss only if you sell, and time in the market matters. |
| `time-in-market` | investing | investing | 2 Compound interest | Your depot holds €{depotTotal}. Why does how long you stay invested matter? | You invest €1,000. Why does how long you stay invested matter? | Describes compounding: returns earn returns, so a longer horizon grows the money more. |
| `one-etf-vs-one-stock` | investing | risk | — | Your depot has {positionCount} positions. Why can one world ETF be less risky than shares of a single company? | Why can one world ETF be less risky than shares of a single company? | Explains spreading money over many companies, so one company failing hurts less. |
| `too-good-offer` | investing | risk | — | — | Someone online promises 20% a month with no risk. What tells you something is wrong? | Recognises that high guaranteed returns without risk are a scam signal; return and risk go together. |
Every prompt asks about understanding and recommends nothing (MiFID II).

### Quick check screen (`/categorizing`, after consent)
- One question per screen, progress "1 of 4", the prompt, a multiline input (280-char counter), "Next" (disabled while empty) and "Not sure". No right/wrong feedback. Back goes to the previous question with its answer kept.
- Copy above the first question: "Four quick questions so we know where to start. There are no wrong answers."
- Skipped entirely when the backend reports no Jev key (`GET /api/check-questions` returns `[]` then).

### Summary screen (`/learning-path`)
- Order: confidence gap card (when there is one) → "You're {a beginner / an intermediate / an advanced} learner" with the role's because lines → 2–3 focus areas with one "why" each → "Start learning" (opens `startLesson`, else the map) and a quiet "See all lessons".
- Educate, never advise: sentences describe what the answers and the account show; no product, no "you should".
- Shown once after each new categorisation; Profile can link to it later.

## Tasks
- [ ] **Q-M mockups** (read-only, `ui-ux-pro-max` + `finance-quest-ui`): 2–3 directions for the Quick check and the summary in `docs/design/mockups/quick-check-*.html`, matching consent direction C. Done when Jan has a link and each direction shows: an account question, a generic question, "Not sure", the summary with a gap, the summary without a gap.
- [ ] **Q-B backend** (`java-springboot`): `V6__check_questions.sql` with the starter pool, `GET /api/check-questions`, answers in `POST`, Jev `check_<id>` questions, `checks`, `startLesson`, focus-area reordering. Done when `./mvnw clean test` covers each 400 case, the Jev request carries generic prompts only, `Not sure` sends no text, and no answer text reaches the DB or logs.
- [ ] **Q-F front**: draw 2 + 2 with the account preference and optional seed, slot filling from `BankState`, the Quick check screen, the summary screen, the consent card line. Done when `npm run check` and Playwright cover: consent → 4 questions → summary → lesson, and the no-key path skipping straight to the summary.
- [ ] **Danylo handover**: the check-question format above and the starter pool, sent by Jan.

## Never
- Generated questions, a right/wrong verdict per question, or a score shown as a grade.
- Exact account amounts or raw answer text leaving the device or being stored.
