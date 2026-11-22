import { useEffect, useEffectEvent, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { easeOutCubic } from '@/hooks/useCountUp';

type Options = {
  delayMs?: number;
  durationMs?: number;
  /** Runs once when the number reaches its target. */
  onDone?: () => void;
};

/**
 * A whole number that rolls from 0 up to `target` (ease-out). Reduced motion and tests show the target at once.
 * Only the component that calls this re-renders, so keep it in a small Text wrapper.
 */
export function useRollUp(target: number, { delayMs = 0, durationMs = 800, onDone }: Options = {}): number {
  const reduced = useReducedMotion();
  const instant = reduced || process.env.NODE_ENV === 'test' || target <= 0;
  const [value, setValue] = useState(0);
  // An Effect Event: a new `onDone` identity must not restart the roll.
  const done = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (instant) {
      done();
      return;
    }
    let frame = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        start ||= now;
        const k = Math.min(1, (now - start) / durationMs);
        setValue(Math.round(target * easeOutCubic(k)));
        if (k < 1) frame = requestAnimationFrame(step);
        else done();
      };
      frame = requestAnimationFrame(step);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delayMs, durationMs, instant]);

  return instant ? target : value;
}
