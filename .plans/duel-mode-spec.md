# Duel mode (F8): live 1v1 knowledge duels

**Status:** spec v3, nothing implemented. Interviews with the F8 owners on 2026-11-20.
**Inspiration:** the Polish app *Quiz House* by Matura To Bzdura: live 1v1, 6 questions with 4 answers, a separate ranking per category.
**Parking lot:** [`duel-open-topics.md`](duel-open-topics.md)

> Items marked **(proposal)** are not decided yet. Everything else was agreed in an interview.

## What changed since v2

- **Rankings use Elo, not XP.** Elo is kept per category plus an overall value. Only matches between humans change it. XP only drives levels.
- **New solo mode.** It uses the same format with no rival.
- **On a disconnect the bot no longer takes over.** The clock keeps running, unanswered questions count as wrong, the player can rejoin, and the final score always counts.
- XP is the same against a bot and against a human. XP has no effect on matchmaking or rankings.
- Matchmaking looks for a rival with similar Elo first, then accepts anyone.
- The weekly league ranks Elo gained this week.
- Content: **15 questions per category (5 / 5 / 5)**, in **Polish and English**, following the app's global language setting.
- Duel tab position: **Bank / Map / Glossary / Duel / Profile**.
- Confidence measurement was **removed from F8**. Duel mode is a learning minigame; confidence belongs to the simulations.
- Accounts are mocked by the account team. We only use them. There are no direct challenges, only the random queue.

---

## 1. Why this module matters for the judging

| Criterion | What duel mode gives |
|---|---|
| Relevance | Self-directed investors test themselves on investing concepts. Mistakes are explained right after the match. |
| Technical | Live WebSocket play with a server that decides everything: timers, scoring and answer checks. The client never receives the correct answer early. Elo matchmaking. One protocol serves human, bot and solo matches. |
| Innovation | A social, competitive learning loop on top of a bank app. Ranked by knowledge (Elo), never by profit, so there is no gambling effect. |
| Design | Fits the Finance Quest kit. Two players see each other's progress live. |
| Demo | Two phones on stage play a live match. If anything breaks, the bot plays the same flow. |

## 2. Naming rule

The idea is "Quiz House", but **no code, route, table, package, file or UI string contains "quiz house"**.

- Technical name: `duel`. Java package `com.collabothon.back.duel`, REST `/api/duel/*`, WebSocket `/ws/duel`, tables `duel_*`, frontend routes `duel*`.
- UI copy: "Pojedynek" (PL) / "Duel" (EN).

## 3. Scope

**In (F8):** lobby, three modes (vs human, vs bot, solo), category choice, Elo matchmaking, live match, result screen with explanations, XP and levels per category, Elo per category, rankings (per category, overall, friends, weekly league), the answer log.

**Out:**
- Owned by other teams: account and the mocked accounts, friends list, lesson path, profile screen, avatar, glossary, recommendations (F6/F7).
- Confidence measurement: belongs to the simulations.
- Challenging a specific player: only the random queue.

**Depends on other teams:**

| Need | From | Until it exists |
|---|---|---|
| Mocked accounts: `userId`, display name, avatar | Account team | Agree the contract early. Until then, a hard-coded list in the client. |
| Friends list | Account team | Seeded data |
| App language (PL/EN) | Whoever owns settings / i18n | Default to EN |
| Global XP / level | Profile (F12) | Duel exposes `GET /api/duel/progress/{userId}`; they decide how to fold it in |
| 5-tab bottom bar | Design-system owner | Agree on it before building the tab |

## 4. Modes

| Mode | Rival | XP | Elo |
|---|---|---|---|
| **Vs human** | Random player from the queue | 8 per correct answer + 20 for a win / 10 for a draw | Yes |
| **Vs bot** | Server bot at about your level | Same as vs human | No |
| **Solo** | None | 8 per correct answer only | No |

All three use the same format: 6 questions, 4 answers, 40 s per question, explanations at the end.

## 5. Player flow

