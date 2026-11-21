import type { IconName } from '@/constants/onboarding';
import type { FocusArea } from '@/types/categorization';
import type { ConfidenceRating, ProfileRanges } from '@/types/quickCheck';

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

/** The survey's confidence step: the caption under the scale for each number. */
export const CONFIDENCE_CAPTION: Record<ConfidenceRating, string> = {
  1: 'I avoid these decisions',
  2: 'I know a bit, but I hesitate to act',
  3: 'I manage, with some doubts',
  4: 'I usually feel sure',
  5: 'I decide with confidence',
};

export type FeedbackTone = 'right' | 'wrong' | 'unsure';
export type Feedback = { tone: FeedbackTone; title: string; body: string };

const MARKED = 'The right answer is marked above.';
/** After each answer; the right and wrong lines depend on how the user rated their confidence. */
export const FEEDBACK = {
  rightLow: { tone: 'right', title: 'Right', body: 'You rated yourself low, yet you got this one. You may know more than you think.' },
  right: { tone: 'right', title: 'Right', body: 'That matches how confident you said you feel.' },
  wrongHigh: { tone: 'wrong', title: 'Not quite', body: `You said you feel confident, so this one is worth a closer look. ${MARKED}` },
  wrong: { tone: 'wrong', title: 'Not quite', body: `${MARKED} Your lessons cover this.` },
  unsure: { tone: 'unsure', title: 'Good to know', body: `${MARKED} Your lessons cover this.` },
} as const satisfies Record<string, Feedback>;

/** Mastery levels (spec Q16, D7); never shown as a number. */
export const JUST_STARTING_BELOW = 0.4;
export const SOLID_ABOVE = 0.75;
export const SOLID_MIN_ANSWERS = 2;
export const LEVEL_LABEL = { none: 'Not checked yet', starting: 'Just starting', building: 'Building', solid: 'Solid' } as const;

type ProfileQuestion<K extends keyof ProfileRanges> = {
  prompt: string;
  why: string;
  options: { label: string; value: NonNullable<ProfileRanges[K]> }[];
};

/** The survey's two range questions; the age band comes from the account or the life stage. */
export const PROFILE_QUESTIONS: { [K in 'savingsCover' | 'horizon']: ProfileQuestion<K> } = {
  savingsCover: {
    prompt: 'How many months of spending could your savings cover?',
    why: 'So examples fit your savings',
    options: [
      { label: 'Less than 1 month', value: '<1' },
      { label: '1–3 months', value: '1-3' },
      { label: '3–6 months', value: '3-6' },
      { label: '6 months or more', value: '6+' },
    ],
  },
  horizon: {
    prompt: 'When might you need the money you save or invest?',
    why: 'So examples match your time frame',
    options: [
      { label: 'Within a year', value: 'within-1y' },
      { label: '1–5 years', value: '1-5y' },
      { label: '5+ years', value: '5y+' },
      { label: 'Not sure', value: 'not-sure' },
    ],
  },
};
