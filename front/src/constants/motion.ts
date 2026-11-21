import type { CSSStyle } from 'react-native-reanimated';

import { EASE_OUT } from '@/components/onboarding/ui';

/** The area map's bar rises to its level. Not applied under reduced motion. */
export const barMotion = {
  transitionProperty: ['height', 'width'],
  transitionDuration: 700,
  transitionTimingFunction: EASE_OUT,
} satisfies CSSStyle;
