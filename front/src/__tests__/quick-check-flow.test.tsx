import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { BackHandler, StyleSheet } from 'react-native';

import { DONE_MS, FEEDBACK, MAX_QUESTIONS } from '@/constants/quickCheck';
import { groupThousands } from '@/lib/bank/money';
import { seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import { factsFrom } from '@/lib/categorization';
import { setSummary } from '@/lib/learningPath';
import { promptParts } from '@/lib/quickCheck';
import { categorization } from '@/test-utils/categorization';
import { POOL } from '@/test-utils/checkPool';
import { walkSurvey, WITHOUT_ACCOUNT } from '@/test-utils/onboarding';
import { appRoutes as routes } from '@/test-utils/routes';
import type { Categorization } from '@/types/categorization';
import type { StepResponse } from '@/types/quickCheck';

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });
const hang = (init?: RequestInit) =>
  new Promise((_, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
  );

type Body = Record<string, any>;
type Handler = (body: Body, init?: RequestInit) => Promise<unknown>;
type Backend = {
  pool?: Handler;
  step?: Handler;
  post?: Handler;
  stored?: unknown;
  /** Onboarding is behind the user: for the screens a reload opens directly. */
  onboarded?: boolean;
};

/** The question ids in the order the stub backend asks them: Saving, Investing, Saving, Investing. */
const ORDER = ['inflation-real-value', 'time-in-market', 'emergency-cushion-purpose', 'short-term-fall'];
const MASTERY = { saving: 0.6, investing: 0.25 };
/** A step stub: asks ORDER one by one and says done after `doneAfter` answers. */
const stepper =
  (doneAfter = 3, useRules = false): Handler =>
  ({ history }) =>
    ok({
      mastery: history.length ? MASTERY : { saving: null, investing: null },
      nextQuestionId: history.length >= doneAfter ? null : ORDER[history.length],
      done: history.length >= doneAfter,
      useRules,
      stepFellBack: false,
    } satisfies StepResponse);
/** A step stub whose answer to the first reply waits for `release()`. */
function slowStep() {
  const gate = { release: () => {} };
  const step: Handler = (request) =>
    request.history.length === 1 ? new Promise((resolve) => (gate.release = () => resolve(stepper()(request)))) : stepper()(request);
  return { step, release: () => act(async () => gate.release()) };
}

const stop = (n: number) => ({ id: `berlin-${n}`, story: 'berlin', title: `Stop ${n}`, place: 'Mitte', topic: null, minutes: 4, xp: 50, status: 'available' });
const BERLIN = { id: 'berlin', city: 'Berlin', lessons: [1, 2, 3, 4].map(stop) };

let fetchMock: jest.Mock;
const body = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}'));

function backend({ pool = () => ok(POOL), step = stepper(), post = () => ok(categorization()), stored, onboarded = false }: Backend = {}) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/api/check-questions')) return pool({}, init);
    if (url.endsWith('/quick-check/step')) return step(body(init), init);
    if (url.endsWith('/categorization')) {
      if (init?.method === 'POST') return post(body(init), init);
      return stored ? ok(stored) : fail(404);
    }
    if (/\/profile(\/onboarding)?$/.test(url)) {
      return init?.method ? ok({}) : ok({ userId: 'demo-user', goals: [], onboardingCompleted: onboarded });
    }
    if (url.includes('/api/stories?')) return ok([BERLIN]);
    if (/\/api\/lessons\/[\w-]+/.test(url)) return ok({ id: 'berlin-2', title: 'Compound interest', steps: [], concepts: [], glossary: {}, next: null });
    return ok([]);
  });
  globalThis.fetch = fetchMock;
}

const callsTo = (suffix: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(suffix) && init?.method === 'POST');
const steps = () => callsTo('/quick-check/step').map(([, init]) => body(init));
const finals = () => callsTo('/categorization').map(([, init]) => body(init));
const get = (id: string) => screen.getByTestId(id);
const press = (id: string) => fireEvent.press(get(id));
const prompt = () => get('quick-check-prompt');
const settle = () => act(async () => {});

