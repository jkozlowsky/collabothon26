import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { BackHandler, StyleSheet } from 'react-native';

import { ANSWER_DELAY_MS, DONE_MS, MAX_QUESTIONS } from '@/constants/quickCheck';
import { groupThousands } from '@/lib/bank/money';
import { seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import { setSummary } from '@/lib/learningPath';
import { promptParts } from '@/lib/quickCheck';
import { categorization } from '@/test-utils/categorization';
import { POOL } from '@/test-utils/checkPool';
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
  lifeStage?: string | null;
  goals?: string[];
};

/** The question ids in the order the stub backend asks them. */
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

const stop = (n: number) => ({ id: `berlin-${n}`, story: 'berlin', title: `Stop ${n}`, place: 'Mitte', topic: null, minutes: 4, xp: 50, status: 'available' });
const BERLIN = { id: 'berlin', city: 'Berlin', lessons: [1, 2, 3, 4].map(stop) };

let fetchMock: jest.Mock;
const body = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}'));

function backend({
  pool = () => ok(POOL),
  step = stepper(),
  post = () => ok(categorization()),
  stored,
  lifeStage = 'building',
  goals = [],
}: Backend = {}) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/api/check-questions')) return pool({}, init);
    if (url.endsWith('/quick-check/step')) return step(body(init), init);
    if (url.endsWith('/categorization')) {
      if (init?.method === 'POST') return post(body(init), init);
      return stored ? ok(stored) : fail(404);
    }
    if (/\/profile(\/onboarding)?$/.test(url)) {
      const profile = { userId: 'demo-user', lifeStage, goals, onboardingCompleted: true };
      return init?.method ? ok({}) : ok(profile);
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
const ready = () => act(() => jest.advanceTimersByTimeAsync(ANSWER_DELAY_MS));
const prompt = () => get('quick-check-prompt');

async function open() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/categorizing'));
}
/** Consent card, "What we know", then the first profile question on screen. */
async function toProfile({ consent = true, simple = false } = {}) {
  await open();
  await fireEvent.press(await screen.findByTestId(consent ? 'consent-accept' : 'consent-decline'));
  await fireEvent.press(await screen.findByTestId(simple ? 'know-simple' : 'know-start'));
  await screen.findByTestId('quick-check-why');
}
/** Answers the profile tiles with their second option until the first knowledge question shows. */
async function toFirstQuestion(options: { consent?: boolean; simple?: boolean } = {}) {
  await toProfile(options);
  while (screen.queryByText('Not scored')) {
    await ready();
    await press('quick-check-option-1');
    await act(async () => {});
  }
  await screen.findByTestId('quick-check-unsure');
}
/** Taps an option, then its chip (the "Not sure" tile has none). */
async function answer(option: number | 'unsure', chip?: 'guessing' | 'fairly-sure' | 'sure') {
  await ready();
  await press(option === 'unsure' ? 'quick-check-unsure' : `quick-check-option-${option}`);
  if (chip) await press(`confidence-${chip}`);
}
const finish = () => act(() => jest.advanceTimersByTimeAsync(DONE_MS));
const hardwareBack = async (add: jest.SpyInstance) => {
  const ours = add.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as () => boolean;
  await act(async () => {
    expect(ours()).toBe(true);
  });
};
const question = (n: number, of = 7) => screen.findByText(`Question ${n} of up to ${of}`);
const promptOf = (id: string, consent = true) =>
  promptParts(POOL.find((q) => q.id === id)!, seedAccount(), consent && id !== 'compound-rate-vs-time')
    .map((p) => p.text)
    .join('');

beforeEach(() => setSummary(null));

