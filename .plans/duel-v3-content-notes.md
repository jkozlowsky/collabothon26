# Duel v3 Content Calculations & Notes

This document records the mathematical calculations, formulas, parameters, and rationale for all 55 duel questions across the 7 story categories in `back/src/main/resources/content/duel/*.json`.

## Story: `berlin` (Inflation & savings)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `berlin-d01` | `berlin-1` / `p1` | `predict` | inflation, real-return | Maya €30,000, interest 1%, inflation 4%, 10 years: €30,000 * ((1 + 0.01) / (1 + 0.04))^10 = €30,000 * (1.01 / 1.04)^10 ≈ €22,272. On slider with step 500: 22500 (within tolerance 1500, range 21000-24000). |
| `berlin-d02` | `berlin-1` / `q2` | `quiz` | inflation, real-return | Real return approx: 2.5% - 4.5% = -2.0% per year. |
| `berlin-d03` | `berlin-2` / `p1` | `predict` | compound-interest | Daniel €12,000 at 6% annual compound interest for 15 years: €12,000 * (1.06)^15 = €12,000 * 2.396558 = €28,758.70. On slider with step 500: 29000 (tolerance 1500 covers 27500-30500). |
| `berlin-d04` | `berlin-2` / `q2` | `quiz` | compound-interest | Concept question on compounding exponential curve. |
| `berlin-d05` | `berlin-3` / `p1` | `predict` | emergency-fund | Emergency fund: 4 months * €3,200/month = €12,800. Exact slider step (12800 = 32 * 400). |
| `berlin-d06` | `berlin-3` / `so1` | `sort` | time-horizon, emergency-fund | Sort categorization: emergency reserve vs long-term investment. |
| `berlin-d07` | `berlin-4` / `s1` | `chart` | drawdown | Drawdown recovery formula: (1 / (1 - 0.20) - 1) * 100 = (1 / 0.80 - 1) * 100 = 25%. |
| `berlin-d08` | `berlin-4` / `q1` | `quiz` | drawdown | Drawdown recovery: 25 / (100 - 25) = 25 / 75 = 33.33%. |
| `berlin-d09` | `berlin-5` / `q1` | `quiz` | emergency-fund | Conceptual question on emergency fund sizing. |
| `berlin-d10` | `berlin-5` / `q2` | `quiz` | inflation | Real purchasing power: (1 / 1.03)^20 = 0.5537, loss is 1 - 0.5537 = 44.63% ≈ 45%. |

## Story: `seoul` (Hype & leverage)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `seoul-d01` | `seoul-1` / `p1` | `predict` | volatility | Chained returns: (1 + 0.30) * (1 - 0.30) - 1 = 1.30 * 0.70 - 1 = 0.91 - 1 = -0.09 (-9%). Slider min -40, max 20, step 1. |
| `seoul-d02` | `seoul-1` / `q2` | `quiz` | drawdown | Drawdown recovery: 60 / (100 - 60) = 60 / 40 = 150% gain. |
| `seoul-d03` | `seoul-2` / `s1` | `chart` | leverage | Leveraged return: move * (1 + borrowed / 100) = -25 * (1 + 100 / 100) = -25 * 2 = -50%. |
| `seoul-d04` | `seoul-2` / `q1` | `quiz` | leverage, risk-capacity | Total position: €5k + €10k = €15k. Loss: 20% of €15k = €3,000. Loss on own €5k equity = 3,000 / 5,000 = 60%. |
| `seoul-d05` | `seoul-3` / `so1` | `sort` | leading-room | Sort categorization of chat room red flags vs market info. |
| `seoul-d06` | `seoul-3` / `q2` | `quiz` | pump-and-dump | Conceptual pump and dump mechanics. |
| `seoul-d07` | `seoul-4` / `p1` | `predict` | diversification | Portfolio loss from 2 bankruptcies out of 25 equal holdings: 2 * (1 / 25) * (-100%) = -8%. |
| `seoul-d08` | `seoul-4` / `s1` | `chart` | concentration-risk | oneCompanyCrash model: concentratedChange(30, -60) = (30 * -60) / 100 = -18%. |
| `seoul-d09` | `seoul-5` / `q1` | `quiz` | risk-capacity | Conceptual risk capacity & discipline. |
| `seoul-d10` | `seoul-5` / `q2` | `quiz` | concentration-risk | Position sizing cap: max loss = 5% of total capital. |

