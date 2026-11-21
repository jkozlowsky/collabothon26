import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { FactsCard } from '@/components/lesson/FactsCard';
import { RichText } from '@/components/lesson/RichText';
import { StatHero } from '@/components/lesson/StatHero';
import { StepLayout } from '@/components/lesson/StepLayout';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { StepOutcome, TextStep as TextStepData } from '@/types/lessons';

type Props = { step: TextStepData; onDone: (outcome: StepOutcome) => void };

/** A short card: character intro, "Word from Seoul", or the name for what the user just felt. */
export function TextStep({ step, onDone }: Props) {
  return (
    <StepLayout footer={<Button label="Continue" onPress={() => onDone({})} testID="continue" />}>
      {step.stat && <StatHero stat={step.stat} />}
      <View style={styles.card}>
        {step.kicker && <Text style={styles.kicker}>{step.kicker}</Text>}
        {step.title && (
          <Text style={styles.title} accessibilityRole="header">
            {step.title}
          </Text>
        )}
        <RichText text={step.body} style={styles.body} />
      </View>
      {step.facts && step.facts.length > 0 && <FactsCard facts={step.facts} />}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...elevation.low,
  },
  kicker: { ...type.overline, color: colors.textMuted },
  title: type.displayLarge,
  body: type.bodyDefault,
});