test('the summary of a user who has not been categorised redirects to the map', async () => {
  backend();
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test('the consent card carries the GDPR notice and no longer talks about typed words', async () => {
  backend();
  await open();
  expect(await screen.findByTestId('consent-quickcheck-note')).toHaveTextContent(
    'Your answers, how sure you felt and the ranges you pick (and, if you allow it, ranges from your accounts) are checked by an external AI provider to pick your first lesson. Exact account numbers never leave this phone. We keep the result and the ranges.',
  );
  expect(screen.queryByText(/exactly as you write/)).toBeNull();
});

test('consent leads to "What we know about you", with the account facts tagged and the AI line', async () => {
  backend({ goals: ['start-saving', 'stocks-etfs'] });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));

  expect(await screen.findByText('What we know about you')).toBeOnTheScreen();
  expect(get('know-life-stage')).toHaveTextContent('Building my life', { exact: false });
  expect(get('know-life-stage')).toHaveTextContent('You told us', { exact: false });
  expect(get('know-goals')).toHaveTextContent('Goals: Start saving, Stocks & ETFs', { exact: false });
  expect(get('know-facts')).toHaveTextContent('Over 6 months of spending covered', { exact: false });
  expect(get('know-facts')).toHaveTextContent('From your accounts', { exact: false });
  expect(screen.getByText('Ranges only, never exact amounts. Your questions use the exact numbers on this phone.')).toBeOnTheScreen();
  expect(get('know-ai-line')).toHaveTextContent('Your choices are checked by an AI service.', { exact: false });
});

test('without consent, and with life stage and goals skipped, the card says so', async () => {
  backend({ lifeStage: null });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  await screen.findByText('What we know about you');
  expect(get('know-life-stage')).toHaveTextContent('Life stage not shared', { exact: false });
  expect(get('know-life-stage')).toHaveTextContent('You skipped this', { exact: false });
  expect(get('know-life-stage')).toHaveTextContent('We will ask one question.', { exact: false });
  expect(get('know-goals')).toHaveTextContent('Goals not shared', { exact: false });
  expect(get('know-facts')).toHaveTextContent('Account access is off', { exact: false });
  expect(get('know-facts')).toHaveTextContent('You chose this', { exact: false });
  expect(get('know-facts')).toHaveTextContent('We will ask about your savings.', { exact: false });
});

test('"Change account access" goes back to the consent card', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await fireEvent.press(await screen.findByTestId('know-change'));
  expect(await screen.findByTestId('categorizing-consent')).toBeOnTheScreen();
});

test('with consent only the time frame is asked first: a profile tile, no chips, not scored, no step yet', async () => {
  backend();
  await toProfile();

  expect(screen.getByText('Question 1 of up to 7')).toBeOnTheScreen();
  expect(screen.getByText('Not scored')).toBeOnTheScreen();
  expect(prompt()).toHaveTextContent('When might you need the money you save or invest?', { exact: false });
  expect(get('quick-check-why')).toHaveTextContent('Why this question: So examples match your time frame', { exact: false });
  expect(screen.getByText('A fact about you, not a test.')).toBeOnTheScreen();
  expect(screen.queryByTestId('quick-check-unsure')).toBeNull();
  expect(steps()).toHaveLength(0);

  await ready();
  await press('quick-check-option-1');
  await question(2);
  expect(steps()).toEqual([
    {
      consent: true,
      facts: expect.objectContaining({ cashBufferMonths: '6+' }),
      profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
      history: [],
      useRules: false,
      stepFellBack: false,
    },
  ]);
});

test('without consent the savings cover is asked, then the time frame; the questions use example numbers', async () => {
  backend();
  await toProfile({ consent: false });
  expect(prompt()).toHaveTextContent('How many months of spending could your savings cover?', { exact: false });
  expect(get('quick-check-why')).toHaveTextContent('So examples fit your savings', { exact: false });
  expect(screen.getByText('Question 1 of up to 8')).toBeOnTheScreen();
  await ready();
  await press('quick-check-option-2');
  await question(2, 8);
  expect(prompt()).toHaveTextContent('When might you need the money', { exact: false });
  await ready();
  await press('quick-check-option-0');

  await question(3, 8);
  expect(prompt()).toHaveTextContent(POOL.find((q) => q.id === ORDER[0])!.genericPrompt);
  expect(screen.getByText('Example numbers')).toBeOnTheScreen();
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
  const [first] = steps();
  expect(first.consent).toBe(false);
  expect('facts' in first).toBe(false);
  expect(first.profile).toEqual({ ageBand: null, savingsCover: '3-6', horizon: 'within-1y' });
});

