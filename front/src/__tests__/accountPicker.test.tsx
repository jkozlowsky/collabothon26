import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AccountPicker } from '@/components/accounts/AccountPicker';
import { CurrentUserProvider } from '@/lib/user';
import type { DemoAccount } from '@/lib/session';

const MOCK_ACCOUNTS: DemoAccount[] = [
  { userId: 'demo-user', firstName: 'Alex', lastName: 'Krause', avatar: 'm1', status: 'free' },
  { userId: 'demo-daniel', firstName: 'Daniel', lastName: 'Okafor', avatar: 'm2', status: 'in-use' },
  { userId: 'demo-elena', firstName: 'Elena', lastName: 'Petrova', avatar: 'f1', status: 'mine' },
];

describe('AccountPicker', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders free, mine, and in-use cards with correct accessibility and testIDs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_ACCOUNTS,
    });

    render(
      <CurrentUserProvider>
        <AccountPicker />
      </CurrentUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Alex Krause')).toBeTruthy();
      expect(screen.getByText('Daniel Okafor')).toBeTruthy();
      expect(screen.getByText('Elena Petrova')).toBeTruthy();
    });

    // In-use badge
    expect(screen.getByTestId('account-demo-daniel-in-use')).toBeTruthy();

    // In-use card is disabled
    const inUseCard = screen.getByTestId('account-demo-daniel');
    expect(inUseCard.props.accessibilityState?.disabled).toBe(true);

    // Free and mine cards are enabled
    const freeCard = screen.getByTestId('account-demo-user');
    expect(freeCard.props.accessibilityState?.disabled).toBeFalsy();
  });

  test('tapping free card triggers session acquisition and enters the app', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_ACCOUNTS,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ userId: 'demo-user', ttlMs: 120000, heartbeatMs: 30000 }),
      });

    const onSelect = jest.fn();
    render(
      <CurrentUserProvider>
        <AccountPicker onSelect={onSelect} />
      </CurrentUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Alex Krause')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('account-demo-user'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('demo-user');
    });
  });

  test('in-use card is not pressable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_ACCOUNTS,
    });

    const onSelect = jest.fn();
    render(
      <CurrentUserProvider>
        <AccountPicker onSelect={onSelect} />
      </CurrentUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Daniel Okafor')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('account-demo-daniel'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('backend error displays error message and Retry button; clicking Retry reloads', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_ACCOUNTS,
      });

    render(
      <CurrentUserProvider>
        <AccountPicker />
      </CurrentUserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('account-picker-error')).toBeTruthy();
      expect(screen.getByTestId('account-picker-retry')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('account-picker-retry'));

    await waitFor(() => {
      expect(screen.getByText('Alex Krause')).toBeTruthy();
    });
  });
});
