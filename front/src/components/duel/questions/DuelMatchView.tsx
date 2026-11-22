import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { Button } from '@/components/Button';
import { colors, radii, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/duel/feedback';
import type { DuelAnswer, DuelMatchStep } from '@/types/duel';

type Props = {
  step: DuelMatchStep;
  onSubmit: (answer: DuelAnswer) => void;
  onAnswerChange?: (answer: DuelAnswer | null) => void;
  isLocked: boolean;
  hideSubmitButton?: boolean;
};

// 4-6 kit accent colours for pairs
export const PAIR_COLORS = [
  { border: colors.storyTeal, bg: 'rgba(30, 154, 168, 0.12)' },
  { border: colors.storyViolet, bg: 'rgba(110, 90, 214, 0.12)' },
  { border: colors.storyOrange, bg: 'rgba(232, 131, 58, 0.12)' },
  { border: colors.storyRose, bg: 'rgba(217, 87, 122, 0.12)' },
  { border: colors.feedbackSuccess, bg: 'rgba(30, 138, 94, 0.12)' },
  { border: colors.brandAccent, bg: 'rgba(255, 204, 0, 0.16)' },
];

export interface TileLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineEndpoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Computes connecting line coordinates between paired left and right tiles.
 * Starts at the RIGHT edge midpoint of left tile: (l.x + l.width, l.y + l.height / 2).
 * Ends at the LEFT edge midpoint of right tile: (r.x, r.y + r.height / 2).
 */
export function computeLineEndpoints(left: TileLayout, right: TileLayout): LineEndpoints {
  return {
    x1: left.x + left.width,
    y1: left.y + left.height / 2,
    x2: right.x,
    y2: right.y + right.height / 2,
  };
}

export function DuelMatchView({ step, onSubmit, onAnswerChange, isLocked, hideSubmitButton = false }: Props) {
  const reducedMotion = useReducedMotion();
  const [pairs, setPairs] = useState<(number | null)[]>(() =>
    Array(step.left.length).fill(null),
  );
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);

  // Measure every tile relative to the contentWrap container (which hosts the SVG overlay)
  const containerRef = useRef<any>(null);
  const leftTileRefs = useRef<Record<number, any>>({});
  const rightTileRefs = useRef<Record<number, any>>({});

  // Layout coordinates of individual tiles measured in the same container coordinate space
  const [leftLayouts, setLeftLayouts] = useState<Record<number, TileLayout>>({});
  const [rightLayouts, setRightLayouts] = useState<Record<number, TileLayout>>({});
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const measureTile = (
    el: any,
    container: any,
    cb: (layout: TileLayout) => void,
  ) => {
    if (!el || !container) return;
    if (typeof el.measureLayout === 'function') {
      el.measureLayout(
        container,
        (x: number, y: number, width: number, height: number) => {
          cb({ x, y, width, height });
        },
        () => {},
      );
    } else if (typeof el.getBoundingClientRect === 'function' && typeof container.getBoundingClientRect === 'function') {
      const elR = el.getBoundingClientRect();
      const contR = container.getBoundingClientRect();
      cb({
        x: elR.left - contR.left,
        y: elR.top - contR.top,
        width: elR.width,
        height: elR.height,
      });
    }
  };

  const measureAllTiles = () => {
    const container = containerRef.current;
    if (!container) return;

    step.left.forEach((_, idx) => {
      measureTile(leftTileRefs.current[idx], container, (layout) => {
        setLeftLayouts((prev) => ({ ...prev, [idx]: layout }));
      });
    });

    step.right.forEach((_, idx) => {
      measureTile(rightTileRefs.current[idx], container, (layout) => {
        setRightLayouts((prev) => ({ ...prev, [idx]: layout }));
      });
    });
  };

  const allPaired = pairs.length > 0 && pairs.every((p) => p !== null);

  const notifyChange = (newPairs: (number | null)[]) => {
    if (onAnswerChange) {
      const isComplete = newPairs.length > 0 && newPairs.every((p) => p !== null);
      onAnswerChange(isComplete ? { pairs: newPairs as number[] } : null);
    }
  };

  const handleTapLeft = (leftIndex: number) => {
    if (isLocked) return;

    // Tapping a paired item unpairs it (breaks the pair)
    if (pairs[leftIndex] !== null) {
      haptic('light');
      setPairs((prev) => {
        const next = [...prev];
        next[leftIndex] = null;
        notifyChange(next);
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // If a right item was already selected, make pair!
    if (selectedRight !== null) {
      haptic('success');
      setPairs((prev) => {
        const next = [...prev];
        next[leftIndex] = selectedRight;
        notifyChange(next);
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      // Re-measure after pair layout updates
      setTimeout(measureAllTiles, 50);
      return;
    }

    // Toggle selection
    haptic('light');
    setSelectedLeft((prev) => (prev === leftIndex ? null : leftIndex));
  };

  const handleTapRight = (rightIndex: number) => {
    if (isLocked) return;

    // Check if right item is already paired
    const existingLeftIdx = pairs.indexOf(rightIndex);
    if (existingLeftIdx !== -1) {
      // Tapping a paired item breaks the pair
      haptic('light');
      setPairs((prev) => {
        const next = [...prev];
        next[existingLeftIdx] = null;
        notifyChange(next);
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    // If a left item was already selected, make pair!
    if (selectedLeft !== null) {
      haptic('success');
      setPairs((prev) => {
        const next = [...prev];
        next[selectedLeft] = rightIndex;
        notifyChange(next);
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
      // Re-measure after pair layout updates
      setTimeout(measureAllTiles, 50);
      return;
    }

    // Toggle selection
    haptic('light');
    setSelectedRight((prev) => (prev === rightIndex ? null : rightIndex));
  };

  const handleSubmit = () => {
    if (!allPaired || isLocked) return;
    onSubmit({ pairs: pairs as number[] });
  };

  // Determine pair index (0..N-1) for colours
  const getPairIndexForLeft = (leftIndex: number): number | null => {
    if (pairs[leftIndex] === null) return null;
    return leftIndex;
  };

  const getPairIndexForRight = (rightIndex: number): number | null => {
    const leftIndex = pairs.indexOf(rightIndex);
    if (leftIndex === -1) return null;
    return leftIndex;
  };

  return (
    <View
      style={styles.container}
      testID="duel-match"
      onLayout={(e) => {
        setContainerSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        });
        measureAllTiles();
      }}
    >
      {step.prompt && <Text style={styles.prompt}>{step.prompt}</Text>}

      <View
        ref={containerRef}
        style={styles.contentWrap}
        onLayout={(e) => {
          setContainerSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          });
          measureAllTiles();
        }}
      >
        <View style={styles.columns}>
          {/* Left column: terms */}
          <View style={styles.column}>
            <Text style={styles.colHeader}>Terms</Text>
            {step.left.map((term, leftIdx) => {
              const isSelected = selectedLeft === leftIdx;
              const pairIdx = getPairIndexForLeft(leftIdx);
              const isPaired = pairIdx !== null;
              const pairStyle = isPaired
                ? PAIR_COLORS[pairIdx % PAIR_COLORS.length]
                : null;

              return (
                <View
                  key={leftIdx}
                  ref={(r) => {
                    leftTileRefs.current[leftIdx] = r;
                  }}
                  onLayout={() => {
                    measureTile(
                      leftTileRefs.current[leftIdx],
                      containerRef.current,
                      (layout) => {
                        setLeftLayouts((prev) => ({ ...prev, [leftIdx]: layout }));
                      },
                    );
                  }}
                >
                  <Tile
                    text={term}
                    isSelected={isSelected}
                    isPaired={isPaired}
                    pairIndex={pairIdx}
                    pairColor={pairStyle?.border}
                    pairBg={pairStyle?.bg}
                    isLocked={isLocked}
                    onPress={() => handleTapLeft(leftIdx)}
                    testID={`match-left-${leftIdx}`}
                    reducedMotion={reducedMotion}
                  />
                </View>
              );
            })}
          </View>

          {/* Right column: definitions */}
          <View style={styles.column}>
            <Text style={styles.colHeader}>Definitions</Text>
            {step.right.map((def, rightIdx) => {
              const isSelected = selectedRight === rightIdx;
              const pairIdx = getPairIndexForRight(rightIdx);
              const isPaired = pairIdx !== null;
              const pairStyle = isPaired
                ? PAIR_COLORS[pairIdx % PAIR_COLORS.length]
                : null;

              return (
                <View
                  key={rightIdx}
                  ref={(r) => {
                    rightTileRefs.current[rightIdx] = r;
                  }}
                  onLayout={() => {
                    measureTile(
                      rightTileRefs.current[rightIdx],
                      containerRef.current,
                      (layout) => {
                        setRightLayouts((prev) => ({ ...prev, [rightIdx]: layout }));
                      },
                    );
                  }}
                >
                  <Tile
                    text={def}
                    isSelected={isSelected}
                    isPaired={isPaired}
                    pairIndex={pairIdx}
                    pairColor={pairStyle?.border}
                    pairBg={pairStyle?.bg}
                    isLocked={isLocked}
                    onPress={() => handleTapRight(rightIdx)}
                    testID={`match-right-${rightIdx}`}
                    reducedMotion={reducedMotion}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* SVG connecting lines drawn ABOVE the tiles (z-index / pointerEvents none) */}
        {containerSize.width > 0 && containerSize.height > 0 && (
          <Svg
            width={containerSize.width}
            height={containerSize.height}
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            style={[
              StyleSheet.absoluteFill,
              styles.svgOverlay,
              { width: containerSize.width, height: containerSize.height },
            ]}
            pointerEvents="none"
            testID="match-svg-lines"
          >
            {pairs.map((rightIndex, leftIndex) => {
              if (rightIndex === null) return null;
              const l = leftLayouts[leftIndex];
              const r = rightLayouts[rightIndex];
              // Only draw a line when both ends are properly measured
              if (!l || !r) return null;

              // Line starts at RIGHT edge centre of left tile, ends at LEFT edge centre of right tile
              const { x1, y1, x2, y2 } = computeLineEndpoints(l, r);
              const pairColor = PAIR_COLORS[leftIndex % PAIR_COLORS.length].border;

              return (
                <SvgPairLine
                  key={`line-${leftIndex}-${rightIndex}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  color={pairColor}
                  reducedMotion={reducedMotion}
                />
              );
            })}
          </Svg>
        )}
      </View>

      {allPaired ? (
        <View style={styles.allPairedBanner}>
          <Text style={styles.allPairedText}>All pairs connected. Tap Submit.</Text>
        </View>
      ) : (
        <Text style={styles.hintText}>
          Tap an item on the left, then its match on the right. Tap a paired item to unpair.
        </Text>
      )}

      {/* Submit button when embedded */}
      {!hideSubmitButton && (
        <View style={styles.footerWrap}>
          <Button
            label="Submit"
            variant="primary"
            onPress={handleSubmit}
            disabled={!allPaired || isLocked}
            testID="duel-match-submit"
          />
        </View>
      )}
    </View>
  );
}

function SvgPairLine({
  x1,
  y1,
  x2,
  y2,
  color,
  reducedMotion,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  reducedMotion: boolean;
}) {
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let frame = 0;
    const startTime = Date.now();
    const duration = 200;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const curX2 = x1 + (x2 - x1) * progress;
  const curY2 = y1 + (y2 - y1) * progress;

  return (
    <>
      <Line
        x1={x1}
        y1={y1}
        x2={curX2}
        y2={curY2}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx={x1} cy={y1} r={3.5} fill={color} />
      <Circle cx={curX2} cy={curY2} r={3.5} fill={color} />
    </>
  );
}

function Tile({
  text,
  isSelected,
  isPaired,
  pairIndex,
  pairColor,
  pairBg,
  isLocked,
  onPress,
  testID,
  reducedMotion,
}: {
  text: string;
  isSelected: boolean;
  isPaired: boolean;
  pairIndex: number | null;
  pairColor?: string;
  pairBg?: string;
  isLocked: boolean;
  onPress: () => void;
  testID: string;
  reducedMotion: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    if (isSelected) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 300 }),
          withTiming(1.0, { duration: 300 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [isSelected, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${text}${isPaired && pairIndex !== null ? `, pair ${pairIndex + 1}` : ''}`}
        disabled={isLocked}
        testID={testID}
        style={({ pressed }) => [
          styles.tile,
          isSelected && styles.tileSelected,
          isPaired && { borderColor: pairColor, backgroundColor: pairBg },
          pressed && !isLocked && styles.pressed,
        ]}
      >
        <View style={styles.tileInner}>
          {isPaired && pairIndex !== null && (
            <View style={[styles.pairDotBadge, { backgroundColor: pairColor }]}>
              <Text style={styles.pairDotText}>{pairIndex + 1}</Text>
            </View>
          )}
          <Text
            style={[
              styles.tileText,
              isSelected && styles.tileTextSelected,
              isPaired && { color: colors.textPrimary, fontWeight: '700' },
            ]}
          >
            {text}
          </Text>
        </View>
      </Pressable>
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
  contentWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
    zIndex: 10,
    elevation: 10,
  },
  columns: {
    flexDirection: 'row',
    gap: 44,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
  },
  colHeader: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  tile: {
    backgroundColor: colors.bgSurface,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: colors.brandAccent,
    backgroundColor: colors.brandAccentSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
  },
  tileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pairDotBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairDotText: {
    ...type.labelDefault,
    color: colors.textOnBrand,
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 12,
  },
  tileText: {
    ...type.bodyDefault,
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 13,
  },
  tileTextSelected: {
    fontWeight: '700',
    color: colors.brandPrimary,
  },
  allPairedBanner: {
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  allPairedText: {
    ...type.labelDefault,
    color: colors.brandPrimary,
    fontWeight: '600',
  },
  hintText: {
    ...type.bodyDefault,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerWrap: {
    marginTop: spacing.xs,
  },
});