/** Opens a screen directly over the bank, as a reload of it does. */
async function openAt(path: '/learning-path') {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await settle();
  await act(async () => router.push(path));
}
type Survey = Parameters<typeof walkSurvey>[0];
/** A fresh onboarding up to "Start the quick check". */
async function startCheck(survey?: Survey) {
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId('nav-learn'));
  await walkSurvey(survey);
  await press('check-start');
}
async function toFirstQuestion(survey?: Survey) {
  await startCheck(survey);
  await screen.findByTestId('quick-check-unsure');
}
const tile = (option: number | 'unsure') => (option === 'unsure' ? 'quick-check-unsure' : `quick-check-option-${option}`);
/** Taps an option ("unsure" = the "Not sure" tile), lets its step answer, then taps "Continue". */
async function answer(option: number | 'unsure') {
  await press(tile(option));
  await settle();
  await press('quick-check-continue');
}
const hardwareBack = async (add: jest.SpyInstance) => {
  const ours = add.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as () => boolean;
  await act(async () => {
    expect(ours()).toBe(true);
  });
};
const finish = () => act(() => jest.advanceTimersByTimeAsync(DONE_MS));
const summary = () => screen.findByTestId('learning-path', {}, { timeout: 4000 });
const question = (n: number) => screen.findByText(`Question ${n} of up to ${MAX_QUESTIONS}`);
const byId = (id: string) => POOL.find((q) => q.id === id)!;
const promptOf = (id: string, consent = true) =>
  promptParts(byId(id), seedAccount(), consent && id !== 'compound-rate-vs-time')
    .map((p) => p.text)
    .join('');
const FIRST = byId(ORDER[0]);
const WRONG = (FIRST.correctIndex + 1) % FIRST.options.length;
const marks = () =>
  [...FIRST.options.map((_, i) => tile(i)), tile('unsure')].flatMap((id) =>
    ['selected', 'correct', 'wrong'].filter((state) => screen.queryByTestId(`${id}-${state}`)).map((state) => `${id}-${state}`),
  );

beforeEach(() => setSummary(null));