```
Duel tab (lobby)
  ├─ choose mode: [Vs human] [Vs bot] [Solo]
  ├─ choose category (shows my level and Elo in each)
  ▼
Matchmaking (vs human only)
  │  0–5 s: look for a rival within ±150 Elo in this category
  │  after 5 s: accept anyone in the queue
  │  after 10 s: offer "Play a bot instead" (the player may keep waiting)
  ▼
Match: 6 questions at your own pace, 40 s each
  ├─ after each answer: green ✓ / red ✗ on the option you chose (no explanation yet)
  ├─ rival strip (not in solo): "Rival 3/6" plus their ✓/✗ dots
  ▼
You finished → "Waiting for your rival…" (their progress keeps updating)
  ▼
Result: score, outcome, XP, level bar, Elo change, mistakes with explanations
  └─ [Play again in this category] [Rankings] [Back to lobby]
```

### Match rules

| Rule | Value |
|---|---|
| Questions | 6, the same for both players, in the same order |
| Answers | 4 options, exactly one correct, option order shuffled per match |
| Time per question | 40 s. The server sets a deadline for each player and each question. |
| Pace | Each player moves at their own pace. The match does not advance in lock-step. |
| No answer by the deadline | "No answer". It scores the same as a wrong answer, and the next question starts. |
| Score | 1 point per correct answer. **Speed never counts.** |
| Outcome | Higher score wins. An equal score is a **draw**; there is no tie-break. |
| Match end | Both players have finished 6 questions, answered or timed out. Worst case is 6 × 40 s = 4 min. |
| Feedback during the match | ✓/✗ on your own answer only. The correct option is shown only on the result screen. |
| After answering | A short "Not quite / Right" banner and a **Next question** button. The next question also starts automatically after 3 s **(proposal, from the design)**. |
| Rival visibility | Count answered and ✓/✗ per question, never which option they picked |

### Disconnects

The rule is simple: **the clock does not stop, and the final score always counts.**

- A disconnected player's questions keep timing out, one deadline after another. Each one counts as "no answer".
- The player can rejoin at any time before the match ends and continues from the question that is current. Questions already timed out stay timed out.
- The rival is not affected and keeps playing.
- Elo and XP come from the final score, the same as any other match. No extra penalty and no bot takeover.
- If neither player is connected when the match ends, it is marked `ABANDONED` and nothing changes **(proposal)**.

## 6. XP and levels

- Each category has its own level from **1 to 500**. XP comes from all three modes (see §4).
- XP **only** drives the level. It has no effect on Elo, matchmaking or rankings.
- **Cost to go from level `n` to `n+1`:** `cost(n) = round(20 + 2 · n^1.15)`.
- Store only the category's **total XP**. Compute the level from a table of 500 thresholds built at startup, so the curve can be retuned without a data migration.

| Reach level | Total XP | ≈ Matches at 50 XP | Cost of the next level |
|---|---|---|---|
| 2 | 22 | <1 | 24 |
| 10 | 298 | 6 | 48 |
| 50 | 5 073 | 101 | 200 |
| 100 | 20 343 | 407 | 419 |
| 200 | 85 921 | 1 718 | 906 |
| 300 | 202 255 | 4 045 | 1 432 |
| 500 (max) | 599 433 | 11 989 | — |

Every level costs more than the one before it, and level 500 is never out of reach.

## 7. Elo and rankings

### Elo
- One Elo per player **per category**. The starting value is **1000**.
- Only **vs human** matches change Elo. Bot and solo matches never do.
- Expected score: `E = 1 / (1 + 10^((Elo_rival − Elo_you) / 400))`. Actual score `S` is 1 for a win, 0.5 for a draw and 0 for a loss. The margin (6:0 or 4:3) does not matter.
- `Elo_new = Elo_old + K · (S − E)`. K = **32** for the first 10 human matches in that category, then **16**.
- **Calibration:** a player appears in a category ranking only after **5 human matches** in that category. Before that they see their Elo with a "calibrating" label.
- **Overall Elo** = the average Elo of the categories where the player is calibrated **(proposal)**.

### Rankings

| View | Sorted by | Who appears |
|---|---|---|
| Per category | Category Elo | Calibrated in that category |
| Overall | Overall Elo | Calibrated in at least one category |
| Friends | Overall Elo | Friends (from the account team) plus you |
| Weekly league | Elo gained since Monday 00:00 (Europe/Berlin), summed over all categories | Played at least one human match this week |

