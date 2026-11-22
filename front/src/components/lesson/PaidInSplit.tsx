import { StyleSheet, Text, View } from 'react-native';
import Animated, { type CSSStyle } from 'react-native-reanimated';

import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatValue } from '@/lib/models';

type Props = { total: number; paidIn: number };

/**
 * The value split into the money paid in and what growth added, as one bar. Shows the moment compound
 * growth overtakes your own money.
 */
export function PaidInSplit({ total, paidIn }: Props) {
  const growth = Math.max(0, total - paidIn);
  const paidShare = total > 0 ? Math.min(1, paidIn / total) : 1;
  const overtaken = growth > paidIn;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Paid in ${formatValue(paidIn, '€')}, growth ${formatValue(growth, '€')}`}
      testID="paid-in-split"
    >
      <View style={styles.bar}>
        <Animated.View style={[styles.paid, GROW, { flexGrow: paidShare }]} />
        <Animated.View style={[styles.growth, GROW, { flexGrow: 1 - paidShare }]} />
      </View>
      <View style={styles.legend}>
        <Legend color={colors.brandPrimary} label="You paid in" value={formatValue(paidIn, '€')} />
        <Legend color={colors.feedbackSuccess} label="Growth added" value={`+${formatValue(growth, '€')}`} />
      </View>
      {overtaken && (
        <Text style={styles.badge} testID="growth-overtakes">
          ✓ Growth is now bigger than the money you paid in
        </Text>
      )}
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

/** Reanimated CSS transition: the bar slides as the slider moves. */
const GROW = { transitionProperty: 'flexGrow', transitionDuration: 250 } satisfies CSSStyle;

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.lg, ...elevation.low },
  bar: { flexDirection: 'row', height: 18, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.borderDefault, gap: spacing.xxs },
  paid: { backgroundColor: colors.brandPrimary, flexBasis: 0 },
  growth: { backgroundColor: colors.feedbackSuccess, flexBasis: 0 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  legendItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: radii.pill, marginTop: 3 },
  label: { ...type.labelDefault, color: colors.textMuted },
  value: type.titleCard,
  badge: {
    ...type.labelStrong,
    color: colors.feedbackSuccess,
    backgroundColor: colors.feedbackSuccessSoft,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
});
