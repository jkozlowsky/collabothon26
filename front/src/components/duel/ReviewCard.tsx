import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
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
        : 'No answer';
    const rightText = step.options[step.correctIndex] ?? 'Correct answer';
    return { yourText, rightText };
  }

  if (step.type === 'predict') {
    const unit = step.input?.unit ?? '';
    const yourText =
      yourAnswer && 'value' in yourAnswer ? `${yourAnswer.value} ${unit}`.trim() : 'No answer';
    const rightText = `${step.answer} ${unit}`.trim();
    return { yourText, rightText };
  }

  if (step.type === 'chart') {
    const unit = step.input?.unit ?? step.output?.unit ?? '';
    const yourText =
      yourAnswer && 'value' in yourAnswer ? `${yourAnswer.value} ${unit}`.trim() : 'No answer';
    const rightText = `${step.answer} ${unit}`.trim();
    return { yourText, rightText };
  }

  if (step.type === 'sort') {
    const yourText =
      yourAnswer && 'buckets' in yourAnswer ? 'Cards placed' : 'No answer';
    const rightText = 'All placed correctly';
    return { yourText, rightText };
  }

  if (step.type === 'match') {
    const yourText =
      yourAnswer && 'pairs' in yourAnswer ? 'Pairs matched' : 'No answer';
    const rightText = 'All matched correctly';
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
            Review mistakes ({wrong.length})
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
            accessibilityLabel={`Correct (${correct.length})`}
            testID="toggle-correct-review"
            style={styles.collapseToggle}
          >
            <View style={styles.toggleLeft}>
              <Feather name="check-circle" size={18} color={colors.feedbackSuccess} />
              <Text style={styles.toggleTitle}>Correct ({correct.length})</Text>
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
    router.push({
      pathname: '/story/[id]',
      params: { id: item.category, lesson: item.lessonId },
    });
  }

  const isInteractiveSortOrMatch = item.step.type === 'sort' || item.step.type === 'match';

  return (
    <View
      style={styles.itemCard}
      testID={item.correct ? `review-correct-${item.index}` : `review-mistake-${item.index}`}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.questionNumber}>
          QUESTION {item.index + 1} · {catMeta.name.toUpperCase()}
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
      {!isInteractiveSortOrMatch && (
        <View style={styles.answerComparison}>
          {!item.correct && (
            <View style={[styles.pill, styles.wrongPill]}>
              <Feather name="x" size={12} color={colors.feedbackDanger} />
              <Text style={styles.wrongPillText} numberOfLines={2}>
                Your answer: {yourText}
              </Text>
            </View>
          )}
          <View style={[styles.pill, styles.rightPill]}>
            <Feather name="check" size={12} color={colors.feedbackSuccess} />
            <Text style={styles.rightPillText} numberOfLines={2}>
              Correct: {rightText}
            </Text>
          </View>
        </View>
      )}

      {/* Sort compact breakdown */}
      {item.step.type === 'sort' && 'buckets' in item.step && (
        <View style={styles.breakdownList} testID={`review-sort-breakdown-${item.index}`}>
          {((item.step as any).shownItems ?? (item.step as any).items?.map((it: any) => (typeof it === 'string' ? it : it.text)) ?? []).map((text: string, i: number) => {
            const items = (item.step as any).items;
            const itemObj = items?.find((it: any) => (typeof it === 'string' ? it : it.text) === text);
            const rightBucketIdx = itemObj && typeof itemObj === 'object' ? itemObj.bucket : 0;
            const yourBucketIdx =
              item.yourAnswer && 'buckets' in item.yourAnswer ? item.yourAnswer.buckets[i] : null;
            const isRight = yourBucketIdx === rightBucketIdx;

            return (
              <View key={i} style={[styles.breakdownRow, !isRight && styles.breakdownRowWrong]}>
                <Text style={styles.breakdownItemText} numberOfLines={2}>
                  {text}
                </Text>
                <View style={styles.breakdownTags}>
                  <Text style={[styles.breakdownTag, isRight ? styles.tagSuccess : styles.tagDanger]}>
                    Your: {yourBucketIdx !== null ? (item.step as any).buckets[yourBucketIdx] : 'None'}
                  </Text>
                  {!isRight && (
                    <Text style={[styles.breakdownTag, styles.tagSuccess]}>
                      Right: {(item.step as any).buckets[rightBucketIdx]}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Match compact breakdown */}
      {item.step.type === 'match' && (
        <View style={styles.breakdownList} testID={`review-match-breakdown-${item.index}`}>
          {((item.step as any).shownLeft ?? (item.step as any).pairs?.map((p: any) => p[0]) ?? []).map((term: string, i: number) => {
            const pairs = (item.step as any).pairs ?? [];
            const correctPair = pairs.find((p: any) => p[0] === term);
            const rightDef = correctPair ? correctPair[1] : '';

            const shownRight = (item.step as any).shownRight;
            const yourPairIdx =
              item.yourAnswer && 'pairs' in item.yourAnswer ? item.yourAnswer.pairs[i] : null;
            const yourDef =
              yourPairIdx !== null && yourPairIdx !== undefined
                ? shownRight
                  ? shownRight[yourPairIdx]
                  : pairs[yourPairIdx]?.[1]
                : null;
            const isRight = yourDef === rightDef;

            return (
              <View key={i} style={[styles.breakdownRow, !isRight && styles.breakdownRowWrong]}>
                <Text style={styles.breakdownItemText} numberOfLines={2}>
                  {term}
                </Text>
                <View style={styles.breakdownTags}>
                  <Text style={[styles.breakdownTag, isRight ? styles.tagSuccess : styles.tagDanger]}>
                    Your: {yourDef ?? 'None'}
                  </Text>
                  {!isRight && (
                    <Text style={[styles.breakdownTag, styles.tagSuccess]}>
                      Right: {rightDef}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {explanation && <Text style={styles.explanation}>{explanation}</Text>}

      {/* Yellow CTA button to review lesson */}
      {!item.correct && (
        <Tappable
          onPress={repeatLesson}
          accessibilityRole="button"
          accessibilityLabel={`Review lesson: ${item.lessonTitle}`}
          testID={`review-repeat-lesson-${item.index}`}
          style={styles.repeatButton}
        >
          <Feather name="book-open" size={14} color={colors.textOnAccent} />
          <Text style={styles.repeatButtonText} numberOfLines={1}>
            Review lesson: {item.lessonTitle}
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
    ...type.labelStrong,
    color: colors.textPrimary,
  },
  collapsedList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  itemCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.sm,
    ...elevation.low,
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
    borderRadius: radii.button,
  },
  wrongPill: {
    backgroundColor: colors.feedbackDangerSoft,
  },
  wrongPillText: {
    ...type.bodyDefault,
    color: colors.feedbackDanger,
    flex: 1,
  },
  rightPill: {
    backgroundColor: colors.feedbackSuccessSoft,
  },
  rightPillText: {
    ...type.bodyDefault,
    color: colors.feedbackSuccess,
    flex: 1,
  },
  breakdownList: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  breakdownRow: {
    backgroundColor: colors.bgCanvas,
    borderRadius: radii.button,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  breakdownRowWrong: {
    borderColor: colors.feedbackDangerSoft,
  },
  breakdownItemText: {
    ...type.bodyDefault,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  breakdownTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  breakdownTag: {
    ...type.labelTab,
    fontSize: 11,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  tagSuccess: {
    backgroundColor: colors.feedbackSuccessSoft,
    color: colors.feedbackSuccess,
  },
  tagDanger: {
    backgroundColor: colors.feedbackDangerSoft,
    color: colors.feedbackDanger,
  },
  explanation: {
    ...type.bodyDefault,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  repeatButtonText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
