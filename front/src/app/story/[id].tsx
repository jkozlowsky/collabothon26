import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/bank/IconButton';
import { Sheet } from '@/components/bank/Sheet';
import { OffersEntryCard } from '@/components/offers/OffersEntryCard';
import { PathProgress } from '@/components/path/PathProgress';
import { PathStop } from '@/components/path/PathStop';
import { YourMoneyCard } from '@/components/path/YourMoneyCard';
import { StoryLandmark } from '@/components/StoryLandmark';
import { colors, radii, spacing, storyColors, tints, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { offersFor } from '@/lib/offers';
import { USER_ID } from '@/lib/user';
import type { StoryPage } from '@/types/stories';

/** Building heights for the hero skyline, derived from the city name so every city gets its own, stable outline. */
function skyline(city: string) {
  let seed = [...city].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: 16 }, () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 40 + (seed % 70);
  });
}

export default function StoryScreen() {
  const { id, lesson: targetLessonId } = useLocalSearchParams<{ id: string; lesson?: string }>();
  const { data, loading, error, reload } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(USER_ID)}`);
  useFocusEffect(reload);
  const story = data?.find((item) => item.id === id);
  const insets = useSafeAreaInsets();
  const nextId = story?.lessons.find((lesson) => lesson.status === 'available')?.id;
  const minutesLeft = story?.lessons.filter((l) => l.status !== 'done').reduce((total, l) => total + l.minutes, 0) ?? 0;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/map'));
  // Story colour from its data; slate while loading or when a story has none.
  const accent = storyColors[story?.color ?? 'slate'] ?? colors.storySlate;
  const tint = tints[story?.color ?? 'slate'] ?? tints.slate;

  const offers = offersFor(id);
  const [dismissedLocked, setDismissedLocked] = useState(false);
  const targetLesson = story?.lessons.find((l) => l.id === targetLessonId);
  const lockedPopupVisible = !dismissedLocked && Boolean(targetLesson && targetLesson.status === 'locked');

  // Opening a path lands on where the user is: the linked lesson, else the next one. Coming back from a finished
  // lesson (the screen stays mounted) moves on to the new next mission. Offsets add up from the route's position in
  // the content and the content's position in the scroll view.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offsets = useRef({ content: 0, route: 0 });
  const stopY = useRef<Record<string, number>>({});
  const scrolledTo = useRef<string>(undefined);
  const focusId = targetLesson ? targetLesson.id : nextId;
  // The first lesson needs no scroll: the path's name and intro stay in view above it.
  const focusIndex = story?.lessons.findIndex((l) => l.id === focusId) ?? -1;
  const scrollToFocus = () => {
    const y = focusId ? stopY.current[focusId] : undefined;
    if (!focusId || y === undefined || scrolledTo.current === focusId) return;
    scrolledTo.current = focusId;
    if (focusIndex <= 0) return;
    const top = offsets.current.content + offsets.current.route + y;
    scrollRef.current?.scrollTo({ y: Math.max(0, top - 140), animated: true });
  };
  // The stops are already laid out when the next mission changes after a lesson: their onLayout does not fire again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(scrollToFocus, [focusId]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        testID="screen-story"
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + spacing.lg }]}>
          {story && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.skyline]}>
              {skyline(story.city).map((height, index) => (
                <View key={index} style={[styles.building, { height, backgroundColor: tint }]} />
              ))}
            </View>
          )}
          {story?.landmark && <StoryLandmark kind={story.landmark.kind} at={story.landmark.at} color={tint} />}
          <IconButton icon="chevron-left" label="Back to the globe" onPress={back} />
          <View style={styles.heading}>
            {story && <Text style={[styles.overline, { color: accent }]}>{story.city} · learning path</Text>}
            <Text accessibilityRole="header" style={styles.title}>
              {story?.area ?? story?.city ?? 'Path'}
            </Text>
            {story && <Text style={styles.subtitle}>{story.topic}</Text>}
          </View>
          {story && <PathProgress done={story.progress.done} total={story.progress.total} minutesLeft={minutesLeft} accent={accent} />}
        </View>
        <View style={styles.content} onLayout={(e) => (offsets.current.content = e.nativeEvent.layout.y)}>
          <AsyncContent loading={loading} error={error} onRetry={reload}>
            {() =>
              story ? (
                <>
                  {story.personal && <YourMoneyCard intro={story.intro} accent={accent} tint={tint} />}
                  {!story.personal && story.intro && <Text style={styles.intro}>{story.intro}</Text>}
                  {story.lessons.length > 0 ? (
                    <View style={styles.route} onLayout={(e) => (offsets.current.route = e.nativeEvent.layout.y)}>
                      <Text style={styles.routeTitle} accessibilityRole="header">
                        Your route
                      </Text>
                      {story.lessons.map((lesson, index) => (
                        <PathStop
                          key={lesson.id}
                          lesson={lesson}
                          index={index}
                          state={
                            lesson.status === 'done'
                              ? 'done'
                              : lesson.status === 'locked'
                                ? 'locked'
                                : lesson.id === nextId
                                  ? 'current'
                                  : 'open'
                          }
                          previousDone={story.lessons[index - 1]?.status === 'done'}
                          last={index === story.lessons.length - 1}
                          highlighted={lesson.id === targetLessonId}
                          accent={accent}
                          onLayout={(e) => {
                            stopY.current[lesson.id] = e.nativeEvent.layout.y;
                            if (lesson.id === focusId) scrollToFocus();
                          }}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.muted}>Lessons coming soon.</Text>
                  )}
                  {offers && (
                    <OffersEntryCard
                      title={offers.title}
                      ready={story.progress.done === story.progress.total}
                      onOpen={() => router.push({ pathname: '/offers/[id]', params: { id: offers.story } })}
                    />
                  )}
                </>
              ) : (
                <Text style={styles.muted}>Path unavailable.</Text>
              )
            }
          </AsyncContent>
        </View>
      </ScrollView>

      <Sheet visible={lockedPopupVisible} onClose={() => setDismissedLocked(true)} title="Mission locked" testID="story-locked-sheet">
        <View style={styles.lockedSheetContent}>
          <Text style={styles.lockedSheetText} testID="story-locked-message">
            This mission is locked. Finish the earlier missions in {story?.area ?? story?.city} first.
          </Text>
          <View style={styles.lockedSheetButtons}>
            <Button label="Open path" variant="primary" onPress={() => setDismissedLocked(true)} testID="story-locked-open" />
            <Button
              label="Close"
              variant="ghost"
              onPress={() => {
                setDismissedLocked(true);
                back();
              }}
              testID="story-locked-close"
            />
          </View>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: 72, gap: spacing.md, overflow: 'hidden' },
  heading: { gap: spacing.xs },
  title: type.displayHero,
  subtitle: { ...type.bodyReading, color: colors.textMuted },
  overline: type.overline,
  skyline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  building: { flex: 1, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
  content: { marginTop: -48, paddingHorizontal: spacing.lg, gap: spacing.xl },
  intro: { ...type.bodyReading, color: colors.textMuted },
  route: { gap: spacing.xs },
  routeTitle: { ...type.titleSection, marginBottom: spacing.sm },
  muted: { ...type.labelDefault, color: colors.textMuted },
  lockedSheetContent: { padding: spacing.xl, gap: spacing.lg },
  lockedSheetText: type.bodyReading,
  lockedSheetButtons: { gap: spacing.sm },
});
