import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo, BackHandler, Platform } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ApiError } from '@/lib/api';
import { seedAccount } from '@/lib/bank/seed';
import { factLabels, factsFrom, isRetryable } from '@/lib/categorization';
import { categorization } from '@/test-utils/categorization';
import { appRoutes as routes } from '@/test-utils/routes';
import type { BankState } from '@/types/bank';
import type { Facts } from '@/types/categorization';

/** What the app computes from the seed customer (docs/specs/F1-profiling.md, "Facts"). */
const SEED_FACTS: Facts = {
  incomeBand: '2-3.5k',
  cashBufferMonths: '6+',
  savingsRate: '20%+',
  savesRegularly: true,
  inOverdraft: false,
  holdsInvestments: true,
  hasLoan: true,
};

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });
/** A request that only ends when its signal aborts. */
const hang = (init?: RequestInit) =>
  new Promise((_, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
  );

/** A profile whose onboarding is done, so /categorizing is open to it. */
const PROFILE = { userId: 'demo-user', goals: [], onboardingCompleted: true };

type Handler = (init?: RequestInit) => Promise<unknown>;
let fetchMock: jest.Mock;

/** A user with a saved profile and no categorisation yet, unless a handler says otherwise. */
function backend({
  post = () => ok(categorization()),
  existing = () => fail(404),
  profile = (init?: RequestInit) => (init?.method ? ok({}) : ok(PROFILE)),
}: Record<string, Handler>) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/categorization')) return init?.method === 'POST' ? post(init) : existing(init);
    if (/\/profile(\/onboarding)?$/.test(url)) return profile(init);
    return ok([]);
  });
  globalThis.fetch = fetchMock;
}

const posts = () => fetchMock.mock.calls.filter(([url, init]) => url.endsWith('/categorization') && init?.method === 'POST');
const bodies = () => posts().map(([, init]) => JSON.parse(init.body));
/** Loading holds for at least 2.4 s, longer than findBy's default wait. */
const learn = () => screen.findByTestId('screen-learn', {}, { timeout: 4000 });
/** A categorisation made here ends on the summary; its "See all lessons" is the way on to Learn. */
async function learnViaSummary() {
  await fireEvent.press(await screen.findByTestId('summary-all', {}, { timeout: 4000 }));
  return screen.findByTestId('screen-learn');
}
/** Opens /categorizing over the bank once the saved profile has loaded, as a finished onboarding does. */
async function open() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/categorizing'));
}

test('the seed customer gives the facts in the spec, and they read as plain summaries', () => {
  expect(factsFrom(seedAccount())).toEqual(SEED_FACTS);
  expect(factLabels(SEED_FACTS)).toEqual([
    '€2,000–3,500 income a month',
    'Over 6 months of spending covered',
    'Keeps 20% or more of income',
    'Current account above zero',
    'Moves money to savings every month',
    'Investment products with us',
    'Paying off a loan with us',
  ]);
});

/** The seed with one account changed, for the band edges. */
function bank(account: Partial<BankState['account']>, rest: Partial<BankState> = {}): BankState {
  const seed = seedAccount();
  return { ...seed, ...rest, account: { ...seed.account, ...account } };
}
const EUR = 100;

test('bands are lower-inclusive and upper-exclusive', () => {
  expect(factsFrom(bank({ monthIn: 1000 * EUR - 1 })).incomeBand).toBe('<1k');
  expect(factsFrom(bank({ monthIn: 1000 * EUR })).incomeBand).toBe('1-2k');
  expect(factsFrom(bank({ monthIn: 3500 * EUR })).incomeBand).toBe('3.5-5k');
  expect(factsFrom(bank({ monthIn: 5000 * EUR })).incomeBand).toBe('5k+');

  const noSavings = { savings: { ...seedAccount().savings, balance: 0 } };
  expect(factsFrom(bank({ balance: 999, monthOut: 1000 }, noSavings)).cashBufferMonths).toBe('<1');
  expect(factsFrom(bank({ balance: 1000, monthOut: 1000 }, noSavings)).cashBufferMonths).toBe('1-3');
  expect(factsFrom(bank({ balance: 3000, monthOut: 1000 }, noSavings)).cashBufferMonths).toBe('3-6');
  expect(factsFrom(bank({ balance: 6000, monthOut: 1000 }, noSavings)).cashBufferMonths).toBe('6+');
  expect(factsFrom(bank({ balance: -500, monthOut: 0 }, noSavings)).cashBufferMonths).toBe('6+');

  expect(factsFrom(bank({ monthIn: 1000, monthOut: 1001 })).savingsRate).toBe('negative');
  expect(factsFrom(bank({ monthIn: 1000, monthOut: 1000 })).savingsRate).toBe('0-10%');
  expect(factsFrom(bank({ monthIn: 1000, monthOut: 900 })).savingsRate).toBe('10-20%');
  expect(factsFrom(bank({ monthIn: 1000, monthOut: 800 })).savingsRate).toBe('20%+');
  expect(factsFrom(bank({ monthIn: 0, monthOut: 1 })).savingsRate).toBe('negative');
  expect(factsFrom(bank({ monthIn: 0, monthOut: 0 })).savingsRate).toBe('20%+');
});

