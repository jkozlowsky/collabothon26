import type { Facts, FocusArea } from '@/types/categorization';

/**
 * GET /api/check-questions item: one quiz step of a lesson, `id` = `<lessonId>/<stepId>`. `correctIndex` and
 * `explanation` are shown after each answer; the explanation may hold [[concept|shown text]] glossary markup.
 */
export type CheckQuestion = {
  id: string;
  lessonId: string;
  area: FocusArea;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

/** `optionIndex` null = "Not sure". */
export type HistoryEntry = { questionId: string; optionIndex: number | null };

export type AgeBand = '18-25' | '26-40' | '41-59' | '60+';
export type Horizon = 'within-1y' | '1-5y' | '5y+' | 'not-sure';
export type ProfileRanges = {
  ageBand: AgeBand | null;
  savingsCover: Facts['cashBufferMonths'] | null;
  horizon: Horizon | null;
};

/** Per area with questions; null = no answer yet. */
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
