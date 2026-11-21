import { renderRouter, screen } from 'expo-router/testing-library';

import { colors } from '@/constants/theme';
import { categorization } from '@/test-utils/categorization';
import { appRoutes } from '@/test-utils/routes';

// The globe is not under test here (Jest has no GL or flights).
jest.mock('@/components/globe/Globe', () => ({ Globe: () => null }));

// Tappable puts the card's style on the view inside the pressable that carries the testID.
const card = (id: string) => screen.getByTestId(id).children[0] as ReturnType<typeof screen.getByTestId>;
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

function backend(stored: unknown) {
  globalThis.fetch = jest.fn((url: string) => {
    if (url.endsWith('/categorization')) return stored ? ok(stored) : Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    if (url.endsWith('/profile')) return ok({ userId: 'demo-user', goals: [], onboardingCompleted: true });
    return ok([]);
  }) as jest.Mock;
}

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test('the startHere story is the highlighted one and the default current story is not', async () => {
  backend(categorization({ startHere: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }));
  await renderRouter(appRoutes, { initialUrl: '/map' });
  await screen.findByTestId('story-card-start-here');
  expect(card('story-card-berlin')).toHaveStyle({ backgroundColor: colors.brandAccentSoft });
  expect(card('story-card-seoul')).not.toHaveStyle({ backgroundColor: colors.brandAccentSoft });
});

test('without startHere main\'s current story stays highlighted', async () => {
  backend(null);
  await renderRouter(appRoutes, { initialUrl: '/map' });
  await screen.findByTestId('story-card-seoul');
  expect(card('story-card-seoul')).toHaveStyle({ backgroundColor: colors.brandAccentSoft });
  expect(screen.queryByTestId('story-card-start-here')).toBeNull();
});
