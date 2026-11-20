import type { Confidence, ConfidenceArea, Experience, Goal, LearningStyle, LifeStage } from '@/types/onboarding';

/** GET /api/mock-bank/customers/{id}/facts: the only bank data that may leave the bank. */
export type Facts = {
  ageBand: '18-25' | '26-34' | '35-44' | '45-54' | '55-64' | '65+';
  incomeBand: '<1k' | '1-2k' | '2-3.5k' | '3.5-5k' | '5k+';
  cashBufferMonths: '<1' | '1-3' | '3-6' | '6+';
  savingsRate: 'negative' | '0-10%' | '10-20%' | '20%+';
  savesRegularly: boolean;
  overdraftMonths: number;
  holdsInvestments: boolean;
  hasMortgage: boolean;
  hasInsurance: boolean;
};

export type Role = 'novice' | 'intermediate' | 'advanced';
export type FocusArea = 'saving' | 'debt' | 'investing' | 'risk' | 'retirement';

/**
 * The contract's `OnboardingAnswers`: the answers as stored and sent to the model, missing = null.
 * Renamed because the onboarding form type in `types/onboarding.ts` already has that name.
 */
export type SharedAnswers = {
  lifeStage: LifeStage | null;
  goals: Goal[];
  experience: Experience | null;
  learningStyle: LearningStyle | null;
  confidence: Record<ConfidenceArea, Confidence | null>;
  skipped: boolean;
};

/** POST/GET /api/users/{userId}/categorization (contract: docs/specs/F1-profiling.md). */
export type Categorization = {
  userId: string;
  consent: boolean;
  bankData: boolean;
  role: Role;
  lifeStage: LifeStage | null;
  focusAreas: FocusArea[];
  confidenceGaps: { area: ConfidenceArea; direction: 'under' | 'over'; because: string }[];
  lessonVariant: {
    persona: 'student' | 'family' | 'pre-retirement' | null;
    level: 'beginner' | 'advanced';
    lang: 'plain' | 'standard';
  };
  explanation: {
    output: 'role' | 'lifeStage' | 'focusAreas';
    probabilities: Record<string, number>;
    because: string[];
  }[];
  sharedWithModel: { facts: Facts | null; answers: SharedAnswers } | null;
  source: 'jev' | 'fallback';
  model: string | null;
  categorizedAt: string;
};

/** What /categorizing needs before it asks: an existing categorisation, or the facts (null: not a bank customer). */
export type ConsentData = { kind: 'categorized' } | { kind: 'ask'; facts: Facts | null } | { kind: 'facts-failed' };
