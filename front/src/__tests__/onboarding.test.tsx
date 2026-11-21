import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { seedAccount } from '@/lib/bank/seed';
import { factLabels, factsFrom } from '@/lib/categorization';
import { categorization } from '@/test-utils/categorization';
import { walkSurvey, WITHOUT_ACCOUNT } from '@/test-utils/onboarding';
import { appRoutes as routes } from '@/test-utils/routes';

const PROFILE_URL = /\/api\/users\/demo-user\/profile$/;
const ONBOARDING_URL = /\/api\/users\/demo-user\/profile\/onboarding$/;
const CATEGORIZATION_URL = /\/api\/users\/demo-user\/categorization$/;
let fetchMock: jest.Mock;

const profile = (onboardingCompleted: boolean) => ({
  userId: 'demo-user',
  lifeStage: onboardingCompleted ? 'family' : null,
  goals: onboardingCompleted ? ['budget'] : [],
  experience: onboardingCompleted ? 'occasional' : null,
  onboardingCompleted,
  onboardingSkipped: false,
  onboardingCompletedAt: null,
});

/** Backend stub: the user's profile, no categorisation yet, an empty lesson list and question bank, and writes that succeed. */
function stubBackend({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const bodyFor = (url: string) => {
    if (PROFILE_URL.test(url)) return profile(onboardingCompleted);
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
/** Picks an answer and continues; "Continue" is off until the question is answered. */
async function choose(step: string, label: string, pick: string) {
  expect(get(`onboarding-${step}`)).toBeOnTheScreen();
  expect(screen.getByText(label)).toBeOnTheScreen();
  expect(get('onboarding-continue')).toBeDisabled();
  await press(pick);
  await press('onboarding-continue');
}

test('app opens on the bank; the first Learn tap runs onboarding, skipping the intro lands on Learn', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();

  await press('nav-learn');
  expect(await screen.findByTestId('onboarding-welcome')).toBeOnTheScreen();
  expect(screen.getByText('Learn how money works. Challenge your ideas with others.')).toBeOnTheScreen();
  await press('onboarding-start');
  await press('onboarding-skip-intro');
  await passSummary();

  expect(savedOnboarding()).toEqual({ goals: [], skipped: true });
  // Skipped before the consent screen and its AI notice: rules only.
  expect(categorized()).toEqual([{ consent: false, useRules: true }]);
  expect(calls('/api/check-questions')).toHaveLength(0);
});

test('skip on the first screen lands on Learn; close goes back to the bank and saves nothing', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-close'));
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(savedOnboarding()).toBeUndefined();

  // Not saved, so the next Learn tap shows onboarding again.
  await press('nav-learn');
  await fireEvent.press(await screen.findByTestId('onboarding-skip-intro'));
  await passSummary();
  expect(savedOnboarding()).toEqual({ goals: [], skipped: true });
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

test('the consent screen lists what the account shows, what is still asked and the notice', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');

  expect(get('onboarding-consent')).toBeOnTheScreen();
  expect(screen.getByText('Make it personal?')).toBeOnTheScreen();
  // The icons are glyphs, not words.
  const lines = (id: string) => within(get(id)).getAllByText(/\w/).map((line) => line.props.children);
  expect(lines('consent-facts')).toEqual(['Your account already shows', ...factLabels(factsFrom(seedAccount())), 'Age 26–40']);
  expect(lines('consent-asks')).toEqual(['We will still ask', 'What your savings are for', 'When you need the money', 'What you already know']);
  expect(screen.getByText('Only these summaries are shared, never your transactions.')).toBeOnTheScreen();
  expect(get('consent-notice')).toHaveTextContent(/how confident you said you feel/);
  expect(get('consent-notice')).toHaveTextContent(/Your choices are checked by an AI service\./);
  expect(get('consent-accept')).toHaveTextContent('Use my account data');
  expect(get('consent-decline')).toHaveTextContent('Continue without');
  expect(screen.queryByTestId('onboarding-skip')).toBeNull();
});

test('with account access three questions follow, then the quick check intro; the purpose is saved as goals', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');
  await press('consent-accept');

  await choose('purpose', 'Step 1 of 3', 'option-home');
  await choose('horizon', 'Step 2 of 3', 'option-1-5y');
  expect(get('onboarding-confidence')).toBeOnTheScreen();
  expect(screen.getByText('Step 3 of 3')).toBeOnTheScreen();
  expect(get('confidence-caption')).toHaveTextContent('Pick a number');
  expect(get('onboarding-continue')).toBeDisabled();
  await press('confidence-2');
  expect(get('confidence-caption')).toHaveTextContent('2 — “I know a bit, but I hesitate to act”');
  await press('onboarding-continue');

  expect(get('onboarding-check-intro')).toBeOnTheScreen();
  expect(screen.getByTestId('quick-check-hero', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText('QUICK CHECK · 3–6 QUESTIONS')).toBeOnTheScreen();
  expect(screen.getByText('About 2 minutes')).toBeOnTheScreen();
  expect(savedOnboarding()).toBeUndefined();

  await press('check-start');
  // The stub's question bank is empty, so the test is left out and the path is built with the account facts.
  await passSummary();
  expect(savedOnboarding()).toEqual({ goals: ['start-saving', 'inflation'], skipped: false });
  expect(categorized()).toEqual([{ consent: true, facts: factsFrom(seedAccount()) }]);
  expect(calls('/api/check-questions')).toHaveLength(1);
});

test('without account access the life stage, the experience and the savings cover are asked first', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await press('onboarding-next');
  await press('onboarding-challenge-next');
  await press('consent-decline');

  await choose('life-stage', 'Step 1 of 6', `option-${WITHOUT_ACCOUNT.lifeStage}`);
  await choose('experience', 'Step 2 of 6', `option-${WITHOUT_ACCOUNT.experience}`);
  await choose('savings-cover', 'Step 3 of 6', `option-${WITHOUT_ACCOUNT.savingsCover}`);
  await choose('purpose', 'Step 4 of 6', 'option-safety-net');
  await choose('horizon', 'Step 5 of 6', 'option-within-1y');
  await press('confidence-4');
  await press('onboarding-continue');
  await press('check-start');

  await passSummary();
  expect(savedOnboarding()).toEqual({ lifeStage: 'building', experience: 'regular', goals: ['emergency-fund'], skipped: false });
  expect(categorized()).toEqual([{ consent: false }]);
});

test.each([
  { name: '"Skip" in a question', skip: 'onboarding-skip', answered: 1 },
  { name: '"Skip for now" before the quick check', skip: 'check-skip', answered: 3 },
])('$name keeps the answers so far and builds the path without the quick check', async ({ skip, answered }) => {
  await openLearn();
  if (answered === 3) await walkSurvey({ purpose: 'retirement', horizon: 'not-sure' });
  else {
    await fireEvent.press(await screen.findByTestId('onboarding-start'));
    await press('onboarding-next');
    await press('onboarding-challenge-next');
    await press('consent-accept');
    await press('option-retirement');
    await press('onboarding-continue');
  }
  await press(skip);

  expect(await screen.findByTestId('summary-saving-for', {}, { timeout: 4000 })).toHaveTextContent('Saving for: Retirement');
  await passSummary();
  expect(savedOnboarding()).toEqual({ goals: ['retirement'], skipped: false });
  expect(categorized()).toEqual([{ consent: true, facts: factsFrom(seedAccount()) }]);
  expect(calls('/api/check-questions')).toHaveLength(0);
  expect(calls('/quick-check/step')).toHaveLength(0);
});

test('"Edit answers" keeps its three steps with the goals grid and saves them', async () => {
  stubBackend({ onboardingCompleted: true });
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/onboarding?edit=1'));

  expect(await screen.findByTestId('onboarding-life-stage')).toBeOnTheScreen();
  expect(screen.getByText('Step 1 of 3')).toBeOnTheScreen();
  await press('option-building');
  await press('onboarding-continue');

  expect(get('onboarding-goals')).toBeOnTheScreen();
  expect(screen.getByText('1 selected')).toBeOnTheScreen();
  await press('goal-scams');
  expect(screen.getByText('2 selected')).toBeOnTheScreen();
  await press('onboarding-continue');

  await press('option-not-saving');
  await fireEvent.press(screen.getByText('Finish'));
  expect(await screen.findByTestId('screen-overview')).toBeOnTheScreen();
  expect(savedOnboarding()).toEqual({ lifeStage: 'building', goals: ['budget', 'scams'], experience: 'not-saving', skipped: false });
  expect(categorized()).toHaveLength(0);
});

// Last: it leaves the onboarding open, with Learn still waiting behind it.
test('the back button goes back one step, and a changed consent changes the questions', async () => {
  await openLearn();
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  expect(get('onboarding-intro')).toBeOnTheScreen();
  await press('onboarding-back');
  expect(get('onboarding-welcome')).toBeOnTheScreen();

  await walkSurvey();
  for (const step of ['confidence', 'horizon', 'purpose', 'consent']) {
    await press('onboarding-back');
    expect(get(`onboarding-${step}`)).toBeOnTheScreen();
  }
  await press('consent-decline');
  expect(get('onboarding-life-stage')).toBeOnTheScreen();
  expect(screen.getByText('Step 1 of 6')).toBeOnTheScreen();
});
