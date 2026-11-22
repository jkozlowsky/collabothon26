import type { FocusArea } from '@/types/categorization';

/** Knowledge questions per test: the backend's `MAX_QUESTIONS`. */
export const MAX_QUESTIONS = 6;
/** "All set" stays on screen this long before the final call. */
export const DONE_MS = 900;
/** A step that takes longer fails (and falls back to rules); the backend's own limit is 3 s. */
export const STEP_TIMEOUT_MS = 5_000;

export const STATUS_TEXT = { waiting: 'Choosing your next question', done: 'All set · That is enough to place you' } as const;

/** The five areas. */
export const AREAS: FocusArea[] = ['saving', 'debt', 'investing', 'risk', 'retirement'];
export const AREA_LABEL: Record<FocusArea, string> = {
  saving: 'Saving',
  debt: 'Borrowing',
  investing: 'Investing',
  risk: 'Risk',
  retirement: 'Retirement',
};

export type FeedbackTone = 'right' | 'wrong' | 'unsure';
export type Feedback = { tone: FeedbackTone; title: string; body: string };

/** After each answer; the body is the question's explanation. */
export const FEEDBACK = {
  right: { tone: 'right', title: 'Right' },
  wrong: { tone: 'wrong', title: 'Not quite' },
  unsure: { tone: 'unsure', title: 'Good to know' },
} as const satisfies Record<string, Omit<Feedback, 'body'>>;
