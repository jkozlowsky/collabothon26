import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
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

interface BucketTheme {
  color: string;
  softBg: string;
  icon: keyof typeof Feather.glyphMap;
}

const BUCKET_THEMES: BucketTheme[] = [
  { color: colors.storyTeal, softBg: 'rgba(30, 154, 168, 0.12)', icon: 'shield' },
  { color: colors.storyViolet, softBg: 'rgba(110, 90, 214, 0.12)', icon: 'trending-up' },
  { color: colors.storyOrange, softBg: 'rgba(232, 131, 58, 0.12)', icon: 'target' },
  { color: colors.storyRose, softBg: 'rgba(217, 87, 122, 0.12)', icon: 'zap' },
];

function getBucketTheme(bucketName: string, index: number): BucketTheme {
  const lower = bucketName.toLowerCase();
  if (lower.includes('safe') || lower.includes('emergency') || lower.includes('fixed') || lower.includes('protect')) {
    return { color: colors.storyTeal, softBg: 'rgba(30, 154, 168, 0.12)', icon: 'shield' };
  }
  if (lower.includes('risky') || lower.includes('grow') || lower.includes('long-term') || lower.includes('invest') || lower.includes('stock')) {
    return { color: colors.storyViolet, softBg: 'rgba(110, 90, 214, 0.12)', icon: 'trending-up' };
  }
  return BUCKET_THEMES[index % BUCKET_THEMES.length];
}

export function DuelSortView({ step, onSubmit, onAnswerChange, isLocked, hideSubmitButton = false }: Props) {
  const reducedMotion = useReducedMotion();
  const [placements, setPlacements] = useState<(number | null)[]>(() =>
    Array(step.items.length).fill(null),
  );
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const theme0 = getBucketTheme(step.buckets[0] ?? '', 0);
  const theme1 = getBucketTheme(step.buckets[1] ?? '', 1);

  const allPlaced = placements.length > 0 && placements.every((p) => p !== null);

  const notifyChange = (newPlacements: (number | null)[]) => {
    if (onAnswerChange) {
      const isComplete = newPlacements.length > 0 && newPlacements.every((p) => p !== null);
      onAnswerChange(isComplete ? { buckets: newPlacements as number[] } : null);
    }
  };

  const placeItem = (itemIndex: number, bucketIndex: number) => {
    if (isLocked) return;
    haptic('light');
    setPlacements((prev) => {
      const next = [...prev];
      next[itemIndex] = bucketIndex;
      notifyChange(next);
      return next;
    });
    setSelectedCard(null);
  };

  const unplaceItem = (itemIndex: number) => {
    if (isLocked) return;
    haptic('light');
    setPlacements((prev) => {
      const next = [...prev];
      next[itemIndex] = null;
      notifyChange(next);
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
    haptic('light');
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
              { borderColor: theme0.color },
              selectedCard !== null && [styles.bucketColActiveTarget, { backgroundColor: theme0.softBg }],
              pressed && !isLocked && styles.pressed,
            ]}
          >
            {/* Coloured Header Bar */}
            <View style={[styles.bucketHeader, { backgroundColor: theme0.color }]}>
              <View style={styles.bucketTitleRow}>
                <Feather name={theme0.icon} size={15} color={colors.textOnBrand} />
                <Text style={styles.bucketTitle} numberOfLines={1}>
                  {step.buckets[0]}
                </Text>
              </View>
              <CountBubble
                count={bucket0Items.length}
                bubbleColor={theme0.color}
                reducedMotion={reducedMotion}
              />
            </View>

            <View style={styles.bucketCardsContainer}>
              {bucket0Items.length === 0 ? (
                <View style={styles.emptyBucketHint}>
                  <Text style={styles.emptyBucketText}>
                    {selectedCard !== null ? 'Tap to sort here' : 'Tap an arrow to sort here'}
                  </Text>
                </View>
              ) : (
                bucket0Items.map(({ text, index }) => (
                  <Animated.View
                    key={index}
                    layout={reducedMotion ? undefined : LinearTransition.duration(200)}
                    style={[
                      styles.placedCard,
                      { borderLeftColor: theme0.color },
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
                        <Feather name="arrow-right" size={14} color={theme1.color} />
                      </Pressable>
                    </View>
                  </Animated.View>
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
              { borderColor: theme1.color },
              selectedCard !== null && [styles.bucketColActiveTarget, { backgroundColor: theme1.softBg }],
              pressed && !isLocked && styles.pressed,
            ]}
          >
            {/* Coloured Header Bar */}
            <View style={[styles.bucketHeader, { backgroundColor: theme1.color }]}>
              <View style={styles.bucketTitleRow}>
                <Feather name={theme1.icon} size={15} color={colors.textOnBrand} />
                <Text style={styles.bucketTitle} numberOfLines={1}>
                  {step.buckets[1]}
                </Text>
              </View>
              <CountBubble
                count={bucket1Items.length}
                bubbleColor={theme1.color}
                reducedMotion={reducedMotion}
              />
            </View>

            <View style={styles.bucketCardsContainer}>
              {bucket1Items.length === 0 ? (
                <View style={styles.emptyBucketHint}>
                  <Text style={styles.emptyBucketText}>
                    {selectedCard !== null ? 'Tap to sort here' : 'Tap an arrow to sort here'}
                  </Text>
                </View>
              ) : (
                bucket1Items.map(({ text, index }) => (
                  <Animated.View
                    key={index}
                    layout={reducedMotion ? undefined : LinearTransition.duration(200)}
                    style={[
                      styles.placedCard,
                      { borderLeftColor: theme1.color },
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
                        <Feather name="arrow-left" size={14} color={theme0.color} />
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
                  </Animated.View>
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
                <Animated.View
                  key={index}
                  layout={reducedMotion ? undefined : LinearTransition.duration(200)}
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
                    style={({ pressed }) => [
                      styles.arrowButton,
                      { backgroundColor: theme0.softBg },
                      pressed && !isLocked && styles.pressed,
                    ]}
                  >
                    <Feather name="arrow-left" size={18} color={theme0.color} />
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
                    style={({ pressed }) => [
                      styles.arrowButton,
                      { backgroundColor: theme1.softBg },
                      pressed && !isLocked && styles.pressed,
                    ]}
                  >
                    <Feather name="arrow-right" size={18} color={theme1.color} />
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

      {/* Next button */}
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

function CountBubble({
  count,
  bubbleColor: _bubbleColor,
  reducedMotion,
}: {
  count: number;
  bubbleColor: string;
  reducedMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      if (!reducedMotion) {
        scale.value = withSequence(
          withTiming(1.35, { duration: 150 }),
          withTiming(1.0, { duration: 150 }),
        );
      }
    }
    prevCount.current = count;
  }, [count, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.countBadge, animStyle]}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </Animated.View>
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
    minHeight: 180,
    overflow: 'hidden',
    ...elevation.low,
  },
  bucketColActiveTarget: {
    borderStyle: 'dashed',
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  bucketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
  },
  bucketTitle: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.textOnBrand,
    fontSize: 12,
  },
  countBadge: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radii.pill,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...type.labelDefault,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bucketCardsContainer: {
    flex: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  emptyBucketHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
    borderRadius: radii.button,
    margin: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  emptyBucketText: {
    ...type.bodyDefault,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  placedCard: {
    backgroundColor: colors.bgCanvas,
    borderRadius: radii.button,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.borderDefault,
    padding: spacing.xs,
    gap: 4,
  },
  placedCardText: {
    ...type.labelDefault,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
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
    fontWeight: '700',
    color: colors.textMuted,
    fontSize: 12,
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
