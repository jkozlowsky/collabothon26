import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';

jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

const lessons = [
  { id: 1, emoji: '🛟', title: 'Emergency fund', summary: 's', xp: 50, questionCount: 1 },
];
const lesson = {
  ...lessons[0],
  questions: [
    {
      id: 10,
      prompt: 'How many months?',
      options: ['1 month', '3–6 months'],
      correctIndex: 1,
      explanation: 'Because.',
    },
  ],
};

beforeEach(() => {
  // The canvas error above is logged by React; it is expected.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  globalThis.fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          url.endsWith('/profile') ? { userId: 'demo-user', goals: [] } : url.endsWith('/api/lessons') ? lessons : lesson,
        ),
    }),
  ) as jest.Mock;
});

test('walks from the lesson list through a quiz to the result', async () => {
  await renderRouter(appRoutes, { initialUrl: '/map' });

  // Without GL (Jest) the globe is a static picture where Seoul is out of view, so its card opens
  // the story screen directly; that screen is a placeholder listing the backend lessons.
  await fireEvent.press(await screen.findByTestId('story-card-seoul'));

  // The user already has a saved profile, so the Learn tabs are open to them.
  await fireEvent.press(await screen.findByTestId('lesson-1'));
  expect(await screen.findByText('How many months?')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('option-1'));
  expect(screen.getByText('✅ Correct!')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('next'));
  expect(await screen.findByText('Lesson complete!')).toBeOnTheScreen();
  expect(screen.getByText(/1\/1 correct/)).toBeOnTheScreen();
});
