import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { OnboardingAnswers, UserProfile } from '@/types/onboarding';

type OnboardingState = {
  /** False until we know from the backend whether this user has been through onboarding. */
  loaded: boolean;
  /** True once the user finished or skipped onboarding. */
  done: boolean;
  /** Personalisation answers (empty when skipped). */
  answers: OnboardingAnswers;
  /** Saves the answers on the user's profile. `skipped` = the user chose not to answer. */
  complete: (answers: OnboardingAnswers, skipped: boolean) => void;
  /** Demo helper: clears the saved answers and the completed flag so onboarding shows again. */
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

const EMPTY_ANSWERS: OnboardingAnswers = { goals: [] };

const profilePath = `/api/users/${encodeURIComponent(USER_ID)}/profile`;
const onboardingPath = `${profilePath}/onboarding`;

/** Profile writes run in order, so a reset's DELETE can never land after the next onboarding's PUT. */
let profileWrites: Promise<unknown> = Promise.resolve();
/** Resolves once every queued profile write has landed (or failed). */
export const profileWritesSettled = () => profileWrites;
function writeProfile(init: RequestInit, failure: string) {
  profileWrites = profileWrites.then(() => api(onboardingPath, init)).catch((e: unknown) => console.warn(failure, e));
}

function toAnswers(p: UserProfile): OnboardingAnswers {
  return {
    lifeStage: p.lifeStage ?? undefined,
    goals: p.goals,
    experience: p.experience ?? undefined,
  };
}

/**
 * Onboarding state for the signed-in user, stored on their profile in the backend.
 * Onboarding shows once: `onboardingCompleted` on the profile is set when the user finishes or skips it,
 * and from then on the app opens straight on Learn.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ loaded: false, done: false, answers: EMPTY_ANSWERS });

  useEffect(() => {
    let cancelled = false;
    api<UserProfile>(profilePath)
      .then(
        (p) =>
          !cancelled &&
          setState({
            loaded: true,
            // The profile's flag decides: onboarding shows until the user finished or skipped it once.
            done: p.onboardingCompleted,
            answers: p.onboardingCompleted ? toAnswers(p) : EMPTY_ANSWERS,
          }),
      )
      .catch((e: unknown) => {
        if (cancelled) return;
        // Backend unreachable: show onboarding rather than block the app.
        console.warn('Could not load profile', e);
        setState((s) => ({ ...s, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const complete = useCallback((answers: OnboardingAnswers, skipped: boolean) => {
    // Move on right away; the save runs in the background so a slow network never blocks the user.
    setState({ loaded: true, done: true, answers });
    writeProfile({ method: 'PUT', body: JSON.stringify({ ...answers, skipped }) }, 'Could not save onboarding answers');
  }, []);

  const reset = useCallback(() => {
    setState({ loaded: true, done: false, answers: EMPTY_ANSWERS });
    writeProfile({ method: 'DELETE' }, 'Could not reset profile');
  }, []);

  const value = useMemo(() => ({ ...state, complete, reset }), [state, complete, reset]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
