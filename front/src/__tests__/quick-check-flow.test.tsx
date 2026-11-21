import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet } from 'react-native';

import { ANSWER_DELAY_MS } from '@/hooks/useQuickCheck';
import { colors } from '@/constants/theme';
import { groupThousands } from '@/lib/bank/money';
import { createRng, seedAccount } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import { setSummary } from '@/lib/learningPath';
import { accountUsable, drawQuestions, promptParts } from '@/lib/quickCheck';
import { categorization } from '@/test-utils/categorization';
import { POOL } from '@/test-utils/checkPool';
import { appRoutes as routes } from '@/test-utils/routes';

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });
const hang = (init?: RequestInit) =>
  new Promise((_, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
  );
const INTRO = 'Four quick questions so we know where to start. There are no wrong answers.';
const AI_LINE = 'Your answers are checked by an AI service to pick your first lesson; only the result is kept.';
const PROFILE = { userId: 'demo-user', goals: [], onboardingCompleted: true };

let fetchMock: jest.Mock;
type Handler = (init?: RequestInit) => Promise<unknown>;
type Backend = { pool?: Handler; post?: Handler; goals?: string[] };

function backend({ pool = () => ok(POOL), post = () => ok(categorization()), goals = [] }: Backend = {}) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/api/check-questions')) return pool(init);
    if (url.endsWith('/categorization')) return init?.method === 'POST' ? post(init) : fail(404);
    if (/\/profile(\/onboarding)?$/.test(url)) return init?.method ? ok({}) : ok({ ...PROFILE, goals });
    if (/\/api\/lessons\/\d+$/.test(url)) return ok({ id: 2, title: 'Compound interest', questions: [] });
    return ok([]);
  });
  globalThis.fetch = fetchMock;
}

const posts = () =>
  fetchMock.mock.calls.filter(([url, init]) => url.endsWith('/categorization') && init?.method === 'POST');
const bodies = () => posts().map(([, init]) => JSON.parse(init.body));
const get = (id: string) => screen.getByTestId(id);
const press = (id: string) => fireEvent.press(get(id));
const type = (text: string) => fireEvent.changeText(get('quick-check-input'), text);
const input = () => get('quick-check-input').props.value;
/** Next and "Not sure" stay disabled for a moment after a question appears, so a double tap cannot skip one. */
const ready = () => act(() => jest.advanceTimersByTimeAsync(ANSWER_DELAY_MS));
const unsure = async () => {
  await ready();
  await press('quick-check-unsure');
};
const next = async () => {
  await ready();
  await press('quick-check-next');
};

// The draw is seeded (EXPO_PUBLIC_QUIZ_SEED, dev builds): the screen shows what the same seed draws here.
const SEED = 1;
const draw = (consent: boolean) => drawQuestions(POOL, seedAccount(), consent, createRng(SEED));
const promptOf = (consent: boolean, i: number) => {
  const { question } = draw(consent)[i];
  const account = accountUsable(question, seedAccount(), consent);
  return promptParts(question, seedAccount(), account)
    .map((part) => part.text)
    .join('');
};

async function open() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/categorizing'));
}
const answerAll = async (texts: (string | null)[]) => {
  for (const text of texts) {
    if (text === null) await unsure();
    else {
      await type(text);
      await next();
    }
  }
};

beforeEach(() => {
  setSummary(null);
  process.env.EXPO_PUBLIC_QUIZ_SEED = String(SEED);
});
afterEach(() => {
  delete process.env.EXPO_PUBLIC_QUIZ_SEED;
});

