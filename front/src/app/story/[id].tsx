import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { OffersEntryCard } from '@/components/offers/OffersEntryCard';
import { LockedLessonSheet } from '@/components/path/LockedLessonSheet';
import { PathHero } from '@/components/path/PathHero';
import { PathStop, stopState } from '@/components/path/PathStop';
import { YourMoneyCard } from '@/components/path/YourMoneyCard';
import { colors, spacing, storyColors, tints, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { animateScroll } from '@/lib/animateScroll';
import { offersFor } from '@/lib/offers';
import { useCurrentUser } from '@/lib/user';
import type { StoryPage } from '@/types/stories';

/**
 * Coming from a duel review (Figma frames 13–17): the screen pushes in, scrolls to the stop, then the stop gets
 * its outline and its shake or pulse. A locked stop then opens the "Oops, lesson locked" sheet; an open one does not.
 */
const PUSH_MS = 350;
const SCROLL_MS = 600;
const SHEET_AT_MS = 1300;
/** Reduced motion has no push to wait for and no scroll; the sheet still lets the outline show first. */
const SHEET_AT_REDUCED_MS = 400;
/** Room kept above the stop a path opens on (px). */
const FOCUS_TOP_GAP = 140;

export default function StoryScreen() {
  const { id, lesson: targetLessonId } = useLocalSearchParams<{ id: string; lesson?: string }>();
  const { userId } = useCurrentUser();
  const { data, loading, error, reload } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  useFocusEffect(reload);
  const story = data?.find((item) => item.id === id);
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/map'));
  // Story colour from its data; slate while loading or when a story has none.
  const accent = storyColors[story?.color ?? 'slate'] ?? colors.storySlate;
  const tint = tints[story?.color ?? 'slate'] ?? tints.slate;

  const offers = offersFor(id);
  const lessons = story?.lessons ?? [];
  const nextIndex = lessons.findIndex((l) => l.status === 'available');
  const nextLesson = nextIndex >= 0 ? lessons[nextIndex] : undefined;
  const targetIndex = lessons.findIndex((l) => l.id === targetLessonId);
  const targetLesson = targetIndex >= 0 ? lessons[targetIndex] : undefined;
  const missingBefore = lessons.slice(0, Math.max(0, targetIndex)).filter((l) => l.status !== 'done').length;
  const lockedTarget = targetLesson?.status === 'locked';
  const reduced = useReducedMotion();
  const { height: viewportHeight } = useWindowDimensions();
  const [targetY, setTargetY] = useState<number>();
  const [fxOn, setFxOn] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [outlineOn, setOutlineOn] = useState(true);
  const closeSheet = () => {
    setSheetOpen(false);
    setOutlineOn(false);
  };

  // Opening a path lands on where the user is: the linked lesson, else the next one. Coming back from a finished
  // lesson (the screen stays mounted) moves on to the new next mission. Offsets add up from the route's position in
  // the content and the content's position in the scroll view.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offsets = useRef({ content: 0, route: 0 });
  const stopY = useRef<Record<string, number>>({});
  const scrolledTo = useRef<string>(undefined);
  const focusId = targetLesson?.id ?? nextLesson?.id;
  const focusIndex = targetLesson ? targetIndex : nextIndex;
  const scrollToFocus = () => {
    const y = focusId ? stopY.current[focusId] : undefined;
    if (!focusId || y === undefined || scrolledTo.current === focusId) return;
    scrolledTo.current = focusId;
    // The first lesson needs no scroll: the path's name and intro stay in view above it.
    if (focusIndex <= 0 || targetLessonId) return;
    const top = offsets.current.content + offsets.current.route + y;
    scrollRef.current?.scrollTo({ y: Math.max(0, top - FOCUS_TOP_GAP), animated: true });
  };
  // The stops are already laid out when the next mission changes after a lesson: their onLayout does not fire again.
  const onFocusChange = useEffectEvent(scrollToFocus);
  useEffect(() => onFocusChange(), [focusId]);

  const scrollY = useRef(0);
  const targetId = targetLesson?.id;
  useEffect(() => {
    if (!targetId || targetY === undefined) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancel = () => {};
    const jump = (y: number) => scrollRef.current?.scrollTo({ y, animated: false });
    // After the push lands, bring the stop to about a third from the top.
    const toY = Math.max(0, offsets.current.content + offsets.current.route + targetY - viewportHeight / 3);
    timers.push(
      setTimeout(() => {
        cancel = animateScroll(jump, scrollY.current, toY, reduced ? 0 : SCROLL_MS);
      }, reduced ? 0 : PUSH_MS)
    );
    timers.push(setTimeout(() => setFxOn(true), reduced ? 0 : PUSH_MS + SCROLL_MS));
    if (lockedTarget) timers.push(setTimeout(() => setSheetOpen(true), reduced ? SHEET_AT_REDUCED_MS : SHEET_AT_MS));
    return () => {
      timers.forEach(clearTimeout);
      cancel();
    };
  }, [targetId, targetY, lockedTarget, reduced, viewportHeight]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => (scrollY.current = e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        testID="screen-story"
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right', animationDuration: PUSH_MS }} />
        <PathHero story={story} accent={accent} tint={tint} onBack={back} />
        <View style={styles.content} onLayout={(e) => (offsets.current.content = e.nativeEvent.layout.y)}>
          <AsyncContent loading={loading} error={error} onRetry={reload}>
            {() =>
              story ? (
                <>
                  {story.personal && <YourMoneyCard intro={story.intro} accent={accent} tint={tint} />}
                  {!story.personal && story.intro && <Text style={styles.intro}>{story.intro}</Text>}
                  {lessons.length > 0 ? (
                    <View style={styles.route} onLayout={(e) => (offsets.current.route = e.nativeEvent.layout.y)}>
                      <Text style={styles.routeTitle} accessibilityRole="header">
                        Your route
                      </Text>
                      {lessons.map((lesson, index) => (
                        <PathStop
                          key={lesson.id}
                          lesson={lesson}
                          index={index}
                          state={stopState(lesson.status, index === nextIndex)}
                          previousDone={lessons[index - 1]?.status === 'done'}
                          last={index === lessons.length - 1}
                          target={lesson.id === targetLessonId ? { kind: lesson.status === 'locked' ? 'locked' : 'duel', active: fxOn, outline: outlineOn } : undefined}
                          accent={accent}
                          onLayout={(e) => {
                            stopY.current[lesson.id] = e.nativeEvent.layout.y;
                            if (lesson.id === targetLessonId) setTargetY(e.nativeEvent.layout.y);
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
        {/* A linked lesson needs room below it to sit a third from the top, even when it is near the end. */}
        {targetLessonId ? <View style={{ height: viewportHeight * 0.4 }} testID="story-target-spacer" /> : null}
      </ScrollView>

      <LockedLessonSheet
        visible={sheetOpen}
        onClose={closeSheet}
        city={story?.city ?? ''}
        targetTitle={targetLesson?.title ?? ''}
        next={nextLesson ? { title: nextLesson.title, meta: `${nextLesson.minutes} min · +${nextLesson.xp} XP`, stop: nextIndex + 1 } : null}
        missing={missingBefore}
        onStart={() => {
          closeSheet();
          if (nextLesson) router.push({ pathname: '/lesson/[id]', params: { id: nextLesson.id } });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  content: { marginTop: -48, paddingHorizontal: spacing.lg, gap: spacing.xl },
  intro: { ...type.bodyReading, color: colors.textMuted },
  route: { gap: spacing.xs },
  routeTitle: { ...type.titleSection, marginBottom: spacing.sm },
  muted: { ...type.labelDefault, color: colors.textMuted },
});
