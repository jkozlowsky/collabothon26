import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from '@/app/onboarding';
import { BankProvider } from '@/hooks/useBank';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import { CurrentUserContext } from '@/lib/user';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const story = (id: string, area: string | undefined, category: string, topic: string, icon: string, status = 'available') => ({
  id,
  city: id,
  area,
  category,
  topic,
  icon,
  status,
  lessons: [],
});
const STORIES = [
  story('seoul', 'Risk', 'Hype & leverage', 'Hype, scams and borrowed money', 'message-circle'),
  story('berlin', 'Saving', 'Inflation & savings', 'A safety net that keeps its value', 'shield'),
  story('paris', 'Taxes', 'Taxes', 'Coming later', 'file', 'coming-soon'),
  story('buenos-aires', 'Money basics', 'Fast inflation', 'When prices run away', 'trending-up'),
  story('nairobi', 'Saving', 'Small savings', 'Saving on the go', 'smartphone'),
  story('mumbai', undefined, 'Gold', 'Why gold glitters', 'database'),
];

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
let storiesAnswer: () => Promise<unknown>;

beforeEach(() => {
  storiesAnswer = () => ok(STORIES);
  globalThis.fetch = jest.fn((url: string) =>
    /\/api\/stories/.test(url) ? storiesAnswer() : ok({ userId: 'demo-user', lifeStage: null, interests: [], experience: null, onboardingCompleted: false }),
  ) as jest.Mock;
});
afterEach(() => jest.restoreAllMocks());

async function openInterests() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CurrentUserContext.Provider
        value={{
          userId: 'demo-user',
          isLoggedIn: true,
          isReady: true,
          deviceId: 'dev-123',
          conflictNotice: null,
          chooseUser: async () => {},
          logOut: async () => {},
          clearConflictNotice: () => {},
        }}
      >
        <BankProvider>
          <OnboardingProvider>
            <OnboardingScreen />
          </OnboardingProvider>
        </BankProvider>
      </CurrentUserContext.Provider>
    </SafeAreaProvider>,
  );
  for (const id of ['onboarding-start', 'onboarding-next', 'onboarding-challenge-next', 'consent-accept']) {
    await fireEvent.press(await screen.findByTestId(id));
  }
  await screen.findByTestId('onboarding-interests');
}

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

test('one chip per area in the order the backend returns them, a story without one by its category, then "Not sure yet"', async () => {
  await openInterests();
  expect(screen.getByText('What would you like to learn?')).toBeOnTheScreen();
  expect(screen.getByText("Pick every topic that is new to you. We'll build your path around them.")).toBeOnTheScreen();
  expect(await screen.findByTestId('interest-risk')).toBeOnTheScreen();
  const chips = within(screen.getByTestId('onboarding-interests')).getAllByRole('checkbox').map((t) => t.props.testID);
  // Berlin and Nairobi share "Saving", so they share a chip.
  expect(chips).toEqual(['interest-risk', 'interest-saving', 'interest-money-basics', 'interest-gold', 'interest-not-sure']);
  expect(screen.getByRole('checkbox', { name: 'Saving' })).toBeOnTheScreen();
  expect(screen.queryByText('Inflation & savings')).toBeNull();
  expect(screen.queryByText('A safety net that keeps its value')).toBeNull();
  expect(screen.queryByText('Taxes')).toBeNull();
});

test('the count shows the picked chips, not their stories, and not "Not sure yet"', async () => {
  await openInterests();
  await screen.findByTestId('interest-saving');
  expect(screen.queryByTestId('interests-count')).toBeNull();
  await press('interest-saving');
  expect(screen.getByTestId('interests-count')).toHaveTextContent('1 selected', { exact: false });
  await press('interest-gold');
  expect(screen.getByTestId('interests-count')).toHaveTextContent('2 selected', { exact: false });
  await press('interest-not-sure');
  expect(screen.queryByTestId('interests-count')).toBeNull();
});

test('a single question has no step header, only a back button', async () => {
  await openInterests();
  expect(screen.queryByText(/^Step \d/)).toBeNull();
  expect(screen.getByTestId('onboarding-back')).toBeOnTheScreen();
  await press('onboarding-back');
  expect(await screen.findByTestId('onboarding-consent')).toBeOnTheScreen();
});

test('Continue is disabled until something is picked; areas are multi-select', async () => {
  await openInterests();
  await screen.findByTestId('interest-risk');
  expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
  await press('interest-risk');
  await press('interest-gold');
  expect(screen.getByTestId('interest-risk')).toBeChecked();
  expect(screen.getByTestId('interest-gold')).toBeChecked();
  expect(screen.getByTestId('onboarding-continue')).toBeEnabled();
  await press('interest-risk');
  expect(screen.getByTestId('interest-risk')).not.toBeChecked();
  await press('interest-gold');
  expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
});

test('"Not sure yet" is exclusive: it clears the areas, and an area clears it', async () => {
  await openInterests();
  await screen.findByTestId('interest-risk');
  await press('interest-risk');
  await press('interest-saving');
  await press('interest-not-sure');
  expect(screen.getByTestId('interest-not-sure')).toBeChecked();
  expect(screen.getByTestId('interest-risk')).not.toBeChecked();
  expect(screen.getByTestId('interest-saving')).not.toBeChecked();
  expect(screen.getByTestId('onboarding-continue')).toBeEnabled();

  await press('interest-saving');
  expect(screen.getByTestId('interest-not-sure')).not.toBeChecked();
  expect(screen.getByTestId('interest-saving')).toBeChecked();
});

test('while the paths load there is a spinner and Continue stays off', async () => {
  storiesAnswer = () => new Promise(() => {});
  await openInterests();
  expect(screen.getByTestId('interests-loading')).toBeOnTheScreen();
  expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
});

test('a failed request offers Retry and Skip; Retry loads the chips, Skip moves on', async () => {
  storiesAnswer = () => Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
  await openInterests();
  expect(await screen.findByTestId('interests-retry')).toBeOnTheScreen();
  expect(screen.queryByTestId('interest-not-sure')).toBeNull();

  storiesAnswer = () => ok(STORIES);
  await press('interests-retry');
  expect(await screen.findByTestId('interest-risk')).toBeOnTheScreen();
  expect(screen.queryByTestId('interests-retry')).toBeNull();

  storiesAnswer = () => Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
  await press('onboarding-back');
  await press('consent-accept');
  await press('interests-skip');
  expect(await screen.findByTestId('onboarding-check-intro')).toBeOnTheScreen();
});
