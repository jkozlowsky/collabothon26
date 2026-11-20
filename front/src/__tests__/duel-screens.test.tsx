import type { IMessage, StompConfig } from '@stomp/stompjs';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import { DUEL_SUBSCRIBE_DESTINATION } from '@/lib/duel/socket';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import type { DuelCategory, MatchEnd, Rankings, ServerMessage } from '@/types/duel';

type PublishedFrame = {
  destination: string;
  body?: string;
  headers?: Record<string, string>;
};

type ActiveSub = {
  destination: string;
  callback: (message: IMessage) => void;
};

class MockStompClient {
  static instances: MockStompClient[] = [];

  connected = false;
  active = false;
  deactivated = false;
  published: PublishedFrame[] = [];
  subscriptions: ActiveSub[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly config: StompConfig) {
    MockStompClient.instances.push(this);
  }

  activate() {
    this.active = true;
    this.deactivated = false;
  }

  deactivate() {
    this.active = false;
    this.connected = false;
    this.deactivated = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscriptions = [];
    return Promise.resolve();
  }

  subscribe(destination: string, callback: (message: IMessage) => void) {
    const sub: ActiveSub = { destination, callback };
    this.subscriptions.push(sub);
    return {
      id: `sub-${this.subscriptions.length}`,
      unsubscribe: () => {
        this.subscriptions = this.subscriptions.filter((s) => s !== sub);
      },
    };
  }

  publish(params: PublishedFrame) {
    this.published.push(params);
  }

  connect() {
    this.connected = true;
    this.config.onConnect?.({} as never);
  }

  receive(msg: ServerMessage) {
    const sub = this.subscriptions.find((s) => s.destination === DUEL_SUBSCRIBE_DESTINATION);
    sub?.callback({ body: JSON.stringify(msg) } as IMessage);
  }

  drop() {
    this.connected = false;
    this.subscriptions = [];
    this.config.onWebSocketClose?.({} as never);
    const delay = this.config.reconnectDelay ?? 0;
    if (this.active && delay > 0) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.active) {
          this.connect();
        }
      }, delay);
    }
  }
}

jest.mock('@stomp/stompjs', () => {
  const actual = jest.requireActual('@stomp/stompjs');
  return {
    ...actual,
    Client: jest.fn((config: StompConfig) => new MockStompClient(config)),
  };
});

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
    { rank: 1, userId: 'u1', name: 'Tomasz', avatar: 4, level: 30, elo: 1380, value: 142 },
    { rank: 2, userId: 'u2', name: 'Ola', avatar: 2, level: 22, elo: 1280, value: 128 },
    { rank: 3, userId: 'u3', name: 'Marta', avatar: 3, level: 19, elo: 1210, value: 97 },
    { rank: 4, userId: 'u4', name: 'Jonas', avatar: 2, level: 31, elo: 1342, value: 88 },
  ],
  me: { rank: 17, userId: 'demo-user', name: 'Alex', avatar: 2, level: 12, elo: 1084, value: 46 },
};

