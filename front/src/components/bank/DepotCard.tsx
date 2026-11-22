import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Sparkline } from '@/components/bank/Sparkline';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { formatPercent } from '@/lib/bank/money';
import { depotChart, depotTotal, positionCount } from '@/lib/bank/selectors';
import type { ChartRange } from '@/types/bank';

const RANGES: ChartRange[] = ['1W', '1M', '1Y', 'Max'];
/** Brings the 26 px chips up to a 44 px touch target without overlapping their neighbours (8 px apart). */
const RANGE_HIT_SLOP = { top: 9, bottom: 9, left: 4, right: 4 };

/** Depot value, % change chip, chart and range chips. Used on Home and Invest. */
export function DepotCard() {
  const { state, money } = useBank();
  const [range, setRange] = useState<ChartRange>('1Y');
  const chart = depotChart(state, range);
  const total = depotTotal(state);
  const up = chart.change >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text style={styles.label}>Depot · {positionCount(state)} positions</Text>
          <Text style={styles.amount} testID="depot-total">
            {money(total)}
          </Text>
        </View>
        <View style={[styles.chip, !up && styles.chipDown]} testID="depot-change">
          <Icon name="trending" size={12} color={up ? colors.feedbackSuccess : colors.feedbackDanger} />
          <Text style={[styles.chipText, !up && styles.down]}>
            {formatPercent(chart.change)} · {range}
          </Text>
        </View>
      </View>
      {total > 0 && <Sparkline points={chart.points} />}
      <View style={styles.ranges} accessibilityRole="tablist">
        {RANGES.map((r) => (
          <Tappable
            key={r}
            onPress={() => setRange(r)}
            accessibilityRole="tab"
            accessibilityState={{ selected: r === range }}
            testID={`range-${r}`}
            haptic="selection"
            hitSlop={RANGE_HIT_SLOP}
            style={[styles.range, motion.colors, r === range && styles.rangeActive]}
          >
            <Text style={[styles.rangeText, r === range && styles.rangeTextActive]}>{r}</Text>
          </Tappable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titles: { gap: spacing.xxs },
  label: { ...type.labelDefault, color: colors.textMuted },
  amount: type.displayLarge,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.feedbackSuccessSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipDown: { backgroundColor: colors.feedbackDangerSoft },
  chipText: { ...type.labelStrong, color: colors.feedbackSuccess },
  down: { color: colors.feedbackDanger },
  ranges: { flexDirection: 'row', gap: spacing.sm },
  range: { paddingHorizontal: spacing.smPlus, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.brandPrimarySoft },
  rangeActive: { backgroundColor: colors.brandPrimary },
  rangeText: { ...type.labelStrong, color: colors.brandPrimary },
  rangeTextActive: { color: colors.textOnBrand },
});
