import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';

import { BAR_FILL_MS, CategoryXpRow } from '@/components/duel/CategoryXpRow';
import { CountUpText } from '@/components/duel/result/CountUpText';
import { Confetti } from '@/components/fx/Confetti';
import { FxLayer } from '@/components/fx/FxLayer';
import { COIN_PALETTE } from '@/lib/fx/particles';
import { colors, elevation, fonts, radii, spacing, type } from '@/constants/theme';
import type { CategoryMatchEnd } from '@/types/duel';

/** Gap between one bar starting and the next (ms). */
export const BAR_STAGGER_MS = 350;

type Props = {
  xpGained: number;
  correct: number;
  categories: CategoryMatchEnd[];
  /** When the first bar starts filling, ms after the screen opens. */
  barsStartMs: number;
  /** When the big XP number starts counting. */
  countStartMs: number;
  onCountDone?: () => void;
};

/** When the last bar has finished filling; the finale and the level-up overlay key off this. */
export function barsEndMs(barsStartMs: number, count: number): number {
  return barsStartMs + Math.max(0, count - 1) * BAR_STAGGER_MS + BAR_FILL_MS;
}

/** The XP card (Figma "XP card" 166:7608): "XP earned", the count-up, then one Category XP Row per category. */
export function XpCard({ xpGained, correct, categories, barsStartMs, countStartMs, onCountDone }: Props) {
  // The number landing throws a sparkle of coins around itself.
  const [coins, setCoins] = useState(false);
  const landed = () => {
    if (xpGained > 0) setCoins(true);
    onCountDone?.();
  };
  const caption = xpGained > 0 ? `${correct} correct × 5 XP` : 'No correct answers this time. Each one is worth 5 XP.';
  return (
    <View style={styles.card} testID="result-xp-card">
      <View style={styles.sum}>
        <Text style={styles.label}>XP earned</Text>
        <CountUpText prefix="+" suffix=" XP" value={xpGained} delayMs={countStartMs} durationMs={800} style={styles.big} onDone={landed} testID="result-xp-total" />
        {coins && (
          <FxLayer>
            {({ width, height }) => <Confetti width={width} height={height} mode="pop" count={22} at={{ x: 0.2, y: 0.45 }} palette={COIN_PALETTE} clip={false} testID="result-xp-coins" />}
          </FxLayer>
        )}
        <Text style={styles.caption}>{caption}</Text>
      </View>
      {categories.length > 0 && <View style={styles.divider} />}
      <View style={styles.rows}>
        {categories.map((cat, i) => (
          <CategoryXpRow key={`${cat.story}-${i}`} item={cat} delayMs={barsStartMs + i * BAR_STAGGER_MS} />
        ))}
      </View>
    </View>
  );
}

/** Solo: no XP, only a note (Figma frame 10). */
export function PracticeCard() {
  return (
    <View style={[styles.card, styles.practice]} testID="result-practice-card">
      <View style={styles.tile}>
        <Icon name="target" size={22} color={colors.brandPrimary} />
      </View>
      <View style={styles.practiceText}>
        <Text style={styles.practiceTitle}>Practice round</Text>
        <Text style={styles.caption}>Solo matches earn no XP and do not change your ranking.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.lg,
    ...elevation.low,
  },
  sum: { gap: 2 },
  label: { ...type.labelStrong, color: colors.textMuted },
  big: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, color: colors.textPrimary },
  caption: { ...type.labelDefault, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.borderDefault },
  rows: { gap: spacing.lg },
  practice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: 40, height: 40, borderRadius: radii.tile, backgroundColor: colors.brandPrimarySoft, alignItems: 'center', justifyContent: 'center' },
  practiceText: { flex: 1, gap: 2 },
  practiceTitle: { ...type.titleCard, color: colors.textPrimary },
});
