# Bank mock — spec

Frontend-only mock of the host banking app that Finance Quest (FQ) lives inside. The bank is the first screen the user sees. FQ opens as a module from it. No backend. All data comes from a seeded mock.

## Goals

1. **Pitch:** show FQ as a module inside a real-looking banking app (FEATURES.md suggestion).
2. **Data source:** lessons and FQ cards can read the user's numbers (balance, savings, holdings, credits) through one hook.
3. **Act on the lesson (later, optional):** bank state can be changed, so a lesson can end with a real bank step. The exact action is **not decided yet** because lessons don't exist. Do not build it now. Keep the data layer mutable so it can be added.

## Design source

Figma file `R4dCZH3fl7LqTwbqX3a6Jd`, Page 1. Frames (390 wide):

| Frame | Node | Contents |
|---|---|---|
| Bank — Home | `11:452` | Greeting "Good evening / Alex Krause" + avatar "AK", scan + bell icons. Main account card (dark, "€ 4,280.52", masked IBAN, eye toggle, "In this month +€ 2,150.00" / "Out this month −€ 1,268.40"). Quick actions: Transfer · Scan & pay · Top up · More. FQ card "Continue: Your first share" (Lesson 3 of 8 · 4 min · 5-day streak, progress bar). Cards carousel (dark MyBank debit card + yellow second card) + Manage. Investments (Depot · 4 positions, € 6,940.10, +3.2% · 1Y, sparkline, 1W/1M/1Y/Max) + Open depot. Credits & savings (Instalment loan, Credit card limit, Savings account) + See all. Recent activity (Supermarket, Salary, Streaming subscription, Transfer to Anna) + See all. |
| Bank — Payments | — | Title + search. Contacts row: New (+), Anna, Mark, Mom, Landlord. Actions: To card · By IBAN · Scan & pay · Top up phone. Standing orders (Rent, Electricity, Savings plan ETF) + Add. Pending (Transfer to Mark, Online store) + See all. |
| Bank — Credits | — | Title + calendar icon. Instalment loan card (€ 8,400.00 remaining, 31 of 48 paid, Next payment € 175.00 · 1 Dec, Interest rate 5.9% APR). FQ card "How interest really works". Your credit products (Credit card limit, Overdraft, Pay in 3). Explore: Loan calculator (From 4.9% APR), Refinance a loan. |
| Bank — Invest | `26:1128` | Title + search. Depot card (4 positions, € 6,940.10, chart, ranges). Allocation bar (ETFs 55%, Stocks 25%, Bonds 12%, Cash 8%). FQ card "Before your next trade: diversification" (5 lessons · no advice). Holdings (World Equity ETF, Europe Dividend ETF, Clean Energy Fund, Government Bond 2030, Cash) + Sort. |
| Learn — Globe / Glossary | — | FQ nav: **Bank · Map · Glossary · Profile** |
| Design Kit | — | Colours, Inter type styles, Elevation + **Glass** effect styles, 24px 2px-stroke icons, components |

Copy the exact strings and numbers from the frames into the seed. Read the frames before building each screen. The Figma MCP Starter plan hit its rate limit during the interview, so if the MCP is still blocked, use Claude in Chrome on the Figma file (select a layer → Shift+2 → zoom screenshot).

Use the `finance-quest-ui` skill and the existing tokens in `front/src/constants/theme.ts`.

## Navigation

### Floating nav

One custom `FloatingNav` component (Figma "Floating Nav", glass pill + a separate round button on the right). It replaces the stock tab bar in both groups.

| Mode | Pill items | Right button |
|---|---|---|
| Bank | Overview · Payments · Credits · Invest | **Learn** (globe, yellow ring) |
| Learn | Bank · Map · Glossary · Profile (4 items in one pill, per Figma) | — |

- Active item: yellow (`brand` accent) filled pill behind icon + label, as in Figma.
- **Morph:** switching groups animates the pill content (Reanimated: cross-fade + width/layout transition). The pill itself stays in place. Respect reduced motion.
- **Keep state:** each group keeps its own tab state and scroll position. Bank → Learn → Bank returns to the exact bank tab and scroll you left, and the same for Learn.
- "Bank" in Learn mode is a button, not a route. It switches back to the last active bank tab.
- **Glass:** `expo-blur` (`npx expo install expo-blur`) where it is supported. Android and any unsupported platform get a semi-opaque `bgSurface` plus `elevation.mid`, so the nav never looks broken.

### Routes