- Each list shows the top 50 and pins "you" at the bottom.
- No money, returns or portfolio value anywhere in a ranking.

## 8. Question selection

1. In a human match, use the **lower** of the two players' category levels. In bot and solo matches, use the player's own level.
2. Pick a difficulty for each of the 6 slots by weight:

| Category level | Easy | Medium | Hard |
|---|---|---|---|
| 1–49 | 70% | 25% | 5% |
| 50–199 | 35% | 45% | 20% |
| 200–500 | 15% | 45% | 40% |

3. Draw a random question of that difficulty with no repeats inside the match. Prefer questions the player has not seen in their last 3 matches **(proposal)**.
4. If a difficulty band runs out, take the nearest band.
5. Shuffle the answer options once per match. Both players see the same order.

## 9. Categories and content

| Slug | PL | EN | Covers |
|---|---|---|---|
| `instruments` | Instrumenty | Instruments | Stocks, bonds, ETFs, funds, how an exchange works |
| `risk` | Ryzyko i dywersyfikacja | Risk & diversification | Volatility, correlation, time horizon, rebalancing |
| `costs` | Koszty i podatki | Costs & taxes | Fees, TER, spread, tax on gains (generic, not country-specific) |
| `money-basics` | Inflacja i procent składany | Inflation & compounding | Real return, interest, compounding, emergency fund |
| `psychology` | Psychologia inwestora | Investor psychology | FOMO, loss aversion, herd behaviour, overconfidence |

- **15 questions per category: 5 easy, 5 medium, 5 hard.** That is 75 questions, each in PL and EN.
- **Language:** follows the app's global language setting. Two rivals can play in different languages, because a question has one id and two translations.
- **Question shape:** like the lesson `Question` already in the repo (`prompt`, `options`, `correctIndex`, `explanation`), plus `difficulty` and a second language.
- **Writing rules:**
  - Test concepts and consequences. Never "should you buy X", never a product or ticker as the right answer.
  - Each `explanation` is at most 2 sentences and says *why*, not just *what*.
  - Exactly one option is clearly correct. No "all of the above".
  - Plain language that works for a student and a pre-retiree alike.
  - The PL and EN versions must mean the same thing, with options in the same order.
- No concept tags or glossary links for the hackathon.

## 10. Bot

- **Bot level:** the player's category level ± a random 10%, clamped to 1–500.
- **Accuracy:** `P(correct) = clamp(0.45 + 0.40 · √(level / 500), 0.45, 0.85)`. That is 47% at level 1, 63% at level 100 and 85% at level 500.
- **Answer time:** random 8–30 s. It only affects how the rival strip looks.
- **Identity:** a few named bot personas with avatars, clearly marked as bots in the rival card. Bots never appear in rankings and have no Elo.
- The bot runs **on the server** and sends the same messages a human would, so the frontend has one code path.

## 11. Design

### Fit with the team Figma kit
Observed in *Finance Quest — Globe Learn Screen*:
- dark teal for hero surfaces, yellow for the primary CTA and the active tab, a misty light background;
- white cards with a large corner radius, pill chips (streak, XP), a floating pill bottom bar, the Inter font.

- **Follow the team screens, not a new style:** light screens use the kit's top gradient (`bg/tint` → `bg/canvas`); dark teal only for accent cards (the league card uses the Account Summary gradient; scoreboards copy the "Rank up" card) and for matchmaking, which mirrors the Welcome screen. Players are shown with the **Explorer Avatar** component, never coloured initials. Flow screens use 24 px side margins and a gold overline (`feedback/xp`); the main action is a full-width yellow `Button / Large` at the bottom. Answers mirror the onboarding `Option Card`; feedback mirrors the "Quick check" banner.
- **Bottom bar:** Bank / Map / Glossary / **Duel** / Profile. The icon is crossed swords or a trophy.
- `front/src/constants/theme.ts` still has a placeholder green palette. The Figma kit is the source of truth; align before building screens.
- Correct and wrong answers use colour **plus** ✓/✗ icons, never colour alone.
- A match runs full-screen with no tab bar, like a lesson.