test('with the life stage skipped the age band comes first', async () => {
  backend({ lifeStage: null });
  await toProfile();
  expect(prompt()).toHaveTextContent('Which age band are you in?', { exact: false });
  expect(get('quick-check-why')).toHaveTextContent('So examples fit your stage of life', { exact: false });
  expect(screen.getByText('Question 1 of up to 8')).toBeOnTheScreen();
  await ready();
  await press('quick-check-option-1');
  await question(2, 8);
  expect(prompt()).toHaveTextContent('When might you need the money', { exact: false });
  await ready();
  await press('quick-check-option-2');
  await question(3, 8);
  expect(steps()[0].profile).toEqual({ ageBand: '26-40', savingsCover: null, horizon: '5y+' });
});

test('a knowledge question quotes the account with consent, shows its why line and the slip', async () => {
  backend();
  await toFirstQuestion();

  expect(prompt()).toHaveTextContent(promptOf(ORDER[0]), { exact: false });
  expect(promptOf(ORDER[0])).not.toBe(POOL[1].genericPrompt);
  expect(screen.getByText('Not a test you can fail')).toBeOnTheScreen();
  expect(get('quick-check-why')).toHaveTextContent('Why this question: Picked to learn more about Saving', { exact: false });
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
  expect(screen.getAllByRole('radio')).toHaveLength(POOL[1].options.length + 1);
});

test('tapping a tile shows the chips inside it; a chip commits the answer; nothing says right or wrong', async () => {
  backend();
  await toFirstQuestion();
  expect(screen.queryByTestId('confidence-sure')).toBeNull();

  await ready();
  await press('quick-check-option-1');
  expect(screen.getByText('How sure are you?')).toBeOnTheScreen();
  expect(steps()).toHaveLength(1);

  await press('quick-check-option-2');
  expect(screen.getAllByText('How sure are you?')).toHaveLength(1);
  await press('confidence-fairly-sure');

  await question(3);
  expect(steps()[1].history).toEqual([{ questionId: ORDER[0], optionIndex: 2, confidence: 'fairly-sure' }]);
  expect(prompt()).toHaveTextContent(promptOf(ORDER[1]));
  expect(screen.queryByText(/correct|try again|well done/i)).toBeNull();
});

test('"Not sure" commits at once with no option and no chip', async () => {
  backend();
  await toFirstQuestion();
  await answer('unsure');

  await question(3);
  expect(steps()[1].history).toEqual([{ questionId: ORDER[0], optionIndex: null, confidence: null }]);
  expect(get('quick-check-why')).toHaveTextContent('Picked to learn more about Investing', { exact: false });
});

test('an area asked about before reads "from another angle"', async () => {
  const step: Handler = ({ history }) =>
    ok({ mastery: MASTERY, nextQuestionId: ORDER[history.length === 1 ? 2 : history.length], done: false, useRules: false, stepFellBack: false });
  backend({ step });
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);
  expect(get('quick-check-why')).toHaveTextContent('Picked to look at Saving from another angle', { exact: false });
});

test('tiles stay off for a moment on each new question, so a double tap cannot skip one', async () => {
  backend();
  await toProfile();
  expect(get('quick-check-option-1')).toBeDisabled();
  await ready();
  expect(get('quick-check-option-1')).toBeEnabled();
  await press('quick-check-option-1');
  await question(2);
  expect(get('quick-check-option-1')).toBeDisabled();
});

test('while a step runs the status line shows and tiles and chips are off', async () => {
  let release: () => void = () => {};
  const slow: Handler = (request) =>
    request.history.length === 1 ? new Promise((resolve) => (release = () => resolve(stepper()(request)))) : stepper()(request);
  backend({ step: slow });
  await toFirstQuestion();
  await answer(0, 'sure');

  expect(get('quick-check-status')).toHaveTextContent('Choosing your next question', { exact: false });
  expect(get('quick-check-option-1')).toBeDisabled();
  expect(get('confidence-sure')).toBeDisabled();
  expect(get('flow-status')).toHaveTextContent('Choosing your next question', { exact: false });
  await act(async () => release());
  await question(3);
  expect(screen.queryByTestId('quick-check-status')).toBeNull();
});

