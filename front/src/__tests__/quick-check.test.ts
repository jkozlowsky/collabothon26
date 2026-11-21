import { seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import { PURPOSES } from '@/constants/onboarding';
import { FEEDBACK } from '@/constants/quickCheck';
import { ageBandOf, ageLabel } from '@/lib/categorization';
import {
  accountUsable,
  answerCounts,
  confidenceOf,
  feedbackFor,
  fetchCheckQuestions,
  levelOf,
  promptParts,
  savingForLine,
} from '@/lib/quickCheck';
import { POOL } from '@/test-utils/checkPool';
import type { BankState } from '@/types/bank';
import type { CheckQuestion, ConfidenceRating, HistoryEntry } from '@/types/quickCheck';

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
    { ...good, id: 'no-correct-option', correctIndex: undefined },
    { ...good, id: 'correct-option-past-the-end', correctIndex: good.options.length },
    { ...good, id: 'correct-option-negative', correctIndex: -1 },
    { ...good, id: 'correct-option-not-whole', correctIndex: 0.5 },
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

test('the 1–5 rating maps to the confidence every answered option carries', () => {
  const ratings: ConfidenceRating[] = [1, 2, 3, 4, 5];
  expect(ratings.map(confidenceOf)).toEqual(['guessing', 'guessing', 'fairly-sure', 'sure', 'sure']);
});

test('the feedback depends on the answer and on how the user rated their confidence', () => {
  const CORRECT = 1;
  const WRONG = 0;
  expect([1, 2].map((r) => feedbackFor(CORRECT, CORRECT, r as ConfidenceRating))).toEqual([FEEDBACK.rightLow, FEEDBACK.rightLow]);
  expect([3, 4, 5].map((r) => feedbackFor(CORRECT, CORRECT, r as ConfidenceRating))).toEqual(Array(3).fill(FEEDBACK.right));
  expect([4, 5].map((r) => feedbackFor(WRONG, CORRECT, r as ConfidenceRating))).toEqual([FEEDBACK.wrongHigh, FEEDBACK.wrongHigh]);
  expect([1, 2, 3].map((r) => feedbackFor(WRONG, CORRECT, r as ConfidenceRating))).toEqual(Array(3).fill(FEEDBACK.wrong));
  expect(feedbackFor(null, CORRECT, 5)).toBe(FEEDBACK.unsure);

  expect(FEEDBACK.rightLow).toMatchObject({ title: 'Right', body: 'You rated yourself low, yet you got this one. You may know more than you think.' });
  expect(FEEDBACK.right).toMatchObject({ title: 'Right', body: 'That matches how confident you said you feel.' });
  expect(FEEDBACK.wrongHigh).toMatchObject({
    title: 'Not quite',
    body: 'You said you feel confident, so this one is worth a closer look. The right answer is marked above.',
  });
  expect(FEEDBACK.wrong).toMatchObject({ title: 'Not quite', body: 'The right answer is marked above. Your lessons cover this.' });
  expect(FEEDBACK.unsure).toMatchObject({ title: 'Good to know', body: 'The right answer is marked above. Your lessons cover this.' });
});

test('each purpose is saved as the goals of its area', () => {
  expect(Object.fromEntries(PURPOSES.map((p) => [p.title, p.goals]))).toEqual({
    'A home of my own': ['start-saving', 'inflation'],
    'A safety net': ['emergency-fund'],
    Retirement: ['retirement'],
    'Growing it long term': ['start-investing'],
    'No plan yet': [],
  });
});

test('the summary line names the purpose and, when known, the time frame', () => {
  expect(savingForLine('A home of my own', '1-5y')).toBe('Saving for: A home of my own · needed in 1–5 years');
  expect(savingForLine('A safety net', 'within-1y')).toBe('Saving for: A safety net · needed within a year');
  expect(savingForLine('Retirement', '5y+')).toBe('Saving for: Retirement · needed in 5+ years');
  expect(savingForLine('Retirement', 'not-sure')).toBe('Saving for: Retirement');
  expect(savingForLine('Retirement', null)).toBe('Saving for: Retirement');
  expect(savingForLine(null, '5y+')).toBeUndefined();
});

test('the age band is computed from the owner\'s age', () => {
  expect([18, 25, 26, 40, 41, 59, 60, 83].map(ageBandOf)).toEqual(['18-25', '18-25', '26-40', '26-40', '41-59', '41-59', '60+', '60+']);
  expect(ageBandOf(seedAccount().owner.age)).toBe('26-40');
  expect(ageLabel('26-40')).toBe('Age 26–40');
  expect(ageLabel('60+')).toBe('Age 60+');
});
