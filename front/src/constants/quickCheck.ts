import type { IconName } from '@/constants/onboarding';
import type { FocusArea } from '@/types/categorization';

/** Knowledge questions per test: the backend's `MAX_QUESTIONS`. */
export const MAX_QUESTIONS = 6;
/** "All set" stays on screen this long before the final call. */
export const DONE_MS = 900;
/** A step that takes longer fails (and falls back to rules); the backend's own limit is 3 s. */
export const STEP_TIMEOUT_MS = 5_000;

export const STATUS_TEXT = { waiting: 'Choosing your next question', done: 'All set · That is enough to place you' } as const;

/** The five areas in the order the summary draws them. */
export const AREAS: FocusArea[] = ['saving', 'debt', 'investing', 'risk', 'retirement'];
export const AREA_LABEL: Record<FocusArea, string> = {
  saving: 'Saving',
  debt: 'Borrowing',
  investing: 'Investing',
  risk: 'Risk',
  retirement: 'Retirement',
};
export const AREA_ICON: Record<FocusArea, IconName> = {
  saving: 'database',
  debt: 'credit-card',
  investing: 'trending-up',
  risk: 'alert-circle',
  retirement: 'sunrise',
};

export type FeedbackTone = 'right' | 'wrong' | 'unsure';
export type Feedback = { tone: FeedbackTone; title: string; body: string };

/** After each answer; the body is the question's explanation. */
export const FEEDBACK = {
  right: { tone: 'right', title: 'Right' },
  wrong: { tone: 'wrong', title: 'Not quite' },
  unsure: { tone: 'unsure', title: 'Good to know' },
} as const satisfies Record<string, Omit<Feedback, 'body'>>;

/** Mastery levels (spec Q16, D7); never shown as a number. */
export const JUST_STARTING_BELOW = 0.4;
export const SOLID_ABOVE = 0.75;
export const SOLID_MIN_ANSWERS = 2;
export const LEVEL_LABEL = { none: 'Not checked yet', starting: 'Just starting', building: 'Building', solid: 'Solid' } as const;
