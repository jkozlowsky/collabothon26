import Feather from '@expo/vector-icons/Feather';
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

/** Category item in lobby list with checkbox (Figma 157:5389). Full name never wrapped or truncated. */
export function CategoryRow({ cat, checked, onToggle }: Props) {
  const meta = getStoryCategoryMeta(cat.story);
  const ratio = cat.xpForLevel > 0 ? Math.min(1, Math.max(0.06, cat.xpIntoLevel / cat.xpForLevel)) : 0.06;

  return (
    <Tappable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${cat.name}, level ${cat.level}`}
      testID={`duel-category-${cat.story}`}
      style={styles.row}
    >
      <View style={[styles.iconTile, { backgroundColor: meta.tint }]}>
        <Feather name={meta.icon as any} size={20} color={meta.accent} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {cat.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.levelLabel}>Lv {cat.level}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
        </View>
      </View>

      <View
        style={[styles.checkbox, checked && styles.checkboxChecked]}
        testID={`category-checkbox-${cat.story}`}
      >
        {checked && <Feather name="check" size={14} color={colors.textOnBrand} />}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelLabel: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.borderDefault,
    borderRadius: radii.bar,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.bar,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
  },
  checkboxChecked: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
});
