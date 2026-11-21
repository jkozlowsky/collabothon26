# Story content: Berlin, São Paulo, Tokyo

> Status: **content generated** (2026-11-21). Open work: the bank metrics in §6.2 item 3.
> Related: [`doc/historie.md`](../doc/historie.md) (story concept, city test), [`f4-f5-lessons-spec.md`](f4-f5-lessons-spec.md) (step types, variants), `back/src/main/resources/content/lessons/seoul-*.json` (the reference story).

## 1. Goal

Three more full stories next to Seoul, so the globe has four playable cities. Each story covers a different life stage and a different money mechanism:

| Story | Character | Life stage (persona) | Mechanism | Colour | Icon | Landmark |
|---|---|---|---|---|---|---|
| Seoul (exists) | Ji-woo, 27 | young worker | drawdowns, leverage, red flags | violet | `message-circle` | `tower` (broadcast tower on the hill) |
| **Berlin** | Lena, 34, one child (Mia, 2) | **family** | inflation, real return, time horizon, emergency fund | teal | `shield` | `gate` (columned city gate) |
| **São Paulo** | Rafa, 22, first job | **student / first job** | installments, hidden interest, revolving card debt, total cost of credit | orange | `credit-card` | `raised` (museum block on two frames over an open plaza) |
| **Tokyo** | Michiko, 58, retires at 65 | **pre-retirement** | home bias, country diversification, long recovery, currency risk | rose | `globe` | `lattice` (lattice tower with an observation deck) |

Colours: Seoul moved to violet in the story-screen work, so Tokyo takes rose.

## 2. Decisions from the interview

- **Cities:** Berlin, São Paulo and Tokyo. Buenos Aires, Nairobi and Mumbai stay as "coming soon" pins.
- **Depth:** 5 lessons per story, like Seoul. Lesson 5 is always "Your stop · today" and ends with an `action` step.
- **Variants:**
  - every lesson gets `lang:plain` for every step that has text;
  - every `slider-chart` gets a `level:beginner` hint;
  - every final `action` step gets `persona:student|family|pre-retirement`.
