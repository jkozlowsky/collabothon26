import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { ListCard } from '@/components/bank/ListCard';
import { MedalCard, MedalCardRank } from '@/components/duel/MedalCard';
import { StickyRankRow } from '@/components/duel/StickyRankRow';
import { ClimbingRowItem } from '@/components/duel/rankings/ClimbingRowItem';
import { spacing } from '@/constants/theme';
import { haptic, playSound } from '@/lib/duel/feedback';
import { stickyPosition, type StickyPosition } from '@/lib/duel/sticky';
import type { RankingRow } from '@/types/duel';

type Props = {
  top: RankingRow[];
  me: RankingRow | null;
  currentUserId: string;
};

const CLIMB_DURATION_MS = 1200;
/** Height of a list row (RankingListItem); also the estimate until your row is measured. */
const ROW_HEIGHT = 64;

/** The ranking body: medal cards for the top 3, the list from #4, your row pinned while it is out of view. */
export function RankingsContent({ top, me, currentUserId }: Props) {
  const reducedMotion = useReducedMotion();

  // Sticky row tracking; the initial numbers are estimates until onLayout reports the real ones.
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [listContainerY, setListContainerY] = useState(16);
  const [listCardY, setListCardY] = useState(248);
  const [meRowLayout, setMeRowLayout] = useState<{ y: number; height: number } | null>(null);

  const [isClimbing, setIsClimbing] = useState(false);
  const [climbDone, setClimbDone] = useState(false);
  const climbProgress = useSharedValue(1);

  const meUserId = me?.userId ?? currentUserId;
  const isMeInTop3 = me ? me.rank <= 3 || top.slice(0, 3).some((r) => r.userId === meUserId) : false;

  const previousRank = me?.previousRank;
  const lastXpEventId = me?.lastXpEventId;
  const hasClimb = Boolean(me && previousRank != null && previousRank > me.rank && lastXpEventId != null);

  const climbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (climbTimerRef.current) clearTimeout(climbTimerRef.current);
    },
    [],
  );

  // Each XP event animates the climb once per account: the last animated event id is kept in AsyncStorage.
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
          setIsClimbing(true);
          climbProgress.value = 0;
          climbProgress.value = withTiming(1, { duration: CLIMB_DURATION_MS, easing: Easing.inOut(Easing.ease) });

          climbTimerRef.current = setTimeout(() => {
            setIsClimbing(false);
            setClimbDone(true);
            playSound('rank-up');
            haptic('light');
          }, CLIMB_DURATION_MS);
        }
      } catch {
        setClimbDone(true);
        climbProgress.value = 1;
      }
    })();
  }, [hasClimb, lastXpEventId, me, reducedMotion, climbProgress]);

  // Both in the final API order: the climb only shifts rows visually.
  const top3 = top.slice(0, 3);
  const listRows = top.filter((r) => r.rank >= 4);

  const isMeRenderedInList = listRows.some((r) => r.userId === meUserId || (me ? r.rank === me.rank : false));

  // Absolute y of your row within the scroll content.
  const estimatedRowY = me && me.rank >= 4 ? (me.rank - 4) * ROW_HEIGHT : 0;
  const rowTop = listContainerY + listCardY + (meRowLayout ? meRowLayout.y : estimatedRowY);
  const rowHeight = meRowLayout?.height ?? ROW_HEIGHT;

  // Inline while in view, pinned to the top once scrolled past, to the bottom while not reached yet.
  const stickyPos: StickyPosition =
    me && !isMeInTop3
      ? isMeRenderedInList
        ? stickyPosition(rowTop, rowHeight, scrollY, viewportHeight)
        : 'bottom'
      : null;

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
          <View style={styles.listContainer} onLayout={(e) => setListContainerY(e.nativeEvent.layout.y)}>
            <View style={styles.top3Section} testID="rankings-top-3">
              {top3.map((row) => (
                <MedalCard
                  key={`${row.userId}-${row.rank}`}
                  row={row}
                  rank={row.rank as MedalCardRank}
                  isYou={row.userId === meUserId || (me ? row.rank === me.rank && isMeInTop3 : false)}
                />
              ))}
            </View>

            <View onLayout={(e) => setListCardY(e.nativeEvent.layout.y)}>
              <ListCard testID="rankings-list">
                {listRows.map((row) => {
                  const isYou = row.userId === meUserId || (me ? row.rank === me.rank : false);
                  const isOvertaken = Boolean(
                    hasClimb && me && previousRank && row.rank > me.rank && row.rank <= previousRank,
                  );

                  return (
                    <ClimbingRowItem
                      key={`${row.userId}-${row.rank}`}
                      row={row}
                      isYou={isYou}
                      isOvertaken={isOvertaken}
                      placesGained={placesGained}
                      rowHeight={ROW_HEIGHT}
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

      {/* Pinned own row while the real one is out of view */}
      {stickyPos && me && <StickyRankRow row={me} position={stickyPos} testID="rankings-pinned-me" />}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
