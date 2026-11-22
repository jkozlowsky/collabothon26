import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { IconTile } from '@/components/onboarding/ui';
import { AREA_ICON, AREA_LABEL, LEVEL_LABEL } from '@/constants/quickCheck';
import { barMotion } from '@/constants/motion';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';

const TRACK = 10;

type Props = {
  mark: AreaMark;
  /** One line under the bar, e.g. where the account and the answers disagree. */
  note?: string;
  noteTestID?: string;
};

/** One area: its level in words and the bar for what the answers show. */
export function AreaRow({ mark, note, noteTestID }: Props) {
  const reduced = useReducedMotion();
  const { area, mastery, level } = mark;
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
        </View>
        {note && (
          <Text style={styles.note} testID={noteTestID}>
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, minWidth: 0, gap: spacing.sm - 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  level: { ...type.labelStrong, color: colors.brandPrimary },
  note: { ...type.labelDefault, color: colors.textMuted },
  track: { height: TRACK, borderRadius: TRACK / 2, backgroundColor: colors.bgTint, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.bar + 2, backgroundColor: colors.brandPrimary },
});
