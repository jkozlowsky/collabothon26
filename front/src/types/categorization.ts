import type { Mastery, ProfileRanges } from '@/types/quickCheck';
import type { Experience, Goal, LifeStage } from '@/types/onboarding';

/** What `factsFrom` computes on the device from the bank: the only bank data that may leave it. */
export type Facts = {
  incomeBand: '<1k' | '1-2k' | '2-3.5k' | '3.5-5k' | '5k+';
  cashBufferMonths: '<1' | '1-3' | '3-6' | '6+';
  savingsRate: 'negative' | '0-10%' | '10-20%' | '20%+';
  savesRegularly: boolean;
  inOverdraft: boolean;
  holdsInvestments: boolean;
  hasLoan: boolean;
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
  skipped: boolean;
};

/** A lesson of a story; `area` is null when the lesson has no bank area. */
export type StartLesson = { lessonId: string; title: string; area: FocusArea | null; storyId: string; storyCity: string };

/** POST/GET /api/users/{userId}/categorization (contract: docs/specs/F1-profiling.md). */
export type Categorization = {
  userId: string;
  consent: boolean;
  bankData: boolean;
  role: Role;
  lifeStage: 'student' | 'family' | 'established' | 'pre-retirement' | null;
  focusAreas: FocusArea[];
  confidenceGaps: { area: FocusArea; direction: 'under' | 'over'; because: string }[];
  lessonVariant: {
    persona: 'student' | 'family' | 'pre-retirement' | null;
    level: 'beginner' | 'advanced';
    lang: 'plain' | 'standard';
  };
  explanation: {
    output: 'role' | 'focusAreas';
    probabilities: Record<string, number>;
    because: string[];
  }[];
  /** Set when the Quick check ran (docs/specs/F1b-quick-check.md); the rest reads {} / 0 / [] / false without it. */
  profile: ProfileRanges | null;
  mastery: Mastery;
  /** Per-area mean of the chips the user tapped, 0-1. */
  confidence: Mastery;
  answerCount: number;
  startLesson: StartLesson | null;
  readyForNext: boolean;
  pathStoryIds: string[];
  /** Computed on read: the first path story with a lesson not done, at that lesson; null when the path is done. */
  startHere?: StartLesson | null;
  sharedWithModel: {
    facts: Facts | null;
    answers: SharedAnswers;
    profile: ProfileRanges | null;
    answerCount: number;
    stepCallsMade: number;
  } | null;
  source: 'jev' | 'fallback';
  model: string | null;
  categorizedAt: string;
};
