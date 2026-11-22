import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import Feather from '@expo/vector-icons/Feather';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatLike, parseDisplayNumber, useCountUp } from '@/hooks/useCountUp';
import type { Stat } from '@/types/lessons';

type Props = { stat: Stat; testID?: string };

const TONE = {
  good: { icon: 'trending-up', fill: colors.feedbackSuccess },
  bad: { icon: 'trending-down', fill: colors.feedbackDanger },
  neutral: { icon: 'info', fill: colors.onBrandChip },
} as const;

/** The petrol hero card over a text step: one big number that counts up, and what it means. */
export function StatHero({ stat, testID = 'stat-hero' }: Props) {
  const reduceMotion = useReducedMotion();
  const parsed = parseDisplayNumber(stat.value);
  const tone = TONE[stat.tone ?? 'neutral'];

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(380)}
      style={styles.card}
      accessible
      accessibilityLabel={`${stat.value}, ${stat.label}`}
      testID={testID}
    >
      {/* Soft rings in the corner: depth without an image. */}
      <View pointerEvents="none" style={[styles.ring, styles.ringOuter]} />
      <View pointerEvents="none" style={[styles.ring, styles.ringInner]} />
      <View style={styles.row}>
        {parsed ? <CountingValue {...parsed} from={stat.from} /> : <Text style={styles.value}>{stat.value}</Text>}
        <View style={[styles.badge, { backgroundColor: tone.fill }]}>
          <Feather name={tone.icon} size={18} color={colors.textOnBrand} />
        </View>
      </View>
      <Text style={styles.label}>{stat.label}</Text>
    </Animated.View>
  );
}

function CountingValue({ prefix, value, decimals, suffix, from }: NonNullable<ReturnType<typeof parseDisplayNumber>> & { from?: number }) {
  const shown = useCountUp(value, { from: from ?? 0, delay: 150 });
  return (
    <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit testID="stat-value">
      {prefix}
      {formatLike(shown, decimals)}
      {suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    gap: spacing.xs,
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    ...elevation.mid,
  },
  ring: { position: 'absolute', borderRadius: radii.pill, backgroundColor: colors.onBrandTile },
  ringOuter: { width: 220, height: 220, right: -80, top: -90 },
  ringInner: { width: 120, height: 120, right: -30, top: -40 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  value: { ...type.displayHero, color: colors.textOnBrand, flexShrink: 1 },
  badge: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.titleCard, color: colors.onBrandStrong },
});
