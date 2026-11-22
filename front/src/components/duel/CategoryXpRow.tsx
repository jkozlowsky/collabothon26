import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Confetti } from '@/components/fx/Confetti';
import { FxLayer } from '@/components/fx/FxLayer';

import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { barMeta, barSpan } from '@/lib/duel/xp';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { CategoryMatchEnd } from '@/types/duel';

/** How long a bar takes to fill; the result screen uses it to time the finale. */
export const BAR_FILL_MS = 900;

type Props = {
  item: CategoryMatchEnd;
  delayMs?: number;
  testID?: string;
};

/** A four-point star that pops at the bar's end. */
function Sparkle({ color, pop }: { color: string; pop: { value: number } }) {
  const style = useAnimatedStyle(() => ({
    opacity: pop.value > 0 ? 1 : 0,
    transform: [{ scale: pop.value }, { rotate: `${pop.value * 90}deg` }],
  }));
  return (
    <Animated.View style={[styles.sparkle, style]} pointerEvents="none" testID="category-sparkle">
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Category XP Row (Figma 166:7589): icon tile, name, "+n XP", level, a track with the old XP solid and the
 * gained XP as a 40% tint. The tint sweeps from old to new with a sparkle at its end; a level-up pops a chip.
 */
export function CategoryXpRow({ item, delayMs = 300, testID }: Props) {
  const meta = getStoryCategoryMeta(item.story);
  const reduced = useReducedMotion();
  const instant = reduced || process.env.NODE_ENV === 'test';
  const { from, to, levelUp } = barSpan(item);

  const fill = useSharedValue(instant ? to : from);
  const sparkle = useSharedValue(0);
  const chip = useSharedValue(instant ? 1 : 0);
  // A level-up shoots a confetti burst out of this row when its bar is full.
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (instant) return;
    fill.value = withDelay(delayMs, withTiming(to, { duration: BAR_FILL_MS, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => {
      if (to > from) sparkle.value = withSequence(withTiming(1.3, { duration: 220 }), withDelay(120, withTiming(0, { duration: 260 })));
      if (levelUp) {
        chip.value = withSpring(1, { damping: 8, stiffness: 220 });
        setBurst(true);
      }
    }, delayMs + BAR_FILL_MS);
    return () => clearTimeout(timer);
  }, [instant, delayMs, from, to, levelUp, fill, sparkle, chip]);

  const newStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const sparkleStyle = useAnimatedStyle(() => ({ left: `${fill.value * 100}%` }));
  const chipStyle = useAnimatedStyle(() => ({ opacity: chip.value, transform: [{ scale: chip.value }] }));

  const levelLabel = levelUp ? `Lv ${item.levelBefore} → ${item.levelAfter}` : `Lv ${item.levelBefore}`;

  return (
    <View style={styles.row} testID={testID ?? `category-xp-${item.story}`}>
      {burst && (
        <FxLayer>
          {({ width, height }) => <Confetti width={width} height={height} mode="pop" count={26} at={{ x: 0.55, y: 0.45 }} clip={false} testID={`category-burst-${item.story}`} />}
        </FxLayer>
      )}
      <View style={[styles.tile, { backgroundColor: meta.tint }]}>
        <Feather name={meta.icon as keyof typeof Feather.glyphMap} size={20} color={meta.accent} />
      </View>
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {meta.name}
          </Text>
          {levelUp && (
            <Animated.View style={[styles.chip, chipStyle]} testID={`category-level-chip-${item.story}`}>
              <Text style={styles.chipText}>Level up!</Text>
            </Animated.View>
          )}
          <Text style={styles.gain}>+{item.xpGained} XP</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.level}>{levelLabel}</Text>
          <View style={styles.trackWrap}>
            <View style={styles.track}>
              <Animated.View style={[styles.new, { backgroundColor: meta.accent + '66' }, newStyle]} />
              <View style={[styles.old, { backgroundColor: meta.accent, width: `${from * 100}%` }]} />
            </View>
            <Animated.View style={[styles.sparkleAnchor, sparkleStyle]} pointerEvents="none">
              <Sparkle color={colors.brandAccent} pop={sparkle} />
            </Animated.View>
          </View>
        </View>
        <Text style={styles.meta}>{barMeta(item)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: 40, height: 40, borderRadius: radii.tile, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 6, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.titleCard, color: colors.textPrimary, flexShrink: 1 },
  chip: { backgroundColor: colors.brandAccent, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chipText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, color: colors.textOnAccent },
  gain: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.feedbackXp, marginLeft: 'auto' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 16 },
  level: { ...type.labelStrong, color: colors.textPrimary },
  trackWrap: { flex: 1, justifyContent: 'center' },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.bgTint, overflow: 'hidden' },
  new: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.pill },
  old: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.pill },
  // Zero-width anchor that follows the bar's end; the star is centred on it.
  sparkleAnchor: { position: 'absolute', top: 0, bottom: 0, width: 0, alignItems: 'center', justifyContent: 'center' },
  sparkle: { width: 22, height: 22 },
  meta: { ...type.labelDefault, color: colors.textMuted },
});
