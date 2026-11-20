import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Feedback } from '@/components/lesson/Feedback';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { QuizStep as QuizStepData, StepOutcome } from '@/types/lessons';

type Props = { step: QuizStepData; onDone: (outcome: StepOutcome) => void };

/** Single choice with instant feedback and the why. */
export function QuizStep({ step, onDone }: Props) {
  const [picked, setPicked] = useState<number>();
  const answered = picked !== undefined;
  const correct = picked === step.correctIndex;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    haptic(i === step.correctIndex ? 'success' : 'light');
  }

  return (
    <StepLayout
      prompt={step.prompt}
      footer={answered ? <Feedback correct={correct} explanation={step.explanation} onContinue={() => onDone({ correct })} /> : undefined}
    >
      <View style={styles.options}>
        {step.options.map((option, i) => {
          const state = !answered ? 'idle' : i === step.correctIndex ? 'correct' : i === picked ? 'wrong' : 'idle';
          return (
            <Tappable
              key={option}
              testID={`option-${i}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: answered, selected: i === picked }}
              disabled={answered}
              onPress={() => pick(i)}
              style={[styles.option, styles[state]]}
            >
              <Text style={styles.optionText}>{option}</Text>
              {state !== 'idle' && (
                <Icon name={state === 'correct' ? 'check' : 'close'} size={18} color={state === 'correct' ? colors.feedbackSuccess : colors.feedbackDanger} />
              )}
            </Tappable>
          );
        })}
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  optionText: { ...type.titleCard, flex: 1 },
  idle: {},
  correct: { backgroundColor: colors.feedbackSuccessSoft, borderColor: colors.feedbackSuccess, borderWidth: 2 },
  wrong: { backgroundColor: colors.feedbackDangerSoft, borderColor: colors.feedbackDanger, borderWidth: 2 },
});