test('the summary of a user who has not been categorised redirects to the map', async () => {
  backend({ onboarded: true });
  await openAt('/learning-path');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test('with account access the test starts on a knowledge question; the first step carries the facts, the age band and the time frame', async () => {
  backend();
  await toFirstQuestion();

  expect(await question(1)).toBeOnTheScreen();
  expect(screen.getByText('QUICK CHECK · SAVING')).toBeOnTheScreen();
  expect(steps()).toEqual([
    {
      consent: true,
      facts: factsFrom(seedAccount()),
      profile: { ageBand: '26-40', savingsCover: null, horizon: '1-5y' },
      history: [],
      useRules: false,
      stepFellBack: false,
    },
  ]);
  expect(finals()).toHaveLength(0);
});

test('without account access the survey\'s savings cover is sent, no facts and no age band; the questions use example numbers', async () => {
  backend();
  await toFirstQuestion({ consent: false, horizon: '5y+' });

  expect(steps()).toEqual([
    {
      consent: false,
      profile: { ageBand: null, savingsCover: WITHOUT_ACCOUNT.savingsCover, horizon: '5y+' },
      history: [],
      useRules: false,
      stepFellBack: false,
    },
  ]);
  expect(prompt()).toHaveTextContent(FIRST.genericPrompt, { exact: false });
  expect(screen.getByText('Example numbers')).toBeOnTheScreen();
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
});

test('a question quotes the account, shows its why line and the slip; "Continue" waits for an answer', async () => {
  backend();
  await toFirstQuestion();

  expect(prompt()).toHaveTextContent(promptOf(ORDER[0]), { exact: false });
  expect(promptOf(ORDER[0])).not.toBe(FIRST.genericPrompt);
  expect(get('quick-check-why')).toHaveTextContent('Why this question: Picked to learn more about Saving', { exact: false });
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
  expect(screen.getAllByRole('radio')).toHaveLength(FIRST.options.length + 1);
  expect(get('quick-check-unsure')).toHaveTextContent('Not sureThat is fine. Your lessons cover it.');
  expect(get('quick-check-continue')).toBeDisabled();
  expect(screen.queryByTestId('quick-check-feedback')).toBeNull();
  expect(marks()).toEqual([]);
  expect(screen.queryByTestId('map-dock')).toBeNull();
});

test('a right answer is committed at the tap and marked; the next question waits for "Continue"', async () => {
  backend();
  await toFirstQuestion({ rating: 2 });
  await press(tile(FIRST.correctIndex));

  expect(marks()).toEqual([`${tile(FIRST.correctIndex)}-correct`]);
  expect(get(tile(FIRST.correctIndex)).props.accessibilityLabel).toBe(`${FIRST.options[FIRST.correctIndex]}. Correct answer.`);
  expect(get('quick-check-feedback')).toHaveTextContent(`${FEEDBACK.rightLow.title}${FEEDBACK.rightLow.body}`, { exact: false });
  expect(get('flow-status')).toHaveTextContent(`${FEEDBACK.rightLow.title}. ${FEEDBACK.rightLow.body}`);
  // The step left at the tap, with the confidence the survey's 2 of 5 stands for.
  expect(steps()[1].history).toEqual([{ questionId: ORDER[0], optionIndex: FIRST.correctIndex, confidence: 'guessing' }]);

  // The step has answered, yet the reveal stays; a second tap changes nothing.
  await settle();
  await act(() => jest.advanceTimersByTimeAsync(DONE_MS));
  await press(tile(WRONG));
  expect(prompt()).toHaveTextContent(promptOf(ORDER[0]), { exact: false });
  expect(marks()).toEqual([`${tile(FIRST.correctIndex)}-correct`]);
  expect(steps()).toHaveLength(2);

  await press('quick-check-continue');
  expect(await question(2)).toBeOnTheScreen();
  expect(prompt()).toHaveTextContent(promptOf(ORDER[1]), { exact: false });
  expect(get('quick-check-why')).toHaveTextContent('Picked to learn more about Investing', { exact: false });
  expect(marks()).toEqual([]);
  expect(get('quick-check-continue')).toBeDisabled();
});

test('a wrong answer is marked next to the right one; a high self-rating changes the feedback and the confidence sent', async () => {
  backend();
  await toFirstQuestion({ rating: 5 });
  await press(tile(WRONG));

  expect(marks()).toEqual([tile(FIRST.correctIndex), tile(WRONG)].sort().map((id) => `${id}-${id === tile(WRONG) ? 'wrong' : 'correct'}`));
  expect(get(tile(WRONG)).props.accessibilityLabel).toBe(`${FIRST.options[WRONG]}. Not the right answer.`);
  expect(get('quick-check-feedback')).toHaveTextContent(`${FEEDBACK.wrongHigh.title}${FEEDBACK.wrongHigh.body}`, { exact: false });
  expect(steps()[1].history).toEqual([{ questionId: ORDER[0], optionIndex: WRONG, confidence: 'sure' }]);
});

test('"Not sure" commits with no option and no confidence, and still shows the right answer', async () => {
  backend();
  await toFirstQuestion({ rating: 3 });
  await press(tile('unsure'));

  expect(marks()).toEqual([`${tile(FIRST.correctIndex)}-correct`, 'quick-check-unsure-selected']);
  expect(get('quick-check-feedback')).toHaveTextContent(`${FEEDBACK.unsure.title}${FEEDBACK.unsure.body}`, { exact: false });
  expect(steps()[1].history).toEqual([{ questionId: ORDER[0], optionIndex: null, confidence: null }]);
});

test('an area asked about before reads "from another angle"', async () => {
  const step: Handler = ({ history }) =>
    ok({ mastery: MASTERY, nextQuestionId: ORDER[history.length === 1 ? 2 : history.length], done: false, useRules: false, stepFellBack: false });
  backend({ step });
  await toFirstQuestion();
  await answer(0);
  await question(2);
  expect(get('quick-check-why')).toHaveTextContent('Picked to look at Saving from another angle', { exact: false });
});

test('"Continue" before the step answers shows the status line in place of the question until it does', async () => {
  const slow = slowStep();
  backend({ step: slow.step });
  await toFirstQuestion();
  await press(tile(0));
  await press('quick-check-continue');

  expect(get('quick-check-status')).toHaveTextContent('Choosing your next question', { exact: false });
  expect(get('flow-status')).toHaveTextContent('Choosing your next question', { exact: false });
  expect(screen.queryByTestId('quick-check-prompt')).toBeNull();
  expect(get('quick-check-continue')).toBeDisabled();
  expect(screen.getByText(`Question 1 of up to ${MAX_QUESTIONS}`)).toBeOnTheScreen();

  await slow.release();
  expect(await question(2)).toBeOnTheScreen();
  expect(screen.queryByTestId('quick-check-status')).toBeNull();
  expect(prompt()).toHaveTextContent(promptOf(ORDER[1]), { exact: false });
});

test('the step that says done ends the test only after "Continue": "All set", then one final POST with everything', async () => {
  backend({ step: stepper(2) });
  await toFirstQuestion({ rating: 2 });
  await answer(1);
  await question(2);
  await press(tile('unsure'));
  await settle();

  // Done is decided, but the reveal stays until "Continue".
  await act(() => jest.advanceTimersByTimeAsync(DONE_MS * 2));
  expect(screen.queryByTestId('quick-check-status')).toBeNull();
  expect(get('quick-check-feedback')).toBeOnTheScreen();
  await press('quick-check-continue');

  expect(get('quick-check-status')).toHaveTextContent('All set · That is enough to place you', { exact: false });
  expect(get('flow-status')).toHaveTextContent('All set · That is enough to place you', { exact: false });
  expect(finals()).toHaveLength(0);
  await finish();
  expect(await summary()).toBeOnTheScreen();

  expect(finals()).toEqual([
    {
      consent: true,
      facts: factsFrom(seedAccount()),
      profile: { ageBand: '26-40', savingsCover: null, horizon: '1-5y' },
      history: [
        { questionId: ORDER[0], optionIndex: 1, confidence: 'guessing' },
        { questionId: ORDER[1], optionIndex: null, confidence: null },
      ],
      mastery: MASTERY,
      useRules: false,
      stepCallsMade: 2,
    },
  ]);
  expect(steps()).toHaveLength(3);
});

test('no exact account amount leaves the phone in any call', async () => {
  backend({ step: stepper(1) });
  await toFirstQuestion();
  await answer(0);
  await finish();
  await summary();

  const sent = JSON.stringify([...steps(), ...finals()]);
  const { positionCount, ...amounts } = slotValues(seedAccount());
  for (const value of Object.values(amounts)) {
    expect(sent).not.toContain(String(value));
    expect(sent).not.toContain(groupThousands(value));
  }
});

test('a backend that answers useRules gets it back on every later call, and no model call is counted', async () => {
  backend({ step: stepper(1, true) });
  await toFirstQuestion();
  await answer(0);
  await finish();
  await summary();

  expect(steps().map((s) => s.useRules)).toEqual([false, true]);
  expect(finals()[0]).toMatchObject({ useRules: true, stepCallsMade: 0 });
  expect(screen.queryByText('Use simple check instead')).toBeNull();
});

test('a step that answers stepFellBack makes the later steps run on the rule; only model calls are counted', async () => {
  const step: Handler = ({ history }) =>
    ok({ mastery: MASTERY, nextQuestionId: ORDER[history.length], done: history.length >= 4, useRules: false, stepFellBack: history.length >= 2 });
  backend({ step });
  await toFirstQuestion();
  for (const next of [2, 3, 4]) {
    await answer(0);
    await question(next);
  }
  await answer(0);
  await finish();
  await summary();

  expect(steps().map((s) => [s.useRules, s.stepFellBack])).toEqual([
    [false, false],
    [false, false],
    [false, false],
    [false, true],
    [false, true],
  ]);
  expect(finals()[0]).toMatchObject({ useRules: false, stepCallsMade: 2 });
});

test('the maximum number of questions ends the test; every history step was a model call', async () => {
  const step: Handler = ({ history }) =>
    ok({
      mastery: MASTERY,
      nextQuestionId: history.length >= MAX_QUESTIONS ? null : ORDER[history.length % ORDER.length],
      done: history.length >= MAX_QUESTIONS,
      useRules: false,
      stepFellBack: false,
    });
  // ORDER repeats here, which only a stub may do.
  backend({ step });
  await toFirstQuestion();
  for (let i = 0; i < MAX_QUESTIONS; i++) {
    await answer('unsure');
    if (i < MAX_QUESTIONS - 1) await question(i + 2);
  }
  await screen.findByTestId('quick-check-status');
  await finish();
  await summary();
  expect(finals()[0].history).toHaveLength(MAX_QUESTIONS);
  expect(finals()[0].stepCallsMade).toBe(MAX_QUESTIONS);
});

test.each([
  { name: 'an empty bank (no Jev key and no questions)', pool: () => ok([]) },
  { name: 'a failed GET', pool: () => fail(500) },
  { name: 'a bank without the correct options', pool: () => ok(POOL.map(({ correctIndex, ...q }) => q)) },
])('$name leaves the test out: "Start the quick check" leads straight to the summary with the F1 body', async ({ pool }) => {
  backend({ pool, post: () => ok(categorization({ source: 'fallback', startLesson: null, confidenceGaps: [] })) });
  await startCheck({ consent: false });

  expect(await summary()).toBeOnTheScreen();
  expect(steps()).toHaveLength(0);
  expect(finals()).toEqual([{ consent: false }]);
  expect(screen.queryByTestId('summary-simple')).toBeNull();
});

test('a first step that fails skips the test: the final POST carries no profile, history or mastery', async () => {
  backend({ step: () => fail(500) });
  await startCheck();

  expect(await summary()).toBeOnTheScreen();
  expect(steps()).toHaveLength(1);
  expect(finals()).toEqual([{ consent: true, facts: factsFrom(seedAccount()) }]);
});

test('a later step that fails is retried once with stepFellBack, and the test goes on', async () => {
  const step: Handler = (request) => (request.history.length === 1 && !request.stepFellBack ? fail(503) : stepper()(request));
  backend({ step });
  await toFirstQuestion();
  await answer(0);

  await question(2);
  expect(steps().slice(1).map((s) => [s.history.length, s.useRules, s.stepFellBack])).toEqual([
    [1, false, false],
    [1, false, true],
  ]);
  await answer(0);
  await question(3);
  expect(steps().at(-1)).toMatchObject({ useRules: false, stepFellBack: true });
});

test('a step that fails twice ends the test at "Continue"; the final POST carries the history so far, and the model is still asked', async () => {
  const step: Handler = (request) => (request.history.length === 2 ? fail(503) : stepper()(request));
  backend({ step });
  await toFirstQuestion({ rating: 3 });
  await answer(0);
  await question(2);
  await press(tile(1));
  await settle();
  expect(get('quick-check-feedback')).toBeOnTheScreen();
  expect(finals()).toHaveLength(0);
  await press('quick-check-continue');

  expect(await summary()).toBeOnTheScreen();
  expect(finals()).toEqual([
    {
      consent: true,
      facts: expect.any(Object),
      profile: expect.any(Object),
      history: [
        { questionId: ORDER[0], optionIndex: 0, confidence: 'fairly-sure' },
        { questionId: ORDER[1], optionIndex: 1, confidence: 'fairly-sure' },
      ],
      mastery: MASTERY,
      useRules: false,
      stepCallsMade: 2,
    },
  ]);
});

test('a step that never answers fails after the client timeout and is retried with stepFellBack', async () => {
  const step: Handler = (request, init) => (request.history.length === 1 && !request.stepFellBack ? hang(init) : stepper()(request));
  backend({ step });
  await toFirstQuestion();
  await press(tile(0));
  await press('quick-check-continue');
  await act(() => jest.advanceTimersByTimeAsync(5_000));
  await question(2);
  expect(steps().at(-1)).toMatchObject({ stepFellBack: true });
});

test('Close leaves the test for Learn: nothing is posted, and a step that answers later is ignored', async () => {
  const slow = slowStep();
  backend({ step: slow.step });
  await toFirstQuestion();
  await press(tile(0));
  await press('onboarding-close');

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  await slow.release();
  await act(() => jest.advanceTimersByTimeAsync(DONE_MS));
  expect(finals()).toHaveLength(0);
  expect(screen.queryByTestId('quick-check')).toBeNull();
});

test('hardware back does nothing inside the test', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  try {
    backend();
    await toFirstQuestion();
    await answer(0);
    await question(2);
    await hardwareBack(add);

    expect(screen.getByText(`Question 2 of up to ${MAX_QUESTIONS}`)).toBeOnTheScreen();
    expect(prompt()).toHaveTextContent(promptOf(ORDER[1]), { exact: false });
    expect(steps()).toHaveLength(2);
  } finally {
    add.mockRestore();
  }
});

test('a 400 on the final POST takes the F1 path instead of a Retry that cannot succeed', async () => {
  const post: Handler = (request) => ('history' in request ? fail(400) : ok(categorization()));
  backend({ step: stepper(1), post });
  await toFirstQuestion();
  await answer(0);
  await finish();

  expect(await summary()).toBeOnTheScreen();
  expect(finals().map((f) => Object.keys(f).sort())).toEqual([
    ['consent', 'facts', 'history', 'mastery', 'profile', 'stepCallsMade', 'useRules'],
    ['consent', 'facts', 'stepCallsMade'],
  ]);
});

test('a slow final POST keeps the loading screen until it answers', async () => {
  backend({ step: stepper(1), post: () => new Promise((resolve) => setTimeout(() => resolve(ok(categorization())), 9_000)) });
  await toFirstQuestion();
  await answer(0);
  await finish();

  await act(() => jest.advanceTimersByTimeAsync(8_000));
  expect(screen.getByTestId('categorizing-loading')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(1_500));
  expect(await screen.findByTestId('learning-path')).toBeOnTheScreen();
});

test('a failed final POST shows the error screen; Retry sends the same body again', async () => {
  let attempts = 0;
  backend({ step: stepper(1), post: () => (++attempts === 1 ? fail(503) : ok(categorization())) });
  await toFirstQuestion();
  await answer(0);
  await finish();

  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));
  await summary();
  const [first, second] = finals();
  expect(second).toEqual(first);
  expect(first.history).toHaveLength(1);
});

