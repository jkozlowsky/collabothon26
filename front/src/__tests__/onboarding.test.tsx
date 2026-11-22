import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { seedAccount } from '@/lib/bank/seed';
import { factLabels, factsFrom } from '@/lib/categorization';
import { categorization } from '@/test-utils/categorization';
import { walkSurvey } from '@/test-utils/onboarding';
import { appRoutes as routes } from '@/test-utils/routes';

const PROFILE_URL = /\/api\/users\/demo-user\/profile$/;
const ONBOARDING_URL = /\/api\/users\/demo-user\/profile\/onboarding$/;
const CATEGORIZATION_URL = /\/api\/users\/demo-user\/categorization$/;
let fetchMock: jest.Mock;

const profile = (onboardingCompleted: boolean) => ({
  userId: 'demo-user',
  lifeStage: onboardingCompleted ? 'family' : null,
  interests: onboardingCompleted ? ['seoul'] : [],
  experience: onboardingCompleted ? 'occasional' : null,
  onboardingCompleted,
  onboardingSkipped: false,
  onboardingCompletedAt: null,
});

const story = (id: string, category: string, icon: string) => ({ id, category, topic: category, icon, status: 'available', lessons: [] });
const STORIES = [story('seoul', 'Hype & leverage', 'message-circle'), story('berlin', 'Inflation & savings', 'shield'), story('mumbai', 'Gold', 'database')];

/** Backend stub: the user's profile, no categorisation yet, an empty lesson list and question bank, and writes that succeed. */
function stubBackend({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const bodyFor = (url: string) => {
    if (PROFILE_URL.test(url)) return profile(onboardingCompleted);
    if (url.includes('/api/stories')) return STORIES;
    return CATEGORIZATION_URL.test(url) ? categorization() : [];
  };
  fetchMock = jest.fn((url: string, init?: RequestInit) => {
    if (CATEGORIZATION_URL.test(url) && !init?.method) {
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(bodyFor(url)) });
  });
  globalThis.fetch = fetchMock;
}

beforeEach(() => stubBackend({ onboardingCompleted: false }));

const get = (id: string) => screen.getByTestId(id);
const press = (id: string) => fireEvent.press(get(id));
const calls = (suffix: string) => fetchMock.mock.calls.filter(([url]) => url.endsWith(suffix));

/** After the survey the loading steps run (at least 2.4 s), then the summary leads to Learn. */
async function passSummary() {
  await fireEvent.press(await screen.findByTestId('summary-start', {}, { timeout: 4000 }));
  await screen.findByTestId('screen-learn');
}

function savedOnboarding() {
  const call = fetchMock.mock.calls.find(([url, init]) => ONBOARDING_URL.test(url) && init?.method === 'PUT');
  return call && JSON.parse(call[1].body);
}
const categorized = () =>
  fetchMock.mock.calls.filter(([url, init]) => CATEGORIZATION_URL.test(url) && init?.method === 'POST').map(([, init]) => JSON.parse(init.body));

/** The app opens on the bank; Atlas (and its onboarding) starts from the Learn button. */
async function openLearn() {
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId('nav-learn'));
}
test('app opens on the bank; the first Learn tap runs onboarding, and Close goes back to the bank and saves nothing', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();

  await press('nav-learn');
  expect(await screen.findByTestId('onboarding-welcome')).toBeOnTheScreen();
  expect(screen.getByText('Atlas lets your financial decisions land safely.')).toBeOnTheScreen();
  await press('onboarding-close');
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(savedOnboarding()).toBeUndefined();

  // Not saved, so the next Learn tap shows onboarding again; finishing it is the only way to Learn.
  await press('nav-learn');
  await walkSurvey();
  await press('check-start');
  await passSummary();
  expect(savedOnboarding()).toEqual({ interests: [], skipped: false });
});

test('a user whose profile says onboarding is completed goes from the bank straight to Learn', async () => {
  stubBackend({ onboardingCompleted: true });
  await renderRouter(routes, { initialUrl: '/' });
  // Let the profile request resolve before tapping Learn.
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await press('nav-learn');

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
});

