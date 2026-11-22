## Project Card

### Project Name

**Atlas**

### One-Line Summary

Atlas turns the bank app into a learning journey: short, gamified lessons on a 3D globe, built from the customer's own numbers, so self-directed investors gain the confidence to act.

### Technology Stack

- **Mobile / web app:** TypeScript, React 19, React Native 0.88, Expo SDK 58, Expo Router (one codebase for Android, iOS and web)
- **Graphics and motion:** three.js + `@react-three/fiber` on `expo-gl` (3D globe), `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-audio`, `expo-haptics`
- **Backend:** Java 25, Spring Boot 4.2 (Web MVC, Data JPA, Validation, WebSocket, Actuator, AspectJ), MapStruct, Lombok, Maven
- **Database:** PostgreSQL 17, schema managed only by Flyway migrations (Hibernate `ddl-auto=validate`)
- **Content and media:** lessons as structured JSON, narration recorded with ElevenLabs, Natural Earth map data for the globe texture
- **Testing:** Jest + React Native Testing Library, Playwright (web E2E), JUnit + Testcontainers (Postgres)
- **Infrastructure:** Docker Compose, GitHub Actions (test → build → deploy), Oracle Cloud (OCI ARM, Oracle Linux 9), Caddy reverse proxy, Expo Go + ngrok tunnel for phones

### Project Overview

#### The problem

People don't lack financial information. They lack the confidence to act on it. Self-directed investors, and people who would like to become one, meet the same topics again and again (inflation, compound growth, diversification, debt, risk) as generic articles and videos that have nothing to do with their own money. So they read, nod and change nothing: savings sit without a purpose, a small ETF plan runs "without really knowing why", and decisions get postponed.

This hits every generation differently. A student, a young family and someone ten years from retirement need the same concepts, but with other examples, horizons and depth. A bank sees that its customers hold idle money and make uninformed choices, yet its learning content is the least visited part of the app. Solving this matters because confident customers make better decisions for themselves, and education is something a bank can offer without crossing into regulated advice (MiFID II).

#### Your solution

**Atlas** is a learning module that lives inside the bank app, behind a **Learn** button. It works like a language-learning app for finance: short lessons (3–5 minutes), streaks, XP and levels. What makes it different:

