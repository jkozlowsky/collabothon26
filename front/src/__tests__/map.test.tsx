import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import type { LessonSummary } from '@/types/lessons';

// No GL under Jest: make the canvas throw, so the globe takes its static-picture fallback.
jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

const lessons: LessonSummary[] = [
  { id: 'seoul-1', story: 'seoul', title: 'The chat that always knows', place: 'Yeouido', topic: null, minutes: 4, xp: 50, status: 'done' },
  { id: 'seoul-2', story: 'seoul', title: 'Pulling everything in', place: 'Gangnam', topic: null, minutes: 4, xp: 60, status: 'available' },
  { id: 'seoul-3', story: 'seoul', title: 'Spot the red flags', place: 'Hongdae', topic: null, minutes: 3, xp: 40, status: 'locked' },
];

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(url.endsWith('/profile') ? { userId: 'demo-user', goals: [], onboardingCompleted: true } : url.includes('/api/lessons?') ? lessons
        : url.includes('/api/stories?') ? [{
          id: 'seoul', city: 'Seoul', topic: 'Hype & borrowed money', color: 'violet',
          character: { name: 'Ji-woo', age: 27, role: 'Office worker' },
          lessons, progress: { done: 1, total: lessons.length },
        }] : []),
    }),
  ) as jest.Mock;
});

afterEach(() => jest.restoreAllMocks());

test('takes story progress from the backend lessons and opens the story with its lessons', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  expect(await screen.findByText('Where to next?')).toBeOnTheScreen();
  expect(screen.getByText('7 paths · 0 done')).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByTestId('globe-pin-seoul')).toHaveProp('accessibilityLabel', 'Seoul, Hype & borrowed money, in progress'),
  );

  // Seoul is off the fallback picture, so its card opens the story screen directly.
  await fireEvent.press(screen.getByTestId('story-card-seoul'));
  expect(await screen.findByTestId('screen-story')).toBeOnTheScreen();
  expect(await screen.findByText('Hype & borrowed money')).toBeOnTheScreen();
  expect(screen.getByText('1 of 3 stamps')).toBeOnTheScreen();
  expect(screen.getByTestId('lesson-seoul-2')).toBeOnTheScreen();
  expect(screen.getByText(/3 min · Locked/)).toBeOnTheScreen();
  expect(screen.queryByTestId('lesson-seoul-3')).toBeNull();
});

test('a coming-soon story has a callout without a button', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  await fireEvent.press(await screen.findByTestId('globe-pin-nairobi'));
  const callout = await screen.findByTestId('pin-callout');
  expect(within(callout).getByText('Coming soon')).toBeOnTheScreen();
  expect(within(callout).queryByTestId('pin-callout-open')).toBeNull();
});