test('the summary of a user who has not been categorised redirects to the map', async () => {
  backend();
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test('the consent card names the AI service and says the answers are sent as written and only the judgement is kept', async () => {
  backend();
  await open();
  expect(await screen.findByTestId('consent-quickcheck-note')).toHaveTextContent(
    /sent exactly as you write them, to an AI service that picks your first lesson.*Only the judgement is stored, never your words\./,
  );
});

test('questions come one at a time, 1 of 4, with the privacy copy above the first and the account numbers filled in', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));

  expect(await screen.findByTestId('quick-check')).toBeOnTheScreen();
  expect(screen.getByText('1 of 4')).toBeOnTheScreen();
  expect(screen.getByText(INTRO)).toBeOnTheScreen();
  expect(screen.getByText(AI_LINE)).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-prompt')).toHaveTextContent(promptOf(true, 0));
  expect(promptOf(true, 0)).not.toBe(promptOf(false, 0));
  expect(screen.getByText('No need to type exact amounts')).toBeOnTheScreen();
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-next')).toBeDisabled();
  expect(get('quick-check-input').props.maxLength).toBe(280);

  await type('   ');
  expect(screen.getByTestId('quick-check-next')).toBeDisabled();
  await type('Interest keeps growing.');
  expect(screen.getByText('23 / 280')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-next')).toBeDisabled();
  await ready();
  expect(screen.getByTestId('quick-check-next')).toBeEnabled();
  await press('quick-check-next');

  expect(screen.getByText('2 of 4')).toBeOnTheScreen();
  expect(screen.queryByText(INTRO)).toBeNull();
});

test('without consent the same questions use example numbers and carry no slip line', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(await screen.findByTestId('quick-check-prompt')).toHaveTextContent(promptOf(false, 0));
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
  expect(screen.getByText(AI_LINE)).toBeOnTheScreen();
});

test('Back keeps the answers and the draft, and Back on question 1 returns to the consent card', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await type('first');
  await next();
  await type('half-written');

  await press('quick-check-back');
  expect(screen.getByText('1 of 4')).toBeOnTheScreen();
  expect(input()).toBe('first');
  await next();
  expect(input()).toBe('half-written');

  await press('quick-check-back');
  await press('quick-check-back');
  expect(await screen.findByTestId('categorizing-consent')).toBeOnTheScreen();
  await press('consent-accept');
  expect(input()).toBe('first');
});

test('Back to the consent card and the other choice keeps the answers and switches to example numbers', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
  await type('first');
  await press('quick-check-back');

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(input()).toBe('first');
  expect(screen.getByTestId('quick-check-prompt')).toHaveTextContent(draw(true)[0].question.genericPrompt);
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
});

test('hardware back during the questions is the previous question, and from the first one the consent card', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await type('first');
  await next();
  const hardwareBack = async () => {
    const ours = add.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as () => boolean;
    await act(async () => {
      expect(ours()).toBe(true);
    });
  };

  await hardwareBack();
  expect(screen.getByText('1 of 4')).toBeOnTheScreen();
  expect(input()).toBe('first');
  await hardwareBack();
  expect(screen.getByTestId('categorizing-consent')).toBeOnTheScreen();
  add.mockRestore();
});

test('Next and "Not sure" wait a moment on each new question, so a double tap skips one question, not two', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(get('quick-check-unsure')).toBeDisabled();
  await ready();
  expect(get('quick-check-unsure')).toBeEnabled();

  await press('quick-check-unsure');
  expect(screen.getByText('2 of 4')).toBeOnTheScreen();
  expect(get('quick-check-unsure')).toBeDisabled();
  await press('quick-check-unsure');
  expect(screen.getByText('2 of 4')).toBeOnTheScreen();
});

test('a kept answer does not make Next skippable: it waits too', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await type('first');
  await next();
  await press('quick-check-back');
  expect(get('quick-check-next')).toBeDisabled();
  await ready();
  expect(get('quick-check-next')).toBeEnabled();
});

test('Back to the consent card before typing anything, then accepting, draws again with the account versions', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
  await press('quick-check-back');

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(get('quick-check-prompt')).toHaveTextContent(promptOf(true, 0));
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
});

test('a pool request that never answers is treated as no questions after 10 s', async () => {
  backend({ pool: hang });
  await open();

  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(await screen.findByTestId('consent-decline')).toBeOnTheScreen();
  expect(screen.queryByTestId('consent-quickcheck-note')).toBeNull();
});