test('the step that says done ends the test before the maximum: "All set", then one final POST with everything', async () => {
  backend({ step: stepper(2) });
  await toFirstQuestion();
  await answer(1, 'guessing');
  await question(3);
  await answer('unsure');

  expect(await screen.findByTestId('quick-check-status')).toHaveTextContent('All set · That is enough to place you', { exact: false });
  expect(get('flow-status')).toHaveTextContent('All set · That is enough to place you', { exact: false });
  expect(finals()).toHaveLength(0);
  await finish();
  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();

  expect(finals()).toEqual([
    {
      consent: true,
      facts: expect.any(Object),
      profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
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
  await answer(0, 'sure');
  await screen.findByTestId('quick-check-status');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });

  const sent = JSON.stringify([...steps(), ...finals()]);
  const { positionCount, ...amounts } = slotValues(seedAccount());
  for (const value of Object.values(amounts)) {
    expect(sent).not.toContain(String(value));
    expect(sent).not.toContain(groupThousands(value));
  }
});

test('"Use simple check instead" runs every step on rules and counts no model call', async () => {
  backend({ step: stepper(1, true) });
  await toFirstQuestion({ simple: true });
  await answer(0, 'sure');
  await screen.findByTestId('quick-check-status');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });

  expect(steps().map((s) => s.useRules)).toEqual([true, true]);
  expect(finals()[0]).toMatchObject({ useRules: true, stepCallsMade: 0 });
});

test('a step that answers stepFellBack makes the later steps run on the rule; only model calls are counted', async () => {
  const step: Handler = ({ history }) =>
    ok({ mastery: MASTERY, nextQuestionId: ORDER[history.length], done: history.length >= 4, useRules: false, stepFellBack: history.length >= 2 });
  backend({ step });
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);
  await answer(0, 'sure');
  await question(4);
  await answer(0, 'sure');
  await question(5);
  await answer(0, 'sure');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });

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
  backend({ step });
  await toFirstQuestion();
  for (let i = 0; i < MAX_QUESTIONS; i++) {
    await answer('unsure');
    if (i < MAX_QUESTIONS - 1) await question(i + 3);
  }
  await screen.findByTestId('quick-check-status');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(finals()[0].history).toHaveLength(MAX_QUESTIONS);
  expect(finals()[0].stepCallsMade).toBe(MAX_QUESTIONS);
});

test.each([
  { name: 'an empty bank (no Jev key and no questions)', pool: () => ok([]) },
  { name: 'a failed GET', pool: () => fail(500) },
])('$name skips the Quick check: consent leads straight to the summary with the F1 body', async ({ pool }) => {
  backend({ pool, post: () => ok(categorization({ source: 'fallback', startLesson: null, confidenceGaps: [] })) });
  await open();
  expect(screen.queryByTestId('consent-quickcheck-note')).toBeNull();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(screen.queryByTestId('categorizing-know')).toBeNull();
  expect(finals()).toEqual([{ consent: false }]);
  expect(screen.queryByTestId('summary-simple')).toBeNull();
});

test('a first step that fails skips the Quick check: the final POST carries no profile, history or mastery', async () => {
  backend({ step: () => fail(500) });
  await toProfile();
  await ready();
  await press('quick-check-option-1');

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(steps()).toHaveLength(1);
  expect(finals()).toEqual([{ consent: true, facts: expect.any(Object) }]);
});

test('after the opt-out a failed first step still sends useRules on the skip path', async () => {
  backend({ step: () => fail(500) });
  await toProfile({ simple: true });
  await ready();
  await press('quick-check-option-1');

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(finals()).toEqual([{ consent: true, facts: expect.any(Object), useRules: true }]);
});

test('a restart whose first step fails still reports the model calls made before Back', async () => {
  let starts = 0;
  const step: Handler = (request) => (request.history.length === 0 && ++starts === 2 ? fail(500) : stepper()(request));
  backend({ step });
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);
  await press('quick-check-back');
  await fireEvent.press(await screen.findByTestId('know-start'));

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(finals()).toEqual([{ consent: true, facts: expect.any(Object), stepCallsMade: 1 }]);
});

test('a later step that fails is retried once with stepFellBack, and the test goes on', async () => {
  const step: Handler = (request) => (request.history.length === 1 && !request.stepFellBack ? fail(503) : stepper()(request));
  backend({ step });
  await toFirstQuestion();
  await answer(0, 'sure');

  await question(3);
  expect(steps().slice(1).map((s) => [s.history.length, s.useRules, s.stepFellBack])).toEqual([
    [1, false, false],
    [1, false, true],
  ]);
  await answer(0, 'sure');
  await question(4);
  expect(steps().at(-1)).toMatchObject({ useRules: false, stepFellBack: true });
});

