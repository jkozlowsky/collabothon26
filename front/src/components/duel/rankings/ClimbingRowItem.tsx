import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { RankingListItem } from '@/components/duel/RankingListItem';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { RankingRow } from '@/types/duel';

type Props = {
  row: RankingRow;
  isYou: boolean;
  isOvertaken: boolean;
  placesGained: number;
  rowHeight: number;
  isClimbActive: boolean;
  climbDone: boolean;
  /** 0 at the old rank, 1 at the new one. */
  climbProgress: SharedValue<number>;
  previousRank?: number | null;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/** How much your row grows at the middle of the climb (1 + this). */
const CLIMB_SCALE_BUMP = 0.04;

/** While the climb plays, rows show the rank they had before it. */
function rowBeforeClimb(row: RankingRow, isYou: boolean, isOvertaken: boolean, previousRank?: number | null): RankingRow {
  if (isYou && previousRank != null) return { ...row, rank: previousRank };
  if (isOvertaken) return { ...row, rank: row.rank - 1 };
  return row;
}

/** A ranking row that can play the climb: your row slides up while the rows you overtook slide down one place. */
export function ClimbingRowItem({
  row,
  isYou,
  isOvertaken,
  placesGained,
  rowHeight,
  isClimbActive,
  climbDone,
  climbProgress,
  previousRank,
  onLayout,
}: Props) {
  const climbing = isClimbActive && !climbDone;

  const animatedStyle = useAnimatedStyle(() => {
    if (!climbing) return {};
    if (isYou) {
      const scale = 1 + CLIMB_SCALE_BUMP * Math.sin(climbProgress.value * Math.PI);
      const translateY = (1 - climbProgress.value) * placesGained * rowHeight;
      return {
        transform: [{ translateY }, { scale }],
        zIndex: 10,
      };
    }
    if (isOvertaken) {
      const translateY = -(1 - climbProgress.value) * rowHeight;
      return {
        transform: [{ translateY }],
        zIndex: 5,
      };
    }
    return {};
  });

  const displayedRow = climbing ? rowBeforeClimb(row, isYou, isOvertaken, previousRank) : row;

  if (isYou) {
    return (
      <Animated.View onLayout={onLayout} style={[styles.meRowWrapper, animatedStyle]} testID="rankings-me-row">
        <RankingListItem row={displayedRow} isYou testID={`ranking-row-${displayedRow.rank}`} />
        {climbDone && placesGained > 0 && (
          <View style={styles.climbChip} testID="climb-up-chip">
            <Text style={styles.climbChipText}>
              Up {placesGained} {placesGained === 1 ? 'place' : 'places'}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (isOvertaken) {
    return (
      <Animated.View style={animatedStyle}>
        <RankingListItem row={displayedRow} isYou={false} testID={`ranking-row-${displayedRow.rank}`} />
      </Animated.View>
    );
  }

  return <RankingListItem row={row} isYou={false} testID={`ranking-row-${row.rank}`} />;
}

const styles = StyleSheet.create({
  meRowWrapper: {
    position: 'relative',
  },
  climbChip: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xs,
    backgroundColor: colors.feedbackSuccessSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  climbChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.feedbackSuccess,
  },
});
