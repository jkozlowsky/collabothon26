import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Feedback } from '@/components/lesson/Feedback';
import { StepLayout } from '@/components/lesson/StepLayout';
import { haptic, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { shuffle } from '@/lib/lessonPlayer';
import type { MatchStep as MatchStepData, StepOutcome } from '@/types/lessons';

type Props = {
  step: MatchStepData;
  onDone?: (outcome: StepOutcome) => void;
};

type Side = 'left' | 'right';
type TileState = 'idle' | 'selected' | 'matched' | 'wrong';

const WRONG_FLASH_MS = 600;

/**
 * Tap a term, then its meaning (or the other way round). Right pairs lock green; a wrong pair flashes red.
 * Terms are shuffled on every try, meanings always; the step counts as right only without a wrong pair.
 */
export function MatchStep({ step, onDone }: Props) {
  const n = step.pairs.length;
  const [order] = useState(() => ({ left: shuffle([...Array(n).keys()]), right: shuffle([...Array(n).keys()]) }));
  const [selected, setSelected] = useState<{ side: Side; index: number } | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const done = matched.length === n;

  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), WRONG_FLASH_MS);
    return () => clearTimeout(t);
  }, [wrong]);

  function tap(side: Side, index: number) {
    if (matched.includes(index)) return;
    if (!selected || selected.side === side) {
      setSelected({ side, index });
      haptic('selection');
      return;
    }
    const left = side === 'left' ? index : selected.index;
    const right = side === 'right' ? index : selected.index;
    setSelected(null);
    if (left === right) {
      const nextMatched = [...matched, left];
      setMatched(nextMatched);
      haptic('success');
    } else {
      setWrong({ left, right });
      setMistakes((m) => m + 1);
      haptic('light');
    }
  }

  function stateOf(side: Side, index: number): TileState {
    if (matched.includes(index)) return 'matched';
    if (wrong && wrong[side] === index) return 'wrong';
    if (selected?.side === side && selected.index === index) return 'selected';
    return 'idle';
  }

  const column = (side: Side) => (
    <View style={styles.column}>
      {order[side].map((index) => {
        const state = stateOf(side, index);
        return (
          <Tappable
            key={index}
            testID={`match-${side}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected: state === 'selected', disabled: state === 'matched' }}
            disabled={state === 'matched' || done}
            onPress={() => tap(side, index)}
            style={[styles.tile, styles[state]]}
          >
            <Text style={[side === 'left' ? styles.term : styles.meaning, state === 'matched' && styles.matchedText]}>
              {state === 'matched' ? '✓ ' : state === 'wrong' ? '✗ ' : ''}
              {step.pairs[index][side === 'left' ? 0 : 1]}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );

  return (
    <StepLayout
      prompt={step.prompt ?? 'Match the pairs'}
      footer={
        done ? (
          <Feedback
            correct={mistakes === 0}
            explanation={mistakes === 0 ? 'All pairs right on the first try.' : `All matched, with ${mistakes} wrong ${mistakes === 1 ? 'pair' : 'pairs'} on the way.`}
            onContinue={() => onDone?.({ correct: mistakes === 0 })}
          />
        ) : undefined
      }
    >
      <View style={styles.columns}>
        {column('left')}
        {column('right')}
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1, gap: spacing.md },
  tile: {
    minHeight: 72,
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  idle: {},
  selected: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary, borderWidth: 2 },
  matched: { backgroundColor: colors.feedbackSuccessSoft, borderColor: colors.feedbackSuccess },
  wrong: { backgroundColor: colors.feedbackDangerSoft, borderColor: colors.feedbackDanger, borderWidth: 2 },
  term: type.titleCard,
  meaning: type.bodyDefault,
  matchedText: { color: colors.feedbackSuccess },
});
