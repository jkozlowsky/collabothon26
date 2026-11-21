import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CANVAS, POP } from '@/components/video/kit/canvas';
import { colors, radii, scenePalette, spacing, type } from '@/constants/theme';
import { formatAmount, layerProgress } from '@/lib/sceneClock';

type Props = {
  from?: number;
  to: number;
  currency: string;
  label?: string;
  at?: number;
  len?: number;
  /** When the next amount takes its place, in seconds. */
  until: number;
  /** Scene length: an amount that lasts to the end doesn't fade out. */
  length: number;
  /** `left` when a phone takes the right side of the scene. */
  align?: 'center' | 'left';
  t: SharedValue<number>;
};

/** Counter steps over the roll: the number re-renders this often, not every frame. */
const STEPS = 24;
const easeOut = Easing.bezierFn(0.23, 1, 0.32, 1);

/** A big number with its label that counts from `from` to `to` over `len` seconds; green rising, red falling. */
export const Amount = memo(function Amount({ from, to, currency, label, at = 0, len = 0, until, length, align = 'center', t }: Props) {
  const start = from ?? (len > 0 ? 0 : to);
  const [step, setStep] = useState(STEPS);
  useAnimatedReaction(
    () => Math.round(easeOut(layerProgress(t.get(), at, len)) * STEPS),
    (now, before) => {
      if (now !== before) scheduleOnRN(setStep, now);
    },
  );
  const visible = useAnimatedStyle(() => {
    const now = t.get();
    const fadeOut = until < length ? layerProgress(now, until - POP, POP) : 0;
    return { opacity: layerProgress(now, at, POP) * (1 - fadeOut) };
  });
  const value = start + ((to - start) * step) / STEPS;
  const tone = to > start ? styles.up : to < start ? styles.down : undefined;

  return (
    <Animated.View pointerEvents="none" style={[styles.row, align === 'left' && styles.rowLeft, visible]}>
      <View style={styles.box}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={[styles.value, tone]}>{formatAmount(value, currency)}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { position: 'absolute', top: CANVAS.window.y + spacing.lg, left: 0, right: 0, alignItems: 'center' },
  rowLeft: { left: spacing.lg, alignItems: 'flex-start' },
  box: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    backgroundColor: scenePalette.captionPill,
  },
  label: { ...type.overline, color: scenePalette.onSceneMuted },
  value: { ...type.displayAmount, color: scenePalette.onScene },
  up: { color: colors.feedbackSuccess },
  down: { color: colors.feedbackDanger },
});
