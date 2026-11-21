import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { categorization } from '@/test-utils/categorization';
import { POOL } from '@/test-utils/checkPool';
import { appRoutes as routes } from '@/test-utils/routes';
import type { Categorization } from '@/types/categorization';

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });
const PROFILE = { userId: 'demo-user', goals: [], onboardingCompleted: true };

let fetchMock: jest.Mock;
type Backend = { pool?: () => Promise<unknown>; post?: () => Promise<unknown>; existing?: () => Promise<unknown> };

function backend({ pool = () => ok(POOL), post = () => ok(categorization()), existing = () => fail(404) }: Backend = {}) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/api/check-questions')) return pool();
    if (url.endsWith('/categorization')) return init?.method === 'POST' ? post() : existing();
    if (/\/profile(\/onboarding)?$/.test(url)) return init?.method ? ok({}) : ok(PROFILE);
    if (/\/api\/lessons\/\d+$/.test(url)) return ok({ id: 2, title: 'Compound interest', questions: [] });
    return ok([]);
  });
  globalThis.fetch = fetchMock;
}

const bodies = () =>
  fetchMock.mock.calls.filter(([u, i]) => u.endsWith('/categorization') && i?.method === 'POST').map(([, i]) => JSON.parse(i.body));
const get = (id: string) => screen.getByTestId(id);
const press = (id: string) => fireEvent.press(get(id));
const type = (text: string) => fireEvent.changeText(get('quick-check-input'), text);

async function open() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/categorizing'));
}
const answerAll = async (texts: (string | null)[]) => {
  for (const t of texts) {
    if (t === null) await press('quick-check-unsure');
    else {
      await type(t);
      await press('quick-check-next');
    }
  }
};

// A draw of 0s takes the first area and question of each category, by id: card-minimum, rate-vs-inflation, etf-drop,
// one-etf-vs-one-stock. (Mocking Math.random itself would make the router's generated keys collide.)
jest.mock('@/lib/quickCheck', () => ({ ...jest.requireActual('@/lib/quickCheck'), quizRng: () => () => 0 }));

test('the summary of a user who has not been categorised redirects to the map', async () => {
  backend();
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/learning-path'));
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test('the consent card says Quick check answers go to the lesson picker as typed, and only the judgement is kept', async () => {
  backend();
  await open();
  expect(await screen.findByTestId('consent-quickcheck-note')).toHaveTextContent(
    /as you type them, so leave out exact amounts\. Only the judgement is stored, never your words\./,
  );
});

test('questions come one at a time, 1 of 4, with the privacy copy above the first and the account numbers filled in', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));

  expect(await screen.findByTestId('quick-check')).toBeOnTheScreen();
  expect(screen.getByText('1 of 4')).toBeOnTheScreen();
  expect(screen.getByText('Four quick questions so we know where to start. There are no wrong answers.')).toBeOnTheScreen();
  expect(
    screen.getByText('Your answers are checked by an AI service to pick your first lesson; only the result is kept.'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-prompt')).toHaveTextContent(
    'You have used €1,640 of your €3,000 credit card limit. What happens if you pay only the minimum each month?',
  );
  expect(screen.getByText('No need to type exact amounts')).toBeOnTheScreen();
  expect(screen.getByText('Only your answer is sent, never these numbers.')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-next')).toBeDisabled();

  await type('   ');
  expect(screen.getByTestId('quick-check-next')).toBeDisabled();
  await type('Interest keeps growing.');
  expect(screen.getByText('23 / 280')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-next')).toBeEnabled();
  await press('quick-check-next');

  expect(screen.getByText('2 of 4')).toBeOnTheScreen();
  expect(screen.queryByText('Four quick questions so we know where to start. There are no wrong answers.')).toBeNull();
});

test('without consent the same questions use example numbers and carry no slip line', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));

  expect(await screen.findByTestId('quick-check-prompt')).toHaveTextContent(/^You owe €1,000 on a credit card\./);
  expect(screen.queryByText('Only your answer is sent, never these numbers.')).toBeNull();
  expect(screen.getByText('Your answers are checked by an AI service to pick your first lesson; only the result is kept.')).toBeOnTheScreen();
});

test('Back keeps the answers, and Back on question 1 returns to the consent card', async () => {
  backend();
  await open();
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await type('first');
  await press('quick-check-next');
  await press('quick-check-unsure');
  expect(screen.getByText('3 of 4')).toBeOnTheScreen();

  await press('quick-check-back');
  await press('quick-check-back');
  expect(screen.getByText('1 of 4')).toBeOnTheScreen();
  expect(get('quick-check-input').props.value).toBe('first');

  await press('quick-check-back');
  expect(await screen.findByTestId('categorizing-consent')).toBeOnTheScreen();
  await press('consent-accept');
  expect(get('quick-check-input').props.value).toBe('first');
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
  expect(body.answers).toEqual([
    { questionId: 'card-minimum', text: 'Interest keeps growing.' },
    { questionId: 'rate-vs-inflation', text: null },
    { questionId: 'etf-drop', text: 'It can fall and recover.' },
    { questionId: 'one-etf-vs-one-stock', text: 'One failing hurts less.' },
  ]);
  const sent = JSON.stringify(body);
  for (const amount of ['1,640', '1640', '12,500', '12500', '3,000', '3000']) expect(sent).not.toContain(amount);
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
  expect(screen.getByTestId('summary-area-investing')).toHaveTextContent(/Your answer about investing shows you know it well\./);
  expect(screen.getByTestId('summary-area-debt')).toHaveTextContent(/Your answer about borrowing shows where to start\./);
  expect(screen.getByTestId('summary-area-risk')).toHaveTextContent(/Your answer about risk covered part of it\./);
  expect(screen.queryByTestId('summary-area-saving')).toBeNull();
  expect(screen.queryByText("We couldn't check your answers this time")).toBeNull();
  expect(screen.getByTestId('summary-start')).toHaveTextContent('Start learning: Compound interest');
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
    post: () => ok(categorization({ startLesson: null, confidenceGaps: [], checks: [], focusAreas: ['investing', 'retirement'] })),
  });
  await open();
  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await answerAll(['a', 'b', 'c', 'd']);

  await screen.findByTestId('learning-path', {}, { timeout: 4000 });
  expect(screen.queryByTestId('summary-gap')).toBeNull();
  expect(screen.getByTestId('summary-area-investing')).toHaveTextContent(/You picked investing as a goal\./);
  expect(screen.getByTestId('summary-area-retirement')).toHaveTextContent(/It fits the answers you gave\./);
  expect(screen.getByTestId('summary-start')).toHaveTextContent('Start learning');
  await press('summary-start');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
});

test.each([
  ['an empty pool (no Jev key)', () => ok([])],
  ['a failed GET', () => fail(500)],
])('%s skips the questions and goes from consent to the summary', async (_, pool) => {
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

test('a categorisation found when the screen opens is shown once, then Learn', async () => {
  const stored: Categorization = categorization();
  backend({ existing: () => ok(stored) });
  await open();

  expect(await screen.findByTestId('learning-path')).toBeOnTheScreen();
  await press('summary-all');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();

  await act(async () => router.push('/categorizing'));
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('learning-path')).toBeNull();
});
