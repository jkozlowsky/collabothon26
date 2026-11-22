import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { DuelCategory } from '@/types/duel';

type Props = {
  cat: DuelCategory;
  checked: boolean;
  onToggle: () => void;
};

/** Pill with the area icon, its name and a check circle (Figma v4·1). Name is never truncated. */
export function CategoryChip({ cat, checked, onToggle }: Props) {
  const meta = getStoryCategoryMeta(cat.story);
  return (
    <Tappable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      // react-native-web drops accessibilityState, so the web build also gets the ARIA attribute.
      aria-checked={checked}
      accessibilityLabel={cat.name}
      testID={`duel-category-${cat.story}`}
      style={[styles.chip, checked && styles.checkedChip]}
    >
      <View style={[styles.icon, { backgroundColor: meta.tint }]}>
        <Feather name={meta.icon as ComponentProps<typeof Feather>['name']} size={16} color={meta.accent} />
      </View>
      <Text style={styles.name}>{cat.name}</Text>
      <View style={[styles.check, checked && styles.checkOn]} testID={`category-checkbox-${cat.story}`}>
        {checked && <Feather name="check" size={12} color={colors.textOnAccent} />}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  checkedChip: { borderWidth: 2, borderColor: colors.brandPrimary, backgroundColor: colors.brandAccentSoft },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.labelStrong, color: colors.textPrimary },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
  },
  checkOn: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
});