const ran = (patch: object = {}) =>
  categorization({
    profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
    mastery: { saving: 0.6, investing: 0.25 },
    confidence: { saving: 0.9, investing: 0.25 },
    answerCount: 3,
    confidenceGaps: [],
    ...patch,
  });

async function toSummary(post: Categorization, survey?: Survey) {
  backend({ step: stepper(1), post: () => ok(post) });
  await toFirstQuestion(survey);
  await answer(0);
  await finish();
  await summary();
}

test('the summary: a gap card, the level and its basis, the first lesson, the disclaimer', async () => {
  const gap = { area: 'saving' as const, direction: 'over' as const, because: 'You rated your confidence high. Your Saving answers leave a few things open to explore.' };
  await toSummary(ran({ confidenceGaps: [gap], startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }));

  expect(get('summary-gap-saving')).toHaveTextContent('There is more to explore here', { exact: false });
  expect(get('summary-gap-saving')).toHaveTextContent(gap.because, { exact: false });
  expect(screen.queryByTestId('summary-aligned')).toBeNull();
  expect(get('summary-role')).toHaveTextContent("You're an intermediate learner", { exact: false });
  expect(get('summary-based-on')).toHaveTextContent('Based on 3 answers and how confident you said you feel.', { exact: false });
  expect(get('summary-first-lesson')).toHaveTextContent(/your first stop · saving/i);
  expect(get('summary-first-lesson')).toHaveTextContent('Emergency fund', { exact: false });
  expect(get('summary-first-lesson')).toHaveTextContent('Berlin · stop 3 of 4', { exact: false });
  expect(get('summary-disclaimer')).toHaveTextContent('This picks lessons for you. It is not investment advice.', { exact: false });
  expect(get('summary-saving-for')).toHaveTextContent('Saving for: A home of my own · needed in 1–5 years');
  expect(screen.getByText('How confident you said you feel')).toBeOnTheScreen();
  expect(screen.queryByTestId('summary-simple')).toBeNull();
});

