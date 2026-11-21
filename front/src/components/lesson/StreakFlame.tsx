import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EASE_OUT, haptic } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** Days before and after this lesson. `from === to`: the streak was already kept today, the flame just burns. */
  from: number;
  to: number;
};

/** The flame catches: from a grey outline to a burning flame with a glow, then settles (Reanimated CSS). */
const IGNITE = {
  animationName: {
    from: { opacity: 0, transform: [{ scale: 0.3 }, { translateY: 10 }] },
    '55%': { opacity: 1, transform: [{ scale: 1.35 }, { translateY: -4 }] },
    to: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  },
  animationDuration: 700,
  animationDelay: 900,
  animationTimingFunction: EASE_OUT,
  animationFillMode: 'backwards',
} as const;

const GLOW = {
  animationName: { from: { opacity: 0.7, transform: [{ scale: 0.6 }] }, to: { opacity: 0, transform: [{ scale: 2.2 }] } },
  animationDuration: 900,
  animationDelay: 1000,
  // Ends invisible: the glow is a one-off flash, not a dot behind the flame.
  animationFillMode: 'both',
} as const;

/** Lesson end: the streak flame lights up when this lesson grew the streak, and the day count ticks up. */
export function StreakFlame({ from, to }: Props) {
  const reduceMotion = useReducedMotion();
  const grew = to > from;
  // The new count appears as the flame catches.
  const [days, setDays] = useState(grew && !reduceMotion ? from : to);

  useEffect(() => {
    if (!grew || reduceMotion) return;
    const t = setTimeout(() => {
      setDays(to);
      haptic('success');
    }, 1150);
    return () => clearTimeout(t);
  }, [grew, reduceMotion, to]);

  return (
    <View style={styles.pill} accessible accessibilityLabel={grew ? `Streak grew to ${to} days` : `${to} day streak`} testID="streak-flame">
      <View style={styles.flameBox}>
        {grew && <Ionicons name="flame-outline" size={26} color={colors.borderStrong} style={StyleSheet.absoluteFill} />}
        {grew && !reduceMotion && <Animated.View style={[styles.glow, GLOW]} />}
        <Animated.View style={grew && !reduceMotion ? IGNITE : undefined}>
          <Ionicons name="flame" size={26} color={colors.feedbackStreak} />
        </Animated.View>
      </View>
      <Text style={styles.days} testID="streak-days">
        {days} {days === 1 ? 'day' : 'days'}
      </Text>
      <Text style={styles.label}>{grew ? 'streak lit' : 'streak'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.storyOrangeSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  flameBox: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 26, height: 26, borderRadius: radii.pill, backgroundColor: colors.feedbackStreak, opacity: 0 },
  days: { ...type.titleSection, color: colors.feedbackStreak },
  label: { ...type.labelStrong, color: colors.feedbackStreak },
});
