# collabothon26

- `front/`: Expo (SDK 58) / React Native app with Expo Router. Runs on Android, iOS and web from one codebase.
- `back/`: Spring Boot 4 backend (Java 25, Maven, JPA, Flyway)
- `docker-compose.yml`: Postgres 17
- `Makefile`: shortcuts for everything below (`make help`)

## Prerequisites

- Node 22+ and npm
- Java 25 (e.g. via sdkman)
- Docker (Postgres, and the backend tests via Testcontainers)
- `make` and bash. On Windows, work inside WSL.
- On your phone: the latest **Expo Go** (SDK 58)
- Optional: Android SDK with an emulator

## Quick start

```bash
make setup     # one-time: creates .env from .env.example, runs npm install in front/
               # edit .env and set your own POSTGRES_PASSWORD and DB_PASSWORD (must match)
make dev       # Postgres + backend + browser app (loopback only)
make phone     # Postgres + backend + phone QR via Expo ngrok tunnel
```

`make dev` (and `make phone`) do three things:
1. Starts Postgres in Docker (`127.0.0.1:5433`).
2. Starts the backend in the background (`127.0.0.1:8080`). If one is already running on `:8080`, it uses that one. Logs go to `logs/backend.log` (`tail -f logs/backend.log`).
3. Starts the app once the backend answers (`127.0.0.1:8081`).

Open the app in:
- **Browser (`make dev`):** http://localhost:8081
- **Phone (`make phone`):** scan the printed tunnel QR code with Expo Go (Android) or the camera (iOS).

Ctrl+C stops the backend and the app. Postgres keeps running until `make db-stop`.

If you want the Spring logs in their own terminal, run `make back` and `make web` (or `make phone`) separately instead.

### Network security & phone access

