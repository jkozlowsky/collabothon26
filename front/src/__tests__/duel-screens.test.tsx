import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import type { DuelCategory, MatchEnd, Rankings } from '@/types/duel';

/** Test hook: answers the match endpoints (start, answers, state, result); anything else gets the defaults below. */
let matchApi: ((url: string, init?: RequestInit) => { status?: number; body?: unknown } | undefined) | null = null;

const YOU_CARD = { name: 'Alex', level: 4, elo: 1000, avatar: 'm1' as const, isBot: false };

function question(index: number, prompt: string) {
  return { index, prompt, options: ['A', 'B', 'C', 'D'], deadline: Date.now() + 30_000 };
}

const CATEGORIES: DuelCategory[] = [
  {
    slug: 'instruments',
    name: 'Instruments',
    icon: 'trend',
    xp: 240,
    level: 12,
    xpIntoLevel: 30,
    xpForLevel: 50,
    elo: 1156,
    humanMatches: 8,
    calibrated: true,
  },
  {
    slug: 'costs',
    name: 'Costs & taxes',
    icon: 'percent',
    xp: 60,
    level: 4,
    xpIntoLevel: 12,
    xpForLevel: 30,
    elo: 1000,
    humanMatches: 3,
    calibrated: false,
  },
];

const RANKINGS_WEEKLY: Rankings = {
  top: [
    { rank: 1, userId: 'u1', name: 'Tomasz', avatar: 'm3', level: 30, elo: 1380, value: 142 },
    { rank: 2, userId: 'u2', name: 'Ola', avatar: 'f1', level: 22, elo: 1280, value: 128 },
    { rank: 3, userId: 'u3', name: 'Marta', avatar: 'f2', level: 19, elo: 1210, value: 97 },
    { rank: 4, userId: 'u4', name: 'Jonas', avatar: 'm2', level: 31, elo: 1342, value: 88 },
  ],
  me: { rank: 17, userId: 'demo-user', name: 'Alex', avatar: 'f3', level: 12, elo: 1084, value: 46 },
};

const ACCOUNT = { userId: 'demo-user', firstName: 'Alex', lastName: 'Weber', avatar: 'f2' };
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

test('lobby renders categories with Elo and Calibrating n/5 and opens rankings', async () => {
  await renderRouter(appRoutes, { initialUrl: '/duel' });

  expect(await screen.findByText('Ready to duel?')).toBeOnTheScreen();
  // Header comes from the account and learning stats, not from duel data.
  expect(await screen.findByText('Hi Alex · 1v1 knowledge duels')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-streak-chip')).toHaveTextContent(/\b4$/);
  expect(screen.getByTestId('duel-xp-chip')).toHaveTextContent(/1 240 XP$/);
  expect(within(screen.getByTestId('duel-league-card')).getByTestId('player-avatar-f2')).toBeOnTheScreen();
  expect(await screen.findByText('Instruments')).toBeOnTheScreen();
  expect(screen.getByText('1 156')).toBeOnTheScreen();
  expect(screen.getByText('3/5')).toBeOnTheScreen();
  expect(screen.getByText('Calibrating')).toBeOnTheScreen();
  expect(screen.getByText("You're #17 this week")).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('duel-open-rankings'));
  expect(await screen.findByTestId('screen-duel-rankings')).toBeOnTheScreen();
  expect(await screen.findByTestId('rankings-podium')).toBeOnTheScreen();
  expect(screen.getByTestId('rankings-pinned-me')).toBeOnTheScreen();
  // Ranking rows show each player's account avatar.
  expect(within(screen.getByTestId('rankings-podium')).getByTestId('player-avatar-m3')).toBeOnTheScreen();
  expect(within(screen.getByTestId('rankings-list')).getByTestId('player-avatar-m2')).toBeOnTheScreen();
});

const BOT = { name: 'Bella the Bot', level: 11, elo: null, avatar: 'm1' as const, isBot: true };

