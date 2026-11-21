import type { Facts, FocusArea } from '@/types/categorization';

/** Bank numbers an account prompt can quote; filled in on the device only (docs/specs/F1b-quick-check.md). */
export const SLOTS = [
  'savingsBalance',
  'savingsInterestRate',
  'monthOut',
  'loanRemaining',
  'loanApr',
  'cardUsed',
  'cardLimit',
  'etfMonthly',
  'depotTotal',
  'positionCount',
] as const;
export type Slot = (typeof SLOTS)[number];

/** GET /api/check-questions item; `correctIndex` is shown after each answer. */
export type CheckQuestion = {
  id: string;
  area: FocusArea;
  accountPrompt: string | null;
  slots: Slot[];
  genericPrompt: string;
  options: string[];
  correctIndex: number;
};

export type Confidence = 'guessing' | 'fairly-sure' | 'sure';
/** The survey's one self-rating, "How confident do you feel making your own money decisions?". */
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;

/** `optionIndex` and `confidence` both null = "Not sure". */
export type HistoryEntry = { questionId: string; optionIndex: number | null; confidence: Confidence | null };

export type AgeBand = '18-25' | '26-40' | '41-59' | '60+';
export type Horizon = 'within-1y' | '1-5y' | '5y+' | 'not-sure';
export type ProfileRanges = {
  ageBand: AgeBand | null;
  savingsCover: Facts['cashBufferMonths'] | null;
  horizon: Horizon | null;
};

/** Per area with bank questions; null = no answer yet. */
export type Mastery = Partial<Record<FocusArea, number | null>>;

/** `useRules`: no model at all (no key). `stepFellBack`: a step's model call failed, so only the later steps use the rule. */
export type StepResponse = {
  mastery: Mastery;
  nextQuestionId: string | null;
  done: boolean;
  useRules: boolean;
  stepFellBack: boolean;
};

/** What the final POST adds when the Quick check ran. */
export type QuickResult = {
  profile: ProfileRanges;
  history: HistoryEntry[];
  mastery: Mastery;
  useRules: boolean;
  stepCallsMade: number;
};
