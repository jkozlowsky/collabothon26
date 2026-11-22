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
  { id: 'seoul-1', story: 'seoul', title: 'The chat that always knows', place: 'Yeouido', topic: null, minutes: 4, xp: 50, status: 'available', video: null },
  { id: 'seoul-2', story: 'seoul', title: 'Pulling everything in', place: 'Gangnam', topic: null, minutes: 4, xp: 60, status: 'locked', video: null },
];

function lesson(): Lesson {
  return {
    id: 'seoul-1',
    story: 'seoul',
    title: 'The chat that always knows',
    place: 'Yeouido',
    minutes: 4,
    xp: 50,
    concepts: ['drawdown'],
    video: null,
    startMode: 'classic',
    city: 'Seoul',
    color: 'violet',
    landmark: { kind: 'tower', at: 0.69 },
    audioBase: '/audio/',
    position: 1,
    total: 5,
    next: 'seoul-2',
    glossary: { drawdown: { term: 'Drawdown', definition: 'A fall from a previous high.' } },
    steps: [
      { type: 'text', id: 't1', title: 'Meet Ji-woo', body: 'Watch the [[drawdown]].' },
      {
        type: 'quiz',
        id: 'q1',
        prompt: 'XYZ fell 50%. What rise gets it back?',
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
      ? { userId: 'demo-user', interests: [], onboardingCompleted: true }
      : url.includes('/result')
        ? { xpAwarded: 50, firstCompletion: true, totalXp: 50, next: 'seoul-2' }
        : url.includes('/api/lessons?')
          ? summaries
          : url.includes('/api/stories?')
            ? [{
              id: 'seoul', city: 'Seoul', topic: 'Hype and borrowed money', color: 'violet',
              character: { name: 'Ji-woo', age: 27, role: 'Office worker' },
              lessons: posted
                ? summaries.map((summary, index) => ({ ...summary, status: index === 0 ? 'done' : 'available' }))
                : summaries,
              progress: { done: posted ? 1 : 0, total: summaries.length },
            }]
            : lesson();
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  }) as jest.Mock;
});

test('plays a lesson: glossary sheet, a missed quiz comes back, sort, XP at the end', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  // Without GL (Jest) the globe is a static picture where Seoul is out of view, so its card opens
  // the story screen directly.
  await fireEvent.press(await screen.findByTestId('story-card-seoul'));

  // The user already has a saved profile, so the Learn tabs are open to them.
  expect(await screen.findByText(/0 of 2 missions/)).toBeOnTheScreen();
  expect(screen.queryByTestId('lesson-seoul-2')).toBeNull();
  await fireEvent.press(await screen.findByTestId('lesson-seoul-1'));

  // Text step: a [[concept]] opens its definition over the lesson.
  await fireEvent.press(await screen.findByTestId('concept-drawdown'));
  expect(await screen.findByText('A fall from a previous high.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('sheet-close'));
  await fireEvent.press(screen.getByTestId('continue'));

  expect(screen.getByText('XYZ fell 50%. What rise gets it back?')).toBeOnTheScreen();
  // No video track: no Watch button, and the plain-language toggle is gone.
  expect(screen.queryByTestId('lesson-watch')).toBeNull();
  expect(screen.queryByText('Aa')).toBeNull();

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
  // The XP counts up on the end screen.
  expect(await screen.findByText('+50 XP', {}, { timeout: 4000 })).toBeOnTheScreen();
  expect(posted?.url).toContain('/api/lessons/seoul-1/result?userId=');
  expect(posted?.body).toEqual({
    steps: [
      { stepId: 'q1', correctFirstTry: false },
      { stepId: 'so1', correctFirstTry: true },
    ],
    scenarioChoices: {},
    mode: 'classic',
    completedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
  expect(screen.getByText('↻ Drawdown')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('back-to-list'));
  expect(await screen.findByText(/1 of 2 missions/)).toBeOnTheScreen();
  expect(screen.getByTestId('lesson-seoul-2')).toBeOnTheScreen();
});

test('"Your turn" fills metrics from the mock bank, or falls back when one is unknown', () => {
  const state = seedAccount();
  const money = (cents: number) => formatEUR(cents, { whole: true });
  expect(fillMetrics('{largestPlaceShare} sits in {largestPlaceName}.', state, money)).toBe('53% sits in your savings account.');
  expect(fillMetrics('{noSuchMetric}', state, money)).toBeNull();
});
