import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  kind: 'streak' | 'xp';
  value: number;
  testID?: string;
};

/** Figma "Stat Chip": a white pill with the streak flame or the XP bolt. */
export function StatChip({ kind, value, testID }: Props) {
  const streak = kind === 'streak';
  return (
    <View
      style={styles.chip}
      testID={testID}
      accessible
      accessibilityLabel={streak ? `${value} day streak` : `${value} XP`}
    >
      {streak ? (
        <Ionicons name="flame-outline" size={16} color={colors.feedbackStreak} />
      ) : (
        <Feather name="zap" size={16} color={colors.feedbackXp} />
      )}
      <Text style={styles.label}>{streak ? value : `${value} XP`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.smPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  label: type.labelStrong,
});
