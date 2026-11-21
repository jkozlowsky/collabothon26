import { createRng, seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import { drawQuestions, promptParts, quizRng } from '@/lib/quickCheck';
import { POOL } from '@/test-utils/checkPool';
import type { BankState } from '@/types/bank';

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const draw = (seed: number, consent = true, bank: BankState = seedAccount(), pool = POOL) =>
  drawQuestions(pool, bank, consent, createRng(seed));
const text = (d: ReturnType<typeof draw>[number], bank = seedAccount()) =>
  promptParts(d, bank)
    .map((p) => p.text)
    .join('');

test('the draw takes 2 finance then 2 investing, each from a different area, without repeats', () => {
  for (const seed of SEEDS) {
    const drawn = draw(seed).map((d) => d.question);
    expect(drawn.map((q) => q.category)).toEqual(['finance', 'finance', 'investing', 'investing']);
    expect(new Set(drawn.map((q) => q.id)).size).toBe(4);
    expect(drawn[0].area).not.toBe(drawn[1].area);
    expect(drawn[2].area).not.toBe(drawn[3].area);
  }
});

test('every area of the pool is reachable, retirement included', () => {
  const areas = new Set(SEEDS.flatMap((s) => draw(s).map((d) => d.question.area)));
  expect(areas).toEqual(new Set(['saving', 'debt', 'investing', 'risk', 'retirement']));
});

test('a category with fewer than 2 areas skips the whole Quick check', () => {
  expect(draw(1, true, seedAccount(), POOL.filter((q) => q.area !== 'risk' && q.area !== 'retirement'))).toEqual([]);
  expect(draw(1, true, seedAccount(), POOL.filter((q) => q.category !== 'finance'))).toEqual([]);
  expect(draw(1, true, seedAccount(), [])).toEqual([]);
});

test('the same seed draws the same questions whatever order the pool arrives in', () => {
  const ids = (pool: typeof POOL) => draw(7, true, seedAccount(), pool).map((d) => d.question.id);
  expect(ids([...POOL].reverse())).toEqual(ids(POOL));
});

test('a numeric EXPO_PUBLIC_QUIZ_SEED makes the draw repeatable; anything else, and release builds, stay random', () => {
  const pick = (rng: () => number) => drawQuestions(POOL, seedAccount(), true, rng).map((d) => d.question.id);
  expect(pick(quizRng('42', true))).toEqual(pick(quizRng('42', true)));
  for (const ignored of [quizRng('abc', true), quizRng('', true), quizRng(undefined, true), quizRng('42', false)])
    expect(ignored).toBe(Math.random);
});

test('with consent every question whose slots are filled quotes the account; without consent none does', () => {
  for (const seed of SEEDS) {
    for (const d of draw(seed)) expect(d.account).toBe(d.question.accountPrompt !== null);
    for (const d of draw(seed, false)) expect(d.account).toBe(false);
  }
});

test('account numbers are whole euros from cents, grouped, filled in only when rendering', () => {
  const runway = SEEDS.flatMap((s) => draw(s)).find((d) => d.question.id === 'savings-runway')!;
  expect(text(runway)).toBe(
    'You keep €12,500 in savings and spend about €1,268 a month. If your income stopped tomorrow, how long would your money last?',
  );
  expect(promptParts(runway, seedAccount()).filter((p) => p.filled).map((p) => p.text)).toEqual(['12,500', '1,268']);

  const generic = { ...runway, account: false };
  expect(text(generic)).toBe(POOL[0].genericPrompt);
  expect(promptParts(generic, seedAccount()).some((p) => p.filled)).toBe(false);
});

test('an account version needs every slot above zero, two positions, and a rate under 3%', () => {
  const seed = seedAccount();
  // Alone in its area, so the "usable sibling wins" rule cannot hide it.
  const find = (id: string, bank: BankState) => {
    const area = POOL.find((q) => q.id === id)!.area;
    const pool = POOL.filter((q) => q.id === id || q.area !== area);
    return SEEDS.flatMap((s) => draw(s, true, bank, pool)).find((d) => d.question.id === id);
  };
  const savings = (patch: Partial<BankState['savings']>) => ({ ...seed, savings: { ...seed.savings, ...patch } });

  expect(find('savings-runway', savings({ balance: 0 }))?.account).toBe(false);
  expect(find('rate-vs-inflation', savings({ rate: 3 }))?.account).toBe(false);
  expect(find('rate-vs-inflation', savings({ rate: 2.99 }))?.account).toBe(true);
  expect(find('one-etf-vs-one-stock', { ...seed, holdings: seed.holdings.slice(0, 1) })?.account).toBe(false);
  expect(find('one-etf-vs-one-stock', { ...seed, holdings: seed.holdings.slice(0, 2) })?.account).toBe(true);
  const noPlan = seed.standingOrders.filter((o) => !o.recipient.startsWith('Depot'));
  expect(find('etf-drop', { ...seed, standingOrders: noPlan })?.account).toBe(false);
});

test('within an area, a question with a usable account version wins', () => {
  const seed = seedAccount();
  const noLoan = { ...seed, loan: { ...seed.loan, remaining: 0 } };
  for (const s of SEEDS) {
    const debt = draw(s, true, noLoan).find((d) => d.question.area === 'debt');
    if (debt) expect(debt.question.id).toBe('card-minimum');
  }
});

test('the selectors read the slots from the bank; the monthly ETF is the depot standing order', () => {
  expect(slotValues(seedAccount())).toEqual({
    savingsBalance: 12500,
    savingsInterestRate: 2.25,
    monthOut: 1268,
    loanRemaining: 8400,
    loanApr: 5.9,
    cardUsed: 1640,
    cardLimit: 3000,
    etfMonthly: 100,
    depotTotal: 6940,
    positionCount: 4,
  });
});
