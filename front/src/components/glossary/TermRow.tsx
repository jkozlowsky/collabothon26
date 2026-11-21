import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FavoriteButton } from '@/components/glossary/FavoriteButton';
import { colors, spacing, type } from '@/constants/theme';
import type { TermSummary } from '@/types/glossary';

type Props = {
  term: TermSummary;
  saved: boolean;
  onToggleSaved: () => void;
  onPress?: () => void;
};

/**
 * One term in a category card: star (save / unsave), then name and chevron (open the definition).
 * Two sibling touch targets rather than a button inside a button, so screen readers see both.
 */
export function TermRow({ term, saved, onToggleSaved, onPress }: Props) {
  return (
    <View style={styles.row}>
      <FavoriteButton
        variant="compact"
        saved={saved}
        onPress={onToggleSaved}
        termName={term.name}
        testID={`save-${term.slug}`}
      />
      <Pressable
        testID={`term-${term.slug}`}
        accessibilityRole="button"
        accessibilityLabel={term.name}
        accessibilityHint={term.shortDescription}
        onPress={onPress}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <Text style={styles.name}>{term.name}</Text>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: spacing.xs },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
    paddingRight: spacing.lg,
  },
  pressed: { backgroundColor: colors.bgCanvas },
  name: { ...type.titleCard, flex: 1 },
});
