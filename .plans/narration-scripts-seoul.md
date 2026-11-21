# Narration scripts: Seoul (seoul-1, seoul-2)

> Status: **ready to record** (2026-11-21). Text taken from the scene captions in `back/src/main/resources/content/lessons/seoul-1.json` and `seoul-2.json`.
> Workflow: [`lesson-video-mode-spec.md`](lesson-video-mode-spec.md) §8. **Captions = narration**: if a line changes here, change the caption in the JSON too, and record it again.

## How to record

**Voice:** one narrator for every scene, ElevenLabs v4. Calm and warm, like a friend explaining something over coffee, not an advert and not a news anchor. Slightly slower than normal speech (about 140 words per minute). Neutral English accent.

**Paste blocks:** the text inside each code block is what goes into ElevenLabs, one caption per line. Numbers and symbols are already written out the way they should be said ("ten million won", not "₩10M"). The on-screen captions keep the symbols.

**Pauses:** the line breaks and full stops give the pauses. No audio tags in the paste blocks; check the v4 docs before adding any. Leave about half a second of silence at the start and end of each file.

**Saying the Korean words:**

| Written | Say | Note |
|---|---|---|
| 영끌 / yeongkkeul | "YUNG-kool" | Short "u" as in "young". Stress on the first syllable. |
| Gangnam | "GAHNG-nahm" | |
| Ji-woo | "JEE-oo" | |
| Min-jun | "MIN-joon" | |
| won (₩) | "won" | Like the English word "won". |

**Files:** save each mp3 as `back/src/main/resources/static/audio/{lessonId}/{file}` with the exact file name given for that scene. Then add `"audio": "{lessonId}/{file}"` to the scene (or to the `byChoice` / `noData` override) and restart the backend. A missing file stops the backend at startup, on purpose.

**After recording:** open `/dev/scene/{lessonId}/{sceneId}` in a dev build. Scrub to where each spoken line starts and copy that time into the caption's `at`. The audio sets the scene's length, so the JSON `duration` only matters while a scene has no audio.

---

## seoul-1 · The chat that always knows

Beats: `v1` → p1 → `v2` → s1 → `v3` → q1 → q2 → `v4`

### v1 · The chat · `seoul-1/v1.mp3` · ~10 s

Office at dusk, slow push in. Ji-woo sits at her desk; chat bubbles pop up on her phone (they are **not** read out); "Ji-woo's savings ₩10,000,000" counts up.

```
Ji-woo saved ten million won in three years.
Her team chat says one stock only goes up.
Before she decides: what does a big swing do to money?
```

| Caption on screen | `at` now |
|---|---|
| Ji-woo saved ₩10 million in three years. | 0.5 |
| Her team chat says one stock only goes up. | 4 |
| Before she decides: what does a big swing do to money? | 8 |

### v2 · Two weeks · `seoul-1/v2.mp3` · ~10 s

Office at night, slow drift. The chart goes 10 → 14 → 8.4; the amount rolls up, then down; "+40%" and "−40%" tags pop in.

```
Week one: up forty percent. Ten million won becomes fourteen million.
Week two: down forty percent, taken from fourteen million.
She ends at eight point four million. Down sixteen percent.
```

| Caption on screen | `at` now |
|---|---|
| Week one: up 40%. ₩10M becomes ₩14M. | 0.5 |
| Week two: down 40%, taken from ₩14M. | 5.5 |
| She ends at ₩8.4M. Down 16%. | 9 |

### v3 · The climb back · `seoul-1/v3.mp3` · ~8 s

Street at night, slow pull out. The chart falls to half and climbs back; "−50%" and "+100%" tags.

```
Lose ten percent, and you need eleven percent to get back.
Lose half, and you need to double.
The deeper the fall, the harder the climb.
```

| Caption on screen | `at` now |
|---|---|
| Lose 10%, and you need 11% to get back. | 0.5 |
| Lose half, and you need to double. | 4 |
| The deeper the fall, the harder the climb. | 7 |

### v4 · Your numbers · personal scene · ~6 s each

Home at night, slow push in. The user's own savings balance counts up on screen. **The number is never spoken.** Tag "−50%→+100%".

**`seoul-1/v4.mp3`**: the user has savings data.

```
This is your savings account today.
A fifty percent fall would need a hundred percent rise to get back.
```

**`seoul-1/v4-nodata.mp3`**: no bank data; the screen shows Ji-woo's ₩10M instead. Goes in the scene's `noData` override.

```
Ji-woo's savings today.
A fifty percent fall would need a hundred percent rise to get back.
```

| Caption on screen | `at` now |
|---|---|
| This is your savings account today. / Ji-woo's savings today. | 0.5 |
| A 50% fall would need +100% to get back. | 4.5 |

---

## seoul-2 · Pulling everything in

Beats: `v1` → `v2` → s1 → sc1 → `v3` (ending follows the sc1 choice) → q1 → q2 → `v4`

### v1 · After work · `seoul-2/v1.mp3` · ~10 s

Gangnam street at dusk, slow push in. Ji-woo on her phone; Min-jun's messages pop up (not read out).

```
Gangnam, after work. Min-jun has a new plan.
This time he wants to borrow and put in everything.
Ji-woo has ten million won of her own.
```

| Caption on screen | `at` now |
|---|---|
| Gangnam, after work. Min-jun has a new plan. | 0.5 |
| This time he wants to borrow and put in everything. | 4.5 |
| Ji-woo has ₩10 million of her own. | 8.5 |

### v2 · 영끌 · yeongkkeul · `seoul-2/v2.mp3` · ~10 s

Café at night, slow drift. Tag "영끌"; amount "₩10M own + ₩10M loan"; tag "×2".

```
Koreans have a word for this: yeongkkeul.
Pulling in everything, even your soul.
Her own ten million won, plus ten million borrowed.
```

| Caption on screen | `at` now |
|---|---|
| Koreans have a word for this: yeongkkeul. | 0.5 |
| Pulling in everything, even your soul. | 4 |
| Her own ₩10 million, plus ₩10 million borrowed. | 7.5 |

### v3 · June · three endings · ~9 s each

Home at night, slow push in. The chart shows her path since the sc1 choice. The app plays the file that matches the choice.

**`seoul-2/v3.mp3`**: choice 2, "Skip it". This is the scene's base version.

```
June. Nobody in the chat talks about XYZ any more.
She missed the rise in March, and the fall after.
Her ten million won is still where it was.
```

| Caption on screen | `at` now |
|---|---|
| June. Nobody in the chat talks about XYZ any more. | 0.5 |
| She missed the rise in March, and the fall after. | 4.5 |
| Her ₩10 million is still where it was. | 8.5 |

**`seoul-2/v3-0.mp3`**: choice 0, "All in, plus a ₩10M loan". Goes in `byChoice."0"`.

```
June. XYZ rose fast, then fell faster.
Her shares are worth six million won. The loan is ten million.
She owes four million won and repays it for two years.
```

| Caption on screen | `at` now |
|---|---|
| June. XYZ rose fast, then fell faster. | 0.5 |
| Her shares are worth ₩6 million. The loan is ₩10 million. | 4 |
| She owes ₩4 million and repays it for two years. | 8 |

**`seoul-2/v3-1.mp3`**: choice 1, "Only ₩1M she can afford to lose". Goes in `byChoice."1"`.

```
June. Her one million won bet went up, then down.
She lost seven hundred thousand won of it.
The rest of her savings never moved.
```

| Caption on screen | `at` now |
|---|---|
| June. Her ₩1 million bet went up, then down. | 0.5 |
| She lost ₩700,000 of it. | 4 |
| The rest of her savings never moved. | 7.5 |

### v4 · The loan stays · `seoul-2/v4.mp3` · ~9 s

Office by day, slow pull out. Amount "Shares: ₩10M own + ₩10M loan"; tags "−30%" and "Own −60%".

```
Borrowed money makes every move twice as big.
A thirty percent fall takes sixty percent of her own money.
The loan stays the same size either way.
```

| Caption on screen | `at` now |
|---|---|
| Borrowed money makes every move twice as big. | 0.5 |
| A 30% fall takes 60% of her own money. | 4 |
| The loan stays the same size either way. | 7 |

---

## Checklist

| # | File | Lesson · scene | Est. |
|---|---|---|---|
| 1 | `seoul-1/v1.mp3` | The chat | 10 s |
| 2 | `seoul-1/v2.mp3` | Two weeks | 10 s |
| 3 | `seoul-1/v3.mp3` | The climb back | 8 s |
| 4 | `seoul-1/v4.mp3` | Your numbers | 6 s |
| 5 | `seoul-1/v4-nodata.mp3` | Your numbers, no bank data | 6 s |
| 6 | `seoul-2/v1.mp3` | After work | 10 s |
| 7 | `seoul-2/v2.mp3` | 영끌 | 10 s |
| 8 | `seoul-2/v3.mp3` | June, skipped | 9 s |
| 9 | `seoul-2/v3-0.mp3` | June, all in with a loan | 10 s |
| 10 | `seoul-2/v3-1.mp3` | June, only ₩1M | 9 s |
| 11 | `seoul-2/v4.mp3` | The loan stays | 9 s |

**11 files, about 1 min 40 s of audio.** A user hears at most about 35 s per lesson, because only one ending and one version of the personal scene play.

## Lines worth a second look before recording

1. **seoul-1 `v4`:** "+100%" on screen is spoken as "a hundred percent **rise**". The caption could become "A 50% fall would need a 100% rise to get back." so the text and the voice match word for word.
2. **seoul-2 `v2`:** "even your soul" is the only "you" outside the personal scene. It translates the idiom (영끌 comes from 영혼까지 끌어모으다, "pulling in even your soul"), so it's probably fine, but "even the soul" avoids talking to the user.
3. **seoul-2 `v4`:** "every move twice as big" is true here only because the loan equals her own money (₩10M + ₩10M). "Her borrowed money makes every move twice as big." keeps it tied to her case.
