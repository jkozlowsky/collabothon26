import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
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
  list: { gap: spacing.md - 4 },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  emoji: { fontSize: 34 },
  cardBody: { flex: 1, gap: spacing.xs },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  summary: { fontSize: 14, color: colors.muted },
  meta: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  xp: { color: colors.xp, fontWeight: '700' },
});