test('a slow POST keeps the loading screen until it answers', async () => {
  backend({ post: () => new Promise((resolve) => setTimeout(() => resolve(ok(categorization())), 9_000)) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll(['a', 'b', 'c', 'd']);

  await act(() => jest.advanceTimersByTimeAsync(8_000));
  expect(screen.getByTestId('categorizing-loading')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(1_500));
  expect(await screen.findByTestId('learning-path')).toBeOnTheScreen();
});

test('four answers go in one POST with "Not sure" as null and no account amounts, then the summary shows', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await answerAll(['Interest keeps growing.', null, 'It can fall and recover.', 'One failing hurts less.']);

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  const [body] = bodies();
  expect(bodies()).toHaveLength(1);
  expect(body.consent).toBe(true);
  const [first, second, third, fourth] = draw(true).map((d) => d.question.id);
  expect(body.answers).toEqual([
    { questionId: first, text: 'Interest keeps growing.' },
    { questionId: second, text: null },
    { questionId: third, text: 'It can fall and recover.' },
    { questionId: fourth, text: 'One failing hurts less.' },
  ]);
  const sent = JSON.stringify(body);
  const { positionCount, ...amounts } = slotValues(seedAccount());
  for (const value of Object.values(amounts)) {
    expect(sent).not.toContain(String(value));
    expect(sent).not.toContain(groupThousands(value));
  }
});

test('the summary leads with the gap, then the level and why, then up to three areas, then the first lesson', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await answerAll(['a', 'b', 'c', 'd']);
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });

  expect(screen.getByText('You know more than you think')).toBeOnTheScreen();
  expect(screen.getByTestId('summary-gap')).toHaveTextContent(/your answer about investing shows you understand it\.$/);
  expect(screen.getByText("You're an intermediate learner")).toBeOnTheScreen();
  expect(screen.getByText('Money goes to savings or investments every month.')).toBeOnTheScreen();
  for (const area of ['investing', 'debt', 'risk']) {
    expect(screen.getByTestId(`summary-area-${area}`)).toBeOnTheScreen();
  }
  expect(screen.getByText('Compound interest')).toBeOnTheScreen();
  expect(screen.queryByTestId('summary-area-saving')).toBeNull();
  expect(screen.queryByText("We couldn't check your answers this time")).toBeNull();
  expect(screen.getByTestId('summary-start')).toHaveTextContent('Start learning');
});

test('Start learning opens the first lesson of the weakest area', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await answerAll(['a', 'b', 'c', 'd']);
  await fireEvent.press(await screen.findByTestId('summary-start', {}, { timeout: 4000 }));

  expect(screen).toHavePathname('/lesson/2');
});