- **Loopback-only by default:** Postgres (`127.0.0.1:5433`), the Spring backend (`127.0.0.1:8080`), and Metro (`127.0.0.1:8081`) bind only to `127.0.0.1`, so nothing is advertised or reachable on shared Wi-Fi / LAN.
- **Phone via tunnel QR:** `make phone` opens an Expo ngrok tunnel (`--tunnel ngrok`, no account needed) on every OS (Linux, macOS, WSL) and prints a QR pointing to a random `*.exp.direct` URL. That tunnel URL is the **only** way into the app from another device — your phone does not need to be on the same Wi-Fi, and Metro (`front/metro.config.js`) proxies both `/api/*` and `/ws/*` to `127.0.0.1:8080` through that same tunnel.
- **Never expose without the tunnel:** User IDs are not authenticated in this prototype, so never expose the backend, Postgres, or Metro directly on LAN / `0.0.0.0` (especially on shared hackathon Wi-Fi).
- **Database password & git worktrees:** `docker-compose.yml` pins `name: collabothon26`, so every checkout/worktree shares the same `collabothon-postgres` container and `collabothon26_postgres-data` volume. An existing Postgres volume keeps the password it was originally created with: in a new worktree, copy your existing `.env` from the main checkout so the password matches (don't leave the `CHANGE_ME` placeholder), or edit `.env` and run `make db-reset` to recreate the volume with a new password.

If the phone shows "Something went wrong":
- Shake the phone (or long-press the screen) and tap **Reload**.
- Make sure Expo Go is up to date.
- Check the `make phone` terminal. Errors from the phone show up there too.

## Day-to-day development

- **Frontend:** saving a file reloads the app instantly (Fast Refresh).
- **Backend:** devtools restarts the app after recompiling. In IntelliJ that's Build → Build Project (`Ctrl+F9`).
- **Database:** the schema lives only in Flyway migrations (`back/src/main/resources/db/migration/V<n>__description.sql`). Hibernate only validates against it. A new table means a new migration file. Never edit a migration that has already been pushed; add a new one instead. `make db-reset` wipes the local database. If the backend fails to start with a Flyway checksum or version mismatch after a merge (the mock bank moved from V4 to V5 on `feat/profiling`), run `make db-reset` once.
- **API:** put new endpoints under `/api/**`. The app calls them with `api('/api/...')` from `front/src/lib/api.ts`. The backend URL is resolved automatically on web, emulator and phone. Override it with `EXPO_PUBLIC_API_URL` in `front/.env` (see `front/.env.example`).

### Example in the repo: lessons with a quiz

This is the pattern to copy. The **Map** tab (Learn side) lists lessons from the database. Tapping one opens a quiz with feedback, an explanation for each question and a result screen.

| Layer | File |
|---|---|
| DB table + sample data | `back/src/main/resources/db/migration/V2__lessons.sql` |
| Entities, repository, REST | `back/src/main/java/com/collabothon/back/lesson/` (`GET /api/lessons`, `GET /api/lessons/{id}`) |
| API test | `back/src/test/java/com/collabothon/back/lesson/LessonControllerTests.java` |
| API types | `front/src/types/lessons.ts` |
| Data fetching | `front/src/hooks/useApi.ts` |
| Screens | `front/src/app/(main)/(learn)/map.tsx` (list), `front/src/app/lesson/[id].tsx` (quiz) |
| Screen flow test | `front/src/__tests__/lessons.test.tsx` |

## Frontend structure

Uses [Expo Router](https://docs.expo.dev/router/introduction/): every file in `src/app/` is a route.

```
front/src/
├── app/                  # routes only (file = screen)
│   ├── _layout.tsx       # root Stack + providers (onboarding, mock bank, toast, transfer sheet)
│   ├── onboarding.tsx    # intro + optional personalisation questions; opened by the first Learn tap
│   ├── categorizing.tsx  # after a fresh onboarding: account-data consent card, then the loading steps
│   ├── (main)/           # bank + Finance Quest, one floating nav (components/bank/FloatingNav) that morphs between them
│   │   ├── _layout.tsx
│   │   ├── (bank)/       # mock banking app, the first screen: index (/) · payments · credits · invest
│   │   └── (learn)/      # Finance Quest: map (/map, lesson list) · glossary · profile
│   └── lesson/[id].tsx   # /lesson/1, pushed over the tabs
├── components/           # reusable UI (Screen, Button, AsyncContent)
│   └── categorizing/     # consent card, path steps and page layout of /categorizing
├── hooks/                # custom hooks (useXxx.ts)
├── lib/                  # non-UI code: api.ts (backend client), bank/ (seeded mock bank data, pure logic), utils
├── constants/            # theme.ts (colors, spacing), config
├── types/                # shared TS types / API DTOs
└── __tests__/            # Jest tests (never inside app/, every file there is a route)
```

- Import with the `@/` alias: `import { Screen } from '@/components/Screen'`.
- Don't add `index.ts` barrel files. Import directly from the file.
- Give interactive elements a `testID` (it becomes `data-testid` on web for Playwright).

## Manual testing

1. **Browser (fastest):** open http://localhost:8081. Turn on the DevTools device toolbar (`Ctrl+Shift+M`) for a phone-sized view. The Network tab shows the API calls. Native-only modules (camera, notifications, haptics) may not work on web, so always check on a phone before a demo.
2. **Phone (Expo Go):** scan the QR from `make phone`. See [Network security & phone access](#network-security--phone-access).
3. **Android emulator:** boot the emulator (`emulator -list-avds`, then `emulator -avd <NAME> &`), then run `make android`.
4. **Backend only:**
   ```bash
   curl localhost:8080/api/lessons
   curl localhost:8080/actuator/health
   ```

## Automated tests

```bash
make check     # front: tsc + expo lint + jest; back: JUnit (Testcontainers, needs Docker)
```

To run one side only: `cd front && npm test` or `cd back && ./mvnw test`.

- **Unit / component tests:** Jest + React Native Testing Library. For routing flows use `renderRouter` from `expo-router/testing-library`. In RNTL 14, `render` and `fireEvent` are async, so `await` them.
- **E2E on web:** Playwright in `front/e2e/` (a smoke test plus the onboarding flow), using `page.getByTestId('foo')`. `make e2e` (or `cd front && npx playwright install chromium && npm run e2e`) reuses a running backend and web app, or starts the backend on Testcontainers and the web app itself, so Docker must be running. CI runs it in `.github/workflows/e2e.yml`.
  - The tests act as `demo-user` and **reset its onboarding** (answers and the completed flag) before and after each test.
  - To leave your own `make dev` session alone, use another port: `cd front && E2E_PORT=8082 npm run e2e`.
  - After a failure, `npx playwright show-trace front/test-results/<test>/trace.zip` replays it step by step.
- **Backend on a throwaway DB:** `cd back && ./mvnw spring-boot:test-run` starts the backend on a fresh Testcontainers Postgres.
