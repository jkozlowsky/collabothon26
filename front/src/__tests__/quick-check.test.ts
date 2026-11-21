import { seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import {
  accountUsable,
  answerCounts,
  confidenceByArea,
  fetchCheckQuestions,
  levelOf,
  profileToAsk,
  promptParts,
} from '@/lib/quickCheck';
import { POOL } from '@/test-utils/checkPool';
import type { BankState } from '@/types/bank';
import type { CheckQuestion, HistoryEntry, ProfileRanges } from '@/types/quickCheck';

const question = (id: string) => POOL.find((q) => q.id === id)!;
const text = (q: CheckQuestion, account: boolean) =>
  promptParts(q, seedAccount(), account)
    .map((p) => p.text)
    .join('');

test('with consent a question whose slots are filled quotes the account; without consent none does', () => {
  for (const q of POOL) {
    expect(accountUsable(q, seedAccount(), true)).toBe(q.accountPrompt !== null);
    expect(accountUsable(q, seedAccount(), false)).toBe(false);
  }
});

test('account numbers are whole euros from cents, grouped, filled in only when rendering', () => {
  const q = question('emergency-cushion-purpose');
  expect(text(q, true)).toBe(
    'Your accounts show about €1,268 going out each month. If your income stopped for two months, what would an emergency fund be there to do?',
  );
  expect(promptParts(q, seedAccount(), true).filter((p) => p.filled).map((p) => p.text)).toEqual(['1,268']);
  expect(text(q, false)).toBe(q.genericPrompt);
  expect(promptParts(q, seedAccount(), false).some((p) => p.filled)).toBe(false);
});

test('an account version needs every slot above zero', () => {
  const seed = seedAccount();
  const savings = (patch: Partial<BankState['savings']>) => ({ ...seed, savings: { ...seed.savings, ...patch } });
  const noPlan = seed.standingOrders.filter((o) => !o.recipient.startsWith('Depot'));

  expect(accountUsable(question('inflation-real-value'), savings({ balance: 0 }), true)).toBe(false);
  expect(accountUsable(question('inflation-real-value'), savings({ rate: 3 }), true)).toBe(true);
  expect(accountUsable(question('time-in-market'), { ...seed, standingOrders: noPlan }, true)).toBe(false);
});

test('two positions are needed for a question that quotes the position count', () => {
  const bank = seedAccount();
  const positions = { ...question('time-in-market'), accountPrompt: 'You hold {positionCount} positions.', slots: ['positionCount' as const] };
  expect(accountUsable(positions, { ...bank, holdings: bank.holdings.slice(0, 1) }, true)).toBe(false);
  expect(accountUsable(positions, { ...bank, holdings: bank.holdings.slice(0, 2) }, true)).toBe(true);
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

test('a question whose account prompt quotes an unknown or undeclared slot only has its generic version', () => {
  const bank = seedAccount();
  const withPrompt = (accountPrompt: string, slots: CheckQuestion['slots']) => ({ ...POOL[0], accountPrompt, slots });
  expect(accountUsable(withPrompt('Your loan is {loanRemaining}.', ['loanRemaining']), bank, true)).toBe(true);
  expect(accountUsable(withPrompt('Your {mystery} is {loanRemaining}.', ['loanRemaining']), bank, true)).toBe(false);
  expect(accountUsable(withPrompt('Your loan is {loanRemaining}.', []), bank, true)).toBe(false);
  const unknownSlot = withPrompt('Your loan is {loanRemaining}.', ['loanRemaining', 'unknown' as never]);
  expect(accountUsable(unknownSlot, bank, true)).toBe(false);
});

test('pool items the front cannot use are skipped and a repeated id keeps its first item', async () => {
  const good = POOL[0];
  const items = [
    good,
    null,
    'text',
    { ...good, id: 7 },
    { ...good, id: 'unknown-area', area: 'toString' },
    { ...good, id: 'no-slots', slots: undefined },
    { ...good, id: 'no-prompt', genericPrompt: undefined },
    { ...good, id: 'no-options', options: undefined },
    { ...good, id: 'one-option', options: ['only'] },
    { ...good, id: 'option-not-text', options: ['a', 2] },
    { ...good },
    { ...POOL[1] },
    { ...POOL[1], genericPrompt: 'a second question with the same id' },
  ];
  const answerWith = (body: unknown) =>
    jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })) as jest.Mock;
  globalThis.fetch = answerWith(items);
  expect(await fetchCheckQuestions(new AbortController().signal)).toEqual([good, POOL[1]]);

  globalThis.fetch = answerWith({ not: 'a list' });
  expect(await fetchCheckQuestions(new AbortController().signal)).toEqual([]);
  globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as jest.Mock;
  expect(await fetchCheckQuestions(new AbortController().signal)).toEqual([]);
});

const entry = (questionId: string, confidence: HistoryEntry['confidence']): HistoryEntry => ({
  questionId,
  optionIndex: confidence ? 0 : null,
  confidence,
});

test('confidence per area is the mean of the chips, "Not sure" counts as Guessing, no answer is null', () => {
  const history = [
    entry('inflation-real-value', 'sure'),
    entry('emergency-cushion-purpose', 'guessing'),
    entry('time-in-market', null),
  ];
  const mean = confidenceByArea(history, POOL);
  expect(mean.saving).toBeCloseTo((0.9 + 0.25) / 2);
  expect(mean.investing).toBeCloseTo(0.25);
  expect(mean.debt).toBeUndefined();
});

test('answers are counted per area', () => {
  const history = [entry('inflation-real-value', 'sure'), entry('time-in-market', null), entry('emergency-cushion-purpose', 'fairly-sure')];
  expect(answerCounts(history, POOL)).toEqual({ saving: 2, investing: 1 });
});

test('levels: no answer, under 0.4, up to 0.75, and above 0.75 only with two answers', () => {
  expect(levelOf(null, 0)).toBe('none');
  expect(levelOf(undefined, 0)).toBe('none');
  expect(levelOf(0.39, 3)).toBe('starting');
  expect(levelOf(0.4, 1)).toBe('building');
  expect(levelOf(0.75, 3)).toBe('building');
  expect(levelOf(0.76, 1)).toBe('building');
  expect(levelOf(0.76, 2)).toBe('solid');
});

test('the profile questions come in a fixed order, each only where the answer is missing', () => {
  const empty: ProfileRanges = { ageBand: null, savingsCover: null, horizon: null };
  const keys = (profile: ProfileRanges, consent: boolean, lifeStageSkipped: boolean) =>
    profileToAsk(profile, consent, lifeStageSkipped).map((q) => q.key);
  expect(keys(empty, true, false)).toEqual(['horizon']);
  expect(keys(empty, false, false)).toEqual(['savingsCover', 'horizon']);
  expect(keys(empty, false, true)).toEqual(['ageBand', 'savingsCover', 'horizon']);
  expect(keys({ ageBand: '26-40', savingsCover: '1-3', horizon: 'not-sure' }, false, true)).toEqual([]);
});