test('a step that fails twice ends the test; the final POST carries the history so far, and the model is still asked', async () => {
  const step: Handler = (request) => (request.history.length === 2 ? fail(503) : stepper()(request));
  backend({ step });
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);
  await answer(1, 'fairly-sure');

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(finals()).toEqual([
    {
      consent: true,
      facts: expect.any(Object),
      profile: expect.any(Object),
      history: [
        { questionId: ORDER[0], optionIndex: 0, confidence: 'sure' },
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
  await answer(0, 'sure');
  await act(() => jest.advanceTimersByTimeAsync(5_000));
  await question(3);
  expect(steps().at(-1)).toMatchObject({ stepFellBack: true });
});

test('Back returns to the "What we know" card; "Start the quick check" restarts with no history and the profile kept', async () => {
  backend();
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);

  await press('quick-check-back');
  expect(await screen.findByTestId('categorizing-know')).toBeOnTheScreen();
  await fireEvent.press(get('know-start'));

  // The time frame was answered before, so the first step goes out at once, with an empty history.
  await screen.findByTestId('quick-check-unsure');
  expect(steps().at(-1)).toMatchObject({ history: [], profile: { horizon: '1-5y' } });
  expect(screen.getByText('Question 2 of up to 7')).toBeOnTheScreen();
  expect(prompt()).toHaveTextContent(promptOf(ORDER[0]), { exact: false });
});

test('hardware back during the questions is the same as Back', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  try {
    backend();
    await toFirstQuestion();
    await hardwareBack(add);
    expect(screen.getByTestId('categorizing-know')).toBeOnTheScreen();
  } finally {
    add.mockRestore();
  }
});

test('an answer that arrives after Back is ignored', async () => {
  let release: () => void = () => {};
  const slow: Handler = (request) =>
    request.history.length === 1 ? new Promise((resolve) => (release = () => resolve(stepper()(request)))) : stepper()(request);
  backend({ step: slow });
  await toFirstQuestion();
  await answer(0, 'sure');
  await press('quick-check-back');
  await act(async () => release());

  expect(await screen.findByTestId('categorizing-know')).toBeOnTheScreen();
  expect(screen.queryByTestId('quick-check')).toBeNull();
});

test('the count of model calls survives Back and a restart', async () => {
  backend({ step: stepper(2) });
  await toFirstQuestion();
  await answer(0, 'sure');
  await question(3);
  await press('quick-check-back');
  await fireEvent.press(await screen.findByTestId('know-start'));
  await screen.findByTestId('quick-check-unsure');
  await answer(0, 'sure');
  await question(3);
  await answer(0, 'sure');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(finals()[0].stepCallsMade).toBe(3);
});

test('a 400 on the final POST takes the F1 path instead of a Retry that cannot succeed', async () => {
  const post: Handler = (request) => ('history' in request ? fail(400) : ok(categorization()));
  backend({ step: stepper(1), post });
  await toFirstQuestion();
  await answer(0, 'sure');
  await finish();

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(finals().map((f) => Object.keys(f).sort())).toEqual([
    ['consent', 'facts', 'history', 'mastery', 'profile', 'stepCallsMade', 'useRules'],
    ['consent', 'facts', 'stepCallsMade'],
  ]);
});

test('Back to the consent card and the other choice drops or asks the savings cover', async () => {
  backend();
  await toProfile({ consent: false });
  await ready();
  await press('quick-check-option-2');
  await question(2, 8);
  await press('quick-check-back');
  await fireEvent.press(await screen.findByTestId('know-change'));
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await fireEvent.press(await screen.findByTestId('know-start'));

  // With account access on, the cover answer is dropped and not asked again: only the time frame.
  expect(await screen.findByText('Question 1 of up to 7')).toBeOnTheScreen();
  expect(prompt()).toHaveTextContent('When might you need the money', { exact: false });
});

test('a slow final POST keeps the loading screen until it answers', async () => {
  backend({ step: stepper(1), post: () => new Promise((resolve) => setTimeout(() => resolve(ok(categorization())), 9_000)) });
  await toFirstQuestion();
  await answer(0, 'sure');
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
  await answer(0, 'sure');
  await finish();

  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
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

async function toSummary(post: Categorization) {
  backend({ step: stepper(1), post: () => ok(post) });
  await toFirstQuestion();
  await answer(0, 'sure');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
}

test('the summary: a gap card, the level and its basis, the first lesson, the disclaimer', async () => {
  const gap = { area: 'saving' as const, direction: 'over' as const, because: 'On Saving you said “Sure”. Your answers leave a few things open to explore.' };
  await toSummary(ran({ confidenceGaps: [gap], startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }));

  expect(get('summary-gap-saving')).toHaveTextContent('There is more to explore here', { exact: false });
  expect(get('summary-gap-saving')).toHaveTextContent(gap.because, { exact: false });
  expect(screen.queryByTestId('summary-aligned')).toBeNull();
  expect(get('summary-role')).toHaveTextContent("You're an intermediate learner", { exact: false });
  expect(get('summary-based-on')).toHaveTextContent('Based on 3 answers and how sure you felt about each.', { exact: false });
  expect(get('summary-first-lesson')).toHaveTextContent(/your first stop · saving/i);
  expect(get('summary-first-lesson')).toHaveTextContent('Emergency fund', { exact: false });
  expect(get('summary-first-lesson')).toHaveTextContent('Berlin · stop 3 of 4', { exact: false });
  expect(get('summary-disclaimer')).toHaveTextContent('This picks lessons for you. It is not investment advice.', { exact: false });
  expect(screen.queryByTestId('summary-simple')).toBeNull();
});

test('an under-confidence gap says "You know more than you think"', async () => {
  const gap = { area: 'investing' as const, direction: 'under' as const, because: 'On Investing you said “Guessing”, yet your answers show you already understand how it works.' };
  await toSummary(ran({ confidenceGaps: [gap] }));
  expect(get('summary-gap-investing')).toHaveTextContent('You know more than you think', { exact: false });
});

test('with no gap and a chip on an answer, the aligned card shows', async () => {
  await toSummary(ran());
  expect(get('summary-aligned')).toHaveTextContent('How sure you felt matches your answers', { exact: false });
  expect(get('summary-aligned')).toHaveTextContent('On the areas we checked, your confidence and your answers line up.', { exact: false });
});

test('with only "Not sure" answers there is no chip, so no aligned card', async () => {
  backend({ step: stepper(1), post: () => ok(ran()) });
  await toFirstQuestion();
  await answer('unsure');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(screen.queryByTestId('summary-aligned')).toBeNull();
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
  backend({ stored: ran({ startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }) });
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));

  expect(await screen.findByTestId('summary-first-lesson')).toHaveTextContent('Emergency fund', { exact: false });
  expect(get('summary-aligned')).toBeOnTheScreen();
  expect(get('summary-based-on')).toHaveTextContent('3 answers', { exact: false });
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

/** The markers are hidden from screen readers (the column's text says it), so they are looked up as hidden. */
const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style);
const BAR_HEIGHT = 44;
const DIAMOND_HALF = 5;

test('the dock appears with the knowledge questions only, one column per bank area, each with its screen-reader text', async () => {
  backend();
  await toProfile();
  expect(screen.queryByTestId('map-dock')).toBeNull();
  await ready();
  await press('quick-check-option-1');
  await screen.findByTestId('quick-check-unsure');

  expect(get('map-dock')).toBeOnTheScreen();
  expect(get('dock-sr-saving')).toHaveTextContent('Saving: Not checked yet', { exact: false });
  expect(get('dock-sr-investing')).toHaveTextContent('Investing: Not checked yet', { exact: false });
  expect(screen.queryByTestId('dock-area-debt')).toBeNull();
  expect(style('dock-bar-saving').height).toBe(0);
  expect(style('dock-diamond-saving').opacity).toBe(0);
});

test('the diamond follows the chip at once, the bar and the level follow the step', async () => {
  let release: () => void = () => {};
  const slow: Handler = (request) =>
    request.history.length === 1 ? new Promise((resolve) => (release = () => resolve(stepper()(request)))) : stepper()(request);
  backend({ step: slow });
  await toFirstQuestion();
  await answer(0, 'sure');

  expect(style('dock-diamond-saving').opacity).toBe(1);
  expect(style('dock-diamond-saving').bottom).toBeCloseTo(0.9 * BAR_HEIGHT - DIAMOND_HALF);
  expect(style('dock-bar-saving').height).toBe(0);
  await act(async () => release());
  await question(3);
  expect(style('dock-bar-saving').height).toBeCloseTo(0.6 * BAR_HEIGHT);
  expect(style('dock-bar-investing').height).toBeCloseTo(0.25 * BAR_HEIGHT);
  expect(get('dock-sr-saving')).toHaveTextContent('Saving: Building', { exact: false });
  expect(get('dock-sr-investing')).toHaveTextContent('Investing: Just starting', { exact: false });
});

test('"Not sure" counts as Guessing on the diamond', async () => {
  backend();
  await toFirstQuestion();
  await answer('unsure');
  await question(3);
  expect(style('dock-diamond-saving').bottom).toBeCloseTo(0.25 * BAR_HEIGHT - DIAMOND_HALF);
});

test('a tap on the dock opens "Your map in detail" with both markers and the legend; Close closes it', async () => {
  backend();
  await toFirstQuestion();
  await answer(0, 'fairly-sure');
  await question(3);

  await press('map-dock');
  expect(await screen.findByText('Your map in detail')).toBeOnTheScreen();
  // The sheet closes only once it has been laid out; Jest has no layout pass.
  await fireEvent(get('map-sheet'), 'layout', { nativeEvent: { layout: { height: 300 } } });
  expect(get('area-level-saving')).toHaveTextContent('Building');
  expect(get('area-level-investing')).toHaveTextContent('Just starting');
  expect(screen.getByText('How sure you felt')).toBeOnTheScreen();
  expect(screen.getByText('What your answers show')).toBeOnTheScreen();
  await press('sheet-close');
  await act(() => jest.advanceTimersByTimeAsync(400));
  expect(screen.queryByText('Your map in detail')).toBeNull();
});

test('Solid needs two answers in the area: one high answer reads Building, two read Solid', async () => {
  const step: Handler = ({ history }) =>
    ok({ mastery: { saving: 0.9, investing: null }, nextQuestionId: ORDER[history.length], done: false, useRules: false, stepFellBack: false });
  backend({ step });
  await toFirstQuestion();
  await answer(1, 'sure');
  await question(3);
  expect(get('dock-sr-saving')).toHaveTextContent('Saving: Building', { exact: false });
  await answer(1, 'sure');
  await question(4);
  expect(get('dock-sr-saving')).toHaveTextContent('Saving: Building', { exact: false });
  await answer(1, 'sure');
  await question(5);
  expect(get('dock-sr-saving')).toHaveTextContent('Saving: Solid', { exact: false });
});

test('after a reload the summary map comes from the stored row; a ready path reads Solid', async () => {
  backend({ stored: ran({ readyForNext: true, mastery: { saving: 0.9, investing: 0.8 }, confidence: { saving: 0.9, investing: 0.6 } }) });
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));

  expect(await screen.findByTestId('summary-map')).toBeOnTheScreen();
  expect(get('area-level-saving')).toHaveTextContent('Solid');
  expect(style('area-bar-saving').width).toBe('90%');
  expect(style('area-diamond-investing').left).toBe('60%');
});

test('after a reload a high mastery on a path that is not ready reads Building: the answer counts are gone', async () => {
  backend({ stored: ran({ mastery: { saving: 0.9, investing: 0.2 } }) });
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));

  expect(await screen.findByTestId('summary-map')).toBeOnTheScreen();
  expect(get('area-level-saving')).toHaveTextContent('Building');
  expect(get('area-level-investing')).toHaveTextContent('Just starting');
});

test('right after the test the summary map counts the answers per area: two in Saving read Solid, one in Investing does not', async () => {
  backend({ step: stepper(3), post: () => ok(ran({ mastery: { saving: 0.9, investing: 0.9 } })) });
  await toFirstQuestion();
  await answer(1, 'sure');
  await question(3);
  await answer(0, 'sure');
  await question(4);
  await answer(1, 'sure');
  await finish();
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  // ORDER is Saving, Investing, Saving.
  expect(get('area-level-saving')).toHaveTextContent('Solid');
  expect(get('area-level-investing')).toHaveTextContent('Building');
});