### Screens

```
1. Lobby (Duel tab)               2. Matchmaking                 3. Question
┌────────────────────────┐        ┌────────────────────────┐     ┌────────────────────────┐
│ Duel        🔥5  ⚡120 │        │   You   vs    ???      │     │ You ✓✗○○○○  Rival ✓✓✓○○○│
│ [Human] [Bot] [Solo]   │        │ Elo 1084  Psychology   │     │           ◔ 27s        │
│                        │        │                        │     │ Question 3 of 6        │
│ Instruments Lv42 1084  │        │  Looking for a rival…  │     │ What does diversifi-   │
│ Risk        Lv18 1012  │        │         0:06           │     │ cation reduce?         │
│ Costs       Lv 7  ⏳   │        │                        │     │ ┌────────────────────┐ │
│ Money basics Lv3  ⏳   │        │ [Play a bot instead]   │     │ │ A  ...             │ │
│ Psychology  Lv 1  ⏳   │        │ [Cancel]               │     │ └────────────────────┘ │
│ (⏳ = calibrating)     │        └────────────────────────┘     │  B / C / D ...         │
│ 🏆 Rankings · League › │                                       └────────────────────────┘
└────────────────────────┘

4. Waiting                        5. Result                      6. Rankings
┌────────────────────────┐        ┌────────────────────────┐     ┌────────────────────────┐
│ You're done: 4/6       │        │      WIN  4 : 3        │     │[Category][All][Friends]│
│ Rival is on question 5 │        │ +52 XP   Elo +14       │     │[League]                │
│ Rival ✓✗✓✓○○           │        │ Instruments Lv 42 → 43 │     │    🥈   🥇   🥉        │
│                        │        │ ▓▓▓▓▓▓▓▓░░             │     │  4. Ola     1 342 Elo  │
│                        │        │ Your mistakes (2)      │     │  5. Marek   1 298 Elo  │
│                        │        │ Q2 … ✗ you: B  ✓: C    │     │ ─────────────────────  │
│                        │        │   why: two sentences   │     │ 17. You     1 084 Elo  │
│                        │        │ [Play again][Rankings] │     └────────────────────────┘
└────────────────────────┘        └────────────────────────┘
```

**Solo:** no rival strip and no waiting screen. The result shows the score and XP only.

States to design: connecting, you reconnected (missed questions shown as "no answer"), rival disconnected (their dots stop and then time out), a question timed out, no rival found, calibrating, empty rankings.

### Figma
Drawn in the team file, section **"Duel (F8) · 1v1 knowledge duels"** ([open](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/Finance-Quest-%E2%80%94-Globe-Learn-Screen?node-id=67-3047)). Built from the kit's variables, text styles and components.

| # | Frame | Shows |
|---|---|---|
| 1 | Duel — Lobby | Mode picker, league card, categories with level and Elo (or "Calibrating n/5"), 5-tab bar |
| 2 | Duel — Matchmaking | Elo search timeline (±150 → anyone → bot offer at 10 s) |
| 3 | Duel — Question | Scoreboard with both players' ✓/✗ dots, 40 s timer, 4 answers |
| 4 | Duel — Answer feedback | Only your pick is marked; correct answer withheld |
| 5 | Duel — Waiting | Your score, rival's live progress, capped wait |
| 6 | Duel — Result | 4 : 3 win, +52 XP, +18 Elo, level bar, mistakes with "why" |
| 7 | Duel — Rankings | Category / Overall / Friends / League, podium, pinned "you" row |
| 8 | Duel — Edge states | Reconnect, rival offline, bot rival, solo result, draw |
| — | Duel · Design Kit additions | New icons (swords, trophy, bot, users, target, timer, x, brain, wifi-off), `Answer Option` (Default / Wrong / Correct / Dimmed), chips |

The demo story is consistent across frames: Alex, Investor psychology, Lv 12 → 13, Elo 1 084 → 1 102, beats Marek 4 : 3.

## 12. Architecture

