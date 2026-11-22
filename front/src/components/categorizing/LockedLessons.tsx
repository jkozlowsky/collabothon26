import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, tints } from '@/constants/theme';

/** Widths of each card's title and meta bars, in percent. */
const CARDS = [
  [60, 35],
  [48, 30],
] as const;

/** Placeholder lesson cards at the end of the path, still locked while the path is built. */
export function LockedLessons() {
  return (
    <View style={styles.list} aria-hidden>
      {CARDS.map(([title, meta]) => (
        <View key={title} style={styles.card}>
          <View style={styles.tile}>
            <Feather name="lock" size={16} color={colors.storySlate} />
          </View>
          <View style={styles.text}>
            <View style={[styles.bar, { width: `${title}%` }]} />
            <View style={[styles.bar, { width: `${meta}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, marginTop: spacing.lg, opacity: 0.6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.smPlus,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tints.slate,
  },
  text: { flex: 1, gap: spacing.sm },
  bar: { height: 8, borderRadius: radii.pill, backgroundColor: colors.borderDefault },
});
