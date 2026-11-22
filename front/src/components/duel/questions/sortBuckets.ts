import type Feather from '@expo/vector-icons/Feather';
import type { ViewStyle } from 'react-native';

import { colors, duelTints } from '@/constants/theme';

export type BucketTheme = {
  color: string;
  softBg: string;
  icon: keyof typeof Feather.glyphMap;
};

export type SortItem = { text: string; index: number };

const BUCKET_THEMES: BucketTheme[] = [
  { color: colors.storyTeal, softBg: duelTints.teal, icon: 'shield' },
  { color: colors.storyViolet, softBg: duelTints.violet, icon: 'trending-up' },
  { color: colors.storyOrange, softBg: duelTints.orange, icon: 'target' },
  { color: colors.storyRose, softBg: duelTints.rose, icon: 'zap' },
];

const SAFE_WORDS = ['safe', 'emergency', 'fixed', 'protect'];
const GROWTH_WORDS = ['risky', 'grow', 'long-term', 'invest', 'stock'];

/** A "safe" bucket is the teal shield and a "growth" one the violet chart; any other name takes a theme by position. */
export function getBucketTheme(bucketName: string, index: number): BucketTheme {
  const lower = bucketName.toLowerCase();
  if (SAFE_WORDS.some((word) => lower.includes(word))) return BUCKET_THEMES[0];
  if (GROWTH_WORDS.some((word) => lower.includes(word))) return BUCKET_THEMES[1];
  return BUCKET_THEMES[index % BUCKET_THEMES.length];
}

/** How long the remaining cards take to close the gap when one moves. */
export const CARD_REFLOW_MS = 200;

/** Pressed state of every control in the sort question; softer than the theme's `pressFeedback` on purpose. */
export const sortPressed: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };
