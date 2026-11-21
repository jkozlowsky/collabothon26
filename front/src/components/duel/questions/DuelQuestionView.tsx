import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Slider } from '@/components/bank/Slider';
import { LineChart } from '@/components/lesson/LineChart';
import { DuelMatchView } from '@/components/duel/questions/DuelMatchView';
import { DuelSortView } from '@/components/duel/questions/DuelSortView';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatValue, MODELS, sweep } from '@/lib/models';
import type {
  DuelAnswer,
  DuelChartStep,
  DuelPredictStep,
  DuelQuestion,
  DuelQuizStep,
} from '@/types/duel';

type Props = {
  question: DuelQuestion;
  /** Called once, when the player commits; disable input afterwards. */
  onSubmit: (answer: DuelAnswer) => void;
  disabled?: boolean; // after submit or when time is up
};

export function DuelQuestionView({ question, onSubmit, disabled = false }: Props) {
  const committedRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const isLocked = disabled || submitted;

  const handleCommit = (answer: DuelAnswer) => {
    if (isLocked || committedRef.current) return;
    committedRef.current = true;
    setSubmitted(true);
    onSubmit(answer);
  };

  const step = question.step;

  switch (step.type) {
    case 'quiz':
      return <DuelQuizView step={step} onSubmit={handleCommit} isLocked={isLocked} />;
    case 'predict':
      return <DuelPredictView step={step} onSubmit={handleCommit} isLocked={isLocked} />;
    case 'chart':
      return <DuelChartView step={step} onSubmit={handleCommit} isLocked={isLocked} />;
    case 'sort':
      return <DuelSortView step={step} onSubmit={handleCommit} isLocked={isLocked} />;
    case 'match':
      return <DuelMatchView step={step} onSubmit={handleCommit} isLocked={isLocked} />;
  }
}

