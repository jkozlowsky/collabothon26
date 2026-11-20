import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import TabsLayout from '@/app/(tabs)/_layout';
import GlossaryScreen from '@/app/(tabs)/glossary';
import LearnScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profile';
import RootLayout from '@/app/_layout';
import LessonScreen from '@/app/lesson/[id]';
import OnboardingScreen from '@/app/onboarding';

const routes = {
  _layout: RootLayout,
  onboarding: OnboardingScreen,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': LearnScreen,
  '(tabs)/glossary': GlossaryScreen,
  '(tabs)/profile': ProfileScreen,
  'lesson/[id]': LessonScreen,
};

const PROFILE_URL = /\/api\/users\/demo-user\/profile$/;
const ONBOARDING_URL = /\/api\/users\/demo-user\/profile\/onboarding$/;
let fetchMock: jest.Mock;

const profile = (onboardingCompleted: boolean) => ({
  userId: 'demo-user',
  lifeStage: null,
  goals: onboardingCompleted ? ['budget'] : [],
  experience: null,
  onboardingCompleted,
  onboardingSkipped: false,
  onboardingCompletedAt: null,
});

/** Backend stub: the user's profile, an empty lesson list, and an onboarding PUT that succeeds. */
function stubBackend({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  fetchMock = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(PROFILE_URL.test(url) ? profile(onboardingCompleted) : []),
    }),
  );
  globalThis.fetch = fetchMock;
}

beforeEach(() => stubBackend({ onboardingCompleted: false }));

function savedOnboarding() {
  const call = fetchMock.mock.calls.find(([url, init]) => ONBOARDING_URL.test(url) && init?.method === 'PUT');
  return call && JSON.parse(call[1].body);
}

test('app opens on onboarding; skipping the questions lands on Learn', async () => {
  await renderRouter(routes, { initialUrl: '/' });

  expect(await screen.findByTestId('onboarding-welcome')).toBeOnTheScreen();
  expect(screen.getByText('Finances with confidence — one lesson at a time')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('onboarding-start'));
  await fireEvent.press(screen.getByTestId('onboarding-next'));

  expect(await screen.findByTestId('onboarding-invite')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('onboarding-skip-all'));

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(savedOnboarding()).toEqual({ goals: [], skipped: true });
});

test('a user whose profile says onboarding is completed goes straight to Learn', async () => {
  stubBackend({ onboardingCompleted: true });
  await renderRouter(routes, { initialUrl: '/' });

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
});

test('answers all three questions', async () => {
  await renderRouter(routes, { initialUrl: '/' });

  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await fireEvent.press(screen.getByTestId('onboarding-next'));
  await fireEvent.press(screen.getByTestId('onboarding-personalise'));

  // Continue stays disabled until the question is answered.
  expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
  await fireEvent.press(screen.getByTestId('option-building'));
  await fireEvent.press(screen.getByTestId('onboarding-continue'));

  // No limit on how many topics you pick.
  for (const g of ['start-saving', 'emergency-fund', 'budget', 'stocks-etfs', 'scams'])
    await fireEvent.press(screen.getByTestId(`goal-${g}`));
  expect(screen.getByText('5 selected')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('onboarding-continue'));

  // The third question is the last one.
  expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
  await fireEvent.press(screen.getByTestId('option-not-saving'));
  await fireEvent.press(screen.getByText('Finish'));

  expect(await screen.findByTestId('screen-learn')).toBeOnTheScreen();
  expect(savedOnboarding()).toEqual({
    lifeStage: 'building',
    goals: ['start-saving', 'emergency-fund', 'budget', 'stocks-etfs', 'scams'],
    experience: 'not-saving',
    skipped: false,
  });
});

test('the back arrow returns from the intro slide to the welcome screen', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  expect(screen.getByTestId('onboarding-intro')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('onboarding-back'));
  expect(screen.getByTestId('onboarding-welcome')).toBeOnTheScreen();
});
