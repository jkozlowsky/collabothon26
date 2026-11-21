import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = { missedQuestions: number[]; resumeQuestion: number | null; onDismiss: () => void };

/** Notice above the question after a reload or a long absence: some questions ran out meanwhile (tap to hide). */
export function ConnectionBanner({ missedQuestions, resumeQuestion, onDismiss }: Props) {
  const missed =
    missedQuestions.length === 1 ? `question ${missedQuestions[0]} ran out` : `questions ${missedQuestions.join(', ')} ran out`;
  return (
    <Tappable
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityHint="Hides this notice"
      pressedScale={0.98}
      style={[styles.banner, styles.back]}
      testID="reconnected-banner"
    >
      <Icon name="refresh" size={18} color={colors.brandPrimary} />
      <View style={styles.text}>
        <Text style={styles.title}>You&apos;re back: {missed}</Text>
        <Text style={styles.body}>
          It counts as no answer.{resumeQuestion !== null ? ` Carry on with question ${resumeQuestion}.` : ''}
        </Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radii.card, padding: spacing.md },
  back: { backgroundColor: colors.brandPrimarySoft },
  text: { flex: 1, gap: spacing.xxs },
  title: { ...type.labelStrong, color: colors.brandPrimary },
  body: { ...type.bodyDefault, color: colors.textPrimary, flex: 1 },
});
