import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { LineChart } from '@/components/lesson/LineChart';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic, Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatValue } from '@/lib/models';
import type { ScenarioStep as ScenarioStepData, StepOutcome } from '@/types/lessons';

type Props = { step: ScenarioStepData; onDone: (outcome: StepOutcome) => void };

/**
 * Y range of the chart. Paths that stay far from zero (€10,000 ± a few hundred) get a range around their values,
 * so the difference between choices shows; paths that reach zero or below keep zero in view.
 */
function yDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min <= 0 || (max - min) / max > 0.5) return [Math.min(0, min), max];
  const pad = (max - min) * 0.25 || max * 0.02;
  return [min - pad, max + pad];
}

/** Time per drawn point of the chosen path. */
const DRAW_MS = 70;

/**
 * A decision for the character, then a jump in time: the chosen path draws itself, the other paths stay
 * grey for comparison. Fixed data per choice, no randomness, no "wrong" answer.
 */
export function ScenarioStep({ step, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const [choice, setChoice] = useState<number>();
  const [drawn, setDrawn] = useState(0);
  const chosen = choice === undefined ? undefined : step.choices[choice];
  const length = chosen?.series.length ?? 0;
  const visible = reduceMotion ? length : drawn;

  useEffect(() => {
    if (!chosen || drawn >= length) return;
    const t = setTimeout(() => setDrawn((d) => d + 1), DRAW_MS);
    return () => clearTimeout(t);
  }, [chosen, drawn, length]);

  function pick(i: number) {
    setChoice(i);
    setDrawn(1);
    haptic('light');
  }

  const toPoints = (series: number[]) => series.map((y, x) => ({ x, y }));
  const allValues = step.choices.flatMap((c) => c.series);
  const maxLength = Math.max(...step.choices.map((c) => c.series.length));
  const final = chosen ? chosen.series[length - 1] : 0;

  return (
    <StepLayout
      prompt={step.prompt}
      footer={chosen ? <Button label="Continue" onPress={() => onDone({ choice })} testID="continue" /> : undefined}
    >
      {!chosen ? (
        <View style={styles.choices}>
          {step.choices.map((c, i) => (
            <Tappable key={c.label} onPress={() => pick(i)} accessibilityRole="button" testID={`choice-${i}`} style={styles.choice}>
              <Text style={styles.choiceText}>{c.label}</Text>
            </Tappable>
          ))}
        </View>
      ) : (
        <>
          <Text style={styles.picked}>{chosen.label}</Text>
          <LineChart
            series={[
              ...step.choices.filter((c) => c !== chosen).map((c) => ({ points: toPoints(c.series), tone: 'muted' as const })),
              { points: toPoints(chosen.series.slice(0, Math.max(1, visible))), tone: 'primary' as const },
            ]}
            domain={{ x: [0, maxLength - 1], y: yDomain(allValues) }}
            formatY={(y) => formatValue(y, step.unit)}
            accessibilityLabel={`After ${step.periodLabel}: ${formatValue(final, step.unit)}`}
            testID="scenario-chart"
          />
          <View style={styles.axisRow}>
            <Text style={styles.axis}>Today</Text>
            <Text style={styles.axis}>+{step.periodLabel}</Text>
          </View>
          <View style={styles.ending} testID="scenario-ending">
            <Text style={styles.label}>After {step.periodLabel}</Text>
            <Text style={[styles.final, final < 0 && styles.negative]}>{formatValue(final, step.unit)}</Text>
            <Text style={styles.body}>{chosen.ending}</Text>
          </View>
          <Text style={styles.note}>Illustration only. Simplified from real data. The grey lines are the other choices.</Text>
        </>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  choices: { gap: spacing.md },
  choice: {
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  choiceText: type.titleCard,
  picked: { ...type.overline, color: colors.textMuted },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.sm },
  axis: { ...type.labelTab, color: colors.textMuted },
  ending: { gap: spacing.xs, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.xl, ...elevation.low },
  label: { ...type.overline, color: colors.textMuted },
  final: { ...type.displayAmount, color: colors.brandPrimary },
  negative: { color: colors.feedbackDanger },
  body: type.bodyDefault,
  note: { ...type.labelDefault, color: colors.textMuted },
});
