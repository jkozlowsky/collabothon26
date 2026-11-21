import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import type { DuelCategory, MatchEnd, MatchSummary, Rankings } from '@/types/duel';

let matchApi: ((url: string, init?: RequestInit) => { status?: number; body?: unknown } | undefined) | null = null;

const YOU_CARD = { name: 'Alex', avatar: 'm1' as const, levels: { berlin: 3, seoul: 1 } };
const RIVAL_CARD = { name: 'Ola', avatar: 'f1' as const, levels: { berlin: 2, seoul: 2 } };

function question(index: number, prompt: string) {
  return {
    index,
    category: 'berlin',
    step: {
      type: 'quiz' as const,
      id: `q-${index}`,
      prompt,
      options: ['A', 'B', 'C', 'D'],
    },
    deadline: Date.now() + 30_000,
    timeLimitMs: 30_000,
  };
}

const CATEGORIES: DuelCategory[] = [
  {
    story: 'berlin',
    name: 'Inflation & savings',
    icon: 'shield',
    color: 'teal',
    xp: 120,
    level: 3,
    xpIntoLevel: 20,
    xpForLevel: 50,
  },
  {
    story: 'seoul',
    name: 'Hype & leverage',
    icon: 'message-circle',
    color: 'violet',
    xp: 40,
    level: 1,
    xpIntoLevel: 10,
    xpForLevel: 30,
  },
];

const RANKINGS_WEEKLY: Rankings = {
  top: [
    { rank: 1, userId: 'u1', name: 'Tomasz', avatar: 'm3', level: 6, weeklyXp: 310 },
    { rank: 2, userId: 'u2', name: 'Ola', avatar: 'f1', level: 5, weeklyXp: 265 },
    { rank: 3, userId: 'u3', name: 'Marta', avatar: 'f2', level: 4, weeklyXp: 220 },
  ],
  me: { rank: 6, userId: 'demo-user', name: 'Alex', avatar: 'm1', level: 3, weeklyXp: 125 },
};

const MATCHES: MatchSummary[] = [
  {
    matchId: 11,
    mode: 'HUMAN',
    categories: ['berlin'],
    rival: RIVAL_CARD,
    status: 'PLAYING',
    seen: false,
    score: 2,
    rivalScore: null,
    outcome: null,
    xpGained: 0,
    startedAt: new Date().toISOString(),
  },
  {
    matchId: 10,
    mode: 'HUMAN',
    categories: ['berlin', 'seoul'],
    rival: RIVAL_CARD,
    status: 'FINISHED',
    seen: true,
    score: 5,
    rivalScore: 4,
    outcome: 'WIN',
    xpGained: 25,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const ACCOUNT = { userId: 'demo-user', firstName: 'Alex', lastName: 'Weber', avatar: 'm1' };
const STATS = { currentStreak: 4, longestStreak: 9, doneToday: false, week: Array(7).fill(false), totalXp: 1240, lessonsCompleted: 7 };

beforeEach(() => {
  clearStoredActiveMatch();
  matchApi = null;

  globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
    const matched = matchApi?.(url, init);
    if (matched) {
      const status = matched.status ?? 200;
      return Promise.resolve({
        ok: status < 400,
        status,
        statusText: status < 400 ? 'OK' : 'Error',
        json: () => Promise.resolve(matched.body),
      });
    }
    let body: unknown = [];
    if (url.includes('/account')) body = ACCOUNT;
    else if (url.includes('/stats')) body = STATS;
    else if (url.includes('/profile')) body = { userId: 'demo-user', goals: [], onboardingCompleted: true };
    else if (url.includes('/api/duel/categories')) body = CATEGORIES;
    else if (url.includes('/api/duel/rankings')) body = RANKINGS_WEEKLY;
    else if (url.includes('/api/duel/matches')) body = MATCHES;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
  }) as jest.Mock;
});

afterEach(() => {
  jest.useRealTimers();
});

