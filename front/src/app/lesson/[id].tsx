import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import type { LessonDetail } from '@/types/lessons';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<LessonDetail>(`/api/lessons/${id}`);

  return (
    <AsyncContent loading={loading} error={error} onRetry={reload}>
      {() => data && <Quiz lesson={data} />}
    </AsyncContent>
  );
}

function Quiz({ lesson }: { lesson: LessonDetail }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number>();
  const [score, setScore] = useState(0);

  const done = index >= lesson.questions.length;
  const question = lesson.questions[index];
  const answered = picked !== undefined;

  function pick(option: number) {
    if (answered) return;
    setPicked(option);
    if (option === question.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    setPicked(undefined);
    setIndex((i) => i + 1);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `${lesson.emoji} ${lesson.title}` }} />
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(index / lesson.questions.length) * 100}%` }]}
        />
      </View>

      {done ? (
        <View style={styles.result} testID="quiz-result">
          <Text style={styles.resultEmoji}>{score === lesson.questions.length ? '🏆' : '💪'}</Text>
          <Text style={styles.resultTitle}>Lesson complete!</Text>
          <Text style={styles.resultScore}>
            {score}/{lesson.questions.length} correct ·{' '}
            <Text style={styles.xp}>+{lesson.xp} XP</Text>
          </Text>
          <Button label="Back to Learn" onPress={() => router.back()} testID="back-to-list" />
        </View>
      ) : (
        <>
          <Text style={styles.counter}>
            Question {index + 1} of {lesson.questions.length}
          </Text>
          <Text style={styles.prompt}>{question.prompt}</Text>

          <View style={styles.options}>
            {question.options.map((option, i) => {
              const isCorrect = answered && i === question.correctIndex;
              const isWrong = answered && i === picked && i !== question.correctIndex;
              return (
                <Pressable
                  key={option}
                  testID={`option-${i}`}
                  accessibilityRole="button"
                  disabled={answered}
                  onPress={() => pick(i)}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                    isCorrect && styles.optionCorrect,
                    isWrong && styles.optionWrong,
                  ]}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          {answered && (
            <View style={styles.feedback}>
              <Text style={styles.feedbackTitle}>
                {picked === question.correctIndex ? '✅ Correct!' : '❌ Not quite'}
              </Text>
              <Text style={styles.feedbackText}>{question.explanation}</Text>
              <Button label="Next" onPress={next} testID="next" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  counter: { color: colors.muted, fontSize: 14 },
  prompt: { fontSize: 20, fontWeight: '700', color: colors.text },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  optionPressed: { transform: [{ scale: 0.98 }] },
  optionCorrect: { backgroundColor: colors.correct, borderColor: colors.correctBorder },
  optionWrong: { backgroundColor: colors.wrong, borderColor: colors.wrongBorder },
  optionText: { fontSize: 16, color: colors.text },
  feedback: { gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
  feedbackTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  feedbackText: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  result: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  resultScore: { fontSize: 16, color: colors.muted, marginBottom: 12 },
  xp: { color: colors.xp, fontWeight: '700' },
});
