import { StyleSheet, Text, View } from 'react-native';

import { StatChip } from '@/components/StatChip';
import { colors, spacing, type } from '@/constants/theme';
import type { Learner } from '@/types/stories';

type Props = { learner: Learner };

/** Top of the Map tab (frame 3:496): greeting, "Where to next?", streak and XP chips. */
export function LearnHeader({ learner }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hi {learner.name} · {learner.profileLabel}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Where to next?
        </Text>
      </View>
      <View style={styles.chips}>
        <StatChip kind="streak" value={learner.streak} testID="stat-streak" />
        <StatChip kind="xp" value={learner.xp} testID="stat-xp" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  text: { flex: 1, gap: spacing.xxs },
  greeting: { ...type.labelDefault, color: colors.textMuted },
  title: type.displayLarge,
  chips: { flexDirection: 'row', gap: 6, paddingBottom: spacing.xs },
});
