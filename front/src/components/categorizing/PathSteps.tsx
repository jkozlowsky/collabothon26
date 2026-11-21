import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EASE_IN_OUT, EASE_OUT, motion } from '@/components/onboarding/ui';
import { colors, spacing, type } from '@/constants/theme';

export type StepState = 'done' | 'now' | 'next' | 'fail';
export type Step = { id: string; label: string; detail: string; state: StepState };

type Props = { steps: Step[] };

const NODE = 32;
const BORDER = 2;
const RING = NODE + spacing.md;

/** The learning path drawn station by station; the petrol line grows down to the active (or failed) station. */
export function PathSteps({ steps }: Props) {
  const reduced = useReducedMotion();
  const current = steps.findIndex((s) => s.state === 'now' || s.state === 'fail');
  const reached = current === -1 ? steps.length : current;

  return (
    <View>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={s.id} style={styles.station} accessible accessibilityLabel={`${s.label}, ${s.detail}`}>
            <View style={styles.track}>
              <Animated.View style={[styles.node, nodeStates[s.state], !reduced && motion.colors]}>
                {s.state === 'now' && (
                  <Animated.View testID="step-ring" style={[styles.ring, reduced ? styles.ringStill : ping]} />
                )}
                {s.state === 'done' && <Feather name="check" size={16} color={colors.textOnBrand} />}
                {s.state === 'fail' && <Feather name="x" size={16} color={colors.textOnBrand} />}
              </Animated.View>
              {!last && (
                <View style={styles.rail}>
                  <Animated.View style={[styles.fill, !reduced && grow, { height: i < reached ? '100%' : '0%' }]} />
                </View>
              )}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <Text style={[type.titleCard, s.state === 'next' && styles.muted]}>{s.label}</Text>
              <Text style={styles.detail}>{s.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const grow = { transitionProperty: 'height', transitionDuration: 320, transitionTimingFunction: EASE_IN_OUT } as const;

const ping = {
  animationName: {
    from: { opacity: 0.9, transform: [{ scale: 0.8 }] },
    to: { opacity: 0, transform: [{ scale: 1.25 }] },
  },
  animationDuration: 1400,
  animationTimingFunction: EASE_OUT,
  animationIterationCount: 'infinite',
} as const;

const nodeStates = StyleSheet.create({
  done: { backgroundColor: colors.feedbackSuccess, borderColor: colors.feedbackSuccess },
  now: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  next: { backgroundColor: colors.bgSurface, borderColor: colors.borderStrong },
  fail: { backgroundColor: colors.feedbackDanger, borderColor: colors.feedbackDanger },
});

const styles = StyleSheet.create({
  station: { flexDirection: 'row', gap: spacing.mdPlus },
  track: { width: NODE, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: (NODE - 2 * BORDER - RING) / 2,
    left: (NODE - 2 * BORDER - RING) / 2,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: BORDER,
    borderColor: colors.brandAccent,
  },
  ringStill: { opacity: 0.5 },
  rail: { flex: 1, width: 2, backgroundColor: colors.borderDefault },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.brandPrimary },
  text: { flex: 1, minHeight: NODE },
  textGap: { paddingBottom: spacing.xl },
  muted: { color: colors.textMuted },
  detail: { ...type.labelDefault, color: colors.textMuted },
});
