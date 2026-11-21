import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Slider } from '@/components/bank/Slider';
import { RichText } from '@/components/lesson/RichText';
import { StepLayout } from '@/components/lesson/StepLayout';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { AMOUNTS, fillMetrics } from '@/lib/lessonMetrics';
import type { ActionStep as ActionStepData, StepOutcome } from '@/types/lessons';

type Props = { step: ActionStepData; onDone: (outcome: StepOutcome) => void };

/**
 * "Your turn": the lesson's mechanism on the user's own (mock) bank numbers, plus an optional personal rule.
 * Describes the accounts and the mechanism; never says what to buy.
 */
export function ActionStep({ step, onDone }: Props) {
  const { state, money } = useBank();
  const body = fillMetrics(step.body, state, money) ?? step.bodyNoData;
  const rule = step.rule;
  const [ruleValue, setRuleValue] = useState(rule?.value ?? 0);
  const amount = rule?.appliesTo ? AMOUNTS[rule.appliesTo]?.(state) : undefined;
  const ruleAmount = amount === undefined ? undefined : rule?.kind === 'multiple' ? amount * ruleValue : (amount * ruleValue) / 100;
  const result = rule?.result ?? `= at most {amount} ${rule?.appliesToLabel ?? ''} on one bet`;

  return (
    <StepLayout
      kicker={step.title ?? 'Your turn'}
      footer={<Button label={step.cta ?? 'Done'} onPress={() => onDone({})} testID="continue" />}
    >
      <View style={styles.card}>
        <RichText text={body} style={styles.body} testID="action-body" />
      </View>

      {rule && (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{rule.label}</Text>
            <Text style={styles.ruleValue} testID="rule-value">
              {ruleValue}
              {rule.unit}
            </Text>
          </View>
          <Slider
            value={ruleValue}
            min={rule.min}
            max={rule.max}
            step={rule.step}
            onChange={setRuleValue}
            accessibilityLabel={`${rule.label}, ${ruleValue}${rule.unit ?? ''}`}
            testID="rule-slider"
          />
          {ruleAmount !== undefined && (
            <Text style={styles.amount} testID="rule-amount">
              {result.replace('{amount}', money(Math.round(ruleAmount), { whole: true }))}
            </Text>
          )}
        </View>
      )}

      <Text style={styles.note}>Education, not advice: this describes your accounts and doesn&apos;t tell you what to buy.</Text>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.xl, ...elevation.low },
  body: type.titleCard,
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...type.labelDefault, color: colors.textMuted, flex: 1 },
  ruleValue: { ...type.displayAmount, color: colors.brandPrimary },
  amount: { ...type.labelStrong, color: colors.brandPrimary },
  note: { ...type.labelDefault, color: colors.textMuted },
});
