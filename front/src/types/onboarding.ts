import type { ProfileRanges } from '@/types/quickCheck';

/** The personalisation answers on the profile. A fresh onboarding saves the interests; the rest comes from "Personalise your lessons". */
/** Broad stage of life, used to pick examples that feel familiar. */
export type LifeStage = 'starting-out' | 'building' | 'settled' | 'later-life';
/** How the user handles their money today, from not saving yet to planning ahead. */
export type Experience = 'not-saving' | 'occasional' | 'regular' | 'investing' | 'planning';
export type OnboardingAnswers = {
  lifeStage?: LifeStage;
  /** Story ids the user picked as new to them; empty = "Not sure yet". */
  interests: string[];
  experience?: Experience;
};

/** What a fresh onboarding hands to /categorizing, in memory only: gone after a reload. */
export type Intake = {
  /** What the quick check sends with its steps. */
  check: { profile: ProfileRanges };
};

/** GET /api/users/{userId}/profile. Always answers; missing answers come back as null. */
export type UserProfile = {
  userId: string;
  lifeStage: LifeStage | null;
  interests: string[];
  experience: Experience | null;
  /** Onboarding was finished; it is not shown again. */
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  onboardingCompletedAt: string | null;
};
