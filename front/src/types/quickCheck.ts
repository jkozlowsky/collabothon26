import type { FocusArea } from '@/types/categorization';

/** Bank numbers an account prompt can quote; filled in on the device only (docs/specs/F1b-quick-check.md). */
export type Slot =
  | 'savingsBalance'
  | 'savingsInterestRate'
  | 'monthOut'
  | 'loanRemaining'
  | 'loanApr'
  | 'cardUsed'
  | 'cardLimit'
  | 'etfMonthly'
  | 'depotTotal'
  | 'positionCount';

/** GET /api/check-questions item; the judge's `criterion` never leaves the backend. */
export type CheckQuestion = {
  id: string;
  category: 'finance' | 'investing';
  area: FocusArea;
  lessonId: number | null;
  accountPrompt: string | null;
  slots: Slot[];
  genericPrompt: string;
};

/** `text` null = "Not sure". */
export type CheckAnswer = { questionId: string; text: string | null };

export type Check = {
  questionId: string;
  area: FocusArea;
  lessonId: number | null;
  result: 'understands' | 'partly' | 'not-yet';
};
