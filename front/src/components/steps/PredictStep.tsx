import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Slider } from '@/components/bank/Slider';
import { RichText } from '@/components/lesson/RichText';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatValue } from '@/lib/models';
import type { PredictStep as PredictStepData, StepOutcome } from '@/types/lessons';

type Props = { step: PredictStepData; onDone: (outcome: StepOutcome) => void };

/** The answer marker's trip from the guess to the answer. */
const TRAVEL_MS = 600;

/** Guess first, then see the real value next to your guess. No wrong answer: the surprise is the lesson. */
export function PredictStep({ step, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const { min, max, step: inc, unit } = step.input;
  const [guess, setGuess] = useState(() => Math.round((min + max) / 2 / inc) * inc);
  const [revealed, setRevealed] = useState(false);
  const at = (v: number) => (v - min) / (max - min);

  const answerPos = useSharedValue(0);
  const answerStyle = useAnimatedStyle(() => ({ left: `${answerPos.get() * 100}%` }));

  function check() {
    setRevealed(true);
    // The answer marker travels from the guess to the answer.
    answerPos.set(at(guess));
    answerPos.set(withTiming(at(step.answer), { duration: reduceMotion ? 0 : TRAVEL_MS, easing: Easing.inOut(Easing.ease) }));
    haptic('success');
  }

  const show = (v: number) => formatValue(v, unit, { signed: min < 0 });

  return (
    <StepLayout
      prompt={step.prompt}
      footer={
        revealed ? (
          <Button label="Continue" onPress={() => onDone({})} testID="continue" />
        ) : (
          <Button label="Check my guess" onPress={check} testID="predict-check" />
        )
      }
    >
      <View style={styles.card}>
        <Text style={styles.label}>Your guess</Text>
        <Text style={styles.value} testID="predict-guess">
          {show(guess)}
        </Text>
        {!revealed ? (
          <Slider
            value={guess}
            min={min}
            max={max}
            step={inc}
            onChange={setGuess}
            accessibilityLabel={`Your guess, ${show(guess)}`}
            testID="predict-slider"
          />
        ) : (
          <View style={styles.scale} accessible accessibilityLabel={`You guessed ${show(guess)}. The answer is ${show(step.answer)}.`}>
            <View style={styles.track} />
            <View style={[styles.pin, styles.guessPin, { left: `${at(guess) * 100}%` }]} />
            <Animated.View style={[styles.pin, styles.answerPin, answerStyle]} />
            <Text style={[styles.end, styles.endLeft]}>{show(min)}</Text>
            <Text style={[styles.end, styles.endRight]}>{show(max)}</Text>
          </View>
        )}
      </View>

      {revealed && (
        <View style={styles.reveal} testID="predict-reveal">
          <Text style={styles.label}>Answer</Text>
          <Text style={[styles.value, styles.answer]}>{show(step.answer)}</Text>
          <RichText text={step.reveal} style={styles.body} />
        </View>
      )}
    </StepLayout>
  );
}

const PIN = 16;

const styles = StyleSheet.create({
  card: { gap: spacing.sm, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.xl, ...elevation.low },
  label: { ...type.overline, color: colors.textMuted },
  value: type.displayAmount,
  answer: { color: colors.brandPrimary },
  scale: { height: 48, justifyContent: 'center', marginHorizontal: PIN / 2 },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.borderDefault },
  pin: { position: 'absolute', top: 16, width: PIN, height: PIN, marginLeft: -PIN / 2, borderRadius: PIN / 2, borderWidth: 2 },
  guessPin: { backgroundColor: colors.bgSurface, borderColor: colors.textMuted },
  answerPin: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  end: { ...type.labelTab, color: colors.textMuted, position: 'absolute', bottom: -6 },
  endLeft: { left: -PIN / 2 },
  endRight: { right: -PIN / 2 },
  reveal: { gap: spacing.sm, backgroundColor: colors.brandAccentSoft, borderRadius: radii.card, padding: spacing.xl },
  body: type.bodyDefault,
});
