import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { AreaMap } from '@/components/categorizing/AreaMap';
import { Diamond, DIAMOND_HALF } from '@/components/categorizing/Diamond';
import { Sheet } from '@/components/bank/Sheet';
import { HAIRLINE, RULE } from '@/constants/path';
import { barMotion, diamondMotion } from '@/constants/motion';
import { AREA_LABEL, LEVEL_LABEL, LEVEL_SHORT } from '@/constants/quickCheck';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';

const BAR_W = 20;
const BAR_H = 44;

/** "Your map so far": a bar and a diamond per area at the foot of the question; a tap opens the detail sheet. */
export function MapDock({ marks }: { marks: AreaMark[] }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <>
      <Pressable
        testID="map-dock"
        accessibilityRole="button"
        accessibilityLabel="Your map so far, open details"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.dock, pressed && styles.pressed]}
      >
        <View style={styles.head}>
          <Text style={type.labelStrong}>Your map so far</Text>
          <View style={styles.details}>
            <Text style={styles.muted}>Details</Text>
            <Feather name="chevron-up" size={16} color={colors.brandPrimary} />
          </View>
        </View>
        <View style={styles.cols}>
          {marks.map(({ area, mastery, confidence, level }) => (
            <View key={area} style={styles.col} testID={`dock-area-${area}`}>
              <View style={[styles.bar, mastery === null && styles.barNone]}>
                <Animated.View
                  testID={`dock-bar-${area}`}
                  style={[styles.fill, { height: (mastery ?? 0) * BAR_H }, !reduced && barMotion]}
                />
                <Diamond
                  testID={`dock-diamond-${area}`}
                  style={[
                    styles.marker,
                    { bottom: (confidence ?? 0) * BAR_H - DIAMOND_HALF, opacity: confidence === null ? 0 : 1 },
                    !reduced && diamondMotion,
                  ]}
                />
              </View>
              <Text style={styles.name} aria-hidden>
                {AREA_LABEL[area]}
              </Text>
              <Text style={styles.muted} aria-hidden>
                {LEVEL_SHORT[level]}
              </Text>
              <Text style={styles.offscreen} testID={`dock-sr-${area}`}>
                {AREA_LABEL[area]}: {LEVEL_LABEL[level]}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Your map in detail" testID="map-sheet">
        <AreaMap marks={marks} testID="map-sheet-areas" />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    gap: spacing.sm - 2,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.smPlus,
    paddingBottom: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: HAIRLINE,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  pressed: { opacity: 0.9 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  details: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cols: { flexDirection: 'row' },
  col: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingTop: spacing.mdPlus },
  bar: { width: BAR_W, height: BAR_H, borderRadius: BAR_W / 2, backgroundColor: colors.bgTint, justifyContent: 'flex-end' },
  barNone: { backgroundColor: 'transparent', borderWidth: RULE, borderColor: colors.borderStrong },
  fill: { width: '100%', borderRadius: BAR_W / 2, backgroundColor: colors.brandPrimary },
  marker: { left: '50%', marginLeft: -DIAMOND_HALF },
  name: { ...type.labelTabActive, color: colors.textPrimary },
  muted: { ...type.labelDefault, color: colors.textMuted },
  offscreen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
