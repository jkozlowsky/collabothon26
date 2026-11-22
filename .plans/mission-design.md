# Mission design

How every lesson ("mission") is built. Applies to all paths. Status: the first mission built this way is
`berlin-1` (Saving · "Safe money that shrinks", inflation). The other lessons follow when they are reworked.

## Decisions

- **No characters.** Lessons talk to "you", with general examples and the user's own bank numbers. No Ji-woo,
  no Rafa, no chats between invented people. Every path reads like Saving and Investing.
- **No guessing.** No "guess the number" sliders and no maths puzzles. The user moves things and *sees* the
  consequence (exploration), or answers a question about a concept (check). A number is always shown, never asked for.
- **Learn, then prove it.** Each idea is explained first, explored second, checked third. A wrong answer explains
  why and comes back once at the end.
- **The user's situation without a grade.** The last part mirrors the lesson topic onto the user's own data
  (balance, rate, horizon). It states facts. It never says "good", "bad" or "you should".
- **Educate, never advise** (MiFID II). Product types (savings account, fixed-term deposit, fund) may be named
  and compared as examples. A product is never recommended.
- **Short:** 4–5 minutes, 8–10 screens.

## The arc (phases)

| # | Phase | Screen | Purpose | Step type |
|---|---|---|---|---|
| 1 | learn | **Hook** | One real, verifiable number that makes the topic matter | `text` + `stat` |
| 2 | learn | **Explain** | The concept in plain words, one idea per card | `text` |
| 3 | learn | **Explore** | Move a slider, watch the effect (a picture, not only a chart) | `slider-chart` + `visual` |
| 4 | challenge | **Myth or fact** | Clear up common misbeliefs, each with a one-line why | `sort` |
| 5 | challenge | **Decide** | A realistic choice; jump in time and compare outcomes; no wrong answer | `scenario` |
| 6 | challenge | **Checkpoint** | 3 short concept questions: the "test" of the lesson | `quiz` × 3 |
| 7 | you | **Your situation** | The lesson's lens on the user's accounts: facts, no grade | `text` + `facts` |
| 8 | you | **Try it on your money** | The explore tool, started at the user's real numbers | `slider-chart` (`fromBank`) |
| — | end | **Lesson end** | XP, streak flame, path stamp, concepts trained, next step | `LessonEnd` |

A lesson may add a `decide` step (an `action` with a personal rule) when the topic leads to one. The video
track tells only the learn phase; every other step is in the beats.

## UI building blocks

- `stat` on a text step: a petrol hero card with a number that counts up.
- `facts` on a text step: label/value rows filled from the bank (`{metric}`), shown as a neutral data card.
- `visual: 'basket'` (buying power as ten items), `visual: 'split'` (paid in vs growth) on slider charts.
- `compareTo` on an action rule: a months meter against today's savings.
- Lesson end: centred confetti, stamped badge, XP count-up, the streak flame lights when the streak grows.

## Path view

Opening a path scrolls to the current stop. Done stops are compact, the current stop is the one large card
with the yellow action, locked stops are dimmed with a lock.

## Demo user

Alex Krause, 29, Frankfurt. €2,150 net a month, about €880 left over. €4,280 on the current account,
€12,500 in savings at 2.25%. €100 a month into an ETF for 18 months. Goal: a flat with his partner in 2–3 years.
Quick check: unsure about real interest, confidence 2/5. Start: Saving from the basics, mission 1 = inflation.

## Next

- Rework the remaining lessons to this arc (remove the remaining `predict` steps, add a checkpoint).
- Retirement path (Cape Town).
