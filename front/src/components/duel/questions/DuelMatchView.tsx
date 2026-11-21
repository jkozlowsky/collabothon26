import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { DuelAnswer, DuelMatchStep } from '@/types/duel';

type Props = {
  step: DuelMatchStep;
  onSubmit: (answer: DuelAnswer) => void;
  isLocked: boolean;
};

export function DuelMatchView({ step, onSubmit, isLocked }: Props) {
  const [pairs, setPairs] = useState<(number | null)[]>(() =>
    Array(step.left.length).fill(null),
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);

  const allPaired = pairs.length > 0 && pairs.every((p) => p !== null);

  const handleTapLeft = (leftIndex: number) => {
    if (isLocked) return;

    // Tapping a paired item unpairs it
    if (pairs[leftIndex] !== null) {
      setPairs((prev) => {
        const next = [...prev];
        next[leftIndex] = null;
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // If a right item was selected, pair them
    if (selectedRight !== null) {
      setPairs((prev) => {
        const next = [...prev];
        next[leftIndex] = selectedRight;
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // Toggle selection
    setSelectedLeft((prev) => (prev === leftIndex ? null : leftIndex));
  };

  const handleTapRight = (rightIndex: number) => {
    if (isLocked) return;

    // Check if right item is already paired
    const existingLeftIdx = pairs.indexOf(rightIndex);
    if (existingLeftIdx !== -1) {
      // Tapping a paired item unpairs it
      setPairs((prev) => {
        const next = [...prev];
        next[existingLeftIdx] = null;
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // If a left item was selected, pair them
    if (selectedLeft !== null) {
      setPairs((prev) => {
        const next = [...prev];
        next[selectedLeft] = rightIndex;
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // Toggle selection
    setSelectedRight((prev) => (prev === rightIndex ? null : rightIndex));
  };

  const handleSubmit = () => {
    if (!allPaired || isLocked) return;
    onSubmit({ pairs: pairs as number[] });
  };

  // Determine pair number (1..N) for neutral display
  const getPairNumberForLeft = (leftIndex: number): number | null => {
    const rightIndex = pairs[leftIndex];
    if (rightIndex === null) return null;
    return leftIndex + 1;
  };

  const getPairNumberForRight = (rightIndex: number): number | null => {
    const leftIndex = pairs.indexOf(rightIndex);
    if (leftIndex === -1) return null;
    return leftIndex + 1;
  };

  return (
    <View style={styles.container} testID="duel-match">
      {step.prompt && <Text style={styles.prompt}>{step.prompt}</Text>}

      <View style={styles.columns}>
        {/* Left column: terms */}
        <View style={styles.column}>
          <Text style={styles.colHeader}>Terms</Text>
          {step.left.map((term, leftIdx) => {
            const isSelected = selectedLeft === leftIdx;
            const pairNumber = getPairNumberForLeft(leftIdx);
            const isPaired = pairNumber !== null;

            return (
              <Pressable
                key={leftIdx}
                onPress={() => handleTapLeft(leftIdx)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${term}${isPaired ? `, paired as group ${pairNumber}` : ''}`}
                disabled={isLocked}
                testID={`match-left-${leftIdx}`}
                style={({ pressed }) => [
                  styles.tile,
                  isSelected && styles.tileSelected,
                  isPaired && styles.tilePaired,
                  pressed && !isLocked && styles.pressed,
                ]}
              >
                <View style={styles.tileInner}>
                  {isPaired && (
                    <View style={styles.pairBadge}>
                      <Text style={styles.pairBadgeText}>{pairNumber}</Text>
                    </View>
                  )}
                  <Text style={[styles.termText, isPaired && styles.termTextPaired]}>
                    {term}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Right column: definitions */}
        <View style={styles.column}>
          <Text style={styles.colHeader}>Definitions</Text>
          {step.right.map((def, rightIdx) => {
            const isSelected = selectedRight === rightIdx;
            const pairNumber = getPairNumberForRight(rightIdx);
            const isPaired = pairNumber !== null;

            return (
              <Pressable
                key={rightIdx}
                onPress={() => handleTapRight(rightIdx)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${def}${isPaired ? `, paired as group ${pairNumber}` : ''}`}
                disabled={isLocked}
                testID={`match-right-${rightIdx}`}
                style={({ pressed }) => [
                  styles.tile,
                  isSelected && styles.tileSelected,
                  isPaired && styles.tilePaired,
                  pressed && !isLocked && styles.pressed,
                ]}
              >
                <View style={styles.tileInner}>
                  {isPaired && (
                    <View style={styles.pairBadge}>
                      <Text style={styles.pairBadgeText}>{pairNumber}</Text>
                    </View>
                  )}
                  <Text style={[styles.defText, isPaired && styles.defTextPaired]}>
                    {def}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {allPaired ? (
        <View style={styles.allPairedBanner}>
          <Feather name="check" size={18} color={colors.brandPrimary} />
          <Text style={styles.allPairedText}>All pairs connected! Tap Next to submit.</Text>
        </View>
      ) : (
        <Text style={styles.hintText}>
          Tap an item on the left, then its match on the right. Tap a paired item to unpair.
        </Text>
      )}

      {/* Next button */}
      <View style={styles.footerWrap}>
        <Button
          label="Next"
          variant="primary"
          onPress={handleSubmit}
          disabled={!allPaired || isLocked}
          testID="duel-match-submit"
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
  columns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
  },
  colHeader: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tile: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    minHeight: 64,
    justifyContent: 'center',
    ...elevation.low,
  },
  tileSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandPrimarySoft,
  },
  tilePaired: {
    borderColor: colors.brandAccent,
    backgroundColor: '#F8F9FA',
  },
  tileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pairBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairBadgeText: {
    color: colors.textOnAccent,
    fontSize: 11,
    fontWeight: '700',
  },
  termText: {
    ...type.bodyDefault,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  termTextPaired: {
    color: colors.textPrimary,
  },
  defText: {
    ...type.labelDefault,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  defTextPaired: {
    color: colors.textPrimary,
  },
  allPairedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandPrimarySoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
  },
  allPairedText: {
    ...type.bodyDefault,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPrimary,
  },
  hintText: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerWrap: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
