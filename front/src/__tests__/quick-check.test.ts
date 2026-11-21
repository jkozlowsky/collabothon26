import { createRng, seedAccount } from '@/lib/bank/seed';
import { depotTotal, positionCount, slotValues } from '@/lib/bank/selectors';
import { accountUsable, drawQuestions, fetchCheckQuestions, promptParts, quizRng } from '@/lib/quickCheck';
import { POOL } from '@/test-utils/checkPool';
import type { BankState } from '@/types/bank';
import type { CheckQuestion, Drawn } from '@/types/quickCheck';

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const draw = (seed: number, consent = true, bank: BankState = seedAccount(), pool = POOL) =>
  drawQuestions(pool, bank, consent, createRng(seed));
const quotes = (d: Drawn, consent = true, bank: BankState = seedAccount()) =>
  accountUsable(d.question, bank, consent);
const text = (d: Drawn, account: boolean) =>
  promptParts(d.question, seedAccount(), account)
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
    for (const d of draw(seed)) expect(quotes(d)).toBe(d.question.accountPrompt !== null);
    for (const d of draw(seed, false)) expect(quotes(d, false)).toBe(false);
  }
});

test('account numbers are whole euros from cents, grouped, filled in only when rendering', () => {
  const runway = SEEDS.flatMap((s) => draw(s)).find((d) => d.question.id === 'savings-runway')!;
  expect(text(runway, true)).toBe(
    'You keep €12,500 in savings and spend about €1,268 a month. If your income stopped tomorrow, how long would your money last?',
  );
  const filled = promptParts(runway.question, seedAccount(), true).filter((p) => p.filled);
  expect(filled.map((p) => p.text)).toEqual(['12,500', '1,268']);

  expect(text(runway, false)).toBe(POOL[0].genericPrompt);
  expect(promptParts(runway.question, seedAccount(), false).some((p) => p.filled)).toBe(false);
});

test('an account version needs every slot above zero, two positions, and a rate under 3%', () => {
  const seed = seedAccount();
  // Alone in its area, so the "usable sibling wins" rule cannot hide it.
  const usableWith = (id: string, bank: BankState) => {
    const area = POOL.find((q) => q.id === id)!.area;
    const pool = POOL.filter((q) => q.id === id || q.area !== area);
    const drawn = SEEDS.flatMap((s) => draw(s, true, bank, pool)).find((d) => d.question.id === id)!;
    return quotes(drawn, true, bank);
  };
  const savings = (patch: Partial<BankState['savings']>) => ({ ...seed, savings: { ...seed.savings, ...patch } });

  expect(usableWith('savings-runway', savings({ balance: 0 }))).toBe(false);
  expect(usableWith('rate-vs-inflation', savings({ rate: 3 }))).toBe(false);
  expect(usableWith('rate-vs-inflation', savings({ rate: 2.99 }))).toBe(true);
  expect(usableWith('one-etf-vs-one-stock', { ...seed, holdings: seed.holdings.slice(0, 1) })).toBe(false);
  expect(usableWith('one-etf-vs-one-stock', { ...seed, holdings: seed.holdings.slice(0, 2) })).toBe(true);
  const noPlan = seed.standingOrders.filter((o) => !o.recipient.startsWith('Depot'));
  expect(usableWith('etf-drop', { ...seed, standingOrders: noPlan })).toBe(false);
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
  const bank = seedAccount();
  const eur = (cents: number) => Math.round(cents / 100);
  const plan = bank.standingOrders.find((o) => o.recipient.startsWith('Depot'))!;
  expect(slotValues(bank)).toEqual({
    savingsBalance: eur(bank.savings.balance),
    savingsInterestRate: bank.savings.rate,
    monthOut: eur(bank.account.monthOut),
    loanRemaining: eur(bank.loan.remaining),
    loanApr: bank.loan.apr,
    cardUsed: eur(bank.creditCard.used),
    cardLimit: eur(bank.creditCard.limit),
    etfMonthly: eur(Math.abs(plan.amount)),
    depotTotal: eur(depotTotal(bank)),
    positionCount: positionCount(bank),
  });
  const bigger = { ...bank, standingOrders: [{ ...plan, amount: -25000 }] };
  expect(slotValues(bigger).etfMonthly).toBe(250);
});

test('the seeded draw sorts the pool by code unit, not by locale', () => {
  const finance = (id: string, area: CheckQuestion['area']): CheckQuestion => ({
    ...POOL[0],
    id,
    area,
    accountPrompt: null,
    slots: [],
  });
  const pool = [finance('a-first', 'saving'), finance('B-first', 'saving'), finance('x', 'debt'), ...POOL.slice(4)];
  const first = drawQuestions(pool, seedAccount(), false, () => 0)[0].question.id;
  expect(first).toBe('B-first');
});

test('a question whose account prompt quotes an unknown or undeclared slot only has its generic version', () => {
  const bank = seedAccount();
  const withPrompt = (accountPrompt: string, slots: CheckQuestion['slots']) => ({ ...POOL[2], accountPrompt, slots });
  expect(accountUsable(withPrompt('Your loan is {loanRemaining}.', ['loanRemaining']), bank, true)).toBe(true);
  expect(accountUsable(withPrompt('Your {mystery} is {loanRemaining}.', ['loanRemaining']), bank, true)).toBe(false);
  expect(accountUsable(withPrompt('Your loan is {loanRemaining}.', []), bank, true)).toBe(false);
  const unknownSlot = withPrompt('Your loan is {loanRemaining}.', ['loanRemaining', 'unknown' as never]);
  expect(accountUsable(unknownSlot, bank, true)).toBe(false);
});

test('pool items the front cannot use are skipped, the rest are kept', async () => {
  const good = POOL[0];
  const items = [
    good,
    null,
    'text',
    { ...good, id: 7 },
    { ...good, id: 'bad-category', category: 'other' },
    { ...good, id: 'area-of-the-other-category', area: 'risk' },
    { ...good, id: 'no-slots', slots: undefined },
    { ...good, id: 'no-prompt', genericPrompt: undefined },
  ];
  const answerWith = (body: unknown) =>
    jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })) as jest.Mock;
  globalThis.fetch = answerWith(items);
  expect(await fetchCheckQuestions(new AbortController().signal)).toEqual([good]);

  globalThis.fetch = answerWith({ not: 'a list' });
  expect(await fetchCheckQuestions(new AbortController().signal)).toEqual([]);
});
