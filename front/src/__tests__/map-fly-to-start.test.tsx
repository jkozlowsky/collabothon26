import type { RefObject } from 'react';
import { renderRouter, screen } from 'expo-router/testing-library';

import { categorization } from '@/test-utils/categorization';
import { appRoutes } from '@/test-utils/routes';

const mockFlyTo = jest.fn();
jest.mock('@/components/globe/Globe', () => ({
  Globe: ({ ref }: { ref: RefObject<{ flyTo: (id: string, turnOnly?: boolean) => void } | null> }) => {
    ref.current = { flyTo: mockFlyTo };
    return null;
  },
}));

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

function backend(stored: unknown) {
  globalThis.fetch = jest.fn((url: string) => {
    if (url.endsWith('/categorization')) return stored ? ok(stored) : Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    if (url.endsWith('/profile')) return ok({ userId: 'demo-user', goals: [], onboardingCompleted: true });
    return ok([]);
  }) as jest.Mock;
}

beforeEach(() => mockFlyTo.mockClear());

test('the globe turns to the startHere story once it is known', async () => {
  backend(categorization({ startHere: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' } }));
  await renderRouter(appRoutes, { initialUrl: '/map' });
  await screen.findByTestId('story-card-start-here');
  expect(mockFlyTo).toHaveBeenCalledTimes(1);
  expect(mockFlyTo).toHaveBeenCalledWith('berlin', true);
});

test('without startHere the globe stays where it is', async () => {
  backend(null);
  await renderRouter(appRoutes, { initialUrl: '/map' });
  await screen.findByTestId('story-card-seoul');
  expect(mockFlyTo).not.toHaveBeenCalled();
});
