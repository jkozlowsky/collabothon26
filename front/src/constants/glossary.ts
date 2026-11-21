import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { colors } from '@/constants/theme';

type IconName = ComponentProps<typeof Feather>['name'];

/** Look of a glossary category (tile tint, icon). Categories come from the backend; this only styles them. */
export type CategoryStyle = { icon: IconName; color: string; tint: string };

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  basics: { icon: 'book', color: colors.storyTeal, tint: colors.storyTealSoft },
  investing: { icon: 'trending-up', color: colors.storyViolet, tint: colors.storyVioletSoft },
  saving: { icon: 'database', color: colors.feedbackSuccess, tint: colors.feedbackSuccessSoft },
  'credit-debt': { icon: 'percent', color: colors.storyOrange, tint: colors.storyOrangeSoft },
  risk: { icon: 'shield', color: colors.storyRose, tint: colors.storyRoseSoft },
};

const FALLBACK_STYLE: CategoryStyle = { icon: 'book-open', color: colors.storySlate, tint: colors.storySlateSoft };

export function categoryStyle(slug: string): CategoryStyle {
  return CATEGORY_STYLES[slug] ?? FALLBACK_STYLE;
}
