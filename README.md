# collabothon26

- `front/` — Expo (SDK 58) / React Native app
- `back/` — Spring Boot backend (Maven)
- `docker-compose.yml` — Postgres 17

## Prerequisites

- Node 22+, npm
- Java (via sdkman) for the backend
- Docker for Postgres
- Android: Android SDK + an emulator (AVD) **or** the Expo Go app on your phone

Add the Android SDK tools to your PATH (e.g. in `~/.bashrc`):

```bash
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

## Running

### Database + backend

```bash
docker compose up -d          # Postgres on localhost:5432 (collabothon/collabothon)
cd back && ./mvnw spring-boot:run
```

### App

```bash
cd front
npm install
```

**Android emulator**

```bash
emulator -list-avds                # find your AVD name
emulator -avd <AVD_NAME> &         # boot it
npx expo start --android           # installs Expo Go + opens the app
```

**Physical phone** — run `npx expo start` and scan the QR code with Expo Go (phone and PC on the same network).

**Web** (fastest dev loop, needed for Playwright):

```bash
npx expo install react-dom react-native-web @expo/metro-runtime   # one-time
npx expo start --web               # http://localhost:8081
```

> Native-only modules (camera, notifications, etc.) may not work on web — always verify on Android before a demo.

## Testing

Before pushing, run the static checks:

```bash
cd front
npx tsc --noEmit      # typecheck
npx expo lint         # lint
```

### Unit and component tests: Jest + React Native Testing Library

Setup (one-time):

```bash
npx expo install jest-expo jest @testing-library/react-native
```

Add `"test": "jest"` to `scripts` and `"jest": { "preset": "jest-expo" }` to `package.json`, then:

```bash
npm test
```

### E2E on web: Playwright

Runs against the web build. React Native `testID="foo"` becomes `data-testid="foo"`, so use `page.getByTestId('foo')`.

Setup (one-time):

```bash
npm i -D @playwright/test && npx playwright install chromium
```

Create a `playwright.config.ts` with a `webServer` that runs `npx expo start --web` on port 8081, then:

```bash
npx playwright test
```

### E2E on native: Maestro (optional)

For flows that depend on native features. Write YAML flows in `front/.maestro/`, boot the emulator, start the app, then run:

```bash
maestro test .maestro/
```
