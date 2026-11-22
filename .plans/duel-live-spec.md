# Duel live: human vs human over WebSocket, between the demo accounts

Status: **decided 2026-11-22, not started.** It runs after the v3·7–17 UI stream on `Sarnolek/duel-v3` finishes and the user has committed it.

It builds on:
- `duel-v3-spec.md` (duel-v3, PR #46);
- `demo-accounts-spec.md` (demo-accounts, PR #47: Alex / Daniel / Elena, the account picker and the per-device lock).

## 0. Goal

Two people on two devices, signed in as two different demo accounts, can play the same duel live. Each sees the other's progress dots fill in real time, and the result shows the real scores.

When nobody else is searching, the duel falls back to today's simulated rival, so a single presenter can still demo it.

## 1. Decisions

| # | Topic | Decision |
|---|---|---|
| L1 | Meeting | **A queue with a bot fallback.** "Find a rival" joins a queue. If another account (a different `userId`) is queued within **15 s**, both get a live match. Otherwise the client starts the normal simulated match through the existing REST call. There are no invites and no online list. |
| L2 | Transport | Spring raw WebSocket (`spring-boot-starter-websocket`, `TextWebSocketHandler`) at `/ws/duel`, with JSON messages and no STOMP. On the client, the browser and React Native `WebSocket` API. The URL comes from the API base URL (`http`→`ws`, `https`→`wss`). |
| L3 | What goes over the socket | **Matchmaking and live push only.** Answers stay on the existing `POST /api/duel/matches/{id}/answers`, which grades and persists them. After it saves, the server pushes the update to the opponent's socket. |
| L4 | Data model | Two `duel_match` rows, one per player, as today, each with `rival_user_id` = the other human. A new nullable column `opponent_match_id` links them (in a new Flyway migration, with the next free number checked against main and demo-accounts). Both rows get the **same question list and order**, from one shared selection seed. |
| L5 | Rival answers | In a live match, `rival.snapshot()` and the rival fields come from the **opponent's real `duel_answer` rows**, not from `DuelRivalSimulator`. Put this behind a small strategy: simulated or live. The simulator code stays for bot matches. |
| L6 | Pace | Each player plays at their own pace. The existing per-question timeouts still apply, so a player who leaves times out, every remaining answer counts as wrong, and the match always ends. |
| L7 | End | A player who finishes first sees the existing waiting view, now updated live, until the opponent finishes or times out. The outcome (win / loss / draw) comes from the two real scores, so **the loss screen (frame v3·8) can now really happen**. XP stays 5 per correct answer for each player, as in a bot match. |
| L8 | Opponent left | The socket closes and nothing reconnects within 10 s: push `rival-left`. The live player sees the chip "Rival disconnected · their remaining answers time out". No forfeit logic beyond the timeouts. |
| L9 | Categories | Use the **intersection** of the two players' ticked categories. If it is empty, use the categories of the player who queued first. The match header shows the actual categories. |
| L10 | Same account twice | The demo-accounts lock already prevents it. The queue also never pairs a `userId` with itself. |
| L11 | Scale | In-memory queue and session registry (single backend instance, as in prod). No Redis or broker. |
| L12 | Security | No auth, the same as the rest of the prototype. The socket takes `userId` and `deviceId` as query params and rejects the connection unless the device holds that account's lock (`AccountSessionService`). It listens wherever the backend does, and in dev only on 127.0.0.1. |

## 2. Protocol

**Client → server:**

```json
{"type":"queue","categories":["berlin","tokyo"]}
{"type":"cancel"}
{"type":"ping"}
```

**Server → client:**

```json
{"type":"queued","timeoutMs":15000}
{"type":"matched","matchId":123,"rival":{PlayerCardDto},"categories":["berlin"]}
{"type":"no-rival"}
{"type":"rival-progress","matchId":123,"answered":3,"results":[true,false,true]}
{"type":"rival-finished","matchId":123,"rivalScore":4}
{"type":"rival-left","matchId":123}
{"type":"pong"}
{"type":"error","code":"NOT_LOCKED"}
```

- `matched` is sent to both players at the same moment. Each one gets **their own** `matchId`.
- After `matched`, each client loads its match through the existing `GET /matches/{id}/state` and plays as today.
- Keep polling `/state` as the fallback, so a dropped socket never freezes a match.

## 3. Backend tasks

1. Add the dependency. Write `DuelSocketHandler` (parse and dispatch only), `DuelMatchmakingService` (queue, 15 s timeout through a `ScheduledExecutorService` or `TaskScheduler`, pairing) and `DuelLiveNotifier` (userId → sessions, push).
   - Inject `Clock`.
   - Follow `.claude/skills/spring-boot-best-practices`.
2. Add `DuelMatchService.startLive(userA, userB, categories)`. It creates both rows in one transaction with a shared seed and links them through `opponent_match_id`.
3. Add the live rival strategy (L5). The answer endpoint pushes `rival-progress` and `rival-finished` to the opponent after the commit (`TransactionSynchronization` afterCommit, or an `@TransactionalEventListener`).
4. Outcome: reuse `DuelResultService`. For a live match, the rival score is the opponent's real score. The match finishes only when both are done, or when the opponent's remaining questions have timed out.
5. Write the new Flyway migration (L4).
6. **Do not touch Alex's seeds or the demo seeder numbers** (Alex is frozen).

## 4. Frontend tasks

1. `lib/duel/useDuelSocket.ts`:
   - connect while on the duel screens;
   - auto-reconnect with backoff;
   - mock it in Jest.
2. `MatchmakingView`:
   - "Looking for a rival…" with a 15 s countdown ring and a Cancel button;
   - on `matched`: a short "Rival found!" versus intro (the rival's avatar and name, and a **LIVE** badge), then the first question;
   - on `no-rival`: today's simulated start, with no visible error.
3. The rival dots and the waiting view update from `rival-progress`. Add a LIVE badge on the rival card in live matches.
4. The result screen shows a real loss (frame v3·8) when the opponent wins.
5. Use the current user from `useCurrentUser()` (demo-accounts). Never use the old `USER_ID` constant.

## 5. Tests (targeted only)

- **Backend:**
  - matchmaking unit tests with a movable clock: pair, timeout gives `no-rival`, no self-pairing, cancel, category intersection;
  - one integration test with two `StandardWebSocketClient`s: queue, matched, answer through REST, opponent gets `rival-progress`, both finish, outcomes win and loss;
  - a socket without the lock is rejected.
- **Frontend:** Jest for `useDuelSocket` (mock socket) and for the matchmaking view states.
- **QA (one stack, at most 2 browser contexts):** two Playwright contexts with different device ids, as Alex and Daniel, both press "Find a rival" and play.
  - Screenshots: matched, live dots mid-match, win on one side and loss on the other.
  - Then one context alone, to check the bot fallback after 15 s.

## 6. Out of scope

Invites and challenges, an online list, chat, rematch, reconnecting into a match on a new device, multiple backend instances, auth.