test('lobby renders categories with checkboxes, updates CTA count on toggle, and opens rankings', async () => {
  await renderRouter(appRoutes, { initialUrl: '/duel' });

  expect(await screen.findByText('Ready for a duel?')).toBeOnTheScreen();
  expect(await screen.findByText('Hi Alex · 1v1 Duels')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-streak-chip')).toHaveTextContent(/\b4$/);
  expect(screen.getByTestId('duel-xp-chip')).toHaveTextContent(/1 240 XP$/);
  expect(screen.getByTestId('duel-league-card')).toBeOnTheScreen();
  expect(await screen.findByText('Inflation & savings')).toBeOnTheScreen();
  expect(screen.getByText('Hype & leverage')).toBeOnTheScreen();

  // CTA has count 2 categories initially
  const cta = screen.getByTestId('duel-start-cta');
  expect(cta).toHaveTextContent('Find rival · 2 categories');

  // Untick one category
  await fireEvent.press(screen.getByTestId('duel-category-seoul'));
  expect(cta).toHaveTextContent('Find rival · 1 category');

  // Untick other category -> disabled
  await fireEvent.press(screen.getByTestId('duel-category-berlin'));
  expect(cta).toHaveTextContent('Select at least 1 category');

  // Open rankings
  await fireEvent.press(screen.getByTestId('duel-open-rankings'));
  expect(await screen.findByTestId('screen-duel-rankings')).toBeOnTheScreen();
  expect(await screen.findByTestId('rankings-list')).toBeOnTheScreen();
  expect(screen.getByTestId('rankings-pinned-me')).toBeOnTheScreen();
});

test('lobby Historia tab renders unfinished and finished matches', async () => {
  await renderRouter(appRoutes, { initialUrl: '/duel' });

  expect(await screen.findByTestId('duel-tab-history')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('duel-tab-history'));

  expect(await screen.findByTestId('duel-history-pending')).toBeOnTheScreen();
  expect(await screen.findByTestId('duel-history-finished')).toBeOnTheScreen();
  expect(screen.getByTestId('match-history-row-11')).toBeOnTheScreen();
  expect(screen.getByTestId('match-history-row-10')).toBeOnTheScreen();
});

test('match flow: answers question, sees feedback banner, waiting view, and result with review', async () => {
  jest.useFakeTimers();
  const matchResult: MatchEnd = {
    matchId: 42,
    mode: 'HUMAN',
    categories: ['berlin'],
    outcome: 'WIN',
    score: 5,
    rivalScore: 4,
    you: YOU_CARD,
    rival: RIVAL_CARD,
    xpGained: 25,
    xpByCategory: { berlin: 25 },
    review: [
      {
        index: 0,
        category: 'berlin',
        step: {
          type: 'quiz',
          id: 'q0',
          prompt: 'Co oznacza inflacja?',
          options: ['Wzrost cen', 'Spadek cen', 'Brak zmian', 'Podatek'],
          correctIndex: 0,
          explanation: 'Inflacja to powszechny wzrost cen towarów i usług.',
        },
        yourAnswer: { option: 1 },
        correct: false,
        lessonId: 'berlin-1',
        lessonTitle: 'Inflation & savings',
      },
      {
        index: 1,
        category: 'berlin',
        step: {
          type: 'quiz',
          id: 'q1',
          prompt: 'Pytanie 2?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          explanation: 'Wyjaśnienie 2',
        },
        yourAnswer: { option: 0 },
        correct: true,
        lessonId: 'berlin-1',
        lessonTitle: 'Inflation & savings',
      },
    ],
  };

  matchApi = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/api/duel/matches')) {
      return {
        body: {
          matchId: 42,
          mode: 'HUMAN',
          categories: ['berlin'],
          you: YOU_CARD,
          rival: RIVAL_CARD,
          questionCount: 6,
          question: question(0, 'Co oznacza inflacja?'),
        },
      };
    }
    if (init?.method === 'POST' && url.includes('/answers')) {
      return {
        body: {
          index: 0,
          correct: true,
          timedOut: false,
          nextQuestion: null,
          rivalProgress: { answered: 6, results: [true, true, true, true, false, null] },
          yourFinal: { score: 5, xpGained: 25 },
          finished: true,
        },
      };
    }
    if (url.includes('/api/duel/matches/42?')) {
      return { body: matchResult };
    }
    return undefined;
  };

  await renderRouter(appRoutes, {
    initialUrl: '/duel/match?categories=berlin&mode=HUMAN',
  });

  await act(async () => {
    jest.advanceTimersByTime(1500);
  });

  // Question view renders
  expect(await screen.findByTestId('duel-question')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-scoreboard')).toBeOnTheScreen();
  expect(screen.getByText('Co oznacza inflacja?')).toBeOnTheScreen();

  // Answer question
  await fireEvent.press(screen.getByTestId('duel-option-0'));

  // Feedback banner shown
  expect(await screen.findByTestId('feedback-banner')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-next-question')).toBeOnTheScreen();

  // Advance
  await fireEvent.press(screen.getByTestId('duel-next-question'));

  // Result view with review
  expect(await screen.findByTestId('duel-result')).toBeOnTheScreen();
  expect(screen.getByTestId('result-heading')).toHaveTextContent('You won!');
  expect(screen.getByTestId('result-score')).toHaveTextContent('5 : 4');
  expect(screen.getByTestId('result-xp')).toHaveTextContent(/25 XP/);

  // Review shows mistake first
  expect(screen.getByTestId('review-mistake-0')).toBeOnTheScreen();
  expect(screen.getByTestId('review-repeat-lesson-0')).toHaveTextContent(/Review lesson: Inflation & savings/);

  // Correct answer toggle
  expect(screen.getByTestId('toggle-correct-review')).toBeOnTheScreen();
});
