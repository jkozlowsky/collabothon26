import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { DuelMode } from '@/types/duel';

type Props = {
  mode: DuelMode;
  onChange: (mode: DuelMode) => void;
};

/** Navy toggle for vs Rival | Solo (Figma 153:3758). */
export function ModeToggle({ mode, onChange }: Props) {
  const isHuman = mode === 'HUMAN';

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow} accessibilityRole="radiogroup">
        <Tappable
          onPress={() => onChange('HUMAN')}
          accessibilityRole="radio"
          accessibilityState={{ selected: isHuman }}
          accessibilityLabel="vs Rival"
          testID="duel-mode-human"
          containerStyle={styles.item}
          style={[styles.segment, isHuman && styles.selectedSegment]}
        >
          <Text style={[styles.label, isHuman && styles.selectedLabel]}>vs Rival</Text>
        </Tappable>

        <Tappable
          onPress={() => onChange('SOLO')}
          accessibilityRole="radio"
          accessibilityState={{ selected: !isHuman }}
          accessibilityLabel="Solo"
          testID="duel-mode-solo"
          containerStyle={styles.item}
          style={[styles.segment, !isHuman && styles.selectedSegment]}
        >
          <Text style={[styles.label, !isHuman && styles.selectedLabel]}>Solo</Text>
        </Tappable>
      </View>
      {!isHuman && (
        <Text style={styles.soloNote} testID="duel-solo-note">
          Practice · no XP
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xxs,
  },
  item: {
    flex: 1,
  },
  segment: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button - 2,
  },
  selectedSegment: {
    backgroundColor: colors.brandPrimary,
  },
  label: {
    ...type.labelStrong,
    color: colors.textPrimary,
  },
  selectedLabel: {
    color: colors.textOnBrand,
  },
  soloNote: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
