import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion, Tappable } from '@/components/onboarding/ui';
import { RULE } from '@/constants/path';
import { colors, radii, spacing, type } from '@/constants/theme';

export type AnswerState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

type Props = {
  title: string;
  subtitle?: string;
  state: AnswerState;
  /** The user's own pick, for screen readers; the colours come from `state`. */
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
};

const RADIO = 24;
const MARK = { selected: 'check', correct: 'check', wrong: 'x' } as const;
const SPOKEN = { correct: 'Correct answer', wrong: 'Not the right answer' } as const;

/** One single-choice tile, an `OptionCard` without the icon; after an answer it shows right, wrong or dimmed. */
export function AnswerTile({ title, subtitle, state, checked, disabled, onPress, testID }: Props) {
  const mark = state === 'default' || state === 'dimmed' ? null : MARK[state];
  const spoken = state === 'correct' || state === 'wrong' ? SPOKEN[state] : null;
  return (
    <Tappable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={spoken ? `${title}. ${spoken}.` : undefined}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      style={[styles.tile, tileStates[state], motion.colors]}
    >
      <View style={styles.text}>
        <Text style={type.titleCard}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Animated.View style={[styles.radio, radioStates[state], motion.colors]}>
        {mark && (
          <Animated.View style={motion.pop} testID={`${testID}-${state}`}>
            <Feather name={mark} size={14} color={colors.textOnBrand} />
          </Animated.View>
        )}
      </Animated.View>
    </Tappable>
  );
}

const tileStates = StyleSheet.create({
  default: {},
  selected: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary },
  correct: { borderColor: colors.feedbackSuccess },
  wrong: { borderColor: colors.feedbackDanger },
  dimmed: { opacity: 0.5 },
});

const radioStates = StyleSheet.create({
  default: {},
  selected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  correct: { backgroundColor: colors.feedbackSuccess, borderColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.feedbackDanger, borderColor: colors.feedbackDanger },
  dimmed: {},
});

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg - 1,
    borderRadius: radii.card,
    borderWidth: RULE,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  text: { flex: 1, gap: spacing.xxs },
  subtitle: { ...type.bodyDefault, color: colors.textMuted },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: RULE,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
