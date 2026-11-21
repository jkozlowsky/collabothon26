import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import { partitionReview } from '@/lib/duel/reducer';
import type { ReviewItem } from '@/types/duel';

type Props = {
  review: ReviewItem[];
};

function formatAnswerTexts(item: ReviewItem): { yourText: string; rightText: string } {
  const step = item.step;
  const yourAnswer = item.yourAnswer;

  if (step.type === 'quiz') {
    const yourText =
      yourAnswer && 'option' in yourAnswer && yourAnswer.option >= 0 && yourAnswer.option < step.options.length
        ? step.options[yourAnswer.option]
        : 'Brak odpowiedzi';
    const rightText = step.options[step.correctIndex] ?? 'Poprawna odpowiedź';
    return { yourText, rightText };
  }

  if (step.type === 'predict') {
    const unit = step.input?.unit ?? '';
    const yourText =
      yourAnswer && 'value' in yourAnswer ? `${yourAnswer.value} ${unit}`.trim() : 'Brak odpowiedzi';
    const rightText = `${step.answer} ${unit}`.trim();
    return { yourText, rightText };
  }

  if (step.type === 'chart') {
    const unit = step.input?.unit ?? step.output?.unit ?? '';
    const yourText =
      yourAnswer && 'value' in yourAnswer ? `${yourAnswer.value} ${unit}`.trim() : 'Brak odpowiedzi';
    const rightText = `${step.answer} ${unit}`.trim();
    return { yourText, rightText };
  }

  if (step.type === 'sort' || step.type === 'match') {
    const yourText =
      yourAnswer && 'mistakes' in yourAnswer
        ? `${yourAnswer.mistakes} ${yourAnswer.mistakes === 1 ? 'błąd' : 'błędów'}`
        : 'Brak odpowiedzi';
    const rightText = '0 błędów';
    return { yourText, rightText };
  }

  return { yourText: '—', rightText: '—' };
}

/** Review section: WRONG answers first, expanded; RIGHT answers collapsed (Figma 154:3813 / 157:4454). */
export function ReviewCard({ review }: Props) {
  const [showCorrect, setShowCorrect] = useState(false);
  const { wrong, correct } = partitionReview(review);

  return (
    <View style={styles.container} testID="result-review">
      {/* Wrong answers (first, expanded) */}
      {wrong.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle} testID="review-wrong-title">
            Do powtórzenia ({wrong.length})
          </Text>
          {wrong.map((item) => (
            <ReviewItemView key={item.index} item={item} />
          ))}
        </View>
      )}

      {/* Correct answers (collapsed toggle) */}
      {correct.length > 0 && (
        <View style={styles.group}>
          <Tappable
            onPress={() => setShowCorrect((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={`Dobrze (${correct.length})`}
            testID="toggle-correct-review"
            style={styles.collapseToggle}
          >
            <View style={styles.toggleLeft}>
              <Feather name="check-circle" size={18} color={colors.feedbackSuccess} />
              <Text style={styles.toggleTitle}>Dobrze ({correct.length})</Text>
            </View>
            <Feather
              name={showCorrect ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textPrimary}
            />
          </Tappable>

          {showCorrect && (
            <View style={styles.collapsedList}>
              {correct.map((item) => (
                <ReviewItemView key={item.index} item={item} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ReviewItemView({ item }: { item: ReviewItem }) {
  const catMeta = getStoryCategoryMeta(item.category);
  const { yourText, rightText } = formatAnswerTexts(item);
  const explanation = 'explanation' in item.step ? item.step.explanation : null;

  function repeatLesson() {
    router.push(`/lesson/${item.lessonId}` as any);
  }

  return (
    <View
      style={styles.itemCard}
      testID={item.correct ? `review-correct-${item.index}` : `review-mistake-${item.index}`}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.questionNumber}>
          PYTANIE {item.index + 1} · {catMeta.name.toUpperCase()}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.correct ? colors.feedbackSuccessSoft : colors.feedbackDangerSoft },
          ]}
        >
          <Feather
            name={item.correct ? 'check' : 'x'}
            size={12}
            color={item.correct ? colors.feedbackSuccess : colors.feedbackDanger}
          />
        </View>
      </View>

      <Text style={styles.prompt}>{'prompt' in item.step ? item.step.prompt : ''}</Text>

      {/* Answer comparison */}
      <View style={styles.answerComparison}>
        {!item.correct && (
          <View style={[styles.pill, styles.wrongPill]}>
            <Feather name="x" size={12} color={colors.feedbackDanger} />
            <Text style={styles.wrongPillText} numberOfLines={2}>
              Twoja: {yourText}
            </Text>
          </View>
        )}
        <View style={[styles.pill, styles.rightPill]}>
          <Feather name="check" size={12} color={colors.feedbackSuccess} />
          <Text style={styles.rightPillText} numberOfLines={2}>
            Prawidłowa: {rightText}
          </Text>
        </View>
      </View>

      {explanation && <Text style={styles.explanation}>{explanation}</Text>}

      {/* Yellow CTA button to repeat lesson */}
      {!item.correct && (
        <Tappable
          onPress={repeatLesson}
          accessibilityRole="button"
          accessibilityLabel={`Powtórz lekcję: ${item.lessonTitle}`}
          testID={`review-repeat-lesson-${item.index}`}
          style={styles.repeatButton}
        >
          <Feather name="refresh-cw" size={14} color={colors.textOnAccent} />
          <Text style={styles.repeatButtonText} numberOfLines={1}>
            Powtórz lekcję: {item.lessonTitle}
          </Text>
        </Tappable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...type.titleSection,
    color: colors.textPrimary,
  },
  collapseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleTitle: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  collapsedList: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  itemCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionNumber: {
    ...type.overline,
    color: colors.textMuted,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  answerComparison: {
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  wrongPill: {
    backgroundColor: colors.feedbackDangerSoft,
  },
  wrongPillText: {
    ...type.labelStrong,
    color: colors.feedbackDanger,
  },
  rightPill: {
    backgroundColor: colors.feedbackSuccessSoft,
  },
  rightPillText: {
    ...type.labelStrong,
    color: colors.feedbackSuccess,
  },
  explanation: {
    ...type.bodyDefault,
    color: colors.textMuted,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  repeatButtonText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