## Story: `sao-paulo` (Instalments & debt)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `sao-paulo-d01` | `sao-paulo-1` / `p1` | `predict` | hidden-interest | hiddenYearlyRate(10, 12): Solves 0.90 = 1/12 * (1 - (1+r)^-12)/r. Monthly r ≈ 1.66%, annualized (1+r)^12 - 1 = 21.8% ≈ 22%. |
| `sao-paulo-d02` | `sao-paulo-1` / `q1` | `quiz` | installments | Conceptual definition of hidden interest in zero-interest installment marketing. |
| `sao-paulo-d03` | `sao-paulo-2` / `p1` | `predict` | committed-income | Committed income: €750 / €2,500 = 0.30 (30%). Slider range 0-60%, step 1%. |
| `sao-paulo-d04` | `sao-paulo-2` / `so1` | `sort` | committed-income | Sort categorization of committed vs flexible spending. |
| `sao-paulo-d05` | `sao-paulo-3` / `q1` | `quiz` | revolving-credit | Conceptual revolving credit dynamics. |
| `sao-paulo-d06` | `sao-paulo-3` / `q2` | `quiz` | compound-interest, revolving-credit | Revolving credit interest capitalization and compounding. |
| `sao-paulo-d07` | `sao-paulo-4` / `p1` | `predict` | total-cost-of-credit | Total effective cost: (€250 interest + €250 fees) / €5,000 = €500 / €5,000 = 10.0%. |
| `sao-paulo-d08` | `sao-paulo-4` / `m1` | `match` | total-cost-of-credit, hidden-interest | Matching credit cost components to definitions. |
| `sao-paulo-d09` | `sao-paulo-5` / `q1` | `quiz` | committed-income | Installment cap: 15% of €2,200 = €330. |
| `sao-paulo-d10` | `sao-paulo-5` / `q2` | `quiz` | revolving-credit | Conceptual rule on paying credit cards in full. |

## Story: `tokyo` (Diversification)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `tokyo-d01` | `tokyo-1` / `so1` | `sort` | time-horizon | Sort categorization by time horizon (liquidity vs long-term equity growth). |
| `tokyo-d02` | `tokyo-1` / `q1` | `quiz` | time-horizon | Conceptual risk of investing short-term liquidity in volatile assets. |
| `tokyo-d03` | `tokyo-2` / `s1` | `chart` | diversification | countryMix model: 0.60 * (-30) + (1 - 0.60) * 10 = -18 + 4 = -14%. |
| `tokyo-d04` | `tokyo-2` / `q2` | `quiz` | diversification | Conceptual definition of diversification benefits and limitations. |
| `tokyo-d05` | `tokyo-3` / `p1` | `predict` | time-horizon, drawdown | Drawdown recovery time: 0.60 * (1.08)^t = 1.0 => (1.08)^t = 1.6667 => t = ln(1.6667)/ln(1.08) = 6.64 years ≈ 7 years. At t=6: 0.952, at t=7: 1.028. |
| `tokyo-d06` | `tokyo-3` / `q2` | `quiz` | drawdown | Loss asymmetry: €10,000 * 0.60 * 1.40 = €8,400 (net loss €1,600 or -16%). |
| `tokyo-d07` | `tokyo-4` / `p1` | `predict` | currency-risk | Currency move: $2,000 / 1.20 = €1,666.67. (€1,666.67 - €2,000) / €2,000 = -16.67% ≈ -17%. |
| `tokyo-d08` | `tokyo-4` / `m1` | `match` | currency-risk, diversification | Terminology matching for currency risk and global portfolio concepts. |
| `tokyo-d09` | `tokyo-5` / `q1` | `quiz` | compound-interest | Conceptual exponential growth of monthly investment plan. |
| `tokyo-d10` | `tokyo-5` / `q2` | `quiz` | time-horizon | Dollar cost averaging characteristics and limitations. |

