import type { CSSStyle } from 'react-native-reanimated';

import { EASE_OUT } from '@/components/onboarding/ui';

/** The area map's two markers: the diamond moves first, the bar rises after it (mockup C). Not applied under reduced motion. */
export const diamondMotion = {
  transitionProperty: ['bottom', 'left'],
  transitionDuration: 350,
  transitionTimingFunction: EASE_OUT,
} satisfies CSSStyle;
export const barMotion = {
  transitionProperty: ['height', 'width'],
  transitionDuration: 700,
  transitionDelay: '350ms',
  transitionTimingFunction: EASE_OUT,
} satisfies CSSStyle;
