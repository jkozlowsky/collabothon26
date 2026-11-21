import {
  createInitialDuelState,
  duelReducer,
  getRivalScore,
  getYourScore,
  partitionReview,
  type DuelAction,
  type DuelMatchState,
} from '@/lib/duel/reducer';
import type { MatchEnd, PlayerCard, ReviewItem } from '@/types/duel';

const YOU: PlayerCard = { name: 'Alex', level: 12, elo: 1084, avatar: 'm1', isBot: false };
const RIVAL: PlayerCard = { name: 'Marek', level: 15, elo: 1120, avatar: 'm2', isBot: false };
const BOT_RIVAL: PlayerCard = { name: 'Bella the Bot', level: 11, elo: null, avatar: 'm1', isBot: true };

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

    expect(start.phase).toBe('matchmaking');

    let state = replay(start, [
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

  test('resumes via match.state after a reload, flagging the questions that ran out meanwhile', () => {
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
    ]);

    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(3);

    // Reloaded: Q4 ran out while away, now on Q5.
    state = replay(state, [
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
          connected: true,
        },
        finished: false,
      },
    ]);

    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(4);
    // Q2 & Q3 stay 'wrong', Q4 becomes 'timeout' (grey dot).
    expect(state.yourDots).toEqual(['correct', 'wrong', 'wrong', 'timeout', null, null]);
    expect(state.reconnectedNotice).toEqual({ missedQuestions: [4], resumeQuestion: 5 });
    expect(state.rivalProgress?.answered).toBe(3);

    // Resuming when already finished all 6 questions lands on waiting.
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
      finished: false,
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

  test('starts a BOT match cleanly after a reset', () => {
    const start = createInitialDuelState('risk', 'BOT');
    let state = start;
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

describe('error handling', () => {
  test('clearError drops the error and the pending selection so the player can retry', () => {
    let state = replay(createInitialDuelState('risk', 'SOLO'), [
      { type: 'match.start', matchId: 7, mode: 'SOLO', category: 'risk', you: YOU, rival: null, questionCount: 6 },
      q(0),
      { type: 'ui.selectOption', option: 1 },
      { type: 'error', code: 'REQUEST_FAILED', message: 'API 500' },
    ]);
    expect(state.error?.code).toBe('REQUEST_FAILED');
    state = duelReducer(state, { type: 'ui.clearError' });
    expect(state.error).toBeNull();
    expect(state.selectedOption).toBeNull();
    expect(state.matchId).toBe(7);
  });

  test('a poll that finds the next question while feedback is shown buffers it', () => {
    const state = replay(createInitialDuelState('risk', 'SOLO'), [
      { type: 'match.start', matchId: 7, mode: 'SOLO', category: 'risk', you: YOU, rival: null, questionCount: 6 },
      q(0),
      { type: 'ui.selectOption', option: 1 },
      { type: 'answer.result', index: 0, correct: true, timedOut: false },
      q(1),
    ]);
    expect(state.phase).toBe('feedback');
    expect(state.pendingQuestion?.index).toBe(1);
  });
});
