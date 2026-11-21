import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  outcome: 'correct' | 'wrong' | 'timeout';
  xpGained?: number;
};

/** Short right/wrong banner with yellow XP pill (Figma 153:3840). */
export function FeedbackBanner({ outcome, xpGained = 0 }: Props) {
  const isCorrect = outcome === 'correct';
  const isTimeout = outcome === 'timeout';

  const bgColor = isCorrect
    ? colors.feedbackSuccessSoft
    : isTimeout
      ? colors.brandPrimarySoft
      : colors.feedbackDangerSoft;

  const iconColor = isCorrect
    ? colors.feedbackSuccess
    : isTimeout
      ? colors.brandPrimary
      : colors.feedbackDanger;

  const title = isCorrect
    ? 'Correct!'
    : isTimeout
      ? "Time's up!"
      : 'Incorrect';

  const body = isCorrect
    ? 'Great job! Next question coming up.'
    : "You'll see the correct answer and explanation in the review.";

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]} testID="feedback-banner">
      <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
        <Feather
          name={isCorrect ? 'check' : isTimeout ? 'clock' : 'x'}
          size={16}
          color={colors.textOnBrand}
        />
      </View>

      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: iconColor }]}>{title}</Text>
          {isCorrect && xpGained > 0 && (
            <View style={styles.xpPill} testID="feedback-xp-pill">
              <Text style={styles.xpText}>+{xpGained} XP</Text>
            </View>
          )}
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...type.labelStrong,
  },
  body: {
    ...type.labelDefault,
    color: colors.textPrimary,
  },
  xpPill: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  xpText: {
    ...type.labelTab,
    color: colors.textOnAccent,
    fontWeight: '700',
  },
});
