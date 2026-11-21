import type { Categorization } from '@/types/categorization';

/** A stored categorisation as POST returns it, made just now. */
export function categorization(patch: Partial<Categorization> = {}): Categorization {
  return {
    userId: 'demo-user',
    consent: true,
    bankData: true,
    role: 'intermediate',
    lifeStage: null,
    focusAreas: ['investing', 'debt', 'risk', 'saving'],
    gaps: [
      {
        area: 'investing',
        direction: 'habit-ahead',
        because:
          'You said: I save regularly. Your accounts with us include investment products, ' +
          'and your answer about investing shows you understand it.',
      },
    ],
    lessonVariant: { persona: null, level: 'beginner', lang: 'standard' },
    explanation: [
      {
        output: 'role',
        probabilities: {},
        because: ['You said: I save regularly.', 'Money goes to savings or investments every month.'],
      },
      {
        output: 'focusAreas',
        probabilities: {},
        because: ['You picked investing as a goal.', 'You are paying off a loan with us.'],
      },
    ],
    profile: null,
    mastery: {},
    answerCount: 0,
    startLesson: { lessonId: 'berlin-2', title: 'Compound interest', area: 'investing', storyId: 'berlin', storyCity: 'Berlin' },
    readyForNext: false,
    pathStoryIds: ['berlin'],
    sharedWithModel: null,
    source: 'jev',
    model: null,
    categorizedAt: new Date().toISOString(),
    ...patch,
  };
}
