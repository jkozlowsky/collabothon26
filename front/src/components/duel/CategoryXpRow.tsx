import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { CategoryMatchEnd } from '@/types/duel';

type Props = {
  item: CategoryMatchEnd;
  delayMs?: number;
  testID?: string;
};

/**
 * Category XP Row (Figma node 166:7589).
 * 40 px icon tile at 14% category tint.
 * 8 px progress track showing old XP (solid) + gained XP (animated 40% tint segment).
 */
export function CategoryXpRow({ item, delayMs = 300, testID }: Props) {
  const meta = getStoryCategoryMeta(item.story);
  const reducedMotion = useReducedMotion();

  // Fraction within level for xpBefore and xpAfter
  const forLevel = item.xpForLevelAfter > 0 ? item.xpForLevelAfter : 100;
  // xpBefore fraction within level
  const beforeFrac = Math.max(0, Math.min(1, (item.xpIntoLevelAfter - item.xpGained) / forLevel));
  const afterFrac = Math.max(0, Math.min(1, item.xpIntoLevelAfter / forLevel));

  const fillAnim = useSharedValue(reducedMotion ? afterFrac : beforeFrac);

  useEffect(() => {
    if (reducedMotion) {
      fillAnim.value = afterFrac;
    } else {
      fillAnim.value = withDelay(
        delayMs,
        withTiming(afterFrac, {
          duration: 900,
          easing: Easing.out(Easing.quad),
        })
      );
    }
  }, [afterFrac, delayMs, fillAnim, reducedMotion]);

  const gainedStyle = useAnimatedStyle(() => {
    const widthPct = `${Math.max(0, fillAnim.value * 100)}%`;
    return {
      width: widthPct as unknown as number,
    };
  });

  const levelText =
    item.levelAfter > item.levelBefore
      ? `Lv ${item.levelBefore} → Lv ${item.levelAfter}`
      : `Lv ${item.levelBefore}`;

  return (
    <View style={styles.container} testID={testID ?? `category-xp-${item.story}`}>
      {/* 40px icon tile */}
      <View style={[styles.iconTile, { backgroundColor: meta.tint }]}>
        <Feather name={meta.icon as keyof typeof Feather.glyphMap} size={20} color={meta.accent} />
      </View>

      {/* Main info & progress */}
      <View style={styles.content}>
        {/* Header row: Category name, Level, Gain */}
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {meta.name}
            </Text>
            <Text style={styles.levelText}>{levelText}</Text>
          </View>

          {item.xpGained > 0 && (
            <View style={styles.gainPill}>
              <Text style={styles.gainText}>+{item.xpGained} XP</Text>
            </View>
          )}
        </View>

        {/* 8px Progress Track */}
        <View style={styles.track}>
          {/* Animated fill (old + gained) */}
          <Animated.View
            style={[
              styles.barGained,
              { backgroundColor: meta.tint },
              gainedStyle,
            ]}
          >
            {/* Solid old XP portion inside */}
            <View
              style={[
                styles.barSolid,
                {
                  backgroundColor: meta.accent,
                  width: `${afterFrac > 0 ? (beforeFrac / afterFrac) * 100 : 0}%`,
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Subtitle / Meta */}
        <Text style={styles.metaText}>
          {item.xpIntoLevelAfter} / {item.xpForLevelAfter} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  categoryName: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  levelText: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
  gainPill: {
    backgroundColor: colors.brandAccentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  gainText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.brandPrimary,
  },
  track: {
    height: 8,
    backgroundColor: colors.bgTint,
    borderRadius: radii.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  barGained: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barSolid: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
  },
  metaText: {
    ...type.labelDefault,
    color: colors.textMuted,
    fontSize: 11,
  },
});
