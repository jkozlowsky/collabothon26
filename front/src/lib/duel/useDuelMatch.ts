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
  AnswerRequest,
  AnswerResult,
  CategorySlug,
  DuelMode,
  Lang,
  MatchEnd,
  MatchStart,
  MatchState,
  ServerMessage,
  StartMatchRequest,
} from '@/types/duel';

const FEEDBACK_AUTO_ADVANCE_MS = 3000;
const COUNTDOWN_TICK_MS = 250;
const POLL_INTERVAL_MS = 1000;
/** A human match shows "Finding a rival…" for a moment so the search reads as real. */
const FINDING_RIVAL_MS = 1500;
const MAX_POLL_FAILURES = 3;
const ACTIVE_MATCH_STORAGE_KEY = `fq_duel_active_match:${USER_ID}`;

type StoredActiveMatch = {
  matchId: number;
  category: CategorySlug;
  mode: DuelMode;
  yourDots: LocalDot[];
};

function readStoredMatch(category: CategorySlug, mode: DuelMode): StoredActiveMatch | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredActiveMatch>;
    if (
      typeof parsed.matchId === 'number' &&
      Number.isFinite(parsed.matchId) &&
      parsed.category === category &&
      parsed.mode === mode
    ) {
      return {
        matchId: parsed.matchId,
        category: parsed.category,
        mode: parsed.mode,
        yourDots: Array.isArray(parsed.yourDots) ? (parsed.yourDots as LocalDot[]) : [],
      };
    }
  } catch {
    // Ignore storage errors (private mode / non-web).
  }
  return null;
}

function writeStoredMatch(data: StoredActiveMatch): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

