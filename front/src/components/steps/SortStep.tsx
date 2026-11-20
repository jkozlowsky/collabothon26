import { useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Feedback } from '@/components/lesson/Feedback';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { shuffle } from '@/lib/lessonPlayer';
import type { SortStep as SortStepData, StepOutcome } from '@/types/lessons';

type Props = { step: SortStepData; retry: boolean; onDone: (outcome: StepOutcome) => void };

/** Drag past this (px) and let go to sort the card; less springs back. */
const SWIPE_DISTANCE = 90;
const NATIVE = Platform.OS !== 'web';

/**
 * Cards one at a time: swipe left/right or use the two buttons (web, screen readers). Feedback for each card
 * shows while the next one is up; cards are shuffled on a repeat.
 */
export function SortStep({ step, retry, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const [order] = useState(() => (retry ? shuffle([...step.items.keys()]) : [...step.items.keys()]));
  const [pos, setPos] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [last, setLast] = useState<{ text: string; correct: boolean; bucket: 0 | 1 } | null>(null);
  const done = pos >= order.length;
  const item = done ? null : step.items[order[pos]];

  const [x] = useState(() => new Animated.Value(0));
  // A card is flying off: ignore more input so it isn't sorted twice.
  const [flying, setFlying] = useState(false);

  function decide(bucket: 0 | 1) {
    if (!item) return;
    const correct = item.bucket === bucket;
    setLast({ text: item.text, correct, bucket: item.bucket });
    if (!correct) setMistakes((m) => m + 1);
    haptic(correct ? 'success' : 'light');
    x.setValue(0);
    setPos((p) => p + 1);
  }

  /** Flies the card off to one side, then sorts it. */
  function fling(bucket: 0 | 1) {
    if (flying) return;
    if (reduceMotion) return decide(bucket);
    setFlying(true);
    Animated.timing(x, { toValue: bucket === 0 ? -500 : 500, duration: 180, useNativeDriver: NATIVE }).start(() => {
      setFlying(false);
      decide(bucket);
    });
  }

  // Rebuilt each render so it sees the current card; renders only happen between cards, never mid-drag.
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > SWIPE_DISTANCE) fling(g.dx < 0 ? 0 : 1);
      else Animated.spring(x, { toValue: 0, useNativeDriver: NATIVE }).start();
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: NATIVE }).start(),
  });

  const rotate = x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'] });
  const leftHint = x.interpolate({ inputRange: [-SWIPE_DISTANCE, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const rightHint = x.interpolate({ inputRange: [0, SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <StepLayout
      prompt={step.prompt}
      scroll={false}
      footer={
        done ? (
          <Feedback
            correct={mistakes === 0}
            explanation={step.explanation}
            onContinue={() => onDone({ correct: mistakes === 0 })}
          />
        ) : (
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <Button label={`← ${step.buckets[0]}`} variant="secondary" onPress={() => fling(0)} disabled={flying} testID="sort-left" />
            </View>
            <View style={styles.flex}>
              <Button label={`${step.buckets[1]} →`} variant="secondary" onPress={() => fling(1)} disabled={flying} testID="sort-right" />
            </View>
          </View>
        )
      }
    >
      <Text style={styles.counter}>
        {Math.min(pos + 1, order.length)} of {order.length}
      </Text>
      <View style={styles.stage}>
        {item && (
          <Animated.View
            key={pos}
            {...pan.panHandlers}
            style={[styles.card, { transform: [{ translateX: x }, { rotate }] }]}
            accessible
            accessibilityLabel={`${item.text}. Swipe left for ${step.buckets[0]}, right for ${step.buckets[1]}.`}
            testID="sort-card"
          >
            <Animated.Text style={[styles.tag, styles.tagLeft, { opacity: leftHint }]}>{step.buckets[0]}</Animated.Text>
            <Animated.Text style={[styles.tag, styles.tagRight, { opacity: rightHint }]}>{step.buckets[1]}</Animated.Text>
            <Text style={styles.cardText}>“{item.text}”</Text>
          </Animated.View>
        )}
      </View>
      {last && (
        <View style={[styles.last, last.correct ? styles.lastRight : styles.lastWrong]} accessibilityLiveRegion="polite" testID="sort-last">
          <Text style={[styles.lastText, { color: last.correct ? colors.feedbackSuccess : colors.feedbackDanger }]}>
            {last.correct ? '✓ Right' : '✗ Not quite'}: “{last.text}” is {step.buckets[last.bucket].toLowerCase()}.
          </Text>
        </View>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buttons: { flexDirection: 'row', gap: spacing.md },
  counter: { ...type.overline, color: colors.textMuted, textAlign: 'center' },
  stage: { flex: 1, minHeight: 220, justifyContent: 'center' },
  card: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xxl,
    ...elevation.mid,
  },
  cardText: { ...type.titleSection, textAlign: 'center' },
  tag: { ...type.overline, position: 'absolute', top: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, overflow: 'hidden' },
  tagLeft: { left: spacing.md, color: colors.brandPrimary, backgroundColor: colors.brandPrimarySoft },
  tagRight: { right: spacing.md, color: colors.brandPrimary, backgroundColor: colors.brandPrimarySoft },
  last: { borderRadius: radii.card, padding: spacing.md, borderWidth: 1 },
  lastRight: { backgroundColor: colors.feedbackSuccessSoft, borderColor: colors.feedbackSuccess },
  lastWrong: { backgroundColor: colors.feedbackDangerSoft, borderColor: colors.feedbackDanger },
  lastText: type.labelStrong,
});
