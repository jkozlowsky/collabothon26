import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Globe, type GlobeHandle } from '@/components/globe/Globe';
import { GlobeBackdrop } from '@/components/globe/GlobeBackdrop';
import { GlobeHint } from '@/components/globe/GlobeHint';
import { HeaderFade } from '@/components/globe/HeaderFade';
import { LearnHeader } from '@/components/LearnHeader';
import { haptic } from '@/components/onboarding/ui';
import { SHEET_PEEK, StorySheet } from '@/components/StorySheet';
import { colors, nav, spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useApi } from '@/hooks/useApi';
import { useBank } from '@/hooks/useBank';
import { takeArrival } from '@/hooks/useOpenLearn';
import { useStartHere } from '@/hooks/useStartHere';
import { calloutState, isDone, LEARNER, sortStories, STORIES, withCurrent, withLessons } from '@/lib/stories';
import { useCurrentUser } from '@/lib/user';
import type { LessonSummary } from '@/types/lessons';

/** The success haptic lands as the finished city's check pops in. */
const CHECK_HAPTIC_MS = 300;
/** After a city's check pops in, the plane takes off for the next one. */
const TAKE_OFF_MS = 1300;
/** With the sheet low, the globe moves down to the middle of the free space, by at most this much. */
const MAX_DROP = 120;

/** Map tab (Figma 3:496): header, the globe with story pins, and the "Your journeys" sheet. */
export default function MapScreen() {
  const { userId } = useCurrentUser();
  const globe = useRef<GlobeHandle>(null);
  // Estimates until the first layout pass measures the real values.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [sheetTop, setSheetTop] = useState(Math.round(window.height * 0.66));
  const [hint, setHint] = useState(true);
  // Sheet stops: half sits just under the globe (sheetTop), peek leaves only the header above the nav.
  const peekTop = Math.max(sheetTop, height - nav.clearance - SHEET_PEEK);
  const drop = Math.min(MAX_DROP, (peekTop - sheetTop) / 2);
  const sheetY = useSharedValue(peekTop);
  // The globe rides up as the sheet rises from peek to half; above half the sheet covers it.
  const globeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sheetY.value, [sheetTop, peekTop], [0, drop], 'clamp') }],
  }));
  const { data: lessons, reload } = useApi<LessonSummary[]>(`/api/lessons?userId=${encodeURIComponent(userId)}`);
  // Coming back from a lesson moves the story's progress on.
  useFocusEffect(reload);
  const startHere = useStartHere();
  // Real streak and XP once the stats load; the mock until then.
  const { account, stats } = useAccount();
  // The signed-in user's first name; before the account loads (or offline) the bank's own copy of it.
  const { state: bank } = useBank();
  const name = account?.firstName ?? bank.owner.name.split(' ')[0];
  const learner = { ...LEARNER, name, ...(stats && { streak: stats.currentStreak, xp: stats.totalXp }) };
  // One "start" cue: the Quick check's story replaces main's default current story.
  const startId = startHere?.storyId;
  // The globe picks its first view at mount, before the startHere story is known.
  useEffect(() => {
    if (!startId) return;
    // Straight after onboarding the plane flies in to the first destination; later it only turns.
    if (takeArrival()) globe.current?.flyIn(startId);
    else globe.current?.flyTo(startId, true);
  }, [startId]);
  // The highlight moves on once a story is done, also without a Quick check result.
  const stories = useMemo(() => withCurrent(withLessons(STORIES, lessons), startId), [lessons, startId]);

  // Set by the lesson screen when the user finished a city's last lesson.
  const { celebrate } = useLocalSearchParams<{ celebrate?: string }>();
  const played = useRef<string>(undefined);
  const celebrated = celebrate ? stories.find((s) => s.id === celebrate) : undefined;
  // Waits for the reloaded lessons, so the city already counts as done when its check pops in.
  const ready = celebrated !== undefined && isDone(celebrated);
  const justDoneId = ready ? celebrate : undefined;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!ready || !celebrate || played.current === celebrate) return;
    played.current = celebrate;
    globe.current?.face(celebrate);
    const next = sortStories(stories).find((s) => s.id !== celebrate && ['inProgress', 'notStarted'].includes(calloutState(s)));
    timers.current.push(setTimeout(() => haptic('success'), CHECK_HAPTIC_MS));
    if (next) timers.current.push(setTimeout(() => globe.current?.flyTo(next.id, true), TAKE_OFF_MS));
    // `played` makes this once per finished path, so a lessons reload (new `stories`) does not replay it.
  }, [ready, celebrate, stories]);
  // Only unmount cancels the take-off: a lessons reload may flip `ready` while the timers run.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openStory = (id: string) => router.push({ pathname: '/story/[id]', params: { id } });
  const openDuel = () => router.push('/duel');

  return (
    <View style={styles.screen} testID="screen-learn" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <GlobeBackdrop />
      <SafeAreaView edges={['top', 'left', 'right']} onLayout={(e) => setSheetTop(e.nativeEvent.layout.height + spacing.md)}>
        {/* Above the globe: a zoomed-in sphere slides under the header and fades out at its edge. */}
        <View style={styles.header}>
          <View style={styles.headerFill} />
          <LearnHeader learner={learner} />
          <HeaderFade />
        </View>
        <Animated.View style={globeStyle}>
          <Globe
            ref={globe}
            stories={stories}
            onOpenStory={openStory}
            onSpin={() => setHint(false)}
            arena={{ onOpen: openDuel }}
            startHere={startHere}
            justDoneId={justDoneId}
            reachUp={drop}
          />
          {/* Keeps its space when hidden, so the sheet does not jump. */}
          <View style={!hint && styles.hidden}>
            <GlobeHint />
          </View>
        </Animated.View>
      </SafeAreaView>
      <StorySheet
        stories={stories}
        height={height}
        halfTop={sheetTop}
        peekTop={peekTop}
        top={sheetY}
        onSelect={(id) => globe.current?.flyTo(id)}
        startHere={startHere}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  hidden: { opacity: 0 },
  header: { zIndex: 1, backgroundColor: colors.brandPrimarySoft },
  // Covers the status-bar inset above the header too.
  headerFill: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1000, backgroundColor: colors.brandPrimarySoft },
});
