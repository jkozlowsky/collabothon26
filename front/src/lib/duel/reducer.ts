import type {
  CategorySlug,
  DotResult,
  DuelMode,
  MatchEnd,
  PlayerCard,
  ReviewItem,
  ServerMessage,
} from '@/types/duel';

/** Per-question local dot state: distinguishes wrong answers from timeouts (grey dot). */
export type LocalDot = 'correct' | 'wrong' | 'timeout' | null;

export type ActiveQuestion = {
  index: number;
  prompt: string;
  options: string[];
  deadline: number;
};

export type AnswerFeedback = {
  index: number;
  chosenOption: number | null;
  correct: boolean;
  timedOut: boolean;
};

export type RivalProgress = {
  answered: number;
  results: DotResult[];
  connected: boolean;
};

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export type MatchPhase = 'matchmaking' | 'question' | 'feedback' | 'waiting' | 'result';

export type ReconnectedNotice = {
  /** 1-based question numbers that timed out while disconnected. */
  missedQuestions: number[];
  /** 1-based current question number to resume on (null if already finished). */
  resumeQuestion: number | null;
};

export type DuelMatchState = {
  phase: MatchPhase;
  connection: ConnectionStatus;
  mode: DuelMode;
  category: CategorySlug;
  matchId: number | null;
  questionCount: number;

  // Matchmaking state
  elapsedSec: number;
  widened: boolean;
  botOffer: boolean;
  botOfferDismissed: boolean;

  // Match participants & live progress
  you: PlayerCard | null;
  rival: PlayerCard | null;
  yourDots: LocalDot[];
  rivalProgress: RivalProgress | null;

  // Active question & feedback state
  question: ActiveQuestion | null;
  selectedOption: number | null;
  feedback: AnswerFeedback | null;
  /** True when user clicked "Next question" before the next server message arrived. */
  awaitingNext: boolean;

  // Messages buffered while the user reads the feedback banner
  pendingQuestion: ActiveQuestion | null;
  pendingWaiting: boolean;
  pendingEnd: MatchEnd | null;

  // Edge states & result
  reconnectedNotice: ReconnectedNotice | null;
  result: MatchEnd | null;
  error: { code: string; message: string } | null;
};

export type DuelAction =
  | ServerMessage
  | { type: 'socket.status'; status: ConnectionStatus }
  | { type: 'ui.selectOption'; option: number }
  | { type: 'ui.advance' }
  | { type: 'ui.dismissBotOffer' }
  | { type: 'ui.dismissReconnectBanner' }
  | { type: 'ui.reset'; category: CategorySlug; mode: DuelMode }
  | { type: 'rest.matchEnd'; result: MatchEnd };

const DEFAULT_QUESTION_COUNT = 6;

function emptyDots(count: number): LocalDot[] {
  return Array.from({ length: count }, () => null);
}

function emptyRivalResults(count: number): DotResult[] {
  return Array.from({ length: count }, () => null);
}

export function createInitialDuelState(
  category: CategorySlug,
  mode: DuelMode,
  resumed?: { matchId: number; yourDots?: LocalDot[] },
): DuelMatchState {
  const initialDots =
    resumed?.yourDots && resumed.yourDots.length === DEFAULT_QUESTION_COUNT
      ? resumed.yourDots.slice()
      : emptyDots(DEFAULT_QUESTION_COUNT);

  return {
    phase: 'matchmaking',
    connection: 'connecting',
    mode,
    category,
    matchId: resumed ? resumed.matchId : null,
    questionCount: DEFAULT_QUESTION_COUNT,

    elapsedSec: 0,
    widened: false,
    botOffer: false,
    botOfferDismissed: false,

    you: null,
    rival: null,
    yourDots: initialDots,
    rivalProgress: null,

    question: null,
    selectedOption: null,
    feedback: null,
    awaitingNext: false,

    pendingQuestion: null,
    pendingWaiting: false,
    pendingEnd: null,

    reconnectedNotice: null,
    result: null,
    error: null,
  };
}

function extractMatchEnd(msg: Extract<ServerMessage, { type: 'match.end' }>): MatchEnd {
  return {
    matchId: msg.matchId,
    mode: msg.mode,
    category: msg.category,
    outcome: msg.outcome,
    score: msg.score,
    rivalScore: msg.rivalScore,
    rival: msg.rival,
    xpGained: msg.xpGained,
    levelBefore: msg.levelBefore,
    levelAfter: msg.levelAfter,
    xpIntoLevel: msg.xpIntoLevel,
    xpForLevel: msg.xpForLevel,
    eloBefore: msg.eloBefore,
    eloAfter: msg.eloAfter,
    review: msg.review,
  };
}