1. **Personal from the first minute.** With the customer's consent, **Jev**, the profiling engine, reads what the bank already knows (regular saving, safety net, small investments) and Atlas only asks what the data can't tell: life stage, goal and how the person handles money. A one-minute quick check finds the knowledge gaps and the confidence level, and builds a learning path from them.
2. **A journey, not a syllabus.** Each learning area is a city on a 3D globe: Saving in Berlin, Investing in Tokyo, Borrowing in São Paulo, Risk in Seoul, Retirement in Cape Town. A plane flies between the pins as the user progresses.
3. **Lessons about *your* money.** Every mission follows the same arc: a real hook number, a plain explanation, an interactive slider to explore the effect, myths vs facts, a decision scenario, a three-question checkpoint, and finally the lesson's lens on the user's own accounts ("your €12,500 at 2.25% against inflation").
4. **Watch or read.** Each lesson can be played as a narrated, animated "video" rendered live from the lesson data (so it can show the user's own numbers and follow their choices), or read as a transcript. The user can switch at any moment without losing progress.
5. **Actionable, never advice.** At the end of a path Atlas recaps what the user learned and shows the trade-offs with their numbers. It names product types as facts but never recommends one; the user decides and is taken straight to the right screen of their bank.
6. **Duels in the Arena.** 1v1 knowledge duels (live against another player or solo) keep what was learned fresh. They are ranked by knowledge (Elo), never by money, and a review after each match explains every mistake.

#### The working prototype

Everything below is implemented and runs end to end on Android (Expo Go), iOS and the web. A live deployment runs on our own server.

- **Mock bank app (frontend, seeded data):** Overview, Payments, Credits and Invest tabs with accounts, transactions, a loan and an ETF plan. Three demo customers (Alex, Daniel, Elena) with different life stages; the device locks the chosen account.
- **Onboarding and profiling:** intro screens, optional personalisation questions, a data-consent card, the quick check (knowledge questions + confidence), animated categorising steps, and a learning-path summary (gap, level, focus areas, first lesson). Profile and mastery are stored in the backend.
- **Globe home (Map):** a 3D globe you can spin with inertia, story pins with done / active / coming-soon states, plane flights along great-circle arcs, a pin callout, and a draggable "Your stories" sheet. A static fallback is used when WebGL is not available.
- **Lessons:** 23 lessons across 8 cities (5 complete paths of 5 lessons for Saving, Investing, Borrowing and Risk, plus first lessons in Buenos Aires, Nairobi and Mumbai; Retirement is "coming soon"). The flagship mission **Berlin 1 "Safe money that shrinks"** runs the full arc: hook, explanation, slider with a "basket" visual, myth or fact, decision scenario, checkpoint quiz, "your situation" facts from the bank, the slider started at the user's real numbers, and an end screen with XP, streak and a path stamp.
- **Video mode:** animated SVG scenes with captions and ElevenLabs narration (the Berlin path has recorded audio), a split layout with the hands-on steps under the player, skip scene, mute, and a watch / transcript switch that is remembered per user.
- **Path end and bank offers:** a recap per story and the bank's matching products as neutral facts, with a spotlight that guides the user to the product in the bank tabs.
- **Duels:** lobby with categories and league, live 1v1 matches over WebSocket (queue with a simulated rival as fallback, so one presenter can still demo it), solo mode, Elo rankings, mistake review, and sound effects.
- **Glossary:** searchable terms, linked from inside lessons.
- **Profile:** XP, level, streak and progress, built from the bank's own UI components.

What is mocked: the bank data (accounts, transactions, products) is seeded on the frontend, there is no real login (demo accounts only), and the globe's story list is still partly served from a local file.

#### Behind the build

**Architecture.** An Expo / React Native app talks to a Spring Boot REST API (`/api/**`) and a raw WebSocket (`/ws/duel`), backed by Postgres. The mock bank lives only in the frontend (`front/src/lib/bank/`), and lessons read the user's numbers through `useBank()` and pure selectors. This keeps a clear seam: in a real bank the selectors would read the core banking API instead of the seed.

**Lessons are data, not code.** Each lesson is a JSON file (`back/src/main/resources/content/lessons/`) made of typed steps (`text`, `stat`, `facts`, `slider-chart`, `sort`, `scenario`, `quiz`, `action`) and an optional video track of scenes with captions, timings and audio. Placeholders like `{metric}` are filled from the bank on the device. One lesson player renders both the classic and the video form from the same step ids, so XP, results and mastery are identical in both modes. The backend validates the content at startup and refuses to start if a referenced audio file is missing.

**Profiling (Jev).** In the prototype, Jev is a transparent, rule-based engine (`CategorizationRules`, `QuickCheckRules`): bank facts (buffer in months, saving regularity, investments) plus quick-check answers give a level and focus areas per learning area. We chose explainable rules over a black-box model for a bank context; the interface is ready for an ML model later.

**Globe.** three.js through `@react-three/fiber` on `expo-gl`, so the same globe runs on Android and the web. We rotate the sphere (a quaternion), not the camera. Pins and the plane are React Native views placed over the canvas from a per-frame 3D projection, driven by Reanimated shared values so the globe never re-renders React. The land texture is generated once from Natural Earth data by a script in the repo.

**Duels.** Answers are always graded and persisted through REST; the WebSocket only handles matchmaking and pushes the opponent's progress. A rival strategy switches between the simulated rival and the real opponent's answers, so live and bot matches share one code path. The queue and session registry stay in memory (single instance).

**Backend structure.** Feature packages (lesson, categorization, profile, xp, duel, glossary), each with controllers, services, repositories and MapStruct mappers, a shared error-code model and a global exception handler. The schema changes only through Flyway migrations (25 so far) and Hibernate only validates it, which kept six people from breaking each other's databases.

**Delivery.** GitHub Actions run the backend tests, frontend typecheck, lint and Jest on every push to `main`, export the web build, and deploy to an OCI host over a restricted SSH key. The release swap is atomic, with a health check and automatic rollback. For phones we use an Expo ngrok tunnel and keep every local service bound to `127.0.0.1`, which matters on shared hackathon Wi-Fi.

**Tools we built on:** Expo, React Native, three.js, Reanimated, Spring Boot, PostgreSQL, Flyway, Testcontainers, Playwright, Figma, ElevenLabs, Natural Earth, Caddy, GitHub Actions. We also used Claude Code as an AI pair programmer for specs, implementation and reviews.

#### Challenges and discoveries

- **Education vs advice.** A bank jury checks the line between explaining and recommending. We turned it into explicit content rules that every lesson follows: the "your situation" step states facts and never grades, offers list product facts, and the user always makes the choice.
- **Less story, more of the user.** Early lessons used invented characters and "guess the number" puzzles. Reviewing them, we found they pulled attention away from the user's own situation and felt like a test rather than teaching. We removed the characters and the guessing: the user moves a slider and *sees* the consequence, and the lesson ends on their own numbers. We also dropped a separate "plain language" variant because the video / transcript switch served that need better.
- **Video without video files.** Real videos could not follow the user's choices or show their numbers, and would not fit 48 hours. Rendering scenes live from lesson JSON with SVG and Reanimated gave us branching endings and personal numbers for free. Making the narration audio the master clock kept captions in sync.
- **A 3D globe on Android and the web.** Gestures, inertia, pins that fade at the horizon and a plane flight had to run smoothly on a phone. Moving all per-frame work into Reanimated shared values solved it, and a static fallback covers devices without WebGL.
- **Six people, three streams, one schema.** Parallel branches collided on Flyway version numbers. Agreeing on shared contracts (lesson JSON, profile shape, API) early and treating migrations as append-only let the streams merge.
- **Demoing live duels alone.** A live match needs two people. A short queue with a fallback to the simulated rival lets one presenter demo it and two devices play for real.
- **Hackathon networking.** Event Wi-Fi blocked tunnels and device-to-device traffic. We added a USB mode (`adb reverse`) that needs no network at all.

#### Results and next steps

**Achieved.** One complete mission end to end (bank → Learn → onboarding and profiling → globe → lesson in video or text → decision on the user's own numbers → back to the bank), plus 23 lessons on 5 paths, live duels, a glossary and a profile, deployed to production.

**How we validated it.** Automated tests on every layer: 38 Jest test files (components and routing flows), 41 JUnit test classes on a real Postgres via Testcontainers, and 6 Playwright E2E specs (smoke, intro, onboarding, quick check, start here, duel). CI runs them before every deploy, and the deploy rolls back on a failed health check. We also walked through the demo flow by hand on Android phones (Expo Go) and in the browser.

**What we are most proud of.** The moment a lesson about inflation turns into the user's own savings, and the user decides what to do with that knowledge, inside the same bank app, in about five minutes.

**Current limitations.**
- Bank data is seeded, and there is no authentication (demo accounts only).
- Jev is rule-based; no machine learning yet.
- Recommendations come from the profile and the quick check; collaborative filtering ("people like you also learned…") is not built.
- Narration is recorded for the Berlin path only; other paths play silent captions.
- The Retirement path is "coming soon", and some story data is still a local file.
- The duel queue is in memory, so it works on a single backend instance.

**Next steps.**
- Connect to real (sandboxed) banking APIs and the bank's login.
- Event-based nudges ("lots of idle cash → inflation lesson", "market dropped → investor-emotion lesson").
- An ML profiling model and collaborative filtering on learning events.
- The Retirement path, more languages and narration for every lesson.
- Accessibility pass (font scaling, contrast) and usability tests with real users from each generation.