> **Transport (current, supersedes the WebSocket/STOMP material below):** every mode runs over plain REST plus 1 s polling, like the rest of the app: `POST /api/duel/matches`, `POST /api/duel/matches/{id}/answers`, `GET /api/duel/matches/{id}/state`, `GET /api/duel/matches/{id}` (result). There are no sockets, schedulers or timers: each request resolves question timeouts lazily from the server clock. PvP is mocked for the demo: in HUMAN mode the server picks an existing account with duel progress closest to your Elo and simulates its answers (accuracy from its level, 8 to 30 s per answer, drawn at match start); Elo moves for both as before. The sections below are kept for the rules and data model; the contract is `front/src/types/duel.ts`.

> **Authoritative contracts (override the sketches below if they differ):**
> - Schema: `back/src/main/resources/db/migration/V10__duel.sql` (V1–V3 are on main, V4–V6 are taken by the categorization branch). It adds `duel_player (user_id, display_name, avatar 1–4)` for names and Explorer Avatars until the account module exposes them, and seeds the 5 categories.
> - Questions: `V11__duel_questions.sql`. Demo players, progress and this week's matches: `V12__duel_demo_data.sql`.
> - Protocol and REST shapes: `front/src/types/duel.ts`. The backend DTOs mirror it field for field.
> - User id: the same string as `user_profile.user_id`; the frontend takes it from `USER_ID` in `front/src/lib/user.ts` (`demo-user` by default).
> - WebSocket: the Metro dev proxy only forwards HTTP `/api/*`, so the client connects straight to the backend: `EXPO_PUBLIC_WS_URL`, else `ws://<API host>:8080/ws/duel` (on web `ws://localhost:8080/ws/duel`). The backend allows the same origins as `app.cors.allowed-origins`.

### Overview
- **Backend:** Spring Boot 4.2, new package `duel`. Needs `spring-boot-starter-websocket`, which is not in `pom.xml` yet.
- **Live transport:** plain WebSocket with JSON messages (`TextWebSocketHandler`), not STOMP. React Native's built-in `WebSocket` works on Android and web with no extra library, and the message set is small.
- **Match state:** held in memory on one backend instance (fine for a hackathon). Final results and every answer are written to Postgres.
- **Timers:** the server owns each deadline and keeps running them while a player is disconnected. The client draws its countdown from the server's `deadline` timestamp, so local clock drift does not matter.
- **Answer safety:** the server never sends the correct option before the result screen.
- **Solo and bot matches:** the same match engine. Solo is a match with no rival. The bot is a server-side player.

### WebSocket protocol (`/ws/duel?userId=<id>&lang=en|pl`)

Client → server:

| `type` | Payload | Notes |
|---|---|---|
| `queue.join` | `{ category, mode: "HUMAN" \| "BOT" \| "SOLO" }` | BOT and SOLO start a match at once |
| `queue.leave` | `{}` | |
| `queue.acceptBot` | `{}` | After the 10 s offer |
| `answer` | `{ matchId, index, option }` | `option` is 0–3 in the shuffled order shown |
| `match.resume` | `{ matchId }` | After a reconnect. The server replies with the current state. |

Server → client:

