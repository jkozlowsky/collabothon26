import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Bubble } from '@/components/onboarding/illustrations/Bubble';
import { CheckDot } from '@/components/onboarding/illustrations/CheckDot';
import { enter, FLOAT, loop, once } from '@/components/onboarding/illustrations/keyframes';
import { motion, POP_IN } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing } from '@/constants/theme';

const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const RISE_IN = { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

/** When each beat of the quick-check hero starts (ms): the rows 80 ms apart, the pick, the reveal, the bubble. */
const CHECK_BEAT = { card: 100, rows: 420, rowGap: 80, pick: 1100, reveal: 1600, bubble: 1750 };
const ROW_BARS = ['62%', '74%', '48%'] as const;
const PICKED_ROW = 1;
const RING = 18;

/**
 * Quick-check intro: a question card whose answers arrive one by one; one gets picked, turns out right, and a
 * "Right" bubble pops in beside it. One sequence of about two seconds. Decorative only.
 */
export function QuickCheckHero() {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[styles.stage, reduced && motion.fade]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="quick-check-hero"
    >
      <Animated.View style={[styles.card, !reduced && enter(CHECK_BEAT.card)]}>
        <View style={[styles.bar, styles.promptLong]} />
        <View style={[styles.bar, styles.promptShort]} />
        {ROW_BARS.map((width, i) => (
          <Animated.View key={width} style={[styles.row, !reduced && once(RISE_IN, 300, CHECK_BEAT.rows + i * CHECK_BEAT.rowGap)]}>
            <View style={[styles.skin, styles.skinIdle]} />
            {/* The colour change is two skins fading in over the idle one, so only opacity animates. */}
            {i === PICKED_ROW && (
              <>
                <Animated.View style={[styles.skin, styles.skinPicked, !reduced && once(FADE_IN, 200, CHECK_BEAT.pick)]} />
                <Animated.View style={[styles.skin, styles.skinRight, !reduced && once(FADE_IN, 240, CHECK_BEAT.reveal)]} />
              </>
            )}
            <View style={[styles.bar, { width }]} />
            <View style={styles.ring}>{i === PICKED_ROW && <CheckDot style={!reduced && once(POP_IN, 260, CHECK_BEAT.reveal)} />}</View>
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View style={[styles.bubbleSlot, !reduced && enter(CHECK_BEAT.bubble)]}>
        <Animated.View style={!reduced && loop(FLOAT, 2600, CHECK_BEAT.bubble + 520)}>
          <Bubble tone="success" icon={<Feather name="check" size={13} color={colors.textOnBrand} />} text="Right" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 280, height: 230, alignSelf: 'center' },
  card: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 216,
    padding: spacing.lg,
    gap: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    ...elevation.mid,
  },
  bar: { height: 8, borderRadius: radii.pill, backgroundColor: colors.borderStrong },
  promptLong: { width: '86%' },
  promptShort: { width: '58%', marginBottom: spacing.xs },
  row: {
    height: 36,
    paddingHorizontal: spacing.smPlus,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skin: { position: 'absolute', inset: 0, borderRadius: radii.button, borderWidth: 2 },
  skinIdle: { borderColor: colors.borderDefault, backgroundColor: colors.bgSurface },
  skinPicked: { borderColor: colors.brandPrimary, backgroundColor: colors.brandAccentSoft },
  skinRight: { borderColor: colors.feedbackSuccess, backgroundColor: colors.bgSurface },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSlot: { position: 'absolute', right: 0, top: 118 },
});
