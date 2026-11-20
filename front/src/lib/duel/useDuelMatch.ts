import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { api } from '@/lib/api';
import {
  createInitialDuelState,
  duelReducer,
  type DuelMatchState,
  type LocalDot,
} from '@/lib/duel/reducer';
import { createDuelSocket, resolveDuelWsUrl, type DuelSocketClient } from '@/lib/duel/socket';
import { USER_ID } from '@/lib/user';
import type { CategorySlug, DuelMode, Lang, MatchEnd } from '@/types/duel';

const FEEDBACK_AUTO_ADVANCE_MS = 3000;
const COUNTDOWN_TICK_MS = 250;
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
  /** When set, loads a finished match result via REST instead of opening a live socket. */
  reloadMatchId?: number;
  lang?: Lang;
};

export type UseDuelMatchResult = {
  state: DuelMatchState;
  /** Seconds remaining on the current question, derived from the server's deadline timestamp. */
  secondsLeft: number;
  selectOption: (option: number) => void;
  nextQuestion: () => void;
  acceptBot: () => void;
  keepWaiting: () => void;
  leave: () => void;
  playAgain: () => void;
  dismissReconnectBanner: () => void;
};

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

  const socketRef = useRef<DuelSocketClient | null>(null);
  // Keep latest matchId / phase accessible in reconnect callbacks without recreating the socket.
  const latestRef = useRef({
    matchId: state.matchId,
    phase: state.phase,
    category,
    mode,
  });
  useEffect(() => {
    latestRef.current = { matchId: state.matchId, phase: state.phase, category, mode };
  }, [state.matchId, state.phase, category, mode]);

  // Persist active matchId + local dots in sessionStorage so a page reload mid-match resumes cleanly.
  useEffect(() => {
    if (state.error?.code === 'MATCH_NOT_FOUND') {
      clearStoredActiveMatch();
      return;
    }
    if (state.matchId !== null) {
      writeStoredMatch({
        matchId: state.matchId,
        category: state.category,
        mode: state.mode,
        yourDots: state.yourDots,
      });
    }
  }, [state.matchId, state.category, state.mode, state.yourDots, state.error?.code]);

  // Optional REST reload for a finished match (/duel/match?matchId=...)
  useEffect(() => {
    if (!reloadMatchId || sessionKey > 0) return;
    let cancelled = false;
    api<MatchEnd>(
      `/api/duel/matches/${reloadMatchId}?userId=${encodeURIComponent(USER_ID)}&lang=${lang}`,
    )
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

  // Live STOMP lifecycle + auto-reconnect with match.resume
  useEffect(() => {
    if (reloadMatchId && sessionKey === 0) return;

    const url = resolveDuelWsUrl();
    dispatch({ type: 'socket.status', status: 'connecting' });

    const client = createDuelSocket({
      url,
      userId: USER_ID,
      lang,
      onOpen: () => {
        dispatch({ type: 'socket.status', status: 'open' });
        const { matchId, phase, category: cat, mode: m } = latestRef.current;
        if (matchId !== null && phase !== 'result') {
          client.send({ type: 'match.resume', matchId });
        } else if (phase === 'matchmaking') {
          client.send({ type: 'queue.join', category: cat, mode: m });
        }
      },
      onMessage: (message) => {
        dispatch(message);
      },
      onDisconnect: () => {
        if (latestRef.current.phase !== 'result') {
          dispatch({ type: 'socket.status', status: 'reconnecting' });
        }
      },
    });

    socketRef.current = client;

    return () => {
      client.close();
      socketRef.current = null;
    };
  }, [category, mode, lang, sessionKey, reloadMatchId]);

  // Close socket once the match has finished so we don't keep an idle connection open.
  useEffect(() => {
    if (state.phase === 'result' && socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      dispatch({ type: 'socket.status', status: 'closed' });
    }
  }, [state.phase]);

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
      dispatch({ type: 'ui.selectOption', option });
      socketRef.current?.send({
        type: 'answer',
        matchId: state.matchId,
        index: state.question.index,
        option,
      });
    },
    [state.phase, state.selectedOption, state.matchId, state.question],
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'ui.advance' });
  }, []);

  const acceptBot = useCallback(() => {
    socketRef.current?.send({ type: 'queue.acceptBot' });
  }, []);

  const keepWaiting = useCallback(() => {
    dispatch({ type: 'ui.dismissBotOffer' });
  }, []);

  const leave = useCallback(() => {
    clearStoredActiveMatch();
    if (latestRef.current.phase === 'matchmaking') {
      socketRef.current?.send({ type: 'queue.leave' });
    }
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const playAgain = useCallback(() => {
    clearStoredActiveMatch();
    socketRef.current?.close();
    socketRef.current = null;
    latestRef.current = { matchId: null, phase: 'matchmaking', category, mode };
    dispatch({ type: 'ui.reset', category, mode });
    setSessionKey((k) => k + 1);
  }, [category, mode]);

  const dismissReconnectBanner = useCallback(() => {
    dispatch({ type: 'ui.dismissReconnectBanner' });
  }, []);

  return {
    state,
    secondsLeft,
    selectOption,
    nextQuestion,
    acceptBot,
    keepWaiting,
    leave,
    playAgain,
    dismissReconnectBanner,
  };
}
