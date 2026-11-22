# Demo accounts: three personas, account picker and account lock

Status: **agreed in interview, 2026-11-21. Not started.** Based on `origin/main` @ `cca4fc1` (the local `main` was 7 commits behind when this was written).

## 0. Goal

The app has one account today: Alex Krause (`demo-user`). We add two more mock accounts and a picker before the bank, so:

- the presenter demos **Alex** during the pitch (unchanged flow, one extra tap on the picker);
- after the presentations the **jury can click through the app themselves** as Daniel or Elena, with different bank data and so a different learning path from Jev;
- the accounts are separate players for **duels and the ranking** (a later human-vs-human duel is another agent's task; this spec only provides the accounts and the per-device lock).

## 1. Hard rule: do not modify Alex

**Alex is frozen.** Nothing about Alex may change:

- `front/src/lib/bank/seed.ts` Alex data: every number, transaction, holding, card, contact, IBAN. `seedAccount(DEFAULT_SEED)` must return **deep-equal** state before and after the refactor (pin it with a test).
- The `demo-user` account row (V4), its duel data (V12, V13) and its `DuelDemoSeeder` row (`demo-user`, 125, 120).
- Alex's weekly rank (6) and the "win a match, climb the table" behaviour: every new ranking player sits **below** Alex (§5).
- Alex's onboarding: **no answer hints** for Alex (§4).
- `make record` and the e2e journeys keep working. The only allowed change is one "pick Alex" step in the shared e2e/record helper (§3.6).

Moving Alex's seed into a persona registry is fine only if the data stays byte-for-byte the same.

## 2. Personas

International names, euro and German-bank context like Alex. Avatars: **reuse the existing six** (`m1–m3`, `f1–f3`); pick the closest look by eye. No new avatar art and no change to the `account.avatar` CHECK.

| | Alex Krause (unchanged) | Daniel Okafor | Elena Petrova |
|---|---|---|---|
| user id | `demo-user` | `demo-daniel` | `demo-elena` |
| who | the existing demo user | 45, freelance product designer | 72, retired, lives on her pension and puts a little aside every month |
| income | as today | ~€5,800/month, **irregular**: 3–4 client invoices of different sizes on different days | €1,380/month pension, on the 1st |
| main account | as today | €21,400 (a lot of idle cash) | €2,150 |
| savings | as today | €3,000 at 0.5% | €18,600 at 0.25%, standing order +€40/month into it |
| depot | as today | €14,200: ~70% one tech stock, ~30% cash | **none** |
| credit | as today | car loan €9,600 left, no overdraft used | **none**, debit card only |
| spending | as today | ~€3,900/month: rent, co-working, software subscriptions, eating out, travel | ~€1,250/month: rent, groceries, pharmacy, utilities, small transfers to grandchildren |

Jev facts these numbers must produce (`factsFrom` in `front/src/lib/categorization.ts`, pin with a unit test):

| Fact | Daniel | Elena |
|---|---|---|
| `incomeBand` | `5k+` | `1-2k` |
| `cashBufferMonths` | `6+` | `6+` |
| `savesRegularly` | `false` | `true` |
| `inOverdraft` | `false` | `false` |
| `holdsInvestments` | `true` | `false` |
| `hasLoan` | `true` | `false` |
| `savingsRate` | whatever the numbers give | whatever the numbers give |

`FactsDto` is **not** extended (no income-source or retirement flag). Age and life stage reach Jev only through the onboarding answers (§4).

Expected (not guaranteed) Jev result: Daniel → risk and diversification (Tokyo, Seoul); Elena → inflation and savings (Berlin, Buenos Aires, Nairobi). The path is **not** hardcoded per persona: the existing onboarding → Quick check → Jev/rules flow computes it.

Mock bank details beyond the numbers above don't matter. The bank is a mock and the core is Atlas. For Elena's empty depot and credits: no new design. The only requirement is that Invest, Credits and every lesson step **render without a crash, `NaN`, `undefined` or an empty chart that breaks layout**. Use the cheapest guard (zero values and the existing fallback copy in `lessonMetrics.ts`, which already returns `null` → fallback text when `invested(s)` is false).

## 3. Account picker and session

### 3.1 Flow

```
App start → Picker (every start, no "remember me")
  → tap a free account → acquire lock → bank Overview of that account
  → … bank / Learn / lesson / duel as today, all as that user …
  → bank header avatar → "Log out" → release lock → Picker
```

- The picker shows on **every app start and reload**. Nothing is remembered between starts except the device id (§3.3).
- The card of the account this device already holds (for example after a reload) is selectable and is not "In use".

### 3.2 Picker screen

- New route, shown before `(main)`. Built from existing components and the Design Kit styles (`finance-quest-ui` skill). **No new Figma frame**.
- Content: Commerzbank logo, a short title, **three cards with avatar and full name only**. No age, story, goals or numbers on the cards.
- An account locked by another device: **greyed out, label "In use", not tappable.** No takeover.
- Backend unreachable: an error with Retry, no entry into the bank.
- `testID`s on each card (`account-<userId>`) and on the in-use state.

### 3.3 Lock (backend)

Per-account lease, so two people never use the same account at once.

- New table (new Flyway migration, §6): `account_session(user_id PK → account, device_id, heartbeat_at)`.
- The device id is a random UUID made on first start and kept in the same local storage the app already uses (`useSceneMuted`). It identifies the device, not a person.
- Endpoints (under `/api`, layered like the rest: controller → service → repository, `Clock` injected):
  - `GET /api/demo-accounts?deviceId=…` → the three accounts in fixed order (Alex, Daniel, Elena) with `firstName`, `lastName`, `avatar` and `status: free | mine | in-use`.
  - `POST /api/users/{userId}/session` `{deviceId}` → 200 when free, expired or already this device's; **409** when another device holds a fresh lock.
  - `PUT /api/users/{userId}/session` `{deviceId}` (heartbeat) → 200, or **409** when the lock now belongs to another device.
  - `DELETE /api/users/{userId}/session?deviceId=…` → releases only if this device holds it; 204 either way.
- **TTL 120 s.** The app sends a heartbeat every **30 s** while an account is open (foreground). A lock with `heartbeat_at` older than 120 s counts as free.
- Acquire is race-safe: two simultaneous POSTs for a free account → exactly one 200, one 409 (single upsert with a condition on `device_id` / `heartbeat_at`, or a row lock). The repo already has a `Race` test helper.
- The lock is checked **only by the picker and the heartbeat**. Other `/api/users/{id}/…` endpoints are not guarded (no auth in this prototype, by design).
- Heartbeat gets 409 (the lock expired while the phone slept and someone else took it): toast "Someone else is using this account", then back to the picker.
- Alex has the same lock as the others.

### 3.4 Log out

- Only place: **the owner's avatar/initials in the bank header** (Overview) opens a small sheet with the name and **Log out**.
- Log out: stop the heartbeat, `DELETE` the session, reset all per-user client state (§3.5), go to the picker.

### 3.5 Frontend: user becomes runtime state

`USER_ID` in `front/src/lib/user.ts` is a module constant used in ~15 places (hooks, `lib/categorization.ts` `CATEGORIZATION_PATH`, `lib/duel/useDuelMatch.ts`, screens). It becomes runtime state:

- A `CurrentUserProvider` / `useCurrentUser()` at the root. Everything that reads `USER_ID` gets it from there; module-level constants built from it (such as `CATEGORIZATION_PATH`) become functions of the user id.
- The per-user providers (`OnboardingProvider`, `AccountProvider`, `BankProvider`, …) mount **under a `key={userId}`**, so switching account starts them fresh. `BankProvider` gets the persona's seed.
- **Module-level state must be reset on log out.** Known: `currentSummary`/`setSummary` in `lib/learningPath.ts` and the queued writes behind `profileWritesSettled` in `useOnboarding`. Grep for any other module-level `let` and caches.
- `EXPO_PUBLIC_USER_ID` keeps its documented meaning ("pinned per device"): when it is set, the picker is skipped and that user is used directly. The lock is still taken.

### 3.6 Tests and recordings that sign in as Alex

`front/e2e/app.ts` (shared helper) and `front/recordings/journey.ts` get one step: on the picker, tap `account-demo-user`. Nothing else in those journeys changes. They also need a clean lock: release in teardown, or rely on the TTL / a fresh device id per browser context.

## 4. Onboarding answer hints (Daniel and Elena only)

Each persona can carry **preselected answers** for the **profiling** questions, so a juror only confirms them and Jev gets a sensible profile. The answers stay changeable. **Knowledge questions of the Quick check are never hinted.** **Alex has no hints.**

| Question | Daniel | Elena |
|---|---|---|
| Life stage (`lifeStage`) | `settled` | `later-life` |
| Goals (`goals`) | `stocks-etfs`, `retirement` | `inflation`, `scams` |
| Money habits (`experience`) | `investing` | `regular` |
| Quick check age band (`ageBand`, only asked when life stage is skipped) | `41-59` | `60+` |
| Quick check horizon (`horizon`) | `5y+` | `1-5y` |
| Quick check savings cover (`savingsCover`, only asked without bank consent) | match the bank data (6+ months) | match the bank data (6+ months) |

Hints live in the frontend persona registry (§7), not in the backend.

## 5. Ranking: about 50 players

- Today: 12 demo accounts (Alex + 11, mostly Polish names). They **stay as they are** (applied migrations are immutable, and Alex is frozen).
- Add `demo-daniel`, `demo-elena` and **36 more mock players** with international names → **50 accounts** in the weekly ranking. Use the existing avatars and the `demo-` prefix, so `DuelRivalSimulator.pickRival` can also pick them as rivals.
- Weekly XP of **every new player is below Alex's (125)**, so Alex keeps rank 6 and the same climb after a win. Spread the new players so the table looks busy (no long runs of equal values). Daniel and Elena land around the middle of the lower half (for example ranks 12–25), not last.
- Seed the new players the way the existing lower players are seeded (`DuelDemoSeeder` XP events and, if existing players have them, `duel_progress` rows via the new migration). Check what `demo-nina` / `demo-ewa` have and mirror it.
- `DuelDemoSeeder` skips when its marker user (`demo-tomasz`) already has this week's rows. New players must still get seeded on a database that was already seeded this week: make the skip per player. The existing players' rows stay unchanged.
- The ranking query returns the top 50 (per the backend layers contract). With 50 players everyone is listed.

## 6. Backend data changes

One new Flyway migration (the next free `V<n>`; check `origin/main` **and** the open duel-v3 / prod branches at merge time, since another branch may take the same number):

- `account` rows: `demo-daniel` (Daniel Okafor), `demo-elena` (Elena Petrova), 36 mock players.
- `account_session` table (§3.3).
- Any `duel_progress` rows the new players need (§5).

No change to existing migrations, and no change to `FactsDto` or the Jev request.

## 7. Frontend persona registry

`front/src/lib/personas.ts` (or similar): per user id, the bank seed and the onboarding hints. Names and avatars come from the backend `account` (single source). The registry has an entry for each of the three. Alex's entry points at the unchanged `seedAccount(DEFAULT_SEED)`. Daniel and Elena get their own seed modules next to `seed.ts`, with the same deterministic PRNG approach.

## 8. Tests (targeted only)

Backend:
- Lock service/controller: acquire free; acquire held → 409; same device re-acquire → 200; expiry after 120 s with a movable clock; heartbeat after takeover → 409; release by a non-owner is a no-op; concurrent acquire → one winner (`Race`).
- `GET /api/demo-accounts` statuses (`free` / `mine` / `in-use`).
- Seeder: new players seeded on an already-seeded week; existing rows (including Alex) unchanged; Alex still rank 6.

Frontend:
- `seedAccount(DEFAULT_SEED)` deep-equals a stored snapshot of today's Alex state.
- `factsFrom` for Daniel and Elena gives the facts in §2.
- Every lesson step personalised with Elena's state contains no `NaN` / `undefined` / `null` in the text.
- Picker: free / mine / in-use rendering, tap → acquire, in-use not tappable, error + Retry.
- Log out resets per-user state (switch Daniel → Elena shows Elena's bank and onboarding, not Daniel's).

e2e: the existing journeys pass with the added "pick Alex" step.

## 9. Out of scope

- Real authentication or login.
- Human-vs-human live duels (another agent's task).
- Business-account UI for Daniel, an accessibility mode for Elena, new avatar art.
- Persona detail on the picker cards.
- Any change to Alex (§1).

## 10. Coordination

- `Sarnolek/duel-v3` changes the ranking (medal cards, sticky row, `previousRank`) and duel content. The ranking seed changes here (§5) must merge cleanly with it. Agree the migration number and seeder changes with that branch.
- `prod-cicd` / `prod-deploy`: if the jury uses a deployed instance, the lock is what keeps devices apart. Nothing here exposes services beyond the existing setup.
