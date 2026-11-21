import { router, type Href } from 'expo-router';
import { useCallback } from 'react';

import { useOnboarding } from '@/hooks/useOnboarding';

/** Where to go once onboarding finishes. Module state is fine: one app, one onboarding at a time. */
let pendingTarget: Href | null = null;
/** Set when onboarding hands over to the Map: the globe plays the arrival flight once. */
let arrivalPending = false;

/** True once after onboarding finished; the Map reads it to fly the plane in. */
export function takeArrival() {
  const pending = arrivalPending;
  arrivalPending = false;
  return pending;
}

/**
 * Opens the Atlas module from the bank. The first time (onboarding not done yet) the
 * onboarding flow opens instead, and the user lands on `target` when it is finished.
 *
 * @returns open(target, go) — `go` performs the switch when onboarding is done (defaults to navigating to `target`).
 */
export function useOpenLearn() {
  const { loaded, done } = useOnboarding();
  return useCallback(
    (target: Href = '/map', go: () => void = () => router.navigate(target)) => {
      // Until the profile has loaded nobody knows whether onboarding is behind this user.
      if (!loaded) return;
      if (done) return go();
      pendingTarget = target;
      router.push('/onboarding');
    },
    [loaded, done],
  );
}

/** Closes the screen on top of the bank and goes to `target`. */
function closeAndGo(target: Href) {
  if (router.canGoBack()) router.back();
  router.navigate(target);
}

/**
 * Closes onboarding (a plain stack screen on top of the bank) and opens /categorizing, the quick check
 * and the path, which then calls continueToLearn. Call it only once `done` is true: /categorizing is
 * behind the onboarding guard. A reload on /onboarding loses `pendingTarget`, so Learn falls back to the Map.
 */
export function leaveOnboardingForCheck() {
  pendingTarget ??= '/map';
  closeAndGo('/categorizing');
}

/** Leaves /categorizing or the summary for the Learn screen the user opened onboarding from (the Map by default). */
export function continueToLearn() {
  const target = pendingTarget ?? '/map';
  pendingTarget = null;
  arrivalPending = true;
  closeAndGo(target);
}
