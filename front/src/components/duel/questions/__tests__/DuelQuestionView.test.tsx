import { fireEvent, render } from '@testing-library/react-native';

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
      prompt: 'Konto oszczędnościowe oferuje 2%, inflacja 5%. Co się dzieje?',
      options: ['Spada o 3% rocznie', 'Rośnie o 2%', 'Spada o 5%', 'Brak zmian'],
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
      const { getByText, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      expect(getByText('Konto oszczędnościowe oferuje 2%, inflacja 5%. Co się dzieje?')).toBeTruthy();
      const option0 = getByTestId('duel-option-0');
      fireEvent.press(option0);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ option: 0 });
    });

    it('blocks input when disabled', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      const option0 = getByTestId('duel-option-0');
      fireEvent.press(option0);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('predict type', () => {
    const predictStep: DuelPredictStep = {
      type: 'predict',
      id: 'd2',
      prompt: 'Ile realnie będzie warte 25 000 € po 10 latach?',
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

    it('submits current slider value when clicking Zatwierdź button', async () => {
      const onSubmit = jest.fn();
      const { getByText, getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      expect(getByText('Ile realnie będzie warte 25 000 € po 10 latach?')).toBeTruthy();
      const submitBtn = getByTestId('duel-predict-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ value: 20000 }); // Default midpoint
    });

    it('blocks input and submission when disabled', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      const submitBtn = getByTestId('duel-predict-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('chart type', () => {
    const chartStep: DuelChartStep = {
      type: 'chart',
      id: 'd4',
      prompt: 'Po ilu latach oszczędności stracą 1/4 wartości?',
      model: 'realValue',
      params: {
        years: { label: 'Lata', min: 0, max: 20, step: 1, value: 10 },
        interest: { label: 'Oprocentowanie', min: 0, max: 5, step: 0.5, value: 0, unit: '%' },
        inflation: { label: 'Inflacja', min: 0, max: 8, step: 0.5, value: 3, unit: '%' },
      },
      output: { label: 'Zmiana siły nabywczej', unit: '%' },
      input: { kind: 'slider', min: 1, max: 20, step: 1, unit: 'lat' },
    };

    const question: DuelQuestion = {
      index: 3,
      category: 'berlin',
      step: chartStep,
      deadline: Date.now() + 25000,
      timeLimitMs: 25000,
    };

    it('renders chart canvas and submits value on clicking Zatwierdź', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      expect(getByTestId('duel-chart-canvas')).toBeTruthy();
      const submitBtn = getByTestId('duel-chart-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ value: 11 }); // (1+20)/2 = 10.5 rounded to 11
    });

    it('blocks submission when disabled', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      const submitBtn = getByTestId('duel-chart-submit');
      fireEvent.press(submitBtn);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('sort type', () => {
    const sortStep: DuelSortStep = {
      type: 'sort',
      id: 'd5',
      prompt: 'Przypisz sytuacje do koszyka:',
      buckets: ['Poduszka finansowa', 'Inwestycje długoterminowe'],
      items: [
        { text: 'Awaria auta', bucket: 0 },
        { text: 'Emerytura za 25 lat', bucket: 1 },
      ],
    };

    const question: DuelQuestion = {
      index: 4,
      category: 'berlin',
      step: sortStep,
      deadline: Date.now() + 20000,
      timeLimitMs: 20000,
    };

    it('reports mistakes once all items are sorted', async () => {
      const onSubmit = jest.fn();
      const { getByTestId, findByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      // First item: Awaria auta -> bucket 0 (left)
      fireEvent.press(getByTestId('sort-left'));
      expect(onSubmit).not.toHaveBeenCalled();

      // Second item: Emerytura -> bucket 1 (right)
      const rightBtn = await findByTestId('sort-right');
      fireEvent.press(rightBtn);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ mistakes: 0 });
    });

    it('reports mistakes count accurately when wrong bucket selected', async () => {
      const onSubmit = jest.fn();
      const { getByTestId, findByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      // Awaria auta -> choose right (wrong, bucket 1 instead of 0)
      fireEvent.press(getByTestId('sort-right'));
      // Emerytura -> choose right (correct)
      const rightBtn = await findByTestId('sort-right');
      fireEvent.press(rightBtn);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ mistakes: 1 });
    });

    it('blocks buttons when disabled', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      fireEvent.press(getByTestId('sort-left'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('match type', () => {
    const matchStep: DuelMatchStep = {
      type: 'match',
      id: 'd6',
      prompt: 'Połącz pojęcia:',
      pairs: [
        ['Stopa realna', 'Oprocentowanie minus inflacja'],
        ['Horyzont', 'Czas inwestycji'],
      ],
    };

    const question: DuelQuestion = {
      index: 5,
      category: 'berlin',
      step: matchStep,
      deadline: Date.now() + 25000,
      timeLimitMs: 25000,
    };

    it('reports mistakes once all pairs are matched', async () => {
      const onSubmit = jest.fn();
      const { getByTestId, findByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} />,
      );

      // Pair 0
      fireEvent.press(getByTestId('match-left-0'));
      const right0 = await findByTestId('match-right-0');
      fireEvent.press(right0);

      expect(onSubmit).not.toHaveBeenCalled();

      // Pair 1
      const left1 = await findByTestId('match-left-1');
      fireEvent.press(left1);
      const right1 = await findByTestId('match-right-1');
      fireEvent.press(right1);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ mistakes: 0 });
    });

    it('blocks tiles when disabled', async () => {
      const onSubmit = jest.fn();
      const { getByTestId } = await render(
        <DuelQuestionView question={question} onSubmit={onSubmit} disabled={true} />,
      );

      fireEvent.press(getByTestId('match-left-0'));
      fireEvent.press(getByTestId('match-right-0'));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
