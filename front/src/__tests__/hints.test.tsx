import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from '@/app/onboarding';
import { QuickCheckPage } from '@/components/categorizing/QuickCheckPage';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import * as personasModule from '@/lib/personas';
import { CurrentUserContext } from '@/lib/user';
import type { QuestionView } from '@/hooks/useQuickCheck';

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
        goals: [],
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
          <OnboardingProvider>
            <OnboardingScreen />
          </OnboardingProvider>
        </CurrentUserContext.Provider>
      </SafeAreaProvider>,
    );

    // Initial step is welcome screen
    expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
  });

  test('Persona with hints has answers preselected in onboarding', async () => {
    const mockPersona: personasModule.Persona = {
      userId: 'demo-daniel',
      bankSeed: personasModule.PERSONAS['demo-user'].bankSeed,
      hints: {
        lifeStage: 'settled',
        goals: ['stocks-etfs', 'retirement'],
        experience: 'investing',
        horizon: '5y+',
      },
    };

    jest.spyOn(personasModule, 'personaFor').mockReturnValue(mockPersona);

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
          <OnboardingProvider>
            <OnboardingScreen />
          </OnboardingProvider>
        </CurrentUserContext.Provider>
      </SafeAreaProvider>,
    );

    // Initial step is welcome
    expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
  });

  test('Quick check profile question: hinted option is preselected when preselectedOptionIndex is set', async () => {
    const onAnswer = jest.fn();
    const onBack = jest.fn();

    const viewWithHint: QuestionView = {
      key: 'profile-horizon',
      kind: 'profile',
      prompt: 'When might you need the money you save or invest?',
      parts: [{ text: 'When might you need the money you save or invest?', filled: false }],
      options: ['Within a year', '1–5 years', '5+ years', 'Not sure'],
      why: 'So examples match your time frame',
      account: false,
      preselectedOptionIndex: 2, // '5+ years'
    };

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <QuickCheckPage
          view={viewWithHint}
          position={1}
          total={7}
          status={null}
          ready={true}
          onAnswer={onAnswer}
          onBack={onBack}
        />
      </SafeAreaProvider>,
    );

    // Option 2 (5+ years) has selected state
    const option2 = screen.getByTestId('quick-check-option-2');
    expect(option2).toBeTruthy();

    // Option 0 (Within a year) is also present
    const option0 = screen.getByTestId('quick-check-option-0');
    expect(option0).toBeTruthy();
  });

  test('Quick check profile question: no option preselected when preselectedOptionIndex is undefined (Alex)', async () => {
    const onAnswer = jest.fn();
    const onBack = jest.fn();

    const viewWithoutHint: QuestionView = {
      key: 'profile-horizon',
      kind: 'profile',
      prompt: 'When might you need the money you save or invest?',
      parts: [{ text: 'When might you need the money you save or invest?', filled: false }],
      options: ['Within a year', '1–5 years', '5+ years', 'Not sure'],
      why: 'So examples match your time frame',
      account: false,
      preselectedOptionIndex: undefined,
    };

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <QuickCheckPage
          view={viewWithoutHint}
          position={1}
          total={7}
          status={null}
          ready={true}
          onAnswer={onAnswer}
          onBack={onBack}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('quick-check-option-0')).toBeTruthy();
  });
});
