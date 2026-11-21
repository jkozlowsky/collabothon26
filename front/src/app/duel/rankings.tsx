import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { MedalCard, MedalCardRank } from '@/components/duel/MedalCard';
import { RankingListItem } from '@/components/duel/RankingListItem';
import { StickyRankRow } from '@/components/duel/StickyRankRow';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { haptic, playSound } from '@/lib/duel/feedback';
import { getWeeklyLeagueClock } from '@/lib/duel/meta';
import { USER_ID } from '@/lib/user';
import type { RankingRow, Rankings } from '@/types/duel';

const RANKINGS_PATH = `/api/duel/rankings?userId=${encodeURIComponent(USER_ID)}`;

/** Weekly overall rankings (Figma frames 04–06, nodes 166:5622 / 166:6337 / 166:7025). */
export default function DuelRankingsScreen() {
  const { data, loading, error, reload } = useApi<Rankings>(RANKINGS_PATH);
  const clock = getWeeklyLeagueClock();
  const weekInfo = `Week ${clock.week} · ends in ${clock.days} ${clock.days === 1 ? 'day' : 'days'}`;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/duel');
  }

  return (
    <SafeAreaView style={styles.safe} testID="screen-duel-rankings">
      <StatusBar style="light" />

      {/* Navy Header */}
      <View style={styles.navyHeader}>
        <View style={styles.headerTop}>
          <IconButton icon="chevron-left" onPress={goBack} label="Back" testID="rankings-back" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.subtitle}>XP earned since Monday</Text>
          <Text style={styles.title} accessibilityRole="header">
            Weekly ranking
          </Text>
          <Text style={styles.weekInfo}>{weekInfo}</Text>
        </View>
      </View>

      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => (
          <RankingsContent
            top={data?.top ?? []}
            me={data?.me ?? null}
          />
        )}
      </AsyncContent>
    </SafeAreaView>
  );
}