beforeEach(() => {
  clearStoredActiveMatch();
  MockStompClient.instances = [];

  globalThis.fetch = jest.fn((url: string) => {
    let body: unknown = [];
    if (url.includes('/profile')) body = { userId: 'demo-user', goals: [], onboardingCompleted: true };
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
  expect(await screen.findByText('Instruments')).toBeOnTheScreen();
  expect(screen.getByText('1 156')).toBeOnTheScreen();
  expect(screen.getByText('3/5')).toBeOnTheScreen();
  expect(screen.getByText('Calibrating')).toBeOnTheScreen();
  expect(screen.getByText("You're #17 this week")).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('duel-open-rankings'));
  expect(await screen.findByTestId('screen-duel-rankings')).toBeOnTheScreen();
  expect(await screen.findByTestId('rankings-podium')).toBeOnTheScreen();
  expect(screen.getByTestId('rankings-pinned-me')).toBeOnTheScreen();
});

test('match flow handles answer feedback, reconnect match.resume, and solo result without rival UI', async () => {
  jest.useFakeTimers();

  await renderRouter(appRoutes, {
    initialUrl: '/duel/match?category=instruments&mode=SOLO',
  });

  expect(await screen.findByTestId('duel-matchmaking')).toBeOnTheScreen();
  expect(MockStompClient.instances).toHaveLength(1);
  const stomp = MockStompClient.instances[0];
  expect(stomp.active).toBe(true);
  expect(stomp.config.connectHeaders).toEqual({ userId: 'demo-user', lang: 'en' });

  await act(async () => {
    stomp.connect();
  });
  expect(stomp.subscriptions.map((s) => s.destination)).toEqual([DUEL_SUBSCRIBE_DESTINATION]);
  expect(stomp.published[0].destination).toBe('/app/duel/queue.join');
  expect(JSON.parse(stomp.published[0].body!)).toEqual({
    type: 'queue.join',
    category: 'instruments',
    mode: 'SOLO',
  });

  await act(async () => {
    stomp.receive({
      type: 'match.start',
      matchId: 77,
      mode: 'SOLO',
      category: 'instruments',
      you: { name: 'Alex', level: 12, elo: 1156, avatar: 2, isBot: false },
      rival: null,
      questionCount: 6,
    });
    stomp.receive({
      type: 'question',
      index: 0,
      prompt: 'What is an ETF?',
      options: ['A loan', 'An exchange-traded fund', 'A tax', 'A bank fee'],
      deadline: Date.now() + 30_000,
    });
  });

  expect(await screen.findByTestId('duel-question')).toBeOnTheScreen();
  expect(screen.queryByTestId('duel-scoreboard')).toBeNull();
  expect(screen.getByTestId('solo-progress-strip')).toBeOnTheScreen();

  // Answer option 0 (wrong) -> feedback banner marks only your pick and auto-advances after 3 s.
  await fireEvent.press(screen.getByTestId('duel-option-0'));
  expect(stomp.published[1].destination).toBe('/app/duel/answer');
  expect(JSON.parse(stomp.published[1].body!)).toEqual({
    type: 'answer',
    matchId: 77,
    index: 0,
    option: 0,
  });

  await act(async () => {
    stomp.receive({ type: 'answer.result', index: 0, correct: false, timedOut: false });
    stomp.receive({
      type: 'question',
      index: 1,
      prompt: 'Second question?',
      options: ['A', 'B', 'C', 'D'],
      deadline: Date.now() + 40_000,
    });
  });

  expect(screen.getByTestId('duel-feedback')).toBeOnTheScreen();
  expect(screen.getByTestId('duel-next-question')).toBeOnTheScreen();

  // Auto-advance after 3 s promotes the buffered second question.
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(screen.getByText('Second question?')).toBeOnTheScreen();

  // Drop connection -> STOMP reconnects, re-subscribes to /user/queue/duel, and sends match.resume.
  await act(async () => {
    stomp.drop();
    jest.advanceTimersByTime(600);
  });
  expect(stomp.subscriptions.map((s) => s.destination)).toEqual([DUEL_SUBSCRIBE_DESTINATION]);
  expect(stomp.published[2].destination).toBe('/app/duel/match.resume');
  expect(JSON.parse(stomp.published[2].body!)).toEqual({ type: 'match.resume', matchId: 77 });

  // Match finishes -> Solo result card shown with no rival hero and STOMP client deactivated.
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

  await act(async () => {
    stomp.receive({ type: 'match.end', ...soloEnd });
  });

  expect(await screen.findByTestId('duel-result')).toBeOnTheScreen();
  expect(screen.getByTestId('result-solo-card')).toBeOnTheScreen();
  expect(screen.queryByTestId('result-hero-card')).toBeNull();
  expect(screen.getByTestId('review-mistake-1')).toBeOnTheScreen();
  expect(stomp.deactivated).toBe(true);
});

test('reloading mid-match restores matchId from sessionStorage and sends match.resume', async () => {
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

    await renderRouter(appRoutes, {
      initialUrl: '/duel/match?category=money-basics&mode=SOLO',
    });

    expect(MockStompClient.instances).toHaveLength(1);
    const stomp = MockStompClient.instances[0];
    await act(async () => {
      stomp.connect();
    });

    expect(stomp.published[0].destination).toBe('/app/duel/match.resume');
    expect(JSON.parse(stomp.published[0].body!)).toEqual({ type: 'match.resume', matchId: 88 });

    await act(async () => {
      stomp.receive({
        type: 'match.state',
        matchId: 88,
        mode: 'SOLO',
        category: 'money-basics',
        you: { name: 'Alex', level: 3, elo: 1006, avatar: 2, isBot: false },
        rival: null,
        questionCount: 6,
        yourResults: [false, false, null, null, null, null],
        question: {
          index: 2,
          prompt: 'Third question after reload?',
          options: ['A', 'B', 'C', 'D'],
          deadline: Date.now() + 30_000,
        },
        rivalProgress: null,
      });
    });

    expect(await screen.findByText('Third question after reload?')).toBeOnTheScreen();
    expect(screen.getByTestId('reconnected-banner')).toBeOnTheScreen();
    expect(screen.getByText(/question 2 ran out/i)).toBeOnTheScreen();
    expect(screen.getByTestId('timeout-legend')).toBeOnTheScreen();
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: origWindow });
  }
});

test('the match screen sends a user who has not finished onboarding to onboarding without opening a socket', async () => {
  const fetchMock = globalThis.fetch as jest.Mock;
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) =>
    url.includes('/profile') && !init?.method
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ userId: 'demo-user', goals: [], onboardingCompleted: false }) })
      : fetchMock(url, init),
  ) as jest.Mock;

  await renderRouter(appRoutes, { initialUrl: '/duel' });
  await screen.findByTestId('screen-duel');
  await act(async () => {});
  await act(async () => router.push('/duel/match?category=instruments&mode=SOLO'));

  expect(await screen.findByTestId('onboarding-welcome')).toBeOnTheScreen();
  expect(screen.queryByTestId('duel-matchmaking')).toBeNull();
  expect(MockStompClient.instances).toHaveLength(0);
});
