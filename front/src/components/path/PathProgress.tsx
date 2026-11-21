import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = { done: number; total: number; minutesLeft: number; accent: string };

/** Hero progress of a path: one segment per mission, and what is left. */
export function PathProgress({ done, total, minutesLeft, accent }: Props) {
  const finished = total > 0 && done >= total;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${done} of ${total} missions done`} testID="path-progress">
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < done && { backgroundColor: accent }]} />
        ))}
      </View>
      <Text style={styles.meta} accessibilityLiveRegion="polite">
        {done} of {total} missions{finished ? ' · path complete' : ` · ${minutesLeft} min to go`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 8, borderRadius: radii.pill, backgroundColor: colors.glassFill },
  meta: { ...type.labelStrong, color: colors.textPrimary },
});