- **New maths:** at most 1 new slider model per city (§6.1).
- **Real terms:** generic local terms and state schemes may be named: Tagesgeld, Sparbuch, Notgroschen, parcelado sem juros, rotativo, CET, new NISA. Brands, companies, funds, apps and index brand names are not named: "Japan's main stock index", not its trademark.
- **Numbers:** rounded from memory, with the footer "Simplified from real data." wherever a real-world figure appears (§7). No web fact-check.
- **Emoji:** none anywhere, including chat messages. Seoul gets cleaned up as part of this work (§8).
- **Unlocking:** all three stories are `available` in `stories.json`. Seoul stays first in the file, so it remains `current` for a new user.
- **Story screen:** rebuilt in another session. It reads these fields from `stories.json`, and every new story fills them:
  - `landmark { kind, at }`, drawn by `components/StoryLandmark.tsx`. Kinds: `tower`, `gate`, `raised`, `lattice`; `raised` and `lattice` were added for São Paulo and Tokyo;
  - `intro`, the story's opening situation, about 40 words;
  - `words`, the "Words from {city}" chips, `{ native, meaning }`;
  - `character.place` and `character.savings`.

  Each lesson also has a `topic` (the stop's subject line, e.g. "Inflation and real return").
- **Bank metrics and other code:** this spec lists what is needed (§6). The team decides who builds it.

## 3. Shared rules for every lesson

- **Format:**
  - exactly as `front/src/types/lessons.ts` and `LessonRules.validate`;
  - file name = `<id>.json`, with ids `berlin-1..5`, `sao-paulo-1..5`, `tokyo-1..5`;
  - `story` = the story id.
- **Size:** 2–5 min (`minutes` 3–4), 5–8 steps, `xp` 50–70. The last lesson is worth 70.
- **Shape**, following historie.md §3. Not every lesson has every stage, but every lesson has at least:
  - one `chat` or `text` situation;
  - one hands-on step (`predict` / `slider-chart` / `scenario` / `sort` / `match`);
  - one `quiz`.
- **One "Word from <city>" card per story minimum.** It is a `text` step with `kicker: "Word from <city>"` and the local term as its `title`.
- **Glossary links:**
  - each new concept appears as `[[key]]` in text and in the step's `concepts`;
  - every key exists in `glossary.json` (§5);
  - `match` uses 3–5 pairs.
- **Educate, never advise (MiFID II):**
  - endings show consequences, never "she should have bought X";
  - an "invested" path always shows its dip, and its ending names the condition ("only money that could wait 18 years");
  - the character's rule in lesson 5 is framed as *her* rule, not a recipe.
- **Copy:**
  - a chat message is at most 1 line;
  - character text is at most about 40 words;
  - local currency comes with "≈ €" the first time it appears in a story.
- **Variant guards:** variants never change `correctIndex`, `answer`, `pairs`, `model`, sort buckets or scenario `series`. The backend checks this.

## 4. The stories

Numbers in brackets are the exact values that go into the JSON. "≈" marks rounded maths, which is shown with the footer.

### 4.1 Berlin: "Safe, but not free"

`stories.json`:
- `topic` "Cash & inflation";
- `character` { Lena, 34, "Project manager" };
- `currency` EUR, perEur 1;
- `pin` 52.52 / 13.40.

| # | Title · place | Steps | Concepts |
|---|---|---|---|
| 1 | **Safe, but not free** · Kreuzberg · kitchen table | `chat` Lena + Jonas: "€18k on Tagesgeld, untouched, safe"; Oma: "the Sparbuch was good enough for us". `text` Meet Lena. `predict`: prices +3%/yr, account pays 0.5%, what can €18,000 buy after 10 years? [−50..0, step 1, answer **−22**] (1.005/1.03)^10 = 0.78. `slider-chart` **realValue**: find the interest rate that keeps buying power flat [goal output ≥ 0, hint "Interest must at least match inflation"]. `text` nominal vs real. `quiz` × 2. | inflation, real-return |
| 2 | **Word from Berlin: Sparbuch** · Prenzlauer Berg · Oma's flat | `text` Word: Sparbuch, plus the German habit of keeping savings in cash and deposits ("Angstsparen", saving out of fear). `predict`: €10,000 growing 5%/yr for 18 years [10,000..40,000, step 500, unit €, answer **24,000**]. `scenario` "Mia's €10,000 until she is 18" (periodLabel "18 years", unit "€k", 13 points): **all Tagesgeld 1.5%** [10, 10.2, 10.5, 10.7, 10.9, 11.2, 11.4, 11.7, 12, 12.2, 12.5, 12.8, 13.1], ending: "€13,100, it never fell; at 2% inflation it buys what ≈ €9,100 buys today"; **half and half** [10, 10.7, 11.4, 12.1, 10.9, 11.6, 12.8, 13.7, 14.7, 15.8, 16.8, 17.7, 18.6]; **broad global fund, illustrative 5%** [10, 11.2, 12.4, 13.6, 10.8, 12.1, 14.2, 15.8, 17.5, 19.4, 21, 22.6, 24.1], ending names the year-6 dip to €10,800 and "only works for money that can wait". `quiz` on compound growth. | compound-interest, real-return |
| 3 | **Word from Berlin: Notgroschen** · Kita · Monday morning | `chat`: the washing machine broke, and Jonas's contract ends in March. `text` Word: Notgroschen (the emergency penny). `predict`: monthly costs €2,800, 3 months buffer? [0..20,000, step 400, answer **8,400**]. `sort` "Needs it within a year" / "Can wait 10+ years": rent, a new washing machine, 3 months of costs if a job ends, Mia's money at 18, Lena's pension, car repair. `match` Tagesgeld / Notgroschen / Inflation / Real return. `quiz`. | emergency-fund, time-horizon |
| 4 | **The scary first year** · Tempelhofer Feld · one year later | `chat`: Mia's invested half is −20% after year 1; Jonas: "Sell before it gets worse?" `slider-chart` **drawdownRecovery** (reuse): find the loss that needs +25% [goal output 25]. `scenario` "€5,000 after a −20% year" (periodLabel "17 years", unit "€k"): **sell now, keep cash** [5, 4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5, 5.1]; **hold** [5, 4, 4.6, 5.3, 5.9, 6.6, 7.2, 7.9, 8.6, 9.4, 10.2, 11, 11.8] with the ending "past returns promise nothing"; **never started** [5, 5.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.2, 6.4]. `quiz`: why −20% hurts Mia's money less than rent money (time to recover, no need to sell). | volatility, drawdown, time-horizon |
| 5 | **Your own split** · Your stop · today | `text` Lena's note: "Notgroschen first: 3 months of costs. Money that waits 18 years doesn't have to sit still. My rule, not a recipe." `quiz` × 2. `action`: "You hold **{totalAssets}** with us. **{savingsShareOfAssets}** sits in savings at {savingsRate}. That covers about **{bufferMonths}** months of your spending." Rule "My emergency buffer", 1–12 months, value 3. | emergency-fund, inflation |

### 4.2 São Paulo: "Twelve easy payments"

`stories.json`:
- `topic` "Installments & the cost of credit";
- `character` { Rafa, 22, "Junior designer, first job" };
- `currency` BRL, perEur 6.3;
- `pin` −23.55 / −46.63;
- salary in the story: R$2,800 a month (≈ €450).

| # | Title · place | Steps | Concepts |
|---|---|---|---|
| 1 | **Twelve easy payments** · Brás · appliance store | `chat` the salesperson: "12× de R$250, sem juros!"; Rafa's mother: "Ask for the cash price." `text` Word: parcelado sem juros. `predict`: the cash price is 15% off (R$2,550 vs 12 × R$250). What hidden yearly rate is in "no interest"? [0..60, step 1, answer **36**] (≈ 2.6% a month). `slider-chart` **installmentCost**: get the hidden rate under 10% a year [goal output ≤ 10; hint "a cash discount of about 5%"]. `quiz` × 2. | installments, hidden-interest |
| 2 | **The stack** · República · payday | `chat` a notification list: phone 10 × R$180, fridge 12 × R$250, course 6 × R$200, sneakers 5 × R$80. `predict`: share of the R$2,800 salary already spoken for [0..60, answer **25**] (R$710). `sort` "Fixed for months" / "Free this month". `match` each purchase to the month it ends. `quiz`: why stacked small parcelas feel smaller than they are. | installments, committed-income |
| 3 | **The rotativo** · Avenida Paulista · card bill | `text` Word: rotativo, the card's revolving credit. Interest often above 10% a month; since 2024, interest and fees are capped at the size of the original debt. `scenario` "R$1,000 card bill" (periodLabel "12 months", unit "R$", debt left): **pay in full** [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; **minimum 15%, 12%/month** [1000, 952, 906, 863, 821, 782, 744, 709, 675, 642, 611, 582, 554], ending "paid ≈ R$1,560, still owes R$550"; **12-month instalment plan at 5%/month** [1000, 937, 871, 802, 729, 653, 573, 489, 400, 307, 210, 108, 0], ending "paid ≈ R$1,350". `quiz` × 2. | revolving-credit, compound-interest |
| 4 | **Word from São Paulo: CET** · Centro · bank branch | `chat` two motorbike-loan offers: A "1.9% a month" plus a R$300 fee and R$600 insurance on R$8,000 over 24 months; B "2.3% a month, nothing else". `text` Word: CET, Custo Efetivo Total; Brazilian lenders must show it. `predict`: A's real monthly cost [1.5..4, step 0.1, answer **2.9**]. `match` rate / fee / insurance / CET. `quiz`: which offer costs less (B). | total-cost-of-credit, hidden-interest |
| 5 | **Your own limit** · Your stop · today | `text` Rafa's rule: "Parcelas at most 20% of my pay. The card bill is paid in full." `quiz` × 2. `action`: "You owe **{creditOutstanding}** across loan, card and Pay in 3. Repayments this month: **{monthlyRepayments}**, that is **{repaymentShareOfIncome}** of your income." Rule "Max of my income in repayments", 5–50%, value 20, applies to `monthlyIncome`. | committed-income, revolving-credit |

### 4.3 Tokyo: "Home, sweet home bias"

`stories.json`:
- `topic` "One country or the world";
- `character` { Michiko, 58, "School administrator" };
- `currency` JPY, perEur 165;
- `pin` 35.68 / 139.69;
- savings in the story: ¥12,000,000 (≈ €72,700).

| # | Title · place | Steps | Concepts |
|---|---|---|---|
| 1 | **Buy what you know** · Marunouchi · farewell party | `chat` colleagues: "I opened my new NISA, only Japanese companies, I know them"; "foreign shares are a gamble". `text` Meet Michiko. `text` Word: 新NISA · new NISA, a tax-free investing account from the state since 2024. `sort` "Feeling" / "Fact": "I see their products every day", "Japan is about 5% of the world's stock market", "Foreign is risky", "Gains in a NISA are not taxed". `quiz` on what a tax-free account changes (tax, not risk). | tax-free-account, home-bias |
| 2 | **One country of many** · Shinjuku · bookshop | `predict`: Japan's share of the value of the world's listed companies [0..50, answer **5**]. `slider-chart` **countryMix**: home market −40%, rest of the world −10%; keep the total fall within 15% [goal output ≥ −15, i.e. home share ≤ 15%]. `text` home bias. `quiz`. | home-bias, diversification |
| 3 | **The 34-year wait** · Kabutocho · old exchange | `text`: Japan's main stock index peaked in Dec 1989, fell ≈ 80% by 2009, and passed the old peak only in 2024. `slider-chart` **drawdownRecovery** (reuse): find the loss that needs +400% [goal output 400]. `predict`: Michiko retires in 7 years. At 7% a year, how long does a −50% loss take to recover? [0..20, answer **10**]. `quiz`: why a deep fall weighs more at 58 than at 27. | drawdown, time-horizon, concentration-risk |
| 4 | **The yen in your basket** · Narita · arrivals | `chat` her daughter in Toronto: "Your world fund is up and the market is flat?" `predict`: $10,000 bought at ¥110/$, fund flat in dollars, the yen weakens to ¥150/$ [−50..50, answer **36**]. `text`: currency moves both ways. `match`. `quiz`. | currency-risk |
| 5 | **Your own mix** · Your stop · today | `text` Michiko's rule: "No single country gets more than its share of my peace of mind: max 30%. Money for my first retirement years stays out of the market. My rule, not a recipe." `quiz` × 2. `action`: "**{largestPositionShare}** of your depot sits in {largestPositionName}. **{largestRegionShare}** is in one region: {largestRegionName}." Rule "Max in one country or region", 10–100%, value 30, applies to `depotTotal`. | home-bias, concentration-risk |

## 5. Glossary additions (`glossary.json`)

These keys are new. Each definition is one or two plain sentences, in the same style as the existing ones.

`inflation`, `real-return`, `compound-interest`, `emergency-fund`, `time-horizon`, `installments`, `hidden-interest`, `committed-income`, `revolving-credit`, `total-cost-of-credit`, `home-bias`, `tax-free-account`, `currency-risk`.

The existing keys reused are `volatility`, `drawdown`, `diversification` and `concentration-risk`.

## 6. Code the content depends on

**Status:**

| Item | Status |
|---|---|
| §6.1, the three slider models | built |
| §6.2 item 1, `R$` formatting | built |
| §6.2 item 2, rule wording | built, as `rule.kind: 'share' \| 'multiple'` + `rule.result` (template with `{amount}`) |
| §6.2 item 4, globe mock | built |
| §6.2 item 5, tests | built |
| **§6.2 item 3, bank metrics** | **open**. Until it lands, the three lesson-5 action steps show `bodyNoData`, and the Berlin, São Paulo and Tokyo rule lines stay hidden, because their `appliesTo` amounts don't exist yet. |


The backend refuses to start when content names an unknown model. So each item marked **blocking** must land before or together with the lesson that uses it.

### 6.1 Slider models

Each new model needs four changes:
- a pure function in `front/src/lib/models.ts`;
- an entry in the `MODELS` map;
- the `SliderModel` union in `types/lessons.ts`;
- `LessonRules.MODELS` (Java).

Each also needs a test in `__tests__/models.test.ts`. All three are **blocking**.

| Model | Params (x first) | Output | Formula |
|---|---|---|---|
| `realValue` | `years` 0–20, `interest` 0–5 %, `inflation` 0–8 % | change in buying power % | ((1 + i/100) / (1 + p/100))^years − 1 |
| `installmentCost` | `discount` 0–30 %, `months` 2–24 | hidden yearly rate % | solve price·(1 − d) = price/n · annuity(r, n) for the monthly r (bisection), then (1 + r)^12 − 1 |
| `countryMix` | `homeShare` 0–100 %, `homeMove` −60–0 %, `worldMove` −60–0 % | total change % | s·h + (1 − s)·w |

### 6.2 Other code

1. **`formatValue` and `R$`** (blocking for São Paulo 3). The currency detection is `/^[^\w%\s]/`, so `"R$"` would render as `1,000R$`. Teach it multi-letter currency prefixes (`R$`), or pass the prefix explicitly.
2. **Rule wording in `ActionStep`** (blocking for Berlin 5 and São Paulo 5).
   - Today it always says "= at most {amount} {appliesToLabel} **on one bet**" and treats the value as a percent.
   - Berlin needs **months** × monthly spending, and São Paulo needs "of your income in repayments".
   - Built: an optional `rule.kind: 'share' | 'multiple'` (default `share`) and an optional `rule.result`, a template with `{amount}` that replaces the default line.
   - This changes the shared contract, so update `types/lessons.ts` and tell the team.
3. **New bank metrics** in `lib/lessonMetrics.ts`:

   | Metric | Source | Needs seed change? |
   |---|---|---|
   | `savingsShareOfAssets` | `savingsShare` selector | no |
   | `savingsRate` | `savings.rate` | no |
   | `bufferMonths` | savings ÷ monthly spending | monthly spending: from the transaction history (fixed costs) or a new seed field |
   | `creditOutstanding` | `totalCreditOutstanding` | no |
   | `monthlyRepayments` | loan `nextPayment` + Pay in 3 instalment + card minimum | no |
   | `repaymentShareOfIncome` | repayments ÷ salary (2,150 € in seed) | income selector |
   | `largestRegionShare` / `largestRegionName` | holdings by region | **yes**: `region` on each holding in `seed.ts` |

   New `AMOUNTS` are `monthlySpending`, `monthlyIncome` and `depotTotal`. Each metric returns `null` when data is missing, so `bodyNoData` shows instead.
4. **Globe mock** (`front/src/lib/stories.ts`, read by `map.tsx`):
   - add São Paulo and Tokyo;
   - flip Berlin to `available`;
   - set `progress.total` to 5 for the three new stories;
   - keep only one story `current`.

   This is only needed until the map reads `GET /api/stories`.
5. **Tests:** `LessonControllerTests` and `lessons.test.tsx` assume Seoul-only content in places. Check them after the content lands.

## 7. Real-world claims (rounded, footer "Simplified from real data.")

| Claim | Used in | Value used |
|---|---|---|
| German households keep a large share of their money in cash and deposits | Berlin 2 | qualitative only |
| Tagesgeld rate / inflation | Berlin 1–2 | 0.5% vs 3%, and 1.5% vs 2% (illustrative) |
| Broad global stock fund long-run average | Berlin 2, 4 | 5%/yr, labelled illustrative |
| "Sem juros" plans hide a cash discount | São Paulo 1 | 15% off → ≈ 36%/yr |
| Rotativo interest | São Paulo 3 | "often above 10% a month"; capped at 100% of the debt since 2024 |
| CET must be shown to borrowers | São Paulo 4 | qualitative |
| New NISA (since 2024), tax-free | Tokyo 1 | no limits quoted beyond "tax-free" |
| Japan ≈ 5% of world stock market value | Tokyo 1–2 | 5 |
| Japan's main index: peak Dec 1989, −80% by 2009, back above the peak in 2024 | Tokyo 3 | 34 years, −80% |
| Yen 2021 → 2024 | Tokyo 4 | ¥110 → ¥150 per $ |

## 8. Output (generated after the OK)

1. `back/src/main/resources/content/lessons/`: 15 files, `berlin-1..5.json`, `sao-paulo-1..5.json`, `tokyo-1..5.json`.
   - Every lesson has `lang:plain` overrides.
   - Every `slider-chart` has a `level:beginner` hint.
   - Every lesson-5 `action` has `persona:student|family|pre-retirement` overrides.
2. `stories.json`:
   - three new entries after Seoul, all `available`, with `lessonIds`;
   - Berlin's entry is replaced (currently `coming-soon`, with no character).
3. `glossary.json`: the 13 keys from §5.
4. `seoul-*.json`: remove every emoji from chat messages and titles ("VIP Room 💎", "⏳", "🚀", "😎", "🙏", "😄"), in the base text and in the variants.
5. Lessons that need code from §6 are flagged in the hand-off note, so nobody restarts the backend with a model it doesn't know yet:

   | Lesson | Needs |
   |---|---|
   | berlin-1 | `realValue` |
   | sao-paulo-1 | `installmentCost` |
   | tokyo-2 | `countryMix` |
   | sao-paulo-3 | the `R$` fix |
   | berlin-5, sao-paulo-5 | the rule wording |
   | berlin-5, sao-paulo-5, tokyo-5 | the metrics |

   Option: ship each of these lessons in the same PR as its code.

**Done when:**
- the backend starts, so `LessonContent` validation passes;
- `npm run check` passes in `front/`;
- every new lesson plays end to end in the app in both `standard` and `plain`;
- no "on one bet" text appears in a lesson where it makes no sense.

## 9. Open points

- Character portraits: the same unresolved illustration question as in historie.md §8.
- Story screen headers (skyline per city) depend on the other session's fix.
- Buenos Aires overlaps Berlin on inflation. When it gets built, focus it on *high* inflation and spending fast, not on cash vs. investing.