test('an under-confidence gap says "You know more than you think"', async () => {
  const gap = { area: 'investing' as const, direction: 'under' as const, because: 'You rated your confidence low, yet your Investing answers show you already understand how it works.' };
  await toSummary(ran({ confidenceGaps: [gap] }));
  expect(get('summary-gap-investing')).toHaveTextContent('You know more than you think', { exact: false });
});

test('with no gap and an answered question, the aligned card shows', async () => {
  await toSummary(ran());
  expect(get('summary-aligned')).toHaveTextContent('Your confidence matches your answers', { exact: false });
  expect(get('summary-aligned')).toHaveTextContent('On the areas we checked, your confidence and your answers line up.', { exact: false });
});

test('with only "Not sure" answers no confidence was sent, so no aligned card', async () => {
  backend({ step: stepper(1), post: () => ok(ran()) });
  await toFirstQuestion();
  await answer('unsure');
  await finish();
  await summary();
  expect(screen.queryByTestId('summary-aligned')).toBeNull();
});

test.each([
  { name: 'a purpose with no time frame', survey: { purpose: 'growing', horizon: 'not-sure' }, line: 'Saving for: Growing it long term' },
  { name: '"No plan yet"', survey: { purpose: 'none', horizon: 'within-1y' }, line: null },
] as const)('the summary after $name', async ({ survey, line }) => {
  await toSummary(ran(), survey);
  if (line) expect(get('summary-saving-for')).toHaveTextContent(line);
  else expect(screen.queryByTestId('summary-saving-for')).toBeNull();
});

