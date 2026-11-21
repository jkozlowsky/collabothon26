import { ScrollView, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { CATEGORY_LIST } from '@/lib/duel/meta';
import type { CategorySlug } from '@/types/duel';

type Props = { value: CategorySlug; onChange: (slug: CategorySlug) => void };

/** Horizontal strip of the five duel categories (rankings, Category tab). */
export function CategoryChips({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
      {CATEGORY_LIST.map((cat) => {
        const selected = cat.slug === value;
        return (
          <Tappable
            key={cat.slug}
            testID={`rankings-cat-${cat.slug}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(cat.slug)}
            haptic="selection"
            style={[styles.chip, selected && styles.chipSelected, motion.colors]}
          >
            <Icon name={cat.icon} size={14} color={selected ? colors.brandPrimary : cat.accent} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{cat.shortName}</Text>
          </Tappable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  chipSelected: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary },
  label: { ...type.labelStrong, color: colors.textMuted },
  labelSelected: { color: colors.brandPrimary },
});
