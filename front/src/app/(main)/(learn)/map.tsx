import { router, useFocusEffect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Globe, type GlobeHandle } from '@/components/globe/Globe';
import { GlobeHint } from '@/components/globe/GlobeHint';
import { LearnHeader } from '@/components/LearnHeader';
import { StorySheet } from '@/components/StorySheet';
import { colors, spacing } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useStartHere } from '@/hooks/useStartHere';
import { LEARNER, STORIES, withLessons } from '@/lib/stories';
import { USER_ID } from '@/lib/user';
import type { LessonSummary } from '@/types/lessons';

/** Map tab (Figma 3:496): header, the globe with story pins, and the "Your stories" sheet. */
export default function MapScreen() {
  const globe = useRef<GlobeHandle>(null);
  // Estimates until the first layout pass measures the real values.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [sheetTop, setSheetTop] = useState(Math.round(window.height * 0.66));
  const [hint, setHint] = useState(true);
  const { data: lessons, reload } = useApi<LessonSummary[]>(`/api/lessons?userId=${encodeURIComponent(USER_ID)}`);
  // Coming back from a lesson moves the story's progress on.
  useFocusEffect(reload);
  const startHere = useStartHere();
  // One "start" cue: the Quick check's story replaces main's default current story.
  const startId = startHere?.storyId;
  // The globe picks its first view at mount, before the startHere story is known.
  useEffect(() => {
    if (startId) globe.current?.flyTo(startId, true);
  }, [startId]);
  const stories = useMemo(() => {
    const all = withLessons(STORIES, lessons);
    return startId ? all.map((s) => ({ ...s, current: s.id === startId })) : all;
  }, [lessons, startId]);

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
