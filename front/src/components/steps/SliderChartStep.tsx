import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Slider } from '@/components/bank/Slider';
import { LineChart } from '@/components/lesson/LineChart';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatValue, MODELS, sweep } from '@/lib/models';
import { playSfx } from '@/lib/sfx';
import type { GoalCondition, SliderChartStep as SliderChartStepData, StepOutcome } from '@/types/lessons';

type Props = { step: SliderChartStepData; onDone: (outcome: StepOutcome) => void };

/** The hint shows after this long without reaching the goal. */
const HINT_AFTER_MS = 20_000;

const meets = (v: number, c: GoalCondition) => (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);

/**
 * Sliders drive a live chart computed by a pure model (lib/models.ts). Continue unlocks once the goal is
 * reached; a hint appears if it takes a while.
 */
export function SliderChartStep({ step, onDone }: Props) {
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(step.params).map(([k, p]) => [k, p.value])));
  const [reached, setReached] = useState(false);
  const [hint, setHint] = useState(false);

  const model = MODELS[step.model];
  const output = model.y(values);
  const condition = step.goal.condition;
  const met = meets(condition.of === 'output' ? output : values[condition.of], condition);
  if (met && !reached) setReached(true);

  useEffect(() => {
    if (reached) {
      haptic('success');
      playSfx('correct');
      return;
    }
    const t = setTimeout(() => setHint(true), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [reached]);

  const unit = step.output.unit;
  const outputText = formatValue(output, unit, { signed: true });

  return (
    <StepLayout
      prompt={step.prompt}
      footer={<Button label={reached ? 'Continue' : 'Reach the goal to continue'} disabled={!reached} onPress={() => onDone({})} testID="continue" />}
    >
      <View style={styles.summary}>
        <Text style={styles.label}>{step.output.label}</Text>
        <Text style={[styles.output, output < 0 && styles.negative]} testID="slider-output" accessibilityLiveRegion="polite">
          {outputText}
        </Text>
      </View>

      <LineChart
        series={[{ points: sweep(step.model, step.params, values), tone: 'primary' }]}
        marker={{ x: values[model.x], y: output }}
        formatY={(y) => formatValue(y, unit, { signed: true })}
        accessibilityLabel={`${step.output.label}: ${outputText}`}
        testID="slider-chart"
      />

      {Object.entries(step.params).map(([key, p]) => (
        <View key={key} style={styles.param}>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>{p.label}</Text>
            <Text style={styles.paramValue}>{formatValue(values[key], p.unit, { signed: p.min < 0 })}</Text>
          </View>
          <Slider
            value={values[key]}
            min={p.min}
            max={p.max}
            step={p.step}
            onChange={(v) => setValues((cur) => ({ ...cur, [key]: v }))}
            accessibilityLabel={`${p.label}, ${formatValue(values[key], p.unit)}`}
            testID={`slider-${key}`}
          />
        </View>
      ))}

      {reached ? (
        <Text style={[styles.status, styles.done]} testID="goal-reached">
          ✓ Goal reached
        </Text>
      ) : (
        hint && (
          <Text style={[styles.status, styles.hint]} testID="goal-hint">
            Hint: {step.goal.hint}
          </Text>
        )
      )}
      {step.note && <Text style={styles.note}>{step.note}</Text>}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.xxs },
  label: { ...type.overline, color: colors.textMuted },
  output: { ...type.displayAmount, color: colors.brandPrimary },
  negative: { color: colors.feedbackDanger },
  param: { gap: spacing.xs, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.md, ...elevation.low },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  paramLabel: { ...type.labelDefault, color: colors.textMuted, flex: 1 },
  paramValue: type.labelStrong,
  status: { ...type.labelStrong, borderRadius: radii.card, padding: spacing.md, overflow: 'hidden' },
  done: { color: colors.feedbackSuccess, backgroundColor: colors.feedbackSuccessSoft },
  hint: { color: colors.textOnAccent, backgroundColor: colors.brandAccentSoft },
  note: { ...type.labelDefault, color: colors.textMuted },
});
