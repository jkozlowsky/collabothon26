/** Answers from the optional personalisation questions. Every field may be missing (user skipped). */
export type LifeStage = 'student' | 'family' | 'established' | 'pre-retirement';
export type Experience = 'not-saving' | 'none' | 'tried' | 'regular' | 'experienced';
export type LearningStyle = 'simple' | 'detailed' | 'visual' | 'practice';
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

/** 1 = not at all confident, 5 = very confident. Measured again after lessons. */
export type Confidence = 1 | 2 | 3 | 4 | 5;
export type ConfidenceArea = 'budgeting' | 'saving' | 'investing';
export type ConfidenceRatings = Partial<Record<ConfidenceArea, Confidence>>;

export type OnboardingAnswers = {
  lifeStage?: LifeStage;
  goals: Goal[];
  experience?: Experience;
  learningStyle?: LearningStyle;
  confidence: ConfidenceRatings;
};

/** GET /api/users/{userId}/profile. Always answers; missing answers come back as null. */
export type UserProfile = {
  userId: string;
  lifeStage: LifeStage | null;
  goals: Goal[];
  experience: Experience | null;
  learningStyle: LearningStyle | null;
  confidence: Record<ConfidenceArea, Confidence | null>;
  /** Onboarding was finished or skipped; it is not shown again. */
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  onboardingCompletedAt: string | null;
};
