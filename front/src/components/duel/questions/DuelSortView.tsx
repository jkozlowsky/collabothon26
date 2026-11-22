import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { isComplete } from '@/components/duel/questions/draft';
import { questionStyles } from '@/components/duel/questions/questionStyles';
import { SortBucket } from '@/components/duel/questions/SortBucket';
import { CARD_REFLOW_MS, getBucketTheme, sortPressed, type SortItem } from '@/components/duel/questions/sortBuckets';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/duel/feedback';
import type { DuelAnswer, DuelSortStep } from '@/types/duel';

type Props = {
  step: DuelSortStep;
  onSubmit: (answer: DuelAnswer) => void;
  onAnswerChange?: (answer: DuelAnswer | null) => void;
  isLocked: boolean;
  hideSubmitButton?: boolean;
};

/** Sort question: every card goes into one of two buckets. `placements[item]` holds the bucket, or null. */
export function DuelSortView({ step, onSubmit, onAnswerChange, isLocked, hideSubmitButton = false }: Props) {
  const reducedMotion = useReducedMotion();
  const [placements, setPlacements] = useState<(number | null)[]>(() => Array(step.items.length).fill(null));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const buckets = [0, 1].map((index) => ({
    name: step.buckets[index],
    theme: getBucketTheme(step.buckets[index] ?? '', index),
  }));
  const [left, right] = buckets;

  const items: SortItem[] = step.items.map((text, index) => ({ text, index }));
  const itemsIn = (bucket: number | null) => items.filter((item) => placements[item.index] === bucket);
  const unplacedItems = itemsIn(null);

  const allPlaced = isComplete(placements);

  /** Puts a card into a bucket, or back into the pile with `null`. */
  const place = (itemIndex: number, bucket: number | null) => {
    if (isLocked) return;
    haptic('light');
    const next = [...placements];
    next[itemIndex] = bucket;
    setPlacements(next);
    onAnswerChange?.(isComplete(next) ? { buckets: next } : null);
    setSelectedCard(null);
  };

  const handleBucketPress = (bucket: number) => {
    if (selectedCard === null) return;
    place(selectedCard, bucket);
  };

  const handleCardPress = (itemIndex: number) => {
    if (isLocked) return;
    haptic('light');
    setSelectedCard(selectedCard === itemIndex ? null : itemIndex);
  };

  const handleSubmit = () => {
    if (isLocked || !isComplete(placements)) return;
    onSubmit({ buckets: placements });
  };

  return (
    <View style={questionStyles.container} testID="duel-sort">
      {step.prompt ? <Text style={questionStyles.prompt}>{step.prompt}</Text> : null}

      <View style={styles.bucketsRow}>
        {buckets.map((bucket, index) => (
          <SortBucket
            key={index}
            index={index}
            name={bucket.name}
            theme={bucket.theme}
            other={buckets[1 - index]}
            items={itemsIn(index)}
            isTarget={selectedCard !== null}
            isLocked={isLocked}
            reducedMotion={reducedMotion}
            onPress={() => handleBucketPress(index)}
            onMove={(itemIndex) => place(itemIndex, 1 - index)}
            onRemove={(itemIndex) => place(itemIndex, null)}
          />
        ))}
      </View>

      {unplacedItems.length > 0 ? (
        <View style={styles.unplacedSection}>
          <Text style={styles.unplacedHeader}>
            Cards to place ({unplacedItems.length}):
          </Text>
          <View style={styles.unplacedList}>
            {unplacedItems.map((item) => {
              const isSelected = selectedCard === item.index;
              return (
                <Animated.View
                  key={item.index}
                  layout={reducedMotion ? undefined : LinearTransition.duration(CARD_REFLOW_MS)}
                  style={[styles.unplacedCard, isSelected && styles.cardSelected]}
                >
                  <Pressable
                    onPress={() => place(item.index, 0)}
                    accessibilityRole="button"
                    accessibilityLabel={`Place in ${left.name}`}
                    disabled={isLocked}
                    testID={`duel-sort-left-${item.index}`}
                    style={({ pressed }) => [
                      styles.arrowButton,
                      { backgroundColor: left.theme.softBg },
                      pressed && !isLocked && sortPressed,
                    ]}
                  >
                    <Feather name="arrow-left" size={18} color={left.theme.color} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleCardPress(item.index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={`duel-sort-item-${item.index}`}
                    disabled={isLocked}
                    style={({ pressed }) => [styles.cardCenter, pressed && !isLocked && sortPressed]}
                  >
                    <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>{item.text}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => place(item.index, 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Place in ${right.name}`}
                    disabled={isLocked}
                    testID={`duel-sort-right-${item.index}`}
                    style={({ pressed }) => [
                      styles.arrowButton,
                      { backgroundColor: right.theme.softBg },
                      pressed && !isLocked && sortPressed,
                    ]}
                  >
                    <Feather name="arrow-right" size={18} color={right.theme.color} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.allPlacedBanner}>
          <Feather name="check" size={18} color={colors.brandPrimary} />
          <Text style={styles.allPlacedText}>All cards placed. Tap Submit.</Text>
        </View>
      )}

      {!hideSubmitButton && (
        <View style={styles.footerWrap}>
          <Button
            label="Next"
            variant="primary"
            onPress={handleSubmit}
            disabled={!allPlaced || isLocked}
            testID="duel-sort-submit"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bucketsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unplacedSection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  unplacedHeader: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.textMuted,
  },
  unplacedList: {
    gap: spacing.sm,
  },
  unplacedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    minHeight: 52,
    ...elevation.low,
  },
  cardSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimarySoft,
  },
  arrowButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  cardText: {
    ...type.bodyDefault,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardTextSelected: {
    fontWeight: '700',
    color: colors.brandPrimary,
  },
  allPlacedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandPrimarySoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
  },
  allPlacedText: {
    ...type.bodyDefault,
    fontWeight: '600',
    color: colors.brandPrimary,
  },
  footerWrap: {
    marginTop: spacing.sm,
  },
});
