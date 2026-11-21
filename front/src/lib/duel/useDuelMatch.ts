import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import {
  createInitialDuelState,
  duelReducer,
  type DuelMatchState,
  type LocalDot,
} from '@/lib/duel/reducer';
import { USER_ID } from '@/lib/user';
import type {
  AnswerResult,
  DuelAnswer,
  DuelMode,
  MatchEnd,
  MatchStart,
  MatchState,
  StartMatchRequest,
} from '@/types/duel';

const FEEDBACK_AUTO_ADVANCE_MS = 3000;
const COUNTDOWN_TICK_MS = 250;
const POLL_INTERVAL_MS = 1000;
const FINDING_RIVAL_MS = 1500;
const ACTIVE_MATCH_STORAGE_KEY = `fq_duel_active_match:${USER_ID}`;

type StoredActiveMatch = {
  matchId: number;
  categories: string[];
  mode: DuelMode;
  yourDots: LocalDot[];
};

function readStoredMatch(categories: string[], mode: DuelMode): StoredActiveMatch | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredActiveMatch>;
    if (
      typeof parsed.matchId === 'number' &&
      Number.isFinite(parsed.matchId) &&
      parsed.mode === mode
    ) {
      return {
        matchId: parsed.matchId,
        categories: Array.isArray(parsed.categories) ? parsed.categories : categories,
        mode: parsed.mode,
        yourDots: Array.isArray(parsed.yourDots) ? (parsed.yourDots as LocalDot[]) : [],
      };
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function writeStoredMatch(data: StoredActiveMatch): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredActiveMatch(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export type UseDuelMatchParams = {
  categories: string[];
  mode: DuelMode;
  reloadMatchId?: number;
};

export type UseDuelMatchResult = {
  state: DuelMatchState;
  secondsLeft: number;
  submitAnswer: (answer: DuelAnswer) => void;
  nextQuestion: () => void;
  leave: () => void;
  retry: () => void;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useDuelMatch({
  categories,
  mode,
  reloadMatchId,
}: UseDuelMatchParams): UseDuelMatchResult {
  const [sessionKey, setSessionKey] = useState(0);
  const [state, dispatch] = useReducer(duelReducer, undefined, () => {
    const stored = !reloadMatchId ? readStoredMatch(categories, mode) : null;
    return createInitialDuelState(
      categories,
      mode,
      stored ? { matchId: stored.matchId, yourDots: stored.yourDots } : undefined,
    );
  });
  const [secondsLeft, setSecondsLeft] = useState(30);

  const latestRef = useRef(state);
  useEffect(() => {
    latestRef.current = state;
  }, [state]);

  const answeringRef = useRef(false);

  // Persist active match in sessionStorage
  useEffect(() => {
    if (state.error?.code === 'MATCH_NOT_FOUND') {
      clearStoredActiveMatch();
      return;
    }
    if (state.matchId !== null && state.phase !== 'result') {
      writeStoredMatch({
        matchId: state.matchId,
        categories: state.categories,
        mode: state.mode,
        yourDots: state.yourDots,
      });
    } else if (state.phase === 'result') {
      clearStoredActiveMatch();
    }
  }, [state.matchId, state.categories, state.mode, state.yourDots, state.phase, state.error]);

  const fetchResult = useCallback(async (matchId: number) => {
    try {
      const res = await api<MatchEnd>(`/api/duel/matches/${matchId}?userId=${encodeURIComponent(USER_ID)}`);
      dispatch({ type: 'match.end', result: res });
      clearStoredActiveMatch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Not finished yet
        return;
      }
      dispatch({
        type: 'error',
        code: 'RESULT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to load result',
      });
    }
  }, []);

  // Match initialization / start / resume
  useEffect(() => {
    let cancelled = false;

    async function initMatch() {
      // 1. Resuming by reloadMatchId
      if (reloadMatchId) {
        try {
          const matchState = await api<MatchState>(
            `/api/duel/matches/${reloadMatchId}/state?userId=${encodeURIComponent(USER_ID)}`,
          );
          if (cancelled) return;
          dispatch({ type: 'match.state', state: matchState });
          if (matchState.finished) {
            await fetchResult(reloadMatchId);
          }
        } catch (err) {
          if (cancelled) return;
          const is404 = err instanceof ApiError && err.status === 404;
          dispatch({
            type: 'error',
            code: is404 ? 'MATCH_NOT_FOUND' : 'RESUME_FAILED',
            message: is404 ? 'Match not found or expired.' : 'Failed to resume match.',
          });
        }
        return;
      }

      // 2. Resuming stored match
      const stored = readStoredMatch(categories, mode);
      if (stored) {
        try {
          const matchState = await api<MatchState>(
            `/api/duel/matches/${stored.matchId}/state?userId=${encodeURIComponent(USER_ID)}`,
          );
          if (cancelled) return;
          dispatch({ type: 'match.state', state: matchState });
          if (matchState.finished) {
            await fetchResult(stored.matchId);
          }
          return;
        } catch {
          clearStoredActiveMatch();
        }
      }

      // 3. Starting new match
      if (mode === 'HUMAN') {
        await wait(FINDING_RIVAL_MS);
      }
      if (cancelled) return;

      try {
        const body: StartMatchRequest = {
          userId: USER_ID,
          categories,
          mode,
        };
        const start = await api<MatchStart>('/api/duel/matches', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (cancelled) return;
        dispatch({ type: 'match.start', payload: start });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          type: 'error',
          code: 'START_FAILED',
          message: err instanceof Error ? err.message : 'Failed to start match.',
        });
      }
    }

    initMatch();

    return () => {
      cancelled = true;
    };
  }, [categories, mode, reloadMatchId, sessionKey, fetchResult]);

  // Submit answer
  const submitAnswer = useCallback(
    async (answer: DuelAnswer) => {
      const current = latestRef.current;
      if (current.phase !== 'question' || !current.question || current.matchId === null) {
        return;
      }
      if (answeringRef.current) return;
      answeringRef.current = true;

      const qIndex = current.question.index;
      try {
        const payload = {
          userId: USER_ID,
          index: qIndex,
          ...answer,
        };
        const result = await api<AnswerResult>(`/api/duel/matches/${current.matchId}/answers`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch({
          type: 'answer.result',
          index: result.index,
          correct: result.correct,
          timedOut: result.timedOut,
          nextQuestion: result.nextQuestion,
          rivalProgress: result.rivalProgress,
          yourFinal: result.yourFinal,
          finished: result.finished,
        });

        if (result.finished) {
          fetchResult(current.matchId);
        }
      } catch (err) {
        dispatch({
          type: 'error',
          code: 'ANSWER_FAILED',
          message: err instanceof Error ? err.message : 'Failed to submit answer.',
        });
      } finally {
        answeringRef.current = false;
      }
    },
    [fetchResult],
  );

  // Auto advance after feedback
  useEffect(() => {
    if (state.phase !== 'feedback') return;
    const timer = setTimeout(() => {
      dispatch({ type: 'ui.advance' });
    }, FEEDBACK_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  // Countdown timer on active question
  useEffect(() => {
    if (state.phase !== 'question' || !state.question) return;
    const deadline = state.question.deadline;

    function tick() {
      const remainingMs = deadline - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(sec);
      if (remainingMs <= 0) {
        // Timeout
        submitAnswer({ option: -1 });
      }
    }

    tick();
    const interval = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [state.phase, state.question, submitAnswer]);

  // Polling on waiting screen
  useEffect(() => {
    if (state.phase !== 'waiting' || state.matchId === null || state.finished) return;

    let active = true;
    const matchId = state.matchId;

    async function poll() {
      try {
        const ms = await api<MatchState>(`/api/duel/matches/${matchId}/state?userId=${encodeURIComponent(USER_ID)}`);
        if (!active) return;
        dispatch({ type: 'match.state', state: ms });
        if (ms.finished) {
          await fetchResult(matchId);
        }
      } catch {
        // Polling failure, will retry next interval
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [state.phase, state.matchId, state.finished, fetchResult]);

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'ui.advance' });
  }, []);

  const leave = useCallback(() => {
    clearStoredActiveMatch();
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'ui.clearError' });
    setSessionKey((k) => k + 1);
  }, []);

  return {
    state,
    secondsLeft,
    submitAnswer,
    nextQuestion,
    leave,
    retry,
  };
}
