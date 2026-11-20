/** Answers from the optional personalisation questions. Every field may be missing (user skipped). */
export type LifeStage = 'student' | 'family' | 'established' | 'pre-retirement';
/** How the user handles their money today, from not saving yet to planning ahead. */
export type Experience = 'not-saving' | 'occasional' | 'regular' | 'investing' | 'planning';
export type Goal =
  | 'budget'
  | 'money-habits'
  | 'banking-basics'
  | 'start-saving'
  | 'emergency-fund'
  | 'inflation'
  | 'pay-off-debt'
  | 'credit-cards'
  | 'loans-mortgages'
  | 'start-investing'
  | 'stocks-etfs'
  | 'crypto'
  | 'retirement'
  | 'insurance'
  | 'scams';

export type OnboardingAnswers = {
  lifeStage?: LifeStage;
  goals: Goal[];
  experience?: Experience;
};

/** GET /api/users/{userId}/profile. Always answers; missing answers come back as null. */
export type UserProfile = {
  userId: string;
  lifeStage: LifeStage | null;
  goals: Goal[];
  experience: Experience | null;
  /** Onboarding was finished or skipped; it is not shown again. */
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  onboardingCompletedAt: string | null;
};
