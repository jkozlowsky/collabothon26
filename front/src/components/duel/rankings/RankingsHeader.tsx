import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/bank/IconButton';
import { colors, spacing, type } from '@/constants/theme';
import { getWeeklyLeagueClock } from '@/lib/duel/meta';

type Props = {
  onBack: () => void;
};

/** Navy header of the weekly ranking: back button, title and the time left in the week. */
export function RankingsHeader({ onBack }: Props) {
  const clock = getWeeklyLeagueClock();
  const weekInfo = `Week ${clock.week} · ends in ${clock.days} ${clock.days === 1 ? 'day' : 'days'}`;

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <IconButton icon="chevron-left" onPress={onBack} label="Back" testID="rankings-back" />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.muted}>XP earned since Monday</Text>
        <Text style={styles.title} accessibilityRole="header">
          Weekly ranking
        </Text>
        <Text style={[styles.muted, styles.weekInfo]}>{weekInfo}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  muted: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
  },
  title: {
    ...type.displayLarge,
    color: colors.textOnBrand,
  },
  weekInfo: {
    marginTop: spacing.xxs,
  },
});
