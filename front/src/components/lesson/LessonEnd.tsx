import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { Confetti } from '@/components/lesson/Confetti';
import { StreakFlame } from '@/components/lesson/StreakFlame';
import { EASE_OUT, haptic } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, tints, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useCountUp } from '@/hooks/useCountUp';

type Props = {
  title: string;
  /** XP from the backend; null while saving, 'error' if saving failed. */
  xp: number | null | 'error';
  concepts: { key: string; term: string; weak: boolean }[];
  onConcept: (key: string) => void;
  onNext?: () => void;
  /** The story's last lesson: on to what the bank offers in the story's area. */
  onOffers?: () => void;
  onClose: () => void;
  /** Video mode: replays the last scene. */
  onWatchAgain?: () => void;
  /** This lesson's stop on its path, for the stamp row ("Berlin · stop 2 of 5 stamped"). */
  stop?: { position: number; total: number; city: string };
};

/** Overshoots, then settles: the badge lands like a stamp (Reanimated CSS animation). */
const STAMP = {
  animationName: {
    from: { opacity: 0, transform: [{ scale: 1.8 }, { rotate: '-12deg' }] },
    '60%': { opacity: 1, transform: [{ scale: 0.92 }, { rotate: '3deg' }] },
    to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
  },
  animationDuration: 520,
  animationTimingFunction: EASE_OUT,
  animationFillMode: 'backwards',
} as const;

/** End of a lesson: a celebration, XP counting up, the path's stamps, the concepts trained, next lesson. */
export function LessonEnd({ title, xp, concepts, onConcept, onNext, onOffers, onClose, onWatchAgain, stop }: Props) {
  const reduceMotion = useReducedMotion();
  // Set by the lesson screen's stats refresh when this lesson grew the streak.
  const { stats, streakBump } = useAccount();
  const enter = (delay: number) => (reduceMotion ? undefined : FadeInDown.duration(360).delay(delay));

  useEffect(() => {
    haptic('success');
  }, []);

  return (
    <View style={styles.fill} testID="lesson-end">
      <ScrollView contentContainerStyle={styles.wrap}>
        <Animated.View style={[styles.badgeHalo, !reduceMotion && STAMP]}>
          <View style={styles.badge}>
            <Icon name="check" size={40} color={colors.textOnBrand} />
          </View>
        </Animated.View>

        <Animated.View entering={enter(150)} style={styles.headline}>
          <Text style={styles.title} accessibilityRole="header">
            Lesson complete!
          </Text>
          <Text style={styles.meta}>{title}</Text>
        </Animated.View>

        <Animated.View entering={enter(300)}>
          {xp === null ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : xp === 'error' ? (
            <Text style={styles.meta}>Couldn&apos;t save your progress. Check the connection.</Text>
          ) : xp > 0 ? (
            <XpCounter xp={xp} />
          ) : (
            <Text style={[styles.meta, styles.xpRepeat]} testID="lesson-xp">
              Already completed · no new XP
            </Text>
          )}
        </Animated.View>

        {(streakBump || stats) && (
          <Animated.View entering={enter(380)}>
            <StreakFlame from={streakBump?.from ?? stats?.currentStreak ?? 0} to={streakBump?.to ?? stats?.currentStreak ?? 0} />
          </Animated.View>
        )}

        {stop && (
          <Animated.View entering={enter(450)} style={styles.stamps} testID="lesson-end-stamps">
            <View style={styles.stampRow} aria-hidden>
              {Array.from({ length: stop.total }, (_, i) => {
                const done = i < stop.position;
                const fresh = i === stop.position - 1;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.stamp,
                      done && styles.stampDone,
                      fresh && styles.stampFresh,
                      fresh && !reduceMotion && { ...STAMP, animationDelay: 700 },
                    ]}
                  >
                    {done && <Icon name="check" size={14} color={fresh ? colors.textOnAccent : colors.textOnBrand} />}
                  </Animated.View>
                );
              })}
            </View>
            <Text style={styles.meta}>
              {stop.city} · stop {stop.position} of {stop.total} stamped
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={enter(600)} style={styles.concepts}>
          <Text style={styles.overline}>What you trained</Text>
          <View style={styles.chips}>
            {concepts.map((c) => (
              <Text
                key={c.key}
                style={[styles.chip, c.weak && styles.chipWeak]}
                onPress={() => onConcept(c.key)}
                accessibilityRole="button"
                accessibilityLabel={c.weak ? `${c.term}, worth a review` : c.term}
              >
                {c.weak ? `↻ ${c.term}` : `✓ ${c.term}`}
              </Text>
            ))}
          </View>
          {concepts.some((c) => c.weak) && <Text style={styles.meta}>↻ marks what to review: you missed it on the first try.</Text>}
        </Animated.View>

        <View style={styles.actions}>
          {onOffers && <Button label="Next step: what the bank offers" onPress={onOffers} testID="lesson-offers" />}
          {onNext && <Button label="Next lesson" onPress={onNext} testID="lesson-next" />}
          <Button label="Back to Learn" variant={onNext || onOffers ? 'ghost' : 'primary'} onPress={onClose} testID="back-to-list" />
          {onWatchAgain && <Button label="Watch again" variant="ghost" onPress={onWatchAgain} testID="lesson-watch-again" />}
        </View>
      </ScrollView>
      <Confetti />
    </View>
  );
}

function XpCounter({ xp }: { xp: number }) {
  const shown = useCountUp(xp, { ms: 1100, delay: 350 });
  return (
    <View style={styles.xpPill} accessible accessibilityLabel={`plus ${xp} XP`}>
      <Icon name="zap" size={22} color={colors.feedbackXp} />
      <Text style={styles.xp} testID="lesson-xp">
        +{Math.round(shown)} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  badgeHalo: { padding: spacing.md, borderRadius: radii.pill, backgroundColor: colors.feedbackSuccessSoft },
  badge: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.mid,
  },
  headline: { alignItems: 'center', gap: spacing.xs },
  title: type.displayLarge,
  meta: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: tints.xp,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  xp: { ...type.displayAmount, color: colors.feedbackXp },
  xpRepeat: { marginVertical: spacing.sm },
  stamps: { alignItems: 'center', gap: spacing.sm },
  stampRow: { flexDirection: 'row', gap: spacing.sm },
  stamp: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampDone: { borderStyle: 'solid', borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  stampFresh: { borderColor: colors.brandPrimary, backgroundColor: colors.brandAccent, borderWidth: 2 },
  concepts: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  overline: { ...type.overline, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    ...type.labelStrong,
    color: colors.feedbackSuccess,
    backgroundColor: colors.feedbackSuccessSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  chipWeak: { color: colors.textOnAccent, backgroundColor: colors.brandAccentSoft },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