function RankingsContent({ top, me }: { top: RankingRow[]; me: RankingRow | null }) {
  const reducedMotion = useReducedMotion();

  // Sticky row tracking
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [listContainerY, setListContainerY] = useState(16);
  const [listCardY, setListCardY] = useState(248);
  const [meRowLayout, setMeRowLayout] = useState<{ y: number; height: number } | null>(null);

  // Climb state
  const [isClimbing, setIsClimbing] = useState(false);
  const [climbDone, setClimbDone] = useState(false);
  const climbProgress = useSharedValue(1);

  const meUserId = me?.userId ?? USER_ID;
  const isMeInTop3 = me ? me.rank <= 3 || top.slice(0, 3).some((r) => r.userId === meUserId) : false;

  const previousRank = me?.previousRank;
  const lastXpEventId = me?.lastXpEventId;
  const hasClimb = Boolean(
    me && previousRank != null && previousRank > me.rank && lastXpEventId != null
  );

  // Check climb eligibility via AsyncStorage
  const hasCheckedClimbRef = useRef(false);
  useEffect(() => {
    if (!hasClimb || !me || lastXpEventId == null || hasCheckedClimbRef.current) return;
    hasCheckedClimbRef.current = true;

    (async () => {
      try {
        const storageKey = `@duel_climb_event_${me.userId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored === String(lastXpEventId)) {
          setClimbDone(true);
          climbProgress.value = 1;
          return;
        }

        await AsyncStorage.setItem(storageKey, String(lastXpEventId));

        if (reducedMotion) {
          setClimbDone(true);
          climbProgress.value = 1;
          playSound('rank-up');
          haptic('light');
        } else {
          const animDuration = 1200;
          setIsClimbing(true);
          climbProgress.value = 0;
          climbProgress.value = withTiming(
            1,
            { duration: animDuration, easing: Easing.inOut(Easing.ease) }
          );

          setTimeout(() => {
            setIsClimbing(false);
            setClimbDone(true);
            playSound('rank-up');
            haptic('light');
          }, animDuration);
        }
      } catch {
        setClimbDone(true);
        climbProgress.value = 1;
      }
    })();
  }, [hasClimb, lastXpEventId, me, reducedMotion, climbProgress]);

  // Top 3 medal cards (always final API order)
  const top3 = top.slice(0, 3);
  // List starts from rank 4 (always final API order)
  const listRows = top.filter((r) => r.rank >= 4);

  // Whether me's row is actually rendered in listRows
  const isMeRenderedInList = listRows.some(
    (r) => r.userId === meUserId || (me ? r.rank === me.rank : false)
  );

  // Absolute Y range of me's row within ScrollView content
  const estimatedRowY = me && me.rank >= 4 ? (me.rank - 4) * 64 : 0;
  const rowTop = listContainerY + listCardY + (meRowLayout ? meRowLayout.y : estimatedRowY);
  const rowHeight = meRowLayout?.height ?? 64;
  const rowBottom = rowTop + rowHeight;

  // The row is visible only if it is actually rendered in the list AND any part of it intersects the visible scroll viewport
  const isMeRowVisible = Boolean(
    me &&
      !isMeInTop3 &&
      isMeRenderedInList &&
      rowBottom > scrollY &&
      rowTop < scrollY + viewportHeight
  );

  // The sticky copy must be shown ONLY while your real row is fully outside the visible scroll viewport
  const showSticky = Boolean(
    me &&
      !isMeInTop3 &&
      !isMeRowVisible
  );

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollY(e.nativeEvent.contentOffset.y);
  }

  function handleScrollViewLayout(e: LayoutChangeEvent) {
    setViewportHeight(e.nativeEvent.layout.height);
  }

  function handleMeRowLayout(e: LayoutChangeEvent) {
    setMeRowLayout({
      y: e.nativeEvent.layout.y,
      height: e.nativeEvent.layout.height,
    });
  }

  const placesGained = me && previousRank ? previousRank - me.rank : 0;
  const isClimbActive = isClimbing || (hasClimb && !climbDone);

  return (
    <View style={styles.content}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={handleScrollViewLayout}
        testID="rankings-scroll"
      >
        {top.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              icon="trophy"
              title="No players this week"
              body="Play a duel with a rival to take the lead in the league."
              testID="rankings-empty"
            />
          </View>
        ) : (
          <View
            style={styles.listContainer}
            onLayout={(e) => setListContainerY(e.nativeEvent.layout.y)}
          >
            {/* Top 3 Medal Cards */}
            <View style={styles.top3Section} testID="rankings-top-3">
              {top3.map((row) => {
                const rankNum = row.rank as MedalCardRank;
                const isYou = row.userId === meUserId || (me ? row.rank === me.rank && isMeInTop3 : false);
                return (
                  <MedalCard
                    key={`${row.userId}-${row.rank}`}
                    row={row}
                    rank={rankNum}
                    isYou={isYou}
                  />
                );
              })}
            </View>

            {/* List from #4 (final list order) */}
            <View onLayout={(e) => setListCardY(e.nativeEvent.layout.y)}>
              <ListCard testID="rankings-list">
                {listRows.map((row) => {
                  const isYou = row.userId === meUserId || (me ? row.rank === me.rank : false);
                  const isOvertaken = Boolean(
                    hasClimb && me && previousRank && row.rank > me.rank && row.rank <= previousRank
                  );

                  return (
                    <ClimbingRowItem
                      key={`${row.userId}-${row.rank}`}
                      row={row}
                      isYou={isYou}
                      isOvertaken={isOvertaken}
                      placesGained={placesGained}
                      rowHeight={64}
                      isClimbActive={isClimbActive}
                      climbDone={climbDone}
                      climbProgress={climbProgress}
                      previousRank={previousRank}
                      onLayout={isYou ? handleMeRowLayout : undefined}
                    />
                  );
                })}
              </ListCard>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky own row at bottom while off-screen */}
      {showSticky && me && (
        <StickyRankRow
          row={me}
          position="bottom"
          testID="rankings-pinned-me"
        />
      )}
    </View>
  );
}

function ClimbingRowItem({
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
}: {
  row: RankingRow;
  isYou: boolean;
  isOvertaken: boolean;
  placesGained: number;
  rowHeight: number;
  isClimbActive: boolean;
  climbDone: boolean;
  climbProgress: SharedValue<number>;
  previousRank?: number | null;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!isClimbActive || climbDone) return {};
    if (isYou) {
      const scale = 1 + 0.04 * Math.sin(climbProgress.value * Math.PI);
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

  const displayedRow = (() => {
    if (climbDone || !isClimbActive) return row;
    if (isYou && previousRank != null) {
      return { ...row, rank: previousRank };
    }
    if (isOvertaken) {
      return { ...row, rank: row.rank - 1 };
    }
    return row;
  })();

  if (isYou) {
    return (
      <Animated.View
        onLayout={onLayout}
        style={[styles.meRowWrapper, animatedStyle]}
        testID="rankings-me-row"
      >
        <RankingListItem
          row={displayedRow}
          isYou
          testID={`ranking-row-${displayedRow.rank}`}
        />
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
        <RankingListItem
          row={displayedRow}
          isYou={false}
          testID={`ranking-row-${displayedRow.rank}`}
        />
      </Animated.View>
    );
  }

  return (
    <RankingListItem
      row={row}
      isYou={false}
      testID={`ranking-row-${row.rank}`}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  navyHeader: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  subtitle: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
  },
  title: {
    ...type.displayLarge,
    color: colors.textOnBrand,
  },
  weekInfo: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 110,
  },
  emptyCard: {
    paddingTop: spacing.xxl,
  },
  listContainer: {
    gap: spacing.lg,
  },
  top3Section: {
    gap: spacing.sm,
  },
  meRowWrapper: {
    position: 'relative',
  },
  climbChip: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xs,
    backgroundColor: colors.feedbackSuccessSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  climbChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.feedbackSuccess,
  },
});
