import type { ConfidenceRating, Horizon, ProfileRanges } from '@/types/quickCheck';

/** Answers from the optional personalisation questions. Every field may be missing (user skipped). */
/** Broad stage of life, used to pick examples that feel familiar. */
export type LifeStage = 'starting-out' | 'building' | 'settled' | 'later-life';
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

/** What the savings are for; each maps to goals on the profile (`PURPOSES`). */
export type Purpose = 'home' | 'safety-net' | 'retirement' | 'growing' | 'none';

export type OnboardingAnswers = {
  lifeStage?: LifeStage;
  goals: Goal[];
  experience?: Experience;
};

/** What a fresh onboarding hands to /categorizing, in memory only: gone after a reload. */
export type Intake = {
  consent: boolean;
  /** The label of the picked purpose; null when none was picked or it was "No plan yet". */
  purpose: string | null;
  horizon: Horizon | null;
  /** Set by "Start the quick check"; null after a skip, and the categorisation then runs without the test. */
  check: { profile: ProfileRanges; rating: ConfidenceRating } | null;
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
