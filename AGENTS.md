# Finance Quest

"Duolingo for finance": a mobile app that teaches personal finance and investing through short, gamified lessons personalised from the user's bank data. Built in 48h by a 6-person team for Collabothon 2026, challenge set by **Commerzbank**.

## The challenge

Make financial learning **engaging, relevant and actionable**, so people seek it out, gain confidence, and apply it. The card's core claim: people don't lack information, they lack the confidence to act.

- **Target user:** self-directed investors (people who make, or want to start making, their own investment decisions).
- **Theme:** "Innovations for all generations": different life stages, goals, horizons and experience levels.
- **Deliverable judged:** a working prototype with **one complete mission/lesson end to end**, plus the target user, the learning goal, and how the solution builds understanding and engagement.
- **Judging (equal weight):** Relevance · Technical Implementation · Innovation · Design · Demo & Pitch. Jury cares *how* things are implemented.

## Product principles

Apply these to every feature and every line of user-facing copy:

- **Demo-first.** One polished mission that works end to end beats many half-built features. Mock data is fine; a broken flow is not.
- **Educate, never advise.** The app (and especially the chatbot) explains concepts and consequences; it never recommends buying a specific product. Investment advice is regulated (MiFID II) and a bank jury will check.
- **Actionable.** A lesson ends with a small real-world step or decision scenario, not just a score.
- **All generations.** The same content adapts to persona (student / family / pre-retirement), level, and plain vs. standard language.
- **Short.** Lessons take 2–5 minutes.

## Features

Full feature list, requirements, MUST/SHOULD/COULD priorities and team split: [`FEATURES.md`](FEATURES.md) (Polish). Read it before starting any feature. The MUST tier is: lesson engine (quiz, matching tiles, text) with one complete lesson, onboarding test + basic profiling, user profile with XP/level.

The app opens on a **mock bank** (frontend only, seeded data in `front/src/lib/bank/`): **Overview · Payments · Credits · Invest** plus a **Learn** button. Learn switches the nav to Finance Quest: **Bank · Map** (lesson path) **· Glossary · Profile**. Lessons read the user's numbers through `useBank()` and the selectors in `front/src/lib/bank/selectors.ts`.

## Design

Figma is the design source of truth for screens, text styles and effects: [Finance Quest — Globe Learn Screen](https://www.figma.com/design/R4dCZH3fl7LqTwbqX3a6Jd/Finance-Quest-%E2%80%94-Globe-Learn-Screen) (fileKey `R4dCZH3fl7LqTwbqX3a6Jd`). Read it through the Figma MCP before building or restyling any UI; the **Design Kit** frame holds the shared styles.

## Repo map

| Path | What | Agent guide |
|---|---|---|
| `front/` | Expo (SDK 58) / React Native app, Expo Router, runs on Android + web | [`front/AGENTS.md`](front/AGENTS.md) |
| `back/` | Spring Boot 4.2, Java 25, JPA, Flyway migrations | — |
| `docker-compose.yml` | Postgres 17 | — |
| [`README.md`](README.md) | How to run and test everything; frontend directory conventions | — |

Backend schema changes go in a new Flyway migration (`back/src/main/resources/db/migration/V<n>__description.sql`). Hibernate runs with `ddl-auto=validate`, so entities that don't match a migration fail at startup.

## Working here

- Shared contracts (lesson JSON format, user profile shape, API between modules) are what lets the three feature streams merge. Change them deliberately and tell the team.
- Code, comments and commits are in English.