| `type` | Payload |
|---|---|
| `queue.waiting` | `{ elapsedSec, widened }` (`widened` is true after 5 s, when any Elo is accepted) |
| `queue.botOffer` | `{}` |
| `match.start` | `{ matchId, mode, category, you: {name, level, elo}, rival: {name, level, elo, avatar, isBot} \| null, questionCount: 6 }` |
| `question` | `{ index, prompt, options[4], deadline }` (epoch ms, in the player's language) |
| `answer.result` | `{ index, correct, timedOut }` |
| `rival.progress` | `{ answered, results: [true, false, null…], connected }` |
| `match.state` | Full snapshot after `match.resume`: own results so far, the current `question`, `rival.progress` |
| `match.waiting` | `{}` (you finished; the rival has not) |
| `match.end` | `{ outcome, score, rivalScore, xpGained, levelBefore, levelAfter, xpIntoLevel, xpForLevel, eloBefore, eloAfter, review: [{prompt, options, yourOption, correctOption, explanation}] }` |
| `error` | `{ code, message }` |

`eloBefore` and `eloAfter` are null in bot and solo matches. `review` lists all 6 questions, and the result screen shows the wrong ones first.

### Match state machine

```
QUEUED ──rival found / bot accepted / solo──► IN_PROGRESS ──all 6 answered or timed out for both──► FINISHED
   │                                              │
   └─leave──► (dropped)                           └─nobody connected at the end──► ABANDONED
```

### REST

| Method & path | Returns |
|---|---|
| `GET /api/duel/categories?userId=&lang=` | `[{ slug, name, icon, xp, level, xpIntoLevel, xpForLevel, elo, humanMatches, calibrated }]` |
| `GET /api/duel/rankings?scope=category\|overall\|friends\|weekly&category=&userId=` | `{ top: [{rank, userId, name, avatar, value}], me: {rank, value} \| null }` |
| `GET /api/duel/matches/{id}?userId=&lang=` | Same as `match.end`, so the result screen survives a reload |
| `GET /api/duel/progress/{userId}` | **Contract for profile and F6/F7:** `[{ category, xp, level, elo, accuracyLast30d }]` |

### Data model (new Flyway migration)

The next free version today is **`V3__duel.sql`**. Other teams may also take V3 on parallel branches, so check before merging and renumber if needed. `user_id` is a string so it fits whatever id the mocked accounts use.

```sql
CREATE TABLE duel_category (
    id       BIGSERIAL PRIMARY KEY,
    slug     VARCHAR(32)  NOT NULL UNIQUE,
    name_en  VARCHAR(100) NOT NULL,
    name_pl  VARCHAR(100) NOT NULL,
    icon     VARCHAR(8)   NOT NULL,
    position INT          NOT NULL
);

-- Separate from lesson `question`: that table requires a lesson_id.
CREATE TABLE duel_question (
    id             BIGSERIAL PRIMARY KEY,
    category_id    BIGINT     NOT NULL REFERENCES duel_category (id),
    difficulty     VARCHAR(8) NOT NULL CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
    prompt_en      TEXT       NOT NULL,
    prompt_pl      TEXT       NOT NULL,
    options_en     TEXT[]     NOT NULL,   -- exactly 4, same order as options_pl
    options_pl     TEXT[]     NOT NULL,
    correct_index  INT        NOT NULL,
    explanation_en TEXT       NOT NULL,
    explanation_pl TEXT       NOT NULL
);

CREATE TABLE duel_match (
    id           BIGSERIAL PRIMARY KEY,
    mode         VARCHAR(8)  NOT NULL,    -- HUMAN, BOT, SOLO
    category_id  BIGINT      NOT NULL REFERENCES duel_category (id),
    player_a     VARCHAR(64) NOT NULL,
    player_b     VARCHAR(64),             -- null for BOT and SOLO
    bot_name     VARCHAR(64),
    bot_level    INT,
    status       VARCHAR(16) NOT NULL,    -- IN_PROGRESS, FINISHED, ABANDONED
    score_a      INT, score_b INT,
    xp_a         INT, xp_b    INT,
    elo_delta_a  INT, elo_delta_b INT,    -- null unless HUMAN; summed for the weekly league
    started_at   TIMESTAMPTZ NOT NULL,
    ended_at     TIMESTAMPTZ
);

CREATE TABLE duel_match_question (
    match_id     BIGINT NOT NULL REFERENCES duel_match (id) ON DELETE CASCADE,
    position     INT    NOT NULL,         -- 0..5
    question_id  BIGINT NOT NULL REFERENCES duel_question (id),
    option_order INT[]  NOT NULL,         -- shuffled order shown to both players
    PRIMARY KEY (match_id, position)
);

-- One row per question per player, including timeouts. Also the answer log for F6/F7.
CREATE TABLE duel_answer (
    id           BIGSERIAL PRIMARY KEY,
    match_id     BIGINT      NOT NULL REFERENCES duel_match (id) ON DELETE CASCADE,
    user_id      VARCHAR(64) NOT NULL,    -- a bot's answers use 'bot:<name>'
    question_id  BIGINT      NOT NULL REFERENCES duel_question (id),
    position     INT         NOT NULL,
    chosen_index INT,                     -- index in the original options; null on timeout
    correct      BOOLEAN     NOT NULL,
    outcome      VARCHAR(8)  NOT NULL,    -- ANSWERED, TIMEOUT
    ms_taken     INT,
    created_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE duel_progress (
    user_id       VARCHAR(64) NOT NULL,
    category_id   BIGINT      NOT NULL REFERENCES duel_category (id),
    xp            INT         NOT NULL DEFAULT 0,
    elo           INT         NOT NULL DEFAULT 1000,
    human_matches INT         NOT NULL DEFAULT 0,   -- K factor and calibration
    PRIMARY KEY (user_id, category_id)
);
```

Seeding (`V4__duel_seed.sql`): 5 categories, 75 questions in two languages, and Elo/XP history for the mocked accounts. The demo user must already be calibrated in at least one category so they show up in the rankings. Hibernate runs with `ddl-auto=validate`, so the entities must match this exactly.

### Frontend (Expo Router)

| Path | Role |
|---|---|
| `src/app/(tabs)/duel.tsx` | Lobby: mode toggle, categories with level and Elo, entry to rankings |
| `src/app/duel/match.tsx` | Full-screen match: matchmaking → questions → waiting → result. Owns the socket. |
| `src/app/duel/rankings.tsx` | Rankings with 4 segments |
| `src/lib/duel/socket.ts` + `useDuelMatch` hook | Socket, reconnect with `match.resume`, a reducer over server messages |
| `src/types/duel.ts` | Mirrors the protocol above |

The match screen is a single reducer over server messages, so human, bot, solo and reconnect cases all render the same way.

### Testing
- Backend: unit tests for scoring, XP and levels, Elo (K switch, draws), question selection, and the bot's accuracy distribution. Integration tests of a full bot match and of a disconnect-and-resume over the WebSocket, using Testcontainers (already in `pom.xml`).
- Frontend: reducer tests that replay recorded message sequences, including a reconnect.

## 13. Demo script (about 90 s)

1. Open the **Duel** tab and show the level and Elo per category.
2. Choose **Vs human** and **Investor psychology**. A teammate's phone joins, and the match starts on both screens.
3. Answer; the audience sees the rival strip fill in live. Miss one question on purpose.
4. The result screen shows **WIN 5:4**, **+60 XP**, the level bar moving up, **Elo +15**, and the explanation of the miss.
5. Open **Rankings → League**: you climbed a place.
6. One line for the jury: "Ranked by knowledge with Elo, never by returns. Every answer is logged to find weak areas."

**Fallback:** if the network fails, run the same flow with **Vs bot**. The screens are the same, except that Elo does not change.

## 14. Build order and cut lines

| Step | Deliverable | If time runs out |
|---|---|---|
| 1 | 75 questions (EN first), a solo and a vs-bot match end to end over the WebSocket, XP and levels, result screen with explanations | **Minimum demo.** Must be done first. |
| 2 | Vs human through the queue, Elo, disconnect and resume | Ship vs bot and solo only. The UI does not change. |
| 3 | Rankings per category and overall | Show only per category |
| 4 | Weekly league and friends | Show static seeded data |
| 5 | Polish translations of the questions and UI | EN only |
| 6 | Elo-banded matchmaking (±150) | Take the first player in the queue |

## 15. Risks

| Risk | Mitigation |
|---|---|
| Venue Wi-Fi drops mid-demo | Resume after reconnect. Rehearse with the bot fallback. |
| Two branches both create `V3` | Check the migration number before merging |
| Questions are wrong, sound like advice, or the PL and EN versions differ | A second person reviews every question against the writing rules (§9) |
| 75 questions in two languages is a lot of writing | Write EN first. PL is step 5 in the build order. |
| A 5-tab bar looks cramped | Agree with the design-system owner early. Fallback: a Duel card on Map. |
| The mocked accounts contract arrives late | Hard-coded user list in the client, the same shape as the agreed contract |
| WebSocket on Android behind the dev proxy | Test on a real device on day 1, not at the end |
