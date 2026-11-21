import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  /** XP from the backend; null while saving, 'error' if saving failed. */
  xp: number | null | 'error';
  concepts: { key: string; term: string; weak: boolean }[];
  onConcept: (key: string) => void;
  onNext?: () => void;
  onClose: () => void;
  /** Video mode: replays the last scene. */
  onWatchAgain?: () => void;
};

/** End of a lesson: XP, the concepts it covered (missed ones marked for review), next lesson. */
export function LessonEnd({ title, xp, concepts, onConcept, onNext, onClose, onWatchAgain }: Props) {
  return (
    <View style={styles.wrap} testID="lesson-end">
      <View style={styles.badge}>
        <Icon name="check" size={36} color={colors.textOnBrand} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Lesson complete!
      </Text>
      <Text style={styles.meta}>{title}</Text>

      {xp === null ? (
        <ActivityIndicator color={colors.brandPrimary} />
      ) : xp === 'error' ? (
        <Text style={styles.meta}>Couldn&apos;t save your progress. Check the connection.</Text>
      ) : (
        <Text style={styles.xp} testID="lesson-xp">
          {xp > 0 ? `+${xp} XP` : 'Already completed · no new XP'}
        </Text>
      )}

      <View style={styles.concepts}>
        <Text style={styles.overline}>What you trained</Text>
        <View style={styles.chips}>
          {concepts.map((c) => (
            <Text
              key={c.key}
              style={[styles.chip, c.weak && styles.chipWeak]}
              onPress={() => onConcept(c.key)}
              accessibilityRole="button"
              accessibilityLabel={c.weak ? `${c.term}, worth a review` : c.term}
            >
              {c.weak ? `↻ ${c.term}` : `✓ ${c.term}`}
            </Text>
          ))}
        </View>
        {concepts.some((c) => c.weak) && <Text style={styles.meta}>↻ marks what to review: you missed it on the first try.</Text>}
      </View>

      <View style={styles.actions}>
        {onNext && <Button label="Next lesson" onPress={onNext} testID="lesson-next" />}
        <Button label="Back to Learn" variant={onNext ? 'ghost' : 'primary'} onPress={onClose} testID="back-to-list" />
        {onWatchAgain && <Button label="Watch again" variant="ghost" onPress={onWatchAgain} testID="lesson-watch-again" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: type.displayLarge,
  meta: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
  xp: { ...type.displayAmount, color: colors.feedbackXp },
  concepts: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  overline: { ...type.overline, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    ...type.labelStrong,
    color: colors.feedbackSuccess,
    backgroundColor: colors.feedbackSuccessSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  chipWeak: { color: colors.textOnAccent, backgroundColor: colors.brandAccentSoft },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
