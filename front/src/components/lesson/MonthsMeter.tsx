import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** Months the rule asks for. */
  target: number;
  /** Months the user's money covers today. */
  have: number;
  /** "€ 1,200" short of the target; shown when the target is not covered. */
  shortBy: string;
};

const MAX_BLOCKS = 12;

/** One block per month of the target, filled as far as today's money reaches. */
export function MonthsMeter({ target, have, shortBy }: Props) {
  const blocks = Math.min(MAX_BLOCKS, target);
  const covered = have >= target;
  // Rounded down like {bufferMonths}, so the meter and the lesson text agree.
  const haveText = have >= 1 ? Math.floor(have) : Math.floor(have * 10) / 10;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`You cover ${haveText} of ${target} months`} testID="months-meter">
      <View style={styles.blocks}>
        {Array.from({ length: blocks }, (_, i) => {
          const fill = Math.min(1, Math.max(0, have - i));
          return (
            <View key={i} style={styles.block}>
              <Animated.View style={[styles.fill, covered && styles.fillDone, styles.grow, { width: `${fill * 100}%` }]} />
            </View>
          );
        })}
      </View>
      <Text style={[styles.status, covered ? styles.done : styles.short]} testID="months-status">
        {covered ? `✓ Covered today: your savings last about ${haveText} months` : `${shortBy} to go: today you cover ${haveText} of ${target} months`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  blocks: { flexDirection: 'row', gap: spacing.xs },
  block: { flex: 1, height: 28, borderRadius: radii.bar * 2, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brandPrimary },
  fillDone: { backgroundColor: colors.feedbackSuccess },
  // Reanimated CSS transition: blocks fill as the slider moves.
  grow: { transitionProperty: 'width', transitionDuration: 250 },
  status: type.labelStrong,
  done: { color: colors.feedbackSuccess },
  short: { color: colors.textOnAccent },
});
