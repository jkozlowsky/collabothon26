---
status: in-progress
topic: B
owner: Jan (categorisation backend, consent card, loading screen); onboarding: Remigiusz
branch: feat/profiling (integration); workers: feat/profiling-bank (merged), feat/profiling-align, feat/profiling-jev, feat/profiling-loading, design/profiling-consent
---
# F1 Jev categorisation of bank customers

## Goal
<!-- frozen once approved: only Jan changes it -->
Finance Quest pretends to be a module inside a bank app. The signed-in user is the customer of Danylo's mock bank shell (`front/src/lib/bank/seed.ts`). After Remigiusz's onboarding, the user decides whether their account data may be used; the app turns the bank data into a handful of minimised, pseudonymous facts, and the backend sends those facts and the onboarding answers to the **Jev** decision model, and stores a categorisation: a learner **role** (novice / intermediate / advanced), a life stage, focus areas, confidence gaps, and the lesson variant F5 needs. A short loading screen covers the call.

What the jury should see:
- **Privacy by design**: raw transactions never leave the device; the user sees exactly which facts the model will get before agreeing.
- **Behaviour, not just a questionnaire**: the role weighs what the user says against how they actually handle money.
- **Confidence gap**: the app shows where the user's self-description ("I don't save yet", "I save and invest") underrates or overrates what their account shows: the challenge's core claim that people lack confidence, not information.
- **Explainable**: every result comes with the model's probabilities and the facts behind it.
- **Portable model**: hosted Jev today; any Jev-compatible model (e.g. self-hosted) by changing one property.

## Jan's decisions
- Scope: the categorisation backend, the mock bank it reads, the consent card and the loading screen; onboarding screens and questions are Remigiusz's (20.11).
- Approach: our code computes facts from bank data, Jev judges facts + answers (20.11).
- `userId` is the signed-in user's id (`EXPO_PUBLIC_USER_ID`); superseded: the backend mock-bank customers (20.11).
- The backend reads the saved onboarding answers itself (`user_profile`, Remigiusz's V3); the front sends the consent and, with consent, the facts (20.11).
- Onboarding has no graded quiz: the role comes from the self-assessment (`experience`), the account behaviour, and a confidence gap between them (20.11). A graded quiz, if added later, is one more input to Jev.
- Consent is asked on our own card before the loading screen, with a preview of the facts the model will see; without consent no bank data reaches the model (20.11).
- Flow: onboarding → `/categorizing` (consent card, then loading) → Learn; W3 makes the small change in Remigiusz's `onboarding.tsx` / `_layout.tsx`, Jan agrees it with him (20.11).
- Loading copy (English): "Building your learning path…" with steps "Reading your answers" → "Looking at your accounts" → "Picking your first lessons"; the model is not named (20.11).
- API paths are free, they must make sense (20.11); the bank/learning boundary is the facts object: nothing else from the bank reaches the backend (20.11).
- Hosted Jev; SelfJev is too slow for a live call (S1: ~35 s on the Mac, ~146 s in Docker). Before the demo Jan puts a TypeSafe key in `.env` and runs one successful call; the fallback stays as a safety net and the UI labels it as rules (20.11). Teammates run the app on any hardware without a key.
- Categorisation has its own table; Remigiusz's `user_profile` is not touched, F4/topic C keep XP in their own storage (20.11).
- One mock bank in the whole app: Danylo's front-end seed (`useBank`); our backend mock bank (`/api/mock-bank`, V5) is removed. The front computes the facts from the bank state and sends them with the consent; the backend never sees transactions (data minimisation, GDPR art. 5(1)(c)) (20.11, after PR #23).
- Onboarding input is main's three questions (life stage, goals, experience) from PR #22; our assumptions about the old onboarding (age, learning style, confidence per area) are removed (20.11).
- The confidence gap compares the `experience` answer with the account facts (20.11).
- Look: consent card and loading follow direction C "The line" (`docs/design/mockups/consent-c.html`, screenshot `shots/consent-c.png`) and the `finance-quest-ui` skill; where the skill and the onboarding code differ, the skill wins (20.11).


## Approaches
| | approach | privacy | jury effect |
|---|---|---|---|
| 1 | raw bank data to Jev | weak | medium |
| **2 (picked)** | **facts computed in our code + Jev judges** | **good** | **high: explainable, behaviour-based, privacy by design** |
| 3 | rules only, Jev for answers alone | best | low: Jev barely used |

## Contract
Consumers: the consent card and loading screen, F5 lesson variants (`lessonVariant`, `doc/F5-warianty.md` §4), the Profile tab later. Changes here also go to `.planning/decisions.md` and the team channel. Front types: `front/src/types/categorization.ts`; onboarding types stay in `front/src/types/onboarding.ts`; bank types in `front/src/types/bank.ts`.

```
POST /api/users/{userId}/categorization       {consent: boolean, facts?: Facts} → Categorization
GET  /api/users/{userId}/categorization       → Categorization | 404

Facts = {incomeBand, cashBufferMonths, savingsRate, savesRegularly, inOverdraft, holdsInvestments, hasLoan}   // see Reference
OnboardingAnswers = {lifeStage, goals[], experience, skipped}
                    // values exactly as stored by Remigiusz's PUT /api/users/{userId}/profile; missing = null

Categorization = {
  userId: string,
  consent: boolean,
  bankData: boolean,                          // true when facts were used (consent and facts sent)
  role: "novice" | "intermediate" | "advanced",
  lifeStage: "student" | "family" | "established" | "pre-retirement" | null,
  focusAreas: ("saving" | "debt" | "investing" | "risk" | "retirement")[],          // 1..5, most relevant first
  confidenceGaps: [{area: "saving" | "investing", direction: "under" | "over", because: string}],   // [] without bank data
  lessonVariant: {persona: "student" | "family" | "pre-retirement" | null, level: "beginner" | "advanced", lang: "plain" | "standard"},
  explanation: [{output: "role" | "focusAreas", probabilities: {<value>: number}, because: string[]}],
  sharedWithModel: {facts: Facts | null, answers: OnboardingAnswers} | null,      // exactly what was sent; null when no call was made
  source: "jev" | "fallback",
  model: string | null,                       // the response's `model` verbatim when it is a plain model id; null for fallback
  categorizedAt: ISO-8601
}
```
- **Errors** (`ProblemDetail` from the global handler): `POST .../categorization` → 400 for malformed JSON, missing `consent`, `userId` blank or over 64 chars, a fact outside its values, `facts` with `consent: false` (we refuse data the user did not agree to share); 404 "Finish onboarding first" until the user has finished or skipped onboarding (`onboarding_completed`). `consent: true` without `facts` → categorised without bank data (`bankData: false`).
- **lifeStage**: from the onboarding answer only: `starting-out` → student, `building` → family, `settled` → established, `later-life` → pre-retirement; skipped → null.
- **lessonVariant**: novice → `beginner` + `plain`; intermediate → `beginner` + `standard`; advanced → `advanced` + `standard`. `persona` = `lifeStage`, except `established` and `null` → `null` (F5 base content). 404 from `GET .../categorization` → F5 base content.
- **explanation**: `role` and `focusAreas`. `focusAreas` probabilities cover all 5 areas. Fallback entries have `probabilities: {}` and the same `because` lines.
- **Storage**: `V5__categorization.sql` (main has V1–V4), table `categorization (user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profile (user_id) ON DELETE CASCADE, data JSONB NOT NULL)`, written by upsert. A trigger deletes it whenever `user_profile.onboarding_completed_at` changes, so both the demo reset (`DELETE /api/users/{id}/profile/onboarding`) and new onboarding answers start a fresh categorisation.

## Reference


### Facts (front: `factsFrom(bank: BankState)` in `front/src/lib/categorization.ts`)
Computed on the device from Danylo's `BankState` (`front/src/types/bank.ts`, amounts in cents). Bands are lower-inclusive, upper-exclusive (`1-3` = [1, 3)).

| fact | rule | values |
|---|---|---|
| `incomeBand` | `account.monthIn` | `<1k`, `1-2k`, `2-3.5k`, `3.5-5k`, `5k+` |
| `cashBufferMonths` | (`account.balance` + `savings.balance`) / `account.monthOut`; `monthOut` 0 → `6+` | `<1`, `1-3`, `3-6`, `6+` |
| `savingsRate` | (`monthIn` − `monthOut`) / `monthIn`; `monthIn` 0 → `negative`, or `20%+` when `monthOut` is 0 too | `negative`, `0-10%`, `10-20%`, `20%+` |
| `savesRegularly` | a monthly standing order into savings or the depot (`recipient` starts with `Savings` or `Depot`) | boolean |
| `inOverdraft` | `account.balance` < 0 | boolean |
| `holdsInvestments` | any holding with `assetClass` other than `cash` | boolean |
| `hasLoan` | `loan.remaining` > 0 | boolean |

The seed customer gives `2-3.5k`, `6+`, `20%+`, true, false, true, true. Facts carry no name, id, exact amount, counterparty or date. The backend validates each value against its set (Bean Validation on the request DTO).

### Confidence gaps (our code, only with bank data)
| area | `under` when | `over` when |
|---|---|---|
| saving | experience `not-saving` or `occasional`, and `savesRegularly` | experience `regular`, `investing` or `planning`, and `cashBufferMonths` `<1` |
| investing | experience `not-saving`, `occasional` or `regular`, and `holdsInvestments` | experience `investing` or `planning`, and not `holdsInvestments` |
Skipped experience → no gaps. `because` lines, observations only: "You said: {experience label}. Money goes to savings or investments every month." / "You said: {experience label}. Your accounts cover less than a month of spending." / "You said: {experience label}. Your accounts with us include investment products." / "You said: {experience label}. No investment products in your accounts with us."

### Jev call
`POST {jev.base-url}/v1/systemone` with `model: {jev.model}`; header `Authorization: Bearer {jev.api-key}`, omitted when the key is blank. With a blank key and the default base URL the call is skipped (`sharedWithModel: null`, `source: fallback`). The client is built from the injected `RestClient.Builder`; timeouts on the request factory: connect 1 s, read 7 s (F1b: up to 4 extra check judgements; the front's 10 s also covers the profile wait). `state` = `{answers, interests, facts (only with bank data)}`. `interests` holds the `{category, topic}` of each picked path and is left out when empty. `answers` holds only the onboarding answers that have a value (no null, no interest ids, `skipped` only when true) and is left out when none has, because the model can read an empty field as a signal; `sharedWithModel.answers` still stores the whole object. Questions, verbatim:

<!-- jev-questions: the backend test compares the Jev request with this block -->
```json
{
  "role": {"type": "choice",
    "instructions": "Which learner level fits this person best, judging by the facts about their accounts in `facts` and their knowledge answers in `checkAnswers`, when present?",
    "criteria": {
      "novice": "Is starting out: has no habit of regular saving and no investments, and any knowledge answers show that basic money ideas are still new to them.",
      "intermediate": "Has some of the basics: saves regularly or invests but not both, or their knowledge answers are mixed or ahead of these habits.",
      "advanced": "Is past the basics: saves regularly and invests, and any knowledge answers show that they understand the ideas they were asked about."}},
  "focus_saving":     {"type": "noul", "instructions": "Would learning how to build an emergency fund help this person now?"},
  "focus_debt":       {"type": "noul", "instructions": "Would learning how to avoid expensive debt help this person now?"},
  "focus_investing":  {"type": "noul", "instructions": "Would learning how investing works help this person now?"},
  "focus_risk":       {"type": "noul", "instructions": "Would learning how to spread financial risk help this person now?"},
  "focus_retirement": {"type": "noul", "instructions": "Would learning how to plan for retirement help this person now?"}
}
```
Focus areas = `noul >= 0.5`, sorted by probability; none → the single highest. The response must have every asked question, labels inside their sets, a probability in [0, 1] for every label, and each `choice` equal to its most probable label; otherwise the whole categorisation falls back. Schemas: [API](https://docs.typesafe.ai/api), [choice](https://docs.typesafe.ai/primitives/choice.md), [noul](https://docs.typesafe.ai/primitives/noul.md), [errors](https://docs.typesafe.ai/api/errors.md).

Config: `jev.base-url` (default `https://api.typesafe.ai`), `jev.api-key=${JEV_API_KEY:}`, `jev.model` (default `jev-1.14.0`, pinned: the `jev-latest` alias can move to a model the questions were not written for). Startup fails on a non-http(s) base URL, a port outside 1–65535, a key sent over plain http to anything other than localhost or loopback, and a key that is not printable ASCII without spaces. Redirects are not followed (`spring.http.clients.redirects=dont-follow`); a 3xx response falls back like any other error.

### Goals → focus areas
Main's goal groups (`front/src/constants/onboarding.ts`): Everyday money (`budget`, `money-habits`, `banking-basics`) and Saving (`start-saving`, `emergency-fund`, `inflation`) → `saving`; Borrowing (`pay-off-debt`, `credit-cards`, `loans-mortgages`) → `debt`; Investing (`start-investing`, `stocks-etfs`, `crypto`) → `investing`; `retirement` → `retirement`; `insurance`, `scams` → `risk`.

### Because lines (our code; observations, never a recommendation verb such as invest, buy or switch)
| output | inputs → line |
|---|---|
| role | experience → "You said: {experience label}."; `savesRegularly` → "Money goes to savings or investments every month." / "No regular transfers to savings or investments."; `holdsInvestments` → "Your accounts with us include investment products." / "No investment products in your accounts with us." |
| saving | `cashBufferMonths` → "Your accounts cover {less than a month / 1 to 3 months / 3 to 6 months / more than 6 months} of spending."; `savingsRate` negative → "You spent more than you earned this month." |
| debt | `inOverdraft` → "Your current account is below zero."; `hasLoan` → "You are paying off a loan with us." |
| investing | `holdsInvestments` line + the `cashBufferMonths` line |
| risk | `holdsInvestments` line, only when they hold investments |
| retirement | lifeStage `pre-retirement` → "You said retirement is close or already here." |
| any focus area | a matching goal → "You picked {area} as a goal." |
Each focus area lists only the lines that support it (e.g. the buffer line under `saving` only when the buffer is `<1` or `1-3`); an area with no supporting line gets "It fits the answers you gave.".
Experience labels are main's titles: `not-saving` "I don't save yet", `occasional` "I save now and then", `regular` "I save regularly", `investing` "I save and invest", `planning` "I plan my finances ahead". Without bank data only the answer lines appear.

### Fallback rules (`source: "fallback"`)
- Role: `investing` or `planning` → advanced; `regular` → intermediate (the declaration decides; bank facts only feed because lines and gaps); `occasional` → novice, or intermediate when bank data shows `savesRegularly`; `not-saving` or skipped → novice.
- Focus areas, in this fixed order: `debt` if `inOverdraft` or `hasLoan`; `saving` if `cashBufferMonths` is `<1` or `1-3`; `investing` if not `holdsInvestments` and `cashBufferMonths` is `6+`; `retirement` if lifeStage is pre-retirement; `risk` if role is novice; plus every area from the user's goals; none → `saving`.

### Consent card and loading screen (`/categorizing`; look: `docs/design/mockups/consent-c.html`)
- Reached right after a fresh onboarding (finished or skipped); a returning user goes straight to Learn as today.
- Consent card first: computes `factsFrom(useBank().state)` and lists the facts in plain words ("Your accounts cover more than 6 months of spending", …) under the line "Only these summaries are shared, never your transactions." Buttons "Use my account data" (`consent: true`, sends exactly the previewed facts) and "Continue without" (`consent: false`, no facts).
- Then the loading steps: every 800 ms ("Looking at your accounts" is skipped without consent); the last step holds with a subtle progress indicator until the response; at least ~2.4 s in total; then `router.replace` to Learn.
- `POST /api/users/{USER_ID}/categorization` once per visit (a `useRef` guard), 10 s client timeout (`AbortController`), aborted on unmount; no navigation after unmount.
- Errors: network, 5xx, 404 (after the retries), 408 and 429 → "Your path stopped halfway" (mockup C) + Retry + "Skip for now" (to Learn without a categorisation); other 4xx → message + "Skip for now". Reuse `ApiError` from `front/src/lib/api.ts`.
- Reduced motion: steps swap without transitions, the progress indicator is static.
- Colours from `brand` in `front/src/constants/theme.ts` (already on main); new keys only if a token is missing. Match the onboarding's components (`front/src/components/onboarding/ui.tsx`) where they fit.

## Tasks
- [x] W1 mock bank, S1 spike (no-go), M1 mockups (C), A0, W2 Jev categorisation, W3 consent card and loading screen, W4 Lombok/MapStruct, W5 merge with main and split into PR #25.
- [x] **W6 move to main's bank and onboarding** (branch `jev-categorization`, PR #25): merge `origin/main` (PR #22 onboarding: V3 rewritten, V4 removed, three questions). Remove our backend mock bank (V5, `bank/**` and its tests and test resources) and keep the `Clock` bean in `common`. Rename the categorisation migration to `V4__categorization.sql`. Backend: `POST` takes `{consent, facts?}` with Bean Validation, reads main's `user_profile` (lifeStage, goals, experience, skipped), and follows the Reference above (lifeStage map, gaps, Jev questions, because lines, fallback). Front: `factsFrom(BankState)`, consent card from `useBank`, `POST` with the facts, types; the no-account-data variant of the card is removed. Done when `./mvnw clean test`, `npm run check` and `CI=1 npx playwright test` are green; tests cover each gap row, each fallback role, `facts` with `consent: false` → 400, an invalid fact value → 400, `factsFrom` on the seed → the values above, and the Jev request body equals the spec block.

## Non-goals
- Onboarding screens, the question set, the bank shell, a graded quiz, a Profile tab, XP and levels (other teammates).
- Confidence before/after lessons.
- Running a model locally inside the app: config allows it; S1 only measures.

## Guardrails
- The categorisation describes the user and recommends no product (MiFID II).
- Only facts and onboarding answers leave the backend; the Jev key lives only in the root `.env`.
- Each worker edits only its own task's files; other topics' modules (`lesson`, `profile`, onboarding, bank shell, Learn and Glossary screens) stay untouched, except the minimal hooks already agreed (`_layout.tsx`, `useOnboarding.tsx` write queue, `useOpenLearn.ts`); reading `useBank` and `types/bank.ts` is fine.