test('flags read the bank the way the spec says', () => {
  const seed = seedAccount();
  const lena = factsFrom(
    bank(
      { balance: -1 },
      {
        standingOrders: seed.standingOrders.filter((o) => !o.recipient.startsWith('Depot')),
        holdings: seed.holdings.filter((h) => h.assetClass === 'cash'),
        loan: { ...seed.loan, remaining: 0 },
      },
    ),
  );
  expect(lena).toMatchObject({ inOverdraft: true, savesRegularly: false, holdsInvestments: false, hasLoan: false });
  expect(factLabels(lena)).toEqual(
    expect.arrayContaining(['Current account below zero', 'No regular transfers to savings', 'No investment products with us', 'No loan with us']),
  );
  const toSavings = { ...seed.standingOrders[0], interval: 'Monthly · on the 5th', recipient: 'Savings account' };
  expect(factsFrom(bank({}, { standingOrders: [toSavings] })).savesRegularly).toBe(true);
  expect(factsFrom(bank({}, { standingOrders: [{ ...toSavings, interval: 'Yearly · in May' }] })).savesRegularly).toBe(false);
});

test('network errors, timeouts, 5xx and transient 4xx are retryable; other 4xx are not', () => {
  for (const e of [new TypeError('Network'), new DOMException('Aborted', 'AbortError'), ...[503, 500, 404, 408, 429].map((s) => new ApiError(s, ''))])
    expect(isRetryable(e)).toBe(true);
  expect(isRetryable(new ApiError(400, ''))).toBe(false);
});

test('consent with account data runs the three steps once, then lands on Learn', async () => {
  backend({});
  await open();

  expect(await screen.findByText('Over 6 months of spending covered')).toBeOnTheScreen();
  // A double tap: both presses land before React re-renders the screen.
  const { onClick } = screen.getByTestId('consent-accept').props;
  await act(async () => {
    onClick({ nativeEvent: {} });
    onClick({ nativeEvent: {} });
  });

  expect(screen.getByTestId('categorizing-loading')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(800));
  expect(screen.getByText('7 summaries')).toBeOnTheScreen();

  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: true, facts: SEED_FACTS }]);
});

test('Continue without sends no consent and skips the accounts step', async () => {
  backend({});
  await open();

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(screen.queryByText('Looking at your accounts')).toBeNull();
  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: false }]);
});

test('the card previews exactly the facts a consent sends', async () => {
  backend({});
  await open();

  const pills = within(await screen.findByTestId('consent-slip')).getAllByText(/./).slice(1);
  expect(pills.map((p) => p.props.children)).toEqual(factLabels(SEED_FACTS));
  await fireEvent.press(screen.getByTestId('consent-accept'));

  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: true, facts: SEED_FACTS }]);
});

test('an existing categorisation goes straight to Learn without asking again', async () => {
  backend({ existing: () => ok({ userId: 'demo-user' }) });
  await open();

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('categorizing-consent')).toBeNull();
  expect(posts()).toHaveLength(0);
});

test('a failed existence check offers Retry and Skip but never a POST that could overwrite a stored consent', async () => {
  let attempts = 0;
  backend({ existing: () => (++attempts === 1 ? fail(503) : fail(404)) });
  await open();

  expect(await screen.findByTestId('categorizing-check-retry')).toBeOnTheScreen();
  expect(screen.getByTestId('flow-alert')).toHaveTextContent("Your learning path didn't load");
  expect(screen.queryByTestId('consent-decline')).toBeNull();
  await fireEvent.press(screen.getByTestId('categorizing-check-retry'));

  expect(await screen.findByTestId('consent-accept')).toBeOnTheScreen();
  expect(posts()).toHaveLength(0);
});

