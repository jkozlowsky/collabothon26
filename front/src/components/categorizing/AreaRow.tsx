import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Diamond, DIAMOND_HALF } from '@/components/categorizing/Diamond';
import { IconTile } from '@/components/onboarding/ui';
import { AREA_ICON, AREA_LABEL, LEVEL_LABEL } from '@/constants/quickCheck';
import { barMotion, diamondMotion } from '@/constants/motion';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';

const TRACK = 10;

/** One area: its level in words, the bar for what the answers show and the diamond for how sure the user felt. */
export function AreaRow({ mark }: { mark: AreaMark }) {
  const reduced = useReducedMotion();
  const { area, mastery, confidence, level } = mark;
  return (
    <View style={styles.row} testID={`area-row-${area}`}>
      <IconTile icon={AREA_ICON[area]} size={32} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={type.titleCard}>{AREA_LABEL[area]}</Text>
          <Text style={styles.level} testID={`area-level-${area}`}>
            {LEVEL_LABEL[level]}
          </Text>
        </View>
        <View style={styles.track} aria-hidden>
          <Animated.View
            testID={`area-bar-${area}`}
            style={[styles.fill, { width: `${(mastery ?? 0) * 100}%` }, !reduced && barMotion]}
          />
          <Diamond
            testID={`area-diamond-${area}`}
            style={[
              styles.marker,
              { left: `${(confidence ?? 0) * 100}%`, opacity: confidence === null ? 0 : 1 },
              !reduced && diamondMotion,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, minWidth: 0, gap: spacing.sm - 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  level: { ...type.labelStrong, color: colors.brandPrimary },
  track: { height: TRACK, borderRadius: TRACK / 2, backgroundColor: colors.bgTint, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.bar + 2, backgroundColor: colors.brandPrimary },
  marker: { marginLeft: -DIAMOND_HALF },
});
