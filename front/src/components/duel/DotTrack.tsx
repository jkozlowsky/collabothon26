import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { LocalDot } from '@/lib/duel/reducer';
import type { DotResult } from '@/types/duel';

type Props = {
  dots: (LocalDot | DotResult)[];
  /** Question being answered now (hollow ring), or null. */
  activeIndex?: number | null;
  /** Light dots for petrol cards. */
  onBrand?: boolean;
  /** Dot size and gap in px (Figma result header: 10 and 5). */
  size?: number;
  gap?: number;
  testID?: string;
};

/** One dot per question: green right, red wrong, grey timed out, ring current, pale not yet. */
export function DotTrack({ dots, activeIndex = null, onBrand = false, size = 9, gap = spacing.xs, testID }: Props) {
  return (
    <View style={[styles.row, { gap }]} testID={testID}>
      {dots.map((d, i) => {
        let style: ViewStyle = onBrand ? styles.pendingOnBrand : styles.pending;
        if (d === true || d === 'correct') style = styles.correct;
        else if (d === false || d === 'wrong') style = styles.wrong;
        else if (d === 'timeout') style = styles.timeout;
        else if (activeIndex === i) style = onBrand ? styles.currentOnBrand : styles.current;
        return <View key={i} style={[styles.dot, { width: size, height: size }, style]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 9, height: 9, borderRadius: radii.pill },
  correct: { backgroundColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.feedbackDanger },
  timeout: { backgroundColor: colors.storySlate },
  current: { borderWidth: 2, borderColor: colors.brandPrimary },
  currentOnBrand: { borderWidth: 2, borderColor: colors.brandAccent },
  pending: { backgroundColor: colors.borderDefault },
  pendingOnBrand: { backgroundColor: colors.onBrandChip },
});
