# ElevenLabs narration — lesson video scenes

Generated from `back/src/main/resources/content/lessons/*.json`. One block = one paste into ElevenLabs = one audio file.
**21 clips, 3148 characters in total.**


- Source of each block: the scene's `captions` (in the app, captions are the narration). Symbols are spelled out for speech (₩10M → 10 million won, $ → dollars, % → percent).
- **Target length:** the narration should end before the scene's `duration`. The app makes the audio the master clock. Captions stay at their `at` times, so speak at a calm, steady pace.
- Save the file under `back/src/main/resources/static/audio/<path>`. Then add `"audio": "<path>"` to the scene (or to the `byChoice` / `noData` override). The backend refuses to start if a referenced file is missing.
- Lessons with no video track (sao-paulo-1…5, seoul-3…5) have nothing to narrate.

## berlin-1 · Safe money that shrinks

### `berlin-1/v1.mp3`
Scene **Same balance, higher prices** · target ≤ 12 s · set `audio` on: `scene` · 159 chars

```text
Prices go up over time. This is called inflation.
In 10 years, prices can rise by about a third.
Then 10,000 euros buys only what about 7,400 euros buys today.
```

## berlin-2 · Growth on growth

### `berlin-2/v1.mp3`
Scene **Growth on growth** · target ≤ 13 s · set `audio` on: `scene` · 163 chars

```text
10,000 euros grows by 5 percent every year.
Each year, last year's growth grows too.
This is called compound interest.
After 30 years, there is about 43,000 euros.
```

## berlin-3 · Money for emergencies

### `berlin-3/v1.mp3`
Scene **Ready at once** · target ≤ 12 s · set `audio` on: `scene` · 151 chars

```text
An emergency fund is money for surprises.
It pays your costs if a job ends or something breaks.
It does not need to grow. It needs to be there at once.
```

## berlin-4 · The scary first year

### `berlin-4/v1.mp3`
Scene **One bad year** · target ≤ 12 s · set `audio` on: `scene` · 156 chars

```text
You invest 5,000 euros. After one bad year, it is worth 4,000 euros.
Swings like this are called volatility.
If you can wait, the price has time to recover.
```

## berlin-5 · Your own split

### `berlin-5/v1.mp3`
Scene **Two parts** · target ≤ 10 s · set `audio` on: `scene` · 131 chars

```text
Many people split their savings into two parts.
First, a few months of costs, ready any day.
Second, money that can wait for years.
```

## seoul-1 · The chat that always knows

### `seoul-1/v1.mp3`
Scene **The chat** · target ≤ 12 s · set `audio` on: `scene` · 141 chars

```text
Ji-woo saved 10 million won in three years.
Her team chat says one stock only goes up.
Before she decides: what does a big swing do to money?
```

### `seoul-1/v2.mp3`
Scene **Two weeks** · target ≤ 12 s · set `audio` on: `scene` · 163 chars

```text
Week one: up 40 percent. 10 million won becomes 14 million won.
Week two: down 40 percent, taken from 14 million won.
She ends at 8.4 million won. Down 16 percent.
```

### `seoul-1/v3.mp3`
Scene **The climb back** · target ≤ 10 s · set `audio` on: `scene` · 131 chars

```text
Lose 10 percent, and you need 11 percent to get back.
Lose half, and you need to double.
The deeper the fall, the harder the climb.
```

### `seoul-1/v4.mp3`
Scene **Your numbers** · target ≤ 8 s · set `audio` on: `scene` · 94 chars

```text
This is your savings account today.
A 50 percent fall would need plus 100 percent to get back.
```

### `seoul-1/v4-nodata.mp3` — no bank data (character's numbers)
Scene **Your numbers** · target ≤ 8 s · set `audio` on: `noData` · 82 chars

```text
Ji-woo's savings today.
A 50 percent fall would need plus 100 percent to get back.
```

## seoul-2 · Pulling everything in

### `seoul-2/v1.mp3`
Scene **After work** · target ≤ 12 s · set `audio` on: `scene` · 134 chars

```text
Gangnam, after work. Min-jun has a new plan.
This time he wants to borrow and put in everything.
Ji-woo has 10 million won of her own.
```

### `seoul-2/v2.mp3`
Scene **영끌 · yeongkkeul** · target ≤ 12 s · set `audio` on: `scene` · 135 chars

```text
Koreans have a word for this: yeong-kkeul.
Pulling in everything, even your soul.
Her own 10 million won, plus 10 million won borrowed.
```

### `seoul-2/v3.mp3`
Scene **June** · target ≤ 12 s · set `audio` on: `scene` · 144 chars

```text
June. Nobody in the chat talks about X Y Z any more.
She missed the rise in March, and the fall after.
Her 10 million won is still where it was.
```

### `seoul-2/v3-choice0.mp3` — after choice 0 in step `sc1`
Scene **June** · target ≤ 12 s · set `audio` on: `byChoice.0` · 156 chars

```text
June. X Y Z rose fast, then fell faster.
Her shares are worth 6 million won. The loan is 10 million won.
She owes 4 million won and repays it for two years.
```

### `seoul-2/v3-choice1.mp3` — after choice 1 in step `sc1`
Scene **June** · target ≤ 12 s · set `audio` on: `byChoice.1` · 112 chars

```text
June. Her 1 million won bet went up, then down.
She lost 700,000 won of it.
The rest of her savings never moved.
```

### `seoul-2/v4.mp3`
Scene **The loan stays** · target ≤ 10 s · set `audio` on: `scene` · 139 chars

```text
Borrowed money makes every move twice as big.
A 30 percent fall takes 60 percent of her own money.
The loan stays the same size either way.
```

## tokyo-1 · Where your money sits

### `tokyo-1/v1.mp3`
Scene **Saving and investing** · target ≤ 12 s · set `audio` on: `scene` · 194 chars

```text
Saving and investing do different jobs.
Savings pay for plans and surprises in the next months.
Investments are for money you won't need for years.
Their value goes up and down, so time matters.
```

## tokyo-2 · One country of many

### `tokyo-2/v1.mp3`
Scene **A small part of the world** · target ≤ 12 s · set `audio` on: `scene` · 218 chars

```text
All companies on stock exchanges make up the world market.
Germany is about 2 percent of it. Japan is about 5 percent.
A big economy can still be a small part.
Investing across many countries is called diversification.
```

## tokyo-3 · The 34-year wait

### `tokyo-3/v1.mp3`
Scene **34 years** · target ≤ 13 s · set `audio` on: `scene` · 160 chars

```text
Japan's main stock index reached a peak at the end of 1989.
By 2009, it had fallen by about 80 percent.
It went above the old peak only in 2024, 34 years later.
```

## tokyo-4 · The currency in your fund

### `tokyo-4/v1.mp3`
Scene **Same fund, new price** · target ≤ 12 s · set `audio` on: `scene` · 193 chars

```text
You buy 1,000 dollars of a fund when one euro is worth one dollar twenty-five.
You pay 800 euros. Then the euro becomes weaker.
The fund's price did not change, but now it is worth 1,000 euros.
```

## tokyo-5 · Your monthly plan

### `tokyo-5/v1.mp3`
Scene **How a plan grows** · target ≤ 13 s · set `audio` on: `scene` · 192 chars

```text
A savings plan invests the same amount every month.
Over the years, the returns start to earn returns too.
This is called compound interest.
Prices still move, so the value goes down at times.
```
