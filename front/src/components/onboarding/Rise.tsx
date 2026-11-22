import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EASE_OUT, motion } from '@/components/onboarding/ui';

type Props = { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> };

const RISE = { from: { opacity: 0, transform: [{ translateY: 16 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };
const DURATION_MS = 560;

/** Rises into place once on mount, after `delay` ms: staggers a headline block line by line. */
export function Rise({ children, delay = 0, style }: Props) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        reduced
          ? motion.fade
          : {
              animationName: RISE,
              animationDuration: DURATION_MS,
              animationDelay: delay,
              animationFillMode: 'backwards',
              animationTimingFunction: EASE_OUT,
            },
      ]}
    >
      {children}
    </Animated.View>
  );
}
