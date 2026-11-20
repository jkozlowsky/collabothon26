---
status: ready
topic: B
owner: Jan (categorisation backend, consent card, loading screen); onboarding: Remigiusz
branch: feat/profiling (integration); workers: feat/profiling-bank (merged), feat/profiling-align, feat/profiling-jev, feat/profiling-loading, design/profiling-consent
---
# F1 Jev categorisation of bank customers

## Goal
<!-- frozen once approved: only Jan changes it -->
Finance Quest pretends to be a module inside a bank app. The signed-in user is one of a few mock bank customers with real-looking accounts and transactions. After Remigiusz's onboarding, the user decides whether their account data may be used; the backend turns the bank data into a handful of minimised, pseudonymous facts, sends those facts and the onboarding answers to the **Jev** decision model, and stores a categorisation: a learner **role** (novice / intermediate / advanced), a life stage, focus areas, confidence gaps, and the lesson variant F5 needs. A short loading screen covers the call.

What the jury should see:
- **Privacy by design**: raw transactions never leave the bank; the user sees exactly which facts the model will get before agreeing.
- **Behaviour, not just a questionnaire**: the role weighs what the user says against how they actually handle money.
- **Confidence gap**: the app shows where the user underrates (or overrates) themselves compared with what their account shows: the challenge's core claim that people lack confidence, not information.
- **Explainable**: every result comes with the model's probabilities and the facts behind it.
- **Portable model**: hosted Jev today; any Jev-compatible model (e.g. self-hosted) by changing one property.

