import { Client, ReconnectionTimeMode, type IMessage, type StompConfig } from '@stomp/stompjs';

import {
  createInitialDuelState,
  duelReducer,
  getRivalScore,
  getYourScore,
  partitionReview,
  type DuelAction,
  type DuelMatchState,
} from '@/lib/duel/reducer';
import {
  createDuelSocket,
  decodeUtf8,
  DUEL_SUBSCRIBE_DESTINATION,
  duelSendDestination,
  encodeUtf8,
  resolveDuelWsUrl,
} from '@/lib/duel/socket';
import type { MatchEnd, PlayerCard, ReviewItem } from '@/types/duel';

type MockSub = {
  destination: string;
  callback: (msg: IMessage) => void;
  unsubscribe: jest.Mock;
};

type MockPublishCall = {
  destination: string;
  body?: string;
  headers?: Record<string, string>;
};

const mockStompClients: {
  config: StompConfig;
  connected: boolean;
  activate: jest.Mock;
  deactivate: jest.Mock;
  publish: jest.Mock<void, [MockPublishCall]>;
  subscribe: jest.Mock;
  subscriptions: MockSub[];
}[] = [];

jest.mock('@stomp/stompjs', () => {
  const actual = jest.requireActual('@stomp/stompjs');
  class MockClient {
    config: StompConfig;
    connected = false;
    subscriptions: MockSub[] = [];
    activate = jest.fn();
    deactivate = jest.fn(() => {
      this.connected = false;
      return Promise.resolve();
    });
    publish = jest.fn<void, [MockPublishCall]>();
    subscribe = jest.fn((destination: string, callback: (msg: IMessage) => void) => {
      const sub: MockSub = { destination, callback, unsubscribe: jest.fn() };
      this.subscriptions.push(sub);
      return { id: `sub-${this.subscriptions.length}`, unsubscribe: sub.unsubscribe };
    });

    constructor(config: StompConfig) {
      this.config = config;
      mockStompClients.push(this);
    }
  }
  return {
    ...actual,
    Client: MockClient,
  };
});

const YOU: PlayerCard = { name: 'Alex', level: 12, elo: 1084, avatar: 2, isBot: false };
const RIVAL: PlayerCard = { name: 'Marek', level: 15, elo: 1120, avatar: 3, isBot: false };
const BOT_RIVAL: PlayerCard = { name: 'Bella the Bot', level: 11, elo: null, avatar: 2, isBot: true };

function q(index: number) {
  return {
    type: 'question' as const,
    index,
    prompt: `Question ${index + 1} prompt?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    deadline: 1_800_000_000_000 + index * 40_000,
  };
}

function makeReview(wrongIndices: number[], timedOutIndices: number[] = []): ReviewItem[] {
  return Array.from({ length: 6 }, (_, i) => ({
    prompt: `Question ${i + 1} prompt?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    yourOption: timedOutIndices.includes(i) ? null : wrongIndices.includes(i) ? 2 : 1,
    correctOption: 1,
    explanation: `Why question ${i + 1} works this way.`,
  }));
}

function replay(initial: DuelMatchState, actions: DuelAction[]): DuelMatchState {
  return actions.reduce(duelReducer, initial);
}

