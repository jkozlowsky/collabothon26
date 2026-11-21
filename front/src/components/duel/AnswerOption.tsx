import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

/** Figma "Answer Option" states. Correct and wrong always pair colour with an icon. */
export type AnswerOptionState = 'default' | 'pending' | 'correct' | 'wrong' | 'dimmed';

type Props = {
  index: number;
  text: string;
  state: AnswerOptionState;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
};

const LETTERS = ['A', 'B', 'C', 'D'];

/** One answer card: letter tile, text, radio. */
export function AnswerOption({ index, text, state, disabled, onPress, testID }: Props) {
  const solid = state === 'correct' || state === 'wrong';
  return (
    <Tappable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: state !== 'default' && state !== 'dimmed' }}
      disabled={disabled}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      style={[styles.card, CARD[state], motion.colors]}
    >
      <View style={[styles.letter, LETTER_TILE[state]]}>
        <Text style={[styles.letterText, solid && styles.onSolid]}>{LETTERS[index] ?? index + 1}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
      <View style={[styles.radio, RADIO[state]]}>
        {state === 'correct' && <Icon name="check" size={14} color={colors.textOnBrand} />}
        {state === 'wrong' && <Icon name="close" size={14} color={colors.textOnBrand} />}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    minHeight: 64,
  },
  letter: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { ...type.titleCard, color: colors.brandPrimary },
  onSolid: { color: colors.textOnBrand },
  text: { ...type.titleCard, flex: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const CARD = StyleSheet.create({
  default: {},
  pending: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary },
  correct: { borderColor: colors.feedbackSuccess },
  wrong: { borderColor: colors.feedbackDanger },
  dimmed: { opacity: 0.5 },
});

const LETTER_TILE = StyleSheet.create({
  default: {},
  pending: { backgroundColor: colors.brandAccent },
  correct: { backgroundColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.feedbackDanger },
  dimmed: {},
});

const RADIO = StyleSheet.create({
  default: {},
  pending: { borderColor: colors.brandPrimary },
  correct: { backgroundColor: colors.feedbackSuccess, borderColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.feedbackDanger, borderColor: colors.feedbackDanger },
  dimmed: {},
});