function applyYourDot(dots: LocalDot[], index: number, value: LocalDot): LocalDot[] {
  const next = dots.slice();
  while (next.length <= index) next.push(null);
  next[index] = value;
  return next;
}

export function duelReducer(state: DuelMatchState, action: DuelAction): DuelMatchState {
  switch (action.type) {
    case 'socket.status':
      return { ...state, connection: action.status };

    case 'ui.reset':
      return createInitialDuelState(action.category, action.mode);

    case 'ui.dismissBotOffer':
      return { ...state, botOfferDismissed: true };

    case 'ui.dismissReconnectBanner':
      return { ...state, reconnectedNotice: null };

    case 'ui.selectOption': {
      if (state.phase !== 'question' || state.selectedOption !== null || !state.question) {
        return state;
      }
      return { ...state, selectedOption: action.option };
    }

    case 'ui.advance': {
      if (state.phase !== 'feedback') return state;

      if (state.pendingEnd) {
        return {
          ...state,
          phase: 'result',
          result: state.pendingEnd,
          feedback: null,
          selectedOption: null,
          pendingEnd: null,
          pendingWaiting: false,
          pendingQuestion: null,
          awaitingNext: false,
          reconnectedNotice: null,
        };
      }

      if (state.pendingWaiting) {
        return {
          ...state,
          phase: 'waiting',
          question: null,
          feedback: null,
          selectedOption: null,
          pendingWaiting: false,
          pendingQuestion: null,
          awaitingNext: false,
          reconnectedNotice: null,
        };
      }

      if (state.pendingQuestion) {
        return {
          ...state,
          phase: 'question',
          question: state.pendingQuestion,
          feedback: null,
          selectedOption: null,
          pendingQuestion: null,
          awaitingNext: false,
          reconnectedNotice: null,
        };
      }

      // Server hasn't delivered the next message yet — wait for it cleanly.
      return {
        ...state,
        phase: 'question',
        feedback: null,
        selectedOption: null,
        awaitingNext: true,
        reconnectedNotice: null,
      };
    }

    case 'rest.matchEnd':
      return {
        ...state,
        phase: 'result',
        matchId: action.result.matchId,
        mode: action.result.mode,
        category: action.result.category,
        rival: action.result.rival,
        result: action.result,
        error: null,
      };

    // ---------- Server messages ----------

    case 'queue.waiting':
      if (state.phase !== 'matchmaking') return state;
      return {
        ...state,
        elapsedSec: action.elapsedSec,
        widened: action.widened,
      };

    case 'queue.botOffer':
      if (state.phase !== 'matchmaking') return state;
      return {
        ...state,
        botOffer: true,
        botOfferDismissed: false,
      };

    case 'match.start': {
      const count = action.questionCount || DEFAULT_QUESTION_COUNT;
      return {
        ...state,
        phase: 'question',
        matchId: action.matchId,
        mode: action.mode,
        category: action.category,
        questionCount: count,
        you: action.you,
        rival: action.rival,
        yourDots: emptyDots(count),
        rivalProgress: action.rival
          ? { answered: 0, results: emptyRivalResults(count), connected: true }
          : null,
        question: null,
        selectedOption: null,
        feedback: null,
        awaitingNext: true,
        pendingQuestion: null,
        pendingWaiting: false,
        pendingEnd: null,
        reconnectedNotice: null,
        result: null,
        error: null,
      };
    }

    case 'question': {
      const nextQuestion: ActiveQuestion = {
        index: action.index,
        prompt: action.prompt,
        options: action.options,
        deadline: action.deadline,
      };

      // While showing feedback for the previous question, buffer the next one until advance/3s.
      if (state.phase === 'feedback' && state.feedback && action.index > state.feedback.index) {
        return { ...state, pendingQuestion: nextQuestion };
      }

      return {
        ...state,
        phase: 'question',
        question: nextQuestion,
        selectedOption: null,
        feedback: null,
        awaitingNext: false,
        pendingQuestion: null,
        error: null,
      };
    }

    case 'answer.result': {
      const dot: LocalDot = action.correct ? 'correct' : action.timedOut ? 'timeout' : 'wrong';
      const yourDots = applyYourDot(state.yourDots, action.index, dot);

      // Result for the currently displayed question -> enter feedback state.
      if (state.question && state.question.index === action.index) {
        const chosenOption = action.timedOut ? null : state.selectedOption;
        return {
          ...state,
          phase: 'feedback',
          yourDots,
          feedback: {
            index: action.index,
            chosenOption,
            correct: action.correct,
            timedOut: action.timedOut,
          },
          awaitingNext: false,
        };
      }

      // Result arrived for another index (e.g. buffered question timed out) — still record the dot.
      return { ...state, yourDots };
    }

    case 'rival.progress':
      return {
        ...state,
        rivalProgress: {
          answered: action.answered,
          results: action.results,
          connected: action.connected,
        },
      };

    case 'match.state': {
      const count = action.questionCount || DEFAULT_QUESTION_COUNT;
      const missedQuestions: number[] = [];

      const mergedDots: LocalDot[] = Array.from({ length: count }, (_, i) => {
        const serverVal = action.yourResults[i] ?? null;
        const prev = state.yourDots[i] ?? null;
        if (serverVal === true) return 'correct';
        if (serverVal === false) {
          // If we knew it was a wrong answer before disconnecting, preserve 'wrong';
          // otherwise it ran out while offline -> 'timeout' (grey dot).
          if (prev === 'wrong') return 'wrong';
          if (prev === null) missedQuestions.push(i + 1);
          return 'timeout';
        }
        return null;
      });

      const hasActiveQuestion = action.question !== null;
      const resumeQuestion = hasActiveQuestion ? action.question!.index + 1 : null;

      return {
        ...state,
        phase: hasActiveQuestion ? 'question' : 'waiting',
        matchId: action.matchId,
        mode: action.mode,
        category: action.category,
        questionCount: count,
        you: action.you,
        rival: action.rival,
        yourDots: mergedDots,
        rivalProgress: action.rivalProgress,
        question: action.question,
        selectedOption: null,
        feedback: null,
        awaitingNext: false,
        pendingQuestion: null,
        pendingWaiting: false,
        pendingEnd: null,
        reconnectedNotice:
          missedQuestions.length > 0
            ? { missedQuestions, resumeQuestion }
            : state.reconnectedNotice,
        error: null,
      };
    }

    case 'match.waiting':
      if (state.mode === 'SOLO') return state;
      if (state.phase === 'feedback') {
        return { ...state, pendingWaiting: true };
      }
      return {
        ...state,
        phase: 'waiting',
        question: null,
        selectedOption: null,
        feedback: null,
        awaitingNext: false,
      };

    case 'match.end': {
      const end = extractMatchEnd(action);
      if (state.phase === 'feedback') {
        return { ...state, pendingEnd: end };
      }
      return {
        ...state,
        phase: 'result',
        matchId: end.matchId,
        mode: end.mode,
        category: end.category,
        rival: end.rival,
        result: end,
        question: null,
        selectedOption: null,
        feedback: null,
        awaitingNext: false,
        pendingQuestion: null,
        pendingWaiting: false,
        pendingEnd: null,
        reconnectedNotice: null,
        error: null,
      };
    }

    case 'error':
      return {
        ...state,
        error: { code: action.code, message: action.message },
      };

    default:
      return state;
  }
}

export function getYourScore(state: DuelMatchState): number {
  return state.yourDots.filter((d) => d === 'correct').length;
}

export function getRivalScore(state: DuelMatchState): number {
  if (!state.rivalProgress) return 0;
  return state.rivalProgress.results.filter((d) => d === true).length;
}

export type IndexedReviewItem = ReviewItem & { questionNumber: number; isCorrect: boolean };

/** Splits review items into mistakes first (preserving original 1-based question numbers), then correct. */
export function partitionReview(review: ReviewItem[]): {
  mistakes: IndexedReviewItem[];
  correct: IndexedReviewItem[];
} {
  const mistakes: IndexedReviewItem[] = [];
  const correct: IndexedReviewItem[] = [];
  review.forEach((item, i) => {
    const isCorrect = item.yourOption !== null && item.yourOption === item.correctOption;
    const indexed: IndexedReviewItem = { ...item, questionNumber: i + 1, isCorrect };
    if (isCorrect) correct.push(indexed);
    else mistakes.push(indexed);
  });
  return { mistakes, correct };
}