test('vs bot: scoreboard, waiting and result show your account avatar and the bot tile for the rival', async () => {
  jest.useFakeTimers();
  let finished = false;
  const end: MatchEnd = {
    matchId: 5,
    mode: 'BOT',
    category: 'risk',
    outcome: 'WIN',
    score: 4,
    rivalScore: 3,
    rival: BOT,
    xpGained: 32,
    levelBefore: 4,
    levelAfter: 5,
    xpIntoLevel: 2,
    xpForLevel: 40,
    eloBefore: null,
    eloAfter: null,
    review: [],
  };
  matchApi = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/api/duel/matches')) {
      return {
        body: {
          matchId: 5,
          mode: 'BOT',
          category: 'risk',
          you: YOU_CARD,
          rival: BOT,
          questionCount: 6,
          question: question(0, 'What spreads risk?'),
        },
      };
    }
    if (init?.method === 'POST' && url.endsWith('/matches/5/answers')) {
      return {
        body: {
          index: 0,
          correct: true,
          timedOut: false,
          nextQuestion: null,
          rivalProgress: { answered: 2, results: [true, false, null, null, null, null], connected: true },
          finished: false,
        },
      };
    }
    if (url.includes('/matches/5/state')) {
      return {
        body: {
          matchId: 5,
          mode: 'BOT',
          category: 'risk',
          you: YOU_CARD,
          rival: BOT,
          questionCount: 6,
          yourResults: [true, null, null, null, null, null],
          question: null,
          rivalProgress: { answered: finished ? 6 : 3, results: [true, false, true, null, null, null], connected: true },
          finished,
        },
      };
    }
    if (url.includes('/matches/5?')) return { body: end };
    return undefined;
  };

  await renderRouter(appRoutes, { initialUrl: '/duel/match?category=risk&mode=BOT' });

  const board = await screen.findByTestId('duel-scoreboard');
  expect(within(board).getByTestId('player-avatar-f2')).toBeOnTheScreen();
  expect(within(board).getByTestId('player-avatar-bot')).toBeOnTheScreen();
  expect(screen.getByTestId('rival-bot-chip')).toBeOnTheScreen();

  // The last answer leaves the player waiting for the simulated rival.
  await fireEvent.press(screen.getByTestId('duel-option-1'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(await screen.findByTestId('duel-waiting')).toBeOnTheScreen();
  expect(within(screen.getByTestId('waiting-rival-card')).getByText('Bot')).toBeOnTheScreen();

  // The poll sees the match settled and loads the result.
  finished = true;
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  expect(await screen.findByTestId('duel-result')).toBeOnTheScreen();
  expect(screen.getByTestId('result-heading')).toHaveTextContent('You won, Alex');
  const hero = screen.getByTestId('result-hero-card');
  expect(within(hero).getByTestId('player-avatar-f2')).toBeOnTheScreen();
  expect(within(hero).getByTestId('player-avatar-bot')).toBeOnTheScreen();
  expect(screen.queryByTestId('result-elo-card')).toBeNull();
  expect(screen.getByTestId('result-level-card')).toHaveTextContent(/4.*5/);
});

test('human match: shows Finding a rival, then the mocked human, then the Elo change', async () => {
  jest.useFakeTimers();
  const human = { name: 'Marek', level: 15, elo: 1120, avatar: 'm2' as const, isBot: false };
  matchApi = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/api/duel/matches')) {
      return {
        body: {
          matchId: 9,
          mode: 'HUMAN',
          category: 'risk',
          you: YOU_CARD,
          rival: human,
          questionCount: 6,
          question: question(0, 'Pick one'),
        },
      };
    }
    return undefined;
  };

  await renderRouter(appRoutes, { initialUrl: '/duel/match?category=risk&mode=HUMAN' });
  expect(await screen.findByTestId('duel-matchmaking')).toBeOnTheScreen();
  expect(screen.getByText('Finding a rival…')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  expect(await screen.findByText('Pick one')).toBeOnTheScreen();
  expect(screen.getByText('Marek')).toBeOnTheScreen();
});

test('solo: feedback, a question that ran out, and the result without rival UI', async () => {
  jest.useFakeTimers();
  let settled = false;
  const soloEnd: MatchEnd = {
    matchId: 77,
    mode: 'SOLO',
    category: 'instruments',
    outcome: 'SOLO',
    score: 5,
    rivalScore: null,
    rival: null,
    xpGained: 40,
    levelBefore: 12,
    levelAfter: 12,
    xpIntoLevel: 40,
    xpForLevel: 50,
    eloBefore: null,
    eloAfter: null,
    review: [
      {
        prompt: 'What is an ETF?',
        options: ['A loan', 'An exchange-traded fund', 'A tax', 'A bank fee'],
        yourOption: 0,
        correctOption: 1,
        explanation: 'An ETF trades on an exchange and tracks a basket of assets.',
      },
    ],
  };
  matchApi = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/api/duel/matches')) {
      return {
        body: {
          matchId: 77,
          mode: 'SOLO',
          category: 'instruments',
          you: YOU_CARD,
          rival: null,
          questionCount: 6,
          question: question(0, 'What is an ETF?'),
        },
      };
    }
    if (init?.method === 'POST' && url.endsWith('/matches/77/answers')) {
      return {
        body: {
          index: 0,
          correct: false,
          timedOut: false,
          nextQuestion: question(1, 'Second question?'),
          rivalProgress: null,
          finished: false,
        },
      };
    }
    if (url.includes('/matches/77/state')) {
      // Until `settled`, the poll agrees with the screen (question 2 is open).
      return {
        body: {
          matchId: 77,
          mode: 'SOLO',
          category: 'instruments',
          you: YOU_CARD,
          rival: null,
          questionCount: 6,
          yourResults: settled ? [false, false, false, false, false, false] : [false, null, null, null, null, null],
          question: settled ? null : question(1, 'Second question?'),
          rivalProgress: null,
          finished: settled,
        },
      };
    }
    if (url.includes('/matches/77?')) return { body: soloEnd };
    return undefined;
  };

  await renderRouter(appRoutes, { initialUrl: '/duel/match?category=instruments&mode=SOLO' });

  expect(await screen.findByTestId('duel-question')).toBeOnTheScreen();
  expect(screen.queryByTestId('duel-scoreboard')).toBeNull();
  expect(screen.getByTestId('solo-progress-strip')).toBeOnTheScreen();

  // The answer request carries the user, the question index and the option the player saw.
  await fireEvent.press(screen.getByTestId('duel-option-0'));
  const fetchMock = globalThis.fetch as jest.Mock;
  const answerCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/matches/77/answers'));
  expect(JSON.parse(answerCall[1].body)).toEqual({ userId: 'demo-user', index: 0, option: 0 });

  await act(async () => {});
  expect(screen.getByTestId('duel-feedback')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-next-question')).toBeOnTheScreen();

  // Auto-advance after 3 s promotes the buffered second question.
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(screen.getByText('Second question?')).toBeOnTheScreen();

  // The next poll says the match is settled: the result screen replaces the question.
  settled = true;
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(await screen.findByTestId('duel-result')).toBeOnTheScreen();
  expect(screen.getByTestId('result-solo-card')).toBeOnTheScreen();
  expect(screen.queryByTestId('result-hero-card')).toBeNull();
  expect(screen.getByTestId('review-mistake-1')).toBeOnTheScreen();
});