test('a start lesson with no area is just "your first stop"', async () => {
  await toSummary(ran({ startLesson: { lessonId: 'berlin-1', title: 'Safe, but not free', area: null, storyId: 'berlin', storyCity: 'Berlin' } }));
  expect(get('summary-first-lesson')).toHaveTextContent('Your first stopSafe, but not free', { exact: false });
});

test('ready for the next step: the first-lesson card says so; with no start lesson the card is hidden', async () => {
  await toSummary(ran({ readyForNext: true }));
  expect(get('summary-first-lesson')).toHaveTextContent("You're ready for the next lesson", { exact: false });
});

test('no first lesson hides the card and Show my path opens the map', async () => {
  await toSummary(ran({ startLesson: null }));
  expect(screen.queryByTestId('summary-first-lesson')).toBeNull();
  await press('summary-start');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test('"Show my path" is the one button and opens the map, not the first lesson', async () => {
  await toSummary(ran());
  expect(get('summary-start')).toHaveTextContent('Show my path');
  expect(screen.queryByTestId('summary-all')).toBeNull();
  await press('summary-start');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen).toHavePathname('/map');
});

test('the simpler-check line shows only when the model was asked and then failed', async () => {
  await toSummary(
    ran({ source: 'fallback', sharedWithModel: { facts: null, answers: { lifeStage: null, goals: [], experience: null, skipped: true }, profile: null, answerCount: 1, stepCallsMade: 1 } }),
  );
  expect(get('summary-simple')).toHaveTextContent('We used a simpler check this time', { exact: false });
});

test('a fallback with nothing sent to the model has no simpler-check line', async () => {
  await toSummary(ran({ source: 'fallback', sharedWithModel: null }));
  expect(screen.queryByTestId('summary-simple')).toBeNull();
});

test('a reload of /learning-path rebuilds the summary from the stored row', async () => {
  backend({ onboarded: true, stored: ran({ startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }) });
  await openAt('/learning-path');

  expect(await screen.findByTestId('summary-first-lesson')).toHaveTextContent('Emergency fund', { exact: false });
  expect(get('summary-aligned')).toBeOnTheScreen();
  expect(get('summary-based-on')).toHaveTextContent('3 answers', { exact: false });
  expect(screen.queryByTestId('summary-saving-for')).toBeNull();
});

test('hardware back on the summary leaves for the map like Show my path', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  try {
    await toSummary(ran());
    await hardwareBack(add);
    expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  } finally {
    add.mockRestore();
  }
});