describe('duelReducer', () => {
  test('replays a normal human win from matchmaking through waiting to result', () => {
    const start = createInitialDuelState('psychology', 'HUMAN');

    // Matchmaking widens after 5 s, then match starts.
    let state = replay(start, [
      { type: 'socket.status', status: 'open' },
      { type: 'queue.waiting', elapsedSec: 3, widened: false },
      { type: 'queue.waiting', elapsedSec: 6, widened: true },
    ]);
    expect(state.phase).toBe('matchmaking');
    expect(state.widened).toBe(true);
    expect(state.elapsedSec).toBe(6);

    state = replay(state, [
      {
        type: 'match.start',
        matchId: 42,
        mode: 'HUMAN',
        category: 'psychology',
        you: YOU,
        rival: RIVAL,
        questionCount: 6,
      },
      q(0),
    ]);
    expect(state.phase).toBe('question');
    expect(state.matchId).toBe(42);
    expect(state.question?.index).toBe(0);

    // Play Q1..Q6 (4 right, 2 wrong). Server sends next question right after answer.result;
    // reducer buffers it while feedback is shown and promotes it on ui.advance.
    const outcomes = [true, true, false, true, false, true];
    outcomes.forEach((correct, i) => {
      const picked = correct ? 1 : 2;
      state = replay(state, [
        { type: 'ui.selectOption', option: picked },
        { type: 'answer.result', index: i, correct, timedOut: false },
        ...(i < 5 ? [q(i + 1)] : [{ type: 'match.waiting' as const }]),
      ]);

      // Still showing feedback for question i even though server sent i+1 / match.waiting.
      expect(state.phase).toBe('feedback');
      expect(state.feedback).toEqual({
        index: i,
        chosenOption: picked,
        correct,
        timedOut: false,
      });

      // Rival progresses live during feedback.
      if (i === 2) {
        state = duelReducer(state, {
          type: 'rival.progress',
          answered: 3,
          results: [true, true, false, null, null, null],
          connected: true,
        });
        expect(getRivalScore(state)).toBe(2);
      }

      // Advance (user taps "Next question" or 3 s timer fires).
      state = duelReducer(state, { type: 'ui.advance' });
    });

    // After Q6 advance, player waits for rival.
    expect(state.phase).toBe('waiting');
    expect(getYourScore(state)).toBe(4);
    expect(state.yourDots).toEqual(['correct', 'correct', 'wrong', 'correct', 'wrong', 'correct']);

    // Rival finishes and server sends match.end.
    const endPayload: MatchEnd = {
      matchId: 42,
      mode: 'HUMAN',
      category: 'psychology',
      outcome: 'WIN',
      score: 4,
      rivalScore: 3,
      rival: RIVAL,
      xpGained: 52,
      levelBefore: 12,
      levelAfter: 13,
      xpIntoLevel: 38,
      xpForLevel: 58,
      eloBefore: 1084,
      eloAfter: 1102,
      review: makeReview([2, 4]),
    };

    state = duelReducer(state, { type: 'match.end', ...endPayload });
    expect(state.phase).toBe('result');
    expect(state.result).toEqual(endPayload);

    // Review partitions mistakes first with original 1-based question numbers.
    const { mistakes, correct } = partitionReview(state.result!.review);
    expect(mistakes.map((m) => m.questionNumber)).toEqual([3, 5]);
    expect(correct.map((c) => c.questionNumber)).toEqual([1, 2, 4, 6]);
  });

  test('records a question timeout as a grey timeout dot and advances cleanly', () => {
    const start = createInitialDuelState('instruments', 'BOT');
    let state = replay(start, [
      {
        type: 'match.start',
        matchId: 7,
        mode: 'BOT',
        category: 'instruments',
        you: YOU,
        rival: BOT_RIVAL,
        questionCount: 6,
      },
      q(0),
      // Deadline expires with no answer sent.
      { type: 'answer.result', index: 0, correct: false, timedOut: true },
      q(1),
    ]);

    expect(state.phase).toBe('feedback');
    expect(state.yourDots[0]).toBe('timeout');
    expect(state.feedback).toEqual({
      index: 0,
      chosenOption: null,
      correct: false,
      timedOut: true,
    });
    expect(state.pendingQuestion?.index).toBe(1);

    state = duelReducer(state, { type: 'ui.advance' });
    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(1);
    expect(state.feedback).toBeNull();
  });

  test('recovers after a disconnect via match.state, flagging missed questions and rival offline', () => {
    const start = createInitialDuelState('psychology', 'HUMAN');

    // Player answers Q1 right, Q2 wrong, Q3 wrong, reaches Q4, then disconnects.
    let state = replay(start, [
      {
        type: 'match.start',
        matchId: 99,
        mode: 'HUMAN',
        category: 'psychology',
        you: YOU,
        rival: RIVAL,
        questionCount: 6,
      },
      q(0),
      { type: 'ui.selectOption', option: 1 },
      { type: 'answer.result', index: 0, correct: true, timedOut: false },
      q(1),
      { type: 'ui.advance' },
      { type: 'ui.selectOption', option: 2 },
      { type: 'answer.result', index: 1, correct: false, timedOut: false },
      q(2),
      { type: 'ui.advance' },
      { type: 'ui.selectOption', option: 3 },
      { type: 'answer.result', index: 2, correct: false, timedOut: false },
      q(3),
      { type: 'ui.advance' },
      { type: 'socket.status', status: 'reconnecting' },
    ]);

    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(3);

    // Reconnected: Q4 timed out while offline, now on Q5, and rival is offline.
    state = replay(state, [
      { type: 'socket.status', status: 'open' },
      {
        type: 'match.state',
        matchId: 99,
        mode: 'HUMAN',
        category: 'psychology',
        you: YOU,
        rival: RIVAL,
        questionCount: 6,
        yourResults: [true, false, false, false, null, null],
        question: {
          index: 4,
          prompt: 'Question 5 prompt?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          deadline: 1_800_000_200_000,
        },
        rivalProgress: {
          answered: 3,
          results: [true, true, false, null, null, null],
          connected: false,
        },
      },
    ]);

    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(4);
    // Q2 & Q3 stay 'wrong', Q4 becomes 'timeout' (grey dot).
    expect(state.yourDots).toEqual(['correct', 'wrong', 'wrong', 'timeout', null, null]);
    expect(state.reconnectedNotice).toEqual({ missedQuestions: [4], resumeQuestion: 5 });
    expect(state.rivalProgress?.connected).toBe(false);

    // Reconnecting when already finished all 6 questions lands on waiting.
    state = duelReducer(state, {
      type: 'match.state',
      matchId: 99,
      mode: 'HUMAN',
      category: 'psychology',
      you: YOU,
      rival: RIVAL,
      questionCount: 6,
      yourResults: [true, false, false, false, true, true],
      question: null,
      rivalProgress: {
        answered: 5,
        results: [true, true, false, false, true, null],
        connected: true,
      },
    });
    expect(state.phase).toBe('waiting');
    expect(state.question).toBeNull();
  });

  test('plays a solo match with no rival state and no waiting phase', () => {
    const start = createInitialDuelState('costs', 'SOLO');
    let state = replay(start, [
      {
        type: 'match.start',
        matchId: 12,
        mode: 'SOLO',
        category: 'costs',
        you: YOU,
        rival: null,
        questionCount: 6,
      },
      q(0),
    ]);

    expect(state.rival).toBeNull();
    expect(state.rivalProgress).toBeNull();

    // Even if a stray match.waiting arrived in SOLO, reducer ignores it.
    state = duelReducer(state, { type: 'match.waiting' });
    expect(state.phase).toBe('question');

    // Answer Q1..Q6 and receive match.end immediately after Q6.
    for (let i = 0; i < 6; i++) {
      state = replay(state, [
        { type: 'ui.selectOption', option: 1 },
        { type: 'answer.result', index: i, correct: i !== 5, timedOut: false },
      ]);
      if (i < 5) {
        state = replay(state, [q(i + 1), { type: 'ui.advance' }]);
      }
    }

    const soloEnd: MatchEnd = {
      matchId: 12,
      mode: 'SOLO',
      category: 'costs',
      outcome: 'SOLO',
      score: 5,
      rivalScore: null,
      rival: null,
      xpGained: 40,
      levelBefore: 7,
      levelAfter: 7,
      xpIntoLevel: 50,
      xpForLevel: 80,
      eloBefore: null,
      eloAfter: null,
      review: makeReview([5]),
    };

    state = replay(state, [
      { type: 'match.end', ...soloEnd },
      { type: 'ui.advance' },
    ]);

    expect(state.phase).toBe('result');
    expect(state.result?.outcome).toBe('SOLO');
    expect(state.result?.rivalScore).toBeNull();
    expect(state.result?.eloBefore).toBeNull();
    expect(state.result?.eloAfter).toBeNull();
  });

  test('handles bot offer during matchmaking and dismissing with keep waiting', () => {
    const start = createInitialDuelState('risk', 'HUMAN');
    let state = replay(start, [
      { type: 'queue.waiting', elapsedSec: 10, widened: true },
      { type: 'queue.botOffer' },
    ]);
    expect(state.botOffer).toBe(true);
    expect(state.botOfferDismissed).toBe(false);

    state = duelReducer(state, { type: 'ui.dismissBotOffer' });
    expect(state.botOfferDismissed).toBe(true);

    // Accepting bot starts a BOT match cleanly.
    state = duelReducer(state, {
      type: 'match.start',
      matchId: 55,
      mode: 'BOT',
      category: 'risk',
      you: YOU,
      rival: BOT_RIVAL,
      questionCount: 6,
    });
    expect(state.mode).toBe('BOT');
    expect(state.rival?.isBot).toBe(true);
  });
});