## Jan's decisions
- Scope: the categorisation backend, the mock bank it reads, the consent card and the loading screen; onboarding screens and questions are Remigiusz's (20.11).
- Approach: our code computes facts from bank data, Jev judges facts + answers (20.11).
- Mock a few bank customers with accounts and transactions (20.11). `userId` is the bank customer id; demo with `EXPO_PUBLIC_USER_ID=tom` (20.11).
- The backend reads the saved onboarding answers itself (`user_profile`, Remigiusz's V3/V4); the front only sends the consent (20.11).
- Onboarding has no graded quiz: the role comes from the self-assessment (experience, confidence per area), the account behaviour, and a confidence gap between them (20.11). A graded quiz, if added later, is one more input to Jev.
- Consent is asked on our own card before the loading screen, with a preview of the facts the model will see; without consent no bank data reaches the model (20.11).
- Flow: onboarding → `/categorizing` (consent card, then loading) → Learn; W3 makes the small change in Remigiusz's `onboarding.tsx` / `_layout.tsx`, Jan agrees it with him (20.11).
- Loading copy (English): "Building your learning path…" with steps "Reading your answers" → "Looking at your accounts" → "Picking your first lessons"; the model is not named (20.11).
- API paths are free, they must make sense (20.11); the raw mock data lives under `/api/mock-bank`, so the bank/learning boundary is visible in the API (20.11).
- Hosted Jev; SelfJev is too slow for a live call (S1: ~35 s on the Mac, ~146 s in Docker). Before the demo Jan puts a TypeSafe key in `.env` and runs one successful call per customer; the fallback stays as a safety net and the UI labels it as rules (20.11). Teammates run the app on any hardware without a key.
- Categorisation has its own table; Remigiusz's `user_profile` is not touched, F4/topic C keep XP in their own storage (20.11).
- Demo protagonist: Tom (29, wants to start investing); his lessons use F5 base content (20.11).
- Look: consent card and loading follow direction C "The line" (`docs/design/mockups/consent-c.html`, screenshot `shots/consent-c.png`) and the `finance-quest-ui` skill; where the skill and the onboarding code differ, the skill wins (20.11).


## Approaches
| | approach | privacy | jury effect |
|---|---|---|---|
| 1 | raw bank data to Jev | weak | medium |
| **2 (picked)** | **facts computed in our code + Jev judges** | **good** | **high: explainable, behaviour-based, privacy by design** |
| 3 | rules only, Jev for answers alone | best | low: Jev barely used |

## Contract
Consumers: the consent card and loading screen (W3), F5 lesson variants (`lessonVariant`, `doc/F5-warianty.md` §4), the Profile tab later. Changes here also go to `.planning/decisions.md` and the team channel. Front types: `front/src/types/categorization.ts`; onboarding types stay in `front/src/types/onboarding.ts`.

```
GET  /api/mock-bank/customers                 → CustomerSummary[]
GET  /api/mock-bank/customers/{id}            → Customer          // the bank's own raw view, last 90 days
GET  /api/mock-bank/customers/{id}/facts      → Facts             // what may leave the bank; the consent card previews it
POST /api/users/{userId}/categorization       {consent: boolean} → Categorization
GET  /api/users/{userId}/categorization       → Categorization | 404

CustomerSummary, Customer, Facts: unchanged from W1 (see Reference).
OnboardingAnswers = {lifeStage, goals[], experience, learningStyle, confidence: {budgeting, saving, investing}, skipped}
                    // values exactly as stored by Remigiusz's PUT /api/users/{userId}/profile; missing = null

Categorization = {
  userId: string,
  consent: boolean,
  bankData: boolean,                          // true when facts were used (consent and a bank customer with this id)
  role: "novice" | "intermediate" | "advanced",
  lifeStage: "student" | "family" | "established" | "pre-retirement" | null,
  focusAreas: ("saving" | "debt" | "investing" | "risk" | "retirement")[],          // 1..5, most relevant first
  confidenceGaps: [{area: "budgeting" | "saving" | "investing", direction: "under" | "over", because: string}],   // [] without bank data
  lessonVariant: {persona: "student" | "family" | "pre-retirement" | null, level: "beginner" | "advanced", lang: "plain" | "standard"},
  explanation: [{output: "role" | "lifeStage" | "focusAreas", probabilities: {<value>: number}, because: string[]}],
  sharedWithModel: {facts: Facts | null, answers: OnboardingAnswers} | null,      // exactly what was sent; null when no call was made
  source: "jev" | "fallback",
  model: string | null,                       // the response's `model` verbatim when it is a plain model id; null for fallback
  categorizedAt: ISO-8601
}
```
- **Errors** (`ProblemDetail` from the global handler): unknown id on `/api/mock-bank/customers/{id}...` → 404. `POST .../categorization` → 400 for malformed JSON, missing `consent`, `userId` blank or over 64 chars; 404 "Finish onboarding first" when the user has no `user_profile`. `consent: true` for a user who is not a bank customer → categorised without facts (`bankData: false`), so the default `demo-user` still works.
- **lifeStage**: the user's onboarding answer wins. Only when it is missing: Jev's `lifeStage` (with bank data) or the fallback age rule (with bank data), else null.
- **lessonVariant**: novice → `beginner` + `plain`; intermediate → `beginner` + `standard`; advanced → `advanced` + `standard`. `learningStyle: simple` → `lang: plain`, `detailed` → `standard`, others keep the role mapping. `persona` = `lifeStage`, except `established` and `null` → `null` (F5 base content). 404 from `GET .../categorization` → F5 base content.
- **explanation**: `role` and `focusAreas` always; `lifeStage` only when it came from the model or the fallback rule. `focusAreas` probabilities cover all 5 areas. Fallback entries have `probabilities: {}` and the same `because` lines.
- **Storage**: `V6__categorization.sql`, table `categorization (user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profile (user_id) ON DELETE CASCADE, data JSONB NOT NULL)`, written by upsert; Remigiusz's demo reset (`DELETE /api/users/{id}/profile`) removes it too.

## Reference

### Mock bank (`V5__mock_bank.sql`)
Tables for customers, accounts (with `opening_balance`), products and transactions. Transactions store `days_ago`; the date is computed on read (today from the `Clock` bean minus `days_ago`). Balances are computed on read (opening balance + transactions). One `Clock` bean (`bank/ClockConfig`, Europe/Berlin) is the app's clock; W2 reuses it. Categories: `salary`, `rent`, `mortgage`, `groceries`, `subscription`, `utilities`, `leisure`, `transfer-internal`, `investment`, `other`. Names are fictional.

| id | name | age | story | expected facts |
|---|---|---|---|---|
| `lena` | Lena | 22 | student, small irregular income, overdraft twice | `18-25`, `<1k`, `<1`, `negative`, savesRegularly false, overdraftMonths 2, investments false, mortgage false, insurance false |
| `tom` | Tom | 29 | young professional who wants to start investing; cash idles in the current account | `26-34`, `3.5-5k`, `6+`, `20%+`, false, 0, false, false, false |
| `marco` | Marco | 38 | family, mortgage, tight budget, small monthly transfer to savings | `35-44`, `3.5-5k`, `1-3`, `0-10%`, true, 0, false, true, false |
| `ingrid` | Ingrid | 58 | pre-retirement, large savings, monthly fund savings plan, life insurance | `55-64`, `3.5-5k`, `6+`, `20%+`, true, 0, true, false, true |

### Facts
Window: the last 90 days, split into three 30-day buckets ending today ("months"). Income = transactions with category `salary` (net, may be negative). Spending = outgoing transactions except `salary`, `transfer-internal` and `investment`. Bands are lower-inclusive, upper-exclusive (`1-3` = [1, 3)).

| fact | rule | values |
|---|---|---|
| `ageBand` | from age | `18-25`, `26-34`, `35-44`, `45-54`, `55-64`, `65+` |
| `incomeBand` | mean monthly income | `<1k`, `1-2k`, `2-3.5k`, `3.5-5k`, `5k+` |
| `cashBufferMonths` | (current + savings balance) / mean monthly spending; spending 0 → `6+` | `<1`, `1-3`, `3-6`, `6+` |
| `savingsRate` | (income − spending) / income; income below 0 → `negative`; income 0 → `negative`, or `20%+` when spending is 0 too | `negative`, `0-10%`, `10-20%`, `20%+` |
| `savesRegularly` | money going in: a `transfer-internal` credited to a savings account, or an `investment` credited to a depot (the current-account outflow when there is no depot), in at least 2 of the 3 buckets | boolean |
| `overdraftMonths` | buckets in which any current account's end-of-day balance went below 0; no current account → 0 | 0–3 |
| `holdsInvestments`, `hasMortgage`, `hasInsurance` | product types `fund_savings_plan`, `mortgage`, `life_insurance` | boolean |

Facts carry no name, id, exact amount, counterparty or date.

### Confidence gaps (our code, only with bank data)
| area | `under` when | `over` when |
|---|---|---|
| budgeting | confidence ≤ 2, `overdraftMonths` 0 and `savingsRate` `10-20%` or `20%+` | confidence ≥ 4 and `overdraftMonths` > 0 |
| saving | confidence ≤ 2 and `savesRegularly` | confidence ≥ 4 and `cashBufferMonths` `<1` |
| investing | confidence ≤ 2 and `holdsInvestments` | confidence ≥ 4, not `holdsInvestments`, experience `not-saving` or `none` |
An unrated area has no gap. `because` lines, observations only: "You rate yourself {n}/5 on saving, and you moved money to savings in most of the last 3 months." / "You rate yourself {n}/5 on everyday money, and your current account went below zero in {m} of the last 3 months." (same pattern for each row).

### Jev call
`POST {jev.base-url}/v1/systemone` with `model: {jev.model}`; header `Authorization: Bearer {jev.api-key}`, omitted when the key is blank. With a blank key and the default base URL the call is skipped (`sharedWithModel: null`, `source: fallback`). The client is built from the injected `RestClient.Builder`; timeouts on the request factory: connect 1 s, read 4 s. `state` = `{answers: OnboardingAnswers, facts (only with bank data)}`. Questions, verbatim:

<!-- jev-questions: the backend test compares the Jev request with this block -->
```json
{
  "role": {"type": "choice",
    "instructions": "Based on this person's self-assessment (experience with saving and investing, confidence from 1 to 5 per area) and, when given, their money habits, which learner level fits best?",
    "criteria": {
      "novice": "Does not save or invest yet, or feels unsure (low confidence), and shows few healthy money habits such as regular saving or a cash buffer.",
      "intermediate": "Saves or has tried investing, or feels fairly confident, but does not yet act on it consistently, for example saves but has never invested.",
      "advanced": "Invests regularly or is experienced and feels confident about it; habits such as regular saving support this."}},
  "lifeStage": {"type": "choice",
    "instructions": "Which life stage best describes this person?",
    "criteria": {
      "student": "In education or just starting out, with low or irregular income.",
      "established": "Working in an established career, without mortgage or family costs.",
      "family": "Mid-life with household costs such as a mortgage or children.",
      "pre-retirement": "About ten years or less before retirement."}},
  "focus_saving":     {"type": "noul", "instructions": "Would this person benefit most from learning about building an emergency fund and saving right now?"},
  "focus_debt":       {"type": "noul", "instructions": "Would this person benefit most from learning about avoiding overdrafts and expensive debt right now?"},
  "focus_investing":  {"type": "noul", "instructions": "Would this person benefit most from learning how investing works, for example funds and ETFs, right now?"},
  "focus_risk":       {"type": "noul", "instructions": "Would this person benefit most from learning about risk, diversification and protection right now?"},
  "focus_retirement": {"type": "noul", "instructions": "Would this person benefit most from learning about planning for retirement and the family's future right now?"}
}
```
`lifeStage` is asked only when the user skipped that question and bank data is used. Focus areas = `noul >= 0.5`, sorted by probability; none → the single highest. The response must have every asked question, labels inside their sets, a probability in [0, 1] for every label, and each `choice` equal to its most probable label; otherwise the whole categorisation falls back. Schemas: [API](https://docs.typesafe.ai/api), [choice](https://docs.typesafe.ai/primitives/choice.md), [noul](https://docs.typesafe.ai/primitives/noul.md), [errors](https://docs.typesafe.ai/api/errors.md).

Config: `jev.base-url` (default `https://api.typesafe.ai`), `jev.api-key=${JEV_API_KEY:}`, `jev.model` (default `jev-latest`). Startup fails on a non-http(s) base URL, a port outside 1–65535, a key sent over plain http to anything other than localhost or loopback, and a key that is not printable ASCII without spaces. Redirects are not followed (`spring.http.clients.redirects=dont-follow`); a 3xx response falls back like any other error.

### Goals → focus areas
`saving`: budget, money-habits, banking-basics, start-saving, emergency-fund, big-purchase, buy-home. `debt`: pay-off-debt, credit-cards, loans-mortgages. `investing`: start-investing, stocks, etfs, bonds, sustainable-investing, crypto, inflation. `risk`: diversification, risk, insurance, scams. `retirement`: retirement, kids-future, family-money. `taxes` maps to none.

### Because lines (our code; observations, never a recommendation verb such as invest, buy or switch)
| output | inputs → line |
|---|---|
| role | experience → "You said: {experience label}."; confidence → "You rate yourself {b}/5 on everyday money, {s}/5 on saving, {i}/5 on investing." (rated areas only); `savesRegularly` → "You move money to savings in most months." / "No regular transfers to savings in the last 3 months."; `holdsInvestments` → "Your accounts with us include investment products." / "No investment products in your accounts with us." |
| lifeStage | `ageBand` → "Age group {band}."; `hasMortgage` true → "You are paying off a mortgage." |
| saving | `cashBufferMonths` → "Your accounts cover {less than a month / 1 to 3 months / 3 to 6 months / more than 6 months} of spending."; `savingsRate` negative → "You spent more than you earned." |
| debt | `overdraftMonths` > 0 → "Your current account went below zero in {n} of the last 3 months." |
| investing | `holdsInvestments` line + the `cashBufferMonths` line |
| risk | `holdsInvestments` line, only when they hold investments |
| retirement | `ageBand` line, only at `45-54` and above |
| any focus area | a matching goal → "You picked {area} as a goal." |
Each focus area lists only the lines that support it (e.g. the buffer line under `saving` only when the buffer is `<1` or `1-3`); an area with no supporting line gets "It fits the answers you gave.". An unknown `ageBand` is an error, never a silent mapping.
Experience labels: `not-saving` "I don't save yet", `none` "I save, but don't invest yet", `tried` "Tried it once or twice", `regular` "I invest regularly", `experienced` "I'm pretty experienced". Without bank data only the answer lines appear.

### Fallback rules (`source: "fallback"`)
- Role: experience `regular` or `experienced` → advanced (the declaration decides; bank facts only feed because lines and confidence gaps, never a product-ownership test); `tried` → intermediate; `not-saving`, `none` or skipped → novice, or intermediate when bank data shows `savesRegularly`.
- Life stage (only when the answer is missing and bank data is used): `18-25` student, `26-34` established, `35-44` and `45-54` family, `55-64` and `65+` pre-retirement.
- Focus areas, in this fixed order: `debt` if `overdraftMonths > 0`; `saving` if `cashBufferMonths` is `<1` or `1-3`; `investing` if not `holdsInvestments` and `cashBufferMonths` is `6+`; `retirement` if `ageBand` ≥ `45-54`; `risk` if role is novice; plus every area from the user's goals; none → `saving`.

### Consent card and loading screen (`/categorizing`; look: `docs/design/mockups/consent-c.html`)
- Reached right after a fresh onboarding (finished or skipped); a returning user goes straight to Learn as today.
- Consent card first: loads `GET /api/mock-bank/customers/{USER_ID}/facts` and lists the facts in plain words ("Your accounts cover more than 6 months of spending", …) under the line "Only these summaries are shared, never your transactions." Buttons "Use my account data" (`consent: true`) and "Continue without" (`consent: false`). 404 on facts → the card says there is no account data and offers one Continue (`consent: false`).
- Then the loading steps: every 800 ms ("Looking at your accounts" is skipped without consent); the last step holds with a subtle progress indicator until the response; at least ~2.4 s in total; then `router.replace` to Learn.
- `POST /api/users/{USER_ID}/categorization` once per visit (a `useRef` guard), 10 s client timeout (`AbortController`), aborted on unmount; no navigation after unmount.
- Errors: network, 5xx, 404 (after the retries), 408 and 429 → "Your learning path didn't load" + Retry + "Skip for now" (to Learn without a categorisation); other 4xx → message + "Skip for now". Reuse `ApiError` from `front/src/lib/api.ts`.
- Reduced motion: steps swap without transitions, the progress indicator is static.
- Colours from `brand` in `front/src/constants/theme.ts` (already on main); new keys only if a token is missing. Match the onboarding's components (`front/src/components/onboarding/ui.tsx`) where they fit.

## Tasks
Merge order: W1 (done, 108feef) → A0 → W2 and W3 in parallel. M1 runs now; W3 builds the chosen direction.

- [x] **W1 mock bank**: merged after three review rounds (`.planning/reviews/W1-bank-code-review.md`).
- [x] **S1 spike**: no-go for a live call (`docs/research/selfjev-spike.md`).
- [x] **M1 mockups**, C picked (read-only on code): 2–3 directions for the consent card + loading screen as HTML in `docs/design/mockups/consent-*.html`, matching the onboarding that precedes it and the B Quest look. Done when Jan has a link and each direction shows: consent with Tom's facts, consent with no bank data, loading, error.
- [ ] **A0 align with main** (`feat/profiling-align`): merge `origin/main` into the branch; rename `V4__mock_bank.sql` → `V5__mock_bank.sql`; move the bank controller to `/api/mock-bank/customers`; tests updated. Done when `./mvnw test` is green on the merged tree.
- [ ] **W2 Jev categorisation** (`com.collabothon.back.categorization`, `V6__categorization.sql`, `pom.xml`, `.env.example`, the logging aspect in `common`): reads `user_profile` through a read-only query of its own (Remigiusz's `profile` package stays untouched), facts via `CustomerFactsService.factsFor`, Jev client, fallback rules, confidence gaps, because lines, the two endpoints. Done when `./mvnw test` is green and covers, with Jev mocked via `MockRestServiceServer`: Jev answer → expected Categorization for Tom; Jev 500, invalid answer and `withException(new SocketTimeoutException())` → fallback; `consent: false` → no facts in the request body, `bankData: false`, `confidenceGaps: []`; `consent: true` for `demo-user` → `bankData: false`; each 400 case; no `user_profile` → 404; GET before POST → 404; deleting the profile removes the categorisation; one test per confidence-gap row.
- [ ] **W3 consent card + loading screen** (`front/src/app/categorizing.tsx`, `front/src/lib/categorization.ts`, `front/src/types/categorization.ts`, the minimal hook in `onboarding.tsx` / `_layout.tsx`): as in Reference, from the M1 direction Jan picks. Done when, on web against W2: a fresh onboarding lands on the consent card with Tom's facts, both buttons reach Learn after the steps, a returning user skips it, Retry appears on a network error, every tappable element has a `testID`, the existing onboarding tests still pass, and `npx tsc --noEmit` and `npx expo lint` pass.

## Non-goals
- Onboarding screens, the question set, a graded quiz, a Profile tab, XP and levels (other teammates).
- Confidence before/after lessons.
- Running a model locally inside the app: config allows it; S1 only measures.

## Guardrails
- The categorisation describes the user and recommends no product (MiFID II).
- Only facts and onboarding answers leave the backend; the Jev key lives only in the root `.env`.
- Each worker edits only its own task's files; other topics' modules (`lesson`, `profile`, Learn and Glossary screens) stay untouched, except the minimal W3 hook agreed with Remigiusz.
