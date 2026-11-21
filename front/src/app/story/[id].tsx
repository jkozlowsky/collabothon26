import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { IconButton } from '@/components/bank/IconButton';
import { StoryLandmark } from '@/components/StoryLandmark';
import { colors, elevation, radii, spacing, storyColors, tints, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { USER_ID } from '@/lib/user';
import type { LessonSummary } from '@/types/lessons';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(USER_ID)}`);
  useFocusEffect(reload);
  const story = data?.find((item) => item.id === id);
  const insets = useSafeAreaInsets();
  const nextId = story?.lessons.find((lesson) => lesson.status === 'available')?.id;
  const minutes = story?.lessons.reduce((total, lesson) => total + lesson.minutes, 0);
  const back = () => router.canGoBack() ? router.back() : router.replace('/map');
  // Story colour from its data; slate while loading or when a story has none.
  const accent = storyColors[story?.color ?? 'slate'] ?? colors.storySlate;
  const tint = tints[story?.color ?? 'slate'] ?? tints.slate;

  return (
    <ScrollView testID="screen-story" style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + spacing.xl }]}>
        {story && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.skyline]}>
            {skyline(story.city).map((height, index) => (
              <View key={index} style={[styles.building, { height, backgroundColor: tint }]} />
            ))}
          </View>
        )}
        {story?.landmark && <StoryLandmark kind={story.landmark.kind} at={story.landmark.at} color={tint} />}
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Back to the globe" onPress={back} />
          <View style={styles.heading}>
            {story && <Text style={[styles.overline, { color: accent }]}>Story · {story.progress.total} stops</Text>}
            <Text accessibilityRole="header" style={styles.title}>{story?.city ?? 'Story'}</Text>
            {story && <Text style={styles.subtitle}>{story.topic}</Text>}
          </View>
        </View>
      </View>
      <View style={styles.content}>
        <AsyncContent loading={loading} error={error} onRetry={reload}>
          {() => story ? (
            <>
              {story.character && (
                <View style={styles.story}>
                  <View style={styles.character}>
                    <View style={[styles.avatar, { backgroundColor: tint }]}>
                      <Text style={[styles.avatarLetter, { color: accent }]}>{story.character.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.bio}>
                      <Text style={styles.stopTitle}>{story.character.name}, {story.character.age}</Text>
                      <Text style={styles.muted}>{[story.character.role, story.character.place].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {story.character.savings && (
                      <View style={styles.savings}>
                        <Text style={styles.balance}>{story.character.savings}</Text>
                        <Text style={styles.muted}>saved</Text>
                      </View>
                    )}
                  </View>
                  {story.intro && <Text style={styles.storyText}>{story.intro}</Text>}
                  {story.words && story.words.length > 0 && (
                    <View style={styles.words}>
                      <Text style={styles.muted}>Words from {story.city}</Text>
                      {story.words.map((word) => (
                        <Text key={word.native} style={[styles.word, { color: accent, backgroundColor: tint }]}>
                          {word.native} {word.meaning}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.progress}>
                    <View style={styles.stamps} aria-hidden>
                      {story.lessons.map(({ id: lessonId, status }) => (
                        <View key={lessonId} style={[styles.stamp, status === 'done' && { ...styles.stamped, borderColor: accent, backgroundColor: accent }]}>
                          {status === 'done' && <Icon name="check" size={13} color={colors.textOnBrand} />}
                        </View>
                      ))}
                    </View>
                    <Text accessibilityLiveRegion="polite" style={styles.muted}>
                      {story.progress.done} of {story.progress.total} stamps
                    </Text>
                  </View>
                </View>
              )}
              {story.lessons.length > 0 ? (
                <View style={styles.route}>
                  <View style={[styles.lineLabel, { backgroundColor: accent }]}>
                    <Icon name="transfer" size={15} color={colors.textOnBrand} />
                    <Text style={styles.lineText}>
                      {story.character ? `${story.character.name}'s line` : story.city} · {story.progress.total} stops · {minutes} min
                    </Text>
                  </View>
                  {story.lessons.map((lesson, index) => (
                    <Stop
                      key={lesson.id}
                      lesson={lesson}
                      index={index}
                      last={index === story.lessons.length - 1}
                      previousDone={story.lessons[index - 1]?.status === 'done'}
                      current={lesson.id === nextId}
                      accent={accent}
                    />
                  ))}
                </View>
              ) : <Text style={styles.muted}>Lessons coming soon.</Text>}
            </>
          ) : <Text style={styles.muted}>Story unavailable.</Text>}
        </AsyncContent>
      </View>
    </ScrollView>
  );
}

