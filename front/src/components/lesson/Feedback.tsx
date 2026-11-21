import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { RichText } from '@/components/lesson/RichText';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  correct: boolean;
  explanation?: string;
  onContinue: () => void;
};

/** Answer feedback with the why. Right/wrong is told by icon and words, not only colour. */
export function Feedback({ correct, explanation, onContinue }: Props) {
  return (
    <View style={[styles.panel, correct ? styles.correct : styles.wrong]} testID="feedback" accessibilityLiveRegion="polite">
      <View style={styles.titleRow}>
        <View style={[styles.badge, { backgroundColor: correct ? colors.feedbackSuccess : colors.feedbackDanger }]}>
          <Icon name={correct ? 'check' : 'close'} size={16} color={colors.textOnBrand} />
        </View>
        <Text style={[styles.title, { color: correct ? colors.feedbackSuccess : colors.feedbackDanger }]}>
          {correct ? 'Correct!' : 'Not quite'}
        </Text>
      </View>
      {explanation && <RichText text={explanation} style={styles.explanation} />}
      {!correct && <Text style={styles.retry}>You&apos;ll get this one again at the end.</Text>}
      <Button label="Continue" onPress={onContinue} testID="continue" />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md, borderRadius: radii.card, padding: spacing.lg, ...elevation.mid },
  correct: { backgroundColor: colors.bgSurface, borderWidth: 2, borderColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.bgSurface, borderWidth: 2, borderColor: colors.feedbackDanger },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { width: 24, height: 24, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  title: type.titleSection,
  explanation: { ...type.bodyDefault, color: colors.textPrimary },
  retry: { ...type.labelDefault, color: colors.textMuted },
});
