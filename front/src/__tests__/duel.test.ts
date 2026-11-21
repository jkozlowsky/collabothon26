import {
  createInitialDuelState,
  duelReducer,
  getRivalScore,
  getYourScore,
  partitionReview,
  type DuelAction,
  type DuelMatchState,
} from '@/lib/duel/reducer';
import type { DuelQuestion, MatchEnd, PlayerCard, ReviewItem } from '@/types/duel';

const YOU: PlayerCard = { name: 'Alex', avatar: 'm1', levels: { berlin: 3, seoul: 1 } };
const RIVAL: PlayerCard = { name: 'Ola', avatar: 'f1', levels: { berlin: 2, seoul: 2 } };

function makeQuestion(index: number, category = 'berlin'): DuelQuestion {
  return {
    index,
    category,
    step: {
      type: 'quiz',
      id: `q-${index}`,
      prompt: `Pytanie ${index + 1}?`,
      options: ['Opcja A', 'Opcja B', 'Opcja C', 'Opcja D'],
    },
    deadline: 1_800_000_000_000 + index * 40_000,
    timeLimitMs: 30_000,
  };
}

function makeReviewItem(index: number, correct: boolean): ReviewItem {
  return {
    index,
    category: 'berlin',
    step: {
      type: 'quiz',
      id: `rev-${index}`,
      prompt: `Pytanie ${index + 1}?`,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
      explanation: `Wyjaśnienie do pytania ${index + 1}`,
    },
    yourAnswer: correct ? { option: 1 } : { option: 2 },
    correct,
    lessonId: 'berlin-1',
    lessonTitle: 'Inflacja i oszczędności',
  };
}

function replay(initial: DuelMatchState, actions: DuelAction[]): DuelMatchState {
  return actions.reduce(duelReducer, initial);
}

