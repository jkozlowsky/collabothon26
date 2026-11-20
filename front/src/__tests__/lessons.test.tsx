import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import TabsLayout from '@/app/(tabs)/_layout';
import GlossaryScreen from '@/app/(tabs)/glossary';
import LearnScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profile';
import RootLayout from '@/app/_layout';
import LessonScreen from '@/app/lesson/[id]';
import OnboardingScreen from '@/app/onboarding';

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
  globalThis.fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          url.endsWith('/profile') ? { userId: 'demo-user', goals: [], confidence: {}, onboardingCompleted: true } : url.endsWith('/api/lessons') ? lessons : lesson,
        ),
    }),
  ) as jest.Mock;
});

test('walks from the lesson list through a quiz to the result', async () => {
  await renderRouter(
    {
      _layout: RootLayout,
      onboarding: OnboardingScreen,
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LearnScreen,
      '(tabs)/glossary': GlossaryScreen,
      '(tabs)/profile': ProfileScreen,
      'lesson/[id]': LessonScreen,
    },
    { initialUrl: '/' },
  );

  // The user already has a saved profile, so the app opens on Learn.
  await fireEvent.press(await screen.findByTestId('lesson-1'));
  expect(await screen.findByText('How many months?')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('option-1'));
  expect(screen.getByText('✅ Correct!')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('next'));
  expect(await screen.findByText('Lesson complete!')).toBeOnTheScreen();
  expect(screen.getByText(/1\/1 correct/)).toBeOnTheScreen();
});