test('Learn does nothing until the profile has loaded, so an onboarded user never gets onboarding again', async () => {
  let answer = () => {};
  const loadedLater = new Promise((resolve) => {
    answer = () => resolve({ ok: true, status: 200, json: () => Promise.resolve(profile(true)) });
  });
  const stub = fetchMock;
  fetchMock = jest.fn((url: string, init?: RequestInit) => (PROFILE_URL.test(url) ? loadedLater : stub(url, init)));
  globalThis.fetch = fetchMock;
  await renderRouter(routes, { initialUrl: '/' });

  await fireEvent.press(await screen.findByTestId('nav-learn'));
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
  expect(screen.getByTestId('screen-overview')).toBeOnTheScreen();

  await act(async () => answer());
  await press('nav-learn');
  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
  expect(categorized()).toHaveLength(0);
});

test('the consent screen lists what the account shows and the notice', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');

  expect(get('onboarding-consent')).toBeOnTheScreen();
  expect(screen.getByText('Your path starts from your account')).toBeOnTheScreen();
  expect(screen.getByText('Atlas reads a few summaries from your account to build your learning path. Learn needs them to work.')).toBeOnTheScreen();
  // The icons are glyphs, not words.
  const lines = (id: string) => within(get(id)).getAllByText(/\w/).map((line) => line.props.children);
  expect(lines('consent-facts')).toEqual(['Your account already shows', ...factLabels(factsFrom(seedAccount())), 'Age 26–40']);
  expect(screen.getByText('Only these summaries are shared, never your transactions.')).toBeOnTheScreen();
  expect(get('consent-notice')).toHaveTextContent(/the ranges you pick and ranges from your accounts are checked/);
  expect(get('consent-notice')).toHaveTextContent(/Your choices are checked by an AI service\./);
});

test('the consent screen offers only "Use my account data" and "Not now"; "Not now" leaves and saves nothing', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');

  const buttons = within(get('onboarding-consent')).getAllByRole('button').map((b) => b.props.testID);
  expect(buttons).toEqual(['onboarding-back', 'consent-accept', 'consent-not-now']);
  expect(get('consent-accept')).toHaveTextContent('Use my account data');
  expect(get('consent-not-now')).toHaveTextContent('Not now');

  await press('consent-not-now');
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(savedOnboarding()).toBeUndefined();
  expect(categorized()).toHaveLength(0);
});

test('one question follows the consent, then the quick check intro; the picked paths are saved as interests, in the order picked', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');
  await press('consent-accept');

  expect(get('onboarding-interests')).toBeOnTheScreen();
  expect(get('onboarding-continue')).toBeDisabled();
  await fireEvent.press(await screen.findByTestId('interest-mumbai'));
  await press('interest-seoul');
  await press('onboarding-continue');

  expect(get('onboarding-check-intro')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-hero', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText('QUICK CHECK · 3–6 QUESTIONS')).toBeOnTheScreen();
  expect(screen.getByText('About 2 minutes')).toBeOnTheScreen();
  expect(savedOnboarding()).toBeUndefined();

  await press('check-start');
  // The stub's question bank is empty, so the test is left out and the path is built with the account facts.
  await passSummary();
  expect(savedOnboarding()).toEqual({ interests: ['mumbai', 'seoul'], skipped: false });
  expect(categorized()).toEqual([{ consent: true, facts: factsFrom(seedAccount()) }]);
  expect(calls('/api/check-questions')).toHaveLength(1);
});

test('Skip after a failed request saves no interests and goes on to the quick check', async () => {
  const stub = fetchMock;
  fetchMock = jest.fn((url: string, init?: RequestInit) =>
    url.includes('/api/stories') ? Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' }) : stub(url, init),
  );
  globalThis.fetch = fetchMock;
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');
  await press('consent-accept');

  await fireEvent.press(await screen.findByTestId('interests-skip'));
  await press('check-start');
  await passSummary();
  expect(savedOnboarding()).toEqual({ interests: [], skipped: false });
});

// Last: it leaves the onboarding open, with Learn still waiting behind it.
test('the back button goes back one step, down to the consent screen', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  expect(get('onboarding-intro')).toBeOnTheScreen();
  await press('onboarding-back');
  expect(get('onboarding-welcome')).toBeOnTheScreen();

  await walkSurvey();
  for (const step of ['interests', 'consent']) {
    await press('onboarding-back');
    expect(get(`onboarding-${step}`)).toBeOnTheScreen();
  }
});