describe('duelReducer v2', () => {
  test('creates initial state in matchmaking phase', () => {
    const state = createInitialDuelState(['berlin', 'seoul'], 'HUMAN');
    expect(state.phase).toBe('matchmaking');
    expect(state.categories).toEqual(['berlin', 'seoul']);
    expect(state.mode).toBe('HUMAN');
    expect(state.matchId).toBeNull();
    expect(state.yourDots).toHaveLength(6);
    expect(state.yourDots.every((d) => d === null)).toBe(true);
  });

  test('starts match with MatchStart payload', () => {
    const initial = createInitialDuelState(['berlin'], 'HUMAN');
    const q0 = makeQuestion(0);
    const state = duelReducer(initial, {
      type: 'match.start',
      payload: {
        matchId: 101,
        mode: 'HUMAN',
        categories: ['berlin'],
        you: YOU,
        rival: RIVAL,
        questionCount: 6,
        question: q0,
      },
    });

    expect(state.phase).toBe('question');
    expect(state.matchId).toBe(101);
    expect(state.question?.index).toBe(0);
    expect(state.you).toEqual(YOU);
    expect(state.rival).toEqual(RIVAL);
  });

  test('answers question, shows feedback with XP, buffers nextQuestion and advances', () => {
    const q0 = makeQuestion(0);
    const q1 = makeQuestion(1);
    let state = replay(createInitialDuelState(['berlin'], 'HUMAN'), [
      {
        type: 'match.start',
        payload: {
          matchId: 101,
          mode: 'HUMAN',
          categories: ['berlin'],
          you: YOU,
          rival: RIVAL,
          questionCount: 6,
          question: q0,
        },
      },
    ]);

    // Answer Q0 correctly
    state = duelReducer(state, {
      type: 'answer.result',
      index: 0,
      correct: true,
      timedOut: false,
      nextQuestion: q1,
      rivalProgress: { answered: 1, results: [false, null, null, null, null, null] },
      yourFinal: null,
      finished: false,
    });

    expect(state.phase).toBe('feedback');
    expect(state.yourDots[0]).toBe('correct');
    expect(state.feedback).toEqual({
      index: 0,
      correct: true,
      timedOut: false,
      xpGained: 5,
    });
    expect(state.nextQuestion?.index).toBe(1);
    expect(getRivalScore(state)).toBe(0);

    // Advance to Q1
    state = duelReducer(state, { type: 'ui.advance' });
    expect(state.phase).toBe('question');
    expect(state.question?.index).toBe(1);
    expect(state.feedback).toBeNull();
    expect(state.nextQuestion).toBeNull();
  });

  test('solo mode gives 0 XP', () => {
    const q0 = makeQuestion(0);
    let state = replay(createInitialDuelState(['berlin'], 'SOLO'), [
      {
        type: 'match.start',
        payload: {
          matchId: 102,
          mode: 'SOLO',
          categories: ['berlin'],
          you: YOU,
          rival: null,
          questionCount: 6,
          question: q0,
        },
      },
    ]);

    state = duelReducer(state, {
      type: 'answer.result',
      index: 0,
      correct: true,
      timedOut: false,
      nextQuestion: null,
      rivalProgress: null,
      yourFinal: { score: 1, xpGained: 0 },
      finished: false,
    });

    expect(state.feedback?.xpGained).toBe(0);
  });

  test('times out question and updates dot to timeout', () => {
    const q0 = makeQuestion(0);
    let state = replay(createInitialDuelState(['berlin'], 'HUMAN'), [
      {
        type: 'match.start',
        payload: {
          matchId: 101,
          mode: 'HUMAN',
          categories: ['berlin'],
          you: YOU,
          rival: RIVAL,
          questionCount: 6,
          question: q0,
        },
      },
      {
        type: 'answer.result',
        index: 0,
        correct: false,
        timedOut: true,
        nextQuestion: null,
        rivalProgress: null,
        yourFinal: null,
        finished: false,
      },
    ]);

    expect(state.yourDots[0]).toBe('timeout');
    expect(state.feedback?.timedOut).toBe(true);
  });

  test('advances to waiting once all 6 questions answered and rival is still playing', () => {
    const q0 = makeQuestion(0);
    let state = replay(createInitialDuelState(['berlin'], 'HUMAN'), [
      {
        type: 'match.start',
        payload: {
          matchId: 101,
          mode: 'HUMAN',
          categories: ['berlin'],
          you: YOU,
          rival: RIVAL,
          questionCount: 6,
          question: q0,
        },
      },
      {
        type: 'answer.result',
        index: 5,
        correct: true,
        timedOut: false,
        nextQuestion: null,
        rivalProgress: { answered: 4, results: [true, true, false, true, null, null] },
        yourFinal: { score: 5, xpGained: 25 },
        finished: false,
      },
    ]);

    expect(state.phase).toBe('feedback');
    state = duelReducer(state, { type: 'ui.advance' });
    expect(state.phase).toBe('waiting');
    expect(state.yourFinal).toEqual({ score: 5, xpGained: 25 });
    expect(getYourScore(state)).toBe(5);
    expect(getRivalScore(state)).toBe(3);
  });

  test('transitions from waiting to result when match.end arrives', () => {
    const initial = createInitialDuelState(['berlin'], 'HUMAN');
    const waitingState: DuelMatchState = {
      ...initial,
      phase: 'waiting',
      matchId: 101,
      yourFinal: { score: 5, xpGained: 25 },
      finished: false,
    };

    const result: MatchEnd = {
      matchId: 101,
      mode: 'HUMAN',
      categories: ['berlin'],
      outcome: 'WIN',
      score: 5,
      rivalScore: 4,
      you: YOU,
      rival: RIVAL,
      xpGained: 25,
      xpByCategory: { berlin: 25 },
      review: [],
    };

    const state = duelReducer(waitingState, { type: 'match.end', result });
    expect(state.phase).toBe('result');
    expect(state.result).toEqual(result);
    expect(state.finished).toBe(true);
  });

  test('partitions review so wrong answers come first', () => {
    const r0 = makeReviewItem(0, true);
    const r1 = makeReviewItem(1, false);
    const r2 = makeReviewItem(2, true);
    const r3 = makeReviewItem(3, false);

    const { wrong, correct } = partitionReview([r0, r1, r2, r3]);
    expect(wrong.map((r) => r.index)).toEqual([1, 3]);
    expect(correct.map((r) => r.index)).toEqual([0, 2]);
  });
});
