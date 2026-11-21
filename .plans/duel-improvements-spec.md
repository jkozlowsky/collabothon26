# Duel mode v2: improvements spec

Status: **agreed in interview, 2026-11-21 (round 2 after the lessons/stories merge, PR #31). Not started.**
Builds on [`duel-mode-spec.md`](duel-mode-spec.md) (v1, PR #28) and closes parts of [`duel-open-topics.md`](duel-open-topics.md).
Related: [`f4-f5-lessons-spec.md`](f4-f5-lessons-spec.md) (lesson step format), [`globe-home-spec.md`](globe-home-spec.md) (globe + pins).
Execution: not decided yet (spec first). UI: Figma designs come first, the user will say when.

## 0. Round 3 changes (after the first Figma pass) — these override the sections below

| # | Change | Overrides |
|---|---|---|
| R1 | **Polish only.** All duel copy and duel content (`content/duel/*.json`) in Polish; no EN, no `lang` param in the duel. | §5.4 language, §13 |
| R2 | **Category names, not cities.** Seoul → „Hype i dźwignia”, Berlin → „Inflacja i oszczędności”, São Paulo → „Raty i długi”, Tokyo → „Dywersyfikacja”. Full names, never wrapped or truncated. Name lives in `stories.json` (new field `category`, PL). | D7, §10.2 |
| R3 | **Lobby = list with checkboxes**, not a 3-column grid. One row per category: icon · full name · level + thin XP bar · checkbox. | D19, §10.2 |
| R4 | **Multi-category search.** The player ticks one or more categories; the 6 questions are spread over the ticked categories, and each correct answer gives its 5 XP to **that question's** category (one `xp_event` row per category per match; unique key becomes `(user_id, source, source_ref, category)`). `StartMatchRequest.categories: string[]`. | D3, §4.1, §8 |
| R5 | **Demo:** whatever is ticked, the match uses the fixed 6 Berlin questions (ticking works visually). | D19 |
| R6 | **Ranking: overall weekly only.** No per-category chips/filter. | D10, §7, §10.2 |
| R7 | **Duel has two tabs: „Graj” | „Historia”.** Historia = list of the player's matches (rival, categories, score, +XP, date), pending ones on top; tap opens the match result/review. `GET /api/duel/matches?userId=` (history). | §10.2 |
| R8 | **Review order: wrong answers first** (expanded: explanation + „Powtórz lekcję”), then the right ones collapsed under „Dobrze (n)”. | §10.2 |
| R9 | **Visual: less plain.** Use the Figma file's main colours (navy + yellow) as a small palette, flat colour blocks, **no gradients**, no glows. | §10 |

## 1. Goal

Make the duel a polished, demo-ready "lesson where you compete with someone":

- remove Elo completely;
- **category = story** (Seoul, Berlin, São Paulo, Tokyo); XP is earned per story by lessons **and** duels; levels come from that XP and are real backend state, not random;
- duel questions are **variations of the story's lesson steps** (new numbers, same step types, interactive ones included), each linked back to its source lesson;
- the ranking is the XP gained this week, overall or in one story;
- fair per-question timer that depends on the question, with no speed bonus;
- both players start together and finish separately; whoever finishes first can wait for the result;
- one idealised demo challenge (**Berlin**) works end to end; the other tiles only look real;
- the duel gets its own pin on the globe: **Rome, the Colosseum (the arena)**.

## 2. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Elo | Removed everywhere: DB columns, services, DTOs, UI ("Ranked · Elo", calibration). |
| D2 | Modes | **HUMAN** (simulated human rival) and **SOLO**. BOT mode is removed. |
| D3 | XP in a duel | **5 XP per correct answer** in HUMAN mode. Wrong answer or timeout = 0. Win, draw or loss does **not** change XP: 3 correct answers give 15 XP whether you win or lose. |
| D4 | Solo | No XP. Training only: 6 questions, same timer, result + review at the end. |
| D5 | Outcome | Win / draw / loss is still shown ("Wygrałeś 5:4"), but is not rewarded. |
| D6 | No extra points | No speed bonus, no win bonus, no streak bonus. Score = number of correct answers. |
| D7 | Categories | **Category = story** from `content/stories.json` (`seoul`, `berlin`, `sao-paulo`, `tokyo`). The tile shows the story's topic and city ("Bezpieczne pieniądze, które tracą wartość · Berlin"). New stories become new categories with no code change. |
| D8 | XP model | XP per story, from lessons **and** duels, in one ledger (`xp_event`, §4). Lesson completion writes there too (in this task). |
| D9 | Levels | Level per story, computed from the story's XP sum. Every shown level (player, rival, ranking, lobby) comes from the backend. Nothing random or hardcoded. |
| D10 | Ranking | **Weekly only**: sum of XP gained this week, filter = overall or one story. No all-time, no friends. |
| D11 | Match pacing | Both start together, each answers at their own pace, each finishes separately. |
| D12 | Rival pace | "Mirror with delay": the rival answers question N **only after** the player answered (or timed out on) N, 1–4 s later (random). The rival always finishes a few seconds after the player. |
| D13 | Rival score | Final rival score = `max(playerScore − 1, 0)`. The player wins by one; 0 correct gives 0:0. Rival level: any (a real demo account's real level). |
| D14 | Waiting | The first to finish sees a waiting screen and may leave. The result then appears later in the lobby. |
| D15 | Timer | Per question: formula from step type + reading length, with an optional per-question override (§6). |
| D16 | Questions | 6 per match. Source: **variations of the story's lesson steps** (not 1:1 copies; new numbers and situations), each with a `lessonId`. Types: `quiz`, `predict`, a graded chart step, `sort`, `match` (§5.4). Content lives in JSON next to the lessons (`content/duel/<story>.json`). |
| D17 | Grading | Every duel question is 0 or 1. `quiz`: right option. `sort` / `match`: no mistake (as in lessons). `predict`: guess within the tolerance written in the question. Chart: see §5.4. |
| D18 | Feedback | Short right/wrong banner (~1 s) after each question, no explanation. Explanations + the "Powtórz lekcję" link are in the review at the end. |
| D19 | Demo challenge | Lobby grid of story tiles, **3 columns**. Only **Berlin** works, with a fixed, hand-picked set of 6 questions in fixed order. Rival pace stays the mirror (D12). The other tiles look normal; tapping them shows a toast. |
| D20 | Unlock | The duel is available right away; no lesson needs to be finished first. |
| D21 | Entry points | The Duel tab stays, and the globe gets a **Rome pin with the Colosseum** that opens the duel lobby (§10.1). |
| D22 | Player card in match | Name + avatar + level in the match's story, for both players. |
| D23 | Scope outside the duel | We change: `xp_event` writes on lesson completion and `Stats.totalXp` read from `xp_event`. Profile ("Twoje historie" levels) and the end-of-lesson "Lv 3 → 4" line get a contract (§9) and are wired by their owners. |

## 3. Removed / replaced from v1

- `duel_category` (instruments, risk, costs, money-basics, psychology) and the 75 questions in `duel_question` (V11, V14): **dropped** by a new migration. Categories now come from `stories.json`, and questions from `content/duel/*.json`.
- `duel_progress` (xp, elo, human_matches): replaced by `xp_event`.
- Elo: `EloService`, `elo_delta_*`, the calibration logic and every Elo DTO field.
- BOT mode: bot personas, `BotService` level scaling, the up-front `RivalPlan`, which is replaced by the lazy mirror simulation (§5.1).
- `GET /api/duel/progress/{userId}`: replaced by `GET /api/xp/{userId}/categories`.

## 4. Data model

### 4.1 `xp_event` (new, shared ledger)

```sql
CREATE TABLE xp_event (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     VARCHAR(64) NOT NULL,
    category    VARCHAR(32) NOT NULL,          -- story id from stories.json; validated in code (content is JSON, no FK)
    source      VARCHAR(8)  NOT NULL CHECK (source IN ('LESSON', 'DUEL')),
    source_ref  VARCHAR(64) NOT NULL,          -- lesson id ("berlin-1") or duel_match.id
    xp          INT         NOT NULL CHECK (xp > 0),
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, source, source_ref)       -- idempotent: one row per lesson / per match
);
CREATE INDEX xp_event_user_cat_idx ON xp_event (user_id, category);
CREATE INDEX xp_event_created_idx  ON xp_event (created_at);
```

- Story XP = `SUM(xp)` per `(user_id, category)`. Level comes from that sum through `LevelCurve`, which moves to a shared `xp` package.
- Weekly XP = the same sum with `created_at` in the current week (§7).
- **Duel**: one row per match for the player, `xp = 5 × correct`, no row when 0. It is written when the player has answered everything, not when the match settles, so the waiting screen can already show the XP.
- **Lesson**: `LessonProgress.complete` (first completion only, as today) also writes `xp_event(source='LESSON', source_ref=<lesson id>, category=<lesson.story>, xp=<lesson xp>)`, in the same transaction.
- `Stats.totalXp` (AccountController) = `SUM(xp_event.xp)` for the user, so profile, lobby and ranking show the same numbers. `lesson_completion.xp` stays as the lesson's own record.

### 4.2 Migration `V<next>__duel_v2.sql`

Never edit pushed migrations; add one. Main now has V1–V5 and V10–V16, so this is **V17** unless another branch takes it first.

1. Create `xp_event`.
2. Back-fill `xp_event` from the existing `lesson_completion` rows (`category` = the story prefix of `lesson_id`; skip `legacy-*` ids).
3. Drop `duel_answer`, `duel_match_question`, `duel_match`, `duel_question`, `duel_progress`, `duel_category`. The v1 tables reference numeric question ids and old categories; nothing worth keeping.
4. Recreate the match tables for v2: `duel_match` (mode `HUMAN|SOLO`, `category` VARCHAR story id, `rival_user_id`, `status`, scores, `seen_by_player BOOLEAN`, timestamps) and `duel_answer` (`question_id` VARCHAR, the JSON question id, `correct`, `outcome`, `ms_taken`, `rival_answer_at`, the lazy rival schedule). Keep the column shapes close to v1 so the persistence code ports over.
5. Demo players' weekly XP: **seed at startup, not in the migration.** A dev/demo-only `ApplicationRunner` inserts `xp_event` rows for the `demo-*` accounts dated relative to `now()` (spread over the last ~3 weeks, a good part inside the current week), and skips this if this week's demo rows exist already. `demo-user` lands mid-table, so a won duel visibly moves them up. A fixed-date migration would leave the weekly ranking empty if the DB is created days before the demo. (`make dev` now resets the DB on every run, which also helps.)

## 5. Match

```
lobby (Duel tab or Rome pin): story tile + mode (Human / Solo)
  → matchmaking (short, as today)
  → 6 questions, own pace, per-question countdown, short right/wrong after each
  → player done → waiting screen (if rival not done) → result + review
                       └─ "Wróć później" → lobby pending card → result
```

### 5.1 Rival simulation (HUMAN)

The rival is a random `demo-*` account from `account`; its card shows its real story level.

The rival never answers before the player. When the player answers or times out on question `k` at `t_k`, the rival's answer to `k` is fixed at `t_k + U(1000, 4000) ms` and stored on that `duel_answer` row. The server works it out on every `answer`/`state` call (no timers).

Rival correctness on `k` is decided at the player's answer `k`. Let `p` be the player's correct count after `k`, `r` the rival's correct count before `k`, and `target = max(p − 1, 0)`:

- `r < target` → the rival is correct;
- otherwise → the rival is wrong.

This keeps `r = max(p − 1, 0)` after every question, so the final score is `playerScore − 1`, and 0:0 when the player scores 0.

Optional, for a less mechanical feel: the rival may also be wrong while `r < target`, as long as `target − r ≤ questions left`. The final score must not change.

The rival's answers show only as its dots, never in the review.

### 5.2 Finish and settle

- **Player finished**: all 6 answered or timed out. The `xp_event` row is written now, and the response carries `yourFinal { score, xpGained }`.
- **Match finished**: the rival's last scheduled answer time has passed. This settles lazily on the next `state`/`result` call. Outcome WIN / DRAW (LOSS stays in the enum but cannot happen under D13).
- **Leaving**: allowed at any time. The match stays `IN_PROGRESS` until it settles. The lobby lists unseen results (§8).
- **Mid-question exit**: unanswered questions time out, and the rival follows each timeout with its delay.

### 5.3 Grading on the server

The client sends a step-specific answer and the backend grades it from the JSON (the answer key never leaves the server before the question is answered):

| Type | Client sends | Correct when |
|---|---|---|
| `quiz` | `option` (index in the shown order) | it is the right option |
| `predict` | `value` | `abs(value − answer) ≤ tolerance` |
| `chart` (§5.4) | `value` | `abs(value − answer) ≤ tolerance` |
| `sort` | `mistakes` | `mistakes == 0` |
| `match` | `mistakes` | `mistakes == 0` |

`sort`/`match` are checked as the user goes, like in lessons, so the server trusts the client's mistake count (no auth in the prototype anyway). The other types are graded on the server.

### 5.4 Question content and types

Duel questions are **variations of the story's lesson steps**, not copies: same idea and step type, new numbers or situation, and one right answer. Every question carries `lessonId` (its source lesson) for the review link.

Lesson `predict` and `slider-chart` have no wrong answer, so the duel uses graded versions:

- **`predict`**: as in the lesson (slider guess, then reveal) plus a `tolerance`. Example: "Lena trzyma 25 000 € na koncie na 0,5%. Inflacja 3%. Ile realnie będzie warte za 10 lat?"
- **`chart`**: a duel-only type built on the lesson's slider-chart models (`lib/models.ts`, same renderer). The chart is shown with fixed parameters, and the user answers one value with a slider within a `tolerance`. Example: "Po ilu latach 10 000 € straci 1/4 siły nabywczej przy inflacji 3%?" (answer read from the `realValue` curve). There is no "reach the goal" mode and no hint: in the duel the chart is a question, not a sandbox.

**Berlin demo set (fixed order)**:
1. `quiz`, from berlin-1, real return with different rates;
2. `predict`, from berlin-1/2;
3. `quiz`, from berlin-2 (compound growth);
4. `chart`, from berlin-1 (`realValue`);
5. `sort`, from berlin-3 (what belongs in an emergency buffer);
6. `match`, from berlin-3/4 (concept ↔ definition).

Write the exact content in PL and EN in `content/duel/berlin.json` and review it with the user before building. Fact-check every number with the same models the lessons use.

JSON shape, reusing the lesson `Step` types:

```jsonc
{
  "story": "berlin",
  "demo": true,                      // the one playable story (D19)
  "questions": [
    { "id": "berlin-d1", "lessonId": "berlin-1", "timeLimitMs": null,
      "step": { "type": "quiz", "prompt": "…", "options": ["…"], "correctIndex": 1, "explanation": "…" } },
    { "id": "berlin-d2", "lessonId": "berlin-1",
      "step": { "type": "predict", "prompt": "…", "input": { "kind": "slider", "min": 0, "max": 30000, "step": 500, "unit": "€" },
                "answer": 19400, "tolerance": 1500, "reveal": "…" } }
  ]
}
```

Validate at startup like `LessonRules.validate` (known types and models, a real `lessonId` in the same story, `tolerance > 0` on predict/chart, 4 options on quiz). The front renders `step` with the existing `components/steps/*`. Each step gets a "duel mode" (submit button, no hint, no per-step explanation, timer-driven); the lesson behaviour stays unchanged.

Language: the lesson content is EN with PL coming through variants. Duel content follows whatever the lessons do (`lang` param, `lang:plain` not needed in the duel).

## 6. Timer

```
limitMs = timeLimitMs ?? clamp(base(type) + readingMs(words), 10 s, 60 s)
base:      quiz 12 s · predict 20 s · chart 25 s · sort 20 s · match 25 s
readingMs: ceil(words / 4) × 1 s     -- words in prompt + options/items/pairs, ~240 wpm
```

- The server sets each question's `deadline` (epoch ms) and sends `timeLimitMs`. The client only draws the countdown.
- Tunables in `DuelProperties` (`app.duel.*`).
- No points for speed. `ms_taken` is logged for analytics.

## 7. Ranking

- `GET /api/duel/rankings?category=<story|omit>&userId=` returns the weekly ranking. Without `category` it is the sum over all stories.
- Week = ISO week, Monday 00:00 to Sunday 24:00, `Europe/Warsaw`, through the injected `Clock`.
- Row: rank, name, avatar, level (story level, or the level from total XP through the same curve in the overall ranking), weekly XP.
- Top 50 plus the caller's own row (`me`, null without XP this week).
- Lobby league card = the caller's overall weekly rank and XP.

## 8. API

Mirror every change in `front/src/types/duel.ts` and announce it (shared contract).

```ts
type DuelMode = 'HUMAN' | 'SOLO';

/** GET /api/duel/categories?userId= — lobby grid, one tile per story in stories.json order. */
type DuelCategory = {
  story: string;            // "berlin"
  city: string;             // "Berlin"
  topic: string;            // "Safe money that shrinks"
  icon: string; color: StoryColor;     // from stories.json
  xp: number; level: number; xpIntoLevel: number; xpForLevel: number;
  playable: boolean;        // true only for the demo story
};

type PlayerCard = { name: string; avatar: AvatarId; level: number }; // level in the match story

/** One question as sent to the client: the lesson Step minus its answer fields. */
type DuelQuestion = {
  index: number;
  step: DuelStep;           // quiz without correctIndex/explanation, predict/chart without answer, …
  deadline: number;         // epoch ms
  timeLimitMs: number;
};

/** POST /api/duel/matches/{id}/answers */
type AnswerRequest = { userId: string; index: number; option?: number; value?: number; mistakes?: number };

type AnswerResult = {
  index: number; correct: boolean; timedOut: boolean;
  nextQuestion: DuelQuestion | null;
  rivalProgress: RivalSnapshot | null;
  yourFinal: { score: number; xpGained: number } | null;   // set once you answered everything
  finished: boolean;
};

type ReviewItem = {
  step: Step;               // full step with the answer, for the review screen
  yourAnswer: { option?: number; value?: number; mistakes?: number } | null;  // null = timed out
  correct: boolean;
  lessonId: string;         // "Powtórz lekcję" → /lesson/[id]
  lessonTitle: string;
};

type MatchEnd = { /* v1 minus Elo */ xpGained: number; review: ReviewItem[] };

/** GET /api/duel/matches/pending?userId= — lobby cards. */
type PendingMatch = {
  matchId: number; story: string; rival: PlayerCard;
  status: 'RIVAL_PLAYING' | 'FINISHED_UNSEEN';
  score: number; rivalScore: number | null; outcome: MatchOutcome | null;
};

/** GET /api/xp/{userId}/categories — for the profile, the end of a lesson and other modules. */
type CategoryXp = { category: string; xp: number; level: number; xpIntoLevel: number; xpForLevel: number; weeklyXp: number }[];
```

`seen_by_player` is set when the player opens `GET /api/duel/matches/{id}`.

## 9. Contract for other modules

- **Lessons** (we wire it, §4.1): first completion writes `xp_event`. `LessonResultResponse.totalXp` then comes from `xp_event`.
- **End of lesson** (lesson owner): "+50 XP · Berlin Lv 3 → 4" from `GET /api/xp/{userId}/categories` before and after.
- **Profile** (profile owner): a "Twoje historie" section with level + bar per story from the same endpoint.

## 10. UI (Figma first, then code)

Designs come from Figma (Design Kit styles). The user will say when to start.

### 10.1 Rome pin on the globe

- A pin at Rome (≈ 41.89, 12.49) with a **Colosseum** landmark/icon, labelled "Arena" / "Duel". It is not a story: it is not in `/api/stories` and has no progress ring.
- `Globe` gets one extra pin, e.g. an `arena` prop (`{ pin, onOpen }`). Tap: the plane flies to Rome, then the callout says "Arena · Zmierz się z innymi" with a button that opens the Duel tab (lobby).
- Coordinate with the globe owner ([`globe-home-spec.md`](globe-home-spec.md)): the pin must not break the "exactly one current story" logic or the plane's start point.
- For the story hero there is a new `LandmarkKind` `colosseum` only if the lobby header reuses the skyline. Optional.

### 10.2 Screens

1. **Lobby**
   - Header + weekly league card.
   - Pending match cards ("Duel z Olą · rywal jeszcze gra", "Wygrałeś 5:4 → zobacz").
   - Mode toggle Human / Solo (Solo: "Trening · bez XP").
   - **3-column grid of story tiles** in the story's colour and icon: city, short topic, level, thin XP bar. All tiles look equal (no badge on Berlin).
   - Non-Berlin tap → toast "Ta kategoria będzie dostępna wkrótce", with no request.
2. **Match player cards**: name, avatar, "Lv N · Berlin".
3. **Question**:
   - countdown bar from `timeLimitMs`;
   - the step renderer in duel mode;
   - a "Zatwierdź" button for slider types;
   - a ~1 s right/wrong banner.
4. **Waiting screen**:
   - your result + XP right away ("5/6 poprawnych · +25 XP");
   - the rival's dots filling live;
   - a small "Wróć później" link.
5. **Result + review**:
   - outcome and score;
   - XP (same rule win or lose);
   - per question: your answer vs the right one, the explanation, and "Powtórz lekcję: <tytuł>" → `/lesson/[id]`, shown on every question and highlighted on the wrong ones.
6. **Rankings**: weekly only. Chips "Ogólny" + one per story. Value = XP this week.

Remove: the Elo subtitle, the calibration state, the bot icon, the Bot mode card, and the v1 category icons.

## 11. Tests

- Backend:
  - rival invariant over all 2⁶ player answer patterns (final = `max(p−1,0)`; the rival never answers before the player);
  - grading per type, with tolerance edges;
  - timer formula and override;
  - weekly window edges with a fixed `Clock` (`Europe/Warsaw`);
  - duel XP written once (idempotent), 0 in SOLO;
  - lesson completion writes `xp_event` once, and `totalXp` matches;
  - pending/seen flow;
  - duel content validation at startup (bad `lessonId`, missing tolerance);
  - migration with `ddl-auto=validate`.
- Front:
  - the reducer goes `yourFinal` → waiting → `match.end`;
  - each step component in duel mode submits once and reports the right payload;
  - lobby: a non-Berlin tile shows the toast and makes no request.
- Playwright:
  - Rome pin → lobby → Berlin duel → waiting → result → "Powtórz lekcję" opens the lesson;
  - leaving the waiting screen → pending card → result.

## 12. Out of scope

Elo, all-time and friends rankings, bots, speed or win bonuses, real multiplayer, rematch, duel content for Seoul / São Paulo / Tokyo (the tiles exist; questions come later), and the profile and end-of-lesson UI (contract only).

## 13. Open points to confirm while building

- The exact text of the 6 Berlin questions (PL + EN): to be reviewed with the user.
- Where the Rome pin sits relative to the Berlin pin (they are close on the globe; check the callouts do not overlap).