test('reloading mid-match restores matchId from sessionStorage and resumes from the state endpoint', async () => {
  const store = new Map<string, string>();
  const origWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      ...(origWindow ?? {}),
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    },
  });

  try {
    store.set(
      'fq_duel_active_match:demo-user',
      JSON.stringify({
        matchId: 88,
        category: 'money-basics',
        mode: 'SOLO',
        yourDots: ['wrong', null, null, null, null, null],
      }),
    );
    matchApi = (url) =>
      url.includes('/matches/88/state')
        ? {
            body: {
              matchId: 88,
              mode: 'SOLO',
              category: 'money-basics',
              you: { name: 'Alex', level: 3, elo: 1006, avatar: 'm1', isBot: false },
              rival: null,
              questionCount: 6,
              yourResults: [false, false, null, null, null, null],
              question: question(2, 'Third question after reload?'),
              rivalProgress: null,
              finished: false,
            },
          }
        : undefined;

    await renderRouter(appRoutes, { initialUrl: '/duel/match?category=money-basics&mode=SOLO' });

    expect(await screen.findByText('Third question after reload?')).toBeOnTheScreen();
    expect(screen.getByTestId('reconnected-banner')).toBeOnTheScreen();
    expect(screen.getByText(/question 2 ran out/i)).toBeOnTheScreen();
    expect(screen.getByTestId('timeout-legend')).toBeOnTheScreen();
    const fetchMock = globalThis.fetch as jest.Mock;
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/api/duel/matches'))).toBe(false);
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: origWindow });
  }
});

test('the match screen sends a user who has not finished onboarding to onboarding without starting a match', async () => {
  const fetchMock = globalThis.fetch as jest.Mock;
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) =>
    url.includes('/profile') && !init?.method
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ userId: 'demo-user', goals: [], onboardingCompleted: false }) })
      : fetchMock(url, init),
  ) as jest.Mock;

  // Learn tabs (the duel lobby too) are off-limits before onboarding, so a deep link straight into a match.
  await renderRouter(appRoutes, { initialUrl: '/' });
  await screen.findByTestId('screen-overview');
  await act(async () => {});
  await act(async () => router.push('/duel/match?category=instruments&mode=SOLO'));

  expect(await screen.findByTestId('onboarding-welcome')).toBeOnTheScreen();
  expect(screen.queryByTestId('duel-matchmaking')).toBeNull();
  const calls = (globalThis.fetch as jest.Mock).mock.calls;
  expect(calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/api/duel/matches'))).toBe(false);
});

test('a failed request shows the error state; retry starts again and back to lobby leaves', async () => {
  let fail = true;
  matchApi = (url, init) => {
    if (init?.method === 'POST' && url.endsWith('/api/duel/matches')) {
      if (fail) return { status: 500, body: {} };
      return {
        body: {
          matchId: 3,
          mode: 'BOT',
          category: 'risk',
          you: YOU_CARD,
          rival: BOT,
          questionCount: 6,
          question: question(0, 'Back in the game?'),
        },
      };
    }
    return undefined;
  };
  await renderRouter(appRoutes, { initialUrl: '/duel/match?category=risk&mode=BOT' });

  expect(await screen.findByTestId('duel-error')).toBeOnTheScreen();
  expect(screen.queryByText(/reconnecting/i)).toBeNull();
  fail = false;
  await fireEvent.press(screen.getByTestId('duel-error-retry'));
  expect(await screen.findByText('Back in the game?')).toBeOnTheScreen();
});

test('rankings show an empty state and the unranked note when nobody is ranked', async () => {
  const fetchMock = globalThis.fetch as jest.Mock;
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) =>
    url.includes('/api/duel/rankings')
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ top: [], me: null }) })
      : fetchMock(url, init),
  ) as jest.Mock;

  await renderRouter(appRoutes, { initialUrl: '/duel/rankings?scope=overall' });
  expect(await screen.findByTestId('rankings-empty')).toBeOnTheScreen();
  expect(screen.getByTestId('rankings-unranked-me')).toBeOnTheScreen();
});
