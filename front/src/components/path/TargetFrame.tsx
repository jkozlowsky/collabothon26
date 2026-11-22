import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/bank/Icon';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/duel/feedback';

/** locked: a lesson from the duel that is not open yet (red). duel: an open or finished one (accent). */
export type TargetKind = 'locked' | 'duel';

type Props = {
  kind: TargetKind;
  /** Turns true when the screen has scrolled to the stop: the outline appears and the animation plays. */
  active: boolean;
  /** Locked only: false fades the outline out (300 ms) after the sheet closes. */
  outline?: boolean;
  /** Distance from the box's bottom to the card's bottom (the card's own margin). */
  bottomInset: number;
  children: ReactNode;
};

const PULSE_MS = 700;
const SHAKE_PX = 6;
/** One leg of the shake; three there-and-backs make the 300 ms. */
const SHAKE_LEG_MS = 50;
const SHAKE_TIMES = 3;
const OUTLINE_IN_MS = 150;
const OUTLINE_OUT_MS = 300;

/**
 * Wraps one path stop to mark it as the lesson the user came for (Figma frames 15 and 17).
 * Locked: white card with a 2 px red outline, a "Locked" chip, a ±6 px shake ×3 in 300 ms and an error haptic.
 * Duel: accent-soft card, accent outline, a "From your duel" chip. Both pulse a ring twice (700 ms each).
 * Reduced motion: the outline appears, nothing moves.
 */
export function TargetFrame({ kind, active, outline = true, bottomInset, children }: Props) {
  const reduced = useReducedMotion();
  const locked = kind === 'locked';
  const color = locked ? colors.feedbackDanger : colors.brandAccent;

  const shake = useSharedValue(0);
  const show = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    // Closing the sheet fades the red outline out (300 ms); the card goes back to its own look.
    if (locked && !outline) {
      show.value = withTiming(0, { duration: reduced ? 0 : OUTLINE_OUT_MS });
      return;
    }
    show.value = withTiming(1, { duration: reduced ? 0 : OUTLINE_IN_MS });
    if (locked) haptic('error');
    if (reduced) return;
    if (locked) {
      shake.value = withSequence(
        ...Array.from({ length: SHAKE_TIMES }, () => [
          withTiming(SHAKE_PX, { duration: SHAKE_LEG_MS }),
          withTiming(-SHAKE_PX, { duration: SHAKE_LEG_MS }),
        ]).flat(),
        withTiming(0, { duration: 0 })
      );
    }
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), 2);
  }, [active, outline, locked, reduced, show, shake, pulse]);

  const box = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const frame = useAnimatedStyle(() => ({ opacity: show.value }));
  // Peak of the pulse is +6 px each side (scale ≈ 1.04), at 30% (locked) or 40% (duel) fading to 0.
  const ring = useAnimatedStyle(() => ({
    opacity: (locked ? 0.3 : 0.4) * (1 - pulse.value) * (pulse.value > 0 ? 1 : 0),
    transform: [{ scale: 1 + 0.05 * pulse.value }],
  }));

  return (
    <Animated.View style={[styles.box, box]} testID={locked ? 'target-locked' : 'target-duel'}>
      <Animated.View pointerEvents="none" style={[styles.layer, { bottom: bottomInset }, frame]}>
        <View style={[styles.outline, { borderColor: color, backgroundColor: locked ? colors.bgSurface : colors.brandAccentSoft }]} />
      </Animated.View>
      {!reduced && (
        <Animated.View pointerEvents="none" style={[styles.layer, styles.ring, { bottom: bottomInset, borderColor: color }, ring]} />
      )}
      {children}
      <Animated.View pointerEvents="none" style={[styles.chipSlot, locked ? styles.chipLocked : styles.chipDuel, frame]}>
        {locked ? (
          <View style={[styles.chip, styles.chipRed]} testID="target-chip-locked">
            <Icon name="lock" size={12} color={colors.feedbackDanger} />
            <Text style={[styles.chipText, { color: colors.feedbackDanger }]}>Locked</Text>
          </View>
        ) : (
          <View style={[styles.chip, styles.chipNavy]} testID="target-chip-duel">
            <Icon name="swords" size={12} color={colors.brandAccent} />
            <Text style={[styles.chipText, { color: colors.textOnBrand }]}>From your duel</Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  outline: { flex: 1, borderRadius: radii.card, borderWidth: 2 },
  ring: { borderRadius: 22, borderWidth: 3 },
  chipSlot: { position: 'absolute', right: spacing.md },
  chipLocked: { top: spacing.mdPlus },
  chipDuel: { top: -11 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: spacing.sm },
  chipRed: { backgroundColor: colors.feedbackDangerTint },
  chipNavy: { backgroundColor: colors.brandPrimary },
  chipText: { ...type.labelStrong, fontFamily: fonts.semiBold },
});
