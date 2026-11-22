import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Feedback } from '@/components/lesson/Feedback';
import { LineChart } from '@/components/lesson/LineChart';
import { StepLayout } from '@/components/lesson/StepLayout';
import { Tappable } from '@/components/onboarding/ui';
import { answerCue } from '@/components/steps/answerCue';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatValue } from '@/lib/models';
import type { QuizStep as QuizStepData, StepOutcome } from '@/types/lessons';

type Props = { step: QuizStepData; onDone: (outcome: StepOutcome) => void };

type OptionState = 'idle' | 'correct' | 'wrong';

/** Single choice with instant feedback and the why. */
export function QuizStep({ step, onDone }: Props) {
  const [picked, setPicked] = useState<number>();
  const answered = picked !== undefined;
  const correct = picked === step.correctIndex;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    answerCue(i === step.correctIndex);
  }

  /** Once answered, the right option is marked, and the picked one when it was wrong. */
  function stateOf(i: number): OptionState {
    if (!answered) return 'idle';
    if (i === step.correctIndex) return 'correct';
    return i === picked ? 'wrong' : 'idle';
  }

  return (
    <StepLayout
      prompt={step.prompt}
      footer={answered ? <Feedback correct={correct} explanation={step.explanation} onContinue={() => onDone({ correct })} /> : undefined}
    >
      {step.chart && <QuizChart chart={step.chart} />}
      <View style={styles.options}>
        {step.options.map((option, i) => {
          const state = stateOf(i);
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

/** "Explain the chart": the series drawn as a line, its labels under it. */
function QuizChart({ chart }: { chart: NonNullable<QuizStepData['chart']> }) {
  const points = chart.series.map((y, x) => ({ x, y }));
  const first = chart.labels?.[0];
  const last = chart.labels?.[chart.labels.length - 1];
  return (
    <View style={styles.chart}>
      <LineChart
        series={[{ points, tone: 'primary' }]}
        formatY={(y) => formatValue(y, chart.unit)}
        accessibilityLabel={`Chart${chart.caption ? `: ${chart.caption}` : ''}. ${chart.series
          .map((y, i) => `${chart.labels?.[i] ?? i + 1}: ${formatValue(y, chart.unit)}`)
          .join(', ')}`}
        testID="quiz-chart"
      />
      {(first || last) && (
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>{first}</Text>
          <Text style={styles.chartLabel}>{last}</Text>
        </View>
      )}
      {chart.caption && <Text style={styles.chartLabel}>{chart.caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: spacing.xs },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { ...type.labelDefault, color: colors.textMuted },
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
