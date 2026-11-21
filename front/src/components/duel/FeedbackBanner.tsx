import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  outcome: 'correct' | 'wrong' | 'timeout';
  /** The option the user picked, quoted when it was wrong. */
  chosenText: string | null;
};

const LOOK = {
  correct: { bg: colors.feedbackSuccessSoft, color: colors.feedbackSuccess, icon: 'check' },
  wrong: { bg: colors.feedbackDangerSoft, color: colors.feedbackDanger, icon: 'close' },
  timeout: { bg: colors.brandPrimarySoft, color: colors.brandPrimary, icon: 'timer' },
} as const;

/** Result of the last answer. The right answer is held back until the result screen, so the rival can't be helped. */
export function FeedbackBanner({ outcome, chosenText }: Props) {
  const look = LOOK[outcome];
  const title = outcome === 'correct' ? 'Right!' : outcome === 'timeout' ? "Time's up, no answer" : 'Not quite';
  const body =
    outcome === 'correct'
      ? 'Nice one. The next question comes up in a moment.'
      : `${outcome === 'wrong' && chosenText ? `It isn't “${chosenText}”. ` : ''}The right answer and why are on your result screen.`;
  return (
    <View style={[styles.banner, { backgroundColor: look.bg }]} testID="feedback-banner">
      <View style={[styles.icon, { backgroundColor: look.color }]}>
        <Icon name={look.icon} size={16} color={colors.textOnBrand} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: look.color }]}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.card, padding: spacing.md },
  icon: { width: 28, height: 28, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  title: type.titleCard,
  body: { ...type.bodyDefault, color: colors.textPrimary },
});
