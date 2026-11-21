import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { StepLayout } from '@/components/lesson/StepLayout';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { ChatStep as ChatStepData, StepOutcome } from '@/types/lessons';

type Props = { step: ChatStepData; onDone: (outcome: StepOutcome) => void };

/** Pause before each next message, as if someone were typing. */
const TYPING_MS = 1100;

/**
 * The story's situation, shown rather than told: messages arrive one by one with a typing indicator.
 * A tap shows the next one at once; with reduced motion all messages show right away.
 */
export function ChatStep({ step, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const total = step.messages.length;
  const [count, setCount] = useState(1);
  const shown = reduceMotion ? total : count;
  const all = shown >= total;

  useEffect(() => {
    if (all) return;
    const t = setTimeout(() => setCount((n) => n + 1), TYPING_MS);
    return () => clearTimeout(t);
  }, [count, all]);

  const typing = all ? null : step.messages[shown];

  return (
    <StepLayout
      kicker={step.title}
      footer={all ? <Button label="Continue" onPress={() => onDone({})} testID="continue" /> : undefined}
    >
      <Pressable
        onPress={() => setCount((n) => Math.min(total, n + 1))}
        disabled={all}
        accessibilityRole="button"
        accessibilityLabel="Show next message"
        accessibilityState={{ disabled: all }}
        testID="chat-next"
        style={styles.thread}
      >
        {step.messages.slice(0, shown).map((m, i) => (
          <Animated.View key={i} entering={reduceMotion ? undefined : FadeIn.duration(200)} style={[styles.row, m.me && styles.rowMe]}>
            {!m.me && step.messages[i - 1]?.from !== m.from && <Text style={styles.from}>{m.from}</Text>}
            <View style={[styles.bubble, m.me ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.text, m.me && styles.textMe]}>{m.text}</Text>
            </View>
          </Animated.View>
        ))}
        {typing && (
          <Text style={[styles.typing, typing.me && styles.rowMe]} accessibilityLiveRegion="polite">
            {typing.me ? 'You are' : `${typing.from} is`} typing…
          </Text>
        )}
      </Pressable>
      {!all && <Text style={styles.hint}>Tap to skip ahead</Text>}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: spacing.sm,
    backgroundColor: colors.bgTint,
    borderRadius: radii.card,
    padding: spacing.md,
    minHeight: 280,
  },
  row: { alignItems: 'flex-start', gap: spacing.xxs },
  rowMe: { alignItems: 'flex-end', alignSelf: 'flex-end' },
  from: { ...type.labelStrong, color: colors.textMuted, marginLeft: spacing.sm },
  bubble: { maxWidth: '85%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.card },
  bubbleThem: { backgroundColor: colors.bgSurface, borderTopLeftRadius: spacing.xs },
  bubbleMe: { backgroundColor: colors.brandPrimary, borderTopRightRadius: spacing.xs },
  text: { ...type.bodyDefault, color: colors.textPrimary },
  textMe: { color: colors.textOnBrand },
  typing: { ...type.labelDefault, color: colors.textMuted, fontStyle: 'italic', marginLeft: spacing.sm },
  hint: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
});
