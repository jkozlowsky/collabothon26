## Project Card

### Project Name

**Atlas**

### One-Line Summary

Atlas turns the bank app into a learning journey: short and engaging lessons on a globe, built from the customer's own data, so self-directed investors gain the confidence to act.

### Live Demo

**[atlas-commerzbank.duckdns.org](https://atlas-commerzbank.duckdns.org)** is the production build. It runs in the browser and is best viewed at phone width. Pick a demo customer (Alex, Daniel or Elena), open **Learn**, and follow the path from onboarding to the first lesson.

### Technology Stack

- **Mobile / web app:** TypeScript, React 19, React Native 0.88, Expo SDK 58, Expo Router (one codebase for Android, iOS and web)
- **Graphics and motion:** three.js + `@react-three/fiber` on `expo-gl` (3D globe), `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-audio`, `expo-haptics`
- **Backend:** Java 25, Spring Boot 4.2 (Web MVC, Data JPA, Validation, WebSocket, Actuator, AspectJ), MapStruct, Lombok, Maven
- **Database:** PostgreSQL 17, schema managed only by Flyway migrations
- **Content and media:** lessons as structured JSON, Natural Earth map data for the globe texture
- **Testing:** Jest + React Native Testing Library, Playwright (web E2E), JUnit + Testcontainers (Postgres)
- **Infrastructure:** Docker Compose, GitHub Actions (test → build → deploy), Oracle Cloud (OCI ARM, Oracle Linux 9), Caddy reverse proxy, Expo Go + ngrok tunnel for phones
- **Profiling AI:** Jev decision model by TypeSafe (`jev-1.14.0`) via Spring `RestClient`
- **Narration AI:** ElevenLabs v4 text-to-speech, one narrator voice; MP3 clips served by the backend and played with `expo-audio` as the video's master clock

### Project Overview

#### The problem

People don't lack financial information. They lack the confidence to act on it. Self-directed investors, and people who would like to become one, meet the same topics again and again (inflation, compound growth, diversification, debt, risk) as generic articles and videos that have nothing to do with their own money. So they read, nod and change nothing: savings sit without a purpose, a small ETF plan runs "without really knowing why", and decisions get postponed.

This hits every generation differently. A student, a young family and someone ten years from retirement need the same concepts, but with other examples, horizons and depth. A bank sees the result in its own data: money sits idle in current accounts, and customers make choices they don't fully understand. Generic articles and videos don't change this, because they never touch the customer's own numbers. Solving this matters because customers who understand the trade-offs can act with confidence and choose what fits their own goals. A bank can offer this education.

#### Your solution

**Atlas** is a learning module that lives inside the bank app, behind a **Learn** button. It works like a language-learning app for finance: short lessons, streaks, XP and levels. What makes it different:

1. **Personal from the first minute.** With the customer's consent, Atlas reads a few summaries of what the bank already knows, such as regular saving, the safety net and investments. It then asks which topics are new to the user, because bank data can't show that. A two minute quick check finds the knowledge gaps. **Jev**, our profiling model, suggests where to start and our rules build the path from there.
2. **A journey, not a syllabus.** Each learning area is a city on a globe: Saving in Berlin, Investing in Tokyo, Borrowing in São Paulo, Risk in Seoul, Retirement in Cape Town. A plane flies between the pins as the user progresses.
3. **Personalized lessons about your money.** Every mission follows the same arc: a real hook number, a plain explanation, an interactive slider to explore the effect, myths vs facts, a decision scenario, a three-question checkpoint, and finally the lesson's lens on the user's own accounts.
4. **Customizable for everyone.** Some lessons can be played as a narrated, animated "video" rendered live from the lesson data (so it can show the user's own numbers and follow their choices), or read as a transcript. The user can switch at any moment without losing progress.
5. **Actionable.** At the end of a path Atlas recaps what the user learned and shows the trade-offs with their numbers. It names product types as facts but never recommends one; the user decides and is taken straight to the right screen of their bank.
6. **Engaging duels in the Arena.** 1v1 knowledge duels (live against another player or solo) keep what was learned fresh. Players are ranked in a weekly league by the XP they earn from lessons and duels, never by money, and a review after each match explains every mistake.

#### The working prototype
Everything below is implemented and runs end to end on Android (Expo Go), iOS and the web. A live deployment runs on our own server.

- **Mock bank app:** Overview, Payments, Credits and Invest tabs with accounts, cards, transactions, standing orders, an instalment loan with a loan calculator, and an ETF portfolio. Each tab shows a short teaser for the lesson that fits it. Three demo customers (Alex, Daniel, Elena) have different life situations and different bank data.
- **Onboarding:** a welcome screen, two short intro screens (the map and the duels), and a consent card. The user can accept that Atlas uses their account data or leave with "Not now". Atlas then asks "What would you like to learn?" and the user picks every area that is new to them (Saving, Investing, Borrowing, Risk, Money basics) or "Not sure yet". For Daniel and Elena, the picks are preselected but can be changed. Next is a quick check of 3 to 6 knowledge questions, which takes about 2 minutes. If the user picked topics, the first question comes from one of them. Jev chooses which lesson to test next, and the question is drawn at random from that lesson. After each answer (or "Not sure") the user sees a short explanation. At the end the user sees their learner level and the route of their first city, with the first stop highlighted. The route starts at the first unfinished lesson in that city. Profile and mastery are stored in the backend.
- **Globe home (Map):** a 3D globe you can spin with inertia, with a pin for each city (done, active or coming soon) and an Arena pin that opens the duels. After onboarding, a plane flies in and lands on the first city. Later flights follow great-circle arcs. A pin callout and a draggable "Your stories" sheet open each city's path. A static picture of the globe is shown when WebGL is not available.
- **Path screen:** for each city, a route of lessons (done with replay, current, locked), the progress, and a card with the user's own numbers that the path works with.
- **Lessons:** 23 lessons in 7 cities: 4 complete paths of 5 lessons (Saving in Berlin, Investing in Tokyo, Borrowing in São Paulo, Risk in Seoul) and a first lesson in Buenos Aires, Nairobi and Mumbai. Retirement in Cape Town is "coming soon". Interactive steps include sliders with charts, myth-or-fact sorting, matching, predictions, decision scenarios and quizzes. The flagship mission **Berlin 1 "Safe money that shrinks"** runs the full arc: hook, explanation, a slider with a "basket" visual, myth or fact, a decision scenario, a three-question checkpoint, "your accounts" facts from the bank, and the slider again, started at the user's real interest rate. The end screen shows the XP, the path stamp, the concepts trained (linked to the glossary) and the next lesson.
- **Video mode (Berlin and Tokyo paths):** full-screen animated SVG scenes with captions. The Berlin path has ElevenLabs narration; Tokyo plays captions only. The player has mute and skip scene, and the hands-on steps take the full screen between scenes. A Transcript button switches to the text form without losing progress, and the chosen form is remembered per user.
- **Path end and bank offers:** after the last lesson of a path, a recap and the bank's matching products as neutral facts. A spotlight then guides the user to the product in the bank tabs.
- **Duels:** live or solo mode and a choice of categories by learning area (the same areas as in onboarding). A live match waits up to 15 seconds for another player over WebSocket, then falls back to a simulated rival. Question types are quiz, prediction, chart, sorting and matching, and the opponent's progress shows live. After a match: XP per category with a level-up animation, a weekly XP league, and a review of each mistake with its explanation and a button to the lesson that teaches it. Sounds and haptics for a win, a level-up and a rank-up.
- **Glossary:** terms in categories with search, definitions with examples, and links between terms. Words in lessons open their definition.
- **Profile:** avatar, current and longest streak with this week's days, total XP and lessons completed, and a reminder to keep the streak. A "Restart onboarding" button resets the demo.

What is mocked: the bank data (accounts, transactions, products) is seeded on the frontend, there is no real login (demo accounts only), and the globe's story list is still partly served from a local file.

#### Behind the build

**Architecture.** An Expo / React Native app talks to a Spring Boot REST API (`/api/**`) and a raw WebSocket (`/ws/duel`), backed by Postgres. The mock bank lives only in the frontend (`front/src/lib/bank/`), and lessons read the user's numbers through `useBank()` and pure selectors. This keeps a clear seam: in a real bank the selectors would read the core banking API instead of the seed.

**Lessons are data, not code.** Each lesson is a JSON file (`back/src/main/resources/content/lessons/`) made of typed steps (`text`, `quiz`, `match`, `sort`, `predict`, `slider-chart`, `scenario`, `action`) and an optional video track of scenes with captions, timings and audio. Placeholders like `{savingsBalance}` are filled from the bank on the device.

**Profiling (Jev).** [Jev](https://docs.typesafe.ai/introduction) is an AI model by TypeSafe, built to make decisions inside software. Like a large language model (LLM) it understands plain text, but it doesn't write any. An application sends it some context and a set of questions with a fixed answer format. We use two of its question types. A Choice picks one option from a list we provide, with a probability for each option. A Noul returns the probability that the answer to a yes/no question is yes. TypeSafe calls this a System One model and trains it so that those probabilities match how often the answers turn out to be right.

Jev suits profiling because we need small judgements, such as whether someone's answers show they understand a topic, and our code can act on a probability directly. During the quick check it rates the answers, chooses the next lesson to test and estimates whether it has seen enough. At the end it suggests the learner level, the focus areas and the lesson to start from.

The backend has the final say. It rejects malformed responses, stops the check after six questions and can lower the suggested level when the answers don't support it. It also turns the suggested lesson into a route, which always opens at the first unfinished lesson of that city.

Jev receives the age range, ranges for income, cash buffer and savings rate, and four yes/no facts (regular saving, overdraft, investments, loan). It also gets the picked topics and, for each answer, the lesson's area, ID, topic and concepts with the result (right, wrong or not sure). Names, transactions, exact amounts and question text are not sent.

Without an API key, rules do the whole job. If Jev takes over 1.5 seconds on a step, rules choose that next question. After 3 seconds or an error, they choose the rest of the questions. If the final call fails, they produce the profile, and the saved result records whether it came from Jev or from the fallback.

**Globe.** three.js through `@react-three/fiber` on `expo-gl`, so the same globe runs on Android and the web. We turn the sphere (pitch and yaw). Pins and the plane are React Native views placed over the canvas from a per-frame 3D projection, driven by Reanimated shared values so the globe never re-renders React.

**Duels.** Answers are always graded and persisted through REST; the WebSocket only handles matchmaking and pushes the opponent's progress. A rival strategy (`RivalSnapshotProvider`) switches between the simulated rival and the real opponent's answers, so live and bot matches share one code path. The queue and session registry stay in memory.

**Backend structure.** Feature packages (lesson, categorization, profile, xp, duel, glossary), each with controllers, services and repositories, plus MapStruct mappers, a shared error-code model and a global exception handler. The schema changes only through Flyway migrations, which kept six people from breaking each other's databases.

**Delivery.** GitHub Actions run the backend tests, frontend typecheck, lint and Jest on every push to `main`, export the web build, and deploy to an OCI host. The CI user can run only one deploy script as root, and that script treats every input as untrusted. The release swap is atomic, with a health check and automatic rollback. For phones we use an Expo ngrok tunnel and keep every local service bound to `127.0.0.1`, which matters on shared hackathon Wi-Fi.

**Tools we built on:** Expo, React Native, three.js, Reanimated, Spring Boot, PostgreSQL, Flyway, Testcontainers, Playwright, Figma, ElevenLabs, Natural Earth, Caddy, GitHub Actions. We also used Claude Code, Antigravity and Codex as AI agents for implementation and reviews.

#### Challenges and discoveries

- **Education vs advice.** We turned the line between explaining and recommending into content rules that every lesson follows: the "your situation" step states facts and never grades, offers list product facts, and the user always makes the choice.
- **Less story, more of the user.** Early lessons used invented characters. Reviewing them, we found they pulled attention away from the user's own situation and the learning process itself. We removed the characters: the user moves a slider and *sees* the consequence, and the lesson ends on their own numbers.
- **Video without video files.** Real videos could not show the user's own numbers, and would not fit 48 hours. Rendering scenes live from lesson JSON with SVG and Reanimated gave us personal numbers for free. Making the narration audio the master clock kept captions in sync.
- **A 3D globe on a phone.** Gestures, inertia, pins that fade at the horizon and a plane flight had to run smoothly on Android. Moving all per-frame work into Reanimated shared values solved it.

#### Results and next steps

**Achieved.** One complete mission end to end (bank → Learn → onboarding and profiling → globe → lesson in video or text → the lesson applied to the user's own accounts), and a path that ends back in the bank: after its last lesson, the bank's offers lead to the right bank tab. Plus 23 lessons (4 complete paths and 3 first lessons), live duels, a glossary and a profile, deployed to production.

**How we validated it.** Automated tests on every layer: 46 Jest test files (components and routing flows), 49 JUnit test classes (the integration tests run on a real Postgres via Testcontainers), and 6 Playwright E2E specs (smoke, intro, onboarding, quick check, start here, duel). CI runs the JUnit and Jest tests before every deploy and the Playwright specs on every push and pull request, and the deploy rolls back on a failed health check. We also walked through the demo flow by hand on Android phones (Expo Go) and in the browser.

**What we are most proud of.** The moment a lesson about inflation turns into the user's own savings, and the user decides what to do with that knowledge, inside the same bank app, in about five minutes.

**Current limitations.**
- Bank data is seeded, and there is no authentication (demo accounts only).
- Jev is an external hosted API and we found no EU region for it. Use with real customer data would need a data processing agreement and a transfer review, or a model hosted by the bank.
- Video mode exists for the Berlin and Tokyo paths only, and only Berlin has recorded audio narration.
- The Retirement path is "coming soon".
- The app is in English only.

**Next steps.**
- Connect to real (sandboxed) banking APIs and the bank's login.
- Event-based nudges ("lots of idle cash → inflation lesson", "market dropped → investor-emotion lesson").
- Collaborative filtering on learning events.
- The Retirement path and more lesson paths in general, other languages, and video with narration for every lesson.
- Accessibility pass (font scaling, contrast) and usability tests with real users from each generation.
- Admin/expert panel and ability to add and control the lessons from inside the app.