test('Skip for now leaves a failing existence check for Learn without a POST', async () => {
  backend({ existing: () => fail(503) });
  await open();

  await fireEvent.press(await screen.findByTestId('categorizing-check-skip'));
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(posts()).toHaveLength(0);
});

test('an existence check that fails for good offers only Skip', async () => {
  backend({ existing: () => fail(403) });
  await open();

  expect(await screen.findByTestId('categorizing-check-skip')).toBeOnTheScreen();
  expect(screen.queryByTestId('categorizing-check-retry')).toBeNull();
  expect(screen.queryByText('Try again in a moment.')).toBeNull();
});

test('an existence check that never answers shows a spinner, then times out after 10 s into Retry', async () => {
  backend({ existing: hang });
  await open();

  expect(await screen.findByLabelText('Checking your learning path')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(screen.getByTestId('categorizing-check-retry')).toBeOnTheScreen();
  expect(posts()).toHaveLength(0);
});

test('a transient 404 after the profile has settled is retried before it becomes an error', async () => {
  let attempts = 0;
  backend({ post: () => (++attempts < 3 ? fail(404) : ok(categorization())) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(posts()).toHaveLength(3);
});

test('a lasting 404 ends in an error that still offers Retry', async () => {
  backend({ post: () => fail(404) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(posts()).toHaveLength(4);
});

test('Retry after a network error keeps the consent the user gave', async () => {
  let attempts = 0;
  backend({ post: () => (++attempts === 1 ? Promise.reject(new TypeError('Network request failed')) : ok(categorization())) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('categorizing-retry'));

  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(bodies()).toEqual([
    { consent: true, facts: SEED_FACTS },
    { consent: true, facts: SEED_FACTS },
  ]);
});

test('a 5xx offers Retry and marks only the last step as not finished', async () => {
  backend({ post: () => fail(503) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(screen.getByLabelText('Reading your answers, Done')).toBeOnTheScreen();
  expect(screen.getByLabelText('Looking at your accounts, Done')).toBeOnTheScreen();
  expect(screen.getByLabelText('Picking your first lessons, Not finished')).toBeOnTheScreen();
  expect(screen.queryByTestId('step-ring')).toBeNull();
});

test.each(['ios', 'android'] as const)('screen readers on %s hear each step and the error', async (os) => {
  const platform = jest.replaceProperty(Platform, 'OS', os);
  // React Native's jest setup already mocks this, with calls from earlier tests.
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  try {
    backend({ post: () => fail(503) });
    await open();

    await fireEvent.press(await screen.findByTestId('consent-accept'));
    await act(() => jest.advanceTimersByTimeAsync(800));
    expect(screen.getByTestId('flow-status')).toHaveTextContent('Looking at your accounts');
    expect(screen.getByTestId('flow-status').props['aria-live']).toBe('polite');

    expect(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 })).toBeOnTheScreen();
    expect(screen.getByTestId('flow-alert')).toHaveTextContent('Your path stopped halfway');
    expect(screen.getByTestId('flow-alert').props['aria-live']).toBe('assertive');
    expect(announce.mock.calls.map(([m]) => m)).toEqual([
      'Reading your answers',
      'Looking at your accounts',
      'Picking your first lessons',
      'Your path stopped halfway',
    ]);
  } finally {
    announce.mockRestore();
    platform.restore();
  }
});

test('the hardware back button is swallowed during the flow', async () => {
  const add = jest.spyOn(BackHandler, 'addEventListener');
  backend({});
  await open();

  await screen.findByTestId('consent-accept');
  // The screen's listener registers on focus, after React Navigation's, and Android calls the newest first.
  const ours = add.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as () => boolean;
  let handled = false;
  await act(async () => {
    handled = ours();
  });
  expect(handled).toBe(true);
  expect(screen.getByTestId('categorizing-consent')).toBeOnTheScreen();
  add.mockRestore();
});

test('Retry after Continue without keeps sending no consent', async () => {
  let attempts = 0;
  backend({ post: () => (++attempts === 1 ? fail(503) : ok(categorization())) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));

  expect(await learnViaSummary()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: false }, { consent: false }]);
});

test('on web the live regions speak instead of the native announcement', async () => {
  const os = jest.replaceProperty(Platform, 'OS', 'web');
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  try {
    backend({ existing: () => fail(503) });
    await open();

    expect(await screen.findByTestId('categorizing-check-retry')).toBeOnTheScreen();
    expect(screen.getByTestId('flow-alert')).toHaveTextContent("Your learning path didn't load");
    expect(announce).not.toHaveBeenCalled();
  } finally {
    os.restore();
    announce.mockRestore();
  }
});

test('a request that never answers times out after 10 s into Retry', async () => {
  backend({ post: hang });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await act(() => jest.advanceTimersByTimeAsync(9_000));
  expect(screen.getByTestId('categorizing-loading')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(1_000));
  expect(screen.getByTestId('categorizing-retry')).toBeOnTheScreen();
});

test('a 400 offers only Skip for now, which goes to Learn', async () => {
  backend({ post: () => fail(400) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await screen.findByTestId('categorizing-error', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(screen.queryByTestId('categorizing-retry')).toBeNull();
  await fireEvent.press(screen.getByTestId('categorizing-skip'));

  expect(await learn()).toBeOnTheScreen();
});

test('with reduced motion the active station ring holds still', async () => {
  const reduced = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  backend({ post: hang });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(screen.getByTestId('step-ring')).toHaveStyle({ opacity: 0.5 });
  reduced.mockRestore();
});

test('restarting onboarding waits for the old profile and categorisation to be deleted, then asks again', async () => {
  let deleted = false;
  let finishDelete = () => {};
  backend({
    profile: (init) =>
      init?.method === 'DELETE'
        ? new Promise((done) => (finishDelete = () => ((deleted = true), done({ ok: true, status: 204 }))))
        : init?.method
          ? ok({})
          : ok(PROFILE),
    // The old categorisation exists until the reset's DELETE removes it.
    existing: () => (deleted ? fail(404) : ok({ userId: 'demo-user' })),
  });
  await renderRouter(routes, { initialUrl: '/profile' });
  const writes = () =>
    fetchMock.mock.calls
      .filter(([url, init]) => url.endsWith('/profile/onboarding') && init?.method)
      .map(([, init]) => init.method);
  const existenceChecks = () =>
    fetchMock.mock.calls.filter(([url, init]) => url.endsWith('/categorization') && !init?.method);

  await fireEvent.press(await screen.findByTestId('restart-onboarding'));
  await fireEvent.press(await screen.findByTestId('nav-learn'));
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await fireEvent.press(screen.getByTestId('onboarding-next'));
  await fireEvent.press(screen.getByTestId('onboarding-skip-all'));

  // While the slow DELETE runs, the PUT and the existence check both wait for it.
  expect(await screen.findByTestId('categorizing-checking')).toBeOnTheScreen();
  expect(writes()).toEqual(['DELETE']);
  expect(existenceChecks()).toHaveLength(0);

  await act(async () => finishDelete());
  expect(await screen.findByTestId('categorizing-consent')).toBeOnTheScreen();
  expect(writes()).toEqual(['DELETE', 'PUT']);
});

test('a profile write that never finishes still ends in Retry after 10 s', async () => {
  let release = () => {};
  backend({
    profile: (init) =>
      init?.method === 'DELETE'
        ? new Promise((done) => (release = () => done({ ok: true, status: 204 })))
        : init?.method
          ? ok({})
          : ok(PROFILE),
  });
  try {
    await renderRouter(routes, { initialUrl: '/profile' });
    await fireEvent.press(await screen.findByTestId('restart-onboarding'));
    await fireEvent.press(await screen.findByTestId('nav-learn'));
    await fireEvent.press(await screen.findByTestId('onboarding-start'));
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    await fireEvent.press(screen.getByTestId('onboarding-skip-all'));

    expect(await screen.findByTestId('categorizing-checking')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(10_000));
    expect(await screen.findByTestId('categorizing-check-retry')).toBeOnTheScreen();
  } finally {
    // The profile queue is module state: unblock it so later tests don't wait behind the stuck DELETE.
    await act(async () => release());
  }
});

// Last: unmounting by hand leaves the router's global state behind for later renders.
test('leaving mid-request aborts it and never navigates', async () => {
  backend({ post: hang });
  await open();
  const navigate = jest.spyOn(router, 'navigate');

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  screen.unmount();
  await act(() => jest.advanceTimersByTimeAsync(3_000));

  expect(posts()[0][1].signal.aborted).toBe(true);
  expect(navigate).not.toHaveBeenCalled();
  navigate.mockRestore();
});
