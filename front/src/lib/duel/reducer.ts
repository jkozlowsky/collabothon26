import type {
  DotResult,
  DuelMode,
  DuelQuestion,
  MatchEnd,
  MatchStart,
  MatchState,
  PlayerCard,
  ReviewItem,
  RivalSnapshot,
} from '@/types/duel';

export type LocalDot = 'correct' | 'wrong' | 'timeout' | null;

export type MatchPhase = 'matchmaking' | 'question' | 'feedback' | 'waiting' | 'result';

export type AnswerFeedback = {
  index: number;
  correct: boolean;
  timedOut: boolean;
  xpGained: number;
};

export type DuelMatchState = {
  phase: MatchPhase;
  mode: DuelMode;
  categories: string[];
  matchId: number | null;
  questionCount: number;

  you: PlayerCard | null;
  rival: PlayerCard | null;
  yourDots: LocalDot[];
  rivalDots: DotResult[];
  rivalAnswered: number;

  question: DuelQuestion | null;
  feedback: AnswerFeedback | null;
  nextQuestion: DuelQuestion | null;

  yourFinal: { score: number; xpGained: number } | null;
  finished: boolean;
  result: MatchEnd | null;
  error: { code: string; message: string } | null;
};

export type DuelAction =
  | { type: 'match.start'; payload: MatchStart }
  | {
      type: 'answer.result';
      index: number;
      correct: boolean;
      timedOut: boolean;
      nextQuestion: DuelQuestion | null;
      rivalProgress: RivalSnapshot | null;
      yourFinal: { score: number; xpGained: number } | null;
      finished: boolean;
    }
  | { type: 'rival.progress'; rivalProgress: RivalSnapshot }
  | { type: 'ui.advance' }
  | { type: 'match.state'; state: MatchState }
  | { type: 'match.end'; result: MatchEnd }
  | { type: 'error'; code: string; message: string }
  | { type: 'ui.clearError' }
  | { type: 'ui.reset'; categories: string[]; mode: DuelMode };

const DEFAULT_QUESTION_COUNT = 6;

function emptyDots(count: number): LocalDot[] {
  return Array.from({ length: count }, () => null);
}

function emptyRivalResults(count: number): DotResult[] {
  return Array.from({ length: count }, () => null);
}

export function createInitialDuelState(
  categories: string[],
  mode: DuelMode,
  resumed?: { matchId: number; yourDots?: LocalDot[] },
): DuelMatchState {
  const initialDots =
    resumed?.yourDots && resumed.yourDots.length === DEFAULT_QUESTION_COUNT
      ? resumed.yourDots.slice()
      : emptyDots(DEFAULT_QUESTION_COUNT);

  return {
    phase: 'matchmaking',
    mode,
    categories,
    matchId: resumed ? resumed.matchId : null,
    questionCount: DEFAULT_QUESTION_COUNT,

    you: null,
    rival: null,
    yourDots: initialDots,
    rivalDots: emptyRivalResults(DEFAULT_QUESTION_COUNT),
    rivalAnswered: 0,

    question: null,
    feedback: null,
    nextQuestion: null,

    yourFinal: null,
    finished: false,
    result: null,
    error: null,
  };
}

export function getYourScore(state: DuelMatchState): number {
  if (state.yourFinal) return state.yourFinal.score;
  return state.yourDots.filter((d) => d === 'correct').length;
}

export function getRivalScore(state: DuelMatchState): number {
  return state.rivalDots.filter((d) => d === true).length;
}

export function partitionReview(review: ReviewItem[]): {
  wrong: ReviewItem[];
  correct: ReviewItem[];
} {
  const wrong: ReviewItem[] = [];
  const correct: ReviewItem[] = [];
  for (const item of review) {
    if (item.correct) {
      correct.push(item);
    } else {
      wrong.push(item);
    }
  }
  return { wrong, correct };
}

