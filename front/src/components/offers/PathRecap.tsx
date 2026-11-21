import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { PathOffers } from '@/types/offers';

type Props = { path: PathOffers };

/** End of a story: what it taught, and a push to take a first step of the user's own choosing. */
export function PathRecap({ path }: Props) {
  return (
    <View style={styles.wrap} testID="path-recap">
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Icon name="trophy" size={30} color={colors.textOnAccent} />
        </View>
        <Text style={styles.overline}>{path.city} · journey complete</Text>
        <Text style={styles.headline} accessibilityRole="header">
          {path.headline}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardOverline}>What you can do now</Text>
        {path.learned.map((line) => (
          <View key={line} style={styles.line}>
            <View style={styles.tick}>
              <Icon name="check" size={14} color={colors.textOnBrand} />
            </View>
            <Text style={styles.lineText}>{line}</Text>
          </View>
        ))}
      </View>

      <View style={styles.nudge} testID="path-nudge">
        <Text style={styles.nudgeOverline}>Your move</Text>
        <Text style={styles.nudgeText}>{path.nudge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  overline: { ...type.overline, color: colors.feedbackSuccess },
  headline: { ...type.displayLarge, textAlign: 'center' },
  card: {
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderDefault,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  cardOverline: { ...type.overline, color: colors.textMuted },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  tick: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: { ...type.bodyDefault, color: colors.textPrimary, flex: 1 },
  nudge: { gap: spacing.sm, backgroundColor: colors.brandPrimary, borderRadius: radii.card, padding: spacing.lg },
  nudgeOverline: { ...type.overline, color: colors.brandAccent },
  nudgeText: { ...type.bodyReading, color: colors.textOnBrand },
});