function Stop({ lesson, index, last, previousDone, current, accent }: {
  lesson: LessonSummary;
  index: number;
  last: boolean;
  previousDone: boolean;
  current: boolean;
  accent: string;
}) {
  const done = lesson.status === 'done';
  const locked = lesson.status === 'locked';
  const { topic } = lesson;
  const doneTrack = { backgroundColor: accent };

  return (
    <View style={styles.stop}>
      <View style={styles.markerColumn} aria-hidden>
        {index > 0 && <View style={[styles.track, styles.trackAbove, previousDone && doneTrack]} />}
        {!last && <View style={[styles.track, styles.trackBelow, done && doneTrack]} />}
        <View style={[styles.marker, current && styles.markerCurrent, done && { ...styles.markerDone, backgroundColor: accent }]}>
          {done
            ? <Icon name="check" size={16} color={colors.textOnBrand} />
            : <Text style={styles.markerNumber}>{index + 1}</Text>}
        </View>
      </View>
      <View style={[styles.stopBody, current && styles.currentCard]}>
        <Text style={[styles.overline, { color: accent }, locked && styles.locked]}>{lesson.place}</Text>
        <Text style={[styles.stopTitle, locked && styles.locked]}>{lesson.title}</Text>
        <Text style={styles.muted}>
          {topic ? `${topic} · ` : ''}{lesson.minutes} min
          {done ? ' · Completed' : locked ? ' · Locked' : ` · +${lesson.xp} XP`}
        </Text>
        {!locked && (
          <View style={styles.action}>
            <Button
              label={done ? 'Replay lesson' : 'Start lesson'}
              variant={done ? 'ghost' : 'primary'}
              testID={`lesson-${lesson.id}`}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: 76, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  heading: { flex: 1, gap: spacing.xs },
  title: type.displayLarge,
  subtitle: { ...type.bodyDefault, color: colors.textMuted },
  overline: type.overline,
  skyline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  building: { flex: 1, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
  content: { marginTop: -54, paddingHorizontal: spacing.lg, gap: spacing.lg },
  story: { backgroundColor: colors.bgSurface, borderRadius: spacing.xl, padding: spacing.lg, gap: spacing.lg, ...elevation.mid },
  character: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: type.titleSection,
  bio: { flexGrow: 1, flexShrink: 1 },
  savings: { alignItems: 'flex-end', marginLeft: 'auto' },
  balance: type.labelStrong,
  storyText: type.bodyDefault,
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flexShrink: 1 },
  stamp: { width: 22, height: 22, borderRadius: radii.pill, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  stamped: { borderStyle: 'solid' },
  route: { paddingHorizontal: spacing.sm },
  lineLabel: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.pill, marginBottom: spacing.sm },
  lineText: { ...type.labelStrong, color: colors.textOnBrand },
  stop: { flexDirection: 'row', gap: spacing.lg },
  markerColumn: { width: 40, alignItems: 'center' },
  track: { position: 'absolute', width: 7, backgroundColor: colors.borderStrong },
  trackAbove: { top: 0, height: 32 },
  trackBelow: { top: 32, bottom: 0 },
  marker: { marginTop: 12, width: 40, height: 40, borderRadius: radii.pill, borderWidth: 3, borderColor: colors.borderStrong, backgroundColor: colors.bgSurface, alignItems: 'center', justifyContent: 'center' },
  markerCurrent: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  markerDone: { borderColor: colors.bgSurface },
  markerNumber: { ...type.titleCard, color: colors.brandPrimary },
  stopBody: { flex: 1, gap: spacing.xs, marginBottom: spacing.lg, padding: spacing.md, borderWidth: 2, borderColor: 'transparent', borderRadius: radii.card },
  currentCard: { borderColor: colors.brandAccent, backgroundColor: colors.bgSurface, ...elevation.mid },
  stopTitle: type.titleCard,
  muted: { ...type.labelDefault, color: colors.textMuted },
  locked: { color: colors.textMuted },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  word: { ...type.labelStrong, borderRadius: radii.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  action: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: spacing.xs },
});