test('See all lessons opens the map; Start learning without a start lesson does too', async () => {
  backend({
    post: () =>
      ok(
        categorization({ startLesson: null, confidenceGaps: [], checks: [], focusAreas: ['investing', 'retirement'] }),
      ),
  });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll(['a', 'b', 'c', 'd']);

  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(screen.queryByTestId('summary-gap')).toBeNull();
  expect(screen.getByTestId('summary-area-investing')).toHaveTextContent(/It fits the answers you gave\.$/);
  expect(screen.getByTestId('summary-area-retirement')).toHaveTextContent(/It fits the answers you gave\.$/);
  expect(screen.getByTestId('summary-start')).toHaveTextContent('Start learning');
  await press('summary-start');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test.each([
  { name: 'an empty pool (no Jev key)', pool: () => ok([]) },
  { name: 'a failed GET', pool: () => fail(500) },
])('$name skips the questions and goes from consent to the summary', async ({ pool }) => {
  backend({ pool, post: () => ok(categorization({ source: 'fallback', checks: [], startLesson: null })) });
  await open();

  expect(screen.queryByTestId('consent-quickcheck-note')).toBeNull();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(screen.queryByTestId('quick-check')).toBeNull();
  expect(bodies()).toEqual([{ consent: false }]);
  expect(screen.queryByText("We couldn't check your answers this time")).toBeNull();
});

test('when Jev failed after answers were sent, the summary says so', async () => {
  backend({ post: () => ok(categorization({ source: 'fallback', checks: [], confidenceGaps: [] })) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll(['a', 'b', 'c', 'd']);

  expect(await screen.findByText("We couldn't check your answers this time", {}, { timeout: 4000 })).toBeOnTheScreen();
});

test('a retry after a failed POST resends the same answers', async () => {
  let attempts = 0;
  backend({ post: () => (++attempts === 1 ? fail(503) : ok(categorization())) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll(['a', null, 'c', 'd']);

  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));
  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  const [first, second] = bodies();
  expect(second).toEqual(first);
  expect(first.answers.map((a: { text: string | null }) => a.text)).toEqual(['a', null, 'c', 'd']);
});

test('a categorisation without checks or a start lesson (a backend without the Quick check) still shows the summary', async () => {
  const { checks, startLesson, ...old } = categorization();
  backend({ pool: () => ok([]), post: () => ok(old) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(screen.getByTestId('summary-start')).toHaveTextContent('Start learning');
});

test('an over-confidence gap gets its own title, never "You know more than you think"', async () => {
  const gap = {
    area: 'investing' as const,
    direction: 'over' as const,
    because: 'You said: I save and invest. No investment products in your accounts with us.',
  };
  backend({ pool: () => ok([]), post: () => ok(categorization({ confidenceGaps: [gap] })) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(screen.getByText('There is more to explore here')).toBeOnTheScreen();
  expect(screen.queryByText('You know more than you think')).toBeNull();
});

test('four "Not sure" answers followed by a Jev failure do not claim the answers were checked', async () => {
  backend({ post: () => ok(categorization({ source: 'fallback', checks: [], confidenceGaps: [] })) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll([null, null, null, null]);

  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(screen.queryByText("We couldn't check your answers this time")).toBeNull();
});

test('hardware back on the summary leaves for the map like See all lessons, not for the bank', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  try {
    backend({ pool: () => ok([]) });
    await open();
    await fireEvent.press(await screen.findByTestId('consent-decline'));
    await screen.findByTestId('learning-path', {}, { timeout: 4000 });

    const ours = add.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as () => boolean;
    let handled = false;
    await act(async () => {
      handled = ours();
    });
    expect(handled).toBe(true);
    expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  } finally {
    add.mockRestore();
  }
});

test('a double tap on Start learning opens the lesson once', async () => {
  backend({ pool: () => ok([]) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  const { onClick } = (await screen.findByTestId('summary-start', {}, { timeout: 4000 })).props;
  const push = jest.spyOn(router, 'push');

  await act(async () => {
    onClick({ nativeEvent: {} });
    onClick({ nativeEvent: {} });
  });
  expect(push.mock.calls.filter(([href]) => typeof href === 'object')).toHaveLength(1);
  push.mockRestore();
});

test('a 400 on rejected answers retries without them, keeps the consent, and the summary says they were not checked', async () => {
  let withoutAnswers = 0;
  const rejectAnswers = (init?: RequestInit) => {
    if ('answers' in JSON.parse(String(init?.body))) return fail(400);
    return ++withoutAnswers === 1 ? fail(503) : ok(categorization({ checks: [], source: 'jev' }));
  };
  backend({ post: rejectAnswers });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await answerAll(['a', 'b', 'c', 'd']);

  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));
  expect(await screen.findByTestId('learning-path', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(bodies().map((body) => [body.consent, 'facts' in body, 'answers' in body])).toEqual([
    [true, true, true],
    [true, true, false],
    [true, true, true],
    [true, true, false],
  ]);
  expect(screen.getByText("We couldn't check your answers this time")).toBeOnTheScreen();
});

test('a 400 without answers still ends in the error screen', async () => {
  backend({ pool: () => ok([]), post: () => fail(400) });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(await screen.findByTestId('categorizing-error', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(bodies()).toHaveLength(1);
});

/** WCAG 2.2 relative luminance contrast of two #rrggbb colours. */
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('the answer field edge is 3:1 against the page and the card, focused or not, and autofill stays out of it', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  const field = get('quick-check-input');
  const edge = () => StyleSheet.flatten(get('quick-check-input').props.style).borderColor;
  for (const background of [colors.bgCanvas, colors.bgSurface]) {
    expect(contrast(edge(), background)).toBeGreaterThanOrEqual(3);
  }
  await fireEvent(field, 'focus');
  for (const background of [colors.bgCanvas, colors.bgSurface]) {
    expect(contrast(edge(), background)).toBeGreaterThanOrEqual(3);
  }
  expect(field.props).toMatchObject({ autoComplete: 'off', importantForAutofill: 'no', autoCorrect: false });
});

test('each new question is announced to screen readers: the live region on web, the system announcement on native', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(get('flow-status')).toHaveTextContent('Question 1 of 4');
  await type('a');
  await next();
  expect(get('flow-status')).toHaveTextContent('Question 2 of 4');
});

test.each(['ios', 'android'] as const)('on %s the question is announced with the system call', async (os) => {
  const platform = jest.replaceProperty(Platform, 'OS', os);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  try {
    backend();
    await open();
    await fireEvent.press(await screen.findByTestId('consent-decline'));
    await type('a');
    await next();
    expect(announce.mock.calls.map(([message]) => message)).toEqual(['Question 1 of 4', 'Question 2 of 4']);
  } finally {
    announce.mockRestore();
    platform.restore();
  }
});

test('the live regions persist from the consent card on, so the first question is announced like the rest', async () => {
  backend();
  await open();
  const status = await screen.findByTestId('flow-status');
  expect(status).toHaveTextContent('');
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(screen.getByTestId('flow-status')).toBe(status);
  expect(status).toHaveTextContent('Question 1 of 4');
});

test.each(['ios', 'android'] as const)('on %s focus moves to the prompt of each new question', async (os) => {
  const platform = jest.replaceProperty(Platform, 'OS', os);
  const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');
  focus.mockClear();
  try {
    backend();
    await open();
    await fireEvent.press(await screen.findByTestId('consent-decline'));
    expect(focus).toHaveBeenCalledTimes(1);
    await type('a');
    await next();
    expect(focus).toHaveBeenCalledTimes(2);
  } finally {
    focus.mockRestore();
    platform.restore();
  }
});

/** A goal in each area, as the onboarding offers them. */
const GOAL_OF = {
  saving: 'start-saving',
  debt: 'pay-off-debt',
  investing: 'start-investing',
  risk: 'scams',
  retirement: 'retirement',
};

describe('why each area is on the path', () => {
  const areasDrawn = () => draw(true).map((d) => d.question.area);
  const post = () => {
    const checks = draw(true).map(({ question }) => ({
      questionId: question.id,
      area: question.area,
      lessonId: null,
      result: 'partly' as const,
    }));
    return () => ok(categorization({ checks, focusAreas: areasDrawn(), confidenceGaps: [] }));
  };
  const summaryWith = async (goals: string[]) => {
    backend({ post: post(), goals });
    await open();
    await fireEvent.press(await screen.findByTestId('consent-accept'));
    await answerAll(['a', null, 'c', 'd']);
    await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  };
  const why = (area: string) => screen.getByTestId(`summary-area-${area}`);
  const label = (area: keyof typeof GOAL_OF) =>
    ({ saving: 'Saving', debt: 'Borrowing', investing: 'Investing', risk: 'Risk', retirement: 'Retirement' })[area];

  test('an answered check places the area; a "Not sure" area reads its goal, or the generic line', async () => {
    const [first, second, third] = areasDrawn();
    await summaryWith([GOAL_OF[second]]);
    expect(within(why(first)).getByText(`Your answer helped place ${label(first)} on your path.`)).toBeOnTheScreen();
    expect(within(why(third)).getByText(`Your answer helped place ${label(third)} on your path.`)).toBeOnTheScreen();
    expect(within(why(second)).getByText(`You picked ${label(second)} as a goal.`)).toBeOnTheScreen();
  });

  test('without a goal the "Not sure" area gets the generic line, never a claim about an answer', async () => {
    await summaryWith([]);
    expect(within(why(areasDrawn()[1])).getByText('It fits the answers you gave.')).toBeOnTheScreen();
  });
});
