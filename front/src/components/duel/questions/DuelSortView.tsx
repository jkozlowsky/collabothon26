import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { DuelAnswer, DuelSortStep } from '@/types/duel';

type Props = {
  step: DuelSortStep;
  onSubmit: (answer: DuelAnswer) => void;
  isLocked: boolean;
};

export function DuelSortView({ step, onSubmit, isLocked }: Props) {
  const [placements, setPlacements] = useState<(number | null)[]>(() =>
    Array(step.items.length).fill(null),
  );
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const allPlaced = placements.length > 0 && placements.every((p) => p !== null);

  const placeItem = (itemIndex: number, bucketIndex: number) => {
    if (isLocked) return;
    setPlacements((prev) => {
      const next = [...prev];
      next[itemIndex] = bucketIndex;
      return next;
    });
    setSelectedCard(null);
  };

  const unplaceItem = (itemIndex: number) => {
    if (isLocked) return;
    setPlacements((prev) => {
      const next = [...prev];
      next[itemIndex] = null;
      return next;
    });
    setSelectedCard(null);
  };

  const handleBucketPress = (bucketIndex: number) => {
    if (isLocked || selectedCard === null) return;
    placeItem(selectedCard, bucketIndex);
  };

  const handleCardPress = (index: number) => {
    if (isLocked) return;
    if (selectedCard === index) {
      setSelectedCard(null);
    } else {
      setSelectedCard(index);
    }
  };

  const handleSubmit = () => {
    if (!allPlaced || isLocked) return;
    onSubmit({ buckets: placements as number[] });
  };

  const bucket0Items = step.items
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => placements[index] === 0);

  const bucket1Items = step.items
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => placements[index] === 1);

  const unplacedItems = step.items
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => placements[index] === null);

  return (
    <View style={styles.container} testID="duel-sort">
      {step.prompt && <Text style={styles.prompt}>{step.prompt}</Text>}

      {/* Two bucket columns side-by-side at the top */}
      <View style={styles.bucketsRow}>
        {/* Bucket 0 */}
        <View style={styles.bucketColWrap}>
          <Pressable
            onPress={() => handleBucketPress(0)}
            accessibilityRole="button"
            accessibilityLabel={`Bucket: ${step.buckets[0]}`}
            testID="duel-sort-bucket-0"
            disabled={isLocked}
            style={({ pressed }) => [
              styles.bucketCol,
              selectedCard !== null && styles.bucketColActiveTarget,
              pressed && !isLocked && styles.pressed,
            ]}
          >
            <View style={styles.bucketHeader}>
              <Text style={styles.bucketTitle} numberOfLines={2}>
                {step.buckets[0]}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{bucket0Items.length}</Text>
              </View>
            </View>

            <View style={styles.bucketCardsContainer}>
              {bucket0Items.length === 0 ? (
                <View style={styles.emptyBucketHint}>
                  <Text style={styles.emptyBucketText}>
                    {selectedCard !== null ? 'Tap to place' : 'Empty'}
                  </Text>
                </View>
              ) : (
                bucket0Items.map(({ text, index }) => (
                  <View
                    key={index}
                    style={[
                      styles.placedCard,
                      selectedCard === index && styles.cardSelected,
                    ]}
                    testID={`duel-sort-placed-${index}`}
                  >
                    <Text style={styles.placedCardText}>{text}</Text>
                    <View style={styles.cardActionsRow}>
                      <Pressable
                        onPress={() => unplaceItem(index)}
                        accessibilityLabel="Remove from bucket"
                        disabled={isLocked}
                        style={({ pressed }) => [styles.cardMiniBtn, pressed && styles.pressed]}
                      >
                        <Feather name="x" size={14} color={colors.textMuted} />
                      </Pressable>
                      <Pressable
                        onPress={() => placeItem(index, 1)}
                        accessibilityLabel={`Move to ${step.buckets[1]}`}
                        disabled={isLocked}
                        style={({ pressed }) => [styles.cardMiniBtn, pressed && styles.pressed]}
                      >
                        <Feather name="arrow-right" size={14} color={colors.brandPrimary} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Pressable>
        </View>

        {/* Bucket 1 */}
        <View style={styles.bucketColWrap}>
          <Pressable
            onPress={() => handleBucketPress(1)}
            accessibilityRole="button"
            accessibilityLabel={`Bucket: ${step.buckets[1]}`}
            testID="duel-sort-bucket-1"
            disabled={isLocked}
            style={({ pressed }) => [
              styles.bucketCol,
              selectedCard !== null && styles.bucketColActiveTarget,
              pressed && !isLocked && styles.pressed,
            ]}
          >
            <View style={styles.bucketHeader}>
              <Text style={styles.bucketTitle} numberOfLines={2}>
                {step.buckets[1]}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{bucket1Items.length}</Text>
              </View>
            </View>

            <View style={styles.bucketCardsContainer}>
              {bucket1Items.length === 0 ? (
                <View style={styles.emptyBucketHint}>
                  <Text style={styles.emptyBucketText}>
                    {selectedCard !== null ? 'Tap to place' : 'Empty'}
                  </Text>
                </View>
              ) : (
                bucket1Items.map(({ text, index }) => (
                  <View
                    key={index}
                    style={[
                      styles.placedCard,
                      selectedCard === index && styles.cardSelected,
                    ]}
                    testID={`duel-sort-placed-${index}`}
                  >
                    <Text style={styles.placedCardText}>{text}</Text>
                    <View style={styles.cardActionsRow}>
                      <Pressable
                        onPress={() => placeItem(index, 0)}
                        accessibilityLabel={`Move to ${step.buckets[0]}`}
                        disabled={isLocked}
                        style={({ pressed }) => [styles.cardMiniBtn, pressed && styles.pressed]}
                      >
                        <Feather name="arrow-left" size={14} color={colors.brandPrimary} />
                      </Pressable>
                      <Pressable
                        onPress={() => unplaceItem(index)}
                        accessibilityLabel="Remove from bucket"
                        disabled={isLocked}
                        style={({ pressed }) => [styles.cardMiniBtn, pressed && styles.pressed]}
                      >
                        <Feather name="x" size={14} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Unplaced cards section */}
      {unplacedItems.length > 0 ? (
        <View style={styles.unplacedSection}>
          <Text style={styles.unplacedHeader}>
            Cards to place ({unplacedItems.length}):
          </Text>
          <View style={styles.unplacedList}>
            {unplacedItems.map(({ text, index }) => {
              const isSelected = selectedCard === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.unplacedCard,
                    isSelected && styles.cardSelected,
                  ]}
                >
                  <Pressable
                    onPress={() => placeItem(index, 0)}
                    accessibilityLabel={`Place in ${step.buckets[0]}`}
                    disabled={isLocked}
                    testID={`duel-sort-left-${index}`}
                    style={({ pressed }) => [styles.arrowButton, pressed && !isLocked && styles.pressed]}
                  >
                    <Feather name="arrow-left" size={16} color={colors.brandPrimary} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleCardPress(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={`duel-sort-item-${index}`}
                    disabled={isLocked}
                    style={({ pressed }) => [styles.cardCenter, pressed && !isLocked && styles.pressed]}
                  >
                    <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
                      {text}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => placeItem(index, 1)}
                    accessibilityLabel={`Place in ${step.buckets[1]}`}
                    disabled={isLocked}
                    testID={`duel-sort-right-${index}`}
                    style={({ pressed }) => [styles.arrowButton, pressed && !isLocked && styles.pressed]}
                  >
                    <Feather name="arrow-right" size={16} color={colors.brandPrimary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.allPlacedBanner}>
          <Feather name="check" size={18} color={colors.brandPrimary} />
          <Text style={styles.allPlacedText}>All cards placed! Press Next to submit.</Text>
        </View>
      )}

      {/* Next button */}
      <View style={styles.footerWrap}>
        <Button
          label="Next"
          variant="primary"
          onPress={handleSubmit}
          disabled={!allPlaced || isLocked}
          testID="duel-sort-submit"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  prompt: {
    ...type.titleSection,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bucketsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bucketColWrap: {
    flex: 1,
  },
  bucketCol: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    minHeight: 180,
    gap: spacing.xs,
    ...elevation.low,
  },
  bucketColActiveTarget: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimarySoft,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  bucketTitle: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.brandPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.brandPrimarySoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.pill,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    ...type.labelDefault,
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary,
  },
  bucketCardsContainer: {
    flex: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  emptyBucketHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyBucketText: {
    ...type.labelDefault,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  placedCard: {
    backgroundColor: colors.bgCanvas,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xs,
    gap: 4,
  },
  placedCardText: {
    ...type.labelDefault,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  cardMiniBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: colors.bgSurface,
  },
  unplacedSection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  unplacedHeader: {
    ...type.labelDefault,
    fontWeight: '600',
    color: colors.textMuted,
  },
  unplacedList: {
    gap: spacing.xs,
  },
  unplacedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    ...elevation.low,
  },
  cardSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimarySoft,
  },
  arrowButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brandPrimarySoft,
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
    color: colors.textPrimary,
  },
  cardTextSelected: {
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPrimary,
  },
  footerWrap: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
