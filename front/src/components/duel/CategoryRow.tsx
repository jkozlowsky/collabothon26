import { StyleSheet, Text, View } from 'react-native';

import { ListRow } from '@/components/bank/ListRow';
import { colors, radii, spacing, type } from '@/constants/theme';
import { categoryIconName, formatNumber, getCategoryMeta } from '@/lib/duel/meta';
import type { DuelCategory } from '@/types/duel';

/** Placement matches before a category's Elo counts. */
const CALIBRATION_MATCHES = 5;

/** A lobby category: tinted icon, level bar, Elo (or calibration progress). Tap starts a match. */
export function CategoryRow({ cat, onPress }: { cat: DuelCategory; onPress: () => void }) {
  const meta = getCategoryMeta(cat.slug);
  // A sliver of fill even at 0 XP, so the bar reads as a bar.
  const ratio = cat.xpForLevel > 0 ? Math.min(1, Math.max(0.06, cat.xpIntoLevel / cat.xpForLevel)) : 0.06;
  return (
    <ListRow
      testID={`duel-category-${cat.slug}`}
      icon={categoryIconName(cat.icon)}
      tile={{ background: meta.tint, color: meta.accent }}
      title={cat.name}
      meta={
        <View style={styles.level}>
          <Text style={styles.levelLabel}>Lv {cat.level}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
        </View>
      }
      value={cat.calibrated ? formatNumber(cat.elo) : `${Math.min(cat.humanMatches, CALIBRATION_MATCHES)}/${CALIBRATION_MATCHES}`}
      valueTone={cat.calibrated ? 'default' : 'muted'}
      valueNote={cat.calibrated ? 'Elo' : 'Calibrating'}
      chevron
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  level: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelLabel: { ...type.labelStrong, color: colors.feedbackXp },
  track: { width: 68, height: 5, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandAccent },
});
