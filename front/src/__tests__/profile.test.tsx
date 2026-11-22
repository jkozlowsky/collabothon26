import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';

let fetchMock: jest.Mock;

const RESPONSES: [RegExp, unknown][] = [
  [/\/profile$/, { userId: 'demo-user', interests: ['seoul'], onboardingCompleted: true }],
  [/\/account$/, { userId: 'demo-user', firstName: 'Alex', lastName: 'Krause', avatar: 'm1' }],
  [
    /\/stats\?today=\d{4}-\d{2}-\d{2}$/,
    { currentStreak: 4, longestStreak: 12, doneToday: false, week: [true, true, false, false, false, false, false], totalXp: 120, lessonsCompleted: 2 },
  ],
];

beforeEach(() => {
  fetchMock = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(RESPONSES.find(([re]) => re.test(url))?.[1] ?? []),
    }),
  );
  globalThis.fetch = fetchMock;
});

test('profile shows the account and streak, and picking an avatar saves it', async () => {
  await renderRouter(appRoutes, { initialUrl: '/profile' });

  expect(await screen.findByTestId('profile-name')).toHaveTextContent('Alex Krause');
  expect(await screen.findByTestId('streak-value')).toHaveTextContent('4 days');
  expect(screen.getByTestId('total-xp')).toHaveTextContent('120 XP');
  expect(screen.getByTestId('streak-nudge')).toBeTruthy();
  expect(screen.queryByText('Your goals')).toBeNull();

  await fireEvent.press(screen.getByTestId('profile-avatar'));
  await fireEvent.press(await screen.findByTestId('avatar-f2'));

  const patch = fetchMock.mock.calls.find(([url, init]) => /\/account$/.test(url) && init?.method === 'PATCH');
  expect(JSON.parse(patch[1].body)).toEqual({ avatar: 'f2' });
});
