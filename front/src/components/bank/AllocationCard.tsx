import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { allocation, ASSET_CLASS_LABEL } from '@/lib/bank/selectors';
import type { AssetClass } from '@/types/bank';

const CLASS_COLOR: Record<AssetClass, string> = {
  etfs: colors.brandPrimary,
  stocks: colors.storyTeal,
  bonds: colors.storyOrange,
  cash: colors.storySlate,
};

/** Segmented bar of the depot split by asset class, with a legend. */
export function AllocationCard() {
  const { state } = useBank();
  const parts = allocation(state).filter((p) => p.share > 0);
  if (parts.length === 0) return null;
  return (
    <View style={styles.card} testID="allocation">
      <Text style={styles.title}>Allocation</Text>
      <View style={styles.bar}>
        {parts.map((p) => (
          <View key={p.assetClass} style={[styles.segment, { flex: p.share, backgroundColor: CLASS_COLOR[p.assetClass] }]} />
        ))}
      </View>
      <View style={styles.legend}>
        {parts.map((p) => (
          <View key={p.assetClass} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: CLASS_COLOR[p.assetClass] }]} />
            <Text style={styles.legendText}>
              {ASSET_CLASS_LABEL[p.assetClass]} {p.share}%
            </Text>
          </View>
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
  title: type.titleCard,
  bar: { flexDirection: 'row', height: 8, gap: 3 },
  segment: { borderRadius: radii.bar },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...type.labelDefault, color: colors.textMuted },
});