export function duelReducer(state: DuelMatchState, action: DuelAction): DuelMatchState {
  switch (action.type) {
    case 'match.start': {
      const { payload } = action;
      return {
        ...state,
        phase: 'question',
        matchId: payload.matchId,
        mode: payload.mode,
        categories: payload.categories,
        you: payload.you,
        rival: payload.rival,
        questionCount: payload.questionCount,
        question: payload.question,
        yourDots: emptyDots(payload.questionCount),
        rivalDots: emptyRivalResults(payload.questionCount),
        rivalAnswered: 0,
        feedback: null,
        nextQuestion: null,
        yourFinal: null,
        finished: false,
        result: null,
        error: null,
      };
    }

    case 'answer.result': {
      const nextDots = state.yourDots.slice();
      const dotValue: LocalDot = action.correct
        ? 'correct'
        : action.timedOut
          ? 'timeout'
          : 'wrong';
      if (action.index >= 0 && action.index < nextDots.length) {
        nextDots[action.index] = dotValue;
      }

      const rivalDots = action.rivalProgress
        ? action.rivalProgress.results.slice()
        : state.rivalDots;
      const rivalAnswered = action.rivalProgress
        ? action.rivalProgress.answered
        : state.rivalAnswered;

      return {
        ...state,
        phase: 'feedback',
        yourDots: nextDots,
        rivalDots,
        rivalAnswered,
        feedback: {
          index: action.index,
          correct: action.correct,
          timedOut: action.timedOut,
          xpGained: action.correct && state.mode === 'HUMAN' ? 5 : 0,
        },
        nextQuestion: action.nextQuestion,
        yourFinal: action.yourFinal ?? state.yourFinal,
        finished: action.finished,
      };
    }

    case 'ui.advance': {
      if (state.phase !== 'feedback') return state;
      if (state.nextQuestion !== null) {
        return {
          ...state,
          phase: 'question',
          question: state.nextQuestion,
          nextQuestion: null,
          feedback: null,
        };
      }
      // All questions answered: wait for rival or show result
      return {
        ...state,
        phase: state.result ? 'result' : state.finished ? 'result' : 'waiting',
        question: null,
        feedback: null,
      };
    }

    case 'rival.progress': {
      return {
        ...state,
        rivalDots: action.rivalProgress.results.slice(),
        rivalAnswered: action.rivalProgress.answered,
      };
    }

    case 'match.state': {
      const ms = action.state;
      const yourDots = ms.yourResults.map((r): LocalDot => {
        if (r === true) return 'correct';
        if (r === false) return 'wrong';
        return null;
      });

      let nextPhase: MatchPhase = state.phase;
      if (state.phase === 'matchmaking') {
        if (ms.question) nextPhase = 'question';
        else if (ms.yourFinal && !ms.finished) nextPhase = 'waiting';
        else if (ms.finished) nextPhase = 'result';
      } else if (state.phase === 'waiting' && ms.finished) {
        nextPhase = state.result ? 'result' : 'waiting';
      }

      return {
        ...state,
        phase: nextPhase,
        matchId: ms.matchId,
        mode: ms.mode,
        categories: ms.categories,
        you: ms.you,
        rival: ms.rival,
        questionCount: ms.questionCount,
        yourDots: yourDots.length === state.questionCount ? yourDots : state.yourDots,
        rivalDots: ms.rivalProgress ? ms.rivalProgress.results.slice() : state.rivalDots,
        rivalAnswered: ms.rivalProgress ? ms.rivalProgress.answered : state.rivalAnswered,
        question: ms.question ?? state.question,
        yourFinal: ms.yourFinal ?? state.yourFinal,
        finished: ms.finished,
      };
    }

    case 'match.end': {
      return {
        ...state,
        phase: state.phase === 'feedback' ? 'feedback' : 'result',
        result: action.result,
        finished: true,
      };
    }

    case 'error': {
      return {
        ...state,
        error: { code: action.code, message: action.message },
      };
    }

    case 'ui.clearError': {
      return { ...state, error: null };
    }

    case 'ui.reset': {
      return createInitialDuelState(action.categories, action.mode);
    }

    default:
      return state;
  }
}
