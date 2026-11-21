import { router } from 'expo-router';

import type { Categorization, FocusArea } from '@/types/categorization';

export const AREA_LABEL: Record<FocusArea, string> = {
  saving: 'Saving',
  debt: 'Borrowing',
  investing: 'Investing',
  risk: 'Risk',
  retirement: 'Retirement',
};

export const SUMMARY_AREAS = 3;

type Summary = { categorization: Categorization; answersSent: boolean };

// ponytail: module state, so a restart of the app shows the summary again; AsyncStorage if that matters.
let summary: Summary | null = null;
let seenAt = '';

export const currentSummary = () => summary;
export const markSeen = (c: Categorization) => {
  seenAt = c.categorizedAt;
};
/** A categorisation the user has not seen the summary of yet. */
export const unseen = (c: Categorization) => c.categorizedAt > seenAt;

/** Replaces /categorizing with the summary of `categorization`. */
export function openSummary(categorization: Categorization, answersSent: boolean) {
  summary = { categorization, answersSent };
  router.replace('/learning-path');
}

/** One "why" per area: what the Quick check answer showed, else the goal line, else a neutral one. */
export function areaWhy(area: FocusArea, c: Categorization): string {
  const topic = AREA_LABEL[area].toLowerCase();
  const result = c.checks.find((k) => k.area === area)?.result;
  if (result === 'not-yet') return `Your answer about ${topic} shows where to start.`;
  if (result === 'partly') return `Your answer about ${topic} covered part of it.`;
  if (result === 'understands') return `Your answer about ${topic} shows you know it well.`;
  const goal = `You picked ${area} as a goal.`;
  return c.explanation.find((e) => e.output === 'focusAreas')?.because.includes(goal) ? goal : 'It fits the answers you gave.';
}