/** The markers are hidden from screen readers (the row's text says it), so they are looked up as hidden. */
const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style);

test('after a reload the summary map comes from the stored row; a ready path reads Solid', async () => {
  backend({ onboarded: true, stored: ran({ readyForNext: true, mastery: { saving: 0.9, investing: 0.8 }, confidence: { saving: 0.9, investing: 0.6 } }) });
  await openAt('/learning-path');

  expect(await screen.findByTestId('summary-map')).toBeOnTheScreen();
  expect(get('area-level-saving')).toHaveTextContent('Solid');
  expect(style('area-bar-saving').width).toBe('90%');
  expect(style('area-diamond-investing').left).toBe('60%');
});

test('after a reload a high mastery on a path that is not ready reads Building: the answer counts are gone', async () => {
  backend({ onboarded: true, stored: ran({ mastery: { saving: 0.9, investing: 0.2 } }) });
  await openAt('/learning-path');

  expect(await screen.findByTestId('summary-map')).toBeOnTheScreen();
  expect(get('area-level-saving')).toHaveTextContent('Building');
  expect(get('area-level-investing')).toHaveTextContent('Just starting');
});

test('right after the test the summary map counts the answers per area: two in Saving read Solid, one in Investing does not', async () => {
  backend({ step: stepper(3), post: () => ok(ran({ mastery: { saving: 0.9, investing: 0.9 } })) });
  await toFirstQuestion();
  await answer(1);
  await question(2);
  await answer(0);
  await question(3);
  await answer(1);
  await finish();
  await summary();
  // ORDER is Saving, Investing, Saving.
  expect(get('area-level-saving')).toHaveTextContent('Solid');
  expect(get('area-level-investing')).toHaveTextContent('Building');
});
