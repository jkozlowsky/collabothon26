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
make dev       # Postgres + backend + app
```

`make dev` does three things:
1. Starts Postgres in Docker.
2. Starts the backend in the background. If one is already running on :8080, it uses that one. Logs go to `logs/backend.log` (`tail -f logs/backend.log`).
3. Starts the app once the backend answers.

You can then open the app in two places:
- **Browser:** http://localhost:8081
- **Phone:** scan the QR code with Expo Go (Android) or the camera (iOS).

Ctrl+C stops the backend and the app. Postgres keeps running until `make db-stop`.

If you want the Spring logs in their own terminal, run `make back` and `make web` separately instead.

### Phone access and WSL

Under WSL2 a phone can't reach the WSL IP. For that reason `make dev` opens an ngrok tunnel there (`--tunnel ngrok`, no account needed). The QR then points to `*.exp.direct`, which works from any network, including mobile data. The phone does **not** need to be on the same Wi-Fi as your computer.

The backend goes through the same tunnel, because `front/metro.config.js` proxies `/api/*` to `localhost:8080`.

To run without the tunnel, use `NO_TUNNEL=1 make dev`. The phone then has to be on the same network as your computer.

If the phone shows "Something went wrong":
- Shake the phone (or long-press the screen) and tap **Reload**.
- Make sure Expo Go is up to date.
- Check the `make dev` terminal. Errors from the phone show up there too.

## Day-to-day development

- **Frontend:** saving a file reloads the app instantly (Fast Refresh).
- **Backend:** devtools restarts the app after recompiling. In IntelliJ that's Build → Build Project (`Ctrl+F9`).
- **Database:** the schema lives only in Flyway migrations (`back/src/main/resources/db/migration/V<n>__description.sql`). Hibernate only validates against it. A new table means a new migration file. Never edit a migration that has already been pushed; add a new one instead. `make db-reset` wipes the local database.
- **API:** put new endpoints under `/api/**`. The app calls them with `api('/api/...')` from `front/src/lib/api.ts`. The backend URL is resolved automatically on web, emulator and phone. Override it with `EXPO_PUBLIC_API_URL` in `front/.env` (see `front/.env.example`).

### Example in the repo: lessons with a quiz

This is the pattern to copy. The **Learn** tab lists lessons from the database. Tapping one opens a quiz with feedback, an explanation for each question and a result screen.

| Layer | File |
|---|---|
| DB table + sample data | `back/src/main/resources/db/migration/V2__lessons.sql` |
| Entities, repository, REST | `back/src/main/java/com/collabothon/back/lesson/` (`GET /api/lessons`, `GET /api/lessons/{id}`) |
| API test | `back/src/test/java/com/collabothon/back/lesson/LessonControllerTests.java` |
| API types | `front/src/types/lessons.ts` |
| Data fetching | `front/src/hooks/useApi.ts` |
| Screens | `front/src/app/(tabs)/index.tsx` (list), `front/src/app/lesson/[id].tsx` (quiz) |
| Screen flow test | `front/src/__tests__/lessons.test.tsx` |

## Frontend structure

Uses [Expo Router](https://docs.expo.dev/router/introduction/): every file in `src/app/` is a route.

```
front/src/
├── app/                  # routes only (file = screen)
│   ├── _layout.tsx       # root Stack
│   ├── (tabs)/           # bottom tab bar
│   │   ├── _layout.tsx
│   │   ├── index.tsx     # Learn  (/)
│   │   ├── glossary.tsx  # /glossary
│   │   └── profile.tsx   # /profile
│   └── lesson/[id].tsx   # /lesson/1, pushed over the tabs
├── components/           # reusable UI (Screen, Button, AsyncContent)
├── hooks/                # custom hooks (useXxx.ts)
├── lib/                  # non-UI code: api.ts (backend client), utils
├── constants/            # theme.ts (colors, spacing), config
├── types/                # shared TS types / API DTOs
└── __tests__/            # Jest tests (never inside app/, every file there is a route)
```

- Import with the `@/` alias: `import { Screen } from '@/components/Screen'`.
- Don't add `index.ts` barrel files. Import directly from the file.
- Give interactive elements a `testID` (it becomes `data-testid` on web for Playwright).

## Manual testing

1. **Browser (fastest):** open http://localhost:8081. Turn on the DevTools device toolbar (`Ctrl+Shift+M`) for a phone-sized view. The Network tab shows the API calls. Native-only modules (camera, notifications, haptics) may not work on web, so always check on a phone before a demo.
2. **Phone (Expo Go):** scan the QR from `make dev`. See [Phone access and WSL](#phone-access-and-wsl).
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
- **E2E on web (optional):** Playwright, using `page.getByTestId('foo')`.
- **Backend on a throwaway DB:** `cd back && ./mvnw spring-boot:test-run` starts the backend on a fresh Testcontainers Postgres.
