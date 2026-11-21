import { router, usePathname, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { useOnboarding } from '@/hooks/useOnboarding';

/** Where to go once onboarding finishes. Module state is fine: one app, one onboarding at a time. */
let pendingTarget: Href | null = null;

/** Finance Quest tabs; none of them opens before onboarding was finished or skipped. */
const LEARN_PATHS = ['/map', '/glossary', '/duel', '/profile'];

/**
 * Opens the Finance Quest module from the bank. The first time (onboarding not done yet) the
 * onboarding flow opens instead, and the user lands on `target` when it is finished.
 *
 * @returns open(target, go) — `go` performs the switch when onboarding is done (defaults to navigating to `target`).
 */
export function useOpenLearn() {
  const { done } = useOnboarding();
  return useCallback(
    (target: Href = '/map', go: () => void = () => router.navigate(target)) => {
      if (done) return go();
      pendingTarget = target;
      router.push('/onboarding');
    },
    [done],
  );
}

/** Opens the Map focused on a story/lesson id (Map may ignore it until stories exist). */
export function useOpenLearnFocus() {
  const open = useOpenLearn();
  return useCallback((focus: string) => open({ pathname: '/map', params: { focus } }), [open]);
}

/**
 * Mount once inside the main layout. Onboarding is a plain stack screen on top of the bank (not a
 * protected one: removing a protected screen rebuilds the stack and loses the bank's tab and scroll),
 * so when it completes this closes it and moves on to Learn.
 */
export function useResumeLearnAfterOnboarding() {
  const { loaded, done } = useOnboarding();
  const pathname = usePathname();

  // Learn entered without onboarding (a web reload or deep link on /map, or a tap before the profile
  // loaded): back to the bank and run onboarding first, then come back here. Reacts to entering a tab,
  // not to `done` flipping, so Profile → "Restart onboarding" can leave for the bank on its own.
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);
  useEffect(() => {
    if (!loaded || doneRef.current || !LEARN_PATHS.includes(pathname)) return;
    pendingTarget = pathname as Href;
    router.navigate('/');
    router.push('/onboarding');
  }, [loaded, pathname]);

  useEffect(() => {
    // No pending target = onboarding was opened from Profile to edit answers; it closes itself.
    if (!done || pathname !== '/onboarding' || !pendingTarget) return;
    const target = pendingTarget;
    pendingTarget = null;
    if (router.canGoBack()) router.back();
    router.navigate(target);
  }, [done, pathname]);
}
