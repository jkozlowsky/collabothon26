import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/user';
import type { Intake, OnboardingAnswers, UserProfile } from '@/types/onboarding';

type OnboardingState = {
  /** False until we know from the backend whether this user has been through onboarding. */
  loaded: boolean;
  /** True once the user finished onboarding. */
  done: boolean;
  /** Personalisation answers. */
  answers: OnboardingAnswers;
  /** What the survey hands to /categorizing; null when the answers were edited from Profile, or after a reload. */
  intake: Intake | null;
  /** Saves the answers on the user's profile. `intake` stays in memory. */
  complete: (answers: OnboardingAnswers, intake?: Intake) => void;
  /** Demo helper: clears the saved answers and the completed flag so onboarding shows again. */
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

const EMPTY_ANSWERS: OnboardingAnswers = { interests: [] };

/** The last queued profile write. At module scope because code outside React waits for it (see profileWritesSettled). */
let lastProfileWrite: Promise<unknown> = Promise.resolve();
/** Resolves once every queued profile write has landed (or failed). */
export const profileWritesSettled = () => lastProfileWrite;
export function resetProfileWrites() {
  lastProfileWrite = Promise.resolve();
}

// Writes are serialised: each starts when the one before has settled, so a reset's DELETE can never land after the next onboarding's PUT.
function enqueueProfileWrite(userId: string, init: RequestInit, failure: string) {
  const onboardingPath = `/api/users/${encodeURIComponent(userId)}/profile/onboarding`;
  lastProfileWrite = lastProfileWrite
    .then(() => api(onboardingPath, init))
    .catch((e: unknown) => console.warn(failure, e));
}

function toAnswers(p: UserProfile): OnboardingAnswers {
  return {
    lifeStage: p.lifeStage ?? undefined,
    interests: p.interests,
    experience: p.experience ?? undefined,
  };
}

/**
 * Onboarding state for the signed-in user, stored on their profile in the backend.
 * Onboarding shows once: `onboardingCompleted` on the profile is set when the user finishes it,
 * and from then on the app opens straight on Learn.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { userId } = useCurrentUser();
  const profilePath = `/api/users/${encodeURIComponent(userId)}/profile`;
  const [state, setState] = useState<Omit<OnboardingState, 'complete' | 'reset'>>({ loaded: false, done: false, answers: EMPTY_ANSWERS, intake: null });

  useEffect(() => {
    let cancelled = false;
    api<UserProfile>(profilePath)
      .then((p) => {
        if (cancelled) return;
        setState({
          loaded: true,
          intake: null,
          // The profile's flag decides: onboarding shows until the user finished it once.
          done: p.onboardingCompleted,
          answers: p.onboardingCompleted ? toAnswers(p) : EMPTY_ANSWERS,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Backend unreachable: show onboarding rather than block the app.
        console.warn('Could not load profile', e);
        setState((s) => ({ ...s, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [profilePath]);

  const complete = useCallback((answers: OnboardingAnswers, intake: Intake | null = null) => {
    // Move on right away; the save runs in the background so a slow network never blocks the user.
    setState({ loaded: true, done: true, answers, intake });
    enqueueProfileWrite(userId, { method: 'PUT', body: JSON.stringify({ ...answers, skipped: false }) }, 'Could not save onboarding answers');
  }, [userId]);

  const reset = useCallback(() => {
    setState({ loaded: true, done: false, answers: EMPTY_ANSWERS, intake: null });
    enqueueProfileWrite(userId, { method: 'DELETE' }, 'Could not reset profile');
  }, [userId]);

  const value = useMemo(() => ({ ...state, complete, reset }), [state, complete, reset]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