function DuelQuizView({
  step,
  onSubmit,
  isLocked,
}: {
  step: DuelQuizStep;
  onSubmit: (ans: DuelAnswer) => void;
  isLocked: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const handlePress = (index: number) => {
    if (isLocked) return;
    setSelected(index);
    onSubmit({ option: index });
  };

  return (
    <View style={styles.container} testID="duel-quiz">
      <Text style={styles.prompt}>{step.prompt}</Text>
      <View style={styles.optionsList}>
        {step.options.map((option, index) => {
          const isSelected = selected === index;
          return (
            <Pressable
              key={index}
              testID={`duel-option-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isLocked }}
              disabled={isLocked}
              onPress={() => handlePress(index)}
              style={({ pressed }) => [
                styles.quizOption,
                isSelected && styles.quizOptionSelected,
                isLocked && !isSelected && styles.optionDisabled,
                pressed && !isLocked && styles.quizOptionPressed,
              ]}
            >
              <Text style={[styles.quizOptionText, isSelected && styles.quizOptionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DuelPredictView({
  step,
  onSubmit,
  isLocked,
}: {
  step: DuelPredictStep;
  onSubmit: (ans: DuelAnswer) => void;
  isLocked: boolean;
}) {
  const { min, max, step: inc, unit } = step.input;
  // Sliders start at input.min (Round 4 §8.3)
  const [guess, setGuess] = useState(min);

  const show = (v: number) => formatValue(v, unit, { signed: min < 0 });

  return (
    <View style={styles.container} testID="duel-predict">
      <Text style={styles.prompt}>{step.prompt}</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your answer</Text>
        <Text style={styles.displayValue} testID="duel-predict-value">
          {show(guess)}
        </Text>
        <View pointerEvents={isLocked ? 'none' : 'auto'} style={styles.sliderWrap}>
          <Slider
            value={guess}
            min={min}
            max={max}
            step={inc}
            onChange={setGuess}
            accessibilityLabel={`Your answer: ${show(guess)}`}
            testID="duel-predict-slider"
          />
        </View>
        <View style={styles.scaleRange}>
          <Text style={styles.scaleEnd}>{show(min)}</Text>
          <Text style={styles.scaleEnd}>{show(max)}</Text>
        </View>
      </View>
      <View style={styles.footerButton}>
        <Button
          label="Submit"
          variant="primary"
          onPress={() => onSubmit({ value: guess })}
          disabled={isLocked}
          testID="duel-predict-submit"
        />
      </View>
    </View>
  );
}

function DuelChartView({
  step,
  onSubmit,
  isLocked,
}: {
  step: DuelChartStep;
  onSubmit: (ans: DuelAnswer) => void;
  isLocked: boolean;
}) {
  const { min, max, step: inc, unit } = step.input;
  // Sliders start at input.min (Round 4 §8.3)
  const [guess, setGuess] = useState(min);

  const model = MODELS[step.model];
  const fixedValues = Object.fromEntries(Object.entries(step.params).map(([k, p]) => [k, p.value]));
  const currentValues = { ...fixedValues, [model.x]: guess };
  const currentOutput = model.y(currentValues);

  const showGuess = (v: number) => formatValue(v, unit, { signed: min < 0 });
  const showOutput = (v: number) => formatValue(v, step.output.unit, { signed: true });

  return (
    <View style={styles.container} testID="duel-chart">
      <Text style={styles.prompt}>{step.prompt}</Text>
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardLabel}>{step.output.label}</Text>
          <Text style={styles.chartOutput} testID="duel-chart-output">
            {showOutput(currentOutput)}
          </Text>
        </View>

        <LineChart
          series={[{ points: sweep(step.model, step.params, fixedValues), tone: 'primary' }]}
          marker={{ x: guess, y: currentOutput }}
          formatY={(y) => formatValue(y, step.output.unit, { signed: true })}
          accessibilityLabel={`${step.output.label}: ${showOutput(currentOutput)}`}
          testID="duel-chart-canvas"
        />

        <View style={styles.chartInputRow}>
          <Text style={styles.cardLabel}>Select value:</Text>
          <Text style={styles.chartInputValue} testID="duel-chart-value">
            {showGuess(guess)}
          </Text>
        </View>

        <View pointerEvents={isLocked ? 'none' : 'auto'} style={styles.sliderWrap}>
          <Slider
            value={guess}
            min={min}
            max={max}
            step={inc}
            onChange={setGuess}
            accessibilityLabel={`Select: ${showGuess(guess)}`}
            testID="duel-chart-slider"
          />
        </View>
        <View style={styles.scaleRange}>
          <Text style={styles.scaleEnd}>{showGuess(min)}</Text>
          <Text style={styles.scaleEnd}>{showGuess(max)}</Text>
        </View>
      </View>
      <View style={styles.footerButton}>
        <Button
          label="Submit"
          variant="primary"
          onPress={() => onSubmit({ value: guess })}
          disabled={isLocked}
          testID="duel-chart-submit"
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
  optionsList: {
    gap: spacing.md,
  },
  quizOption: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...elevation.low,
  },
  quizOptionSelected: {
    backgroundColor: colors.brandPrimarySoft,
    borderColor: colors.brandPrimary,
    borderWidth: 2,
  },
  quizOptionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  quizOptionText: {
    ...type.titleCard,
    color: colors.textPrimary,
    flex: 1,
  },
  quizOptionTextSelected: {
    color: colors.brandPrimary,
  },
  card: {
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  cardLabel: {
    ...type.overline,
    color: colors.textMuted,
  },
  displayValue: {
    ...type.displayAmount,
    color: colors.textPrimary,
  },
  sliderWrap: {
    marginTop: spacing.xs,
  },
  scaleRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleEnd: {
    ...type.labelTab,
    color: colors.textMuted,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chartOutput: {
    ...type.titleCard,
    color: colors.brandPrimary,
  },
  chartInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  chartInputValue: {
    ...type.titleCard,
    color: colors.brandPrimary,
  },
  footerButton: {
    marginTop: spacing.md,
  },
});
