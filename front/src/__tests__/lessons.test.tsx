import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { fillMetrics } from '@/lib/lessonMetrics';
import { formatEUR } from '@/lib/bank/money';
import { seedAccount } from '@/lib/bank/seed';
import { appRoutes } from '@/test-utils/routes';
import type { Lesson, LessonSummary } from '@/types/lessons';

jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

const summaries: LessonSummary[] = [
  { id: 'seoul-1', story: 'seoul', title: 'The chat that always knows', place: 'Yeouido', minutes: 4, xp: 50, status: 'available' },
  { id: 'seoul-2', story: 'seoul', title: 'Pulling everything in', place: 'Gangnam', minutes: 4, xp: 60, status: 'locked' },
];

function lesson(lang: 'standard' | 'plain'): Lesson {
  return {
    id: 'seoul-1',
    story: 'seoul',
    title: 'The chat that always knows',
    place: 'Yeouido',
    minutes: 4,
    xp: 50,
    concepts: ['drawdown'],
    lang,
    position: 1,
    total: 5,
    next: 'seoul-2',
    glossary: { drawdown: { term: 'Drawdown', definition: 'A fall from a previous high.' } },
    steps: [
      { type: 'text', id: 't1', title: 'Meet Ji-woo', body: 'Watch the [[drawdown]].' },
      {
        type: 'quiz',
        id: 'q1',
        prompt: lang === 'plain' ? 'A price fell by half. How much to get back?' : 'XYZ fell 50%. What rise gets it back?',
        options: ['+50%', '+100%'],
        correctIndex: 1,
        explanation: 'Half has to double.',
      },
      {
        type: 'sort',
        id: 'so1',
        buckets: ['Red flag', 'Information'],
        items: [
          { text: 'Guaranteed 2x', bucket: 0 },
          { text: 'Revenue went up', bucket: 1 },
        ],
      },
    ],
  };
}

let posted: { url: string; body: unknown } | undefined;

beforeEach(() => {
  // The canvas error above is logged by React; it is expected.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  posted = undefined;
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') posted = { url, body: JSON.parse(String(init.body)) };
    const body = url.endsWith('/profile')
      ? { userId: 'demo-user', goals: [], onboardingCompleted: true }
      : url.includes('/result')
        ? { xpAwarded: 50, firstCompletion: true, totalXp: 50, next: 'seoul-2' }
        : url.includes('/api/lessons?')
          ? summaries
          : lesson(url.includes('lang=plain') ? 'plain' : 'standard');
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  }) as jest.Mock;
});

test('plays a lesson: glossary sheet, plain toggle, a missed quiz comes back, sort, XP at the end', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  // Without GL (Jest) the globe is a static picture where Seoul is out of view, so its card opens
  // the story screen directly; that screen is a placeholder listing the backend lessons.
  await fireEvent.press(await screen.findByTestId('story-card-seoul'));

  // The user already has a saved profile, so the Learn tabs are open to them.
  expect(await screen.findByText('Finish the previous lesson first', { exact: false })).toBeOnTheScreen();
  await fireEvent.press(await screen.findByTestId('lesson-seoul-1'));

  // Text step: a [[concept]] opens its definition over the lesson.
  await fireEvent.press(await screen.findByTestId('concept-drawdown'));
  expect(await screen.findByText('A fall from a previous high.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('sheet-close'));
  await fireEvent.press(screen.getByTestId('continue'));

  // "Aa" swaps in the plain text and keeps the place in the lesson.
  expect(screen.getByText('XYZ fell 50%. What rise gets it back?')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('lesson-plain-toggle'));
  expect(await screen.findByText('A price fell by half. How much to get back?')).toBeOnTheScreen();

  // Wrong first try: explanation, then the step is queued again.
  await fireEvent.press(screen.getByTestId('option-0'));
  expect(screen.getByText('Not quite')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('continue'));

  // Sort with the buttons (the swipe's accessible twin).
  await fireEvent.press(await screen.findByTestId('sort-left'));
  expect(await screen.findByText('2 of 2')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('sort-right'));
  expect(await screen.findByText('Correct!')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('continue'));

  // The missed quiz comes back; now right.
  await fireEvent.press(await screen.findByTestId('option-1'));
  expect(screen.getByText('Correct!')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('continue'));

  expect(await screen.findByText('Lesson complete!')).toBeOnTheScreen();
  expect(await screen.findByText('+50 XP')).toBeOnTheScreen();
  expect(posted?.url).toContain('/api/lessons/seoul-1/result?userId=');
  expect(posted?.body).toEqual({
    steps: [
      { stepId: 'q1', correctFirstTry: false },
      { stepId: 'so1', correctFirstTry: true },
    ],
    scenarioChoices: {},
    lang: 'plain',
    completedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
  expect(screen.getByText('↻ Drawdown')).toBeOnTheScreen();
});

test('"Your turn" fills metrics from the mock bank, or falls back when one is unknown', () => {
  const state = seedAccount();
  const money = (cents: number) => formatEUR(cents, { whole: true });
  expect(fillMetrics('{largestPlaceShare} sits in {largestPlaceName}.', state, money)).toBe('53% sits in your savings account.');
  expect(fillMetrics('{noSuchMetric}', state, money)).toBeNull();
});
