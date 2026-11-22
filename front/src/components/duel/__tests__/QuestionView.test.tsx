import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

import { QuestionView } from '@/components/duel/QuestionView';
import { createInitialDuelState, type DuelMatchState } from '@/lib/duel/reducer';
import type { DuelChartStep, DuelMatchStep, DuelPredictStep, DuelQuizStep, DuelSortStep } from '@/types/duel';

afterEach(() => {
  cleanup();
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('../../../../jest/reanimated.js');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('QuestionView footer and question integration', () => {
  const baseMatchState: DuelMatchState = {
    ...createInitialDuelState(['berlin'], 'HUMAN'),
    matchId: 100,
    phase: 'question',
    questionCount: 6,
    you: { name: 'Alex Krause', avatar: 'm1', levels: { berlin: 3 } },
    rival: { name: 'Ola Weber', avatar: 'f1', levels: { berlin: 2 } },
  };

  describe('sort question footer', () => {
    const sortStep: DuelSortStep = {
      type: 'sort',
      id: 's1',
      prompt: 'Sort into Safe vs Risky',
      buckets: ['Safe', 'Risky'],
      items: ['Cash', 'Stocks'],
    };

    const state: DuelMatchState = {
      ...baseMatchState,
      question: {
        index: 0,
        category: 'berlin',
        step: sortStep,
        deadline: Date.now() + 30000,
        timeLimitMs: 30000,
      },
    };

    it('Submit button is disabled initially and shows sort hint; enables when all items placed and submits answer', async () => {
      const onSubmitAnswer = jest.fn();
      const r = await render(
        <QuestionView
          state={state}
          youAvatar="m1"
          secondsLeft={30}
          onSubmitAnswer={onSubmitAnswer}
          onNextQuestion={jest.fn()}
          onExit={jest.fn()}
        />,
      );

      // Verify tip is visible in footer
      expect(r.getByText("Time doesn't affect points — accuracy counts")).toBeTruthy();

      // Hint is visible
      expect(r.getByText('Sort every card to submit')).toBeTruthy();

      // Submit button has testID duel-sort-submit and is disabled
      const submitBtn = r.getByTestId('duel-sort-submit');
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Place first item in bucket 0
      await fireEvent.press(r.getByTestId('duel-sort-left-0'));

      // Still disabled
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Place second item in bucket 1
      await fireEvent.press(r.getByTestId('duel-sort-right-1'));

      // Now enabled: hint under submit should disappear
      await waitFor(() => {
        expect(r.getByTestId('duel-sort-submit').props.accessibilityState?.disabled).toBe(false);
      });
      expect(r.queryByText('Sort every card to submit')).toBeNull();

      // Press submit
      await fireEvent.press(r.getByTestId('duel-sort-submit'));
      expect(onSubmitAnswer).toHaveBeenCalledTimes(1);
      expect(onSubmitAnswer).toHaveBeenCalledWith({ buckets: [0, 1] });
    });
  });

  describe('match question footer', () => {
    const matchStep: DuelMatchStep = {
      type: 'match',
      id: 'm1',
      prompt: 'Match terms with definitions',
      left: ['Term A', 'Term B'],
      right: ['Def A', 'Def B'],
    };

    const state: DuelMatchState = {
      ...baseMatchState,
      question: {
        index: 1,
        category: 'berlin',
        step: matchStep,
        deadline: Date.now() + 30000,
        timeLimitMs: 30000,
      },
    };

    it('Submit button is disabled initially and shows match hint; enables when all pairs connected and submits; supports breaking a pair', async () => {
      const onSubmitAnswer = jest.fn();
      const r = await render(
        <QuestionView
          state={state}
          youAvatar="m1"
          secondsLeft={30}
          onSubmitAnswer={onSubmitAnswer}
          onNextQuestion={jest.fn()}
          onExit={jest.fn()}
        />,
      );

      expect(r.getByText('Match every pair to submit')).toBeTruthy();
      const submitBtn = r.getByTestId('duel-match-submit');
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Pair 0 with 0
      await fireEvent.press(r.getByTestId('match-left-0'));
      await waitFor(() => {
        expect(r.getByTestId('match-left-0').props.accessibilityState?.selected).toBe(true);
      });
      await fireEvent.press(r.getByTestId('match-right-0'));
      await waitFor(() => {
        expect(r.getByTestId('match-left-0').props.accessibilityState?.selected).toBe(false);
      });

      // Verify pair badge is assigned on both paired tiles (2 badges showing '1')
      expect(r.getAllByText('1')).toHaveLength(2);
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Break pair 0 by tapping it again
      await fireEvent.press(r.getByTestId('match-left-0'));
      // Now it's unpaired and pair 1 badge disappears
      expect(r.queryAllByText('1')).toHaveLength(0);

      // Pair 0 with 0 again
      await fireEvent.press(r.getByTestId('match-left-0'));
      await fireEvent.press(r.getByTestId('match-right-0'));
      expect(r.getAllByText('1')).toHaveLength(2);

      // Pair 1 with 1
      await fireEvent.press(r.getByTestId('match-left-1'));
      await waitFor(() => {
        expect(r.getByTestId('match-left-1').props.accessibilityState?.selected).toBe(true);
      });
      await fireEvent.press(r.getByTestId('match-right-1'));

      // Both pair 1 and pair 2 badges exist (two tiles for pair 1, two tiles for pair 2)
      expect(r.getAllByText('1')).toHaveLength(2);
      expect(r.getAllByText('2')).toHaveLength(2);

      await waitFor(() => {
        expect(r.getByTestId('duel-match-submit').props.accessibilityState?.disabled).toBe(false);
      });

      await fireEvent.press(r.getByTestId('duel-match-submit'));
      expect(onSubmitAnswer).toHaveBeenCalledTimes(1);
      expect(onSubmitAnswer).toHaveBeenCalledWith({ pairs: [0, 1] });
    });
  });

  describe('predict / slider question footer', () => {
    const predictStep: DuelPredictStep = {
      type: 'predict',
      id: 'p1',
      prompt: 'Estimate the future value',
      input: {
        kind: 'slider',
        min: 100,
        max: 500,
        step: 50,
        unit: '€',
      },
    };

    const state: DuelMatchState = {
      ...baseMatchState,
      question: {
        index: 2,
        category: 'berlin',
        step: predictStep,
        deadline: Date.now() + 30000,
        timeLimitMs: 30000,
      },
    };

    it('Submit is active right away with min value, and shows no hint', async () => {
      const onSubmitAnswer = jest.fn();
      const r = await render(
        <QuestionView
          state={state}
          youAvatar="m1"
          secondsLeft={30}
          onSubmitAnswer={onSubmitAnswer}
          onNextQuestion={jest.fn()}
          onExit={jest.fn()}
        />,
      );

      expect(r.queryByText('Sort every card to submit')).toBeNull();
      expect(r.queryByText('Match every pair to submit')).toBeNull();

      const submitBtn = r.getByTestId('duel-predict-submit');
      expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

      // Submitting immediately submits the initial min value (100)
      await fireEvent.press(submitBtn);
      expect(onSubmitAnswer).toHaveBeenCalledTimes(1);
      expect(onSubmitAnswer).toHaveBeenCalledWith({ value: 100 });
    });
  });

  describe('chart / slider question footer', () => {
    const chartStep: DuelChartStep = {
      type: 'chart',
      id: 'c1',
      prompt: 'After how many years?',
      model: 'realValue',
      params: {
        years: { label: 'Years', min: 0, max: 20, step: 1, value: 10 },
        interest: { label: 'Interest', min: 0, max: 5, step: 0.5, value: 0, unit: '%' },
        inflation: { label: 'Inflation', min: 0, max: 8, step: 0.5, value: 3, unit: '%' },
      },
      output: { label: 'Purchasing power', unit: '%' },
      input: { kind: 'slider', min: 1, max: 20, step: 1, unit: 'yrs' },
    };

    const state: DuelMatchState = {
      ...baseMatchState,
      question: {
        index: 3,
        category: 'berlin',
        step: chartStep,
        deadline: Date.now() + 30000,
        timeLimitMs: 30000,
      },
    };

    it('chart submit is active right away with min value', async () => {
      const onSubmitAnswer = jest.fn();
      const r = await render(
        <QuestionView
          state={state}
          youAvatar="m1"
          secondsLeft={30}
          onSubmitAnswer={onSubmitAnswer}
          onNextQuestion={jest.fn()}
          onExit={jest.fn()}
        />,
      );

      const submitBtn = r.getByTestId('duel-chart-submit');
      expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

      await fireEvent.press(submitBtn);
      expect(onSubmitAnswer).toHaveBeenCalledTimes(1);
      expect(onSubmitAnswer).toHaveBeenCalledWith({ value: 1 });
    });
  });

  describe('scoreboard formatting', () => {
    const quizStep: DuelQuizStep = {
      type: 'quiz',
      id: 'q1',
      prompt: 'Quiz question',
      options: ['A', 'B', 'C'],
    };

    const state: DuelMatchState = {
      ...baseMatchState,
      question: {
        index: 0,
        category: 'berlin',
        step: quizStep,
        deadline: Date.now() + 30000,
        timeLimitMs: 30000,
      },
    };

    it('formats player names as "First L.", shows VS and hero live score, and shows "Lv X"', async () => {
      const r = await render(
        <QuestionView
          state={state}
          youAvatar="m1"
          secondsLeft={30}
          onSubmitAnswer={jest.fn()}
          onNextQuestion={jest.fn()}
          onExit={jest.fn()}
        />,
      );

      expect(r.getByTestId('duel-scoreboard')).toBeTruthy();

      // "Alex Krause" -> "Alex K."
      expect(r.getByText('Alex K.')).toBeTruthy();
      // "Ola Weber" -> "Ola W."
      expect(r.getByText('Ola W.')).toBeTruthy();

      // Level meta lines (clean, no truncated category)
      expect(r.getByText('Lv 3')).toBeTruthy();
      expect(r.getByText('Lv 2')).toBeTruthy();

      // VS and hero scores
      expect(r.getByText('VS')).toBeTruthy();
      expect(r.getByTestId('duel-scoreboard-your-score')).toBeTruthy();
      expect(r.getByTestId('duel-scoreboard-rival-score')).toBeTruthy();
    });
  });
});
