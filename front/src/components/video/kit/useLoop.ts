import { useEffect } from 'react';
import { cancelAnimation, Easing, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Ambient loop 0 → 1 → 0 on its own shared value, independent of the scene clock, so it keeps running on the
 * end frame while a step is in the panel. Off (stays 0) for still frames and under reduced motion.
 */
export function useLoop(on: boolean, periodMs: number, delayMs = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      cancelAnimation(v);
      v.set(0);
      return;
    }
    v.set(withDelay(delayMs, withRepeat(withTiming(1, { duration: periodMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(v);
  }, [on, periodMs, delayMs, v]);
  return v;
}
