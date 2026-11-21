import type { Categorization, FocusArea } from '@/types/categorization';

/** Everything but the categorisation is known only right after the test; a reload rebuilds the summary from the stored row. */
export type Summary = {
  categorization: Categorization;
  counts?: Partial<Record<FocusArea, number>>;
  /** "Saving for: A home of my own · needed 1–5 years", from the survey. */
  savingFor?: string;
};

// ponytail: module state, gone when the app restarts; the summary is a one-off screen after /categorizing.
let summary: Summary | null = null;

export const currentSummary = () => summary;
export const setSummary = (next: Summary | null) => {
  summary = next;
};
