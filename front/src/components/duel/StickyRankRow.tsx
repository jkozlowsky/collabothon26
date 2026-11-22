import { StyleSheet, View } from 'react-native';

import { RankingListItem } from '@/components/duel/RankingListItem';
import { colors, elevation, spacing } from '@/constants/theme';
import type { RankingRow } from '@/types/duel';

type Props = {
  row: RankingRow;
  position?: 'top' | 'bottom';
  testID?: string;
};

/**
 * Sticky own row when offscreen (Figma Frame 04, node 166:5622).
 * Sits in a canvas strip with a top (or bottom) border above the edge with elevation.mid.
 */
export function StickyRankRow({ row, position = 'bottom', testID = 'rankings-pinned-me' }: Props) {
  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.topStrip : styles.bottomStrip,
      ]}
      testID={testID}
    >
      <View style={styles.cardWrap}>
        <RankingListItem row={row} isYou variant="pinned" testID="rankings-sticky-item" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.bgCanvas,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 20,
    ...elevation.mid,
  },
  bottomStrip: {
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  topStrip: {
    top: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  cardWrap: {
    ...elevation.mid,
  },
});
