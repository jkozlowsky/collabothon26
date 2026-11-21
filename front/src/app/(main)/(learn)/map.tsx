import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useStartHere } from '@/hooks/useStartHere';
import type { LessonSummary } from '@/types/lessons';

export default function MapScreen() {
  const { data, loading, error, reload } = useApi<LessonSummary[]>('/api/lessons');
  const start = useStartHere();

  return (
    <Screen title="Learn" testID="screen-learn" scroll>
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => (
          <View style={styles.list}>
            {data?.map((lesson) => {
              const isStart = start?.startHere.lessonId === lesson.id;
              return (
                <Pressable
                  key={lesson.id}
                  testID={`lesson-${lesson.id}`}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                  style={({ pressed }) => [styles.card, isStart && styles.cardStart, pressed && styles.cardPressed]}
                >
                  <Text style={styles.emoji}>{lesson.emoji}</Text>
                  <View style={styles.cardBody}>
                    {isStart && (
                      <View style={styles.badge} testID="start-here">
                        <Feather name="play" size={12} color={colors.textOnAccent} />
                        <Text style={styles.badgeText}>Start here</Text>
                      </View>
                    )}
                    <Text style={styles.title}>{lesson.title}</Text>
                    <Text style={styles.summary}>{lesson.summary}</Text>
                    <Text style={styles.meta}>
                      {lesson.questionCount} questions ·{' '}
                      <Text style={styles.xp}>+{lesson.xp} XP</Text>
                    </Text>
                    {isStart && (
                      <Text style={styles.why} testID="why-here">
                        {start.why}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  // Matches the Figma "Story Card" shell.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: 14,
  },
  // The one yellow focal point: the lesson the quick check points to.
  cardStart: { backgroundColor: colors.brandAccentSoft, borderWidth: 2, borderColor: colors.brandPrimary },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  emoji: { fontSize: 32 },
  cardBody: { flex: 1, gap: spacing.xs },
  title: type.titleCard,
  summary: { ...type.labelDefault, color: colors.textMuted },
  meta: { ...type.labelDefault, color: colors.textMuted },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs + 1,
    paddingHorizontal: spacing.smPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.brandAccent,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
  badgeText: { ...type.labelStrong, color: colors.textOnAccent },
  why: { ...type.labelDefault, color: colors.textPrimary, paddingTop: spacing.sm - 2, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  xp: { ...type.labelStrong, color: colors.feedbackXp },
});
