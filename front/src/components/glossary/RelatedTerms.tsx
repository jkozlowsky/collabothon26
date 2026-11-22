import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pressFeedback, radii, spacing, type } from '@/constants/theme';
import type { TermRef } from '@/types/glossary';

type Props = {
  terms: TermRef[];
  onOpenTerm: (slug: string) => void;
};

/** "Related terms": a section header and wrapping chips, each opens that term. */
export function RelatedTerms({ terms, onOpenTerm }: Props) {
  if (terms.length === 0) return null;
  return (
    <View style={styles.section} testID="related-terms">
      <View style={styles.header}>
        <Text style={type.titleSection} accessibilityRole="header">
          Related terms
        </Text>
        <Text style={styles.count}>{terms.length}</Text>
      </View>
      <View style={styles.chips}>
        {terms.map((term) => (
          <Pressable
            key={term.slug}
            testID={`related-${term.slug}`}
            accessibilityRole="button"
            onPress={() => onOpenTerm(term.slug)}
            style={({ pressed }) => [styles.chip, pressed && pressFeedback]}
          >
            <Feather name="book-open" size={16} color={colors.textPrimary} />
            <Text style={type.labelStrong}>{term.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { ...type.labelDefault, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
});
