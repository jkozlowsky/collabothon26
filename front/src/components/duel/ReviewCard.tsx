import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { partitionReview, type IndexedReviewItem } from '@/lib/duel/reducer';
import type { ReviewItem } from '@/types/duel';

/** End-of-match review: mistakes first with the right answer and why; correct ones behind a toggle. */
export function ReviewCard({ review }: { review: ReviewItem[] }) {
  const [showCorrect, setShowCorrect] = useState(false);
  const { mistakes, correct } = partitionReview(review);
  const allRight = mistakes.length === 0;

  return (
    <View style={styles.card} testID="result-review">
      <View style={styles.head}>
        <Icon name={allRight ? 'check' : 'refresh'} size={18} color={allRight ? colors.feedbackSuccess : colors.brandPrimary} />
        <Text style={type.titleCard}>
          {allRight ? `All ${review.length} answers correct` : `${mistakes.length} ${mistakes.length === 1 ? 'answer' : 'answers'} to review`}
        </Text>
      </View>

      {mistakes.map((item) => (
        <ReviewEntry key={item.questionNumber} item={item} testID={`review-mistake-${item.questionNumber}`} />
      ))}

      {!allRight && correct.length > 0 && (
        <Tappable
          onPress={() => setShowCorrect((s) => !s)}
          accessibilityRole="button"
          hitSlop={8}
          testID="toggle-correct-review"
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {showCorrect ? 'Hide correct answers' : `Show ${correct.length} correct ${correct.length === 1 ? 'answer' : 'answers'}`}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.brandPrimary} />
        </Tappable>
      )}

      {(showCorrect || allRight) &&
        correct.map((item) => <ReviewEntry key={item.questionNumber} item={item} testID={`review-correct-${item.questionNumber}`} />)}
    </View>
  );
}

function ReviewEntry({ item, testID }: { item: IndexedReviewItem; testID: string }) {
  return (
    <View style={styles.entry} testID={testID}>
      <Text style={styles.overline}>QUESTION {item.questionNumber}</Text>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <View style={styles.pills}>
        {!item.isCorrect && (
          <AnswerPill tone="wrong" text={item.yourOption !== null ? item.options[item.yourOption] : 'No answer'} />
        )}
        <AnswerPill tone="right" text={item.options[item.correctOption]} />
      </View>
      <Text style={styles.explanation}>{item.explanation}</Text>
    </View>
  );
}

function AnswerPill({ tone, text }: { tone: 'right' | 'wrong'; text: string }) {
  const right = tone === 'right';
  const color = right ? colors.feedbackSuccess : colors.feedbackDanger;
  return (
    <View style={[styles.pill, { backgroundColor: right ? colors.feedbackSuccessSoft : colors.feedbackDangerSoft }]}>
      <Icon name={right ? 'check' : 'close'} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.low,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entry: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderDefault, paddingTop: spacing.md },
  overline: { ...type.overline, color: colors.textMuted },
  prompt: type.titleCard,
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  pillText: { ...type.labelStrong, flexShrink: 1 },
  explanation: { ...type.bodyDefault, color: colors.textMuted },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing.md,
  },
  toggleText: { ...type.labelStrong, color: colors.brandPrimary },
});
