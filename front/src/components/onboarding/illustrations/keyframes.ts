import type { CSSAnimationKeyframes, CSSAnimationProperties } from 'react-native-reanimated';

import { EASE_IN_OUT, EASE_OUT } from '@/components/onboarding/ui';

export const FLOAT = { from: { transform: [{ translateY: 0 }] }, to: { transform: [{ translateY: -7 }] } };
export const PULSE = { from: { opacity: 0.25, transform: [{ scale: 0.96 }] }, to: { opacity: 0.45, transform: [{ scale: 1.06 }] } };
const ENTER_POP = {
  from: { opacity: 0, transform: [{ scale: 0.8 }] },
  '65%': { opacity: 1, transform: [{ scale: 1.06 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};

/** An endless, slow back-and-forth (or spin). Callers leave it out when the system asks for reduced motion. */
export function loop(name: CSSAnimationKeyframes, duration: number, delay = 0, alternate = true): CSSAnimationProperties {
  return {
    animationName: name,
    animationDuration: duration,
    animationDelay: delay,
    animationDirection: alternate ? 'alternate' : 'normal',
    animationIterationCount: 'infinite',
    animationTimingFunction: alternate ? EASE_IN_OUT : 'linear',
  };
}

/** Plays `name` once, `delay` ms after mount; until then the element holds the first keyframe. */
export function once(name: CSSAnimationKeyframes, duration: number, delay: number): CSSAnimationProperties {
  return { animationName: name, animationDuration: duration, animationDelay: delay, animationFillMode: 'backwards', animationTimingFunction: EASE_OUT };
}

/** Pops in once on mount, after `delay` ms. */
export const enter = (delay: number) => once(ENTER_POP, 520, delay);
