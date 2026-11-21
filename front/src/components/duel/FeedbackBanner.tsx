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
    ? 'Dobrze!'
    : isTimeout
      ? 'Koniec czasu!'
      : 'Niepoprawna odpowiedź';

  const body = isCorrect
    ? 'Świetna odpowiedź! Kolejne pytanie za chwilę.'
    : 'Prawidłową odpowiedź i wyjaśnienie zobaczysz w podsumowaniu.';

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
    borderRadius: radii.card,
    padding: spacing.md,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...type.titleCard,
  },
  body: {
    ...type.bodyDefault,
    color: colors.textPrimary,
  },
  xpPill: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  xpText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
