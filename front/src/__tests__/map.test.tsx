import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';

// No GL under Jest: make the canvas throw, so the globe takes its static-picture fallback.
jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.endsWith('/profile') ? { userId: 'demo-user', goals: [] } : []),
    }),
  ) as jest.Mock;
});

afterEach(() => jest.restoreAllMocks());

test('lists the stories, current first, and opens a story from its callout', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  expect(await screen.findByText('Where to next?')).toBeOnTheScreen();
  expect(screen.getByText('5 paths · 0 done')).toBeOnTheScreen();
  expect(screen.getByTestId('globe-pin-seoul')).toHaveProp('accessibilityLabel', 'Seoul, Hype & borrowed money, in progress');

  // A card does what its pin does: Berlin is on the fallback picture, so its callout opens.
  await fireEvent.press(screen.getByTestId('story-card-berlin'));
  const callout = await screen.findByTestId('pin-callout');
  expect(within(callout).getByText('What waiting costs')).toBeOnTheScreen();
  expect(within(callout).getByText('Lesson 1 of 3 · 4 min')).toBeOnTheScreen();

  await fireEvent.press(within(callout).getByTestId('pin-callout-open'));
  expect(await screen.findByText('Berlin: Safe, but not free')).toBeOnTheScreen();
});

test('a coming-soon story has a callout without a button', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  await fireEvent.press(await screen.findByTestId('globe-pin-nairobi'));
  const callout = await screen.findByTestId('pin-callout');
  expect(within(callout).getByText('Coming soon')).toBeOnTheScreen();
  expect(within(callout).queryByTestId('pin-callout-open')).toBeNull();
});
