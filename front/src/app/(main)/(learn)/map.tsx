import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Globe, type GlobeHandle } from '@/components/globe/Globe';
import { GlobeHint } from '@/components/globe/GlobeHint';
import { LearnHeader } from '@/components/LearnHeader';
import { haptic } from '@/components/onboarding/ui';
import { StorySheet } from '@/components/StorySheet';
import { colors, spacing } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useStartHere } from '@/hooks/useStartHere';
import { calloutState, isDone, LEARNER, sortStories, STORIES, withCurrent, withLessons } from '@/lib/stories';
import { useCurrentUser } from '@/lib/user';
import type { LessonSummary } from '@/types/lessons';

/** After a city's check pops in, the plane takes off for the next one. */
const TAKE_OFF_MS = 1300;

/** Map tab (Figma 3:496): header, the globe with story pins, and the "Your journeys" sheet. */
export default function MapScreen() {
  const { userId } = useCurrentUser();
  const globe = useRef<GlobeHandle>(null);
  // Estimates until the first layout pass measures the real values.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [sheetTop, setSheetTop] = useState(Math.round(window.height * 0.66));
  const [hint, setHint] = useState(true);
  const { data: lessons, reload } = useApi<LessonSummary[]>(`/api/lessons?userId=${encodeURIComponent(userId)}`);
  // Coming back from a lesson moves the story's progress on.
  useFocusEffect(reload);
  const startHere = useStartHere();
  // One "start" cue: the Quick check's story replaces main's default current story.
  const startId = startHere?.storyId;
  // The globe picks its first view at mount, before the startHere story is known.
  useEffect(() => {
    if (startId) globe.current?.flyTo(startId, true);
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
    timers.current.push(setTimeout(() => haptic('success'), 300));
    if (next) timers.current.push(setTimeout(() => globe.current?.flyTo(next.id, true), TAKE_OFF_MS));
    // Plays once per finished path; `stories` only feeds the pick of the next city.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, celebrate]);
  // Only unmount cancels the take-off: a lessons reload may flip `ready` while the timers run.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openStory = (id: string) => router.push({ pathname: '/story/[id]', params: { id } });
  const openDuel = () => router.push('/duel');

  return (
    <View style={styles.screen} testID="screen-learn" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <SafeAreaView edges={['top', 'left', 'right']} onLayout={(e) => setSheetTop(e.nativeEvent.layout.height + spacing.md)}>
        <LearnHeader learner={LEARNER} />
        <Globe
          ref={globe}
          stories={stories}
          onOpenStory={openStory}
          onSpin={() => setHint(false)}
          arena={{ onOpen: openDuel }}
          startHere={startHere}
          justDoneId={justDoneId}
        />
        {/* Keeps its space when hidden, so the sheet does not jump. */}
        <View style={!hint && styles.hidden}>
          <GlobeHint />
        </View>
      </SafeAreaView>
      <StorySheet stories={stories} height={height} collapsedTop={sheetTop} onSelect={(id) => globe.current?.flyTo(id)} startHere={startHere} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  hidden: { opacity: 0 },
});