export function clearStoredActiveMatch(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export type UseDuelMatchParams = {
  category: CategorySlug;
  mode: DuelMode;
  /** When set, loads a finished match result via REST instead of starting a match. */
  reloadMatchId?: number;
  lang?: Lang;
};

export type UseDuelMatchResult = {
  state: DuelMatchState;
  /** Seconds remaining on the current question, derived from the server's deadline timestamp. */
  secondsLeft: number;
  selectOption: (option: number) => void;
  nextQuestion: () => void;
  leave: () => void;
  playAgain: () => void;
  /** After a failed request: resume the match by id, or start over when there is none to resume. */
  retry: () => void;
  dismissReconnectBanner: () => void;
};

const userQuery = (lang: Lang) => `userId=${encodeURIComponent(USER_ID)}&lang=${lang}`;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorMessage(err: unknown): ServerMessage {
  if (err instanceof ApiError && err.status === 404) {
    return { type: 'error', code: 'MATCH_NOT_FOUND', message: 'This match is no longer available.' };
  }
  const message = err instanceof Error ? err.message : 'Request failed';
  return { type: 'error', code: 'REQUEST_FAILED', message };
}

export function useDuelMatch({
  category,
  mode,
  reloadMatchId,
  lang = 'en',
}: UseDuelMatchParams): UseDuelMatchResult {
  const [sessionKey, setSessionKey] = useState(0);
  const [state, dispatch] = useReducer(duelReducer, undefined, () => {
    const stored = !reloadMatchId ? readStoredMatch(category, mode) : null;
    return createInitialDuelState(
      category,
      mode,
      stored ? { matchId: stored.matchId, yourDots: stored.yourDots } : undefined,
    );
  });
  const [secondsLeft, setSecondsLeft] = useState(40);

  // The poll and the answer handler read the latest state without being recreated on every change.
  const latestRef = useRef(state);
  useEffect(() => {
    latestRef.current = state;
  }, [state]);
  // Bumped whenever an answer is sent, so a poll that started earlier cannot overwrite what the answer produced.
  const answerEpochRef = useRef(0);
  const pollFailuresRef = useRef(0);
  const startRef = useRef<{ key: number; promise: Promise<MatchStart> } | null>(null);

  // Persist active matchId + local dots in sessionStorage so a page reload mid-match resumes cleanly.
  useEffect(() => {
    if (state.error?.code === 'MATCH_NOT_FOUND') {
      clearStoredActiveMatch();
      return;
    }
    if (state.matchId !== null && state.phase !== 'result') {
      writeStoredMatch({
        matchId: state.matchId,
        category: state.category,
        mode: state.mode,
        yourDots: state.yourDots,
      });
    }
  }, [state.matchId, state.phase, state.category, state.mode, state.yourDots, state.error?.code]);

  const loadResult = useCallback(
    async (matchId: number) => {
      const result = await api<MatchEnd>(`/api/duel/matches/${matchId}?${userQuery(lang)}`);
      clearStoredActiveMatch();
      dispatch({ type: 'match.end', ...result });
    },
    [lang],
  );

  /** Fetch the match snapshot and feed it to the reducer, or load the result if it already finished. */
  const resume = useCallback(
    async (matchId: number) => {
      const snapshot = await api<MatchState>(`/api/duel/matches/${matchId}/state?${userQuery(lang)}`);
      if (snapshot.finished) {
        await loadResult(matchId);
        return;
      }
      dispatch({ type: 'match.state', ...snapshot });
    },
    [lang, loadResult],
  );

  // Finished match opened by id (/duel/match?matchId=...)
  useEffect(() => {
    if (!reloadMatchId || sessionKey > 0) return;
    let cancelled = false;
    api<MatchEnd>(`/api/duel/matches/${reloadMatchId}?${userQuery(lang)}`)
      .then((res) => {
        if (!cancelled) dispatch({ type: 'rest.matchEnd', result: res });
      })
      .catch((err: Error) => {
        if (!cancelled) dispatch({ type: 'error', code: 'LOAD_FAILED', message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadMatchId, lang, sessionKey]);

  // Start a match, or resume the one remembered for this tab.
  useEffect(() => {
    if (reloadMatchId && sessionKey === 0) return;
    let cancelled = false;
    const resumeId = latestRef.current.matchId;

    if (resumeId !== null) {
      resume(resumeId).catch((err: unknown) => {
        if (!cancelled) dispatch(errorMessage(err));
      });
      return () => {
        cancelled = true;
      };
    }

    // One request per session even when React runs this effect twice (StrictMode).
    if (startRef.current?.key !== sessionKey) {
      const body: StartMatchRequest = { userId: USER_ID, category, mode, lang };
      const request = api<MatchStart>('/api/duel/matches', { method: 'POST', body: JSON.stringify(body) });
      const promise =
        mode === 'HUMAN' ? Promise.all([request, wait(FINDING_RIVAL_MS)]).then(([start]) => start) : request;
      startRef.current = { key: sessionKey, promise };
    }
    startRef.current.promise
      .then((start) => {
        if (cancelled) return;
        const { question, ...match } = start;
        dispatch({ type: 'match.start', ...match });
        dispatch({ type: 'question', ...question });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [category, mode, lang, sessionKey, reloadMatchId, resume]);

  // Poll the snapshot every second while playing or waiting: it carries the rival's progress, resolves the
  // server-side question timeouts and tells us when the match is settled.
  const polling =
    state.matchId !== null &&
    state.error === null &&
    (state.phase === 'question' || state.phase === 'feedback' || state.phase === 'waiting');
  const matchId = state.matchId;
  useEffect(() => {
    if (!polling || matchId === null) return;
    let cancelled = false;
    const tick = async () => {
      const epoch = answerEpochRef.current;
      try {
        const snapshot = await api<MatchState>(`/api/duel/matches/${matchId}/state?${userQuery(lang)}`);
        if (cancelled || epoch !== answerEpochRef.current) return;
        pollFailuresRef.current = 0;
        if (snapshot.finished) {
          await loadResult(matchId);
          return;
        }
        if (snapshot.rivalProgress) dispatch({ type: 'rival.progress', ...snapshot.rivalProgress });

        const local = latestRef.current;
        if (local.phase !== 'question' || !local.question || local.selectedOption !== null) return;
        const localIndex = local.question.index;
        const serverIndex = snapshot.question?.index ?? null;
        if (serverIndex === localIndex) return;
        if (serverIndex === localIndex + 1 || (serverIndex === null && localIndex === local.questionCount - 1)) {
          // The question ran out while we were looking at it.
          dispatch({ type: 'answer.result', index: localIndex, correct: false, timedOut: true });
          if (snapshot.question) dispatch({ type: 'question', ...snapshot.question });
          else dispatch({ type: 'match.waiting' });
        } else {
          dispatch({ type: 'match.state', ...snapshot });
        }
      } catch (err) {
        if (cancelled) return;
        pollFailuresRef.current += 1;
        if ((err instanceof ApiError && err.status === 404) || pollFailuresRef.current >= MAX_POLL_FAILURES) {
          dispatch(errorMessage(err));
        }
      }
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [polling, matchId, lang, loadResult]);

  // Countdown drawn directly from the server's deadline timestamp (no local drift).
  const deadline = state.question?.deadline ?? null;
  const questionActive = state.phase === 'question' || state.phase === 'feedback';

  useEffect(() => {
    if (!questionActive || deadline === null) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    if (state.phase === 'feedback') return;
    const id = setInterval(update, COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [deadline, questionActive, state.phase]);

  // Auto-advance from feedback screen after 3 s (user can also tap "Next question" sooner).
  const feedbackIndex = state.feedback?.index ?? null;
  useEffect(() => {
    if (state.phase !== 'feedback' || feedbackIndex === null) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'ui.advance' });
    }, FEEDBACK_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [state.phase, feedbackIndex]);

  const selectOption = useCallback(
    (option: number) => {
      if (state.phase !== 'question' || state.selectedOption !== null) return;
      if (state.matchId === null || !state.question) return;
      const { matchId: id, question } = state;
      dispatch({ type: 'ui.selectOption', option });
      answerEpochRef.current += 1;
      const body: AnswerRequest = { userId: USER_ID, index: question.index, option };
      api<AnswerResult>(`/api/duel/matches/${id}/answers`, { method: 'POST', body: JSON.stringify(body) })
        .then(async (res) => {
          dispatch({ type: 'answer.result', index: res.index, correct: res.correct, timedOut: res.timedOut });
          if (res.rivalProgress) dispatch({ type: 'rival.progress', ...res.rivalProgress });
          if (res.nextQuestion) {
            dispatch({ type: 'question', ...res.nextQuestion });
          } else if (res.finished) {
            await loadResult(id);
          } else {
            dispatch({ type: 'match.waiting' });
          }
        })
        .catch((err: unknown) => dispatch(errorMessage(err)));
    },
    [state, loadResult],
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'ui.advance' });
  }, []);

  const leave = useCallback(() => {
    clearStoredActiveMatch();
  }, []);

  const playAgain = useCallback(() => {
    clearStoredActiveMatch();
    startRef.current = null;
    dispatch({ type: 'ui.reset', category, mode });
    setSessionKey((k) => k + 1);
  }, [category, mode]);

  const retry = useCallback(() => {
    const current = latestRef.current;
    if (current.matchId === null || current.error?.code === 'MATCH_NOT_FOUND') {
      playAgain();
      return;
    }
    const id = current.matchId;
    pollFailuresRef.current = 0;
    answerEpochRef.current += 1;
    dispatch({ type: 'ui.clearError' });
    resume(id).catch((err: unknown) => dispatch(errorMessage(err)));
  }, [playAgain, resume]);

  const dismissReconnectBanner = useCallback(() => {
    dispatch({ type: 'ui.dismissReconnectBanner' });
  }, []);

  return {
    state,
    secondsLeft,
    selectOption,
    nextQuestion,
    leave,
    playAgain,
    retry,
    dismissReconnectBanner,
  };
}
