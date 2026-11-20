import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, BackHandler, Platform } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ApiError } from '@/lib/api';
import { factLabels, isRetryable } from '@/lib/categorization';
import { appRoutes as routes } from '@/test-utils/routes';
import type { Facts } from '@/types/categorization';

const TOM: Facts = {
  ageBand: '26-34',
  incomeBand: '3.5-5k',
  cashBufferMonths: '6+',
  savingsRate: '20%+',
  savesRegularly: false,
  overdraftMonths: 0,
  holdsInvestments: false,
  hasMortgage: false,
  hasInsurance: false,
};

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });
/** A request that only ends when its signal aborts. */
const hang = (init?: RequestInit) =>
  new Promise((_, reject) =>
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
  );

type Handler = (init?: RequestInit) => Promise<unknown>;
let fetchMock: jest.Mock;

/** A user with a saved profile and no categorisation yet, unless a handler says otherwise. */
function backend({
  facts = () => ok(TOM),
  post = () => ok({}),
  existing = () => fail(404),
  profile = (init?: RequestInit) => (init?.method ? ok({}) : ok({ userId: 'demo-user', goals: [] })),
}: Record<string, Handler>) {
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/facts')) return facts(init);
    if (url.endsWith('/categorization')) return init?.method === 'POST' ? post(init) : existing(init);
    if (url.endsWith('/profile')) return profile(init);
    return ok([]);
  });
  globalThis.fetch = fetchMock;
}

const posts = () => fetchMock.mock.calls.filter(([url, init]) => url.endsWith('/categorization') && init?.method === 'POST');
const bodies = () => posts().map(([, init]) => JSON.parse(init.body));
/** Loading holds for at least 2.4 s, longer than findBy's default wait. */
const learn = () => screen.findByTestId('screen-learn', {}, { timeout: 4000 });
/** Opens /categorizing over the bank once the saved profile has loaded, as a finished onboarding does. */
async function open() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/categorizing'));
}

test('facts read as plain summaries for every mock customer', () => {
  expect(factLabels(TOM)).toEqual([
    'Age group 26–34',
    '€3,500–5,000 income a month',
    'Over 6 months of spending covered',
    'Keeps 20% or more of income',
    'Never below zero',
    'No regular transfers to savings',
    'No investment products with us',
    'No mortgage or life insurance with us',
  ]);
  const lena = { ...TOM, ageBand: '18-25', incomeBand: '<1k', cashBufferMonths: '<1', savingsRate: 'negative', overdraftMonths: 2 } as const;
  expect(factLabels(lena)).toEqual(
    expect.arrayContaining(['Under €1,000 income a month', 'Spends more than comes in', 'Below zero in 2 of 3 months']),
  );
  const marco = { ...TOM, cashBufferMonths: '1-3', savingsRate: '0-10%', savesRegularly: true, hasMortgage: true } as const;
  expect(factLabels(marco).slice(5)).toEqual([
    'Moves money to savings most months',
    'No investment products with us',
    'Paying off a mortgage with us',
    'No life insurance with us',
  ]);
  const ingrid = { ...TOM, ageBand: '55-64', savesRegularly: true, holdsInvestments: true, hasInsurance: true } as const;
  expect(factLabels(ingrid).slice(6)).toEqual(['Investment products with us', 'No mortgage with us', 'Life insurance with us']);
  expect(factLabels({ ...TOM, incomeBand: '9k' as Facts['incomeBand'] })[1]).toBe('Income band 9k');
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
  expect(screen.getByText('8 summaries')).toBeOnTheScreen();

  expect(await learn()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: true }]);
});

test('Continue without sends no consent and skips the accounts step', async () => {
  backend({});
  await open();

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(screen.queryByText('Looking at your accounts')).toBeNull();
  expect(await learn()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: false }]);
});

test('no bank accounts: one Continue, sent without consent', async () => {
  backend({ facts: () => fail(404) });
  await open();

  expect(await screen.findByText('No account data to use')).toBeOnTheScreen();
  expect(screen.queryByTestId('consent-accept')).toBeNull();
  await fireEvent.press(screen.getByTestId('consent-continue'));

  expect(await learn()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: false }]);
});

test('an existing categorisation goes straight to Learn without asking again', async () => {
  backend({ existing: () => ok({ userId: 'demo-user' }) });
  await open();

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('categorizing-consent')).toBeNull();
  expect(posts()).toHaveLength(0);
});

test('a facts error other than 404 offers Retry instead of claiming there are no accounts', async () => {
  let attempts = 0;
  backend({ facts: () => (++attempts === 1 ? fail(503) : ok(TOM)) });
  await open();

  expect(await screen.findByTestId('consent-facts-retry')).toBeOnTheScreen();
  expect(screen.queryByText('No account data to use')).toBeNull();
  expect(screen.getByTestId('flow-alert')).toHaveTextContent("Your account summary didn't load");
  await fireEvent.press(screen.getByTestId('consent-facts-retry'));

  expect(await screen.findByTestId('consent-accept')).toBeOnTheScreen();
});

test('Continue without on the facts error sends no consent', async () => {
  backend({ facts: () => fail(503) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  expect(await learn()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: false }]);
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

test('an existing categorisation wins even when the facts fail', async () => {
  backend({ existing: () => ok({ userId: 'demo-user' }), facts: () => fail(503) });
  await open();

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(posts()).toHaveLength(0);
});

test('facts that never arrive show a spinner, then time out after 10 s into Retry', async () => {
  backend({ facts: hang });
  await open();

  expect(await screen.findByLabelText('Loading your account summary')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(screen.getByTestId('consent-facts-retry')).toBeOnTheScreen();
});

test('a transient 404 after the profile has settled is retried before it becomes an error', async () => {
  let attempts = 0;
  backend({ post: () => (++attempts < 3 ? fail(404) : ok({})) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await learn()).toBeOnTheScreen();
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
  backend({ post: () => (++attempts === 1 ? Promise.reject(new TypeError('Network request failed')) : ok({})) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-accept'));
  expect(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('categorizing-retry'));

  expect(await learn()).toBeOnTheScreen();
  expect(bodies()).toEqual([{ consent: true }, { consent: true }]);
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
  backend({ post: () => (++attempts === 1 ? fail(503) : ok({})) });
  await open();

  await fireEvent.press(await screen.findByTestId('consent-decline'));
  await fireEvent.press(await screen.findByTestId('categorizing-retry', {}, { timeout: 4000 }));

  expect(await learn()).toBeOnTheScreen();
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