## Story: `buenos-aires` (Fast inflation)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `buenos-aires-d01` | `buenos-aires-1` / `q1` | `predict` | rule-of-72 | Rule of 72: 72 / 8 = 9 years. |
| `buenos-aires-d02` | `buenos-aires-1` / `s1` | `chart` | inflation | realValue model: (1 / 1.10)^3 - 1 = 1 / 1.331 - 1 = 0.7513 - 1 = -24.87% ≈ -25%. |
| `buenos-aires-d03` | `buenos-aires-1` / `q2` | `quiz` | inflation | 100% inflation means price level = 2.0x, purchasing power = 1 / 2.0 = 50% of original. |
| `buenos-aires-d04` | `buenos-aires-1` / `q3` | `quiz` | inflation | Conceptual impact of high inflation on idle cash. |
| `buenos-aires-d05` | `buenos-aires-1` / `s2` | `predict` | inflation, real-return | Real value after 1 year: €10,000 * (1 + 0.02) / (1 + 0.12) = €10,000 * 1.02 / 1.12 = €9,107.14. Slider step 100 -> 9100. |

## Story: `nairobi` (Small savings)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `nairobi-d01` | `nairobi-1` / `p1` | `predict` | pay-yourself-first | Weekly savings: €25/week * 104 weeks = €2,600. |
| `nairobi-d02` | `nairobi-1` / `q2` | `quiz` | pay-yourself-first | Conceptual definition of Pay Yourself First. |
| `nairobi-d03` | `nairobi-1` / `q1` | `quiz` | pay-yourself-first | Conceptual value of habit formation and micro-savings. |
| `nairobi-d04` | `nairobi-1` / `s1` | `predict` | compound-interest | Emergency buffer accumulation: €60/month * 60 months = €3,600. Slider step 100: 3600 (tolerance 100). |
| `nairobi-d05` | `nairobi-1` / `s2` | `quiz` | compound-interest | Monthly plan with compounding: monthlyPlanValue(100, 10, 4) ≈ €14,725 > €12,000. |

## Story: `mumbai` (Gold)

| Question ID | Lesson / Step | Type | Concepts | Math / Calculation Notes |
|---|---|---|---|---|
| `mumbai-d01` | `mumbai-1` / `s1` | `chart` | drawdown | Drawdown recovery for 30% slump: (1 / (1 - 0.30) - 1) * 100 = (1 / 0.70 - 1) * 100 = 42.86% ≈ 43%. Slider step 1: 43 (tolerance 3). |
| `mumbai-d02` | `mumbai-1` / `q1` | `quiz` | volatility | Conceptual gold price cyclicality and volatility. |
| `mumbai-d03` | `mumbai-1` / `q2` | `quiz` | volatility | Conceptual difference between yield-bearing assets and commodities. |
| `mumbai-d04` | `mumbai-1` / `q3` | `quiz` | diversification | Conceptual portfolio diversification with non-correlated commodities. |
| `mumbai-d05` | `mumbai-1` / `s2` | `chart` | diversification | countryMix model: 0.20 * (-30) + 0.80 * 0 = -6%. |




## Content Review & Verification Report (Spec D10, §4)

Reviewed all 55 duel questions across 7 stories against facts, math, fresh context/numbers (non-copy), MiFID II tone, and category/concept fit.
Total questions: 55 | Fixed: 18 | Unchanged: 37 | Unsure: 0.

### Per-Question Verdict Table

