import { router, usePathname, type Href } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useOnboarding } from '@/hooks/useOnboarding';

/** Where to go once onboarding finishes. Module state is fine: one app, one onboarding at a time. */
let pendingTarget: Href | null = null;

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

/** Opens the Map focused on a story/lesson id (Map may ignore it until stories exist). */
export function useOpenLearnFocus() {
  const open = useOpenLearn();
  return useCallback((focus: string) => open({ pathname: '/map', params: { focus } }), [open]);
}

/** Closes the screen on top of the bank and goes to `target`. */
function closeAndGo(target: Href) {
  if (router.canGoBack()) router.back();
  router.navigate(target);
}

/**
 * Mount once inside the main layout. Onboarding is a plain stack screen on top of the bank (not a
 * protected one: removing a protected screen rebuilds the stack and loses the bank's tab and scroll),
 * so when it completes this closes it and moves on to /categorizing (the quick check and the path), which then calls continueToLearn.
 */
export function useResumeLearnAfterOnboarding() {
  const { done } = useOnboarding();
  const pathname = usePathname();
  useEffect(() => {
    // No pending target = onboarding was opened from Profile to edit answers; it closes itself.
    if (done && pathname === '/onboarding' && pendingTarget) closeAndGo('/categorizing');
  }, [done, pathname]);
}

/** Leaves /categorizing or the summary for the Learn screen the user opened onboarding from (the Map by default). */
export function continueToLearn() {
  const target = pendingTarget ?? '/map';
  pendingTarget = null;
  closeAndGo(target);
}