describe('resolveDuelWsUrl', () => {
  test('derives the URL from API_URL (http -> ws, https -> wss, same host and port)', () => {
    expect(resolveDuelWsUrl(undefined, 'http://localhost:8081')).toBe('ws://localhost:8081/ws/duel');
    expect(resolveDuelWsUrl(undefined, 'http://192.168.1.42:8081/')).toBe('ws://192.168.1.42:8081/ws/duel');
    expect(resolveDuelWsUrl(undefined, 'https://abc-123.exp.direct')).toBe('wss://abc-123.exp.direct/ws/duel');
  });

  test('uses EXPO_PUBLIC_WS_URL when provided', () => {
    expect(resolveDuelWsUrl('wss://api.example.com/ws/duel')).toBe('wss://api.example.com/ws/duel');
    expect(resolveDuelWsUrl('wss://api.example.com/')).toBe('wss://api.example.com/ws/duel');
  });
});

describe('STOMP duel socket client', () => {
  beforeEach(() => {
    mockStompClients.length = 0;
  });

  test('maps every ClientMessage type to its /app/duel/* destination', () => {
    expect(duelSendDestination('queue.join')).toBe('/app/duel/queue.join');
    expect(duelSendDestination('queue.leave')).toBe('/app/duel/queue.leave');
    expect(duelSendDestination('queue.acceptBot')).toBe('/app/duel/queue.acceptBot');
    expect(duelSendDestination('answer')).toBe('/app/duel/answer');
    expect(duelSendDestination('match.resume')).toBe('/app/duel/match.resume');
  });

  test('connects with userId/lang headers, subscribes to /user/queue/duel, publishes, and reconnects', () => {
    const onOpen = jest.fn();
    const onMessage = jest.fn();
    const onDisconnect = jest.fn();
    const onError = jest.fn();

    const socket = createDuelSocket({
      url: 'ws://localhost:8080/ws/duel',
      userId: 'alice',
      lang: 'pl',
      onOpen,
      onMessage,
      onDisconnect,
      onError,
    });

    expect(Client).toBeDefined();
    expect(mockStompClients).toHaveLength(1);
    const stomp = mockStompClients[0];
    expect(stomp.activate).toHaveBeenCalledTimes(1);
    expect(stomp.config.brokerURL).toBe('ws://localhost:8080/ws/duel');
    expect(stomp.config.connectHeaders).toEqual({ userId: 'alice', lang: 'pl' });
    expect(stomp.config.reconnectDelay).toBe(500);
    expect(stomp.config.maxReconnectDelay).toBe(5000);
    expect(stomp.config.reconnectTimeMode).toBe(ReconnectionTimeMode.EXPONENTIAL);

    // Sending before connect returns false.
    expect(socket.send({ type: 'queue.join', category: 'risk', mode: 'BOT' })).toBe(false);

    // Initial CONNECT -> subscribes to /user/queue/duel and notifies onOpen(false).
    stomp.connected = true;
    stomp.config.onConnect?.({} as never);
    expect(stomp.subscribe).toHaveBeenCalledWith(DUEL_SUBSCRIBE_DESTINATION, expect.any(Function));
    expect(onOpen).toHaveBeenCalledWith(false);

    // Publishes JSON message to /app/duel/<type>.
    expect(socket.send({ type: 'queue.join', category: 'risk', mode: 'BOT' })).toBe(true);
    expect(stomp.publish).toHaveBeenCalledWith({
      destination: '/app/duel/queue.join',
      body: JSON.stringify({ type: 'queue.join', category: 'risk', mode: 'BOT' }),
      headers: { 'content-type': 'application/json' },
    });

    // Delivers valid ServerMessage frames and ignores malformed JSON.
    stomp.subscriptions[0].callback({
      body: JSON.stringify({ type: 'queue.waiting', elapsedSec: 2, widened: false }),
    } as IMessage);
    stomp.subscriptions[0].callback({ body: 'not-json' } as IMessage);
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      type: 'queue.waiting',
      elapsedSec: 2,
      widened: false,
    });

    // Disconnect notifies caller; subsequent STOMP reconnect re-subscribes and passes isReconnect=true.
    stomp.connected = false;
    stomp.config.onWebSocketClose?.({} as never);
    expect(onDisconnect).toHaveBeenCalledTimes(1);

    stomp.connected = true;
    stomp.config.onConnect?.({} as never);
    expect(stomp.subscribe).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenLastCalledWith(true);

    // Closing unsubscribes, deactivates, and suppresses further callbacks.
    socket.close();
    expect(stomp.subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
    expect(stomp.deactivate).toHaveBeenCalledTimes(1);
    stomp.config.onWebSocketClose?.({} as never);
    stomp.config.onStompError?.({} as never);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('UTF-8 fallback round-trips ASCII, Polish diacritics, and emoji', () => {
    const sample = 'Inflacja i procent składany — żółć Źdźbło ✓ 🎯';
    const bytes = encodeUtf8(sample);
    expect(decodeUtf8(bytes)).toBe(sample);
    expect(decodeUtf8(bytes.buffer)).toBe(sample);
  });
});
