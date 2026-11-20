import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
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
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  progressTrack: {
    height: 5,
    borderRadius: radii.bar,
    backgroundColor: colors.borderDefault,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandPrimary },
  counter: { ...type.overline, color: colors.brandPrimary },
  prompt: type.titleSection,
  options: { gap: spacing.md },
  option: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  optionPressed: { transform: [{ scale: 0.98 }] },
  optionCorrect: {
    backgroundColor: colors.feedbackSuccessSoft,
    borderColor: colors.feedbackSuccess,
    borderWidth: 2,
  },
  optionWrong: {
    backgroundColor: colors.feedbackDangerSoft,
    borderColor: colors.feedbackDanger,
    borderWidth: 2,
  },
  optionText: type.titleCard,
  feedback: {
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...elevation.low,
  },
  feedbackTitle: type.titleCard,
  feedbackText: { ...type.bodyDefault, color: colors.textMuted },
  result: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  resultEmoji: { fontSize: 56 },
  resultTitle: type.displayLarge,
  resultScore: { ...type.labelDefault, color: colors.textMuted, marginBottom: spacing.md },
  xp: { ...type.labelStrong, color: colors.feedbackXp },
});
