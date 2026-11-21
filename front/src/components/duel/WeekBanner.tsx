import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getWeeklyLeagueClock } from '@/lib/duel/meta';

/** "Week 47 · ends in 2 d 4 h" on top of the weekly league ranking. */
export function WeekBanner() {
  const clock = getWeeklyLeagueClock();
  return (
    <View style={styles.banner} testID="rankings-weekly-banner">
      <View style={styles.tile}>
        <Icon name="trophy" size={20} color={colors.textOnAccent} />
      </View>
      <View style={styles.text}>
        <Text style={type.titleCard}>
          Week {clock.week} · ends in {clock.shortLabel}
        </Text>
        <Text style={styles.meta}>Elo gained since Monday, all categories</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.brandAccentSoft, borderRadius: radii.card, padding: spacing.md },
  tile: { width: 40, height: 40, borderRadius: radii.tile, backgroundColor: colors.brandAccent, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  meta: { ...type.labelDefault, color: colors.textMuted },
});