```
src/app/
  _layout.tsx              root Stack; BankProvider + OnboardingProvider
  (bank)/_layout.tsx       Tabs, tabBar = FloatingNav mode="bank"
  (bank)/index.tsx         Overview (Bank — Home)
  (bank)/payments.tsx
  (bank)/credits.tsx
  (bank)/invest.tsx
  (learn)/_layout.tsx      Tabs, tabBar = FloatingNav mode="learn"
  (learn)/map.tsx          ← current (tabs)/index.tsx content, renamed "Map"
  (learn)/glossary.tsx     ← moved from (tabs)
  (learn)/profile.tsx      ← moved from (tabs)
  onboarding.tsx
  lesson/[id].tsx
  transfer.tsx             modal / formSheet (3 steps)
  trade/[holdingId].tsx    modal: fake order ticket
```

- `(tabs)` goes away. Tell the team, because this changes paths other streams use (`/(tabs)/...` links, e2e).
- Both groups stay mounted in the root Stack so state survives (switch with `router.navigate`, don't replace). Check the Expo Router SDK 58 docs for how to keep a group mounted. If it unmounts, keep the last bank tab in BankProvider UI state as a fallback.
- The Globe map screen is **out of scope** (another stream owns it). The Map tab shows the existing lesson-path content.

### Onboarding gate (changes the root layout)

- The app opens on `(bank)/index`. There is no onboarding guard on the bank.
- The first tap on the Learn button **or any FQ card** while onboarding is not done → `/onboarding`. When it finishes → `(learn)/map`.
- Once onboarding is done, Learn goes straight to Map.
- Replace the `Stack.Protected guard={!done}` structure: `(bank)` is always available, and `(learn)` + `lesson/[id]` are protected by `done`. Onboarding stays reachable only while it is not done.

## Data layer

`front/src/lib/bank/`

- `types.ts`: `Account`, `Card`, `Transaction`, `StandingOrder`, `PendingPayment`, `Contact`, `CreditProduct`, `InstalmentLoan`, `Holding`, `DepotSeries` (per range), `Allocation`, `FqTeaser`.
- `seed.ts`: a deterministic generator (a small seeded PRNG such as mulberry32; no new dependency) with a fixed seed. **Every number visible in the Figma frames is hard-coded to match.** The PRNG only fills what Figma doesn't show: the full "See all" transaction history (~30–40 rows over 60 days), depot chart series for 1W/1M/1Y/Max ending at € 6,940.10, and IBANs. The same seed gives the same output on every run.
- Shape it as `seedAccount(seed): BankState` so that multiple accounts later means one seed per account. The account system is still undecided, so don't build account switching now.
- Identity: "Alex Krause", initials "AK", fixed in the seed. It does not come from onboarding.
- `BankProvider.tsx` + `useBank()`: React context with `useReducer`. **In memory only.** Every reload starts clean from the seed. No AsyncStorage.
  - state: `BankState` + UI state `{ amountsHidden: boolean, lastBankTab }`
  - actions: `toggleAmountsHidden()`, `sendTransfer({ contactId | { name, iban }, amount, reference })`, `placeOrder({ holdingId, side, amount })` (fake, see Trade)
  - selectors for lessons (pure functions in `selectors.ts`): `mainBalance`, `monthIn/monthOut`, `savingsShare`, `largestPositionShare`, `allocation`, `totalCreditOutstanding`. These are the "A u Ciebie?" numbers.
- Money: store integer cents. Format with one helper `formatEUR(cents, { signed })` → `€ 4,280.52`, `−€ 42.18`, `+€ 2,150.00` (thin minus as in Figma, en locale, a space after €). Masked form when `amountsHidden`: `€ ••••`.

## Screens and interactions

### Works (mutates state or shows real mock data)

1. **Eye toggle** on the main account and loan cards: hides **all** amounts app-wide through `amountsHidden`.
2. **Chart ranges** 1W/1M/1Y/Max on Home and Invest: they switch the seeded series and the % change chip. The sparkline uses a smooth line + yellow gradient fill as in Figma (react-native-svg, if it is already in the project; otherwise check before adding it).
3. **Detail sheets** (bottom sheet / formSheet): transaction (merchant, category, date/time, card or account, amount, status), card (masked number, limit, expiry; no freeze/actions → toast), holding (units, value, change by range, type, ISIN-like id) + **Buy** button, credit product (limit/used/APR/next payment), standing order (amount, interval, next date).
4. **Transfer flow**: a 3-step sheet started from Home "Transfer", Payments contacts, "To card"/"By IBAN".
   1. Recipient: the contacts row, or **New** → name + IBAN (basic format check: DE + 20 digits, spaces allowed).
   2. Amount: keypad + optional reference. Valid when `0 < amount ≤ balance`. Show an inline error otherwise.
   3. Confirm → success state (check icon, amount, recipient) → Done.
   Effect: the balance drops, the row appears at the top of Recent activity ("Today") and in Payments → Pending ("Processing · instant"), and "Out this month" grows.
5. **Loan calculator** (Credits → Explore): sliders for amount (€ 1,000–50,000) and term (12–96 months), rate fixed at 4.9% APR from Figma. Shows the monthly instalment, total interest and total repaid using the standard annuity formula. Read-only, with no "apply" button. Add a short line explaining what APR is, and/or a link to the glossary term (educate).
6. **Trade intercept** (Invest): holding sheet → **Buy** → nudge sheet: "Before you trade: a 3-min lesson on diversification?" [Learn first] [Continue to order].
   - Learn first → the same route as the FQ card (onboarding gate → Map).
   - Continue → a fake order ticket (amount in €, estimated units, "Demo — no real order") → confirm → a toast. The holding value goes up and Cash goes down through `placeOrder`.
   - Show the nudge on every Buy for the demo (no "don't show again").
   - Copy must stay educational: no "you should buy", no recommendation (MiFID II).
7. **FQ cards** on Home/Credits/Invest: tap → onboarding gate → `(learn)/map` with param `?focus=<storyOrLessonId>` (Map may ignore it for now). The card text and progress come from the static `FqTeaser` entries in the seed.
8. **"See all"** on Recent activity / Pending / Credit products → a simple list screen or sheet using the seeded history. If time is short, show a toast instead.

### Demo-only (toast)

A non-blocking toast "Demo only": Scan & pay, Top up, Top up phone, More, the bell, the scan icon, Manage (cards), Sort, search, the calendar icon, Add (standing order), Open depot, Refinance a loan, the second card's actions. Build one shared `useToast()`/`<Toast>`, positioned above the floating nav.

## Testing / done criteria

- `npx expo lint` and `npx tsc --noEmit` are clean.
- **Jest** (`src/__tests__/bank.test.ts[x]`):
  - the seed is deterministic (two calls → deep-equal) and the Figma numbers match (balance 428052, depot 694010, loan 840000…)
  - a transfer reduces the balance, adds a transaction + pending row and updates monthOut
  - transfer validation: 0, negative, > balance and a bad IBAN are rejected
  - `toggleAmountsHidden` makes `formatEUR` output masked
  - loan calculator maths (one known annuity case)
  - selectors (`largestPositionShare`, `savingsShare`)
- **Playwright e2e** (`e2e/smoke.spec.ts`): the app opens on the bank Overview ("Alex Krause", € 4,280.52) → tap Learn → onboarding shows → complete it → Map tab → tap Bank → back on Overview → do a transfer to Anna → the balance has gone down.
- **Visual check**: screenshots of all 4 bank tabs + the Learn nav on web at 390 width, compared side by side with the Figma frames. Fix spacing, type and colour differences.

## Out of scope

- Backend, any API.
- The Globe map screen.
- Multiple accounts / account switching (undecided; only the seed shape prepares for it).
- The lesson "act" step (wait for lessons).
- Persistence across reloads.
- Real card controls, scan, top-up, notifications.

## Open questions

- What the account system will look like (per-persona data sets?). Decide before adding a second seed.
- Which bank action(s) lessons should end with (standing order / personal rule / deep-link highlight).
- What the FQ card ids map to once the Map/stories exist.
- Who updates other streams' links and e2e after `(tabs)` → `(learn)`.

## Implementation notes (2026-11-20)

Where the build differs from the plan above:

- **Sheets are components, not routes.** Transfer, trade, detail, loan calculator and "See all" sheets are built on RN `Modal` (`components/bank/Sheet.tsx`), not `transfer.tsx` / `trade/[holdingId].tsx` routes. This is simpler and behaves the same on Android and web. The transfer sheet is global (`useTransferSheet`), and the others belong to their screens.
- **Onboarding is not a protected route.** Removing a `Stack.Protected` screen rebuilt the root stack and reset the bank to Overview. Now onboarding is a plain stack screen. `useResumeLearnAfterOnboarding` (in `(main)/_layout`) closes it when `done` flips and goes on to the Learn target. Profile → "Restart onboarding" goes back to the bank, and the next Learn tap shows the flow again.
- **Nav switching** uses the outer tab navigator's `navigateToTab(key)`, so each side keeps its last tab and scroll position.
- **"See all"** works for Recent activity. Pending and credit products show the "Demo only" toast.
- **Allocation** is computed from holdings. Europe Dividend ETF and Clean Energy Fund count as "Stocks", so the bar matches Figma's 55 / 25 / 12 / 8.
