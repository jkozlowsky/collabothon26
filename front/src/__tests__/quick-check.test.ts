import { seedAccount } from '@/lib/bank/seed';
import { FEEDBACK } from '@/constants/quickCheck';
import { ageBandOf, ageLabel } from '@/lib/categorization';
import { answerCounts, feedbackFor, fetchCheckQuestions, levelOf, plainText } from '@/lib/quickCheck';
import { POOL } from '@/test-utils/checkPool';
import type { HistoryEntry } from '@/types/quickCheck';

test('pool items the front cannot use are skipped and a repeated id keeps its first item', async () => {
  const good = POOL[0];
  const items = [
    good,
    null,
    'text',
    { ...good, id: 7 },
    { ...good, id: 'unknown-area', area: 'toString' },
    { ...good, id: 'no-lesson', lessonId: undefined },
    { ...good, id: 'no-prompt', prompt: undefined },
    { ...good, id: 'no-explanation', explanation: undefined },
    { ...good, id: 'no-options', options: undefined },
    { ...good, id: 'one-option', options: ['only'] },
    { ...good, id: 'option-not-text', options: ['a', 2] },
    { ...good, id: 'no-correct-option', correctIndex: undefined },
    { ...good, id: 'correct-option-past-the-end', correctIndex: good.options.length },
    { ...good, id: 'correct-option-negative', correctIndex: -1 },
    { ...good, id: 'correct-option-not-whole', correctIndex: 0.5 },
    { ...good },
    { ...POOL[1] },
    { ...POOL[1], prompt: 'a second question with the same id' },
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

const entry = (questionId: string, optionIndex: number | null): HistoryEntry => ({ questionId, optionIndex });

test('answers are counted per area, "Not sure" included', () => {
  const history = [entry('berlin-1/q1', 0), entry('seoul-1/q1', null), entry('berlin-2/q1', 0), entry('sao-paulo-1/q1', 1)];
  expect(answerCounts(history, POOL)).toEqual({ saving: 2, investing: 1, debt: 1 });
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

test('the feedback is right, wrong or not sure, each with the question\'s explanation', () => {
  const q = POOL.find((item) => item.id === 'berlin-1/q2')!;
  const wrong = q.correctIndex + 1;
  const body = plainText(q.explanation);
  expect(feedbackFor(q.correctIndex, q)).toEqual({ tone: 'right', title: 'Right', body });
  expect(feedbackFor(wrong, q)).toEqual({ tone: 'wrong', title: 'Not quite', body });
  expect(feedbackFor(null, q)).toEqual({ tone: 'unsure', title: 'Good to know', body });
  expect(Object.keys(FEEDBACK)).toEqual(['right', 'wrong', 'unsure']);
});

test('glossary markup in an explanation reads as plain words', () => {
  expect(plainText('The difference is the [[real-return]].')).toBe('The difference is the real return.');
  expect(plainText('Your [[real-return|real interest]] is about -1%, a [[drawdown|long-term fall]].')).toBe(
    'Your real interest is about -1%, a long-term fall.',
  );
  expect(plainText('No markup, and [[Not A Marker]] stays.')).toBe('No markup, and [[Not A Marker]] stays.');
  const marked = POOL.find((item) => item.id === 'berlin-1/q1')!;
  expect(feedbackFor(null, marked).body).toMatch(/^inflation is an average over a basket\./);
  for (const q of POOL) expect(feedbackFor(null, q).body).not.toContain('[[');
});

test('the age band is computed from the owner\'s age', () => {
  expect([18, 25, 26, 40, 41, 59, 60, 83].map(ageBandOf)).toEqual(['18-25', '18-25', '26-40', '26-40', '41-59', '41-59', '60+', '60+']);
  expect(ageBandOf(seedAccount().owner.age)).toBe('26-40');
  expect(ageLabel('26-40')).toBe('Age 26–40');
  expect(ageLabel('60+')).toBe('Age 60+');
});
