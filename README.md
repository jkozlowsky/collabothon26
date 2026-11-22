## Project Card

### Project Name

**Atlas**

### One-Line Summary

Atlas turns the bank app into a learning journey: short and engaging lessons on a globe, built from the personalized customer's own numbers, so self-directed investors gain the confidence to act.

### Technology Stack

- **Mobile / web app:** TypeScript, React 19, React Native 0.88, Expo SDK 58, Expo Router (one codebase for Android, iOS and web)
- **Graphics and motion:** three.js + `@react-three/fiber` on `expo-gl` (3D globe), `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-audio`, `expo-haptics`
- **Backend:** Java 25, Spring Boot 4.2 (Web MVC, Data JPA, Validation, WebSocket, Actuator, AspectJ), MapStruct, Lombok, Maven
- **Database:** PostgreSQL 17, schema managed only by Flyway migrations
- **Content and media:** lessons as structured JSON, narration recorded with ElevenLabs, Natural Earth map data for the globe texture
- **Testing:** Jest + React Native Testing Library, Playwright (web E2E), JUnit + Testcontainers (Postgres)
- **Infrastructure:** Docker Compose, GitHub Actions (test → build → deploy), Oracle Cloud (OCI ARM, Oracle Linux 9), Caddy reverse proxy, Expo Go + ngrok tunnel for phones
- **Profiling AI:** Jev decision model by TypeSafe (`jev-latest`) via Spring `RestClient`

### Project Overview

#### The problem

People don't lack financial information. They lack the confidence to act on it. Self-directed investors, and people who would like to become one, meet the same topics again and again (inflation, compound growth, diversification, debt, risk) as generic articles and videos that have nothing to do with their own money. So they read, nod and change nothing: savings sit without a purpose, a small ETF plan runs "without really knowing why", and decisions get postponed.

This hits every generation differently. A student, a young family and someone ten years from retirement need the same concepts, but with other examples, horizons and depth. A bank sees the result in its own data: money sits idle in current accounts, and customers make choices they don't fully understand. Generic articles and videos don't change this, because they never touch the customer's own numbers. Solving this matters because customers who understand the trade-offs can act with confidence and choose what fits their own goals. A bank can offer this education.

#### Your solution

**Atlas** is a learning module that lives inside the bank app, behind a **Learn** button. It works like a language-learning app for finance: short lessons, streaks, XP and levels. What makes it different:

1. **Personal from the first minute.** With the customer's consent, **Jev**, the profiling engine, reads what the bank already knows (regular saving, safety net, small investments). Atlas then asks one question the data can't answer: which topics are new to the user. A two-minute quick check finds the knowledge gaps, and Jev builds a learning path from the gaps and the picked topics.
2. **A journey, not a syllabus.** Each learning area is a city on a globe: Saving in Berlin, Investing in Tokyo, Borrowing in São Paulo, Risk in Seoul, Retirement in Cape Town. A plane flies between the pins as the user progresses.
3. **Lessons about *your* money.** Every mission follows the same arc: a real hook number, a plain explanation, an interactive slider to explore the effect, myths vs facts, a decision scenario, a three-question checkpoint, and finally the lesson's lens on the user's own accounts.
4. **Customizable for everyone** Some lessons can be played as a narrated, animated "video" rendered live from the lesson data (so it can show the user's own numbers and follow their choices), or read as a transcript. The user can switch at any moment without losing progress.
5. **Actionable** At the end of a path Atlas recaps what the user learned and shows the trade-offs with their numbers. It names product types as facts but never recommends one; the user decides and is taken straight to the right screen of their bank.
6. **Duels in the Arena.** 1v1 knowledge duels (live against another player or solo) keep what was learned fresh. Players are ranked in a weekly league by the XP they earn from lessons and duels, never by money, and a review after each match explains every mistake.

#### The working prototype
Everything below is implemented and runs end to end on Android (Expo Go), iOS and the web. A live deployment runs on our own server.

- **Mock bank app:** Overview, Payments, Credits and Invest tabs with accounts, cards, transactions, standing orders, an instalment loan with a loan calculator, and an ETF portfolio. Each tab shows a short teaser for the lesson that fits it. Three demo customers (Alex, Daniel, Elena) have different life situations and different bank data.
- **Onboarding:** a welcome screen, two short intro screens (the map and the duels), and a consent card. The user can accept that Atlas uses their account data or leave with "Not now". Then one question: "What would you like to learn?" The user picks every area that is new to them (Saving, Investing, Borrowing, Risk, Money basics) or "Not sure yet". For Daniel and Elena, the picks are preselected but can be changed. Next comes a quick check of 3 to 6 knowledge questions (about 2 minutes): the picked areas come first, Jev picks each next question from the answers so far, and after each answer (or "Not sure") the user sees a short explanation. Onboarding ends with the result: the learner level and the first lesson. Jev picks that lesson from the gaps the check found and the areas the user picked, and skips the basics of an area the user already knows well. Profile and mastery are stored in the backend.
- **Globe home (Map):** a 3D globe you can spin with inertia, with a pin for each city (done, active or coming soon) and an Arena pin that opens the duels. After onboarding, a plane flies in and lands on the first city. Later flights follow great-circle arcs. A pin callout and a draggable "Your stories" sheet open each city's path. A static picture of the globe is shown when WebGL is not available.
- **Path screen:** for each city, a route of lessons (done with replay, current, locked), the progress, and a card with the user's own numbers that the path works with.
- **Lessons:** 23 lessons in 7 cities: 4 complete paths of 5 lessons (Saving in Berlin, Investing in Tokyo, Borrowing in São Paulo, Risk in Seoul) and a first lesson in Buenos Aires, Nairobi and Mumbai. Retirement in Cape Town is "coming soon". Interactive steps include sliders with charts, myth-or-fact sorting, matching, predictions, decision scenarios and quizzes. The flagship mission **Berlin 1 "Safe money that shrinks"** runs the full arc: hook, explanation, a slider with a "basket" visual, myth or fact, a decision scenario, a three-question checkpoint, "your accounts" facts from the bank, and the slider again, started at the user's real interest rate. The end screen shows the XP, the path stamp, the concepts trained (linked to the glossary) and the next lesson.
- **Video mode (Berlin and Tokyo paths):** full-screen animated SVG scenes with captions. The Berlin path has ElevenLabs narration; Tokyo plays captions only. The player has mute and skip scene, and the hands-on steps take the full screen between scenes. A Transcript button switches to the text form without losing progress, and the chosen form is remembered per user.
- **Path end and bank offers:** after the last lesson of a path, a recap and the bank's matching products as neutral facts (7 paths have offers). A spotlight then guides the user to the product in the bank tabs.
- **Duels:** live or solo mode and a choice of question categories. A live match waits up to 15 seconds for another player over WebSocket, then falls back to a simulated rival. Question types are quiz, prediction, chart, sorting and matching, and the opponent's progress shows live. After a match: XP per category with a level-up animation, a weekly XP league, and a review of each mistake with its explanation and a button to the lesson that teaches it. Sound effects for right and wrong answers.
- **Glossary:** terms in categories with search, definitions with examples, and links between terms. Words in lessons open their definition.
- **Profile:** avatar, current and longest streak with this week's days, total XP and lessons completed, and a reminder to keep the streak. A "Restart onboarding" button resets the demo.

What is mocked: the bank data (accounts, transactions, products) is seeded on the frontend, there is no real login (demo accounts only), and the globe's story list is still partly served from a local file.

#### Behind the build

**Architecture.** An Expo / React Native app talks to a Spring Boot REST API (`/api/**`) and a raw WebSocket (`/ws/duel`), backed by Postgres. The mock bank lives only in the frontend (`front/src/lib/bank/`), and lessons read the user's numbers through `useBank()` and pure selectors. This keeps a clear seam: in a real bank the selectors would read the core banking API instead of the seed.

**Lessons are data, not code.** Each lesson is a JSON file (`back/src/main/resources/content/lessons/`) made of typed steps (`text`, `quiz`, `match`, `sort`, `predict`, `slider-chart`, `scenario`, `action`) and an optional video track of scenes with captions, timings and audio. Placeholders like `{metric}` are filled from the bank on the device. One lesson player renders both the classic and the video form from the same step ids, so XP, results and mastery are identical in both modes. The backend validates the content at startup and refuses to start if a referenced audio file is missing.

**Profiling (Jev).** Jev is a decision model by TypeSafe (`jev-latest`), called from the backend through Spring's `RestClient`. It gets bank facts (buffer in months, saving regularity, investments) and the onboarding answers, picks the next quick-check question step by step, and returns a level and focus areas per learning area. Only categories and counts reach the model, never raw transactions or the user's answer text. If Jev has no API key, fails, or takes longer than 1.5 s for a step, transparent rules (`CategorizationRules`, `QuickCheckRules`) take over, so the flow never breaks. The result records which source decided (`JEV` or `FALLBACK`).

**Globe.** three.js through `@react-three/fiber` on `expo-gl`, so the same globe runs on Android and the web. We rotate the sphere (a quaternion), not the camera. Pins and the plane are React Native views placed over the canvas from a per-frame 3D projection, driven by Reanimated shared values so the globe never re-renders React. The land texture is generated once from Natural Earth data by a script in the repo.

**Duels.** Answers are always graded and persisted through REST; the WebSocket only handles matchmaking and pushes the opponent's progress. A rival strategy switches between the simulated rival and the real opponent's answers, so live and bot matches share one code path. The queue and session registry stay in memory (single instance).

**Backend structure.** Feature packages (lesson, categorization, profile, xp, duel, glossary), each with controllers, services and repositories, MapStruct mappers, a shared error-code model and a global exception handler. The schema changes only through Flyway migrations (21 so far) and Hibernate only validates it, which kept six people from breaking each other's databases.

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

**Achieved.** One complete mission end to end (bank → Learn → onboarding and profiling → globe → lesson in video or text → decision on the user's own numbers → back to the bank), plus 23 lessons (4 complete paths and 3 first lessons), live duels, a glossary and a profile, deployed to production.

**How we validated it.** Automated tests on every layer: 44 Jest test files (components and routing flows), 49 JUnit test classes (the integration tests run on a real Postgres via Testcontainers), and 6 Playwright E2E specs (smoke, intro, onboarding, quick check, start here, duel). CI runs the JUnit and Jest tests before every deploy and the Playwright specs on every push and pull request, and the deploy rolls back on a failed health check. We also walked through the demo flow by hand on Android phones (Expo Go) and in the browser.

**What we are most proud of.** The moment a lesson about inflation turns into the user's own savings, and the user decides what to do with that knowledge, inside the same bank app, in about five minutes.

**Current limitations.**
- Bank data is seeded, and there is no authentication (demo accounts only).
- Jev needs an API key; without one, the rule-based fallback profiles the user.
- Recommendations come from the profile and the quick check; collaborative filtering ("people like you also learned…") is not built.
- Video mode exists for the Berlin and Tokyo paths only. Berlin has recorded narration; Tokyo plays captions without audio.
- The Retirement path is "coming soon", and some story data is still a local file.
- The duel queue is in memory, so it works on a single backend instance.

**Next steps.**
- Connect to real (sandboxed) banking APIs and the bank's login.
- Event-based nudges ("lots of idle cash → inflation lesson", "market dropped → investor-emotion lesson").
- Collaborative filtering on learning events.
- The Retirement path, more languages, and video with narration for every lesson.
- Accessibility pass (font scaling, contrast) and usability tests with real users from each generation.