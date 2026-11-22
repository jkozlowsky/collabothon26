import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from '@/app/onboarding';
import { BankProvider } from '@/hooks/useBank';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import * as personasModule from '@/lib/personas';
import { CurrentUserContext } from '@/lib/user';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('Onboarding and Quick check hints', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        userId: 'demo-user',
        lifeStage: null,
        interests: [],
        experience: null,
        onboardingCompleted: false,
      }),
    });
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Alex (demo-user): no hints in persona, nothing preselected in onboarding', async () => {
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

    // Initial step is welcome screen
    expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
  });

  test('Persona with hints has its interests preselected; an id with no tile is ignored', async () => {
    const mockPersona: personasModule.Persona = {
      userId: 'demo-daniel',
      bankSeed: personasModule.PERSONAS['demo-daniel'].bankSeed,
      hints: { interests: ['seoul', 'mumbai', 'gone'] },
    };

    jest.spyOn(personasModule, 'personaFor').mockReturnValue(mockPersona);
    const profile = await fetchMock();
    const story = (id: string) => ({ id, category: id, topic: id, icon: 'shield', status: 'available' });
    fetchMock.mockImplementation((url: string) =>
      url.includes('/api/stories')
        ? Promise.resolve({ ok: true, status: 200, json: async () => ['seoul', 'berlin', 'mumbai'].map(story) })
        : Promise.resolve(profile),
    );

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <CurrentUserContext.Provider
          value={{
            userId: 'demo-daniel',
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
    expect(await screen.findByTestId('interest-seoul')).toBeChecked();
    expect(screen.getByTestId('interest-mumbai')).toBeChecked();
    expect(screen.getByTestId('interest-berlin')).not.toBeChecked();
    expect(screen.queryByTestId('interest-gone')).toBeNull();
    expect(screen.getByTestId('onboarding-continue')).toBeEnabled();
  });
});