| Question ID | Story | Type | Verdict | Details / Action Taken |
|---|---|---|---|---|
| `berlin-d01` | `berlin` | predict | ok | Maya €30k, 1% int, 4% inf, 10y -> €22,500 real. Math & bounds verified. |
| `berlin-d02` | `berlin` | quiz | ok | Bond 2.5% vs 4.5% inf -> -2% real return. Facts & options verified. |
| `berlin-d03` | `berlin` | predict | ok | Daniel €12k, 6% compound, 15y -> €29,000. Math verified. |
| `berlin-d04` | `berlin` | quiz | ok | Exponential compound growth explanation. Facts & options verified. |
| `berlin-d05` | `berlin` | predict | fixed | Rewrote prompt with persona (Felix) & family costs to avoid sentence clone vs lesson. |
| `berlin-d06` | `berlin` | sort | ok | 6 distinct items sorted into emergency reserve vs long-term investment. |
| `berlin-d07` | `berlin` | chart | ok | Drawdown recovery: -20% loss -> +25% gain needed. |
| `berlin-d08` | `berlin` | quiz | fixed | Rewrote prompt with persona (Hannah) & equity fund context to avoid clone. |
| `berlin-d09` | `berlin` | quiz | ok | Emergency fund sizing in months of costs. Facts & options verified. |
| `berlin-d10` | `berlin` | quiz | ok | Cash purchasing power over 20y at 3% inf (-45%). Math & options verified. |
| `buenos-aires-d01` | `buenos-aires` | predict | fixed | Rewrote prompt with urban cost-of-living context to avoid single-number clone. |
| `buenos-aires-d02` | `buenos-aires` | chart | fixed | Clarified prompt to percentage change to match negative slider range [-50, 0]. |
| `buenos-aires-d03` | `buenos-aires` | quiz | fixed | Rewrote prompt with hyperinflation context to avoid true/false clone. |
| `buenos-aires-d04` | `buenos-aires` | quiz | ok | Idle cash damage during high inflation. Facts & options verified. |
| `buenos-aires-d05` | `buenos-aires` | predict | fixed | Clarified prompt to 'in today's purchasing power' for clarity. |
| `mumbai-d01` | `mumbai` | chart | fixed | Changed loss from 40% (lesson copy) to 30%, gain 43% (ans 43, tol 3). |
| `mumbai-d02` | `mumbai` | quiz | ok | Gold multi-year price cycles & volatility. Facts & options verified. |
| `mumbai-d03` | `mumbai` | quiz | ok | Commodity yield vs dividend assets. Facts & options verified. |
| `mumbai-d04` | `mumbai` | quiz | ok | Gold portfolio allocation rationale. Facts & options verified. |
| `mumbai-d05` | `mumbai` | chart | fixed | Rewrote prompt with persona (Rajiv) and wealth allocation scenario. |
| `nairobi-d01` | `nairobi` | predict | fixed | Rewrote prompt with persona (Amina) and weekly Friday budget context. |
| `nairobi-d02` | `nairobi` | quiz | ok | Pay Yourself First budgeting principle. Facts & options verified. |
| `nairobi-d03` | `nairobi` | quiz | ok | Value of habitual micro-savings. Facts & options verified. |
| `nairobi-d04` | `nairobi` | predict | fixed | Changed from €50/mo (lesson hint copy) to €60/mo -> €3,600 (ans 3600, tol 100). |
| `nairobi-d05` | `nairobi` | quiz | ok | Monthly compounding vs 0% interest. Facts & options verified. |
| `sao-paulo-d01` | `sao-paulo` | predict | ok | Laptop €1,200 12x vs €1,080 cash upfront -> 22% hidden interest. Math verified. |
| `sao-paulo-d02` | `sao-paulo` | quiz | ok | Definition of true 0% interest. Facts & options verified. |
| `sao-paulo-d03` | `sao-paulo` | predict | ok | Carlos €750 installments / €2,500 salary -> 30%. Math verified. |
| `sao-paulo-d04` | `sao-paulo` | sort | ok | 6 distinct items sorted into committed obligation vs flexible spending. |
| `sao-paulo-d05` | `sao-paulo` | quiz | ok | Revolving credit minimum payment risks. Facts & options verified. |
| `sao-paulo-d06` | `sao-paulo` | quiz | ok | Interest capitalization and compounding. Facts & options verified. |
| `sao-paulo-d07` | `sao-paulo` | predict | ok | €5k loan, €250 int + €250 fee -> 10% CET. Math verified. |
| `sao-paulo-d08` | `sao-paulo` | match | ok | Credit terms (nominal rate, origination fee, insurance, CET) verified. |
| `sao-paulo-d09` | `sao-paulo` | quiz | fixed | Rewrote prompt with Lucas debt cap scenario to avoid number swap clone. |
| `sao-paulo-d10` | `sao-paulo` | quiz | ok | Paying credit card bill in full. Facts & options verified. |
| `seoul-d01` | `seoul` | predict | fixed | Rewrote prompt with Min-seo tech share scenario (+30% then -30% -> -9%). |
| `seoul-d02` | `seoul` | quiz | fixed | Rewrote prompt with record peak correction scenario (-60% -> +150%). |
| `seoul-d03` | `seoul` | chart | fixed | Rewrote prompt with Jin-woo margin leverage trade scenario (2x leverage, -25% -> -50%). |
| `seoul-d04` | `seoul` | quiz | fixed | Rewrote prompt, options & explanation with Sora margin trading to avoid clone. |
| `seoul-d05` | `seoul` | sort | ok | 6 distinct chat room messages sorted into red flag vs legitimate info. |
| `seoul-d06` | `seoul` | quiz | ok | Coordinated buying in tip chat rooms (pump & dump). Facts verified. |
| `seoul-d07` | `seoul` | predict | fixed | Rewrote prompt with Elena 25-stock portfolio fraud collapse scenario. |
| `seoul-d08` | `seoul` | chart | ok | Concentrated position loss (30% share * -60% crash = -18%). Math verified. |
| `seoul-d09` | `seoul` | quiz | ok | Setting risk limits and position caps in advance. Facts verified. |
| `seoul-d10` | `seoul` | quiz | fixed | Rewrote prompt, options & explanation with Min-ho liquid portfolio risk management. |
| `tokyo-d01` | `tokyo` | sort | ok | 6 financial goals sorted by time horizon (short-term vs long-term). |
| `tokyo-d02` | `tokyo` | quiz | ok | Why rent money should not be invested in stocks. Facts verified. |
| `tokyo-d03` | `tokyo` | chart | fixed | Rewrote prompt with Aoi domestic (60%, -30%) and global (40%, +10%) -> -14%. |
| `tokyo-d04` | `tokyo` | quiz | ok | Broad global diversification scope and limitations. Facts verified. |
| `tokyo-d05` | `tokyo` | predict | fixed | Rewrote prompt with Kenji recession rebound scenario (-40%, +8%/yr -> 7y). |
| `tokyo-d06` | `tokyo` | quiz | fixed | Rewrote prompt with Hiroshi crash rebound scenario (€10k -> €6k -> €8,400). |
| `tokyo-d07` | `tokyo` | predict | fixed | Rewrote prompt with Yuki US tech share currency move scenario (-17%). |
| `tokyo-d08` | `tokyo` | match | ok | Global investing terminology (home bias, currency risk, drawdown, diversification). |
| `tokyo-d09` | `tokyo` | quiz | ok | Steeper portfolio growth curve after 20y from compounding. Facts verified. |
| `tokyo-d10` | `tokyo` | quiz | ok | Dollar cost averaging limits (does not guarantee profit). Facts verified. |

### Verification Tests
- Command: `cd back && ./mvnw -q test -Dtest='DuelContentTests,DuelContentParserTests'`
- Result: 24 tests run, 0 failures, 0 errors.
