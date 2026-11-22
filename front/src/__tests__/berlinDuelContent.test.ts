import { MODELS, compoundGrowth, realValueChange } from '@/lib/models';

const data = require('../../../back/src/main/resources/content/duel/berlin.json');

/**
 * Duel v3: berlin.json is an unordered pool of lesson-based questions, drawn at random.
 * Nothing here depends on position or order.
 */
const questions: any[] = data.questions;
const byType = (type: string) => questions.filter((q) => q.step.type === type);

/** Predict questions carry no model name, so each one needs an explicit recomputation (keyed by question id). */
const PREDICT_RECOMPUTE: Record<string, () => number> = {
  // €30,000 at 1% interest, 4% inflation, 10 years, in today's purchasing power
  'berlin-d01': () => 30000 * (1 + realValueChange(10, 1, 4) / 100),
  // 4 months of €3,200 expenses
  'berlin-d04': () => 4 * 3200,
  // €12,000 at 6% compound for 15 years
  'berlin-d10': () => compoundGrowth(12000, 15, 6),
};

function expectSliderAnswer(step: any, expected: number) {
  const { min, max, step: inc } = step.input;
  expect(step.answer).toBeGreaterThanOrEqual(min);
  expect(step.answer).toBeLessThanOrEqual(max);
  expect((step.answer - min) % inc).toBe(0);
  expect(Math.abs(step.answer - expected)).toBeLessThanOrEqual(step.tolerance);
}

describe('berlin.json duel question pool', () => {
  it('is the berlin story with a pool of at least 8 questions', () => {
    expect(data.story).toBe('berlin');
    expect(questions.length).toBeGreaterThanOrEqual(8);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });

  it('points every question at a berlin lesson step with concepts', () => {
    for (const q of questions) {
      expect(q.id).toEqual(expect.any(String));
      expect(q.lessonId).toMatch(/^berlin-/);
      expect(q.sourceStepId).toEqual(expect.any(String));
      expect(q.sourceStepId.length).toBeGreaterThan(0);
      expect(Array.isArray(q.concepts)).toBe(true);
      expect(q.concepts.length).toBeGreaterThan(0);
    }
  });

  it('contains no Polish characters', () => {
    const polish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    expect(JSON.stringify(questions)).not.toMatch(polish);
  });

  it('predict answers match a recomputation, the slider range, step and tolerance', () => {
    const predicts = byType('predict');
    expect(predicts.length).toBeGreaterThan(0);
    for (const q of predicts) {
      const recompute = PREDICT_RECOMPUTE[q.id];
      if (!recompute) throw new Error(`predict question ${q.id} has no recomputation in this test; add one`);
      expectSliderAnswer(q.step, recompute());
    }
  });

  it('chart answers match the model, the slider range, step and tolerance', () => {
    const charts = byType('chart');
    expect(charts.length).toBeGreaterThan(0);
    for (const q of charts) {
      const model = MODELS[q.step.model as keyof typeof MODELS];
      expect(model).toBeDefined();
      const values: Record<string, number> = {};
      for (const [key, param] of Object.entries<any>(q.step.params)) values[key] = param.value;
      expectSliderAnswer(q.step, model.y(values));
    }
  });

  it('quizzes have one in-range correctIndex and at least 3 options', () => {
    const quizzes = byType('quiz');
    expect(quizzes.length).toBeGreaterThan(0);
    for (const q of quizzes) {
      const { options, correctIndex } = q.step;
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(Number.isInteger(correctIndex)).toBe(true);
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(correctIndex).toBeLessThan(options.length);
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it('sort items all point at an existing bucket', () => {
    for (const q of byType('sort')) {
      const { buckets, items } = q.step;
      expect(items.length).toBeGreaterThanOrEqual(2);
      for (const item of items) {
        expect(Number.isInteger(item.bucket)).toBe(true);
        expect(item.bucket).toBeGreaterThanOrEqual(0);
        expect(item.bucket).toBeLessThan(buckets.length);
      }
    }
  });

  it('match pairs have no duplicate sides', () => {
    for (const q of byType('match')) {
      const { pairs } = q.step;
      expect(pairs.length).toBeGreaterThanOrEqual(2);
      expect(new Set(pairs.map((p: string[]) => p[0])).size).toBe(pairs.length);
      expect(new Set(pairs.map((p: string[]) => p[1])).size).toBe(pairs.length);
    }
  });
});
