import type { Categorization } from '@/types/categorization';

/** `unchecked`: the user typed answers that Jev did not judge. */
type Summary = { categorization: Categorization; unchecked: boolean };

// ponytail: module state, gone when the app restarts; the summary is a one-off screen after /categorizing.
let summary: Summary | null = null;

export const currentSummary = () => summary;
export const setSummary = (next: Summary | null) => {
  summary = next;
};
