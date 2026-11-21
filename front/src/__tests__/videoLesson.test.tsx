import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import type { Lesson, Scene } from '@/types/lessons';

jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

const scene = (id: string, title: string): Scene => ({
  type: 'scene',
  id,
  title,
  desc: `About ${title}`,
  duration: 10,
  camera: 'push',
  setting: { place: 'office', time: 'night' },
  layers: [
    { kind: 'character', pose: 'sit', x: 0.3 },
    { kind: 'amount', at: 1, len: 2, from: 10, to: 14, currency: 'KRW', label: 'Shares' },
    { kind: 'chart', at: 1, len: 3, series: [10, 14, 8.4], unit: '₩M' },
    { kind: 'tag', at: 2, text: '+40%', tone: 'good', x: 0.5, y: 0.5 },
    { kind: 'phone', messages: [{ from: 'Min-jun', text: 'Up 40%', at: 1 }] },
  ],
  captions: [
    { at: 0.5, text: `${title} one` },
    { at: 4, text: `${title} two` },
  ],
});

const lesson = (startMode: 'video' | 'classic'): Lesson => ({
  id: 'seoul-1',
  story: 'seoul',
  title: 'The chat that always knows',
  place: 'Yeouido',
  minutes: 4,
  xp: 50,
  concepts: ['drawdown'],
  position: 1,
  total: 5,
  next: 'seoul-2',
  glossary: { drawdown: { term: 'Drawdown', definition: 'A fall from a previous high.' } },
  steps: [
    { type: 'chat', id: 'c1', messages: [{ from: 'Min-jun', text: 'XYZ is up 40%' }] },
    { type: 'quiz', id: 'q1', prompt: 'First question?', options: ['Right', 'Wrong'], correctIndex: 0, explanation: 'Because.' },
    { type: 'quiz', id: 'q2', prompt: 'Second question?', options: ['Right', 'Wrong'], correctIndex: 0, explanation: 'Because.' },
  ],
  video: { minutes: 5, scenes: [scene('v1', 'The chat'), scene('v2', 'Two weeks'), scene('v3', 'Your numbers')], beats: ['v1', 'q1', 'v2', 'q2', 'v3'] },
  startMode,
  city: 'Seoul',
  color: 'violet',
  landmark: { kind: 'tower', at: 0.69 },
  audioBase: '/audio/',
});

const summary = {
  id: 'seoul-1', story: 'seoul', title: 'The chat that always knows', place: 'Yeouido', topic: null, minutes: 4, xp: 50,
  status: 'available', video: { minutes: 5 },
};

let startMode: 'video' | 'classic' = 'video';
let posted: unknown;
let modes: string[] = [];

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  posted = undefined;
  modes = [];
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') posted = JSON.parse(String(init.body));
    if (init?.method === 'PUT') modes.push(JSON.parse(String(init.body)).mode);
    const body = url.endsWith('/profile')
      ? { userId: 'demo-user', goals: [], onboardingCompleted: true }
      : url.includes('/result')
        ? { xpAwarded: 50, firstCompletion: true, totalXp: 50, next: 'seoul-2' }
        : url.includes('/api/lessons/seoul-1')
          ? lesson(startMode)
          : url.includes('/api/stories?')
            ? [{ id: 'seoul', city: 'Seoul', topic: 'Hype', color: 'violet', character: null, progress: { done: 0, total: 1 }, lessons: [summary] }]
            : url.includes('/api/lessons?')
              ? [summary]
              : [];
    return Promise.resolve({ ok: true, status: init?.method === 'PUT' ? 204 : 200, json: () => Promise.resolve(body) });
  }) as jest.Mock;
});

/** Globe → story (its stop shows the film icon) → Start lesson. */
async function openLesson() {
  await renderRouter(appRoutes, { initialUrl: '/map' });
  await fireEvent.press(await screen.findByTestId('story-card-seoul'));
  expect(await screen.findByTestId('lesson-video-seoul-1')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('lesson-seoul-1'));
}

async function answer(option: number) {
  await fireEvent.press(await screen.findByTestId(`option-${option}`));
  await fireEvent.press(screen.getByTestId('continue'));
}

test('video: a scene plays full screen, Skip swaps it for the step, a missed quiz comes back, then the end', async () => {
  startMode = 'video';
  await openLesson();

  expect(await screen.findByTestId('scene-player')).toBeOnTheScreen();
  expect(screen.getByText('Lesson 1')).toBeOnTheScreen();
  expect(screen.queryByText(/Seoul/)).toBeNull();
  await fireEvent.press(screen.getByTestId('scene-skip'));

  // The step takes the whole screen: no player above it.
  expect(await screen.findByText('First question?')).toBeOnTheScreen();
  expect(screen.queryByTestId('scene-player')).toBeNull();
  await answer(0);

  expect(await screen.findByLabelText(/^Scene: Two weeks/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('scene-skip'));
  await answer(1);
  expect(await screen.findByTestId('scene-player')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('scene-skip'));

  // The missed quiz again, after the last scene.
  expect(await screen.findByText('Second question?')).toBeOnTheScreen();
  expect(screen.queryByTestId('scene-player')).toBeNull();
  await answer(0);

  expect(await screen.findByText('Lesson complete!')).toBeOnTheScreen();
  expect(await screen.findByText('+50 XP')).toBeOnTheScreen();

  // Watch again plays the last scene full screen; Skip returns to the end screen.
  await fireEvent.press(screen.getByTestId('lesson-watch-again'));
  expect(await screen.findByTestId('scene-player')).toBeOnTheScreen();
  expect(screen.queryByTestId('lesson-transcript')).toBeNull();
  await fireEvent.press(screen.getByTestId('scene-skip'));
  expect(await screen.findByText('Lesson complete!')).toBeOnTheScreen();
  expect(posted).toEqual({
    steps: [
      { stepId: 'q1', correctFirstTry: true },
      { stepId: 'q2', correctFirstTry: false },
    ],
    scenarioChoices: {},
    mode: 'video',
    completedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  });
});

test('Transcript switches to classic at the right step, Watch switches back, each switch is remembered', async () => {
  startMode = 'video';
  await openLesson();
  await fireEvent.press(await screen.findByTestId('scene-skip'));
  await answer(0);
  // The second scene plays; Transcript opens its text form.
  expect(await screen.findByLabelText(/^Scene: Two weeks/)).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('lesson-transcript'));
  expect(await screen.findByText('Second question?')).toBeOnTheScreen();
  expect(screen.queryByTestId('scene-player')).toBeNull();
  expect(screen.getByTestId('lesson-watch')).toBeOnTheScreen();
  expect(modes).toEqual(['classic']);

  // Back to video: the scene right before the current step plays first.
  await fireEvent.press(screen.getByTestId('lesson-watch'));
  expect(await screen.findByTestId('scene-player')).toBeOnTheScreen();
  expect(modes).toEqual(['classic', 'video']);
});

test('a lesson with a video track opens in classic when that was the last mode, with Watch', async () => {
  startMode = 'classic';
  await openLesson();
  expect(await screen.findByText('XYZ is up 40%')).toBeOnTheScreen();
  expect(screen.getByTestId('lesson-watch')).toBeOnTheScreen();
  expect(screen.queryByTestId('scene-player')).toBeNull();
});
