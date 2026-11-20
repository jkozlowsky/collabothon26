import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import type { LessonSummary } from '@/types/lessons';

export default function LearnScreen() {
  const { data, loading, error, reload } = useApi<LessonSummary[]>('/api/lessons');

  return (
    <Screen title="Learn" testID="screen-learn" scroll>
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => (
          <View style={styles.list}>
            {data?.map((lesson) => (
              <Pressable
                key={lesson.id}
                testID={`lesson-${lesson.id}`}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <Text style={styles.emoji}>{lesson.emoji}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.title}>{lesson.title}</Text>
                  <Text style={styles.summary}>{lesson.summary}</Text>
                  <Text style={styles.meta}>
                    {lesson.questionCount} questions ·{' '}
                    <Text style={styles.xp}>+{lesson.xp} XP</Text>
                  </Text>
                </View>
              </Pressable>
            ))}
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
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  emoji: { fontSize: 32 },
  cardBody: { flex: 1, gap: spacing.xs },
  title: type.titleCard,
  summary: { ...type.labelDefault, color: colors.textMuted },
  meta: { ...type.labelDefault, color: colors.textMuted },
  xp: { ...type.labelStrong, color: colors.feedbackXp },
});
