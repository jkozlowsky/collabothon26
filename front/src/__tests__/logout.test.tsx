import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileButton } from '@/components/profile/ProfileButton';
import { AccountProvider } from '@/hooks/useAccount';
import { BankProvider, useBank } from '@/hooks/useBank';
import { currentSummary, setSummary } from '@/lib/learningPath';
import { personaFor } from '@/lib/personas';
import { CurrentUserContext, resetClientUserState } from '@/lib/user';

import { categorization } from '@/test-utils/categorization';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function BankStateViewer() {
  const { state } = useBank();
  return <Text testID="bank-owner">{state.owner.name}</Text>;
}

describe('Log out and switching accounts', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('tapping bank-avatar opens sheet with full name and bank-logout button; tapping logout triggers logOut', async () => {
    const logOutMock = jest.fn().mockResolvedValue(undefined);

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
            logOut: logOutMock,
            clearConflictNotice: () => {},
          }}
        >
          <BankProvider seed={personaFor('demo-user').bankSeed}>
            <AccountProvider>
              <ProfileButton />
            </AccountProvider>
          </BankProvider>
        </CurrentUserContext.Provider>
      </SafeAreaProvider>,
    );

    // Initial avatar is visible
    expect(screen.getByTestId('bank-avatar')).toBeTruthy();

    // Tap avatar to open sheet
    fireEvent.press(screen.getByTestId('bank-avatar'));

    await waitFor(() => {
      expect(screen.getByTestId('bank-logout')).toBeTruthy();
      expect(screen.getByTestId('bank-sheet-name')).toHaveTextContent('Alex Krause');
      expect(screen.getByText('Demo account')).toBeTruthy();
      expect(screen.getByText('Your progress stays saved on this account.')).toBeTruthy();
    });

    // Press logout
    fireEvent.press(screen.getByTestId('bank-logout'));

    await waitFor(() => {
      expect(logOutMock).toHaveBeenCalledTimes(1);
    });
  });

  test('switching account remounts the bank provider with the other persona seed and resets state', async () => {
    setSummary({
      categorization: categorization(),
    });

    expect(currentSummary()).not.toBeNull();

    // Call resetClientUserState
    resetClientUserState();

    // summary is cleared
    expect(currentSummary()).toBeNull();

    // Remount BankProvider under key="demo-user"
    const { rerender } = await render(
      <View key="demo-user">
        <BankProvider key="demo-user" seed={personaFor('demo-user').bankSeed}>
          <BankStateViewer />
        </BankProvider>
      </View>,
    );

    expect(screen.getByTestId('bank-owner')).toHaveTextContent('Alex Krause');

    await rerender(
      <View key="demo-daniel">
        <BankProvider key="demo-daniel" seed={personaFor('demo-daniel').bankSeed}>
          <BankStateViewer />
        </BankProvider>
      </View>,
    );

    // Remounted successfully under key with real Daniel seed
    expect(screen.getByTestId('bank-owner')).toHaveTextContent('Daniel Okafor');
  });
});
