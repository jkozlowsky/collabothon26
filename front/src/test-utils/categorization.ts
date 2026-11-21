import type { Categorization } from '@/types/categorization';

let n = 0;

/** A stored categorisation as POST returns it; every call is a newer one. */
export function categorization(patch: Partial<Categorization> = {}): Categorization {
  return {
    userId: 'demo-user',
    consent: true,
    bankData: true,
    role: 'intermediate',
    lifeStage: null,
    focusAreas: ['investing', 'debt', 'risk', 'saving'],
    confidenceGaps: [
      {
        area: 'investing',
        direction: 'under',
        because: 'You said: I save regularly. Your accounts with us include investment products, and your answer about investing shows you understand it.',
      },
    ],
    lessonVariant: { persona: null, level: 'beginner', lang: 'standard' },
    explanation: [
      { output: 'role', probabilities: {}, because: ['You said: I save regularly.', 'Money goes to savings or investments every month.'] },
      { output: 'focusAreas', probabilities: {}, because: ['You picked investing as a goal.', 'You are paying off a loan with us.'] },
    ],
    checks: [
      { questionId: 'card-minimum', area: 'debt', lessonId: null, result: 'not-yet' },
      { questionId: 'etf-drop', area: 'investing', lessonId: 2, result: 'understands' },
      { questionId: 'one-etf-vs-one-stock', area: 'risk', lessonId: null, result: 'partly' },
    ],
    startLesson: { lessonId: 2, title: 'Compound interest' },
    sharedWithModel: null,
    source: 'jev',
    model: null,
    categorizedAt: new Date(Date.UTC(2026, 10, 21) + ++n * 1000).toISOString(),
    ...patch,
  };
}
