import type { IconName } from '@/constants/onboarding';
import type { FocusArea } from '@/types/categorization';
import type { Confidence, ProfileRanges } from '@/types/quickCheck';

/** Knowledge questions per test: the backend's `MAX_QUESTIONS`. */
export const MAX_QUESTIONS = 6;
/** Tiles stay disabled this long after a question appears, so a double tap cannot skip one unseen. */
export const ANSWER_DELAY_MS = 400;
/** "All set" stays on screen this long before the final call. */
export const DONE_MS = 900;
/** A step that takes longer fails (and falls back to rules); the backend's own limit is 3 s. */
export const STEP_TIMEOUT_MS = 5_000;

export const STATUS_TEXT = { waiting: 'Choosing your next question', done: 'All set · That is enough to place you' } as const;

/** The five areas in the order the dock and the summary draw them. */
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

export const CONFIDENCE: { value: Confidence; label: string; bars: 1 | 2 | 3; chip: number }[] = [
  { value: 'guessing', label: 'Guessing', bars: 1, chip: 0.25 },
  { value: 'fairly-sure', label: 'Fairly sure', bars: 2, chip: 0.6 },
  { value: 'sure', label: 'Sure', bars: 3, chip: 0.9 },
];

/** Mastery levels (spec Q16, D7); never shown as a number. */
export const JUST_STARTING_BELOW = 0.4;
export const SOLID_ABOVE = 0.75;
export const SOLID_MIN_ANSWERS = 2;
export const LEVEL_LABEL = { none: 'Not checked yet', starting: 'Just starting', building: 'Building', solid: 'Solid' } as const;
export const LEVEL_SHORT = { none: 'Not yet', starting: 'Starting', building: 'Building', solid: 'Solid' } as const;

type ProfileKey = keyof ProfileRanges;
type ProfileQuestion = {
  key: ProfileKey;
  prompt: string;
  why: string;
  options: { label: string; value: string }[];
};

/** Asked in this order (spec Q10), each only when its answer is missing. */
export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: 'ageBand',
    prompt: 'Which age band are you in?',
    why: 'So examples fit your stage of life',
    options: [
      { label: '18–25', value: '18-25' },
      { label: '26–40', value: '26-40' },
      { label: '41–59', value: '41-59' },
      { label: '60+', value: '60+' },
    ],
  },
  {
    key: 'savingsCover',
    prompt: 'How many months of spending could your savings cover?',
    why: 'So examples fit your savings',
    options: [
      { label: 'Less than 1 month', value: '<1' },
      { label: '1–3 months', value: '1-3' },
      { label: '3–6 months', value: '3-6' },
      { label: '6 months or more', value: '6+' },
    ],
  },
  {
    key: 'horizon',
    prompt: 'When might you need the money you save or invest?',
    why: 'So examples match your time frame',
    options: [
      { label: 'Within a year', value: 'within-1y' },
      { label: '1–5 years', value: '1-5y' },
      { label: '5+ years', value: '5y+' },
      { label: 'Not sure', value: 'not-sure' },
    ],
  },
];
