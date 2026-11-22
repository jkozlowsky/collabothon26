import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type HostInstance, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { Button } from '@/components/Button';
import { isComplete } from '@/components/duel/questions/draft';
import { computeLineEndpoints, measureTile, type TileLayout } from '@/components/duel/questions/matchGeometry';
import { MatchPairLine } from '@/components/duel/questions/MatchPairLine';
import { MatchTile } from '@/components/duel/questions/MatchTile';
import { questionStyles } from '@/components/duel/questions/questionStyles';
import { colors, duelTints, radii, spacing, tints, type } from '@/constants/theme';
import { haptic } from '@/lib/duel/feedback';
import type { DuelAnswer, DuelMatchStep } from '@/types/duel';

// The geometry test imports it from this module.
export { computeLineEndpoints };

type Props = {
  step: DuelMatchStep;
  onSubmit: (answer: DuelAnswer) => void;
  onAnswerChange?: (answer: DuelAnswer | null) => void;
  isLocked: boolean;
  hideSubmitButton?: boolean;
};

type Side = 'left' | 'right';
type Selection = { side: Side; index: number };

/** One colour per pair, reused in order when a question has more pairs than colours. */
const PAIR_COLORS = [
  { border: colors.storyTeal, bg: duelTints.teal },
  { border: colors.storyViolet, bg: duelTints.violet },
  { border: colors.storyOrange, bg: duelTints.orange },
  { border: colors.storyRose, bg: duelTints.rose },
  { border: colors.feedbackSuccess, bg: duelTints.success },
  { border: colors.brandAccent, bg: tints.accent },
];

/** A new pair adds a badge that can reflow the tiles below it; they are measured again after this long. */
const REMEASURE_DELAY_MS = 50;

/** Match question: tap a term, then its definition; a line joins each pair. `pairs[left]` holds the right index. */
export function DuelMatchView({ step, onSubmit, onAnswerChange, isLocked, hideSubmitButton = false }: Props) {
  const reducedMotion = useReducedMotion();
  const [pairs, setPairs] = useState<(number | null)[]>(() => Array(step.left.length).fill(null));
  const [selected, setSelected] = useState<Selection | null>(null);

  // Tiles are measured relative to contentWrap, which also hosts the SVG overlay.
  const containerRef = useRef<HostInstance>(null);
  const tileRefs = useRef<Record<Side, Record<number, HostInstance | null>>>({ left: {}, right: {} });
  const [layouts, setLayouts] = useState<Record<Side, Record<number, TileLayout>>>({ left: {}, right: {} });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const remeasureTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(remeasureTimer.current), []);

  const measure = (side: Side, index: number) => {
    measureTile(tileRefs.current[side][index], containerRef.current, (layout) => {
      setLayouts((prev) => ({ ...prev, [side]: { ...prev[side], [index]: layout } }));
    });
  };

  const measureAllTiles = () => {
    step.left.forEach((_, index) => measure('left', index));
    step.right.forEach((_, index) => measure('right', index));
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
    measureAllTiles();
  };

  const allPaired = isComplete(pairs);

  /** The left index of the pair a tile belongs to, or null. A pair takes its number and colour from its left tile. */
  const pairOf = (side: Side, index: number): number | null => {
    if (side === 'left') return pairs[index] === null ? null : index;
    const leftIndex = pairs.indexOf(index);
    return leftIndex === -1 ? null : leftIndex;
  };

  const setPair = (leftIndex: number, rightIndex: number | null) => {
    const next = [...pairs];
    next[leftIndex] = rightIndex;
    setPairs(next);
    onAnswerChange?.(isComplete(next) ? { pairs: next } : null);
    setSelected(null);
  };

  const handleTap = (side: Side, index: number) => {
    if (isLocked) return;

    const pairedLeft = pairOf(side, index);
    if (pairedLeft !== null) {
      haptic('light');
      setPair(pairedLeft, null);
      return;
    }

    if (selected && selected.side !== side) {
      haptic('success');
      if (side === 'left') setPair(index, selected.index);
      else setPair(selected.index, index);
      clearTimeout(remeasureTimer.current);
      remeasureTimer.current = setTimeout(measureAllTiles, REMEASURE_DELAY_MS);
      return;
    }

    haptic('light');
    setSelected((prev) => (prev?.side === side && prev.index === index ? null : { side, index }));
  };

  const handleSubmit = () => {
    if (isLocked || !isComplete(pairs)) return;
    onSubmit({ pairs });
  };

  const renderTile = (side: Side, text: string, index: number) => {
    const pairIndex = pairOf(side, index);
    return (
      <View
        key={index}
        ref={(node) => {
          tileRefs.current[side][index] = node;
        }}
        onLayout={() => measure(side, index)}
      >
        <MatchTile
          text={text}
          isSelected={selected?.side === side && selected.index === index}
          pair={pairIndex === null ? null : { index: pairIndex, ...PAIR_COLORS[pairIndex % PAIR_COLORS.length] }}
          isLocked={isLocked}
          onPress={() => handleTap(side, index)}
          testID={`match-${side}-${index}`}
          reducedMotion={reducedMotion}
        />
      </View>
    );
  };

  return (
    <View style={questionStyles.container} testID="duel-match" onLayout={handleLayout}>
      {step.prompt ? <Text style={questionStyles.prompt}>{step.prompt}</Text> : null}

      <View ref={containerRef} style={styles.contentWrap} onLayout={handleLayout}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.colHeader}>Terms</Text>
            {step.left.map((term, index) => renderTile('left', term, index))}
          </View>
          <View style={styles.column}>
            <Text style={styles.colHeader}>Definitions</Text>
            {step.right.map((definition, index) => renderTile('right', definition, index))}
          </View>
        </View>

        {/* Lines are drawn above the tiles and let taps through. */}
        {containerSize.width > 0 && containerSize.height > 0 && (
          <Svg
            width={containerSize.width}
            height={containerSize.height}
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            style={[StyleSheet.absoluteFill, styles.svgOverlay, containerSize]}
            pointerEvents="none"
            testID="match-svg-lines"
          >
            {pairs.map((rightIndex, leftIndex) => {
              if (rightIndex === null) return null;
              const from = layouts.left[leftIndex];
              const to = layouts.right[rightIndex];
              // A line needs both of its ends measured.
              if (!from || !to) return null;
              return (
                <MatchPairLine
                  key={`line-${leftIndex}-${rightIndex}`}
                  {...computeLineEndpoints(from, to)}
                  color={PAIR_COLORS[leftIndex % PAIR_COLORS.length].border}
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

const styles = StyleSheet.create({
  contentWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  svgOverlay: {
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
