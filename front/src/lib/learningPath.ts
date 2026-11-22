import type { Categorization } from '@/types/categorization';

/** What the summary shows; a reload rebuilds it from the stored row. */
export type Summary = { categorization: Categorization };

// ponytail: module state, gone when the app restarts; the summary is a one-off screen after /categorizing.
let summary: Summary | null = null;

export const currentSummary = () => summary;
export const setSummary = (next: Summary | null) => {
  summary = next;
};
