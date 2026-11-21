import { realValueChange } from '@/lib/models';

const data = require('../../../back/src/main/resources/content/duel/berlin.json');

describe('berlin.json duel content verification', () => {

  it('has story berlin and exactly 6 questions in fixed order', () => {
    expect(data.story).toBe('berlin');
    expect(data.questions).toHaveLength(6);

    const types = data.questions.map((q: any) => q.step.type);
    expect(types).toEqual(['quiz', 'predict', 'quiz', 'chart', 'sort', 'match']);
  });

  it('verifies all questions are in English with no Polish characters', () => {
    const polishCharRegex = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
    for (const q of data.questions) {
      expect(q.step.prompt).not.toMatch(polishCharRegex);
      if (q.step.explanation) {
        expect(q.step.explanation).not.toMatch(polishCharRegex);
      }
      if (q.step.options) {
        for (const opt of q.step.options) {
          expect(opt).not.toMatch(polishCharRegex);
        }
      }
      if (q.step.buckets) {
        for (const b of q.step.buckets) {
          expect(b).not.toMatch(polishCharRegex);
        }
      }
      if (q.step.pairs) {
        for (const [term, def] of q.step.pairs) {
          expect(term).not.toMatch(polishCharRegex);
          expect(def).not.toMatch(polishCharRegex);
        }
      }
    }
  });

  it('verifies question 1 (quiz on real return)', () => {
    const q1 = data.questions[0];
    expect(q1.lessonId).toBe('berlin-1');
    expect(q1.step.type).toBe('quiz');
    expect(q1.step.options).toHaveLength(4);
    expect(q1.step.correctIndex).toBe(0);
    expect(q1.step.prompt).toContain('A savings account offers 2%');
    expect(q1.step.explanation).toContain('2% − 5% = −3%');
  });

  it('verifies question 2 (predict real value) arithmetic with models.ts and slider rule', () => {
    const q2 = data.questions[1];
    expect(q2.lessonId).toBe('berlin-1');
    expect(q2.step.type).toBe('predict');

    // 25,000 at 0.5% interest, 3% inflation after 10 years
    const changePct = realValueChange(10, 0.5, 3);
    expect(changePct).toBeCloseTo(-21.8, 1);

    const realValue = 25000 * (1 + changePct / 100);
    expect(realValue).toBeCloseTo(19550, 0);

    expect(q2.step.answer).toBe(19500);
    expect(q2.step.tolerance).toBe(1500);
    expect(Math.abs(q2.step.answer - realValue)).toBeLessThan(q2.step.tolerance);

    // Slider rule: |answer - input.min| > tolerance
    expect(Math.abs(q2.step.answer - q2.step.input.min)).toBeGreaterThan(q2.step.tolerance);
  });

  it('verifies question 3 (quiz on compound growth)', () => {
    const q3 = data.questions[2];
    expect(q3.lessonId).toBe('berlin-2');
    expect(q3.step.type).toBe('quiz');
    expect(q3.step.options).toHaveLength(4);
    expect(q3.step.correctIndex).toBe(0);
    expect(q3.step.prompt).toContain('Why does compound interest');
  });

  it('verifies question 4 (chart realValue reading) arithmetic with models.ts and slider rule', () => {
    const q4 = data.questions[3];
    expect(q4.lessonId).toBe('berlin-1');
    expect(q4.step.type).toBe('chart');
    expect(q4.step.model).toBe('realValue');

    // Model at 10 years, 0% interest, 3% inflation
    const changeAt10 = realValueChange(10, 0, 3);
    // (1/1.03)^10 - 1 = -25.6% ≈ -25% (loss of 1/4)
    expect(changeAt10).toBe(-25.6);
    expect(q4.step.answer).toBe(10);
    expect(q4.step.tolerance).toBe(1);

    // Slider rule: |answer - input.min| > tolerance
    expect(Math.abs(q4.step.answer - q4.step.input.min)).toBeGreaterThan(q4.step.tolerance);
  });

  it('verifies question 5 (sort emergency buffer)', () => {
    const q5 = data.questions[4];
    expect(q5.lessonId).toBe('berlin-3');
    expect(q5.step.type).toBe('sort');
    expect(q5.step.buckets).toHaveLength(2);
    expect(q5.step.items.length).toBeGreaterThanOrEqual(2);
    expect(q5.step.buckets).toEqual(['Emergency fund', 'Long-term investments']);
  });

  it('verifies question 6 (match concepts)', () => {
    const q6 = data.questions[5];
    expect(q6.lessonId).toBe('berlin-3');
    expect(q6.step.type).toBe('match');
    expect(q6.step.pairs.length).toBeGreaterThanOrEqual(2);
    expect(q6.step.pairs[0][0]).toBe('Emergency fund');
  });
});
