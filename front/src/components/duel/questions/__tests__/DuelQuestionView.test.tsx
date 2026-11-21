import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { DuelQuestionView } from '@/components/duel/questions/DuelQuestionView';
import type {
  DuelChartStep,
  DuelMatchStep,
  DuelPredictStep,
  DuelQuestion,
  DuelQuizStep,
  DuelSortStep,
} from '@/types/duel';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('../../../../../jest/reanimated.js');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('DuelQuestionView', () => {
  describe('quiz type', () => {
    const quizStep: DuelQuizStep = {
      type: 'quiz',
      id: 'd1',
      prompt: 'A savings account offers 2%, inflation is 5%. What happens?',
      options: ['Drops by 3% yearly', 'Grows by 2%', 'Drops by 5%', 'No change'],
    };

    const question: DuelQuestion = {
      index: 0,
      category: 'berlin',
      step: quizStep,
      deadline: Date.now() + 20000,
      timeLimitMs: 20000,
    };

    it('submits immediately on option tap with the selected index', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByText, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('duel-option-0');
      expect(getByText('A savings account offers 2%, inflation is 5%. What happens?')).toBeTruthy();
      const option0 = getByTestId('duel-option-0');
      fireEvent.press(option0);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ option: 0 });
      });
    });

    it('blocks input when disabled', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      await findByTestId('duel-option-0');
      const option0 = getByTestId('duel-option-0');
      fireEvent.press(option0);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('predict type', () => {
    const predictStep: DuelPredictStep = {
      type: 'predict',
      id: 'd2',
      prompt: 'What will 25,000 € really be worth after 10 years?',
      input: {
        kind: 'slider',
        min: 10000,
        max: 30000,
        step: 500,
        unit: '€',
      },
    };

    const question: DuelQuestion = {
      index: 1,
      category: 'berlin',
      step: predictStep,
      deadline: Date.now() + 20000,
      timeLimitMs: 20000,
    };

    it('starts slider at input.min and submits current value when clicking Submit', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByText, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('duel-predict-submit');
      expect(getByText('What will 25,000 € really be worth after 10 years?')).toBeTruthy();
      const submitBtn = getByTestId('duel-predict-submit');
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ value: 10000 }); // Starts at input.min
      });
    });

    it('blocks input and submission when disabled', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      await findByTestId('duel-predict-submit');
      const submitBtn = getByTestId('duel-predict-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('chart type', () => {
    const chartStep: DuelChartStep = {
      type: 'chart',
      id: 'd4',
      prompt: 'After how many years will savings lose 1/4 of their value?',
      model: 'realValue',
      params: {
        years: { label: 'Years', min: 0, max: 20, step: 1, value: 10 },
        interest: { label: 'Interest', min: 0, max: 5, step: 0.5, value: 0, unit: '%' },
        inflation: { label: 'Inflation', min: 0, max: 8, step: 0.5, value: 3, unit: '%' },
      },
      output: { label: 'Purchasing power change', unit: '%' },
      input: { kind: 'slider', min: 1, max: 20, step: 1, unit: 'yrs' },
    };

    const question: DuelQuestion = {
      index: 3,
      category: 'berlin',
      step: chartStep,
      deadline: Date.now() + 25000,
      timeLimitMs: 25000,
    };

    it('starts slider at input.min and submits value on clicking Submit', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('duel-chart-submit');
      expect(getByTestId('duel-chart-canvas')).toBeTruthy();
      const submitBtn = getByTestId('duel-chart-submit');
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ value: 1 }); // Starts at input.min
      });
    });

    it('blocks submission when disabled', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      await findByTestId('duel-chart-submit');
      const submitBtn = getByTestId('duel-chart-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('sort type', () => {
    const sortStep: DuelSortStep = {
      type: 'sort',
      id: 'd5',
      prompt: 'Assign situations to buckets:',
      buckets: ['Emergency buffer', 'Long-term investments'],
      items: ['Car breakdown', 'Retirement in 25 years'],
    };

    const question: DuelQuestion = {
      index: 4,
      category: 'berlin',
      step: sortStep,
      deadline: Date.now() + 20000,
      timeLimitMs: 20000,
    };

    it('allows moving cards and submits { buckets } when Next is tapped', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('duel-sort-left-0');
      // Place item 0 into bucket 0
      fireEvent.press(getByTestId('duel-sort-left-0'));
      await waitFor(() => {
        expect(getByTestId('duel-sort-placed-0')).toBeTruthy();
      });

      // Not all placed yet: Next should be disabled
      expect(getByTestId('duel-sort-submit').props.accessibilityState?.disabled).toBe(true);
      fireEvent.press(getByTestId('duel-sort-submit'));
      expect(onSubmit).not.toHaveBeenCalled();

      // Place item 1 into bucket 1
      fireEvent.press(getByTestId('duel-sort-right-1'));
      await waitFor(() => {
        expect(getByTestId('duel-sort-placed-1')).toBeTruthy();
        expect(getByTestId('duel-sort-submit').props.accessibilityState?.disabled).toBe(false);
      });

      // Now all cards placed: Next is enabled
      fireEvent.press(getByTestId('duel-sort-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ buckets: [0, 1] });
      });
    });

    it('allows placing card by tapping card then tapping bucket column', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('duel-sort-item-0');
      // Tap card 0
      fireEvent.press(getByTestId('duel-sort-item-0'));
      await waitFor(() => {
        expect(getByTestId('duel-sort-item-0').props.accessibilityState?.selected).toBe(true);
      });

      // Tap bucket 0
      fireEvent.press(getByTestId('duel-sort-bucket-0'));
      await waitFor(() => {
        expect(getByTestId('duel-sort-placed-0')).toBeTruthy();
      });

      // Tap card 1
      fireEvent.press(getByTestId('duel-sort-item-1'));
      await waitFor(() => {
        expect(getByTestId('duel-sort-item-1').props.accessibilityState?.selected).toBe(true);
      });

      // Tap bucket 1
      fireEvent.press(getByTestId('duel-sort-bucket-1'));

      await waitFor(() => {
        expect(getByTestId('duel-sort-submit').props.accessibilityState?.disabled).toBe(false);
      });

      fireEvent.press(getByTestId('duel-sort-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ buckets: [0, 1] });
      });
    });

    it('blocks buttons when disabled', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      await findByTestId('duel-sort-left-0');
      fireEvent.press(getByTestId('duel-sort-left-0'));
      expect(getByTestId('duel-sort-submit').props.accessibilityState?.disabled).toBe(true);
      fireEvent.press(getByTestId('duel-sort-submit'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('match type', () => {
    const matchStep: DuelMatchStep = {
      type: 'match',
      id: 'd6',
      prompt: 'Match terms with definitions:',
      left: ['Real rate', 'Horizon'],
      right: ['Interest minus inflation', 'Investment timeframe'],
    };

    const question: DuelQuestion = {
      index: 5,
      category: 'berlin',
      step: matchStep,
      deadline: Date.now() + 25000,
      timeLimitMs: 25000,
    };

    it('pairs items on tap and unpairs on tap of paired item, submitting { pairs } when all paired', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('match-left-0');
      // Select left 0
      fireEvent.press(getByTestId('match-left-0'));
      await waitFor(() => {
        expect(getByTestId('match-left-0').props.accessibilityState?.selected).toBe(true);
      });
      // Tap right 0 to pair
      fireEvent.press(getByTestId('match-right-0'));
      await waitFor(() => {
        expect(getByTestId('match-left-0').props.accessibilityState?.selected).toBe(false);
      });

      // Not all paired yet: submit is disabled
      expect(getByTestId('duel-match-submit').props.accessibilityState?.disabled).toBe(true);
      fireEvent.press(getByTestId('duel-match-submit'));
      expect(onSubmit).not.toHaveBeenCalled();

      // Select left 1
      fireEvent.press(getByTestId('match-left-1'));
      await waitFor(() => {
        expect(getByTestId('match-left-1').props.accessibilityState?.selected).toBe(true);
      });
      // Tap right 1 to pair
      fireEvent.press(getByTestId('match-right-1'));

      // Wait for all paired state to enable submit button
      await waitFor(() => {
        expect(getByTestId('duel-match-submit').props.accessibilityState?.disabled).toBe(false);
      });

      // All paired: submit
      fireEvent.press(getByTestId('duel-match-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ pairs: [0, 1] });
      });
    });

    it('unpairs when tapping a paired tile', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      await findByTestId('match-left-0');
      // Pair 0
      fireEvent.press(getByTestId('match-left-0'));
      await waitFor(() => {
        expect(getByTestId('match-left-0').props.accessibilityState?.selected).toBe(true);
      });
      fireEvent.press(getByTestId('match-right-0'));
      await waitFor(() => {
        expect(getByTestId('match-left-0').props.accessibilityState?.selected).toBe(false);
      });

      // Pair 1
      fireEvent.press(getByTestId('match-left-1'));
      await waitFor(() => {
        expect(getByTestId('match-left-1').props.accessibilityState?.selected).toBe(true);
      });
      fireEvent.press(getByTestId('match-right-1'));

      await waitFor(() => {
        expect(getByTestId('duel-match-submit').props.accessibilityState?.disabled).toBe(false);
      });

      // Unpair left 0 by tapping it
      fireEvent.press(getByTestId('match-left-0'));

      await waitFor(() => {
        expect(getByTestId('duel-match-submit').props.accessibilityState?.disabled).toBe(true);
      });

      // Now cannot submit
      fireEvent.press(getByTestId('duel-match-submit'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('blocks tiles when disabled', async () => {
      const onSubmit = jest.fn();
      const { findByTestId, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      await findByTestId('match-left-0');
      fireEvent.press(getByTestId('match-left-0'));
      expect(getByTestId('match-left-0').props.accessibilityState?.selected).toBeFalsy();

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
